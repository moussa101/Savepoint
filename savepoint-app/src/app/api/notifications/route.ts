import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const session = await auth();
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const notifications = await prisma.notification.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: {
        source: {
          select: { name: true, username: true, image: true }
        },
        review: {
          select: { 
            game: { select: { name: true, slug: true } }
          }
        },
        game: {
          select: { name: true, slug: true, coverImage: true }
        }
      }
    });
    
    return NextResponse.json(notifications);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { notificationIds } = await request.json();
    
    if (notificationIds && Array.isArray(notificationIds) && notificationIds.length > 0) {
      await prisma.notification.updateMany({
        where: {
          id: { in: notificationIds },
          userId: session.user.id
        },
        data: {
          isRead: true
        }
      });
    } else {
      // Mark all as read
      await prisma.notification.updateMany({
        where: {
          userId: session.user.id,
          isRead: false
        },
        data: {
          isRead: true
        }
      });
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating notifications:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await auth();
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    
    if (id) {
      await prisma.notification.deleteMany({
        where: {
          id,
          userId: session.user.id
        }
      });
    } else {
      // Delete all
      await prisma.notification.deleteMany({
        where: {
          userId: session.user.id
        }
      });
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting notifications:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
