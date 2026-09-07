import { NextResponse } from 'next/server';
import { notifyPendingReleaseWatches } from '@/lib/release-notify';

/**
 * Optional cron endpoint. Protect with CRON_SECRET header:
 * Authorization: Bearer <CRON_SECRET>
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get('authorization');
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  try {
    const notified = await notifyPendingReleaseWatches();
    return NextResponse.json({ success: true, notified });
  } catch (error) {
    console.error('Release notify cron failed:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
