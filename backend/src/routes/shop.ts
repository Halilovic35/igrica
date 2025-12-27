import express from 'express';
import { authMiddleware, AuthRequest } from '../utils/auth';
import prisma from '../utils/db';

const router = express.Router();

// Get all shop items with ownership status
router.get('/items', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;

    const items = await prisma.item.findMany({
      orderBy: [{ type: 'asc' }, { priceHearts: 'asc' }],
    });

    const userItems = await prisma.userItem.findMany({
      where: { userId },
      select: { itemId: true },
    });

    const ownedItemIds = new Set(userItems.map(ui => ui.itemId));

    // Map items: ensure slot is set from type if missing, and ensure assetPath is populated
    const itemsWithOwnership = items.map(item => {
      let slot = item.slot;
      // If slot is missing, map from type
      if (!slot) {
        const typeToSlotMap: Record<string, string> = {
          // New Keri system
          'BODY': 'Base',
          'HAIR': 'Hair',
          'EYES': 'Eyes',
          'EYEBROWS': 'Eyebrows',
          'MOUTH': 'Mouth',
          'TOP': 'Top',
          'BOTTOM': 'Bottom',
          'MISC': 'Misc',
          // Legacy mappings
          'OUTFIT': 'Top',
          'HEAD_ACCESSORY': 'Hair',
          'AURA': 'Misc',
          'EFFECT': 'Misc',
        };
        slot = typeToSlotMap[item.type] || null;
      }
      
      return {
      ...item,
        slot: slot || item.slot,
      owned: ownedItemIds.has(item.id),
      };
    });

    res.json(itemsWithOwnership);
  } catch (error) {
    console.error('Get shop items error:', error);
    res.status(500).json({ error: 'Failed to get shop items' });
  }
});

// Buy item
router.post('/buy', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;
    const { itemId } = req.body;

    if (!itemId) {
      return res.status(400).json({ error: 'itemId is required' });
    }

    // Check if item exists
    const item = await prisma.item.findUnique({
      where: { id: itemId },
    });

    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    // Check if already owned
    const existingUserItem = await prisma.userItem.findUnique({
      where: {
        userId_itemId: {
          userId,
          itemId,
        },
      },
    });

    if (existingUserItem) {
      return res.status(400).json({ error: 'Item already owned' });
    }

    // Check hearts balance
    const stats = await prisma.userStats.findUnique({
      where: { userId },
    });

    if (!stats || stats.heartsBalance < item.priceHearts) {
      return res.status(400).json({ 
        error: 'Not enough hearts',
        message: 'Treba ti još malo ljubavi da ovo otključaš 😉',
      });
    }

    // Deduct hearts and add item
    await prisma.$transaction([
      prisma.userStats.update({
        where: { userId },
        data: {
          heartsBalance: { decrement: item.priceHearts },
        },
      }),
      prisma.userItem.create({
        data: {
          userId,
          itemId,
        },
      }),
    ]);

    const updatedStats = await prisma.userStats.findUnique({
      where: { userId },
    });

    res.json({
      success: true,
      heartsBalance: updatedStats?.heartsBalance || 0,
    });
  } catch (error) {
    console.error('Buy item error:', error);
    res.status(500).json({ error: 'Failed to buy item' });
  }
});

// Equip item
router.post('/equip', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;
    const { itemId } = req.body;

    if (!itemId) {
      return res.status(400).json({ error: 'itemId is required' });
    }

    // Check if item exists and is owned
    const item = await prisma.item.findUnique({
      where: { id: itemId },
    });

    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    const userItem = await prisma.userItem.findUnique({
      where: {
        userId_itemId: {
          userId,
          itemId,
        },
      },
    });

    if (!userItem) {
      return res.status(400).json({ error: 'Item not owned' });
    }

    // Get current avatar
    const avatar = await prisma.avatar.findUnique({
      where: { userId },
    });

    if (!avatar) {
      return res.status(404).json({ error: 'Avatar not found' });
    }

    // Get slot from item (map type to slot if slot is missing)
    let slot = item.slot;
    if (!slot) {
      const typeToSlotMap: Record<string, string> = {
        // New Keri system
        'BODY': 'Base',
        'HAIR': 'Hair',
        'EYES': 'Eyes',
        'EYEBROWS': 'Eyebrows',
        'MOUTH': 'Mouth',
        'TOP': 'Top',
        'BOTTOM': 'Bottom',
        'MISC': 'Misc',
        // Legacy mappings
        'OUTFIT': 'Top',
        'HEAD_ACCESSORY': 'Hair',
        'AURA': 'Misc',
        'EFFECT': 'Misc',
      };
      slot = typeToSlotMap[item.type] || null;
    }

    if (!slot) {
      return res.status(400).json({ error: 'Item slot not defined' });
    }

    // Update equipped items using new modular system
    const equippedItems = (avatar.equippedItems as Record<string, string | null>) || {};
    equippedItems[slot] = itemId;

    const updatedAvatar = await prisma.avatar.update({
      where: { userId },
      data: { equippedItems },
    });

    res.json(updatedAvatar);
  } catch (error) {
    console.error('Equip item error:', error);
    res.status(500).json({ error: 'Failed to equip item' });
  }
});

export default router;

