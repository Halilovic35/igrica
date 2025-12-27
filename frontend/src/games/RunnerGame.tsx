import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { CandyAssets, RunnerAssets } from '../assetsIndex';
import MetalButton from '../components/metal-ui/MetalButton';
import MetalIcon, { MetalIcons } from '../components/metal-ui/MetalIcon';
import MetalPopup from '../components/metal-ui/MetalPopup';
import { animateHeartsToTopBar } from '../utils/heartsAnimation';
import { useAuth } from '../contexts/AuthContext';
import '../styles/GamePage.css';
import '../styles/RunnerGame.css';

interface RunnerGameProps {
  onComplete: () => void;
}

interface Obstacle {
  id: string;
  x: number;
  y: number;
  type: 'obstacle' | 'heart';
  width: number;
  height: number;
}

const GAME_WIDTH = 800;
const GAME_HEIGHT = 400;
const PLAYER_WIDTH = 60;
const PLAYER_HEIGHT = 80;
const PLAYER_START_X = 100;
const PLAYER_START_Y = GAME_HEIGHT - PLAYER_HEIGHT - 50;
const GRAVITY = 0.8;
const JUMP_STRENGTH = -15;
const GROUND_Y = GAME_HEIGHT - 50;
const OBSTACLE_SPEED = 5;
const OBSTACLE_SPAWN_INTERVAL = 2000; // ms
const TARGET_HEARTS = 20;
const TARGET_DISTANCE = 2000; // pixels

const RunnerGame: React.FC<RunnerGameProps> = ({ onComplete }) => {
  const navigate = useNavigate();
  const gameLoopRef = useRef<number>();
  const [gameStarted, setGameStarted] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [playerY, setPlayerY] = useState(PLAYER_START_Y);
  const [playerVelocity, setPlayerVelocity] = useState(0);
  const [obstacles, setObstacles] = useState<Obstacle[]>([]);
  const [distance, setDistance] = useState(0);
  const [heartsCollected, setHeartsCollected] = useState(0);
  const [showWinModal, setShowWinModal] = useState(false);
  const [showLoseModal, setShowLoseModal] = useState(false);
  const [hearts, setHearts] = useState(0);
  const [showTopBar, setShowTopBar] = useState(false);
  const [heartsAnimating, setHeartsAnimating] = useState(false);
  const [animatedHeartsCount, setAnimatedHeartsCount] = useState(0);
  const [isJumping, setIsJumping] = useState(false);
  const lastObstacleSpawn = useRef(0);
  const obstacleIdCounter = useRef(0);
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

  // Handle keyboard input
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        e.preventDefault();
        if (gameStarted && !gameOver && !isJumping) {
          jump();
        } else if (!gameStarted) {
          startGame();
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [gameStarted, gameOver, isJumping]);

  // Game loop
  useEffect(() => {
    if (!gameStarted || gameOver) return;

    const gameLoop = () => {
      // Update player position
      setPlayerY(prev => {
        const newY = prev + playerVelocity;
        const groundY = GROUND_Y - PLAYER_HEIGHT;
        if (newY >= groundY) {
          setIsJumping(false);
          setPlayerVelocity(0);
          return groundY;
        }
        return newY;
      });

      // Update player velocity (gravity)
      setPlayerVelocity(prev => prev + GRAVITY);

      // Update obstacles
      setObstacles(prev => {
        const now = Date.now();
        const newObstacles = prev
          .map(obs => ({
            ...obs,
            x: obs.x - OBSTACLE_SPEED,
          }))
          .filter(obs => obs.x + obs.width > 0);

        // Spawn new obstacles
        if (now - lastObstacleSpawn.current > OBSTACLE_SPAWN_INTERVAL) {
          const shouldSpawnHeart = Math.random() < 0.3; // 30% chance for heart
          const obstacleY = shouldSpawnHeart 
            ? GROUND_Y - 40 - 30 // Heart floats above ground
            : GROUND_Y - 50; // Obstacle on ground

          newObstacles.push({
            id: `obs-${obstacleIdCounter.current++}`,
            x: GAME_WIDTH,
            y: obstacleY,
            type: shouldSpawnHeart ? 'heart' : 'obstacle',
            width: shouldSpawnHeart ? 30 : 40,
            height: shouldSpawnHeart ? 30 : 50,
          });
          lastObstacleSpawn.current = now;
        }

        return newObstacles;
      });

      // Update distance
      setDistance(prev => prev + OBSTACLE_SPEED);

      // Check collisions
      checkCollisions();

      // Check win condition
      if (heartsCollected >= TARGET_HEARTS || distance >= TARGET_DISTANCE) {
        handleWin();
        return;
      }

      gameLoopRef.current = requestAnimationFrame(gameLoop);
    };

    gameLoopRef.current = requestAnimationFrame(gameLoop);
    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
    };
  }, [gameStarted, gameOver, playerVelocity, heartsCollected, distance]);

  const jump = () => {
    if (playerY >= PLAYER_START_Y) {
      setIsJumping(true);
      setPlayerVelocity(JUMP_STRENGTH);
    }
  };

  const startGame = () => {
    setGameStarted(true);
    setGameOver(false);
    setPlayerY(PLAYER_START_Y);
    setPlayerVelocity(0);
    setObstacles([]);
    setDistance(0);
    setHeartsCollected(0);
    lastObstacleSpawn.current = Date.now();
    obstacleIdCounter.current = 0;
  };

  const checkCollisions = () => {
    const playerX = PLAYER_START_X;
    const playerRight = playerX + PLAYER_WIDTH;
    const playerBottom = playerY + PLAYER_HEIGHT;

    obstacles.forEach(obstacle => {
      const obstacleRight = obstacle.x + obstacle.width;
      const obstacleBottom = obstacle.y + obstacle.height;

      if (
        playerRight > obstacle.x &&
        playerX < obstacleRight &&
        playerBottom > obstacle.y &&
        playerY < obstacleBottom
      ) {
        if (obstacle.type === 'heart') {
          // Collect heart
          setObstacles(prev => prev.filter(obs => obs.id !== obstacle.id));
          setHeartsCollected(prev => prev + 1);
        } else {
          // Hit obstacle - game over
          setGameOver(true);
          handleLose();
        }
      }
    });
  };

  const handleWin = async () => {
    setGameOver(true);
    setShowWinModal(true);
    setShowTopBar(true);

    try {
      await api.post('/levels/complete', { levelCode: 'level_3_runner' });
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
      animateHeartsToTopBar(heartsToAnimate);
    } catch (error) {
      console.error('Failed to complete level:', error);
    }
  };

  const handleLose = () => {
    setShowLoseModal(true);
  };

  const handleRetry = () => {
    setShowLoseModal(false);
    startGame();
  };

  const handleBack = () => {
    navigate('/love-map');
  };

  // Get heart image
  const getHeartImage = () => {
    const heartImages = CandyAssets.hearts.filter(h => 
      h.includes('gem_heart') && !h.includes('outline')
    );
    return heartImages[Math.floor(Math.random() * heartImages.length)] || heartImages[0];
  };

  // Get obstacle image
  const getObstacleImage = () => {
    const obstacleImages = RunnerAssets.obstacles.filter(o => 
      o.includes('spikes') || o.includes('box')
    );
    return obstacleImages[0] || RunnerAssets.obstacles[0];
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
        <MetalButton
          variant="wide"
          iconLeftSrc={MetalIcons.arrowLeft}
          onClick={handleBack}
          className="back-button"
        >
          Nazad
        </MetalButton>
        <h1>
          Trčanje za srcadima <MetalIcon src={MetalIcons.heartFilled} size={32} alt="Heart" />
        </h1>
        <div className="game-stats">
          <div className="stat">
            Srcad: {heartsCollected} / {TARGET_HEARTS}
          </div>
          <div className="stat">
            Udaljenost: {Math.floor(distance)} / {TARGET_DISTANCE}
          </div>
        </div>
      </div>

      <div className="game-content-wrapper">
        {/* Instructions Panel - Left Side */}
        <div className="game-instructions">
          <h2>Kako igrati?</h2>
          <div className="instructions-content">
            <p>
              <strong>Cilj:</strong> Sakupi {TARGET_HEARTS} srcadi ili pređi {TARGET_DISTANCE} piksela!
            </p>
            <p>
              <strong>Kako:</strong>
            </p>
            <ol>
              <li>Pritisni SPACE ili strelicu GORE da skočiš</li>
              <li>Sakupijaj srcad koje lete u zraku</li>
              <li>Izbjegavaj prepreke na tlu</li>
              <li>Nastavi trčati dok ne sakupiš dovoljno srcadi ili pređeš dovoljnu udaljenost</li>
            </ol>
            <p>
              <strong>Savjet:</strong> Skoči u pravom trenutku da sakupiš srcad i izbjegneš prepreke!
            </p>
            <div className="instructions-goals">
              <p><strong>Tvoji ciljevi:</strong></p>
              <ul>
                <li className={heartsCollected >= TARGET_HEARTS ? 'goal-completed' : ''}>
                  {heartsCollected >= TARGET_HEARTS ? '✓' : '○'} Sakupi {TARGET_HEARTS} srcadi ({heartsCollected}/{TARGET_HEARTS})
                </li>
                <li className={distance >= TARGET_DISTANCE ? 'goal-completed' : ''}>
                  {distance >= TARGET_DISTANCE ? '✓' : '○'} Pređi {TARGET_DISTANCE} piksela ({Math.floor(distance)}/{TARGET_DISTANCE})
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Game Area - Right Side */}
        <div className="runner-game-area">
          {!gameStarted ? (
            <div className="start-screen">
              <h2>Trčanje za srcadima</h2>
              <p>Pritisni SPACE da počneš!</p>
              <MetalButton
                variant="wide"
                onClick={startGame}
              >
                Počni igru
              </MetalButton>
            </div>
          ) : (
            <div className="game-viewport">
              {/* Background */}
              <div className="game-background" style={{
                backgroundImage: `url(${RunnerAssets.backgrounds[0]})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }} />

              {/* Ground */}
              <div className="game-ground" />

              {/* Player */}
              <div
                className="game-player"
                style={{
                  left: PLAYER_START_X,
                  top: playerY,
                  width: PLAYER_WIDTH,
                  height: PLAYER_HEIGHT,
                }}
              >
                <img
                  src={CandyAssets.hearts.find(h => h.includes('gem_heart_red') && !h.includes('outline')) || CandyAssets.hearts[12]}
                  alt="player"
                  className="player-sprite"
                />
              </div>

              {/* Obstacles and Hearts */}
              {obstacles.map(obstacle => (
                <div
                  key={obstacle.id}
                  className={`game-obstacle ${obstacle.type}`}
                  style={{
                    left: obstacle.x,
                    top: obstacle.y,
                    width: obstacle.width,
                    height: obstacle.height,
                  }}
                >
                  {obstacle.type === 'heart' ? (
                    <img
                      src={getHeartImage()}
                      alt="heart"
                      className="obstacle-sprite"
                    />
                  ) : (
                    <img
                      src={getObstacleImage()}
                      alt="obstacle"
                      className="obstacle-sprite"
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showWinModal && (
        <MetalPopup
          title="Bravo, ljubavi! Sakupila si sva srca!"
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
          title="Ups! Sudario si se s preprekom. Pokušaj opet, Lanči."
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

export default RunnerGame;
