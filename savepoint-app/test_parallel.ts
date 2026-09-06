import { prisma } from './src/lib/db';

async function test() {
  console.time('fetch user parallel');
  
  const user = await prisma.user.findUnique({
    where: { username: 'abdelrhmanmoussa218425' },
    include: {
      _count: {
        select: { followers: true, following: true, reviews: true, lists: true },
      },
    },
  });

  if (user) {
    const [userGames, reviews, lists, favoriteGames] = await Promise.all([
      prisma.userGame.findMany({
        where: { userId: user.id },
        include: { game: true },
        orderBy: { updatedAt: 'desc' },
      }),
      prisma.review.findMany({
        where: { userId: user.id },
        include: { game: true },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
      prisma.list.findMany({
        where: { userId: user.id, visibility: 'PUBLIC' },
        include: { items: { include: { game: true }, take: 4 } },
        orderBy: { updatedAt: 'desc' },
        take: 4,
      }),
      prisma.favoriteGame.findMany({
        where: { userId: user.id },
        include: { game: true },
        orderBy: { order: 'asc' },
        take: 6,
      }),
    ]);
  }
  
  console.timeEnd('fetch user parallel');
}

test();
