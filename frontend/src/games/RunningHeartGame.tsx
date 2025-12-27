import { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import { loadAvatarImage, drawAvatar } from '../utils/avatarRenderer';
import { animateHeartsToTopBar } from '../utils/heartsAnimation';
import { useAuth } from '../contexts/AuthContext';
import MetalIcon, { MetalIcons } from '../components/metal-ui/MetalIcon';
import '../styles/GamePage.css';
import '../styles/RunnerGame.css';

interface RunningHeartGameProps {
  onComplete: () => void;
}

const RunningHeartGame: React.FC<RunningHeartGameProps> = ({ onComplete }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [playerY, setPlayerY] = useState(300);
  const [obstacles, setObstacles] = useState<Array<{ x: number; y: number; width: number; height: number }>>([]);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [showCompletion, setShowCompletion] = useState(false);
  const [hearts, setHearts] = useState(0);
  const [showTopBar, setShowTopBar] = useState(false);
  const [heartsAnimating, setHeartsAnimating] = useState(false);
  const [animatedHeartsCount, setAnimatedHeartsCount] = useState(0);
  const gameRef = useRef<any>(null);
  const obstacleTimerRef = useRef<any>(null);
  const avatarLoaded = useRef(false);

  const PLAYER_SIZE = 40;
  const SPEED = 5;
  const GRAVITY = 0.8;
  const JUMP_STRENGTH = -15;
  const TARGET_SCORE = 10;
  const OBSTACLE_SPAWN_RATE = 2000;

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
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Load avatar image once
    if (!avatarLoaded.current) {
      loadAvatarImage().then(() => {
        avatarLoaded.current = true;
      });
    }

    let currentPlayerY = playerY;
    let currentVelocity = 0;
    let currentObstacles = obstacles;
    let gameRunning = true;

    const handleJump = (e: KeyboardEvent | MouseEvent) => {
      if (e instanceof KeyboardEvent && e.key !== ' ' && e.key !== 'ArrowUp' && e.key !== 'w' && e.key !== 'W') {
        return;
      }
      if (currentPlayerY >= 400 - PLAYER_SIZE) {
        currentVelocity = JUMP_STRENGTH;
      }
    };

    window.addEventListener('keydown', handleJump);
    canvas.addEventListener('click', handleJump);

    // Spawn obstacles
    obstacleTimerRef.current = setInterval(() => {
      if (gameRunning && !completed) {
        currentObstacles = [
          ...currentObstacles,
          {
            x: 800,
            y: 400 - 60,
            width: 40,
            height: 60,
          },
        ];
        setObstacles(currentObstacles);
      }
    }, OBSTACLE_SPAWN_RATE);

    const gameLoop = () => {
      if (!gameRunning || completed) return;

      // Update player
      currentVelocity += GRAVITY;
      currentPlayerY = currentPlayerY + currentVelocity;
      if (currentPlayerY >= 400 - PLAYER_SIZE) {
        currentVelocity = 0;
        currentPlayerY = 400 - PLAYER_SIZE;
      }
      setPlayerY(currentPlayerY);

      // Update obstacles
      currentObstacles = currentObstacles.map(obs => ({ ...obs, x: obs.x - SPEED }));
      currentObstacles = currentObstacles.filter(obs => obs.x > -50);
      setObstacles(currentObstacles);

      // Draw
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw ground
      ctx.fillStyle = '#8B4513';
      ctx.fillRect(0, 400, 800, 200);

      // Draw obstacles
      ctx.fillStyle = '#666';
      currentObstacles.forEach(obs => {
        ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
      });

      // Draw player (avatar)
      drawAvatar(ctx, 100, currentPlayerY - PLAYER_SIZE / 2, PLAYER_SIZE, true);

      // Check collisions
      const playerRect = {
        x: 100 - PLAYER_SIZE / 2,
        y: currentPlayerY - PLAYER_SIZE,
        width: PLAYER_SIZE,
        height: PLAYER_SIZE,
      };

      currentObstacles.forEach(obs => {
        if (
          playerRect.x < obs.x + obs.width &&
          playerRect.x + playerRect.width > obs.x &&
          playerRect.y < obs.y + obs.height &&
          playerRect.y + playerRect.height > obs.y
        ) {
          gameRunning = false;
          setGameOver(true);
        }
      });

      // Check score (obstacles passed)
      const passed = currentObstacles.filter(obs => obs.x + obs.width < 100).length;
      if (passed >= TARGET_SCORE && !completed) {
        handleComplete();
      }
      setScore(passed);

      if (gameRunning) {
        gameRef.current = requestAnimationFrame(gameLoop);
      }
    };

    gameRef.current = requestAnimationFrame(gameLoop);

    return () => {
      window.removeEventListener('keydown', handleJump);
      canvas.removeEventListener('click', handleJump);
      if (gameRef.current) {
        cancelAnimationFrame(gameRef.current);
      }
      if (obstacleTimerRef.current) {
        clearInterval(obstacleTimerRef.current);
      }
    };
  }, [completed]);

  const handleComplete = async () => {
    setCompleted(true);
    try {
      const levelsResponse = await api.get('/levels');
      const level = levelsResponse.data.find((l: any) => l.code === 'level_3_running_heart');
      
      if (level) {
        // Complete level - backend will check if already completed and only award hearts once
        const completeResponse = await api.post('/levels/complete', { levelId: level.id, score });
        const heartsAwarded = completeResponse.data.heartsAwarded || 0;
        
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
      }
      
      setShowCompletion(true);
      setTimeout(() => {
        onComplete();
      }, 3000);
    } catch (error) {
      console.error('Failed to complete level:', error);
    }
  };

  const resetGame = () => {
    setPlayerY(300);
    setObstacles([]);
    setScore(0);
    setGameOver(false);
    setCompleted(false);
  };

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
        <h1>Running Heart 💓</h1>
        <div className="game-stats">
          <div className="stat">Pređeno: {score}/{TARGET_SCORE}</div>
        </div>
        <div className="game-instructions">
          <p>Space ili klik za skok!</p>
        </div>
      </div>

      <div className="runner-container">
        <canvas
          ref={canvasRef}
          width={800}
          height={600}
          className="runner-canvas"
        />
      </div>

      {gameOver && (
        <div className="completion-overlay">
          <div className="completion-message">
            <h2>Kraj igre!</h2>
            <p>Pokušaj ponovo, Lanči! 💖</p>
            <button onClick={resetGame} className="retry-button">
              Pokušaj ponovo
            </button>
          </div>
        </div>
      )}

      {showCompletion && (
        <div className="completion-overlay">
          <div className="completion-message">
            <h2>Moje srce više ne bježi – sada je tvoje, zauvijek. 😏❤️</h2>
            <p>+10 ❤️</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default RunningHeartGame;

