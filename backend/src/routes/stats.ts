import express from 'express';
import { authMiddleware, AuthRequest } from '../utils/auth';
import prisma from '../utils/db';

const router = express.Router();

// Get stats
router.get('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;

    let stats = await prisma.userStats.findUnique({
      where: { userId },
    });

    if (!stats) {
      // Create stats if they don't exist
      stats = await prisma.userStats.create({
        data: { userId },
      });
    }

    res.json(stats);
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

// Add hearts (used after level completion or intro)
router.post('/add-hearts', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;
    const { levelId, amount } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Valid amount is required' });
    }

    // If levelId is provided, verify level exists
    if (levelId) {
    const level = await prisma.level.findUnique({
      where: { id: levelId },
    });

    if (!level) {
      return res.status(404).json({ error: 'Level not found' });
      }
    }

    // Update stats
    const stats = await prisma.userStats.update({
      where: { userId },
      data: {
        heartsBalance: { increment: amount },
        totalHeartsEarned: { increment: amount },
      },
    });

    res.json(stats);
  } catch (error) {
    console.error('Add hearts error:', error);
    res.status(500).json({ error: 'Failed to add hearts' });
  }
});

export default router;

