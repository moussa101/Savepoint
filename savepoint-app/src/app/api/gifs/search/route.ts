import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

function giphyKey() {
  return (process.env.GIPHY_API_KEY || '').trim().replace(/^["']|["']$/g, '');
}

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const key = giphyKey();
  if (!key) {
    return NextResponse.json({ error: 'GIF search is not configured', results: [] }, { status: 200 });
  }

  const { searchParams } = new URL(request.url);
  const q = (searchParams.get('q') || '').trim().slice(0, 64);
  if (!q) {
    return NextResponse.json({ results: [] });
  }

  try {
    const url = new URL('https://api.giphy.com/v1/gifs/search');
    url.searchParams.set('api_key', key);
    url.searchParams.set('q', q);
    url.searchParams.set('limit', '16');
    url.searchParams.set('offset', '0');
    url.searchParams.set('rating', 'pg-13');
    url.searchParams.set('lang', 'en');

    const res = await fetch(url.toString(), {
      cache: 'no-store',
      signal: AbortSignal.timeout(8000),
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const msg =
        data?.meta?.msg ||
        data?.message ||
        `Giphy error ${res.status}`;
      return NextResponse.json({ error: msg, results: [] }, { status: 200 });
    }

    type Img = { url?: string; webp?: string };
    const results = (data.data || [])
      .map((item: {
        id: string;
        images?: {
          fixed_height?: Img;
          fixed_height_downsampled?: Img;
          fixed_height_small?: Img;
          fixed_width?: Img;
          downsized?: Img;
          downsized_medium?: Img;
          preview_gif?: Img;
          preview_webp?: { url?: string };
          original?: Img;
        };
      }) => {
        const images = item.images || {};
        // Sent in chat: readable fixed_height (≈200px), not original
        const url =
          images.fixed_height?.webp ||
          images.fixed_height?.url ||
          images.fixed_width?.url ||
          images.downsized_medium?.url ||
          images.downsized?.url ||
          '';
        // Picker grid: same readable size so users can tell GIFs apart
        const previewUrl =
          images.fixed_height_downsampled?.webp ||
          images.fixed_height_downsampled?.url ||
          images.fixed_height?.webp ||
          images.fixed_height?.url ||
          images.fixed_width?.url ||
          url;

        return {
          id: item.id,
          url,
          previewUrl,
        };
      })
      .filter((r: { url: string }) => !!r.url);

    return NextResponse.json({ results });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'GIF search failed';
    return NextResponse.json({ error: message, results: [] }, { status: 200 });
  }
}
