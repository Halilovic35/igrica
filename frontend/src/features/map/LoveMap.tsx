import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { MapAssets, ParticleAssets, AvatarAssets, MetalUIAssets, CandyAssets, PlatformerAssets } from '../../assetsIndex';
import MetalButton from '../../components/metal-ui/MetalButton';
import MetalIcon, { MetalIcons } from '../../components/metal-ui/MetalIcon';
import { useCamera, centerCameraOnAvatar } from './hooks/useCamera';
import { RomanticCityDistrict } from './RomanticCityDistrict';
import { LOVE_LEVELS, LoveLevelId, LoveLevelNode, Vec2, WORLD_HEIGHT, WORLD_WIDTH, DISTRICTS, District, DistrictTheme } from './types';
import api from '../../services/api';
import LayeredAvatarRenderer from '../avatar/LayeredAvatarRenderer';
import '../../styles/LoveMapPage.css';

interface BackendLevel {
  id: string;
  code: string;
  name: string;
  orderIndex: number;
  heartsRewardDefault: number;
  completed: boolean;
  unlocked: boolean;
  bestScore: number | null;
}

interface AvatarData {
  avatarImageUrl?: string;
  bodyColor: string;
}

interface LoveMapProps {
  levels: BackendLevel[];
  hearts: number;
  playerName: string;
  onBack: () => void;
  onShop: () => void;
  onAvatar: () => void;
  onOpenLevel: (code: string) => void;
  hideAvatar?: boolean; // Hide avatar (e.g., during intro sequence)
}

interface Decoration {
  id: string;
  sprite: string;
  position: Vec2;
  scale: number;
  layer: 'background' | 'midground' | 'foreground';
  float?: boolean;
}


const levelCodeToId = (code: string): LoveLevelId | null => {
  if (code === 'level_1_candy') return 'candy_hearts';
  if (code === 'level_2_block_puzzle' || code === 'level_2_save_me') return 'spasi_me';
  if (code === 'level_3_dart') return 'dart_game';
  return null;
};

const getViewportSize = () => ({
  width: typeof window !== 'undefined' ? window.innerWidth : 1280,
  height: typeof window !== 'undefined' ? window.innerHeight : 720,
});

const MIN_ZOOM = 0.9;
const MAX_ZOOM = 1.3;
const OVERVIEW_ZOOM = 1.1; // Slightly zoomed-in default view

const LoveMap: React.FC<LoveMapProps> = ({
  levels,
  hearts,
  playerName,
  onBack,
  onShop,
  onAvatar,
  onOpenLevel,
  hideAvatar = false,
}) => {
  const viewport = getViewportSize();
  // Fiksni zoom - overview mode
  const { camera, zoom, setViewport, setZoom, centerOnAvatar, pan, isFollowing, setIsFollowing } = useCamera(viewport, OVERVIEW_ZOOM);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);

  const [avatarData, setAvatarData] = useState<AvatarData | null>(null);
  // Initialize with candy_hearts position (level 1) as default
  const defaultPos: Vec2 = LOVE_LEVELS.find(l => l.id === 'candy_hearts')?.position || LOVE_LEVELS[0].position;
  const [avatarPos, setAvatarPos] = useState<Vec2>(defaultPos);
  const [avatarTarget, setAvatarTarget] = useState<Vec2>(defaultPos);
  const [pendingLevelCode, setPendingLevelCode] = useState<string | null>(null);
  const [arrivedAtLevel, setArrivedAtLevel] = useState(false);
  const lastAvatarPosRef = useRef<Vec2>(defaultPos);
  const startPosRef = useRef<Vec2 | null>(null);
  const hasOpenedLevel = useRef(false);
  const [districtHeight, setDistrictHeight] = useState(() => getViewportSize().height - 56);
  const [worldHeight, setWorldHeight] = useState(() => DISTRICTS.length * districtHeight);

  // Fetch avatar
  useEffect(() => {
    const fetchAvatar = async () => {
      try {
        const response = await api.get('/avatar');
        const data = response.data;
        if (data.avatarImageUrl && !data.avatarImageUrl.startsWith('http')) {
          data.avatarImageUrl = `http://localhost:3001${data.avatarImageUrl}`;
        }
        setAvatarData(data);
      } catch (error) {
        console.error('Failed to fetch avatar:', error);
      }
    };
    fetchAvatar();
  }, []);

  // Handle viewport resize
  useEffect(() => {
    const handleResize = () => {
      const { width, height } = getViewportSize();
      setViewport(width, height);
      setFixedViewportWidth(width); // Update fixed width on resize
      const newDistrictHeight = height - 56;
      setDistrictHeight(newDistrictHeight);
      setWorldHeight(DISTRICTS.length * newDistrictHeight);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [setViewport]);

  // Determine current node states from backend
  const levelStates = useMemo(() => {
    const map: Record<LoveLevelId, { unlocked: boolean; completed: boolean; reward: number; code: string }> = {
      candy_hearts: { unlocked: false, completed: false, reward: 10, code: 'level_1_candy' },
      spasi_me: { unlocked: false, completed: false, reward: 10, code: 'level_2_block_puzzle' },
      dart_game: { unlocked: false, completed: false, reward: 10, code: 'level_3_dart' },
    };
    levels.forEach((lvl) => {
      const id = levelCodeToId(lvl.code);
      if (id) {
        map[id] = {
          unlocked: lvl.unlocked,
          completed: lvl.completed,
          reward: lvl.heartsRewardDefault,
          code: lvl.code,
        };
      }
    });
    return map;
  }, [levels]);

  // Recalculate level positions based on dynamic district height
  // Positions are relative to each district (0-100% of district height)
  // Use fixed width to prevent scaling issues - update on resize
  const [fixedViewportWidth, setFixedViewportWidth] = useState(() => {
    return typeof window !== 'undefined' ? window.innerWidth : 1280;
  });
  
  useEffect(() => {
    const handleResize = () => {
      setFixedViewportWidth(window.innerWidth);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  const levelPositions = useMemo(() => {
    const positions: Record<LoveLevelId, Vec2> = {} as Record<LoveLevelId, Vec2>;
    DISTRICTS.forEach((district) => {
      const baseY = districtHeight * 0.5; // Center of district (relative)
      const baseX = fixedViewportWidth / 2; // Center horizontally - use fixed width
      const offset = 400;
      
      district.levelIds.forEach((levelId, levelIndex) => {
        const x = baseX + (levelIndex - (district.levelIds.length - 1) / 2) * offset;
        positions[levelId] = { x, y: baseY };
      });
    });
    return positions;
  }, [districtHeight, fixedViewportWidth]);

  // Update LOVE_LEVELS positions dynamically
  const dynamicLevels = useMemo(() => {
    return LOVE_LEVELS.map(level => ({
      ...level,
      position: levelPositions[level.id] || level.position,
    }));
  }, [levelPositions]);

  // Set initial avatar position - if intro just completed, use stored position
  // VAŽNO: Ne resetuj poziciju kada se levelStates promijene nakon završetka levela
  const hasInitializedPosition = useRef(false);
  
  useEffect(() => {
    // Wait for levels to be loaded before setting position
    if (levels.length === 0 || dynamicLevels.length === 0) {
      console.log('Waiting for levels to load...', { 
        levelsCount: levels.length, 
        dynamicLevelsCount: dynamicLevels.length 
      });
      return; // Don't set position until levels are loaded
    }
    
    // Provjeri prvo da li je intro upravo završen - to ima najveći prioritet
    const introCompleted = localStorage.getItem('introCompleted');
    
    if (introCompleted === 'true') {
      // Ako je intro upravo završen, briši sačuvanu poziciju iz levela (ako postoji)
      // jer trebamo spawnati na levelu 1, ne na posljednjoj poziciji
      localStorage.removeItem('lastAvatarX');
      localStorage.removeItem('lastAvatarY');
      console.log('Intro completed - clearing saved level position to spawn at level 1');
      // Check if we have stored position from intro
      const storedX = localStorage.getItem('introAvatarX');
      const storedY = localStorage.getItem('introAvatarY');
      
      if (storedX && storedY) {
        // Use stored position from intro
        const storedPos: Vec2 = {
          x: parseFloat(storedX),
          y: parseFloat(storedY),
        };
        setAvatarPos(storedPos);
        setAvatarTarget(storedPos);
        // Clear stored position
        localStorage.removeItem('introAvatarX');
        localStorage.removeItem('introAvatarY');
        hasInitializedPosition.current = true;
      } else {
        // After tutorial, always spawn at level 1 (candy_hearts)
        console.log('Intro completed, finding level 1 position...', { 
          dynamicLevelsCount: dynamicLevels.length,
          levelsCount: levels.length,
          dynamicLevels: dynamicLevels.map(l => ({ id: l.id, name: l.name }))
        });
        
        const candyHeartsLevel = dynamicLevels.find((node) => node.id === 'candy_hearts');
        console.log('Found candy_hearts level:', candyHeartsLevel ? { 
          id: candyHeartsLevel.id, 
          position: candyHeartsLevel.position 
        } : 'NOT FOUND');
        
        if (candyHeartsLevel) {
          const aboveLevelPos: Vec2 = {
            x: candyHeartsLevel.position.x,
            y: candyHeartsLevel.position.y - 80, // 80px above level
          };
          console.log('Setting avatar position to level 1:', aboveLevelPos);
          setAvatarPos(aboveLevelPos);
          setAvatarTarget(aboveLevelPos);
          hasInitializedPosition.current = true;
          // Clear the flag AFTER setting position
          setTimeout(() => {
            localStorage.removeItem('introCompleted');
          }, 100);
          return; // Don't run default positioning
        }
        
        // Fallback if candy_hearts not found: try to find level 1 from backend
        if (levels.length > 0) {
          const level1 = levels.find(lvl => lvl.orderIndex === 1);
          console.log('Level 1 from backend:', level1);
          if (level1) {
            const levelId = levelCodeToId(level1.code);
            console.log('Level ID for level 1:', levelId);
            if (levelId) {
              const firstLevel = dynamicLevels.find((node) => node.id === levelId);
              console.log('Found first level in dynamicLevels:', firstLevel);
              if (firstLevel) {
                const aboveLevelPos: Vec2 = {
                  x: firstLevel.position.x,
                  y: firstLevel.position.y - 80,
                };
                console.log('Setting avatar position to level 1 (fallback):', aboveLevelPos);
                setAvatarPos(aboveLevelPos);
                setAvatarTarget(aboveLevelPos);
                hasInitializedPosition.current = true;
                // Clear the flag AFTER setting position
                setTimeout(() => {
                  localStorage.removeItem('introCompleted');
                }, 100);
                return; // Don't run default positioning
              }
            }
          }
        }
        
        console.warn('Could not find level 1, using candy_hearts as final fallback');
        // Final fallback: use candy_hearts directly
        const finalCandyHearts = dynamicLevels.find((node) => node.id === 'candy_hearts');
        if (finalCandyHearts) {
          const aboveLevelPos: Vec2 = {
            x: finalCandyHearts.position.x,
            y: finalCandyHearts.position.y - 80,
          };
          console.log('Setting avatar position to candy_hearts (final fallback):', aboveLevelPos);
          setAvatarPos(aboveLevelPos);
          setAvatarTarget(aboveLevelPos);
          hasInitializedPosition.current = true;
        }
      }
      // Clear the flag AFTER all positioning attempts
      setTimeout(() => {
        localStorage.removeItem('introCompleted');
      }, 100);
      return; // Don't run default positioning
    }
    
    // Provjeri da li postoji sačuvana pozicija iz prethodnog levela (samo ako nije intro)
    const lastX = localStorage.getItem('lastAvatarX');
    const lastY = localStorage.getItem('lastAvatarY');
    
    if (lastX && lastY) {
      // Koristi sačuvanu poziciju (nakon završetka levela)
      const savedPos: Vec2 = {
        x: parseFloat(lastX),
        y: parseFloat(lastY),
      };
      console.log('Using saved position from level:', savedPos);
      setAvatarPos(savedPos);
      setAvatarTarget(savedPos);
      hasInitializedPosition.current = true;
      // Ne briši poziciju - koristi je dok se ne klikne na novi level
      return;
    }
    
    // Ako je već inicijalizovana pozicija, ne resetuj je
    if (hasInitializedPosition.current) {
      console.log('Position already initialized, skipping...');
      return;
    }
    
    // Default: Set initial avatar position to first unlocked by orderIndex (only once)
    // Explicitly look for level with orderIndex === 1 first
    if (levels.length > 0) {
      // First, try to find level with orderIndex === 1 (should always be unlocked)
      const level1 = levels.find(lvl => lvl.orderIndex === 1);
      if (level1 && level1.unlocked) {
        const levelId = levelCodeToId(level1.code);
        if (levelId) {
          const firstUnlocked = dynamicLevels.find((node) => node.id === levelId);
          if (firstUnlocked) {
            setAvatarPos(firstUnlocked.position);
            setAvatarTarget(firstUnlocked.position);
            hasInitializedPosition.current = true;
            return; // Exit early
          }
        }
      }
      
      // If level 1 not found or not unlocked, find first unlocked by orderIndex
      const firstUnlockedBackendLevel = levels
        .filter(lvl => lvl.unlocked)
        .sort((a, b) => a.orderIndex - b.orderIndex)[0];
      
      if (firstUnlockedBackendLevel) {
        const levelId = levelCodeToId(firstUnlockedBackendLevel.code);
        if (levelId) {
          const firstUnlocked = dynamicLevels.find((node) => node.id === levelId);
          if (firstUnlocked) {
            setAvatarPos(firstUnlocked.position);
            setAvatarTarget(firstUnlocked.position);
            hasInitializedPosition.current = true;
            return; // Exit early
          }
        }
      }
    }
    
    // Final fallback: use candy_hearts (level 1) from dynamicLevels
    const candyHeartsLevel = dynamicLevels.find((node) => node.id === 'candy_hearts');
    if (candyHeartsLevel) {
      setAvatarPos(candyHeartsLevel.position);
      setAvatarTarget(candyHeartsLevel.position);
      hasInitializedPosition.current = true;
    }
  }, [levelStates, dynamicLevels, levels]);

  // Avatar movement loop + camera follow
  useEffect(() => {
    let frame: number;
    const animate = () => {
      setAvatarPos((prev) => {
        const dx = avatarTarget.x - prev.x;
        const dy = avatarTarget.y - prev.y;
        const dist = Math.hypot(dx, dy);
        // Ažuriraj ref prije nego što se pozicija promijeni
        lastAvatarPosRef.current = prev;
        if (dist < 5) {
          return avatarTarget;
        }
        // Sporije kretanje kada ide prema level node-u (za bolju vidljivost animacije)
        const speed = pendingLevelCode ? 0.015 : 0.035; // smoothing factor - sporije kada ide prema level-u
        const next = { x: prev.x + dx * speed, y: prev.y + dy * speed };
        return next;
      });
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [avatarTarget, pendingLevelCode]);
  
  // Debug: Log kada se avatar target promijeni
  useEffect(() => {
    if (pendingLevelCode) {
      const dist = Math.hypot(avatarTarget.x - avatarPos.x, avatarTarget.y - avatarPos.y);
      console.log('Avatar target changed:', avatarTarget, 'Distance:', dist, 'Pending:', pendingLevelCode);
    }
  }, [avatarTarget, pendingLevelCode, avatarPos]);

  // Kamera prati avatar kada ide prema level node-u
  useEffect(() => {
    if (!pendingLevelCode || !isFollowing) return;
    
    // Kontinuirano prati avatar dok ide prema level node-u sa smooth animacijom
    let frame: number;
    let lastCameraUpdate = 0;
    const followAvatar = () => {
      const now = Date.now();
      // Ažuriraj kameru svakih ~16ms (60fps) za smooth praćenje
      if (now - lastCameraUpdate >= 16) {
        centerOnAvatar(avatarPos);
        lastCameraUpdate = now;
      }
      frame = requestAnimationFrame(followAvatar);
    };
    
    frame = requestAnimationFrame(followAvatar);
    
    return () => {
      if (frame) cancelAnimationFrame(frame);
    };
  }, [avatarPos, pendingLevelCode, isFollowing, centerOnAvatar]);

  // Mouse drag panning
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 1 || e.button === 2 || (e.button === 0 && e.shiftKey)) {
      // Middle mouse, right mouse, or shift+left
      e.preventDefault();
      isDraggingRef.current = true;
      dragStartRef.current = { x: e.clientX, y: e.clientY };
      setIsFollowing(false);
    }
  }, [setIsFollowing]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDraggingRef.current && dragStartRef.current) {
      const deltaX = e.clientX - dragStartRef.current.x;
      const deltaY = e.clientY - dragStartRef.current.y;
      pan(deltaX, deltaY);
      dragStartRef.current = { x: e.clientX, y: e.clientY };
    }
  }, [pan]);

  const handleMouseUp = useCallback(() => {
    isDraggingRef.current = false;
    dragStartRef.current = null;
  }, []);

  // Mouse wheel - scroll po mapi (ne zoom, jer je fiksni overview zoom)
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const scrollSpeed = 1.2; // Brzina scroll-a
    const deltaY = -e.deltaY * scrollSpeed; // Obrnuto: kad skrolaš gore, ide gore; kad dole, ide dole
    pan(0, deltaY); // Scroll po Y osi (gore-dole)
  }, [pan]);

  // Touch drag for mobile
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      touchStartRef.current = { x: touch.clientX, y: touch.clientY };
      setIsFollowing(false);
    }
  }, [setIsFollowing]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1 && touchStartRef.current) {
      const touch = e.touches[0];
      const deltaX = touch.clientX - touchStartRef.current.x;
      const deltaY = touch.clientY - touchStartRef.current.y;
      pan(deltaX, deltaY);
      touchStartRef.current = { x: touch.clientX, y: touch.clientY };
    }
  }, [pan]);

  const handleTouchEnd = useCallback(() => {
    touchStartRef.current = null;
  }, []);

  // Detect arrival to target level
  useEffect(() => {
    if (!pendingLevelCode || arrivedAtLevel || hasOpenedLevel.current) return;
    
    const dx = avatarTarget.x - avatarPos.x;
    const dy = avatarTarget.y - avatarPos.y;
    const distance = Math.hypot(dx, dy);
    
    // Provjeri da avatar stvarno ide prema targetu
    const lastPos = lastAvatarPosRef.current;
    const distanceFromLastPos = Math.hypot(avatarTarget.x - lastPos.x, avatarTarget.y - lastPos.y);
    const isMovingTowardsTarget = distance < distanceFromLastPos;
    
    // Također provjeri da avatar nije stao (mora se približavati)
    const avatarMovement = Math.hypot(avatarPos.x - lastPos.x, avatarPos.y - lastPos.y);
    const isMoving = avatarMovement > 0.1;
    
    // VAŽNO: Avatar mora stvarno ići prema targetu, ne samo biti blizu!
    // Provjeri da avatar stvarno ide prema targetu (distance se smanjuje)
    // I provjeri da je avatar prošao barem neku udaljenost od početne pozicije
    const startPos = startPosRef.current;
    let hasMovedTowardsTarget = isMovingTowardsTarget && isMoving;
    
    // Ako imamo start poziciju, provjeri da je avatar prošao barem 5px
    if (startPos) {
      const totalDistanceTraveled = Math.hypot(avatarPos.x - startPos.x, avatarPos.y - startPos.y);
      hasMovedTowardsTarget = hasMovedTowardsTarget && totalDistanceTraveled > 5;
    }
    
    // Kada avatar stigne do level node-a (unutar 40px) I kada se približava targetu I kada se kreće
    // MORA se približavati targetu, ne samo biti blizu!
    if (distance < 40 && hasMovedTowardsTarget) {
      const code = pendingLevelCode;
      setArrivedAtLevel(true);
      setPendingLevelCode(null);
      setIsFollowing(false); // Prestani pratiti kada stigne
      hasOpenedLevel.current = true; // Spriječi višestruko pozivanje
      
      // Kratka pauza (1000ms = 1 sekunda) da se vidi da je avatar stigao, pa tek onda pokreni igru
      setTimeout(() => {
        setArrivedAtLevel(false);
        // Sačuvaj trenutnu poziciju avatara prije otvaranja levela
        const currentPos = avatarPos;
        localStorage.setItem('lastAvatarX', currentPos.x.toString());
        localStorage.setItem('lastAvatarY', currentPos.y.toString());
      onOpenLevel(code);
        // Resetuj flag nakon kratke pauze
        setTimeout(() => {
          hasOpenedLevel.current = false;
        }, 2000);
      }, 1000);
    }
  }, [avatarPos, avatarTarget, pendingLevelCode, onOpenLevel, setIsFollowing, arrivedAtLevel]);

  const handleLevelClick = (node: LoveLevelNode, absoluteY?: number) => {
    const state = levelStates[node.id];
    if (!state?.unlocked) {
      // locked
      alert('Završi prethodni nivo da bi otključala ovaj, ljubavi.');
      return;
    }
    
    // Ako već ide prema nekom level-u, ne dozvoli novi klik
    if (pendingLevelCode && !arrivedAtLevel) {
      console.log('Already moving towards level:', pendingLevelCode);
      return;
    }
    
    // Resetuj flag za otvaranje levela
    hasOpenedLevel.current = false;
    
    // Sačuvaj poziciju avatara prije klika na level (za slučaj da se level već završio)
    const currentPos = avatarPos;
    localStorage.setItem('lastAvatarX', currentPos.x.toString());
    localStorage.setItem('lastAvatarY', currentPos.y.toString());
    
    // Izračunaj apsolutnu Y poziciju ako nije već izračunata
    let finalAbsoluteY = absoluteY;
    if (finalAbsoluteY === undefined) {
      const districtIndex = DISTRICTS.findIndex(d => d.levelIds.includes(node.id));
      finalAbsoluteY = districtIndex >= 0 ? districtIndex * districtHeight + node.position.y : node.position.y;
    }
    const absoluteTarget = { x: node.position.x, y: finalAbsoluteY };
    
    // Reset arrivedAtLevel state i postavi start poziciju
    setArrivedAtLevel(false);
    lastAvatarPosRef.current = avatarPos;
    startPosRef.current = avatarPos; // Zabilježi početnu poziciju
    
    const distance = Math.hypot(absoluteTarget.x - avatarPos.x, absoluteTarget.y - avatarPos.y);
    console.log('Level clicked:', state.code);
    console.log('Current avatar pos:', avatarPos);
    console.log('Target level pos (relative):', node.position);
    console.log('Target level pos (absolute):', absoluteTarget);
    console.log('Distance to target:', distance);
    console.log('Current avatarTarget:', avatarTarget);
    
    // Ako je avatar već jako blizu (< 10px), odmah otvori level
    if (distance < 10) {
      console.log('Avatar is already at target! Opening level immediately.');
      hasOpenedLevel.current = true;
      setTimeout(() => {
        const currentPos = avatarPos;
        localStorage.setItem('lastAvatarX', currentPos.x.toString());
        localStorage.setItem('lastAvatarY', currentPos.y.toString());
        onOpenLevel(state.code);
        setTimeout(() => {
          hasOpenedLevel.current = false;
        }, 2000);
      }, 100);
      return;
    }
    
    // UVIJEK animiraj avatar prema level node-u, čak i ako je blizu
    // Postavi target poziciju (apsolutna level node pozicija)
    // Koristi novi objekat da osiguraš da se state promijeni
    console.log('Setting new target:', absoluteTarget);
    setAvatarTarget(absoluteTarget);
    setPendingLevelCode(state.code);
    setIsFollowing(true); // Omogući kameri da prati avatar
    
    // VAŽNO: Centriraj kameru na avatar odmah kada se klikne na level
    // Ovo osigurava da se kamera vrati na karaktera čak i ako je korisnik scrollao
    centerOnAvatar(avatarPos);
    
    // Također centriraj kameru nakon kratke pauze da se osigura da je centrirana
    setTimeout(() => {
      centerOnAvatar(avatarPos);
    }, 100);
  };

      // Zoom kontrole su onemogućene - fiksni overview zoom

  // Love-themed decorations (hearts, stars) distributed across districts
  const decorations = useMemo<Decoration[]>(() => {
    const items: Decoration[] = [];
    const heartSprites = [
      CandyAssets.hearts.find((h) => h.includes('white')) || CandyAssets.hearts[0],
      CandyAssets.hearts.find((h) => h.includes('pink')) || CandyAssets.hearts[4],
      CandyAssets.hearts.find((h) => h.includes('red')) || CandyAssets.hearts[6],
    ];
    const starParticles = ParticleAssets.particles.filter((p) => 
      p.includes('star') || p.includes('twinkle')
    );
    
    const allSprites = [
      ...heartSprites,
      ...starParticles.slice(0, 6),
      ...ParticleAssets.particles.filter((p) => p.includes('heart')).slice(0, 3),
    ];
    
    const avoidPositions = dynamicLevels.map((n) => n.position);
    
    // Distribute decorations across districts
    DISTRICTS.forEach((district, districtIndex) => {
      const decorationsPerDistrict = 12;
      
      for (let i = 0; i < decorationsPerDistrict; i++) {
        const sprite = allSprites[(districtIndex * decorationsPerDistrict + i) % allSprites.length];
        const pos: Vec2 = {
          x: Math.random() * fixedViewportWidth,
          y: 50 + Math.random() * (districtHeight - 100), // Within district bounds (relative)
        };
        const levelInDistrict = dynamicLevels.find(l => l.districtId === district.id);
        if (levelInDistrict) {
          const levelPos = levelPositions[levelInDistrict.id];
          if (levelPos && Math.hypot(levelPos.x - pos.x, levelPos.y - pos.y) < 200) {
            continue;
          }
        }
        items.push({
          id: `dec-${districtIndex}-${i}`,
          sprite,
          position: pos,
          scale: sprite.includes('heart') ? 0.8 + Math.random() * 0.8 : 0.6 + Math.random() * 1.0,
          layer: i % 3 === 0 ? 'background' : i % 3 === 1 ? 'midground' : 'foreground',
          float: Math.random() > 0.4,
        });
      }
    });
    
    return items;
  }, [districtHeight]);

  // Paths between nodes
  const levelPairs = useMemo(() => {
    const pairs: Array<{ from: LoveLevelNode; to: LoveLevelNode }> = [];
    for (let i = 0; i < dynamicLevels.length - 1; i++) {
      pairs.push({ from: dynamicLevels[i], to: dynamicLevels[i + 1] });
    }
    return pairs;
  }, [dynamicLevels]);

  return (
    <div className="love-map-page">
      {/* HUD overlay */}
      <div className="map-top-bar hud-fixed">
        <div className="back-button-wrapper">
        <MetalButton variant="wide" iconLeftSrc={MetalIcons.arrowLeft} onClick={onBack} className="back-button">
          Nazad
        </MetalButton>
        </div>
        <div 
          className="hearts-display"
          style={{
            gridColumn: '2',
            gridRow: '1',
            placeSelf: 'center',
            justifySelf: 'center',
            alignSelf: 'center',
            margin: '0 auto',
            width: 'fit-content',
            position: 'relative',
            left: 'auto',
            right: 'auto',
            top: 'auto',
            transform: 'none',
          }}
        >
          <MetalIcon src={MetalIcons.heartFilled} size={20} alt="Heart" className="hearts-icon" noInlineStyles={true} />
          <span className="hearts-count">{hearts.toLocaleString('bs-BA')}</span>
        </div>
        <div className="map-actions">
          <MetalButton variant="wide" onClick={onShop} iconLeftSrc={MetalIcons.menu} className="action-button">
            Shop
          </MetalButton>
          <MetalButton variant="wide" onClick={onAvatar} iconLeftSrc={MetalIcons.home} className="action-button">
            Avatar
          </MetalButton>
        </div>
      </div>

      {/* Viewport */}
      <div 
        className="map-viewport" 
        ref={containerRef}
        onContextMenu={(e) => e.preventDefault()}
      >
        {/* Zoom kontrole su onemogućene - fiksni overview zoom */}

        <div
          className="map-world"
          style={{
            width: '100%',
            minHeight: worldHeight,
            position: 'relative',
          }}
        >
          {/* Global paths SVG - covers all districts for seamless connections */}
          <svg 
            className="map-paths-overlay-global" 
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: `${fixedViewportWidth}px`,
              height: `${worldHeight}px`,
              pointerEvents: 'none',
              zIndex: 3,
            }}
          >
            {DISTRICTS.map((district, distIdx) => {
              const districtLevels = dynamicLevels.filter(l => l.districtId === district.id);
              if (districtLevels.length === 0) return null;
              
              return districtLevels.map((fromNode, levelIdx) => {
                // Path to next level in same district
                if (levelIdx < districtLevels.length - 1) {
                  const toNode = districtLevels[levelIdx + 1];
                  const fromState = levelStates[fromNode.id];
                  const toState = levelStates[toNode.id];
                  const isPathUnlocked = toState?.unlocked || false;
                  
                  // Absolute coordinates
                  const districtY = distIdx * districtHeight;
                  const fromX = fromNode.position.x;
                  const fromY = districtY + fromNode.position.y;
                  const toX = toNode.position.x;
                  const toY = districtY + toNode.position.y;
                  
                  // Create winding curve between levels
                  const baseOffset = 80;
                  const direction = (distIdx % 2 === 0) 
                    ? (levelIdx % 2 === 0 ? 1 : -1)
                    : (levelIdx % 2 === 0 ? -1 : 1);
                  const horizontalOffset = baseOffset * direction;
                  const midX = (fromX + toX) / 2 + horizontalOffset;
                  const midY = (fromY + toY) / 2;
                  
                  const ctrl1X = fromX + (midX - fromX) * 0.4;
                  const ctrl1Y = fromY + (midY - fromY) * 0.3;
                  const ctrl2X = midX + (toX - midX) * 0.6;
                  const ctrl2Y = midY + (toY - midY) * 0.7;
                  
                  const pathD = `M ${fromX},${fromY} C ${ctrl1X},${ctrl1Y} ${ctrl2X},${ctrl2Y} ${toX},${toY}`;
                  
                  return (
                    <g key={`global-path-${fromNode.id}-${toNode.id}`} style={{ vectorEffect: 'non-scaling-stroke' }}>
                      <path
                        d={pathD}
                        stroke="#ffb3d9"
                        strokeWidth="60"
                        fill="none"
                        strokeOpacity={0.2}
                        className="map-path-shadow"
                        vectorEffect="non-scaling-stroke"
                      />
                      <path
                        d={pathD}
                        stroke="#ff99cc"
                        strokeWidth="40"
                        fill="none"
                        strokeOpacity={0.3}
                        className="map-path-glow"
                        vectorEffect="non-scaling-stroke"
                      />
                      <path
                        d={pathD}
                        stroke={isPathUnlocked ? "#ff7bc6" : "#996699"}
                        strokeWidth="32"
                        fill="none"
                        strokeOpacity={isPathUnlocked ? 0.9 : 0.4}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="map-path"
                        vectorEffect="non-scaling-stroke"
                        style={{ 
                          filter: isPathUnlocked ? 'drop-shadow(0 0 10px rgba(255, 123, 198, 0.6))' : 'none',
          }}
                      />
                    </g>
                  );
                }
                
                // Path from last level in this district to first level in next district
                if (levelIdx === districtLevels.length - 1 && distIdx < DISTRICTS.length - 1) {
                  const nextDistrict = DISTRICTS[distIdx + 1];
                  const nextDistrictLevels = dynamicLevels.filter(l => l.districtId === nextDistrict.id);
                  if (nextDistrictLevels.length === 0) return null;
                  
                  const toNode = nextDistrictLevels[0];
                  const fromState = levelStates[fromNode.id];
                  const toState = levelStates[toNode.id];
                  const isPathUnlocked = toState?.unlocked || false;
                  
                  // Absolute coordinates for seamless connection
                  const currentDistrictY = distIdx * districtHeight;
                  const nextDistrictY = (distIdx + 1) * districtHeight;
                  const fromX = fromNode.position.x;
                  const fromY = currentDistrictY + fromNode.position.y;
                  const toX = toNode.position.x;
                  const toY = nextDistrictY + toNode.position.y;
                  
                  // Create smooth continuous curve - alternate direction
                  const baseOffset = 150;
                  const direction = distIdx % 2 === 0 ? 1 : -1;
                  const horizontalOffset = baseOffset * direction;
                  const midX = (fromX + toX) / 2 + horizontalOffset;
                  const midY = fromY + (toY - fromY) * 0.5;
                  
                  const ctrl1X = fromX + (midX - fromX) * 0.4;
                  const ctrl1Y = fromY + (midY - fromY) * 0.3;
                  const ctrl2X = midX + (toX - midX) * 0.6;
                  const ctrl2Y = midY + (toY - midY) * 0.7;
                  
                  const pathD = `M ${fromX},${fromY} C ${ctrl1X},${ctrl1Y} ${ctrl2X},${ctrl2Y} ${toX},${toY}`;
                  
                  return (
                    <g key={`global-path-${fromNode.id}-${toNode.id}`} style={{ vectorEffect: 'non-scaling-stroke' }}>
                      <path
                        d={pathD}
                        stroke="#ffb3d9"
                        strokeWidth="60"
                        fill="none"
                        strokeOpacity={0.2}
                        className="map-path-shadow"
                        vectorEffect="non-scaling-stroke"
                      />
                      <path
                        d={pathD}
                        stroke="#ff99cc"
                        strokeWidth="40"
                        fill="none"
                        strokeOpacity={0.3}
                        className="map-path-glow"
                        vectorEffect="non-scaling-stroke"
                      />
                      <path
                        d={pathD}
                        stroke={isPathUnlocked ? "#ff7bc6" : "#996699"}
                        strokeWidth="32"
                        fill="none"
                        strokeOpacity={isPathUnlocked ? 0.9 : 0.4}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="map-path"
                        vectorEffect="non-scaling-stroke"
                        style={{ 
                          filter: isPathUnlocked ? 'drop-shadow(0 0 10px rgba(255, 123, 198, 0.6))' : 'none',
                        }}
                      />
                    </g>
                  );
                }
                
                return null;
              });
            })}
          </svg>
          
          {/* Districts - each one full viewport height */}
          {DISTRICTS.map((district, distIdx) => {
            const districtLevels = dynamicLevels.filter(l => l.districtId === district.id);
            const districtDecorations = decorations.filter((d, idx) => {
              // Decorations are already filtered by district index
              return d.id.startsWith(`dec-${district.index}-`);
            });
            
            // Debug: Log district info (removed to prevent infinite loop)
            
            if (district.theme === 'romantic_city') {
            return (
                <div
                  key={district.id}
                  className="district-section"
                  style={{
                    width: '100%',
                    height: districtHeight,
                    position: 'relative',
                    overflow: 'visible', // Allow paths to extend beyond district boundaries
                  }}
                >
              <RomanticCityDistrict
                    worldYStart={0}
                    cameraY={0}
                    zoom={1}
                    district={{
                      ...district,
                      height: districtHeight,
                    }}
                  />
                  
                  {/* Level islands for this district */}
                  {districtLevels.map((node, idx) => {
                    const state = levelStates[node.id];
                    const planetOptions = [
                      MapAssets.planets.find((p) => p.includes('Springo')) || MapAssets.planets[0],
                      MapAssets.planets.find((p) => p.includes('Rocky') || p.includes('Gyro')) || MapAssets.planets[10],
                      MapAssets.planets.find((p) => p.includes('Gyro') || p.includes('Cloud')) || MapAssets.planets[5],
                    ];
                    const planet = planetOptions[idx] || MapAssets.planets[idx];
                    const unlocked = state?.unlocked;
                    const completed = state?.completed;
                    // Izračunaj apsolutnu poziciju za ovaj level node
                    const absoluteY = distIdx * districtHeight + node.position.y;
                    return (
                      <div
                        key={node.id}
                        className={`level-node island-node ${unlocked ? 'unlocked' : 'locked'} ${completed ? 'completed' : ''}`}
                        style={{
                          position: 'absolute',
                          left: `${node.position.x}px`,
                          top: `${node.position.y}px`,
                          transform: 'translate(-50%, -50%)',
                          zIndex: 10,
                        }}
                        onClick={() => handleLevelClick(node, absoluteY)}
                      >
                        <div className="level-island">
                          {unlocked && !completed && <div className="island-halo unlocked-halo" />}
                          {completed && <div className="island-halo completed-halo" />}
                          <img src={planet} alt="" className="island-planet" />
                          <div className="level-icon">
                            {completed ? (
                              <MetalIcon src={MetalIcons.tick} size={36} alt="Completed" />
                            ) : unlocked ? (
                              <MetalIcon src={MetalIcons.heartFilled} size={36} alt="Unlocked" />
                            ) : (
                              <MetalIcon src={MetalIcons.cross} size={36} alt="Locked" />
                            )}
                          </div>
                        </div>
                        <div className="level-name">{node.name}</div>
                        {unlocked && !completed && (
                          <div className="level-reward">
                            +{state?.reward || node.rewardHearts}{' '}
                            <MetalIcon src={MetalIcons.heartFilled} size={16} alt="Heart" />
                          </div>
                        )}
                        {completed && (
                          <div className="level-completed-badge">
                            <MetalIcon src={MetalIcons.tick} size={14} alt="Completed" />
                            Završeno
                          </div>
                        )}
                      </div>
            );
          })}

                  {/* Decorations for this district */}
                  {districtDecorations.map((dec) => {
                    return (
                      <img
                        key={dec.id}
                        src={dec.sprite}
                        alt=""
                        className={`decoration decoration-${dec.layer} ${dec.float ? 'float' : ''}`}
                        style={{
                          position: 'absolute',
                          left: `${dec.position.x}px`,
                          top: `${dec.position.y}px`,
                          width: `${80 * dec.scale}px`,
                          height: `${80 * dec.scale}px`,
                          transform: 'translate(-50%, -50%)',
                          zIndex: 1,
                        }}
              />
            );
          })}
                </div>
              );
            } else {
            // Ensure district is rendered even if no levels (for debugging)
            if (districtLevels.length === 0) {
              console.warn(`District ${district.id} has no levels!`);
            }
            
            return (
              <div
                key={district.id}
                  className="district-section district-bg"
                style={{
                    width: '100%',
                    height: districtHeight,
                    position: 'relative',
                  background: district.theme === 'beach' 
                    ? 'linear-gradient(180deg, rgba(20, 40, 60, 0.8), rgba(40, 60, 100, 0.6))'
                    : 'linear-gradient(180deg, rgba(20, 12, 40, 0.7), rgba(50, 30, 90, 0.5))',
                    overflow: 'visible',
                }}
              >
                <div
                  className="district-name-label"
                  style={{
                    position: 'absolute',
                    top: 20,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    color: 'rgba(255, 255, 255, 0.8)',
                    fontSize: '24px',
                    fontWeight: 600,
                    textShadow: '2px 2px 4px rgba(0, 0, 0, 0.5)',
                    zIndex: 1,
                      display: 'none',
                  }}
                >
                  {district.name}
                </div>
                  
                  {/* Level islands for this district */}
                  {districtLevels.map((node, idx) => {
            const state = levelStates[node.id];
            const planetOptions = [
                      MapAssets.planets.find((p) => p.includes('Springo')) || MapAssets.planets[0],
                      MapAssets.planets.find((p) => p.includes('Rocky') || p.includes('Gyro')) || MapAssets.planets[10],
                      MapAssets.planets.find((p) => p.includes('Gyro') || p.includes('Cloud')) || MapAssets.planets[5],
            ];
            const planet = planetOptions[idx] || MapAssets.planets[idx];
            const unlocked = state?.unlocked;
            const completed = state?.completed;
            // Izračunaj apsolutnu Y poziciju za ovaj level node
            const absoluteY = distIdx * districtHeight + node.position.y;
            return (
              <div
                key={node.id}
                className={`level-node island-node ${unlocked ? 'unlocked' : 'locked'} ${completed ? 'completed' : ''}`}
                style={{
                          position: 'absolute',
                          left: `${node.position.x}px`,
                          top: `${node.position.y}px`,
                          transform: 'translate(-50%, -50%)',
                          zIndex: 10,
                }}
                onClick={() => handleLevelClick(node, absoluteY)}
              >
                <div className="level-island">
                  {unlocked && !completed && <div className="island-halo unlocked-halo" />}
                  {completed && <div className="island-halo completed-halo" />}
                  <img src={planet} alt="" className="island-planet" />
                  <div className="level-icon">
                    {completed ? (
                      <MetalIcon src={MetalIcons.tick} size={36} alt="Completed" />
                    ) : unlocked ? (
                      <MetalIcon src={MetalIcons.heartFilled} size={36} alt="Unlocked" />
                    ) : (
                      <MetalIcon src={MetalIcons.cross} size={36} alt="Locked" />
                    )}
                  </div>
                </div>
                <div className="level-name">{node.name}</div>
                {unlocked && !completed && (
                  <div className="level-reward">
                    +{state?.reward || node.rewardHearts}{' '}
                    <MetalIcon src={MetalIcons.heartFilled} size={16} alt="Heart" />
                  </div>
                )}
                {completed && (
                  <div className="level-completed-badge">
                            <MetalIcon src={MetalIcons.tick} size={14} alt="Completed" />
                            Završeno
                  </div>
                )}
              </div>
            );
                  })}
                  
                  {/* Decorations for this district */}
                  {districtDecorations.map((dec) => {
                    return (
                      <img
                        key={dec.id}
                        src={dec.sprite}
                        alt=""
                        className={`decoration decoration-${dec.layer} ${dec.float ? 'float' : ''}`}
                        style={{
                          position: 'absolute',
                          left: `${dec.position.x}px`,
                          top: `${dec.position.y}px`,
                          width: `${80 * dec.scale}px`,
                          height: `${80 * dec.scale}px`,
                          transform: 'translate(-50%, -50%)',
                          zIndex: 1,
                        }}
                      />
                    );
                  })}
                </div>
              );
            }
          })}

          {/* Avatar */}
          {!hideAvatar && avatarData && avatarData.baseBodyId && (
            <div
              style={{
                position: 'absolute',
                // Pomaknuto značajno udesno i iznad da otvori pogled na igru
                left: `${avatarPos.x + 140}px`,
                top: `${avatarPos.y - 90}px`,
                transform: 'translate(-50%, -50%)',
                zIndex: 100,
                pointerEvents: 'none',
              }}
            >
              {/* Ensure defaults so avatar is dressed */}
              {(() => {
                const eq = (avatarData.equippedItems as Record<string, string | null>) || {};
                const equippedItems = {
                  Base: avatarData.baseBodyId,
                  Hair: eq.Hair || 'hair_1_1',
                  Eyes: eq.Eyes || 'eyes_1_1',
                  Eyebrows: eq.Eyebrows || 'eyebrows_1',
                  Mouth: eq.Mouth || 'mouth_1',
                  Top: eq.Top || 'top_1_1',
                  Bottom: eq.Bottom || 'bottom_1_1',
                  Misc: eq.Misc || null,
                };
                return (
              <LayeredAvatarRenderer
                avatar={{
                  baseBodyId: avatarData.baseBodyId,
                  equippedItems,
                }}
                size="small"
              />
                );
              })()}
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default LoveMap;

