'use server';

import { r2 } from '@/lib/r2';
import { DeleteObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { revalidatePath } from 'next/cache';

const BUCKET_NAME = process.env.R2_BUCKET_NAME || 'savepoint-assets';
const PUBLIC_URL = process.env.NEXT_PUBLIC_R2_PUBLIC_URL || '';

export async function uploadImageDirect(formData: FormData, isBanner: boolean = false) {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Unauthorized');

  const file = formData.get('file') as File | null;
  if (!file) throw new Error('No file provided');

  // Rate Limiting: Max 5 uploads per hour
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

  // Basic validation
  if (!file.type.startsWith('image/')) throw new Error('Invalid file type');
  if (file.size > 5 * 1024 * 1024) throw new Error('File exceeds 5MB limit');

  // Generate a unique filename
  const ext = file.type.split('/')[1] || 'jpeg';
  const prefix = isBanner ? 'banners' : 'avatars';
  const key = `${prefix}/${session.user.id}_${Date.now()}.${ext}`;
  const finalImageUrl = `${PUBLIC_URL}/${key}`;

  // Read file data
  const buffer = Buffer.from(await file.arrayBuffer());

  // Upload directly via PutObject from the server
  await r2.send(
    new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: file.type,
    })
  );

  return { finalImageUrl, key };
}

export async function verifyAndSaveProfileImage(imageUrl: string, objectKey: string, isBanner: boolean = false) {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Unauthorized');

  // 1. Scan image for NSFW content using Sightengine
  const sightEngineUser = process.env.SIGHTENGINE_API_USER;
  const sightEngineSecret = process.env.SIGHTENGINE_API_SECRET;

  if (sightEngineUser && sightEngineSecret) {
    try {
      const scanRes = await fetch(
        `https://api.sightengine.com/1.0/check.json?models=nudity-2.0,wad,gore&api_user=${sightEngineUser}&api_secret=${sightEngineSecret}&url=${encodeURIComponent(imageUrl)}`
      );
      const scanResult = await scanRes.json();

      if (scanResult.status === 'success') {
        const isNSFW =
          scanResult.nudity?.none < 0.5 ||
          scanResult.weapon > 0.5 ||
          scanResult.alcohol > 0.5 ||
          scanResult.drugs > 0.5 ||
          scanResult.gore?.prob > 0.5;

        if (isNSFW) {
          // Delete offending image from R2 immediately
          await r2.send(new DeleteObjectCommand({ Bucket: BUCKET_NAME, Key: objectKey }));
          throw new Error('Image flagged for inappropriate content and has been deleted.');
        }
      }
    } catch (err: any) {
      if (err.message.includes('flagged')) throw err;
      console.error('NSFW Scanning failed, bypassing check for now:', err);
    }
  }

  // 2. Safe! Save to database and log the upload
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
