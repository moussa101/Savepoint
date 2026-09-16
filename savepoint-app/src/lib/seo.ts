import type { Metadata } from 'next';
import { getAppBaseUrl } from '@/lib/app-url';

export const SITE_NAME = 'Savepoint';
export const SITE_TAGLINE = 'Your Gaming Story, Told Beautifully';

/** Primary search-facing description — front-load high-intent phrases. */
export const SITE_DESCRIPTION =
  'Savepoint is the Letterboxd for games: a free video game tracker to log your backlog, rate and review titles, sync Steam, PlayStation & Xbox, and discover what to play next.';

/** Shorter title used in SERP / browser tabs (keep under ~60 chars). */
export const SITE_TITLE =
  'Savepoint — Letterboxd for Games | Track, Rate & Review';

export const SITE_KEYWORDS = [
  'Savepoint',
  'Savepoint gaming',
  'Letterboxd for games',
  'Letterboxd for video games',
  'game tracker',
  'video game tracker',
  'game library tracker',
  'game backlog tracker',
  'backloggd alternative',
  'track video games',
  'video game diary',
  'gaming diary',
  'game log',
  'rate video games',
  'video game reviews',
  'game ratings',
  'Steam library sync',
  'PlayStation library tracker',
  'Xbox game tracker',
  'gaming social network',
  'gaming profile',
  'discover video games',
  'game recommendations',
  'Goodreads for games',
];

export const SITE_FAQ: Array<{ question: string; answer: string }> = [
  {
    question: 'What is Savepoint?',
    answer:
      'Savepoint is a free social game tracker — like Letterboxd, but for video games. Log what you play, rate and review titles, build a public gaming profile, and follow friends for discovery.',
  },
  {
    question: 'Is Savepoint the Letterboxd for games?',
    answer:
      'Yes. Savepoint is built around the same loop gamers want from Letterboxd: track, rate, review, and share — with shelves for Playing, Completed, Want to Play, and Dropped, plus lists and an activity feed.',
  },
  {
    question: 'Can I sync Steam, PlayStation, or Xbox?',
    answer:
      'Yes. Connect Steam, PlayStation Network, and Xbox to import games and playtime into your Savepoint library so you do not have to add everything by hand.',
  },
  {
    question: 'Is Savepoint free?',
    answer:
      'Savepoint is free to use. Create an account, track your library, write reviews, follow other gamers, and sync supported platforms at no cost.',
  },
  {
    question: 'How do I track my game backlog?',
    answer:
      'Add any game from Discover, set a status (Want to Play, Playing, Completed, or Dropped), optionally rate it, and keep everything organized in My Library. Sync platforms to fill gaps automatically.',
  },
];

export function absoluteUrl(path = '/'): string {
  const base = getAppBaseUrl().replace(/\/$/, '');
  if (!path || path === '/') return base;
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}

export const defaultOgImage = absoluteUrl('/opengraph-image');

/** Shared root metadata for the App Router. */
export function buildRootMetadata(): Metadata {
  const base = getAppBaseUrl();
  const verificationToken = process.env.GOOGLE_SITE_VERIFICATION?.trim();

  return {
    metadataBase: new URL(base),
    title: {
      default: SITE_TITLE,
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
      title: SITE_TITLE,
      description: SITE_DESCRIPTION,
    },
    twitter: {
      card: 'summary_large_image',
      title: SITE_TITLE,
      description: SITE_DESCRIPTION,
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
    ...(verificationToken
      ? {
          verification: {
            google: verificationToken,
          },
        }
      : {}),
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
    alternateName: ['Savepoint Gaming', 'Savepoint — Letterboxd for Games'],
    url: base,
    description: SITE_DESCRIPTION,
    inLanguage: 'en-US',
    publisher: {
      '@type': 'Organization',
      name: SITE_NAME,
      url: base,
    },
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
    legalName: SITE_NAME,
    url: absoluteUrl('/'),
    logo: {
      '@type': 'ImageObject',
      url: absoluteUrl('/icon.svg'),
    },
    description: SITE_DESCRIPTION,
    foundingDate: '2025',
    sameAs: [
      // Add official social profiles when they exist (helps Knowledge Panel / entity SEO).
      ...(process.env.NEXT_PUBLIC_TWITTER_URL ? [process.env.NEXT_PUBLIC_TWITTER_URL] : []),
      ...(process.env.NEXT_PUBLIC_DISCORD_URL ? [process.env.NEXT_PUBLIC_DISCORD_URL] : []),
      ...(process.env.NEXT_PUBLIC_GITHUB_URL ? [process.env.NEXT_PUBLIC_GITHUB_URL] : []),
    ],
  };
}

/** Helps Google understand Savepoint as a free web product (rich results eligibility). */
export function softwareApplicationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: SITE_NAME,
    url: absoluteUrl('/'),
    applicationCategory: 'GameApplication',
    applicationSubCategory: 'Video game tracker',
    operatingSystem: 'Web browser',
    browserRequirements: 'Requires JavaScript',
    description: SITE_DESCRIPTION,
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
    featureList: [
      'Track Playing, Completed, Want to Play, and Dropped shelves',
      'Rate and review games with half-star precision',
      'Sync Steam, PlayStation, and Xbox libraries',
      'Follow friends and browse an activity feed',
      'Curate and share public game lists',
    ],
    screenshot: absoluteUrl('/opengraph-image'),
  };
}

export function faqJsonLd(faqs: Array<{ question: string; answer: string }> = SITE_FAQ) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
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

export function collectionPageJsonLd(opts: {
  name: string;
  description: string;
  url: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: opts.name,
    description: opts.description,
    url: opts.url,
    isPartOf: {
      '@type': 'WebSite',
      name: SITE_NAME,
      url: absoluteUrl('/'),
    },
  };
}
