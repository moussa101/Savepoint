import { GamepadIcon, HomeIcon, SearchIcon } from '@/components/ui/Icons';
import StatusPage from '@/components/ui/StatusPage';

export default function NotFound() {
  return (
    <StatusPage
      code="404"
      title="Checkpoint not found"
      description="This page doesn’t exist — or it got deleted. Head back to a safe savepoint."
      icon={<GamepadIcon size={36} color="var(--accent-primary)" />}
      actions={[
        { href: '/', label: 'Home', variant: 'primary', icon: <HomeIcon size={16} /> },
        {
          href: '/games',
          label: 'Discover games',
          variant: 'secondary',
          icon: <SearchIcon size={16} />,
        },
        { href: '/feed', label: 'Feed', variant: 'ghost' },
      ]}
    />
  );
}
