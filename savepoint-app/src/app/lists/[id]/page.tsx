import Link from 'next/link';
import { prisma } from '@/lib/db';
import { notFound } from 'next/navigation';
import { auth } from '@/lib/auth';
import Navbar from '@/components/layout/Navbar';
import { LockIcon } from '@/components/ui/Icons';
import StarRating from '@/components/ui/StarRating';
import ListGameManager from './ListGameManager';
import ListLikeButton from './ListLikeButton';
import ListControls from './ListControls';
import ReportButton from '@/components/ui/ReportButton';
import UserAvatar from '@/components/ui/UserAvatar';
import type { Metadata } from 'next';
import { absoluteUrl, gameListJsonLd, breadcrumbJsonLd, SITE_NAME } from '@/lib/seo';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const list = await prisma.list.findUnique({
    where: { id },
    select: {
      title: true,
      description: true,
      visibility: true,
      user: { select: { name: true, username: true } },
      _count: { select: { items: true } },
    },
  });
  if (!list || list.visibility === 'PRIVATE') return { title: 'List', robots: { index: false, follow: false } };
  const author = list.user.name || list.user.username;
  const description = list.description ||
    `A game list by ${author} on ${SITE_NAME} — ${list._count.items} games.`;
  return {
    title: list.title,
    description,
    alternates: { canonical: absoluteUrl(`/lists/${id}`) },
    openGraph: {
      title: `${list.title} · ${SITE_NAME}`,
      description,
      url: absoluteUrl(`/lists/${id}`),
      type: 'website',
    },
  };
}

export default async function ListDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();

  const list = await prisma.list.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, username: true, name: true, image: true } },
      items: {
        include: { game: { include: { genres: true } } },
        orderBy: { order: 'asc' },
      },
      _count: {
        select: { likes: true }
      },
      likes: session?.user?.id ? {
        where: { userId: session.user.id }
      } : false,
    },
  });

  if (!list) notFound();
  if (list.visibility === 'PRIVATE' && list.userId !== session?.user?.id) notFound();

  const isOwner = list.userId === session?.user?.id;

  const author = list.user.name || list.user.username;
  const listUrl = absoluteUrl(`/lists/${list.id}`);

  return (
    <>
      {list.visibility === 'PUBLIC' && (
        <>
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify(
                gameListJsonLd({
                  name: list.title,
                  description: list.description,
                  url: listUrl,
                  author,
                  games: list.items.map((item) => ({
                    name: item.game.name,
                    url: absoluteUrl(`/games/${item.game.slug}`),
                    image: item.game.coverImage,
                  })),
                })
              ),
            }}
          />
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify(
                breadcrumbJsonLd([
                  { name: 'Home', url: absoluteUrl('/') },
                  { name: 'Lists', url: absoluteUrl('/lists') },
                  { name: list.title, url: listUrl },
                ])
              ),
            }}
          />
        </>
      )}
      <Navbar />
      <main className="main-content main-content-padded">
        <div className="container" style={{ maxWidth: '800px' }}>
          <div style={{ marginBottom: 'var(--space-2xl)' }}>
            <Link href="/lists" style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
              ← Back to Lists
            </Link>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-lg)', gap: 'var(--space-md)', flexWrap: 'wrap' }}>
            <div>
              <h1 className="page-title font-display">{list.title}</h1>
              {list.description && <p className="page-subtitle">{list.description}</p>}
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', marginTop: 'var(--space-md)', flexWrap: 'wrap' }}>
                <Link href={`/profile/${list.user.username}`} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                  <UserAvatar
                    className="avatar avatar-sm"
                    src={list.user.image}
                    name={list.user.name}
                    username={list.user.username}
                  />
                  <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>{list.user.name || list.user.username}</span>
                </Link>
                <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>• {list.items.length} games</span>
                <span className={`badge ${list.visibility === 'PUBLIC' ? 'badge-accent' : ''}`}>
                  {list.visibility === 'PUBLIC' ? 'Public' : <><LockIcon size={12} /> Private</>}
                </span>
              </div>
              <div style={{ marginTop: 'var(--space-md)', display: 'flex', gap: 'var(--space-sm)', alignItems: 'center', flexWrap: 'wrap' }}>
                <ListLikeButton
                  listId={list.id}
                  initialLiked={list.likes ? list.likes.length > 0 : false}
                  initialLikeCount={list._count.likes}
                  isLoggedIn={!!session}
                />
                {!isOwner && session?.user && (
                  <ReportButton targetType="LIST" targetId={list.id} reportedUserId={list.user.id} />
                )}
              </div>
            </div>
            {isOwner && (
              <ListControls list={{ id: list.id, title: list.title, description: list.description, visibility: list.visibility }} />
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
            {list.items.map((item, index) => (
              <div key={item.id} className="card" style={{ display: 'flex', gap: 'var(--space-md)', alignItems: 'center' }}>
                <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 800, color: 'var(--text-muted)', width: '30px', textAlign: 'center', fontFamily: 'var(--font-display)' }}>
                  {index + 1}
                </div>
                <Link href={`/games/${item.game.slug}`}>
                  <div className="game-cover" style={{ width: '60px', height: '80px', flexShrink: 0 }}>
                    {item.game.coverImage && <img src={item.game.coverImage} alt={item.game.name} loading="lazy" decoding="async" />}
                  </div>
                </Link>
                <div style={{ flex: 1 }}>
                  <Link href={`/games/${item.game.slug}`} style={{ fontWeight: 700 }}>
                    {item.game.name}
                  </Link>
                  <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
                    {item.game.genres.slice(0, 3).map((g) => (
                      <span key={g.id} className="pill" style={{ fontSize: '0.6rem', padding: '0.1rem 0.4rem' }}>
                        {g.genre}
                      </span>
                    ))}
                  </div>
                  {item.game.avgRating > 0 && (
                    <div style={{ marginTop: '4px' }}>
                      <StarRating rating={item.game.avgRating} size="sm" showValue />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {isOwner && (
            <ListGameManager
              listId={list.id}
              items={list.items.map((item) => ({
                id: item.id,
                gameId: item.gameId,
                game: item.game,
              }))}
            />
          )}
        </div>
      </main>
    </>
  );
}
