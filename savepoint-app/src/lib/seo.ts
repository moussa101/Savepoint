import type { Metadata } from 'next';
import { getAppBaseUrl } from '@/lib/app-url';

export const SITE_NAME = 'Savepoint';
export const SITE_TAGLINE = 'Your Gaming Story, Told Beautifully';
export const SITE_DESCRIPTION =
  'Track, rate, review, and share your games. Sync Steam, PlayStation, and Xbox libraries. Build your gaming profile and discover your next favorite title on Savepoint.';

export const SITE_KEYWORDS = [
  // Brand
  'Savepoint',
  'Savepoint gaming',
  // Primary use-cases
  'game tracker',
  'video game tracker',
  'game library tracker',
  'track video games',
  'game backlog tracker',
  'backlog tracker',
  // Comparisons (high-intent)
  'Letterboxd for games',
  'Letterboxd gaming',
  'Goodreads for games',
  // Social / community
  'gaming social network',
  'gaming community',
  'gaming profile',
  // Reviews / ratings
  'video game reviews',
  'game reviews',
  'game ratings',
  // Platform sync
  'Steam library sync',
  'PlayStation trophies tracker',
  'Xbox game tracker',
  // Diary / logging
  'video game diary',
  'gaming diary',
  'game log',
  // Discovery
  'discover video games',
  'game recommendations',
  'best video games list',
];

export function absoluteUrl(path = '/'): string {
  const base = getAppBaseUrl().replace(/\/$/, '');
  if (!path || path === '/') return base;
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}

export const defaultOgImage = absoluteUrl('/games-hero.jpg');

/** Shared root metadata for the App Router. */
export function buildRootMetadata(): Metadata {
  const base = getAppBaseUrl();
  return {
    metadataBase: new URL(base),
    title: {
      default: `${SITE_NAME} — ${SITE_TAGLINE}`,
      template: `%s · ${SITE_NAME}`,
    },
    description: SITE_DESCRIPTION,
    applicationName: SITE_NAME,
    keywords: SITE_KEYWORDS,
    authors: [{ name: SITE_NAME, url: base }],
    creator: SITE_NAME,
    publisher: SITE_NAME,
    category: 'games',
    alternates: {
      canonical: '/',
    },
    openGraph: {
      type: 'website',
      locale: 'en_US',
      url: base,
      siteName: SITE_NAME,
      title: `${SITE_NAME} — ${SITE_TAGLINE}`,
      description: SITE_DESCRIPTION,
      images: [
        {
          url: '/games-hero.jpg',
          width: 1200,
          height: 630,
          alt: 'Savepoint — track and share your gaming journey',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${SITE_NAME} — ${SITE_TAGLINE}`,
      description: SITE_DESCRIPTION,
      images: ['/games-hero.jpg'],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-image-preview': 'large',
        'max-snippet': -1,
        'max-video-preview': -1,
      },
    },
    appleWebApp: {
      capable: true,
      statusBarStyle: 'black-translucent',
      title: SITE_NAME,
    },
    formatDetection: {
      telephone: false,
    },
    manifest: '/manifest.webmanifest',
  };
}

export const noIndexMetadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
    },
  },
};

export function websiteJsonLd() {
  const base = absoluteUrl('/');
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: base,
    description: SITE_DESCRIPTION,
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${absoluteUrl('/games')}?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };
}

export function organizationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_NAME,
    url: absoluteUrl('/'),
    logo: absoluteUrl('/icon.svg'),
    description: SITE_DESCRIPTION,
    sameAs: [] as string[],
  };
}

export function videoGameJsonLd(opts: {
  name: string;
  description?: string | null;
  image?: string | null;
  url: string;
  datePublished?: string | null;
  genre?: string[];
  aggregateRating?: { ratingValue: number; ratingCount: number };
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'VideoGame',
    name: opts.name,
    description: opts.description || undefined,
    image: opts.image || undefined,
    url: opts.url,
    datePublished: opts.datePublished || undefined,
    genre: opts.genre?.length ? opts.genre : undefined,
    applicationCategory: 'Game',
    ...(opts.aggregateRating && opts.aggregateRating.ratingCount > 0
      ? {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: opts.aggregateRating.ratingValue.toFixed(1),
            ratingCount: opts.aggregateRating.ratingCount,
            bestRating: '5',
            worstRating: '0.5',
          },
        }
      : {}),
  };
}

export function profileJsonLd(opts: {
  name: string;
  username: string;
  description?: string | null;
  image?: string | null;
  url: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ProfilePage',
    mainEntity: {
      '@type': 'Person',
      name: opts.name,
      alternateName: opts.username,
      description: opts.description || undefined,
      image: opts.image || undefined,
      url: opts.url,
    },
  };
}

/** BreadcrumbList structured data — helps Google show sitelinks breadcrumbs in search results. */
export function breadcrumbJsonLd(crumbs: Array<{ name: string; url: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((crumb, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: crumb.name,
      item: crumb.url,
    })),
  };
}

/** ItemList structured data for game lists — surfaces list content in rich results. */
export function gameListJsonLd(opts: {
  name: string;
  description?: string | null;
  url: string;
  author: string;
  games: Array<{ name: string; url: string; image?: string | null }>;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: opts.name,
    description: opts.description || undefined,
    url: opts.url,
    author: {
      '@type': 'Person',
      name: opts.author,
    },
    itemListElement: opts.games.map((game, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      item: {
        '@type': 'VideoGame',
        name: game.name,
        url: game.url,
        image: game.image || undefined,
      },
    })),
  };
}
