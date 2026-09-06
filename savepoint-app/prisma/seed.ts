import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const games = [
  {
    name: 'Red Dead Redemption 2',
    slug: 'red-dead-redemption-2',
    description: 'America, 1899. Arthur Morgan and the Van der Linde gang are outlaws on the run. With federal agents and the best bounty hunters in the nation massing on their heels, the gang must rob, steal and fight their way across the rugged heartland of America in order to survive.',
    coverImage: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co1q1f.webp',
    bannerImage: 'https://images.igdb.com/igdb/image/upload/t_screenshot_big/hrirzcc5l4euenudcnyz.webp',
    releaseDate: new Date('2018-10-26'),
    developer: 'Rockstar Studios',
    publisher: 'Rockstar Games',
    genres: ['Action', 'Adventure', 'Open World'],
    platforms: ['PS4', 'PS5', 'Xbox One', 'Xbox Series X', 'PC'],
  },
  {
    name: 'The Witcher 3: Wild Hunt',
    slug: 'the-witcher-3-wild-hunt',
    description: 'As war rages on throughout the Northern Realms, you take on the greatest contract of your life — tracking down the Child of Prophecy, a living weapon that can alter the shape of the world.',
    coverImage: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co1wyy.webp',
    bannerImage: 'https://images.igdb.com/igdb/image/upload/t_screenshot_big/sc6m95.webp',
    releaseDate: new Date('2015-05-19'),
    developer: 'CD Projekt RED',
    publisher: 'CD Projekt',
    genres: ['RPG', 'Action', 'Open World'],
    platforms: ['PS4', 'PS5', 'Xbox One', 'Xbox Series X', 'PC', 'Nintendo Switch'],
  },
  {
    name: 'Elden Ring',
    slug: 'elden-ring',
    description: 'THE NEW FANTASY ACTION RPG. Rise, Tarnished, and be guided by grace to brandish the power of the Elden Ring and become an Elden Lord in the Lands Between.',
    coverImage: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co4jni.webp',
    bannerImage: 'https://images.igdb.com/igdb/image/upload/t_screenshot_big/scdjt3.webp',
    releaseDate: new Date('2022-02-25'),
    developer: 'FromSoftware',
    publisher: 'Bandai Namco Entertainment',
    genres: ['RPG', 'Action', 'Open World'],
    platforms: ['PS4', 'PS5', 'Xbox One', 'Xbox Series X', 'PC'],
  },
  {
    name: 'God of War Ragnarök',
    slug: 'god-of-war-ragnarok',
    description: 'Embark on a mythic journey for answers and allies before Ragnarök arrives. Kratos and Atreus must journey to each of the Nine Realms in search of answers as Asgardian forces prepare for a prophesied battle.',
    coverImage: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co5s5v.webp',
    bannerImage: 'https://images.igdb.com/igdb/image/upload/t_screenshot_big/scb5w2.webp',
    releaseDate: new Date('2022-11-09'),
    developer: 'Santa Monica Studio',
    publisher: 'Sony Interactive Entertainment',
    genres: ['Action', 'Adventure'],
    platforms: ['PS4', 'PS5', 'PC'],
  },
  {
    name: 'The Last of Us Part II',
    slug: 'the-last-of-us-part-ii',
    description: 'Five years after their dangerous journey across the post-pandemic United States, Ellie and Joel have settled down in Jackson, Wyoming. When a violent event disrupts that peace, Ellie embarks on a relentless journey.',
    coverImage: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co5ziw.webp',
    bannerImage: 'https://images.igdb.com/igdb/image/upload/t_screenshot_big/sc8h7w.webp',
    releaseDate: new Date('2020-06-19'),
    developer: 'Naughty Dog',
    publisher: 'Sony Interactive Entertainment',
    genres: ['Action', 'Adventure'],
    platforms: ['PS4', 'PS5', 'PC'],
  },
  {
    name: 'Hades',
    slug: 'hades',
    description: 'Defy the god of the dead as you hack and slash out of the Underworld in this rogue-like dungeon crawler from the creators of Bastion and Transistor.',
    coverImage: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co1r0o.webp',
    bannerImage: 'https://images.igdb.com/igdb/image/upload/t_screenshot_big/sc8gp7.webp',
    releaseDate: new Date('2020-09-17'),
    developer: 'Supergiant Games',
    publisher: 'Supergiant Games',
    genres: ['Action', 'Roguelike', 'Indie'],
    platforms: ['PC', 'Nintendo Switch', 'PS4', 'PS5', 'Xbox One', 'Xbox Series X'],
  },
  {
    name: 'Hollow Knight',
    slug: 'hollow-knight',
    description: 'Forge your own path in Hollow Knight! An epic action adventure through a vast ruined kingdom of insects and heroes. Explore twisting caverns, battle tainted creatures and befriend bizarre bugs.',
    coverImage: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co1rgi.webp',
    bannerImage: 'https://images.igdb.com/igdb/image/upload/t_screenshot_big/sc3t1m.webp',
    releaseDate: new Date('2017-02-24'),
    developer: 'Team Cherry',
    publisher: 'Team Cherry',
    genres: ['Action', 'Adventure', 'Platformer', 'Indie'],
    platforms: ['PC', 'Nintendo Switch', 'PS4', 'Xbox One'],
  },
  {
    name: 'Cyberpunk 2077',
    slug: 'cyberpunk-2077',
    description: 'Cyberpunk 2077 is an open-world, action-adventure RPG set in the megalopolis of Night City, where you play as a cyberpunk mercenary wrapped up in a do-or-die fight for survival.',
    coverImage: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co4hku.webp',
    bannerImage: 'https://images.igdb.com/igdb/image/upload/t_screenshot_big/sc8p4l.webp',
    releaseDate: new Date('2020-12-10'),
    developer: 'CD Projekt RED',
    publisher: 'CD Projekt',
    genres: ['RPG', 'Action', 'Open World', 'Shooter'],
    platforms: ['PS4', 'PS5', 'Xbox One', 'Xbox Series X', 'PC'],
  },
  {
    name: 'The Legend of Zelda: Tears of the Kingdom',
    slug: 'the-legend-of-zelda-tears-of-the-kingdom',
    description: 'An epic adventure across the land and skies of Hyrule awaits in The Legend of Zelda: Tears of the Kingdom. In addition to the vast lands of Hyrule, the sky above is yours to explore.',
    coverImage: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co5vmg.webp',
    bannerImage: 'https://images.igdb.com/igdb/image/upload/t_screenshot_big/scm3gs.webp',
    releaseDate: new Date('2023-05-12'),
    developer: 'Nintendo EPD',
    publisher: 'Nintendo',
    genres: ['Action', 'Adventure', 'Open World'],
    platforms: ['Nintendo Switch'],
  },
  {
    name: 'Baldur\'s Gate 3',
    slug: 'baldurs-gate-3',
    description: 'Gather your party and return to the Forgotten Realms in a tale of fellowship and betrayal, sacrifice and survival, and the lure of absolute power.',
    coverImage: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co670h.webp',
    bannerImage: 'https://images.igdb.com/igdb/image/upload/t_screenshot_big/scm3wm.webp',
    releaseDate: new Date('2023-08-03'),
    developer: 'Larian Studios',
    publisher: 'Larian Studios',
    genres: ['RPG', 'Strategy', 'Adventure'],
    platforms: ['PC', 'PS5', 'Xbox Series X'],
  },
  {
    name: 'Persona 5 Royal',
    slug: 'persona-5-royal',
    description: 'Don the mask of Joker and join the Phantom Thieves of Hearts. Break free from the chains of modern society and stage grand heists to infiltrate the minds of the corrupt.',
    coverImage: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co2t97.webp',
    bannerImage: 'https://images.igdb.com/igdb/image/upload/t_screenshot_big/sc6hsc.webp',
    releaseDate: new Date('2019-10-31'),
    developer: 'Atlus',
    publisher: 'Atlus',
    genres: ['RPG', 'Adventure'],
    platforms: ['PS4', 'PS5', 'PC', 'Nintendo Switch', 'Xbox One', 'Xbox Series X'],
  },
  {
    name: 'Sekiro: Shadows Die Twice',
    slug: 'sekiro-shadows-die-twice',
    description: 'Carve your own clever path to vengeance in an all-new adventure from developer FromSoftware. Explore late 1500s Sengoku Japan, a brutal period of constant life-and-death conflict.',
    coverImage: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co1r0h.webp',
    bannerImage: 'https://images.igdb.com/igdb/image/upload/t_screenshot_big/sc5s7h.webp',
    releaseDate: new Date('2019-03-22'),
    developer: 'FromSoftware',
    publisher: 'Activision',
    genres: ['Action', 'Adventure'],
    platforms: ['PS4', 'Xbox One', 'PC'],
  },
  {
    name: 'Ghost of Tsushima',
    slug: 'ghost-of-tsushima',
    description: 'In the late 13th century, the Mongol empire has laid waste to entire nations along their campaign to conquer the East. Tsushima Island is all that stands between mainland Japan and a massive Mongol invasion fleet.',
    coverImage: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co2ekt.webp',
    bannerImage: 'https://images.igdb.com/igdb/image/upload/t_screenshot_big/sc7vjr.webp',
    releaseDate: new Date('2020-07-17'),
    developer: 'Sucker Punch Productions',
    publisher: 'Sony Interactive Entertainment',
    genres: ['Action', 'Adventure', 'Open World'],
    platforms: ['PS4', 'PS5', 'PC'],
  },
  {
    name: 'Celeste',
    slug: 'celeste',
    description: 'Help Madeline survive her inner demons on her journey to the top of Celeste Mountain, in this super-tight platformer from the creators of TowerFall.',
    coverImage: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co3byy.webp',
    bannerImage: 'https://images.igdb.com/igdb/image/upload/t_screenshot_big/sc5k30.webp',
    releaseDate: new Date('2018-01-25'),
    developer: 'Maddy Makes Games',
    publisher: 'Maddy Makes Games',
    genres: ['Platformer', 'Indie'],
    platforms: ['PC', 'Nintendo Switch', 'PS4', 'Xbox One'],
  },
  {
    name: 'Disco Elysium',
    slug: 'disco-elysium',
    description: 'A CRPG in which, waking up in a trashed hostel room, a detective with a serious case of amnesia must solve a murder, with no weapons, no backup, and a dim sim of recognition.',
    coverImage: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co1sfj.webp',
    bannerImage: 'https://images.igdb.com/igdb/image/upload/t_screenshot_big/sc8pnn.webp',
    releaseDate: new Date('2019-10-15'),
    developer: 'ZA/UM',
    publisher: 'ZA/UM',
    genres: ['RPG', 'Adventure', 'Indie'],
    platforms: ['PC', 'PS4', 'PS5', 'Nintendo Switch', 'Xbox One', 'Xbox Series X'],
  },
  {
    name: 'Dark Souls III',
    slug: 'dark-souls-iii',
    description: 'As fires fade and the world falls into ruin, journey into a universe filled with more colossal enemies and environments. Players will be immersed into a world of epic atmosphere and darkness.',
    coverImage: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co1vcf.webp',
    bannerImage: 'https://images.igdb.com/igdb/image/upload/t_screenshot_big/mnljnmhk0deedxjgmqaa.webp',
    releaseDate: new Date('2016-04-12'),
    developer: 'FromSoftware',
    publisher: 'Bandai Namco Entertainment',
    genres: ['RPG', 'Action'],
    platforms: ['PS4', 'Xbox One', 'PC'],
  },
  {
    name: 'Stardew Valley',
    slug: 'stardew-valley',
    description: "You've inherited your grandfather's old farm plot in Stardew Valley. Armed with hand-me-down tools and a few coins, you set out to begin your new life.",
    coverImage: 'https://images.igdb.com/igdb/image/upload/t_cover_big/xrpmydnu9rpxvxfjkiu7.webp',
    bannerImage: 'https://images.igdb.com/igdb/image/upload/t_screenshot_big/jnqeaphqkj3fxvufxfot.webp',
    releaseDate: new Date('2016-02-26'),
    developer: 'ConcernedApe',
    publisher: 'ConcernedApe',
    genres: ['Simulation', 'RPG', 'Indie'],
    platforms: ['PC', 'PS4', 'Xbox One', 'Nintendo Switch', 'iOS', 'Android'],
  },
  {
    name: 'Horizon Forbidden West',
    slug: 'horizon-forbidden-west',
    description: 'Join Aloy as she braves the Forbidden West – a majestic but dangerous frontier that conceals mysterious new threats.',
    coverImage: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co4jni.webp',
    bannerImage: 'https://images.igdb.com/igdb/image/upload/t_screenshot_big/scekq3.webp',
    releaseDate: new Date('2022-02-18'),
    developer: 'Guerrilla Games',
    publisher: 'Sony Interactive Entertainment',
    genres: ['Action', 'RPG', 'Open World'],
    platforms: ['PS4', 'PS5', 'PC'],
  },
  {
    name: 'Doom Eternal',
    slug: 'doom-eternal',
    description: "Hell's armies have invaded Earth. Become the Slayer in an epic single-player campaign to conquer demons across dimensions and stop the final destruction of humanity.",
    coverImage: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co2dto.webp',
    bannerImage: 'https://images.igdb.com/igdb/image/upload/t_screenshot_big/sc70xj.webp',
    releaseDate: new Date('2020-03-20'),
    developer: 'id Software',
    publisher: 'Bethesda Softworks',
    genres: ['Shooter', 'Action'],
    platforms: ['PC', 'PS4', 'PS5', 'Xbox One', 'Xbox Series X', 'Nintendo Switch'],
  },
  {
    name: 'Final Fantasy VII Rebirth',
    slug: 'final-fantasy-vii-rebirth',
    description: 'The next standalone chapter in the Final Fantasy VII remake project, covering the party\'s journey beyond Midgar.',
    coverImage: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co7k3s.webp',
    bannerImage: 'https://images.igdb.com/igdb/image/upload/t_screenshot_big/scohud.webp',
    releaseDate: new Date('2024-02-29'),
    developer: 'Square Enix',
    publisher: 'Square Enix',
    genres: ['RPG', 'Action', 'Adventure'],
    platforms: ['PS5', 'PC'],
  },
];

async function main() {
  console.log('🌱 Seeding database...');

  for (const game of games) {
    const { genres, platforms, ...gameData } = game;

    const created = await prisma.game.upsert({
      where: { slug: gameData.slug },
      update: gameData,
      create: gameData,
    });

    // Add genres
    for (const genre of genres) {
      await prisma.gameGenre.upsert({
        where: {
          gameId_genre: { gameId: created.id, genre },
        },
        update: {},
        create: { gameId: created.id, genre },
      });
    }

    // Add platforms
    for (const platform of platforms) {
      await prisma.gamePlatform.upsert({
        where: {
          gameId_platform: { gameId: created.id, platform },
        },
        update: {},
        create: { gameId: created.id, platform },
      });
    }

    console.log(`  ✅ ${game.name}`);
  }

  console.log(`\n🎮 Seeded ${games.length} games successfully!`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
