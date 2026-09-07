import { prisma } from './db';

// XP Rewards for different actions
export const XP_REWARDS = {
  TRACK_GAME: 10,
  COMPLETE_GAME: 20,
  CREATE_LIST: 30,
  WRITE_REVIEW: 50,
};

// Calculate user level from XP
// Using a formula where Level = floor(0.1 * sqrt(xp))
// e.g. 100 XP = Level 1, 10,000 XP = Level 10
export function calculateLevel(xp: number): number {
  return Math.max(1, Math.floor(0.1 * Math.sqrt(xp)) + 1);
}

export function getTierFromLevel(level: number): string {
  if (level >= 100) return 'Diamond';
  if (level >= 50) return 'Platinum';
  if (level >= 25) return 'Gold';
  if (level >= 10) return 'Silver';
  return 'Bronze';
}

export const BADGE_DEFINITIONS = [
  {
    id: 'explorer',
    name: 'Explorer',
    description: 'Play 5 Adventure or Open World games.',
    icon: 'Compass',
    evaluate: async (userId: string) => {
      const count = await prisma.userGame.count({
        where: {
          userId,
          game: {
            genres: {
              some: {
                genre: { in: ['Adventure', 'Role-playing (RPG)'] }
              }
            }
          }
        }
      });
      return count >= 5;
    }
  },
  {
    id: 'sharpshooter',
    name: 'Sharpshooter',
    description: 'Play 5 Shooter games.',
    icon: 'Target',
    evaluate: async (userId: string) => {
      const count = await prisma.userGame.count({
        where: {
          userId,
          game: {
            genres: {
              some: {
                genre: 'Shooter'
              }
            }
          }
        }
      });
      return count >= 5;
    }
  },
  {
    id: 'completionist',
    name: 'Completionist',
    description: 'Complete 10 games.',
    icon: 'Trophy',
    evaluate: async (userId: string) => {
      const count = await prisma.userGame.count({
        where: {
          userId,
          status: 'COMPLETED'
        }
      });
      return count >= 10;
    }
  },
  {
    id: 'critic',
    name: 'Harsh Critic',
    description: 'Write 10 reviews.',
    icon: 'Pen',
    evaluate: async (userId: string) => {
      const count = await prisma.review.count({
        where: { userId }
      });
      return count >= 10;
    }
  }
];

export async function grantXP(userId: string, amount: number) {
  await prisma.user.update({
    where: { id: userId },
    data: {
      xp: { increment: amount }
    }
  });
}

/**
 * Raise XP to match library / reviews / lists (never lowers).
 * Used after Steam / PSN / Xbox sync so imported games count toward level.
 */
export async function reconcileUserXp(userId: string): Promise<{ xp: number; gained: number }> {
  const [statuses, reviewCount, listCount, user] = await Promise.all([
    prisma.userGame.findMany({ where: { userId }, select: { status: true } }),
    prisma.review.count({ where: { userId } }),
    prisma.list.count({ where: { userId } }),
    prisma.user.findUnique({ where: { id: userId }, select: { xp: true } }),
  ]);

  let expected = 0;
  for (const { status } of statuses) {
    expected += status === 'COMPLETED' ? XP_REWARDS.COMPLETE_GAME : XP_REWARDS.TRACK_GAME;
  }
  expected += reviewCount * XP_REWARDS.WRITE_REVIEW;
  expected += listCount * XP_REWARDS.CREATE_LIST;

  const current = user?.xp ?? 0;
  const next = Math.max(current, expected);
  if (next > current) {
    await prisma.user.update({ where: { id: userId }, data: { xp: next } });
  }

  await evaluateBadges(userId);
  return { xp: next, gained: next - current };
}

export async function evaluateBadges(userId: string) {
  // Get all currently earned badges
  const earnedBadges = await prisma.userBadge.findMany({
    where: { userId },
    select: { badgeId: true }
  });
  
  const earnedBadgeIds = new Set(earnedBadges.map(b => b.badgeId));

  // Loop through definitions and evaluate any that are not yet earned
  for (const badge of BADGE_DEFINITIONS) {
    if (earnedBadgeIds.has(badge.id)) continue; // Already has it

    try {
      const qualifies = await badge.evaluate(userId);
      if (qualifies) {
        await prisma.userBadge.create({
          data: {
            userId,
            badgeId: badge.id
          }
        });
        console.log(`Granted badge ${badge.id} to user ${userId}`);
      }
    } catch (e) {
      console.error(`Error evaluating badge ${badge.id} for user ${userId}:`, e);
    }
  }
}
