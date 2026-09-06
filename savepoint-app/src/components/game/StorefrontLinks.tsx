'use client';

import { SteamIcon, AppleIcon, AndroidIcon, ExternalLinkIcon, LinkIcon } from '@/components/ui/Icons';
import Link from 'next/link';

interface Website {
  type: number;
  url: string;
}

interface StorefrontLinksProps {
  websites: Website[];
}

// Map IGDB website categories to our UI representation
// 1 = official, 13 = Steam, 16 = Epic Games, 17 = GOG, 10 = iPhone, 12 = Android, 15 = itch
const STORE_CATEGORIES: Record<number, { name: string; icon: React.ComponentType<any> }> = {
  13: { name: 'Steam', icon: SteamIcon },
  16: { name: 'Epic Games', icon: ExternalLinkIcon }, // Fallback for Epic
  17: { name: 'GOG.com', icon: ExternalLinkIcon }, // Fallback for GOG
  10: { name: 'App Store', icon: AppleIcon },
  12: { name: 'Google Play', icon: AndroidIcon },
  15: { name: 'itch.io', icon: ExternalLinkIcon },
  1: { name: 'Official Website', icon: LinkIcon },
};

export default function StorefrontLinks({ websites }: StorefrontLinksProps) {
  if (!websites || websites.length === 0) return null;

  // Filter only the categories we want to show
  const allowedCategories = [13, 16, 17, 10, 12, 15, 1];
  
  const storefronts = websites
    .filter(site => allowedCategories.includes(site.type))
    // Prioritize specific stores over the general official website
    .sort((a, b) => {
      if (a.type === 1) return 1;
      if (b.type === 1) return -1;
      return 0;
    });

  if (storefronts.length === 0) return null;

  return (
    <div style={{
      backgroundColor: 'var(--bg-surface)',
      borderRadius: 'var(--radius-lg)',
      padding: 'var(--space-lg)',
      marginTop: 'var(--space-xl)',
    }}>
      <h3 style={{ 
        margin: '0 0 var(--space-md) 0', 
        fontSize: 'var(--text-lg)', 
        fontWeight: 700 
      }}>
        Where to Play
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
        {storefronts.map((site) => {
          const store = STORE_CATEGORIES[site.type];
          if (!store) return null;
          
          const Icon = store.icon;
          
          return (
            <Link 
              key={site.url} 
              href={site.url} 
              target="_blank" 
              rel="noopener noreferrer"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-sm)',
                padding: 'var(--space-sm) var(--space-md)',
                backgroundColor: 'var(--bg-surface-elevated)',
                borderRadius: 'var(--radius-md)',
                textDecoration: 'none',
                color: 'var(--text-primary)',
                fontWeight: 500,
                transition: 'background-color 0.2s ease, transform 0.1s ease',
                border: '1px solid rgba(255,255,255,0.05)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--bg-surface-hover)';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--bg-surface-elevated)';
                e.currentTarget.style.transform = 'none';
              }}
            >
              <Icon size={18} color="var(--text-secondary)" />
              <span>{store.name}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
