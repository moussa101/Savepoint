import { searchIGDBGamesAutocomplete } from './src/app/actions/games';

async function run() {
  try {
    const res = await searchIGDBGamesAutocomplete('fallout');
    console.log(res);
  } catch (e) {
    console.error(e);
  }
}
run();
