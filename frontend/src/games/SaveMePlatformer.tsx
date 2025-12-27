import { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import { loadAvatarImage, drawAvatar } from '../utils/avatarRenderer';
import { animateHeartsToTopBar } from '../utils/heartsAnimation';
import { useAuth } from '../contexts/AuthContext';
import MetalIcon, { MetalIcons } from '../components/metal-ui/MetalIcon';
import '../styles/GamePage.css';
import '../styles/PlatformerGame.css';

interface SaveMePlatformerProps {
  onComplete: () => void;
}

const SaveMePlatformer: React.FC<SaveMePlatformerProps> = ({ onComplete }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [position, setPosition] = useState({ x: 50, y: 300 });
  const [velocity, setVelocity] = useState({ x: 0, y: 0 });
  const [onGround, setOnGround] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [showCompletion, setShowCompletion] = useState(false);
  const [heartsAnimating, setHeartsAnimating] = useState(false);
  const [animatedHeartsCount, setAnimatedHeartsCount] = useState(0);
  const [hearts, setHearts] = useState(0);
  const [showTopBar, setShowTopBar] = useState(false);
  const { fetchUser } = useAuth();
  const gameRef = useRef<any>(null);
  const avatarLoaded = useRef(false);

  const GRAVITY = 0.8;
  const JUMP_STRENGTH = -15;
  const MOVE_SPEED = 5;
  const TARGET_X = 700;
  const TARGET_Y = 300;

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

    let currentVelocity = velocity;
    let currentPosition = position;
    let currentOnGround = onGround;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        currentVelocity = { ...currentVelocity, x: MOVE_SPEED };
        setVelocity(currentVelocity);
      }
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        currentVelocity = { ...currentVelocity, x: -MOVE_SPEED };
        setVelocity(currentVelocity);
      }
      if ((e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') && currentOnGround) {
        currentVelocity = { ...currentVelocity, y: JUMP_STRENGTH };
        currentOnGround = false;
        setVelocity(currentVelocity);
        setOnGround(false);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D' || 
          e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        currentVelocity = { ...currentVelocity, x: 0 };
        setVelocity(currentVelocity);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    const gameLoop = () => {
      if (completed) return;

      // Apply gravity
      currentVelocity = { ...currentVelocity, y: currentVelocity.y + GRAVITY };
      
      // Update position
      let newX = currentPosition.x + currentVelocity.x;
      let newY = currentPosition.y + currentVelocity.y;

      // Ground collision (platform at y=400)
      if (newY >= 400 - 40) {
        newY = 400 - 40;
        currentOnGround = true;
        currentVelocity = { ...currentVelocity, y: 0 };
        setOnGround(true);
      } else {
        currentOnGround = false;
        setOnGround(false);
      }

      // Platform collision (platform at x=300-400, y=250)
      if (newX >= 300 - 20 && newX <= 400 + 20 && newY >= 200 && newY <= 270) {
        newY = 200 - 40;
        currentOnGround = true;
        currentVelocity = { ...currentVelocity, y: 0 };
        setOnGround(true);
      }

      // Boundaries
      newX = Math.max(20, Math.min(780, newX));

      // Check if reached target
      if (Math.abs(newX - TARGET_X) < 50 && Math.abs(newY - TARGET_Y) < 50) {
        handleComplete();
      }

      currentPosition = { x: newX, y: newY };
      setPosition(currentPosition);
      setVelocity(currentVelocity);

      // Draw
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw platforms
      ctx.fillStyle = '#8B4513';
      ctx.fillRect(0, 400, 800, 200); // Ground
      ctx.fillRect(300, 250, 100, 20); // Platform

      // Draw target (you)
      ctx.fillStyle = '#4a90e2';
      ctx.fillRect(TARGET_X - 20, TARGET_Y - 20, 40, 40);
      ctx.fillStyle = '#fff';
      ctx.font = '16px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('🎯', TARGET_X, TARGET_Y + 5);

      // Draw player (her avatar)
      const facingRight = currentVelocity.x >= 0;
      drawAvatar(ctx, currentPosition.x, currentPosition.y - 20, 40, facingRight);

      requestAnimationFrame(gameLoop);
    };

    gameRef.current = requestAnimationFrame(gameLoop);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      if (gameRef.current) {
        cancelAnimationFrame(gameRef.current);
      }
    };
  }, [completed]);

  const handleComplete = async () => {
    setCompleted(true);
    try {
      const levelsResponse = await api.get('/levels');
      const level = levelsResponse.data.find((l: any) => l.code === 'level_2_save_me');
      
      if (level) {
        // Complete level - backend will check if already completed and only award hearts once
        const completeResponse = await api.post('/levels/complete', { levelId: level.id });
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
        <h1>Spasi me 💕</h1>
        <div className="game-instructions">
          <p>Koristi strelice ili WASD da se krećeš</p>
          <p>Space ili strelica gore za skok</p>
          <p>Dodirni me da me spasiš! 💖</p>
        </div>
      </div>

      <div className="platformer-container">
        <canvas
          ref={canvasRef}
          width={800}
          height={600}
          className="platformer-canvas"
        />
      </div>

      {showCompletion && (
        <div className="completion-overlay">
          <div className="completion-message">
            <h2>Spasila si me, Lanči. Kao i svaki put u stvarnom životu 💕</h2>
            <p>+15 ❤️</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default SaveMePlatformer;

