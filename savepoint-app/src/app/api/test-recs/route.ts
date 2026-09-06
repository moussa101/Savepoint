import { NextResponse } from 'next/server';
import { getRecommendations } from '@/app/actions/recommendations';

export async function GET() {
  try {
    const recs = await getRecommendations();
    return NextResponse.json({ success: true, recs });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message, stack: err.stack });
  }
}
