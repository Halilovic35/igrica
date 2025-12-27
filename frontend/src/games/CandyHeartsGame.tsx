import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { CandyAssets } from '../assetsIndex';
import MetalButton from '../components/metal-ui/MetalButton';
import MetalIcon, { MetalIcons } from '../components/metal-ui/MetalIcon';
import MetalPopup from '../components/metal-ui/MetalPopup';
import { animateHeartsToTopBar } from '../utils/heartsAnimation';
import { useAuth } from '../contexts/AuthContext';
import '../styles/GamePage.css';
import '../styles/CandyHeartsGame.css';

interface CandyHeartsGameProps {
  onComplete: () => void;
}

type HeartType = 'red' | 'blue' | 'yellow' | 'pink' | 'purple';

interface HeartTile {
  id: string;
  row: number;
  col: number;
  type: HeartType | null;
  clearing?: boolean;
  swapping?: boolean;
}

interface HeartGoal {
  type: HeartType;
  target: number;
}

const GRID_SIZE = 8;
const MAX_MOVES = 25; // Smanjeno sa 40 na 25
const TILE_SIZE = 70; // pixels
const GAP = 4; // gap between tiles
const SWAP_ANIMATION_MS = 200;
const FALL_ANIMATION_MS = 300;
const CLEAR_ANIMATION_MS = 300;

// Map heart types to images
const HEART_TYPE_TO_IMAGE: Record<HeartType, string> = {
  red: CandyAssets.hearts.find(h => h.includes('gem_heart_red') && !h.includes('outline')) || CandyAssets.hearts[12],
  blue: CandyAssets.hearts.find(h => h.includes('gem_heart_blue') && !h.includes('outline')) || CandyAssets.hearts[2],
  yellow: CandyAssets.hearts.find(h => h.includes('gem_heart_yellow') && !h.includes('outline')) || CandyAssets.hearts[16],
  pink: CandyAssets.hearts.find(h => h.includes('gem_heart_pink') && !h.includes('outline')) || CandyAssets.hearts[8],
  purple: CandyAssets.hearts.find(h => h.includes('gem_heart_purple') && !h.includes('outline')) || CandyAssets.hearts[10],
};

const GOALS: HeartGoal[] = [
  { type: 'red', target: 30 },
  { type: 'blue', target: 25 },
  { type: 'pink', target: 20 },
];

const HEART_TYPES: HeartType[] = ['red', 'blue', 'yellow', 'pink', 'purple'];

const CandyHeartsGame: React.FC<CandyHeartsGameProps> = ({ onComplete }) => {
  const navigate = useNavigate();
  const [tiles, setTiles] = useState<HeartTile[]>([]);
  const [selectedTile, setSelectedTile] = useState<string | null>(null);
  const [movesLeft, setMovesLeft] = useState(MAX_MOVES);
  const [collected, setCollected] = useState<Record<HeartType, number>>({
    red: 0,
    blue: 0,
    yellow: 0,
    pink: 0,
    purple: 0,
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [showWinModal, setShowWinModal] = useState(false);
  const [showLoseModal, setShowLoseModal] = useState(false);
  const [isShaking, setIsShaking] = useState(false);
  const [hasWon, setHasWon] = useState(false);
  const [heartsAnimating, setHeartsAnimating] = useState(false);
  const [animatedHeartsCount, setAnimatedHeartsCount] = useState(0);
  const [hearts, setHearts] = useState(0);
  const [showTopBar, setShowTopBar] = useState(false);
  const { fetchUser } = useAuth();
  const collectedRef = useRef(collected);

  // Keep collected ref in sync
  useEffect(() => {
    collectedRef.current = collected;
  }, [collected]);

  // Fetch initial hearts
  useEffect(() => {
    const fetchHearts = async () => {
      try {
        const response = await api.get('/stats');
        setHearts(response.data.heartsBalance || 0);
      } catch (error) {
        console.error('Failed to fetch hearts:', error);
      }
    };
    fetchHearts();
  }, []);

  useEffect(() => {
    initializeBoard();
  }, []);

  const initializeBoard = () => {
    const newTiles: HeartTile[] = [];
    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        newTiles.push({
          id: `tile-${row}-${col}`,
          row,
          col,
          type: HEART_TYPES[Math.floor(Math.random() * HEART_TYPES.length)],
        });
      }
    }
    
    // Remove initial matches
    let matches = findMatches(newTiles);
    while (matches.size > 0) {
      matches.forEach(tileId => {
        const tile = newTiles.find(t => t.id === tileId);
        if (tile) {
          tile.type = HEART_TYPES[Math.floor(Math.random() * HEART_TYPES.length)];
        }
      });
      matches = findMatches(newTiles);
    }
    
    setTiles(newTiles);
  };

  const getTileAt = (tiles: HeartTile[], row: number, col: number): HeartTile | undefined => {
    return tiles.find(t => t.row === row && t.col === col);
  };

  const findMatches = (tileList: HeartTile[]): Set<string> => {
    const matched = new Set<string>();
    const grid: (HeartTile | null)[][] = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(null));
    
    tileList.forEach(tile => {
      if (tile.type !== null) {
        grid[tile.row][tile.col] = tile;
      }
    });

    // Check horizontal matches
    for (let row = 0; row < GRID_SIZE; row++) {
      let count = 1;
      let currentType: HeartType | null = null;
      for (let col = 0; col < GRID_SIZE; col++) {
        const tile = grid[row][col];
        if (tile && tile.type === currentType && currentType !== null) {
          count++;
        } else {
          if (count >= 3 && currentType !== null) {
            for (let i = col - count; i < col; i++) {
              const matchedTile = grid[row][i];
              if (matchedTile) matched.add(matchedTile.id);
            }
          }
          currentType = tile?.type || null;
          count = 1;
        }
      }
      if (count >= 3 && currentType !== null) {
        for (let i = GRID_SIZE - count; i < GRID_SIZE; i++) {
          const matchedTile = grid[row][i];
          if (matchedTile) matched.add(matchedTile.id);
        }
      }
    }

    // Check vertical matches
    for (let col = 0; col < GRID_SIZE; col++) {
      let count = 1;
      let currentType: HeartType | null = null;
      for (let row = 0; row < GRID_SIZE; row++) {
        const tile = grid[row][col];
        if (tile && tile.type === currentType && currentType !== null) {
          count++;
        } else {
          if (count >= 3 && currentType !== null) {
            for (let i = row - count; i < row; i++) {
              const matchedTile = grid[i][col];
              if (matchedTile) matched.add(matchedTile.id);
            }
          }
          currentType = tile?.type || null;
          count = 1;
        }
      }
      if (count >= 3 && currentType !== null) {
        for (let i = GRID_SIZE - count; i < GRID_SIZE; i++) {
          const matchedTile = grid[i][col];
          if (matchedTile) matched.add(matchedTile.id);
        }
      }
    }

    return matched;
  };

  const isAdjacent = (tile1: HeartTile, tile2: HeartTile): boolean => {
    const rowDiff = Math.abs(tile1.row - tile2.row);
    const colDiff = Math.abs(tile1.col - tile2.col);
    return (rowDiff === 1 && colDiff === 0) || (rowDiff === 0 && colDiff === 1);
  };

  const swapTiles = (tile1: HeartTile, tile2: HeartTile): HeartTile[] => {
    return tiles.map(tile => {
      if (tile.id === tile1.id) {
        return { ...tile, row: tile2.row, col: tile2.col, swapping: true };
      }
      if (tile.id === tile2.id) {
        return { ...tile, row: tile1.row, col: tile1.col, swapping: true };
      }
      return tile;
    });
  };

  const applyGravity = (tileList: HeartTile[]): HeartTile[] => {
    const newTiles = tileList.map(t => ({ ...t }));
    const grid: (HeartTile | null)[][] = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(null));
    
    // Build grid
    newTiles.forEach(tile => {
      if (tile.type !== null) {
        grid[tile.row][tile.col] = tile;
      }
    });

    // Apply gravity column by column
    for (let col = 0; col < GRID_SIZE; col++) {
      const columnTiles: HeartTile[] = [];
      for (let row = GRID_SIZE - 1; row >= 0; row--) {
        if (grid[row][col] && grid[row][col]!.type !== null) {
          columnTiles.push(grid[row][col]!);
        }
      }
      
      // Move tiles down
      columnTiles.forEach((tile, index) => {
        const newRow = GRID_SIZE - 1 - index;
        if (tile.row !== newRow) {
          tile.row = newRow;
        }
      });
    }

    return newTiles;
  };

  const refillBoard = (tileList: HeartTile[]): HeartTile[] => {
    // Remove all tiles with type === null
    const validTiles = tileList.filter(t => t.type !== null);
    const grid: (HeartTile | null)[][] = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(null));
    
    // Build grid with only valid tiles
    validTiles.forEach(tile => {
      grid[tile.row][tile.col] = tile;
    });

    // Fill empty spaces with new tiles
    const newTiles: HeartTile[] = [...validTiles];
    for (let col = 0; col < GRID_SIZE; col++) {
      for (let row = 0; row < GRID_SIZE; row++) {
        if (!grid[row][col] || grid[row][col]!.type === null) {
          const newTile: HeartTile = {
            id: `tile-${row}-${col}-${Date.now()}-${Math.random()}`,
            row,
            col,
            type: HEART_TYPES[Math.floor(Math.random() * HEART_TYPES.length)],
          };
          newTiles.push(newTile);
          grid[row][col] = newTile;
        }
      }
    }

    return newTiles;
  };

  const updateCollected = useCallback((clearedTiles: HeartTile[]) => {
    setCollected(prev => {
      const next = { ...prev };
      clearedTiles.forEach(tile => {
        if (tile.type && tile.type in next) {
          next[tile.type]++;
        }
      });
      collectedRef.current = next;
      return next;
    });
  }, []);

  const processMatches = useCallback(async (tileList: HeartTile[]): Promise<HeartTile[]> => {
    let currentTiles = tileList.map(t => ({ ...t }));
    let hasMatches = true;

    while (hasMatches) {
      const matches = findMatches(currentTiles);
      
      if (matches.size === 0) {
        hasMatches = false;
        break;
      }

      // Get cleared tiles for counting BEFORE clearing
      const clearedTiles = currentTiles
        .filter(t => matches.has(t.id) && t.type !== null)
        .map(t => ({ ...t })); // Create copies to preserve type info
      
      // Update collected counts - THIS IS THE KEY FIX
      // This must happen for EVERY clear phase, including cascades
      updateCollected(clearedTiles);

      // Mark tiles as clearing
      currentTiles = currentTiles.map(tile => 
        matches.has(tile.id) ? { ...tile, clearing: true } : tile
      );
      setTiles([...currentTiles]);
      
      await new Promise(resolve => setTimeout(resolve, CLEAR_ANIMATION_MS));

      // Clear matched tiles (set type to null)
      currentTiles = currentTiles.map(tile => 
        matches.has(tile.id) ? { ...tile, type: null, clearing: false } : tile
      );

      // Apply gravity
      currentTiles = applyGravity(currentTiles);
      setTiles([...currentTiles.map(t => ({ ...t, swapping: false }))]);
      
      await new Promise(resolve => setTimeout(resolve, FALL_ANIMATION_MS));

      // Refill empty spaces
      currentTiles = refillBoard(currentTiles);
      setTiles([...currentTiles]);
      
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return currentTiles;
  }, [updateCollected]);

  const handleTileClick = async (tileId: string) => {
    if (isProcessing || hasWon || movesLeft <= 0) return;
    
    const clickedTile = tiles.find(t => t.id === tileId);
    if (!clickedTile || !clickedTile.type) return;

    if (!selectedTile) {
      setSelectedTile(tileId);
      return;
    }

    if (selectedTile === tileId) {
      setSelectedTile(null);
      return;
    }

    const selectedTileObj = tiles.find(t => t.id === selectedTile);
    if (!selectedTileObj) {
      setSelectedTile(tileId);
      return;
    }

    if (!isAdjacent(selectedTileObj, clickedTile)) {
      setSelectedTile(tileId);
      return;
    }

    setIsProcessing(true);
    const originalTiles = [...tiles];
    setSelectedTile(null);

    // Perform swap with animation
    const swappedTiles = swapTiles(selectedTileObj, clickedTile);
    setTiles(swappedTiles);

    // Wait for swap animation
    await new Promise(resolve => setTimeout(resolve, SWAP_ANIMATION_MS));

    // Remove swapping flag
    setTiles(prev => prev.map(t => ({ ...t, swapping: false })));

    // Check for matches
    const matches = findMatches(swappedTiles);

    if (matches.size === 0) {
      // Invalid swap - revert
      setTiles(originalTiles);
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 500);
      setIsProcessing(false);
      return;
    }

    // Valid swap - decrement moves
    setMovesLeft(prev => prev - 1);

    // Process matches
    const finalTiles = await processMatches(swappedTiles);
    setTiles(finalTiles);

    // Check win condition using ref to get latest collected
    // Use setTimeout to ensure state updates are processed
    setTimeout(() => {
      const currentCollected = collectedRef.current;
      const allGoalsMet = GOALS.every(goal => (currentCollected[goal.type] || 0) >= goal.target);
      
      if (allGoalsMet && !hasWon) {
        setHasWon(true);
        completeLevel();
      } else if (movesLeft <= 1 && !allGoalsMet) {
        setShowLoseModal(true);
      }
    }, 100);

    setIsProcessing(false);
  };

  const completeLevel = async () => {
    try {
      // Complete level using levelCode - backend will find level by code
      const completeResponse = await api.post('/levels/complete', { levelCode: 'level_1_candy', score: movesLeft });
      const heartsAwarded = completeResponse.data.heartsAwarded || 0;
      
      // Ažuriraj level-e u pozadini da se osigura da je level označen kao completed
      try {
        await api.get('/levels');
      } catch (error) {
        console.error('Failed to refresh levels:', error);
      }
      
      // Show top bar immediately when level is completed
      setShowTopBar(true);
      
      // Fetch current hearts BEFORE adding new ones
      try {
        const statsResponseBefore = await api.get('/stats');
        const heartsBefore = statsResponseBefore.data.heartsBalance || 0;
        setHearts(heartsBefore);
        
          // Only animate if hearts were awarded (first time completion)
          if (heartsAwarded > 0 && heartsAwarded <= 10) {
            // Small delay to ensure top bar is visible
            setTimeout(() => {
              // Start hearts animation
              setHeartsAnimating(true);
              setAnimatedHeartsCount(heartsBefore);
              
              // Calculate source position (center of screen)
              const sourceX = window.innerWidth / 2;
              const sourceY = window.innerHeight / 2;
              
              // Animate exactly 10 hearts (heartsAwarded should always be 10)
              const heartsToAnimate = Math.min(heartsAwarded, 10); // Cap at 10
              animateHeartsToTopBar(
                sourceX,
                sourceY,
                heartsToAnimate, // Animate exactly the number awarded (max 10)
                (count) => {
                  // Update count: start from hearts before, add animated hearts (max heartsBefore + 10)
                  const newCount = heartsBefore + count;
                  setAnimatedHeartsCount(Math.min(newCount, heartsBefore + 10));
                },
                async () => {
                  // Animation complete - fetch updated hearts from database
                  try {
                    const statsResponse = await api.get('/stats');
                    const finalHearts = statsResponse.data.heartsBalance || 0;
                    setHearts(finalHearts);
                    setAnimatedHeartsCount(finalHearts); // Set to actual database value
                  } catch (error) {
                    console.error('Failed to fetch updated hearts:', error);
                  }
                  setHeartsAnimating(false);
                }
              );
            }, 100);
          } else if (heartsAwarded === 0) {
            // Level already completed, just show current hearts
            setHearts(heartsBefore);
          }
        } catch (error) {
          console.error('Failed to fetch hearts:', error);
        }
      
      setShowWinModal(true);
    } catch (error) {
      console.error('Failed to complete level:', error);
    }
  };

  const handleRetry = () => {
    setShowLoseModal(false);
    setHasWon(false);
    setMovesLeft(MAX_MOVES);
    setCollected({ red: 0, blue: 0, yellow: 0, pink: 0, purple: 0 });
    collectedRef.current = { red: 0, blue: 0, yellow: 0, pink: 0, purple: 0 };
    initializeBoard();
  };

  const handleBack = () => {
    navigate('/love-map');
  };

  const isGoalMet = (goal: HeartGoal): boolean => {
    return (collected[goal.type] || 0) >= goal.target;
  };

  const allGoalsMet = GOALS.every(goal => isGoalMet(goal));

  return (
    <div className="game-container">
      {/* Top Bar - shown after level completion */}
      {showTopBar && (
        <div className="game-top-bar" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: '56px',
          background: 'rgba(35, 0, 70, 0.6)',
          backdropFilter: 'blur(10px)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '10px',
          padding: '0 20px',
        }}>
          <MetalIcon src={MetalIcons.heartFilled} size={20} alt="Heart" />
          <span style={{ fontSize: '18px', fontWeight: 600, color: 'white' }}>
            {heartsAnimating ? Math.min(animatedHeartsCount, hearts + 10) : hearts}
          </span>
        </div>
      )}
      
      <div className="game-header">
        <MetalButton
          variant="wide"
          iconLeftSrc={MetalIcons.arrowLeft}
          onClick={handleBack}
          className="back-button"
        >
          Nazad
        </MetalButton>
        <h1>
          Spoji srcad <MetalIcon src={MetalIcons.heartFilled} size={32} alt="Heart" />
        </h1>
        <div className="game-stats">
          <div className="stat goals-stat">
            <div className="goals-list">
              {GOALS.map(goal => {
                const met = isGoalMet(goal);
                const count = collected[goal.type] || 0;
                return (
                  <div key={goal.type} className="goal-item">
                    <span className={`goal-type goal-${goal.type} ${met ? 'goal-met' : ''}`}>
                      {met && <MetalIcon src={MetalIcons.tick} size={16} alt="Check" className="goal-check" />}
                      <MetalIcon 
                        src={met ? MetalIcons.heartFilled : MetalIcons.heartEmpty} 
                        size={18} 
                        alt="Heart"
                        className="goal-heart"
                      />
                      {met ? goal.target : `${count}/${goal.target}`}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="stat">
            Potezi: {movesLeft} / {MAX_MOVES}
          </div>
        </div>
      </div>

      <div className="game-content-wrapper">
        {/* Instructions Panel - Left Side */}
        <div className="game-instructions">
          <h2>Kako igrati?</h2>
          <div className="instructions-content">
            <p>
              <strong>Cilj:</strong> Spoji 3 ili više srcadi iste boje u nizu (horizontalno ili vertikalno) da bi sakupila srcad!
            </p>
            <p>
              <strong>Kako:</strong>
            </p>
            <ol>
              <li>Klikni na jedno srce</li>
              <li>Zatim klikni na susjedno srce (lijevo, desno, gore ili dolje)</li>
              <li>Ako se formira niz od 3 ili više srcadi iste boje, one će nestati i sakupit ćeš ih</li>
              <li>Nova srca će pasti sa vrha da popune prazna mjesta</li>
            </ol>
            <p>
              <strong>Savjet:</strong> Pokušaj planirati poteze unaprijed! Kombinacije od 4 ili 5 srcadi daju više bodova.
            </p>
            <div className="instructions-goals">
              <p><strong>Tvoji ciljevi:</strong></p>
              <ul>
                {GOALS.map(goal => {
                  const met = isGoalMet(goal);
                  const count = collected[goal.type] || 0;
                  return (
                    <li key={goal.type} className={met ? 'goal-completed' : ''}>
                      {met ? '✓' : '○'} Sakupi {goal.target} {goal.type === 'red' ? 'crvenih' : goal.type === 'blue' ? 'plavih' : 'ružičastih'} srcadi ({count}/{goal.target})
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </div>

        {/* Game Board - Right Side */}
        <div className={`game-board-container ${isShaking ? 'shaking' : ''}`}>
          <div className="game-board" style={{
            width: GRID_SIZE * (TILE_SIZE + GAP) - GAP,
            height: GRID_SIZE * (TILE_SIZE + GAP) - GAP,
          }}>
            {tiles
              .filter(tile => tile.type !== null) // Don't render tiles with null type
              .map(tile => {
                const x = tile.col * (TILE_SIZE + GAP);
                const y = tile.row * (TILE_SIZE + GAP);
                const isSelected = selectedTile === tile.id;
                
                return (
                  <div
                    key={tile.id}
                    className={`game-tile ${isSelected ? 'selected' : ''} ${tile.clearing ? 'clearing' : ''} ${tile.swapping ? 'swapping' : ''}`}
                    style={{
                      transform: `translate3d(${x}px, ${y}px, 0)`,
                      transition: tile.swapping 
                        ? `transform ${SWAP_ANIMATION_MS}ms ease-out`
                        : tile.clearing
                        ? `transform ${CLEAR_ANIMATION_MS}ms ease-out, opacity ${CLEAR_ANIMATION_MS}ms ease-out`
                        : `transform ${FALL_ANIMATION_MS}ms ease-out`,
                      opacity: tile.clearing ? 0 : 1,
                    }}
                    onClick={() => handleTileClick(tile.id)}
                  >
                    {tile.type && (
                      <img
                        src={HEART_TYPE_TO_IMAGE[tile.type]}
                        alt={tile.type}
                        className="heart-image"
                      />
                    )}
                  </div>
                );
              })}
          </div>
        </div>
      </div>

      {showWinModal && (
        <MetalPopup
          title="Bravo, ljubavi! Sakupila si sva srca koja sam ti pripremio."
          icon={MetalIcons.heartFilled}
          primaryAction={{
            label: 'Nastavi',
            onClick: onComplete,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '24px', fontWeight: 600 }}>
            <MetalIcon src={MetalIcons.heartFilled} size={28} alt="Heart" />
            <span>+10</span>
          </div>
        </MetalPopup>
      )}

      {showLoseModal && (
        <MetalPopup
          title="Nedostaje još malo ljubavi… Pokušaj opet, Lanči."
          icon={MetalIcons.heartEmpty}
          primaryAction={{
            label: 'Pokušaj ponovo',
            onClick: handleRetry,
          }}
        />
      )}
    </div>
  );
};

export default CandyHeartsGame;
