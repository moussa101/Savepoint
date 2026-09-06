import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    
    await prisma.trafficLog.create({
      data: {
        path: data.path || '/',
        method: data.method || 'GET',
        ip: data.ip || 'Unknown',
        userAgent: data.userAgent || 'Unknown',
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    // Fail silently, we don't want analytics to break the app
    console.error('Traffic logging error:', error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
