'use client';

import { useState, useEffect, useRef } from 'react';
import { searchIGDBGamesAutocomplete, ensureGameExistsLocally } from '@/app/actions/games';
import { useDebounce } from 'use-debounce';

interface GameAutocompleteProps {
  onSelect: (localGameId: string) => void;
  placeholder?: string;
}

export default function GameAutocomplete({ onSelect, placeholder = 'Search for a game...' }: GameAutocompleteProps) {
  const [query, setQuery] = useState('');
  const [debouncedQuery] = useDebounce(query, 500);
  const [results, setResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isCaching, setIsCaching] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function search() {
      if (debouncedQuery.length < 2) {
        setResults([]);
        setIsOpen(false);
        return;
      }
      setIsSearching(true);
      try {
        const data = await searchIGDBGamesAutocomplete(debouncedQuery);
        setResults(data);
        setIsOpen(true);
      } catch (err) {
        console.error('Search failed', err);
      } finally {
        setIsSearching(false);
      }
    }
    search();
  }, [debouncedQuery]);

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function handleSelect(igdbId: string, gameName: string) {
    setIsCaching(true);
    setQuery(gameName);
    setIsOpen(false);
    try {
      const localId = await ensureGameExistsLocally(igdbId);
      onSelect(localId);
    } catch (err) {
      console.error('Failed to cache game locally', err);
      setQuery('');
    } finally {
      setIsCaching(false);
    }
  }

  return (
    <div className="autocomplete-container" ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      <input
        type="text"
        className="input"
        placeholder={isCaching ? 'Loading game data...' : placeholder}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setIsOpen(true);
        }}
        disabled={isCaching}
        autoComplete="off"
      />
      {isSearching && (
        <div style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)' }}>
          <span className="spinner" style={{ width: '16px', height: '16px', border: '2px solid var(--text-muted)', borderTopColor: 'transparent', borderRadius: '50%', display: 'inline-block', animation: 'spin 1s linear infinite' }} />
        </div>
      )}

      {isOpen && results.length > 0 && (
        <ul className="card card-glass" style={{
          position: 'absolute', top: '100%', left: 0, right: 0, 
          marginTop: '4px', padding: 0, zIndex: 1000, 
          listStyle: 'none', maxHeight: '300px', overflowY: 'auto'
        }}>
          {results.map((game) => (
            <li 
              key={game.id}
              onClick={() => handleSelect(game.id, game.name)}
              style={{
                display: 'flex', gap: 'var(--space-sm)', alignItems: 'center',
                padding: 'var(--space-sm)', cursor: 'pointer',
                borderBottom: '1px solid var(--bg-surface-border)'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-surface-hover)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <div className="game-cover" style={{ width: '40px', height: '53px', flexShrink: 0 }}>
                {game.coverImage ? (
                  <img src={game.coverImage} alt={game.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: '100%', height: '100%', backgroundColor: 'var(--bg-body)' }} />
                )}
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>{game.name}</div>
                {game.releaseYear && (
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{game.releaseYear}</div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
      
      {isOpen && query.length >= 2 && results.length === 0 && !isSearching && (
        <div className="card card-glass" style={{
          position: 'absolute', top: '100%', left: 0, right: 0, 
          marginTop: '4px', padding: 'var(--space-md)', zIndex: 1000,
          textAlign: 'center', color: 'var(--text-muted)'
        }}>
          No games found.
        </div>
      )}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
