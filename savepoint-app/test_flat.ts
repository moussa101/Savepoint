import { prisma } from './src/lib/db';

async function test() {
  console.time('fetch user flat');
  const user = await prisma.user.findUnique({
    where: { username: 'abdelrhmanmoussa218425' }
  });
  console.timeEnd('fetch user flat');
}

test();
