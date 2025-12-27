export interface Vec2 {
  x: number;
  y: number;
}

export interface CameraState {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type LoveLevelId = 'candy_hearts' | 'spasi_me' | 'running_heart' | 'dart_game';

export interface LoveLevelNode {
  id: LoveLevelId;
  name: string;
  description: string;
  rewardHearts: number;
  position: Vec2; // world coordinates in pixels (will be auto-computed)
  districtId: string;
}

export type DistrictTheme = 'romantic_city' | 'park' | 'beach' | 'night-city' | 'mountains' | 'fantasy';

export interface District {
  id: string;
  name: string;
  theme: DistrictTheme;
  index: number;
  height: number;
  levelIds: LoveLevelId[]; // IDs of levels in this district
}

// District height will be viewport height (calculated dynamically)
export const getDistrictHeight = () => {
  if (typeof window === 'undefined') return 1000;
  return window.innerHeight - 56; // viewport height minus top bar
};
export const DISTRICT_HEIGHT = getDistrictHeight(); // Will be recalculated on mount

// Create districts with dynamic height
export const createDistricts = (): District[] => {
  const districtHeight = getDistrictHeight();
  return [
  {
    id: 'romantic_city',
    name: 'Romantični Grad',
    theme: 'romantic_city',
    index: 0,
      height: districtHeight,
      levelIds: ['candy_hearts'],
  },
  {
    id: 'love-park',
    name: 'Park zaljubljenih',
    theme: 'park',
    index: 1,
      height: districtHeight,
    levelIds: ['spasi_me'],
  },
  {
    id: 'starry-beach',
    name: 'Morska noć',
    theme: 'beach',
    index: 2,
      height: districtHeight,
    levelIds: ['dart_game'],
  },
];
};

export const DISTRICTS = createDistricts();

export const WORLD_WIDTH = 2200; // Reduced to eliminate empty space on the right

// Compute world height based on sum of district heights
export const getWorldHeight = () => {
  const districtHeight = getDistrictHeight();
  return DISTRICTS.length * districtHeight;
};
export const WORLD_HEIGHT = getWorldHeight();

// Auto-position levels within their districts
const buildLevelPositions = (): Record<LoveLevelId, Vec2> => {
  const positions = {} as Record<LoveLevelId, Vec2>;
  const districtHeight = getDistrictHeight();
  
  DISTRICTS.forEach((district) => {
    const districtYStart = DISTRICTS.slice(0, district.index).reduce((sum, d) => sum + districtHeight, 0);
    const baseY = districtYStart + districtHeight * 0.5; // Center of district
    const baseX = WORLD_WIDTH / 2;
    const offset = 400; // horizontal spread
    
    district.levelIds.forEach((levelId, levelIndex) => {
      const x = baseX + (levelIndex - (district.levelIds.length - 1) / 2) * offset;
      positions[levelId] = { x, y: baseY };
    });
  });
  
  return positions;
};

const levelPositions = buildLevelPositions();

export const LOVE_LEVELS: LoveLevelNode[] = [
  {
    id: 'candy_hearts',
    name: 'Spoji srcad',
    description: 'Spoji srca',
    rewardHearts: 10,
    districtId: 'romantic_city',
    position: levelPositions['candy_hearts'] || { x: WORLD_WIDTH / 2, y: getDistrictHeight() * 0.5 },
  },
  {
    id: 'spasi_me',
    name: 'Blokovi ljubavi',
    description: 'Puzzle igra',
    rewardHearts: 10,
    districtId: 'love-park',
    position: levelPositions['spasi_me'] || { x: WORLD_WIDTH / 2, y: getDistrictHeight() * 1.5 },
  },
  {
    id: 'dart_game',
    name: 'Strele ljubavi',
    description: 'Dart protiv bota',
    rewardHearts: 10,
    districtId: 'starry-beach',
    position: levelPositions['dart_game'] || { x: WORLD_WIDTH / 2, y: getDistrictHeight() * 2.5 },
  },
];

