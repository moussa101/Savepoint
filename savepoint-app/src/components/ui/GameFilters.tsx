'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { IGDB_GENRES, IGDB_PLATFORMS, SORT_OPTIONS, YEAR_OPTIONS } from '@/lib/igdb-constants';
import { FilterIcon, XIcon } from '@/components/ui/Icons';

export default function GameFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [isOpen, setIsOpen] = useState(false);
  
  // Local state for filters
  const [selectedGenres, setSelectedGenres] = useState<number[]>([]);
  const [selectedPlatforms, setSelectedPlatforms] = useState<number[]>([]);
  const [sort, setSort] = useState('');
  const [year, setYear] = useState('');
  
  // Sync state from URL
  useEffect(() => {
    const genres = searchParams.get('genres');
    if (genres) {
      setSelectedGenres(genres.split(',').map(Number));
    } else {
      setSelectedGenres([]);
    }
    
    const platforms = searchParams.get('platforms');
    if (platforms) {
      setSelectedPlatforms(platforms.split(',').map(Number));
    } else {
      setSelectedPlatforms([]);
    }
    
    setSort(searchParams.get('sort') || '');
    setYear(searchParams.get('year') || '');
  }, [searchParams]);

  const applyFilters = (updates: { genres?: number[], platforms?: number[], sort?: string, year?: string }) => {
    const params = new URLSearchParams(searchParams.toString());
    
    // Genres
    const newGenres = updates.genres !== undefined ? updates.genres : selectedGenres;
    if (newGenres.length > 0) {
      params.set('genres', newGenres.join(','));
    } else {
      params.delete('genres');
    }
    
    // Platforms
    const newPlatforms = updates.platforms !== undefined ? updates.platforms : selectedPlatforms;
    if (newPlatforms.length > 0) {
      params.set('platforms', newPlatforms.join(','));
    } else {
      params.delete('platforms');
    }
    
    // Sort
    const newSort = updates.sort !== undefined ? updates.sort : sort;
    if (newSort) {
      params.set('sort', newSort);
    } else {
      params.delete('sort');
    }
    
    // Year
    const newYear = updates.year !== undefined ? updates.year : year;
    if (newYear) {
      params.set('year', newYear);
    } else {
      params.delete('year');
    }
    
    // Reset search query if it exists when changing filters
    // Or keep it? Let's keep it to filter search results.
    
    router.push(`/games?${params.toString()}`);
  };

  const toggleGenre = (id: number) => {
    const next = selectedGenres.includes(id)
      ? selectedGenres.filter(g => g !== id)
      : [...selectedGenres, id];
    applyFilters({ genres: next });
  };

  const togglePlatform = (id: number) => {
    const next = selectedPlatforms.includes(id)
      ? selectedPlatforms.filter(p => p !== id)
      : [...selectedPlatforms, id];
    applyFilters({ platforms: next });
  };
  
  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    applyFilters({ sort: e.target.value });
  };
  
  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    applyFilters({ year: e.target.value });
  };
  
  const clearFilters = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete('genres');
    params.delete('platforms');
    params.delete('sort');
    params.delete('year');
    router.push(`/games?${params.toString()}`);
  };

  const hasActiveFilters = selectedGenres.length > 0 || selectedPlatforms.length > 0 || sort || year;

  return (
    <>
      {/* Mobile Toggle */}
      <div className="mobile-filters-toggle">
        <button className="btn btn-outline" onClick={() => setIsOpen(!isOpen)} style={{ width: '100%', marginBottom: 'var(--space-md)' }}>
          <FilterIcon size={16} /> Filters {hasActiveFilters && <span style={{ background: 'var(--accent-primary)', color: 'black', borderRadius: '50%', width: '20px', height: '20px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', marginLeft: '8px', fontWeight: 'bold' }}>!</span>}
        </button>
      </div>

      {/* Sidebar Content */}
      <div className={`filters-sidebar ${isOpen ? 'open' : ''}`}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-md)' }}>
          <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FilterIcon size={18} /> Filters
          </h3>
          <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
            {hasActiveFilters && (
              <button className="btn btn-ghost btn-sm" onClick={clearFilters} style={{ color: 'var(--text-muted)' }}>
                Clear
              </button>
            )}
            <button className="mobile-close-btn btn btn-ghost btn-icon btn-sm" onClick={() => setIsOpen(false)}>
              <XIcon size={20} />
            </button>
          </div>
        </div>

        <div className="filter-group">
          <label className="filter-label">Sort By</label>
          <select className="input filter-select" value={sort} onChange={handleSortChange}>
            <option value="">Default (Popularity)</option>
            {SORT_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
        
        <div className="filter-group">
          <label className="filter-label">Release Year</label>
          <select className="input filter-select" value={year} onChange={handleYearChange}>
            <option value="">Any Year</option>
            {YEAR_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label className="filter-label">Genres</label>
          <div className="checkbox-list">
            {IGDB_GENRES.map(genre => (
              <label key={genre.id} className="checkbox-label">
                <input 
                  type="checkbox" 
                  checked={selectedGenres.includes(genre.id)}
                  onChange={() => toggleGenre(genre.id)}
                />
                <span className="checkbox-text">{genre.name}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="filter-group">
          <label className="filter-label">Platforms</label>
          <div className="checkbox-list">
            {IGDB_PLATFORMS.map(platform => (
              <label key={platform.id} className="checkbox-label">
                <input 
                  type="checkbox" 
                  checked={selectedPlatforms.includes(platform.id)}
                  onChange={() => togglePlatform(platform.id)}
                />
                <span className="checkbox-text">{platform.name}</span>
              </label>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
