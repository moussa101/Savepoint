require('dotenv').config();
async function test() {
  const tokenRes = await fetch(`https://id.twitch.tv/oauth2/token?client_id=${process.env.TWITCH_CLIENT_ID}&client_secret=${process.env.TWITCH_CLIENT_SECRET}&grant_type=client_credentials`, { method: 'POST' });
  const tokenData = await tokenRes.json();
  const token = tokenData.access_token;
  
  const fallbackQuery = `
    fields name, slug, cover.image_id, genres.name, total_rating, category, total_rating_count;
    where category = 0 & total_rating_count > 100 & total_rating > 90;
    sort total_rating desc;
    limit 10;
  `;
  const res = await fetch('https://api.igdb.com/v4/games', {
    method: 'POST',
    headers: {
      'Client-ID': process.env.TWITCH_CLIENT_ID,
      'Authorization': `Bearer ${token}`
    },
    body: fallbackQuery
  });
  console.log(res.status, await res.text());
}
test();
