import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Savepoint — Your Gaming Story, Told Beautifully';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: 72,
          background: 'linear-gradient(135deg, #0a0a0f 0%, #12121a 55%, #0d1f18 100%)',
          color: '#eee',
          fontFamily: 'ui-sans-serif, system-ui, sans-serif',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            marginBottom: 28,
            color: '#00e5a0',
            fontSize: 42,
            fontWeight: 800,
            letterSpacing: '-0.03em',
          }}
        >
          <span style={{ fontSize: 48 }}>⟐</span>
          <span>Savepoint</span>
        </div>
        <div
          style={{
            fontSize: 64,
            fontWeight: 800,
            lineHeight: 1.1,
            letterSpacing: '-0.04em',
            maxWidth: 900,
          }}
        >
          Your Gaming Story, Told Beautifully
        </div>
        <div
          style={{
            marginTop: 24,
            fontSize: 28,
            color: '#9aa0a6',
            maxWidth: 820,
            lineHeight: 1.35,
          }}
        >
          Track · Rate · Review · Sync Steam, PlayStation & Xbox
        </div>
      </div>
    ),
    { ...size }
  );
}
