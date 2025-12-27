import { PrismaClient, ItemType } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Prvo ukloni stare level kodove koji više ne trebaju
  const oldLevelCodes = ['level_2_save_me', 'level_3_runner', 'level_3_running_heart'];
  
  // Pronađi stare level-e
  const oldLevels = await prisma.level.findMany({
    where: {
      code: {
        in: oldLevelCodes,
      },
    },
    select: {
      id: true,
    },
  });
  
  // Obriši user progress zapise za stare level-e
  if (oldLevels.length > 0) {
    const oldLevelIds = oldLevels.map(l => l.id);
    await prisma.userLevelProgress.deleteMany({
      where: {
        levelId: {
          in: oldLevelIds,
        },
      },
    });
  }
  
  // Obriši stare level-e
  await prisma.level.deleteMany({
    where: {
      code: {
        in: oldLevelCodes,
      },
    },
  });

  // Create levels - samo 3 level-a
  const levels = await Promise.all([
    prisma.level.upsert({
      where: { code: 'level_1_candy' },
      update: {},
      create: {
        code: 'level_1_candy',
        name: 'Spoji srcad',
        orderIndex: 1,
        heartsRewardDefault: 10,
      },
    }),
    prisma.level.upsert({
      where: { code: 'level_2_block_puzzle' },
      update: {
        heartsRewardDefault: 10,
        name: 'Blokovi ljubavi',
        orderIndex: 2,
      },
      create: {
        code: 'level_2_block_puzzle',
        name: 'Blokovi ljubavi',
        orderIndex: 2,
        heartsRewardDefault: 10,
      },
    }),
    prisma.level.upsert({
      where: { code: 'level_3_dart' },
      update: {
        heartsRewardDefault: 10,
        name: 'Strele ljubavi',
        orderIndex: 3,
      },
      create: {
        code: 'level_3_dart',
        name: 'Strele ljubavi',
        orderIndex: 3,
        heartsRewardDefault: 10,
      },
    }),
  ]);

  console.log(`✅ Created ${levels.length} levels`);

  // Reset shop items
  await prisma.userItem.deleteMany({});
  await prisma.item.deleteMany({});

  // Helper to push item creations
  const itemCreates: Parameters<typeof prisma.item.create>[0][] = [];

  // Base bodies (optional in shop, free)
  const bases = [
    { id: 'base_1', name: 'Base 1', assetPath: '/assets/keri/Base/base1.png' },
    { id: 'base_2', name: 'Base 2', assetPath: '/assets/keri/Base/base2.png' },
    { id: 'base_3', name: 'Base 3', assetPath: '/assets/keri/Base/base3.png' },
    { id: 'base_4', name: 'Base 4', assetPath: '/assets/keri/Base/base4.png' },
    { id: 'base_5', name: 'Base 5', assetPath: '/assets/keri/Base/base5.png' },
  ];
  bases.forEach((b) => {
    itemCreates.push({
      data: {
        id: b.id,
        type: ItemType.BODY,
        name: b.name,
        priceHearts: 0,
        slot: 'Base',
        assetPath: b.assetPath,
      },
    });
  });

  // Hair 5 styles x 15 colors
  for (let style = 1; style <= 5; style++) {
    for (let color = 1; color <= 15; color++) {
      const id = `hair_${style}_${color}`;
      const price = style === 1 && color === 1 ? 0 : (style - 1) * 10 + (color - 1) * 2;
      itemCreates.push({
        data: {
          id,
          type: ItemType.HEAD_ACCESSORY, // reuse type, slot decides placement
          name: `Hair Style ${style} - Color ${color}`,
          priceHearts: price,
          slot: 'Hair',
          assetPath: `/assets/keri/Hair/hair${style}_${color}.png`,
      },
      });
    }
  }

  // Eyes 3 styles x 10 colors
  for (let style = 1; style <= 3; style++) {
    for (let color = 1; color <= 10; color++) {
      const id = `eyes_${style}_${color}`;
      const price = style === 1 && color === 1 ? 0 : (style - 1) * 15 + (color - 1) * 3;
      itemCreates.push({
        data: {
          id,
          type: ItemType.HEAD_FRAME, // reuse type
          name: `Eyes Style ${style} - Color ${color}`,
          priceHearts: price,
          slot: 'Eyes',
          assetPath: `/assets/keri/Eyes/eyes${style}_${color}.png`,
      },
      });
    }
  }

  // Eyebrows 5
  for (let i = 1; i <= 5; i++) {
    const id = `eyebrows_${i}`;
    const price = i === 1 ? 0 : (i - 1) * 5;
    itemCreates.push({
      data: {
        id,
        type: ItemType.HEAD_FRAME,
        name: `Eyebrows ${i}`,
        priceHearts: price,
        slot: 'Eyebrows',
        assetPath: `/assets/keri/Eyebrows/eyebrows${i}_1.png`,
      },
    });
  }

  // Mouth 5
  for (let i = 1; i <= 5; i++) {
    const id = `mouth_${i}`;
    const price = i === 1 ? 0 : (i - 1) * 5;
    itemCreates.push({
      data: {
        id,
        type: ItemType.HEAD_FRAME,
        name: `Mouth ${i}`,
        priceHearts: price,
        slot: 'Mouth',
        assetPath: `/assets/keri/Mouth/mouth${i}_1.png`,
      },
    });
  }

  // Tops 5 styles x 6 variants
  for (let style = 1; style <= 5; style++) {
    for (let variant = 1; variant <= 6; variant++) {
      const id = `top_${style}_${variant}`;
      const price = style === 1 && variant === 1 ? 0 : style * 10 + variant * 2;
      itemCreates.push({
        data: {
          id,
          type: ItemType.OUTFIT,
          name: `Top Style ${style} - Variant ${variant}`,
          priceHearts: price,
          slot: 'Top',
          assetPath: `/assets/keri/Tops/top${style}_${variant}.png`,
      },
      });
    }
  }

  // Bottoms 3 styles x 6 variants
  for (let style = 1; style <= 3; style++) {
    for (let variant = 1; variant <= 6; variant++) {
      const id = `bottom_${style}_${variant}`;
      const price = style === 1 && variant === 1 ? 0 : style * 12 + variant * 3;
      itemCreates.push({
        data: {
          id,
          type: ItemType.OUTFIT,
          name: `Bottom Style ${style} - Variant ${variant}`,
          priceHearts: price,
          slot: 'Bottom',
          assetPath: `/assets/keri/Bottoms/bottom${style}_${variant}.png`,
      },
      });
    }
  }

  // Misc effects
  const misc = [
    { id: 'blush', name: 'Blush', price: 5, path: '/assets/keri/Misc/blush.png' },
    { id: 'blush_2', name: 'Blush 2', price: 5, path: '/assets/keri/Misc/blush_2.png' },
    { id: 'sweat', name: 'Sweat', price: 3, path: '/assets/keri/Misc/sweat.png' },
    { id: 'tears', name: 'Tears', price: 3, path: '/assets/keri/Misc/tears.png' },
  ];
  misc.forEach((m) => {
    itemCreates.push({
      data: {
        id: m.id,
        type: ItemType.AURA, // reuse AURA type for misc/effects
        name: m.name,
        priceHearts: m.price,
        slot: 'Misc',
        assetPath: m.path,
      },
    });
  });

  // Bulk create
  await prisma.$transaction(itemCreates.map((data) => prisma.item.create(data)));

  console.log(`✅ Created ${itemCreates.length} shop items`);

  console.log('🎉 Seeding complete!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

