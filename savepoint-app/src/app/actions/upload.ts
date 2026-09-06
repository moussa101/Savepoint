'use server';

import { r2 } from '@/lib/r2';
import { DeleteObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { ownedUploadKey, sniffImageMime } from '@/lib/security';

const BUCKET_NAME = process.env.R2_BUCKET_NAME || 'savepoint-assets';
const PUBLIC_URL = (process.env.NEXT_PUBLIC_R2_PUBLIC_URL || '').replace(/\/$/, '');

export async function uploadImageDirect(formData: FormData, isBanner: boolean = false) {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Unauthorized');

  const file = formData.get('file') as File | null;
  if (!file) throw new Error('No file provided');

  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const uploadCount = await prisma.imageUploadLog.count({
    where: {
      userId: session.user.id,
      createdAt: { gte: oneHourAgo },
    },
  });

  if (uploadCount >= 5) {
    throw new Error('Rate limit exceeded. Maximum 5 uploads per hour.');
  }

  if (file.size > 5 * 1024 * 1024) throw new Error('File exceeds 5MB limit');

  const buffer = Buffer.from(await file.arrayBuffer());
  const sniffed = sniffImageMime(buffer);
  if (!sniffed) {
    throw new Error('Invalid image. Only JPEG, PNG, and WebP are allowed.');
  }

  const prefix = isBanner ? 'banners' : 'avatars';
  const key = `${prefix}/${session.user.id}_${Date.now()}.${sniffed.ext}`;
  const finalImageUrl = `${PUBLIC_URL}/${key}`;

  await r2.send(
    new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: sniffed.mime,
      ContentDisposition: 'inline',
    })
  );

  return { finalImageUrl, key };
}

export async function verifyAndSaveProfileImage(imageUrl: string, objectKey: string, isBanner: boolean = false) {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Unauthorized');

  if (!ownedUploadKey(session.user.id, objectKey, isBanner)) {
    throw new Error('Invalid upload key');
  }

  const expectedUrl = `${PUBLIC_URL}/${objectKey}`;
  if (!PUBLIC_URL || imageUrl !== expectedUrl) {
    throw new Error('Invalid image URL');
  }

  const sightEngineUser = process.env.SIGHTENGINE_API_USER;
  const sightEngineSecret = process.env.SIGHTENGINE_API_SECRET;
  const isProduction = process.env.NODE_ENV === 'production';

  if (!sightEngineUser || !sightEngineSecret) {
    if (isProduction) {
      await r2.send(new DeleteObjectCommand({ Bucket: BUCKET_NAME, Key: objectKey }));
      throw new Error('Image moderation is unavailable. Upload rejected.');
    }
  } else {
    try {
      const scanRes = await fetch(
        `https://api.sightengine.com/1.0/check.json?models=nudity-2.0,wad,gore&api_user=${sightEngineUser}&api_secret=${sightEngineSecret}&url=${encodeURIComponent(imageUrl)}`
      );
      const scanResult = await scanRes.json();

      if (scanResult.status !== 'success') {
        await r2.send(new DeleteObjectCommand({ Bucket: BUCKET_NAME, Key: objectKey }));
        throw new Error('Image moderation failed. Upload rejected.');
      }

      const isNSFW =
        scanResult.nudity?.none < 0.5 ||
        scanResult.weapon > 0.5 ||
        scanResult.alcohol > 0.5 ||
        scanResult.drugs > 0.5 ||
        scanResult.gore?.prob > 0.5;

      if (isNSFW) {
        await r2.send(new DeleteObjectCommand({ Bucket: BUCKET_NAME, Key: objectKey }));
        throw new Error('Image flagged for inappropriate content and has been deleted.');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Image moderation failed';
      if (
        message.includes('flagged') ||
        message.includes('rejected') ||
        message.includes('moderation')
      ) {
        throw err;
      }
      await r2.send(new DeleteObjectCommand({ Bucket: BUCKET_NAME, Key: objectKey }));
      throw new Error('Image moderation failed. Upload rejected.');
    }
  }

  const updateData = isBanner ? { bannerImage: imageUrl } : { image: imageUrl };

  await prisma.$transaction([
    prisma.user.update({
      where: { id: session.user.id },
      data: updateData,
    }),
    prisma.imageUploadLog.create({
      data: { userId: session.user.id },
    }),
  ]);

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { username: true },
  });

  if (user?.username) {
    revalidatePath(`/profile/${user.username}`);
  }
}

export async function updateProfileBio(bio: string, name: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Unauthorized');

  await prisma.user.update({
    where: { id: session.user.id },
    data: { bio, name },
  });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { username: true },
  });

  if (user?.username) {
    revalidatePath(`/profile/${user.username}`);
  }
}
