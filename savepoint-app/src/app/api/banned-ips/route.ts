import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// Cache this endpoint for 60 seconds so middleware doesn't spam DB
export const revalidate = 60; 

export async function GET() {
  try {
    const bannedIps = await prisma.bannedIP.findMany({
      select: { ip: true }
    });
    
    return NextResponse.json({
      ips: bannedIps.map(b => b.ip)
    });
  } catch (error) {
    return NextResponse.json({ ips: [] });
  }
}
