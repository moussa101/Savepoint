import { GamepadIcon } from '@/components/ui/Icons';

export default function Loading() {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        flexDirection: 'column',
        gap: 'var(--space-md)',
      }}
    >
      <GamepadIcon size={48} className="animate-spin" color="var(--accent-primary)" />
      <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-lg)', fontWeight: 600 }}>Loading...</p>
    </div>
  );
}
