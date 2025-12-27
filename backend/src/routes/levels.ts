import express from 'express';
import { authMiddleware, AuthRequest } from '../utils/auth';
import prisma from '../utils/db';

const router = express.Router();

// Get all levels with user progress
router.get('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;

    const levels = await prisma.level.findMany({
      orderBy: { orderIndex: 'asc' },
      include: {
        userProgress: {
          where: { userId },
          take: 1,
        },
      },
    });

    // Determine which levels are unlocked
    // Group levels by orderIndex to handle multiple levels with same orderIndex
    const levelsByOrderIndex = new Map<number, typeof levels>();
    levels.forEach(level => {
      if (!levelsByOrderIndex.has(level.orderIndex)) {
        levelsByOrderIndex.set(level.orderIndex, []);
      }
      levelsByOrderIndex.get(level.orderIndex)!.push(level);
    });

    const sortedOrderIndices = Array.from(levelsByOrderIndex.keys()).sort((a, b) => a - b);

    const levelsWithProgress = levels.map((level) => {
      const progress = level.userProgress[0];
      const isCompleted = progress?.completed || false;
      
      // Find the previous orderIndex
      const currentOrderIndex = level.orderIndex;
      const currentIndex = sortedOrderIndices.indexOf(currentOrderIndex);
      const prevOrderIndex = currentIndex > 0 ? sortedOrderIndices[currentIndex - 1] : null;
      
      // Check if any level with previous orderIndex is completed
      let prevLevelCompleted = false;
      if (prevOrderIndex !== null) {
        const prevLevels = levelsByOrderIndex.get(prevOrderIndex) || [];
        prevLevelCompleted = prevLevels.some(prevLevel => {
          const prevProgress = prevLevel.userProgress[0];
          return prevProgress?.completed || false;
        });
      }
      
      // Level is locked if it's not the first level (orderIndex 1) AND the previous level is not completed
      const isLocked = currentOrderIndex > 1 && !prevLevelCompleted;

      console.log(`Level ${level.code} (orderIndex ${level.orderIndex}): completed=${isCompleted}, prevOrderIndex=${prevOrderIndex}, prevLevelCompleted=${prevLevelCompleted}, isLocked=${isLocked}`);

      return {
        id: level.id,
        code: level.code,
        name: level.name,
        orderIndex: level.orderIndex,
        heartsRewardDefault: level.heartsRewardDefault,
        completed: isCompleted,
        unlocked: !isLocked,
        bestScore: progress?.bestScore || null,
        completedAt: progress?.completedAt || null,
      };
    });

    // First level (orderIndex 1) is always unlocked
    levelsWithProgress.forEach(level => {
      if (level.orderIndex === 1) {
        level.unlocked = true;
      }
    });
    
    // Debug log
    console.log('Levels with progress:', levelsWithProgress.map(l => ({
      code: l.code,
      orderIndex: l.orderIndex,
      completed: l.completed,
      unlocked: l.unlocked
    })));

    res.json(levelsWithProgress);
  } catch (error) {
    console.error('Get levels error:', error);
    res.status(500).json({ error: 'Failed to get levels' });
  }
});

// Complete level
router.post('/complete', authMiddleware, async (req: AuthRequest, res) => {
  try {
    console.log('POST /complete endpoint hit');
    console.log('Request body:', req.body);
    console.log('Request headers:', req.headers);
    const userId = req.userId!;
    const { levelId, levelCode, score } = req.body;

    console.log('Complete level request:', { userId, levelId, levelCode, score });

    // Support both levelId (UUID) and levelCode (string)
    let level;
    if (levelCode) {
      level = await prisma.level.findUnique({
        where: { code: levelCode },
      });
      console.log('Found level by code:', level ? { id: level.id, code: level.code, orderIndex: level.orderIndex } : 'not found');
    } else if (levelId) {
      level = await prisma.level.findUnique({
        where: { id: levelId },
      });
      console.log('Found level by id:', level ? { id: level.id, code: level.code, orderIndex: level.orderIndex } : 'not found');
    } else {
      return res.status(400).json({ error: 'levelId or levelCode is required' });
    }

    if (!level) {
      console.error('Level not found:', { levelCode, levelId });
      return res.status(404).json({ error: 'Level not found' });
    }
    
    const actualLevelId = level.id;
    console.log('Using levelId:', actualLevelId, 'for level code:', level.code);

    // Check if already completed
    const existingProgress = await prisma.userLevelProgress.findUnique({
      where: {
        userId_levelId: {
          userId,
          levelId: actualLevelId,
        },
      },
    });

    let heartsAwarded = 0;

    // Only award hearts if level is NOT already completed
    if (!existingProgress || !existingProgress.completed) {
      // Mark as completed
      await prisma.userLevelProgress.upsert({
        where: {
          userId_levelId: {
            userId,
            levelId: actualLevelId,
          },
        },
        update: {
          completed: true,
          completedAt: new Date(),
          bestScore: score || null,
        },
        create: {
          userId,
          levelId: actualLevelId,
          completed: true,
          completedAt: new Date(),
          bestScore: score || null,
        },
      });

      // Award hearts - always exactly 10 for consistency
      heartsAwarded = 10;
      await prisma.userStats.update({
        where: { userId },
        data: {
          heartsBalance: { increment: heartsAwarded },
          totalHeartsEarned: { increment: heartsAwarded },
          totalLevelsCompleted: { increment: 1 },
        },
      });
    } else {
      // Level already completed - no hearts awarded
      console.log(`Level ${actualLevelId} (${level.code}) already completed for user ${userId}, no hearts awarded`);
    }

    const progress = await prisma.userLevelProgress.findUnique({
      where: {
        userId_levelId: {
          userId,
          levelId: actualLevelId,
        },
      },
    });

    console.log('Returning completion response:', { completed: true, heartsAwarded, progress: progress ? { completed: progress.completed, completedAt: progress.completedAt } : null });

    res.json({
      completed: true,
      heartsAwarded,
      progress,
    });
  } catch (error) {
    console.error('Complete level error:', error);
    res.status(500).json({ error: 'Failed to complete level' });
  }
});

export default router;

