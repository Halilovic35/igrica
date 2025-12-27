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
import '../styles/DartGame.css';

interface DartGameProps {
  onComplete: () => void;
}

interface DartThrow {
  x: number;
  y: number;
  score: number;
  multiplier: number; // 1 = single, 2 = double, 3 = triple
  sector: number; // 1-20, 25 for outer bull, 50 for inner bull, 0 for miss
  player: 'player' | 'bot';
  turnIndex: number; // Which throw in the current turn (0-2)
  angle?: number; // Rotation angle for dart sprite
}

interface Turn {
  throws: DartThrow[];
  totalScore: number;
  player: 'player' | 'bot';
  bust: boolean;
}

// Dart board constants
const BOARD_SIZE = 500; // Size of the dart board in pixels
const BOARD_CENTER = BOARD_SIZE / 2;
const BOARD_RADIUS_PX = BOARD_SIZE / 2; // Board radius in pixels

// Standard dart board dimensions (in mm)
const BOARD_RADIUS_MM = 170; // Total board radius in mm
const INNER_BULL_RADIUS_MM = 12.7; // Inner bull (50 points) radius in mm
const OUTER_BULL_RADIUS_MM = 31.8; // Outer bull (25 points) radius in mm
const TRIPLE_RING_INNER_MM = 99; // Triple ring inner radius in mm
const TRIPLE_RING_OUTER_MM = 107; // Triple ring outer radius in mm
const DOUBLE_RING_INNER_MM = 162; // Double ring inner radius in mm
const DOUBLE_RING_OUTER_MM = 170; // Double ring outer radius in mm

// Scale factor: convert mm to pixels (based on board radius)
const SCALE_MM_TO_PX = BOARD_RADIUS_PX / BOARD_RADIUS_MM;

// Convert mm to pixels
const INNER_BULL_RADIUS = INNER_BULL_RADIUS_MM * SCALE_MM_TO_PX;
const OUTER_BULL_RADIUS = OUTER_BULL_RADIUS_MM * SCALE_MM_TO_PX;
const TRIPLE_RING_INNER = TRIPLE_RING_INNER_MM * SCALE_MM_TO_PX;
const TRIPLE_RING_OUTER = TRIPLE_RING_OUTER_MM * SCALE_MM_TO_PX;
const DOUBLE_RING_INNER = DOUBLE_RING_INNER_MM * SCALE_MM_TO_PX;
const DOUBLE_RING_OUTER = DOUBLE_RING_OUTER_MM * SCALE_MM_TO_PX;

// Dart board sector order (clockwise from top, starting at 12 o'clock)
const SECTOR_ORDER = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5];

const STARTING_SCORE = 501;
const DARTS_PER_TURN = 3;

// Dart asset paths
const DARTBOARD_IMAGE = '/assets/darts/dartboard_wires_dark.png';
const DARTBOARD_NUMBERS = '/assets/darts/dartboard_numbers_only.png';
const DART_SPRITES = {
  player: {
    red: '/assets/darts/dart_side_gold_red.png',
    blue: '/assets/darts/dart_side_gold_blue.png',
    green: '/assets/darts/dart_side_gold_green.png',
    white: '/assets/darts/dart_side_gold_white.png',
    black: '/assets/darts/dart_side_gold_black.png',
  },
  bot: {
    red: '/assets/darts/dart_side_silver_red.png',
    blue: '/assets/darts/dart_side_silver_blue.png',
    green: '/assets/darts/dart_side_silver_green.png',
    white: '/assets/darts/dart_side_silver_white.png',
    black: '/assets/darts/dart_side_silver_black.png',
  },
};

const DartGame: React.FC<DartGameProps> = ({ onComplete }) => {
  const navigate = useNavigate();
  const boardRef = useRef<HTMLDivElement>(null);
  const [playerScore, setPlayerScore] = useState(STARTING_SCORE);
  const [botScore, setBotScore] = useState(STARTING_SCORE);
  
  // Keep refs in sync with state
  useEffect(() => {
    playerScoreRef.current = playerScore;
  }, [playerScore]);
  
  useEffect(() => {
    botScoreRef.current = botScore;
  }, [botScore]);
  const [currentPlayer, setCurrentPlayer] = useState<'player' | 'bot'>('player');
  const [currentTurn, setCurrentTurn] = useState<DartThrow[]>([]);
  const [allThrows, setAllThrows] = useState<DartThrow[]>([]);
  const [turnHistory, setTurnHistory] = useState<Turn[]>([]);
  const [showWinModal, setShowWinModal] = useState(false);
  const [showLoseModal, setShowLoseModal] = useState(false);
  const [hearts, setHearts] = useState(0);
  const [showTopBar, setShowTopBar] = useState(false);
  const [heartsAnimating, setHeartsAnimating] = useState(false);
  const [animatedHeartsCount, setAnimatedHeartsCount] = useState(0);
  const [isThrowing, setIsThrowing] = useState(false);
  const [message, setMessage] = useState<string>('');
  const [throwingDart, setThrowingDart] = useState<{ x: number; y: number; player: 'player' | 'bot' } | null>(null);
  const [power, setPower] = useState(0);
  const [isCharging, setIsCharging] = useState(false);
  const [aimPosition, setAimPosition] = useState<{ x: number; y: number } | null>(null);
  const powerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const powerRef = useRef(0);
  const powerDirectionRef = useRef(1); // 1 = going up, -1 = going down
  const botTurnActiveRef = useRef(false); // Track if bot turn is currently active
  const playerScoreRef = useRef(STARTING_SCORE); // Track current player score
  const botScoreRef = useRef(STARTING_SCORE); // Track current bot score
  const { fetchUser } = useAuth();

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

  // Calculate score from click position
  // Reference: https://www.101computing.net/darts-scoring-algorithm/
  const calculateScore = useCallback((x: number, y: number): { score: number; multiplier: number; sector: number } => {
    const centerX = BOARD_CENTER;
    const centerY = BOARD_CENTER;
    const dx = x - centerX;
    const dy = y - centerY;
    const distance = Math.hypot(dx, dy);

    // Check for bullseye (inner bull = 50 points)
    if (distance <= INNER_BULL_RADIUS) {
      return { score: 50, multiplier: 1, sector: 50 };
    }
    // Outer bull (25 points)
    if (distance <= OUTER_BULL_RADIUS) {
      return { score: 25, multiplier: 1, sector: 25 };
    }

    // Check if outside board
    if (distance > DOUBLE_RING_OUTER) {
      return { score: 0, multiplier: 1, sector: 0 };
    }

    // Calculate angle: atan2(dy, dx) gives angle from positive x-axis
    // We need to rotate so that 0° is at top (12 o'clock position)
    // Standard formula: adjusted_angle = (atan2(dy, dx) + π/2) % (2π)
    // Note: In screen coordinates, y increases downward, so dy is negative for points above center
    // atan2 correctly handles this - negative dy gives negative angle
    const rawAngle = Math.atan2(dy, dx); // Standard atan2
    const adjustedAngle = (rawAngle + Math.PI / 2 + Math.PI * 2) % (Math.PI * 2); // Rotate to start at top, normalize to [0, 2π)

    // Each sector spans 18° (π/10 radians)
    // Sector index (0-19) corresponds to SECTOR_ORDER array
    const sectorIndexRaw = adjustedAngle / (Math.PI / 10); // Divide by 18° in radians
    const sectorIndex = Math.floor(sectorIndexRaw) % 20; // Ensure 0-19 range
    const sector = SECTOR_ORDER[sectorIndex];

    // Determine multiplier based on distance from center
    // Rings are checked from outside to inside: double ring is outermost, then triple ring
    let multiplier = 1;
    if (distance >= DOUBLE_RING_INNER && distance <= DOUBLE_RING_OUTER) {
      multiplier = 2; // Double ring (outermost scoring ring)
    } else if (distance >= TRIPLE_RING_INNER && distance <= TRIPLE_RING_OUTER) {
      multiplier = 3; // Triple ring (inner scoring ring)
    }
    // If distance < TRIPLE_RING_INNER or between TRIPLE_RING_OUTER and DOUBLE_RING_INNER, it's a single

    const score = sector * multiplier;
    return { score, multiplier, sector };
  }, []);

  // Check if can finish (double-out rule)
  const canFinish = useCallback((remainingScore: number, dartScore: number, multiplier: number, sector: number): boolean => {
    const newScore = remainingScore - dartScore;
    
    if (newScore !== 0) return false;
    
    // Must finish on double or inner bull (50)
    return multiplier === 2 || sector === 50;
  }, []);

  const handleWin = async () => {
    setShowWinModal(true);
    setShowTopBar(true);
    
    try {
      await api.post('/levels/complete', { levelCode: 'level_3_dart' });
      await fetchUser();
      
      // Animate hearts
      setHeartsAnimating(true);
      const heartsToAnimate = 10;
      for (let i = 0; i <= heartsToAnimate; i++) {
        setTimeout(() => {
          setAnimatedHeartsCount(i);
          if (i === heartsToAnimate) {
            setHeartsAnimating(false);
            setHearts(prev => prev + heartsToAnimate);
          }
        }, i * 50);
      }

      // Animate hearts to top bar
      animateHeartsToTopBar(window.innerWidth / 2, window.innerHeight / 2, heartsToAnimate);
    } catch (error) {
      console.error('Failed to complete level:', error);
    }
  };

  const handleLose = () => {
    setShowLoseModal(true);
  };

  // End current turn
  const endTurn = useCallback((bust: boolean) => {
    // Make sure bot turn is marked as inactive
    if (currentPlayer === 'bot') {
      botTurnActiveRef.current = false;
    }
    
    // Make sure we're not throwing when ending turn
    setIsThrowing(false);
    
    const turnTotal = currentTurn.reduce((sum, dart) => sum + dart.score, 0);
    const turn: Turn = {
      throws: [...currentTurn],
      totalScore: bust ? 0 : turnTotal,
      player: currentPlayer,
      bust,
    };

    setTurnHistory(prev => [...prev, turn]);

    // If bust, revert score
    if (bust && currentPlayer === 'player') {
      const revertedScore = playerScore + turnTotal;
      setPlayerScore(revertedScore);
    } else if (bust && currentPlayer === 'bot') {
      const revertedScore = botScore + turnTotal;
      setBotScore(revertedScore);
    }

    const previousPlayer = currentPlayer;
    setCurrentTurn([]);
    setMessage('');

    // Switch player
    if (previousPlayer === 'player') {
      setTimeout(() => {
        console.log('End turn: Switching to bot, current botScore:', botScore);
        botTurnActiveRef.current = false; // Ensure bot turn is not active
        setIsThrowing(false); // Make sure throwing is false before bot starts
        setCurrentTurn([]); // Clear current turn
        setAllThrows([]); // Clear all darts from board
        setCurrentPlayer('bot');
        // botTurn will be called automatically by useEffect
      }, 1500);
    } else {
      // Bot's turn ended - switch to player
      setTimeout(() => {
        console.log('End turn: Bot finished, switching to player');
        botTurnActiveRef.current = false; // Ensure bot turn is not active
        setIsThrowing(false);
        setCurrentTurn([]);
        setAllThrows([]); // Clear all darts from board
        setCurrentPlayer('player');
      }, 1500);
    }
  }, [currentTurn, currentPlayer, playerScore, botScore]);

  // Bot's turn function - defined early so it can be used in useEffect
  const botTurn = useCallback(() => {
    console.log('botTurn called, botScore:', botScore, 'isThrowing:', isThrowing, 'currentPlayer:', currentPlayer);
    
    if (botScore === 0) {
      console.log('Bot turn: botScore is 0, returning');
      return;
    }
    
    // Double check we're not already throwing
    if (isThrowing) {
      console.log('Bot turn: Already throwing, skipping...');
      return;
    }
    
    // Double check it's still bot's turn
    if (currentPlayer !== 'bot') {
      console.log('Bot turn: Not bot\'s turn anymore, returning');
      return;
    }
    
    // Mark bot turn as active
    botTurnActiveRef.current = true;

    console.log('Bot turn: Starting bot turn');
    setIsThrowing(true);
    setCurrentTurn([]);

    const botSkill = 0.65; // 0 = random, 1 = perfect
    let currentBotScore = botScore;
    const botThrows: DartThrow[] = [];

    const throwDart = (index: number) => {
      // Check if bot turn is still active
      if (!botTurnActiveRef.current) {
        console.log('Bot turn: Bot turn no longer active, stopping');
        setIsThrowing(false);
        setCurrentTurn([]);
        return;
      }
      
      // Check if we should stop (completed all darts or won)
      // Use both index check and botThrows.length check for safety
      if (index >= DARTS_PER_TURN || botThrows.length >= DARTS_PER_TURN || currentBotScore === 0) {
        console.log('Bot turn: Ending turn, index:', index, 'throws:', botThrows.length);
        botTurnActiveRef.current = false;
        setTimeout(() => {
          setIsThrowing(false);
          setCurrentTurn([]);
          endTurn(false);
        }, 1000);
        return;
      }

      // Wait before throwing (longer delay between darts)
      setTimeout(() => {
        // Bot AI: Try to finish if close, otherwise aim for high scores
        let targetX = BOARD_CENTER;
        let targetY = BOARD_CENTER;
        let targetSector = 20;
        let targetMultiplier = 1;

        if (currentBotScore <= 40 && currentBotScore % 2 === 0) {
          // Try to finish on double
          const finishScore = currentBotScore / 2;
          if (finishScore <= 20) {
            targetSector = finishScore;
            targetMultiplier = 2;
            const sectorIndex = SECTOR_ORDER.indexOf(finishScore);
            // Calculate angle: sector 0 is at top (12 o'clock), each sector is 18° (π/10)
            // For targeting, we calculate the angle from top, then convert to atan2 coordinate system
            // Angle from top: sectorIndex * π/10
            // To convert to atan2 system (where 0 is right, increasing counterclockwise):
            // We need: atan2(angle_from_top) = angle_from_top - π/2
            // So: cos(angle_from_top - π/2), sin(angle_from_top - π/2)
            // But sin(θ - π/2) = -cos(θ) and cos(θ - π/2) = sin(θ)
            const angleFromTop = (sectorIndex * Math.PI / 10); // Angle from top in radians
            const radius = (DOUBLE_RING_INNER + DOUBLE_RING_OUTER) / 2;
            targetX = BOARD_CENTER + Math.sin(angleFromTop) * radius;
            targetY = BOARD_CENTER - Math.cos(angleFromTop) * radius; // Negate cos because y increases downward
          } else if (currentBotScore === 50) {
            // Try for bullseye
            targetX = BOARD_CENTER;
            targetY = BOARD_CENTER;
            targetSector = 50;
            targetMultiplier = 1;
          }
        } else {
          // Aim for high scores (triple 20, triple 19, etc.)
          const highSectors = [20, 19, 18, 17, 16];
          targetSector = highSectors[Math.floor(Math.random() * highSectors.length)];
          const sectorIndex = SECTOR_ORDER.indexOf(targetSector);
          // Calculate angle: sector 0 is at top (12 o'clock), each sector is 18° (π/10)
          // Same conversion as above
          const angleFromTop = (sectorIndex * Math.PI / 10); // Angle from top in radians
          const radius = (TRIPLE_RING_INNER + TRIPLE_RING_OUTER) / 2;
          targetX = BOARD_CENTER + Math.sin(angleFromTop) * radius;
          targetY = BOARD_CENTER - Math.cos(angleFromTop) * radius; // Negate cos because y increases downward
          targetMultiplier = 3;
        }

        // Add randomness based on skill
        const randomOffset = (1 - botSkill) * 60;
        const actualX = targetX + (Math.random() - 0.5) * randomOffset;
        const actualY = targetY + (Math.random() - 0.5) * randomOffset;

        // Show throwing animation
        setThrowingDart({ x: actualX, y: actualY, player: 'bot' });

        // Wait for animation, then process the throw
        setTimeout(() => {
          const { score, multiplier, sector } = calculateScore(actualX, actualY);
          console.log('Bot throw:', { actualX, actualY, score, multiplier, sector, currentBotScore });
          const angle = Math.atan2(actualY - BOARD_CENTER, actualX - BOARD_CENTER) * (180 / Math.PI);
          
          const newThrow: DartThrow = {
            x: actualX,
            y: actualY,
            score,
            multiplier,
            sector,
            player: 'bot',
            turnIndex: index,
            angle,
          };

          setThrowingDart(null);
          botThrows.push(newThrow);
          setCurrentTurn([...botThrows]);
          setAllThrows(prev => [...prev, newThrow]);

          const newScore = currentBotScore - score;
          console.log('Bot score update:', { oldScore: currentBotScore, throwScore: score, newScore, throwIndex: index });

          // Check bust
          if (newScore < 0 || (newScore === 0 && !canFinish(currentBotScore, score, multiplier, sector))) {
            botTurnActiveRef.current = false;
            setTimeout(() => {
              // Revert score: add back all throws from this turn
              setBotScore(prev => prev + botThrows.reduce((sum, d) => sum + d.score, 0));
              setIsThrowing(false);
              setCurrentTurn([]);
              endTurn(true);
            }, 1500);
            return;
          }

          currentBotScore = newScore;
          // Update bot score
          setBotScore(newScore);
          botScoreRef.current = newScore;

          if (currentBotScore === 0) {
            botTurnActiveRef.current = false;
            setTimeout(() => {
              setIsThrowing(false);
              setCurrentTurn([]);
              handleLose();
            }, 1500);
            return;
          }

          // Wait before next dart (longer pause between throws)
          setTimeout(() => {
            // Check if bot turn is still active and we haven't thrown all darts yet
            const nextIndex = index + 1;
            if (botTurnActiveRef.current && nextIndex < DARTS_PER_TURN && botThrows.length < DARTS_PER_TURN && currentBotScore > 0) {
              throwDart(nextIndex);
            } else {
              // End turn - either we've thrown all darts or conditions changed
              console.log('Bot turn: Stopping, nextIndex:', nextIndex, 'throws:', botThrows.length, 'active:', botTurnActiveRef.current);
              botTurnActiveRef.current = false;
              setIsThrowing(false);
              setCurrentTurn([]);
              if (botThrows.length >= DARTS_PER_TURN || nextIndex >= DARTS_PER_TURN) {
                endTurn(false);
              }
            }
          }, 1500);
        }, 500);
      }, index === 0 ? 1000 : 2000); // First dart after 1s, subsequent darts after 2s
    };

    throwDart(0);
  }, [botScore, calculateScore, canFinish, endTurn, handleLose, isThrowing, currentPlayer]);

  // Auto-start bot turn when it's bot's turn
  useEffect(() => {
    // Only start bot turn if it's bot's turn, not throwing, has score, and no darts in current turn
    if (currentPlayer === 'bot' && !isThrowing && botScore > 0 && currentTurn.length === 0) {
      console.log('useEffect: Auto-starting bot turn');
      const timer = setTimeout(() => {
        // Double check it's still bot's turn before starting (important!)
        if (currentPlayer === 'bot' && !isThrowing && botScore > 0 && currentTurn.length === 0) {
          botTurn();
        }
      }, 800);
      return () => {
        clearTimeout(timer);
      };
    }
  }, [currentPlayer, isThrowing, botScore, currentTurn.length, botTurn]);

  // Clear darts after each turn
  useEffect(() => {
    if (currentTurn.length === 0 && currentPlayer === 'player' && !isThrowing) {
      // Clear all darts when starting a new turn
      setAllThrows([]);
    }
  }, [currentTurn.length, currentPlayer, isThrowing]);

  // Cleanup power interval and bot turn on unmount or player change
  useEffect(() => {
    // Reset power meter when player changes
    if (powerIntervalRef.current) {
      clearInterval(powerIntervalRef.current);
      powerIntervalRef.current = null;
    }
    setIsCharging(false);
    setAimPosition(null);
    setPower(0);
    powerRef.current = 0;
    powerDirectionRef.current = 1;
    
    // Stop bot turn if player changes
    if (currentPlayer !== 'bot') {
      botTurnActiveRef.current = false;
      setIsThrowing(false);
    }
    
    return () => {
      if (powerIntervalRef.current) {
        clearInterval(powerIntervalRef.current);
        powerIntervalRef.current = null;
      }
      // Cleanup bot turn when component unmounts
      botTurnActiveRef.current = false;
    };
  }, [currentPlayer]);

  // Get dart sprite based on player and score
  const getDartSprite = (player: 'player' | 'bot', score: number): string => {
    const sprites = DART_SPRITES[player];
    if (score >= 40) return sprites.red;
    if (score >= 20) return sprites.blue;
    if (score >= 10) return sprites.green;
    if (score > 0) return sprites.white;
    return sprites.black;
  };

  // Start charging power on mouse down
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (currentPlayer !== 'player' || isThrowing || currentTurn.length >= DARTS_PER_TURN) return;

    const board = boardRef.current;
    if (!board) return;

    const rect = board.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setAimPosition({ x, y });
    setIsCharging(true);
    setPower(0);
    powerRef.current = 0;
    powerDirectionRef.current = 1; // Start going up

    // Charge power (cycles from 0 to 100 and back to 0)
    powerIntervalRef.current = setInterval(() => {
      setPower(prev => {
        let newPower = prev + (powerDirectionRef.current * 2); // Slower for better timing
        if (newPower >= 100) {
          newPower = 100;
          powerDirectionRef.current = -1; // Start going down
        } else if (newPower <= 0) {
          newPower = 0;
          powerDirectionRef.current = 1; // Start going up
        }
        powerRef.current = newPower;
        return newPower;
      });
    }, 30); // Slower interval for better timing
  };

  // Throw dart on mouse up
  const handleMouseUp = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isCharging || !aimPosition) return;

    // Stop charging first
    if (powerIntervalRef.current) {
      clearInterval(powerIntervalRef.current);
      powerIntervalRef.current = null;
    }

    // Get current power value from ref (most up-to-date)
    const currentPower = powerRef.current;
    
    setIsCharging(false);
    setIsThrowing(true);
    setMessage('');

    // Calculate throw position based on power
    // 100% = exact position, less than 100% = lower (below target)
    // 0% or very low = miss the board completely
    let throwX = aimPosition.x;
    let throwY = aimPosition.y;
    
    if (currentPower <= 5) {
      // Very low power (0-5%) = miss the board completely
      // Throw way off the board
      throwX = aimPosition.x + (Math.random() - 0.5) * BOARD_SIZE;
      throwY = aimPosition.y + BOARD_SIZE * 0.8; // Way below
    } else if (currentPower < 100) {
      // Less than 100% = throw below target
      // The lower the power, the further below it goes
      const powerFactor = currentPower / 100;
      const offsetY = (1 - powerFactor) * 150; // Max 150px below at low power
      throwY = aimPosition.y + offsetY;
      
      // Add some horizontal randomness based on power
      const randomness = (1 - powerFactor) * 20;
      throwX = aimPosition.x + (Math.random() - 0.5) * randomness;
    }
    // At exactly 100%, throwX and throwY stay exactly at aimPosition (no modification)
    
    const randomX = throwX;
    const randomY = throwY;

    // Show throwing animation
    setThrowingDart({ x: randomX, y: randomY, player: 'player' });

    setTimeout(() => {
      const { score, multiplier, sector } = calculateScore(randomX, randomY);
      const angle = Math.atan2(randomY - BOARD_CENTER, randomX - BOARD_CENTER) * (180 / Math.PI);
      
      const newThrow: DartThrow = {
        x: randomX,
        y: randomY,
        score,
        multiplier,
        sector,
        player: 'player',
        turnIndex: currentTurn.length,
        angle,
      };

      setThrowingDart(null);
      setAimPosition(null);
      setPower(0);

      // Update turn first
      const updatedTurn = [...currentTurn, newThrow];
      setCurrentTurn(updatedTurn);
      setAllThrows(prev => [...prev, newThrow]);

      // Get current score from ref (always up-to-date)
      const currentScore = playerScoreRef.current;
      const newScore = currentScore - score;
      console.log('Player score update:', { currentScore, throwScore: score, newScore, sector, multiplier, turnIndex: updatedTurn.length - 1 });
      
      // Check if this would bust
      if (newScore < 0) {
        setMessage('Bust! Previše bodova.');
        setTimeout(() => {
          setIsThrowing(false);
          endTurn(true);
        }, 1500);
        return;
      }

      // Check if finishing
      if (newScore === 0) {
        if (!canFinish(currentScore, score, multiplier, sector)) {
          setMessage('Bust! Moraš završiti na double ili bullseye.');
          setTimeout(() => {
            setIsThrowing(false);
            endTurn(true);
          }, 1500);
          return;
        }
        // Valid finish - player won!
        setPlayerScore(newScore);
        playerScoreRef.current = newScore;
        setTimeout(() => {
          setIsThrowing(false);
          handleWin();
        }, 1000);
        return;
      }

      // Normal throw - update score
      setPlayerScore(newScore);
      playerScoreRef.current = newScore;
      
      setTimeout(() => {
        setIsThrowing(false);
        
        if (updatedTurn.length >= DARTS_PER_TURN) {
          // End of turn
          endTurn(false);
        }
      }, 500);
    }, 300);
  };

  // Cancel charging if mouse leaves board
  const handleMouseLeave = () => {
    if (powerIntervalRef.current) {
      clearInterval(powerIntervalRef.current);
      powerIntervalRef.current = null;
    }
    setIsCharging(false);
    setAimPosition(null);
    setPower(0);
    powerRef.current = 0;
    powerDirectionRef.current = 1;
  };


  const handleRetry = () => {
    setShowLoseModal(false);
    setPlayerScore(STARTING_SCORE);
    setBotScore(STARTING_SCORE);
    playerScoreRef.current = STARTING_SCORE;
    botScoreRef.current = STARTING_SCORE;
    setCurrentPlayer('player');
    setCurrentTurn([]);
    setAllThrows([]);
    setTurnHistory([]);
    setIsThrowing(false);
    setMessage('');
    setThrowingDart(null);
  };

  const handleBack = () => {
    navigate('/love-map');
  };

  return (
    <div className="game-page">
      {/* Top Bar */}
      {showTopBar && (
        <div className="game-top-bar">
          <MetalButton onClick={handleBack} variant="secondary" size="small">
            <MetalIcon icon={MetalIcons.arrowLeft} />
            Nazad
          </MetalButton>
          <div className="game-title">
            <MetalIcon icon={MetalIcons.heart} />
            <span>Strele ljubavi</span>
          </div>
          <div className="hearts-display">
            {heartsAnimating ? (
              <span className="hearts-count">{animatedHeartsCount}</span>
            ) : (
              <span className="hearts-count">{hearts}</span>
            )}
            <MetalIcon icon={MetalIcons.heart} />
          </div>
        </div>
      )}

      <div className="game-container">
        {/* Game Header */}
        <div className="dart-header">
          <MetalButton onClick={handleBack} variant="secondary" size="small">
            <MetalIcon icon={MetalIcons.arrowLeft} />
            Nazad
          </MetalButton>
          <div className="dart-title">
            <MetalIcon icon={MetalIcons.heart} />
            <span>Strele ljubavi</span>
          </div>
          <div className="dart-stats">
            <div className="stat">
              {currentPlayer === 'player' ? 'Tvoj potez' : 'Bot potez'}
            </div>
            <div className="stat">
              Strelica: {currentTurn.length + 1} / {DARTS_PER_TURN}
            </div>
          </div>
        </div>

        {/* Score Display */}
        <div className="dart-scores">
          <div className={`score-panel ${currentPlayer === 'player' ? 'active' : ''}`}>
            <h3>Ti</h3>
            <div className="score-value">{playerScore}</div>
            <div className="score-target">/ {STARTING_SCORE}</div>
            {currentTurn.length > 0 && (
              <div className="turn-score">
                Ovaj potez: {currentTurn.reduce((sum, d) => sum + d.score, 0)}
              </div>
            )}
          </div>
          <div className="vs-divider">VS</div>
          <div className={`score-panel ${currentPlayer === 'bot' ? 'active' : ''}`}>
            <h3>Bot</h3>
            <div className="score-value">{botScore}</div>
            <div className="score-target">/ {STARTING_SCORE}</div>
            {currentTurn.length > 0 && currentPlayer === 'bot' && (
              <div className="turn-score">
                Ovaj potez: {currentTurn.reduce((sum, d) => sum + d.score, 0)}
              </div>
            )}
          </div>
        </div>

        {/* Message Display */}
        {message && (
          <div className="dart-message">
            {message}
          </div>
        )}

        {/* Game Area */}
        <div className="dart-game-area">
          <div className="dart-board-container">
            <div
              ref={boardRef}
              className="dart-board-wrapper"
              onMouseDown={handleMouseDown}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseLeave}
              style={{
                cursor: currentPlayer === 'player' && !isThrowing && currentTurn.length < DARTS_PER_TURN && !isCharging ? 'crosshair' : 'default',
                position: 'relative',
                width: BOARD_SIZE,
                height: BOARD_SIZE,
              }}
            >
              {/* Dart board image */}
              <img
                src={DARTBOARD_IMAGE}
                alt="Dart Board"
                className="dart-board-image"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                }}
              />
              
              {/* Numbers overlay */}
              <img
                src={DARTBOARD_NUMBERS}
                alt="Dart Board Numbers"
                className="dart-board-numbers"
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                  pointerEvents: 'none',
                }}
              />

              {/* Throwing dart animation */}
              {throwingDart && (
                <img
                  src={getDartSprite(throwingDart.player, 20)}
                  alt="Throwing dart"
                  className="dart-throwing"
                  style={{
                    position: 'absolute',
                    left: throwingDart.x - 15,
                    top: throwingDart.y - 15,
                    width: 30,
                    height: 30,
                    pointerEvents: 'none',
                    animation: 'dartThrow 0.3s ease-out',
                  }}
                />
              )}

              {/* All thrown darts */}
              {allThrows.map((dart, index) => (
                <img
                  key={index}
                  src={getDartSprite(dart.player, dart.score)}
                  alt={`Dart ${index + 1}`}
                  className={`dart-stuck ${dart.player}`}
                  style={{
                    position: 'absolute',
                    left: dart.x - 12,
                    top: dart.y - 12,
                    width: 24,
                    height: 24,
                    pointerEvents: 'none',
                    transform: dart.angle !== undefined ? `rotate(${dart.angle}deg)` : 'none',
                    zIndex: 10,
                  }}
                />
              ))}

              {/* Power meter */}
              {isCharging && aimPosition && (
                <div
                  className="power-meter"
                  style={{
                    position: 'absolute',
                    left: aimPosition.x - 50,
                    top: aimPosition.y - 80,
                    width: 100,
                    height: 20,
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    border: '2px solid #fff',
                    borderRadius: '10px',
                    zIndex: 100,
                    pointerEvents: 'none',
                  }}
                >
                  <div
                    style={{
                      width: `${power}%`,
                      height: '100%',
                      backgroundColor: power === 100 ? '#00ff00' : power > 50 ? '#ffff00' : '#ff0000',
                      borderRadius: '8px',
                      transition: 'width 0.05s linear',
                    }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      top: '100%',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      color: power === 100 ? '#00ff00' : '#fff',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      marginTop: '4px',
                      textShadow: '0 0 4px rgba(0,0,0,0.8)',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {Math.round(power)}% {power === 100 ? '🎯' : ''}
                  </div>
                </div>
              )}

              {/* Aim indicator */}
              {aimPosition && !isThrowing && (
                <div
                  className="aim-indicator"
                  style={{
                    position: 'absolute',
                    left: aimPosition.x - 5,
                    top: aimPosition.y - 5,
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    border: '2px solid rgba(255, 255, 255, 0.9)',
                    backgroundColor: 'rgba(255, 255, 255, 0.4)',
                    pointerEvents: 'none',
                    zIndex: 50,
                    boxShadow: '0 0 10px rgba(255, 255, 255, 0.6)',
                  }}
                />
              )}
            </div>
          </div>
          
          {/* Instructions */}
          <div className="dart-instructions">
            <h3>Kako igrati?</h3>
            <p><strong>Cilj:</strong> Smanji svoj rezultat sa {STARTING_SCORE} na tačno 0!</p>
            <p><strong>Pravila:</strong></p>
            <ol>
              <li><strong>Drži klik</strong> na board - power meter ide od 0% do 100% i natrag do 0% (ciklično)</li>
              <li><strong>Pusti klik na 100%</strong> = strelica ide točno na ciljnu poziciju 🎯</li>
              <li><strong>Pusti klik prije 100%</strong> = strelica ide niže (manje power = niže bacanje)</li>
              <li><strong>Pusti klik na 0%</strong> = promaš! Strelica neće pogoditi board</li>
              <li>Svaki igrač baca {DARTS_PER_TURN} strelice po potezu</li>
              <li>Bodovi se oduzimaju od {STARTING_SCORE}</li>
              <li><strong>Moraš završiti na double ili bullseye (50)!</strong></li>
              <li>Ako odeš ispod 0 ili ne završiš na double, to je "bust" - potez se ne računa</li>
              <li>Strelice se brišu sa table nakon svakog poteza</li>
            </ol>
            <div className="score-zones">
              <p><strong>Bodovanje:</strong></p>
              <ul>
                <li>Single: Vrijednost sektora (1-20)</li>
                <li>Double (zeleni prsten): 2x vrijednost</li>
                <li>Triple (zeleni prsten): 3x vrijednost</li>
                <li>Outer Bull (zeleni krug): 25 bodova</li>
                <li>Inner Bull (crveni centar): 50 bodova</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Turn Indicator */}
        {isThrowing && !throwingDart && (
          <div className="turn-indicator">
            {currentPlayer === 'player' ? 'Bacaš strelicu...' : 'Bot baca strelicu...'}
          </div>
        )}
      </div>

      {/* Win Modal */}
      {showWinModal && (
        <MetalPopup
          title="Pobijedio si! 🎉"
          icon={MetalIcons.heart}
          primaryAction={{
            label: 'Nastavi',
            onClick: () => {
              setShowWinModal(false);
              onComplete();
            },
          }}
        >
          <p>Završio si sa tačno 0 bodova i pobijedio bota!</p>
          <p>Nagrada: 10 srcadi</p>
        </MetalPopup>
      )}

      {/* Lose Modal */}
      {showLoseModal && (
        <MetalPopup
          title="Nedostaje još malo ljubavi… Pokušaj opet, Lanči."
          icon={MetalIcons.heartEmpty}
          primaryAction={{
            label: 'Pokušaj ponovo',
            onClick: handleRetry,
          }}
        >
          <p>Bot je završio prije tebe.</p>
        </MetalPopup>
      )}
    </div>
  );
};

export default DartGame;
