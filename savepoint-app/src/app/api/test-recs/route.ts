import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getRecommendations } from '@/app/actions/recommendations';

export async function GET() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const session = await auth();
  if (!session?.user?.id || !session.user.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const recs = await getRecommendations();
    return NextResponse.json({ success: true, recs });
  } catch {
    return NextResponse.json({ success: false, error: 'Failed to load recommendations' }, { status: 500 });
  }
}
