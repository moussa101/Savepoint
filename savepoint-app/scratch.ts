import { fetchIGDB } from './src/lib/igdb';

async function main() {
  const genres = await fetchIGDB('genres', 'fields id, name; limit 50; sort name asc;');
  const platforms = await fetchIGDB('platforms', 'fields id, name; where category = (1,4,5); limit 50; sort name asc;');
  
  console.log('GENRES:', JSON.stringify(genres, null, 2));
  console.log('PLATFORMS:', JSON.stringify(platforms, null, 2));
}
main();
