import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { authMiddleware, AuthRequest } from '../utils/auth';
import prisma from '../utils/db';

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadsDir = path.join(__dirname, '../../uploads/avatars');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const userId = (req as AuthRequest).userId!;
    const ext = path.extname(file.originalname);
    cb(null, `${userId}-${Date.now()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

// Get avatar
router.get('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;

    const avatar = await prisma.avatar.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            displayName: true,
          },
        },
      },
    });

    // Return null if avatar doesn't exist (instead of 404)
    // This allows frontend to detect that setup wizard needs to be shown
    if (!avatar) {
      return res.json(null);
    }

    res.json(avatar);
  } catch (error) {
    console.error('Get avatar error:', error);
    res.status(500).json({ error: 'Failed to get avatar' });
  }
});

// Upload avatar image
router.post('/upload-image', authMiddleware, upload.single('image'), async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;

    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    const imageUrl = `/uploads/avatars/${req.file.filename}`;

    const avatar = await prisma.avatar.update({
      where: { userId },
      data: { avatarImageUrl: imageUrl },
    });

    res.json(avatar);
  } catch (error) {
    console.error('Upload image error:', error);
    res.status(500).json({ error: 'Failed to upload image' });
  }
});

// Update or create avatar
router.put('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;
    const { 
      baseBodyId, 
      equippedItems,
      // Legacy fields (kept for backward compatibility)
      bodyColor, 
      equippedOutfitId, 
      equippedEffectIds, 
      equippedEmoteIds 
    } = req.body;

    const updateData: any = {};

    // New modular system
    if (baseBodyId !== undefined) updateData.baseBodyId = baseBodyId;
    if (equippedItems !== undefined) updateData.equippedItems = equippedItems;
    
    // Legacy fields (for backward compatibility)
    if (bodyColor !== undefined) updateData.bodyColor = bodyColor;
    if (equippedOutfitId !== undefined) updateData.equippedOutfitId = equippedOutfitId;
    if (equippedEffectIds !== undefined) updateData.equippedEffectIds = equippedEffectIds;
    if (equippedEmoteIds !== undefined) updateData.equippedEmoteIds = equippedEmoteIds;

    // Check if avatar exists, if not create it
    const existingAvatar = await prisma.avatar.findUnique({
      where: { userId },
    });

    let avatar;
    if (!existingAvatar) {
      // Create new avatar
      avatar = await prisma.avatar.create({
        data: {
          userId,
          ...updateData,
        },
      });
    } else {
      // Update existing avatar
      avatar = await prisma.avatar.update({
      where: { userId },
      data: updateData,
    });
    }

    // Trigger frontend update
    res.json(avatar);
  } catch (error) {
    console.error('Update avatar error:', error);
    res.status(500).json({ error: 'Failed to update avatar' });
  }
});

// Equip item to slot
router.post('/equip', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;
    const { slot, itemId } = req.body;

    if (!slot) {
      return res.status(400).json({ error: 'slot is required' });
    }

    // Check if item exists and is owned (if itemId provided)
    // Free items (priceHearts === 0) don't need ownership check
    if (itemId) {
      const item = await prisma.item.findUnique({
        where: { id: itemId },
      });

      if (!item) {
        // If item doesn't exist in DB, allow it anyway (might be a free default item)
        // This allows equipping items like 'hair_1_1', 'eyes_1_1' etc. that are free defaults
        console.log(`Item ${itemId} not found in DB, allowing as free default`);
      } else if (item.priceHearts > 0) {
        // Only check ownership for paid items
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
      }
    }

    // Get current avatar
    const avatar = await prisma.avatar.findUnique({
      where: { userId },
    });

    if (!avatar) {
      return res.status(404).json({ error: 'Avatar not found' });
    }

    // Update equipped items
    const equippedItems = (avatar.equippedItems as Record<string, string | null>) || {};
    equippedItems[slot] = itemId || null;

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

