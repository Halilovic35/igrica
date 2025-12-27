// Keri Modular Avatar System
// Based on Keri character by Konett (CC-BY license)

export type AvatarSlot = 
  | 'Base'        // Base body/skin (required, 5 options)
  | 'Hair'        // Hair style + color (required)
  | 'Eyes'        // Eye style + color (required)
  | 'Eyebrows'    // Eyebrows (required)
  | 'Mouth'       // Mouth (required)
  | 'Top'         // Top/clothing (optional)
  | 'Bottom'      // Bottom/pants (optional)
  | 'Misc';       // Effects (blush, tears, etc.) (optional)

export type ItemRarity = 'common' | 'rare' | 'epic' | 'legendary';

export interface AvatarItem {
  id: string;
  category: AvatarSlot;
  name: string;
  assetPath: string;
  rarity: ItemRarity;
  priceHearts: number;
  // For items with variants (hair color, eye color, top style, etc.)
  variant?: number; // Variant number (1-15 for hair, 1-10 for eyes, 1-6 for tops/bottoms)
  style?: number;  // Style number (1-5 for hair, 1-3 for eyes, 1-5 for tops, 1-3 for bottoms)
}

// Base Bodies - FREE (user selects one on first visit)
export const AVATAR_BODIES: AvatarItem[] = [
  {
    id: 'base_1',
    category: 'Base',
    name: 'Base 1',
    assetPath: '/assets/keri/Base/base1.png',
    rarity: 'common',
    priceHearts: 0,
  },
  {
    id: 'base_2',
    category: 'Base',
    name: 'Base 2',
    assetPath: '/assets/keri/Base/base2.png',
    rarity: 'common',
    priceHearts: 0,
  },
  {
    id: 'base_3',
    category: 'Base',
    name: 'Base 3',
    assetPath: '/assets/keri/Base/base3.png',
    rarity: 'common',
    priceHearts: 0,
  },
  {
    id: 'base_4',
    category: 'Base',
    name: 'Base 4',
    assetPath: '/assets/keri/Base/base4.png',
    rarity: 'common',
    priceHearts: 0,
  },
  {
    id: 'base_5',
    category: 'Base',
    name: 'Base 5',
    assetPath: '/assets/keri/Base/base5.png',
    rarity: 'common',
    priceHearts: 0,
  },
];

// Hair Styles - 5 styles, each with 15 color variants
export const HAIR_STYLES: AvatarItem[] = [];
for (let style = 1; style <= 5; style++) {
  for (let color = 1; color <= 15; color++) {
    HAIR_STYLES.push({
      id: `hair_${style}_${color}`,
      category: 'Hair',
      name: `Hair Style ${style} - Color ${color}`,
      assetPath: `/assets/keri/Hair/hair${style}_${color}.png`,
      rarity: style <= 2 ? 'common' : style <= 4 ? 'rare' : 'epic',
      priceHearts: style === 1 && color === 1 ? 0 : (style - 1) * 10 + (color - 1) * 2,
      style,
      variant: color,
    });
  }
}

// Eye Styles - 3 styles, each with 10 color variants
export const EYE_STYLES: AvatarItem[] = [];
for (let style = 1; style <= 3; style++) {
  for (let color = 1; color <= 10; color++) {
    EYE_STYLES.push({
      id: `eyes_${style}_${color}`,
      category: 'Eyes',
      name: `Eyes Style ${style} - Color ${color}`,
      assetPath: `/assets/keri/Eyes/eyes${style}_${color}.png`,
      rarity: style === 1 ? 'common' : style === 2 ? 'rare' : 'epic',
      priceHearts: style === 1 && color === 1 ? 0 : (style - 1) * 15 + (color - 1) * 3,
      style,
      variant: color,
    });
  }
}

// Eyebrows - 5 options (matched to base skin color)
export const EYEBROWS: AvatarItem[] = [];
for (let i = 1; i <= 5; i++) {
  EYEBROWS.push({
    id: `eyebrows_${i}`,
    category: 'Eyebrows',
    name: `Eyebrows ${i}`,
    assetPath: `/assets/keri/Eyebrows/eyebrows${i}_1.png`,
    rarity: 'common',
    priceHearts: i === 1 ? 0 : (i - 1) * 5,
  });
}

// Mouth - 5 options (matched to base skin color)
export const MOUTHS: AvatarItem[] = [];
for (let i = 1; i <= 5; i++) {
  MOUTHS.push({
    id: `mouth_${i}`,
    category: 'Mouth',
    name: `Mouth ${i}`,
    assetPath: `/assets/keri/Mouth/mouth${i}_1.png`,
    rarity: 'common',
    priceHearts: i === 1 ? 0 : (i - 1) * 5,
  });
}

// Tops - 5 styles, each with 6 variants
export const TOPS: AvatarItem[] = [];
for (let style = 1; style <= 5; style++) {
  for (let variant = 1; variant <= 6; variant++) {
    TOPS.push({
      id: `top_${style}_${variant}`,
      category: 'Top',
      name: `Top Style ${style} - Variant ${variant}`,
      assetPath: `/assets/keri/Tops/top${style}_${variant}.png`,
      rarity: style <= 2 ? 'common' : style <= 4 ? 'rare' : 'epic',
      priceHearts: style === 1 && variant === 1 ? 0 : style * 10 + variant * 2,
      style,
      variant,
    });
  }
}

// Bottoms - 3 styles, each with 6 variants
export const BOTTOMS: AvatarItem[] = [];
for (let style = 1; style <= 3; style++) {
  for (let variant = 1; variant <= 6; variant++) {
    BOTTOMS.push({
      id: `bottom_${style}_${variant}`,
      category: 'Bottom',
      name: `Bottom Style ${style} - Variant ${variant}`,
      assetPath: `/assets/keri/Bottoms/bottom${style}_${variant}.png`,
      rarity: style === 1 ? 'common' : style === 2 ? 'rare' : 'epic',
      priceHearts: style === 1 && variant === 1 ? 0 : style * 12 + variant * 3,
      style,
      variant,
    });
  }
}

// Misc Effects
export const MISC_EFFECTS: AvatarItem[] = [
  {
    id: 'blush',
    category: 'Misc',
    name: 'Blush',
    assetPath: '/assets/keri/Misc/blush.png',
    rarity: 'common',
    priceHearts: 5,
  },
  {
    id: 'blush_2',
    category: 'Misc',
    name: 'Blush 2',
    assetPath: '/assets/keri/Misc/blush_2.png',
    rarity: 'common',
    priceHearts: 5,
  },
  {
    id: 'sweat',
    category: 'Misc',
    name: 'Sweat',
    assetPath: '/assets/keri/Misc/sweat.png',
    rarity: 'common',
    priceHearts: 3,
  },
  {
    id: 'tears',
    category: 'Misc',
    name: 'Tears',
    assetPath: '/assets/keri/Misc/tears.png',
    rarity: 'common',
    priceHearts: 3,
  },
];

// All items combined
export const ALL_AVATAR_ITEMS: AvatarItem[] = [
  ...AVATAR_BODIES,
  ...HAIR_STYLES,
  ...EYE_STYLES,
  ...EYEBROWS,
  ...MOUTHS,
  ...TOPS,
  ...BOTTOMS,
  ...MISC_EFFECTS,
];

// Helper function to get item by ID
export function getItemById(id: string): AvatarItem | undefined {
  return ALL_AVATAR_ITEMS.find(item => item.id === id);
}

// Helper function to get items by category
export function getItemsByCategory(category: AvatarSlot): AvatarItem[] {
  return ALL_AVATAR_ITEMS.filter(item => item.category === category);
}

// Helper function to get default items (free starter items)
export function getDefaultItems(): Record<AvatarSlot, string> {
  return {
    Base: 'base_1',
    Hair: 'hair_1_1',
    Eyes: 'eyes_1_1',
    Eyebrows: 'eyebrows_1',
    Mouth: 'mouth_1',
    Top: '', // Optional
    Bottom: '', // Optional
    Misc: '', // Optional
  };
}
