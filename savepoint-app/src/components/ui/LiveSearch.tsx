'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useDebounce } from 'use-debounce';
import { SearchIcon } from '@/components/ui/Icons';

export default function LiveSearch({ initialQuery = '' }: { initialQuery?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  const [query, setQuery] = useState(initialQuery);
  const [debouncedQuery] = useDebounce(query, 150);

  useEffect(() => {
    // Only push if the query actually changed from what's in the URL
    const currentQ = searchParams.get('q') || '';
    
    if (debouncedQuery !== currentQ) {
      const params = new URLSearchParams(searchParams.toString());
      if (debouncedQuery) {
        params.set('q', debouncedQuery);
      } else {
        params.delete('q');
      }
      
      router.push(`${pathname}?${params.toString()}`);
    }
  }, [debouncedQuery, pathname, router, searchParams]);

  return (
    <div className="discover-search" style={{ marginBottom: 'var(--space-xl)', marginTop: 'var(--space-lg)' }}>
      <div className="input-group">
        <span className="input-icon"><SearchIcon size={16} /></span>
        <input
          type="search"
          enterKeyHint="search"
          placeholder="Search games…"
          className="input input-with-icon"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{ maxWidth: '600px', width: '100%' }}
        />
      </div>
    </div>
  );
}
