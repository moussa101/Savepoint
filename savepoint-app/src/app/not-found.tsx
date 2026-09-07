import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import { GamepadIcon, HomeIcon, SearchIcon } from '@/components/ui/Icons';

export default function NotFound() {
  return (
    <>
      <Navbar />
      <main className="not-found-page">
        <div className="not-found-inner">
          <div className="not-found-code font-display" aria-hidden="true">
            404
          </div>
          <div className="not-found-icon">
            <GamepadIcon size={36} color="var(--accent-primary)" />
          </div>
          <h1 className="not-found-title font-display">Checkpoint not found</h1>
          <p className="not-found-text">
            This page doesn’t exist — or it got deleted. Head back to a safe savepoint.
          </p>
          <div className="not-found-actions">
            <Link href="/" className="btn btn-primary">
              <HomeIcon size={16} /> Home
            </Link>
            <Link href="/games" className="btn btn-secondary">
              <SearchIcon size={16} /> Discover games
            </Link>
            <Link href="/feed" className="btn btn-ghost">
              Feed
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}
