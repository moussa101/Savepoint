import { fetchIGDB } from './src/lib/igdb';

async function test() {
  const fallbackQuery = `
    fields name, slug, cover.image_id, genres.name, total_rating, category;
    where category = 0 & total_rating_count > 500 & total_rating > 90;
    sort total_rating desc;
    limit 10;
  `;
  try {
    const res = await fetchIGDB('games', fallbackQuery);
    console.log("Fallback results:", res.length);
  } catch(e: any) {
    console.error("ERROR:", e.message);
  }
}
test();
