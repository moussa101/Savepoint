export const IGDB_GENRES = [
  { id: 12, name: 'Role-playing (RPG)' },
  { id: 31, name: 'Adventure' },
  { id: 5, name: 'Shooter' },
  { id: 32, name: 'Indie' },
  { id: 8, name: 'Platform' },
  { id: 9, name: 'Puzzle' },
  { id: 10, name: 'Racing' },
  { id: 14, name: 'Sport' },
  { id: 4, name: 'Fighting' },
  { id: 15, name: 'Strategy' },
  { id: 13, name: 'Simulator' },
  { id: 2, name: 'Point-and-click' },
  { id: 33, name: 'Arcade' },
  { id: 34, name: 'Visual Novel' },
  { id: 25, name: 'Hack and slash' },
  { id: 11, name: 'Real Time Strategy (RTS)' },
  { id: 16, name: 'Turn-based strategy (TBS)' },
  { id: 24, name: 'Tactical' },
  { id: 7, name: 'Music' },
  { id: 35, name: 'Card & Board Game' },
  { id: 36, name: 'MOBA' },
];

export const IGDB_PLATFORMS = [
  { id: 6, name: 'PC (Windows)' },
  { id: 14, name: 'Mac' },
  { id: 167, name: 'PlayStation 5' },
  { id: 169, name: 'Xbox Series X|S' },
  { id: 130, name: 'Nintendo Switch' },
  { id: 48, name: 'PlayStation 4' },
  { id: 49, name: 'Xbox One' },
  { id: 9, name: 'PlayStation 3' },
  { id: 12, name: 'Xbox 360' }, // Xbox 360 is 12
  { id: 8, name: 'PlayStation 2' },
  { id: 11, name: 'Xbox' },
  { id: 37, name: 'Nintendo 3DS' },
  { id: 20, name: 'Nintendo DS' },
  { id: 5, name: 'Wii' },
  { id: 41, name: 'Wii U' },
  { id: 7, name: 'PlayStation' },
  { id: 19, name: 'SNES' },
  { id: 18, name: 'NES' },
];

export const SORT_OPTIONS = [
  { value: 'rating_desc', label: 'Highest Rated' },
  { value: 'rating_asc', label: 'Lowest Rated' },
  { value: 'popular_desc', label: 'Most Popular' },
  { value: 'popular_asc', label: 'Least Popular' },
  { value: 'newest', label: 'Newest Releases' },
  { value: 'oldest', label: 'Oldest Releases' },
];

// Generate years from current year down to 1980
const currentYear = new Date().getFullYear();
export const YEAR_OPTIONS = Array.from({ length: currentYear - 1979 }, (_, i) => ({
  value: (currentYear - i).toString(),
  label: (currentYear - i).toString(),
}));
