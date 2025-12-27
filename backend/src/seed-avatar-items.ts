// Seed script to populate avatar items from AvatarAssets catalog
// Run with: npx ts-node src/seed-avatar-items.ts

import { PrismaClient, ItemType } from '@prisma/client';

const prisma = new PrismaClient();

// Import avatar items (we'll define them here since we can't import from frontend)
const AVATAR_ITEMS = [
  // Head Frames
  { id: 'frame_simple', type: ItemType.HEAD_FRAME, name: 'Jednostavan Okvir', priceHearts: 0, assetPath: '/assets/ui/basic/icon panel big.png', rarity: 'common', slot: 'HeadFrame' },
  { id: 'frame_heart_gold', type: ItemType.HEAD_FRAME, name: 'Zlatni Srčani Okvir', priceHearts: 80, assetPath: '/assets/candy/hearts/gem_heart_yellow.png', rarity: 'rare', slot: 'HeadFrame' },
  { id: 'frame_heart_pink', type: ItemType.HEAD_FRAME, name: 'Rozi Srčani Okvir', priceHearts: 30, assetPath: '/assets/candy/hearts/gem_heart_pink.png', rarity: 'common', slot: 'HeadFrame' },
  { id: 'frame_heart_red', type: ItemType.HEAD_FRAME, name: 'Crveni Srčani Okvir', priceHearts: 30, assetPath: '/assets/candy/hearts/gem_heart_red.png', rarity: 'common', slot: 'HeadFrame' },
  { id: 'frame_star', type: ItemType.HEAD_FRAME, name: 'Zvjezdani Okvir', priceHearts: 40, assetPath: '/assets/ui/basic/star filled.png', rarity: 'common', slot: 'HeadFrame' },
  { id: 'frame_metal_panel', type: ItemType.HEAD_FRAME, name: 'Metalni Okvir', priceHearts: 100, assetPath: '/assets/ui/metal/icon panel big.png', rarity: 'rare', slot: 'HeadFrame' },
  { id: 'frame_ribbon', type: ItemType.HEAD_FRAME, name: 'Vrpca Okvir', priceHearts: 25, assetPath: '/assets/ui/basic/ribbon.png', rarity: 'common', slot: 'HeadFrame' },
  
  // Head Accessories - Note: offsetY values are stored in AvatarAssets.ts, not in seed
  { id: 'hat_crown', type: ItemType.HEAD_ACCESSORY, name: 'Kruna', priceHearts: 150, assetPath: '/assets/platformer/interactive/gem_diamond_0.png', rarity: 'epic', slot: 'HeadAccessory' },
  { id: 'hat_flower', type: ItemType.HEAD_ACCESSORY, name: 'Cvijetna Kruna', priceHearts: 80, assetPath: '/assets/particles/flower.png', rarity: 'rare', slot: 'HeadAccessory' },
  { id: 'hat_star', type: ItemType.HEAD_ACCESSORY, name: 'Zvjezdana Kapa', priceHearts: 35, assetPath: '/assets/ui/basic/star filled.png', rarity: 'common', slot: 'HeadAccessory' },
  { id: 'hat_heart', type: ItemType.HEAD_ACCESSORY, name: 'Srčana Kapa', priceHearts: 40, assetPath: '/assets/candy/hearts/gem_heart_pink.png', rarity: 'common', slot: 'HeadAccessory' },
  { id: 'hat_sparkle', type: ItemType.HEAD_ACCESSORY, name: 'Sjajna Aura', priceHearts: 90, assetPath: '/assets/particles/spark.png', rarity: 'rare', slot: 'HeadAccessory' },
  
  // Outfits
  { id: 'outfit_heart_shirt', type: ItemType.OUTFIT, name: 'Srčana Majica', priceHearts: 50, assetPath: '/assets/candy/hearts/gem_heart_red.png', rarity: 'common', slot: 'Outfit' },
  { id: 'outfit_star_robe', type: ItemType.OUTFIT, name: 'Zvjezdana Haljina', priceHearts: 120, assetPath: '/assets/ui/basic/star filled.png', rarity: 'rare', slot: 'Outfit' },
  { id: 'outfit_sparkle', type: ItemType.OUTFIT, name: 'Sjajna Haljina', priceHearts: 200, assetPath: '/assets/particles/spark.png', rarity: 'epic', slot: 'Outfit' },
  
  // Hand Items
  { id: 'hand_heart', type: ItemType.HAND_RIGHT, name: 'Srce', priceHearts: 30, assetPath: '/assets/candy/hearts/gem_heart_pink.png', rarity: 'common', slot: 'HandRight' },
  { id: 'hand_star', type: ItemType.HAND_RIGHT, name: 'Zvijezda', priceHearts: 35, assetPath: '/assets/ui/basic/star filled.png', rarity: 'common', slot: 'HandRight' },
  { id: 'hand_flower', type: ItemType.HAND_RIGHT, name: 'Cvijet', priceHearts: 60, assetPath: '/assets/particles/flower.png', rarity: 'rare', slot: 'HandRight' },
  { id: 'hand_wand', type: ItemType.HAND_RIGHT, name: 'Čarobni Štap', priceHearts: 150, assetPath: '/assets/particles/spell.png', rarity: 'epic', slot: 'HandRight' },
  { id: 'hand_sword', type: ItemType.HAND_LEFT, name: 'Mač', priceHearts: 100, assetPath: '/assets/platformer/interactive/spikes_light.png', rarity: 'rare', slot: 'HandLeft' },
  
  // Feet
  { id: 'feet_sneakers', type: ItemType.FEET, name: 'Patike', priceHearts: 25, assetPath: '/assets/platformer/interactive/coin_silver_0.png', rarity: 'common', slot: 'Feet' },
  { id: 'feet_boots', type: ItemType.FEET, name: 'Čizme', priceHearts: 80, assetPath: '/assets/platformer/interactive/coin_gold_0.png', rarity: 'rare', slot: 'Feet' },
  
  // Back Items
  { id: 'back_wings', type: ItemType.BACK, name: 'Krila', priceHearts: 180, assetPath: '/assets/particles/feather.png', rarity: 'epic', slot: 'Back' },
  { id: 'back_cape', type: ItemType.BACK, name: 'Plašt', priceHearts: 120, assetPath: '/assets/particles/plume.png', rarity: 'rare', slot: 'Back' },
  { id: 'back_heart_aura', type: ItemType.BACK, name: 'Srčana Aura', priceHearts: 200, assetPath: '/assets/candy/hearts/gem_heart_pink.png', rarity: 'epic', slot: 'Back' },
  
  // Auras
  { id: 'aura_sparkle', type: ItemType.AURA, name: 'Sjajna Aura', priceHearts: 40, assetPath: '/assets/particles/spark.png', rarity: 'common', slot: 'Aura' },
  { id: 'aura_heart_swirl', type: ItemType.AURA, name: 'Srčani Vrtlog', priceHearts: 100, assetPath: '/assets/particles/swirl.png', rarity: 'rare', slot: 'Aura' },
  { id: 'aura_star_field', type: ItemType.AURA, name: 'Zvjezdano Polje', priceHearts: 180, assetPath: '/assets/particles/star_1.png', rarity: 'epic', slot: 'Aura' },
  { id: 'aura_glow', type: ItemType.AURA, name: 'Sjajni Glow', priceHearts: 120, assetPath: '/assets/particles/halo.png', rarity: 'rare', slot: 'Aura' },
  { id: 'effect_love_aura', type: ItemType.AURA, name: 'Love Aura', priceHearts: 25, assetPath: '/assets/particles/heart.png', rarity: 'common', slot: 'Aura' },
  { id: 'effect_heart_trail', type: ItemType.AURA, name: 'Heart Trail', priceHearts: 20, assetPath: '/assets/particles/heart_gradient.png', rarity: 'common', slot: 'Aura' },
  { id: 'effect_love_aura', type: ItemType.AURA, name: 'Love Aura', priceHearts: 25, assetPath: '/assets/particles/heart.png', rarity: 'common', slot: 'Aura' },
  { id: 'effect_heart_trail', type: ItemType.AURA, name: 'Heart Trail', priceHearts: 20, assetPath: '/assets/particles/heart_gradient.png', rarity: 'common', slot: 'Aura' },
  
  // Pets
  { id: 'pet_heart', type: ItemType.PET, name: 'Srčani Prijatelj', priceHearts: 50, assetPath: '/assets/candy/hearts/gem_heart_pink.png', rarity: 'common', slot: 'Pet' },
  { id: 'pet_star', type: ItemType.PET, name: 'Zvjezdani Prijatelj', priceHearts: 90, assetPath: '/assets/ui/basic/star filled.png', rarity: 'rare', slot: 'Pet' },
  { id: 'pet_ghost', type: ItemType.PET, name: 'Duh Prijatelj', priceHearts: 150, assetPath: '/assets/platformer/characters/ghost_float_0.png', rarity: 'epic', slot: 'Pet' },
  { id: 'pet_soot', type: ItemType.PET, name: 'Soot Sprite', priceHearts: 100, assetPath: '/assets/platformer/characters/soot_idle_0.png', rarity: 'rare', slot: 'Pet' },
];

async function main() {
  console.log('Seeding avatar items...');
  
  for (const item of AVATAR_ITEMS) {
    await prisma.item.upsert({
      where: { id: item.id },
      update: {
        type: item.type,
        name: item.name,
        priceHearts: item.priceHearts,
        assetPath: item.assetPath,
        rarity: item.rarity,
        slot: item.slot,
      },
      create: {
        id: item.id,
        type: item.type,
        name: item.name,
        priceHearts: item.priceHearts,
        assetPath: item.assetPath,
        rarity: item.rarity,
        slot: item.slot,
      },
    });
  }
  
  console.log('Avatar items seeded successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
