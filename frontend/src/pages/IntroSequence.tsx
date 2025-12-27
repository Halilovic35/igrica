// Intro Sequence - First time welcome with avatar walking in and explaining the game
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import LayeredAvatarRenderer from '../features/avatar/LayeredAvatarRenderer';
import LoveMap from '../features/map/LoveMap';
import { CandyAssets, UIAssets } from '../assetsIndex';
import '../styles/IntroSequence.css';

// Helper function to render message with heart assets instead of emoji
const renderMessageWithHearts = (message: string): (string | JSX.Element)[] => {
  const heartAsset = CandyAssets.hearts.find(h => h.includes('pink') && !h.includes('outline')) || CandyAssets.hearts[8];
  // Replace [HEART] placeholder with heart image
  const parts = message.split('[HEART]');
  const result: (string | JSX.Element)[] = [];
  
  parts.forEach((part, index) => {
    if (part) {
      result.push(part);
    }
    if (index < parts.length - 1) {
      result.push(
        <img 
          key={`heart-${index}`}
          src={heartAsset} 
          alt="❤️" 
          className="inline-heart"
          style={{ 
            width: '20px', 
            height: '20px', 
            verticalAlign: 'middle',
            display: 'inline-block',
            margin: '0 2px',
            imageRendering: 'pixelated'
          }} 
        />
      );
    }
  });
  
  return result;
};

interface IntroSequenceProps {
  onComplete?: () => void;
}

const INTRO_MESSAGES = [
  "Cao Lanči! Dobro došla u svoju igricu! [HEART]",
  "Budući da znam da nisi nikad igrala igrice, a čini mi se kao da ti je zanimljivo i uvijek želiš da naučiš...",
  "Odlučio sam da napravim igru za tebe!",
  "Igra se sastoji od više levela - na svakom levelu će biti druga igra, kako bi se upoznala sa što više igara.",
  "Pošto si moje srce davno osvojila, za svaki pređen level ćeš dobiti 10 [HEART]",
  "Sa srcadima se možeš oblačiti i imati svog custom lika - možeš mu stavljati šta god poželiš!",
  "Zapamti: cilj ove igre je da se što više zabaviš, nasmiješ i osjetiš svu moju ljubav dok sam ovo pravio misleći na tebe.",
  "Za početak ti evo 30 mojih srcadi jer te volim najviše na svijetu! [HEART]",
];

const IntroSequence: React.FC<IntroSequenceProps> = ({ onComplete }) => {
  const { user, fetchUser } = useAuth();
  const navigate = useNavigate();
  
  const handleComplete = async () => {
    // Ensure hearts are saved before completing
    try {
      // Final fetch to ensure hearts are saved
      await fetchStats();
      const finalHearts = await api.get('/stats');
      const finalCount = finalHearts.data.heartsBalance || 0;
      console.log('Final hearts count before navigation:', finalCount);
      // Ensure we have exactly 30 hearts in database
      if (finalCount !== 30) {
        const heartsToAdd = 30 - finalCount;
        if (heartsToAdd > 0) {
          await api.post('/stats/add-hearts', { amount: heartsToAdd });
        } else if (heartsToAdd < 0) {
          // If somehow we have more than 30, we can't subtract, but we'll cap it in display
          console.warn('Hearts count exceeds 30, will be capped in display');
        }
      }
      // Store exactly 30 hearts count in localStorage for main scene
      localStorage.setItem('introHeartsCount', '30');
    } catch (err) {
      console.error('Error fetching final hearts:', err);
    }
    
    // Store that intro is completed
    localStorage.setItem('introCompleted', 'true');
    if (onComplete) {
      onComplete();
    } else {
      navigate('/love-map');
    }
  };
  
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const [avatarData, setAvatarData] = useState<any>(null);
  const [heartsGiven, setHeartsGiven] = useState(false);
  const [heartsAnimating, setHeartsAnimating] = useState(false);
  const [avatarPosition, setAvatarPosition] = useState({ x: -200, y: 50 }); // Start off-screen left (y is percentage)
  const [showAvatar, setShowAvatar] = useState(false);
  const [levels, setLevels] = useState<any[]>([]);
  const [hearts, setHearts] = useState(0);
  const [messageAnimating, setMessageAnimating] = useState(false);
  const [animatedHeartsCount, setAnimatedHeartsCount] = useState(0);
  const [showChatBubble, setShowChatBubble] = useState(true);
  const [chatBubbleHiding, setChatBubbleHiding] = useState(false);
  const [avatarWalkingToGame, setAvatarWalkingToGame] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);
  const heartsContainerRef = useRef<HTMLDivElement>(null);
  const chatMessageRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    fetchAvatarData();
    fetchLevels();
    fetchStats();
  }, []);

  useEffect(() => {
    if (avatarData && !showAvatar) {
      // Animate avatar walking in from left
      const timer = setTimeout(() => {
        setShowAvatar(true);
        // Animate avatar coming in
        const walkInInterval = setInterval(() => {
          setAvatarPosition(prev => {
            if (prev.x >= 20) { // Stop at left side of screen
              clearInterval(walkInInterval);
              return { x: 20, y: prev.y };
            }
            return { x: prev.x + 5, y: prev.y };
          });
        }, 16); // ~60fps
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [avatarData, showAvatar]);

  const fetchAvatarData = async () => {
    try {
      const response = await api.get('/avatar');
      setAvatarData(response.data);
    } catch (error) {
      console.error('Failed to fetch avatar:', error);
    }
  };

  const fetchLevels = async () => {
    try {
      const response = await api.get('/levels');
      setLevels(response.data);
    } catch (error) {
      console.error('Failed to fetch levels:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await api.get('/stats');
      setHearts(response.data.heartsBalance || 0);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const handleNextMessage = () => {
    if (currentMessageIndex < INTRO_MESSAGES.length - 1) {
      setMessageAnimating(true);
      setTimeout(() => {
        setCurrentMessageIndex(prev => prev + 1);
        setMessageAnimating(false);
      }, 200);
    } else {
      // Last message - give hearts and complete
      if (!heartsGiven) {
        console.log('Last message clicked, starting hearts animation');
        giveInitialHearts();
      } else {
        console.log('Hearts already given, skipping');
      }
    }
  };

  const handlePrevMessage = () => {
    if (currentMessageIndex > 0) {
      setMessageAnimating(true);
      setTimeout(() => {
        setCurrentMessageIndex(prev => prev - 1);
        setMessageAnimating(false);
      }, 200);
    }
  };

  const giveInitialHearts = async () => {
    if (heartsGiven) {
      console.log('Hearts already given, skipping');
      return;
    }
    
    console.log('Starting hearts animation and tutorial completion');
    setHeartsGiven(true);
    setHeartsAnimating(true);
    
    try {
      // Start animation first
      animateHeartsToTopBar();
      
      // Give exactly 30 hearts after animation completes (wait for all hearts to animate + count updates)
      // Last heart animates at: 30 * 40ms = 1200ms, plus 1200ms animation = 2400ms total
      setTimeout(async () => {
        console.log('Hearts animation complete, saving hearts to database');
        try {
          // First, get current hearts to ensure we set exactly 30 total
          const currentStats = await api.get('/stats');
          const currentHearts = currentStats.data.heartsBalance || 0;
          const heartsToAdd = 30 - currentHearts; // Calculate exact amount needed
          
          if (heartsToAdd > 0) {
            // Save hearts to database - add only what's needed to reach 30
            const response = await api.post('/stats/add-hearts', { amount: heartsToAdd });
            console.log('Hearts saved, response:', response.data);
          } else {
            console.log('User already has 30 or more hearts, skipping add');
          }
          
          // Wait a bit for database to update
          await new Promise(resolve => setTimeout(resolve, 200));
          
          // Fetch updated stats
          await fetchUser();
          const statsResponse = await api.get('/stats');
          const updatedHearts = statsResponse.data.heartsBalance || 0;
          console.log('Updated hearts from server:', updatedHearts);
          // In intro, always show exactly 30 hearts regardless of database value
          setHearts(30);
          // Keep animated count at exactly 30 so hearts stay visible
          setAnimatedHeartsCount(30);
          // Keep heartsAnimating true so animated count is used
        } catch (err) {
          console.error('Error adding hearts:', err);
        }
        // Keep heartsAnimating true so hearts stay visible with animated count
        
        // Hide chat bubble immediately and start avatar walking
        console.log('Setting chatBubbleHiding to true');
        setChatBubbleHiding(true);
        setTimeout(() => {
          console.log('Hiding chat bubble, starting avatar walk');
          setShowChatBubble(false);
          // Small delay to ensure state updates
          setTimeout(() => {
            walkAvatarToFirstGame();
          }, 50);
        }, 300); // Wait for fade out animation
      }, 2500); // Wait for all hearts to animate (30 * 40ms stagger + 1200ms animation)
    } catch (error) {
      console.error('Failed to give hearts:', error);
      handleComplete();
    }
  };

  const walkAvatarToFirstGame = () => {
    console.log('Starting avatar walk to first game');
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    // Find level 1 (candy_hearts) from levels array
    const level1 = levels.find(lvl => lvl.code === 'level_1_candy' || lvl.orderIndex === 1);
    
    let targetX: number;
    let targetYPercent: number;
    
    if (level1) {
      // Use actual level 1 position from LoveMap
      // LoveMap calculates positions based on districts and level positions
      // Level 1 is in first district, centered horizontally
      const districtHeight = viewportHeight - 56;
      const firstGameX = viewportWidth / 2;
      const firstGameY = districtHeight * 0.5; // Center of first district
      
      // Position avatar slightly above first game (80px above)
      targetX = firstGameX;
      targetYPercent = ((firstGameY - 80) / viewportHeight) * 100;
      
      console.log('Using level 1 position:', { level1: level1.code, orderIndex: level1.orderIndex, targetX, targetYPercent });
    } else {
      // Fallback to center of first district if level 1 not found
      const districtHeight = viewportHeight - 56;
      targetX = viewportWidth / 2;
      targetYPercent = ((districtHeight * 0.5 - 80) / viewportHeight) * 100;
      console.warn('Level 1 not found, using fallback position');
    }
    
    console.log('Avatar walk target:', { targetX, targetYPercent, currentPos: avatarPosition });
    
    setAvatarWalkingToGame(true);
    
    // Animate avatar walking to first game
    const startX = avatarPosition.x;
    const startYPercent = avatarPosition.y; // Already in percentage
    const distanceX = targetX - startX;
    const distanceYPercent = targetYPercent - startYPercent;
    const duration = 2500; // 2.5 seconds for smooth walk
    const steps = Math.floor(duration / 16); // ~60fps
    let currentStep = 0;
    
    const walkInterval = setInterval(() => {
      currentStep++;
      const progress = currentStep / steps;
      
      if (progress >= 1) {
        clearInterval(walkInterval);
        console.log('Avatar reached first game, completing intro');
        setAvatarPosition({ x: targetX, y: targetYPercent });
        // DON'T store position in localStorage - let LoveMap.tsx handle positioning to level 1
        // This ensures we always spawn at the correct level 1 position
        // Fade out before completing
        setTimeout(() => {
          setFadeOut(true);
          setTimeout(() => {
            handleComplete();
          }, 500); // Wait for fade out
        }, 500);
      } else {
        // Smooth easing (ease-out cubic)
        const easedProgress = 1 - Math.pow(1 - progress, 3);
        setAvatarPosition({
          x: startX + distanceX * easedProgress,
          y: startYPercent + distanceYPercent * easedProgress,
        });
      }
    }, 16);
  };

  const animateHeartsToTopBar = () => {
    const heartsCount = 30;
    
    // Small delay to ensure DOM is ready
    setTimeout(() => {
      // Find the last heart in the chat message
      const chatMessage = chatMessageRef.current;
      if (!chatMessage) {
        // Fallback: use center of chat bubble
        const chatBubble = document.querySelector('.chat-bubble-content');
        if (chatBubble) {
          const rect = chatBubble.getBoundingClientRect();
          animateHeartsFromPosition(rect.right - 30, rect.bottom - 20, heartsCount);
        }
        return;
      }
      
      const heartImages = chatMessage.querySelectorAll('.inline-heart');
      const lastHeart = heartImages[heartImages.length - 1] as HTMLElement;
      
      if (!lastHeart) {
        // Fallback: use center of chat bubble
        const chatBubble = document.querySelector('.chat-bubble-content');
        if (chatBubble) {
          const rect = chatBubble.getBoundingClientRect();
          animateHeartsFromPosition(rect.right - 30, rect.bottom - 20, heartsCount);
        }
        return;
      }
      
      // Get position of last heart in text
      const heartRect = lastHeart.getBoundingClientRect();
      const sourceX = heartRect.left + heartRect.width / 2;
      const sourceY = heartRect.top + heartRect.height / 2;
      
      animateHeartsFromPosition(sourceX, sourceY, heartsCount);
    }, 100);
  };

  const animateHeartsFromPosition = (sourceX: number, sourceY: number, heartsCount: number) => {
    // Target position - heart in top bar
    const targetX = window.innerWidth / 2; // Center of screen (where hearts display is)
    const targetY = 28; // Top bar hearts position
    
    // Use heart asset from 10k-assets
    const heartAsset = CandyAssets.hearts.find(h => h.includes('pink') && !h.includes('outline')) || CandyAssets.hearts[8];
    
    // Animate hearts count from 0 to 30 (cap at 30)
    setAnimatedHeartsCount(0);
    
    // Ensure we never animate more than 30 hearts
    const actualHeartsCount = Math.min(heartsCount, 30);
    
    for (let i = 0; i < actualHeartsCount; i++) {
      setTimeout(() => {
        const heart = document.createElement('img');
        heart.src = heartAsset;
        heart.className = 'floating-heart';
        heart.style.left = `${sourceX}px`;
        heart.style.top = `${sourceY}px`;
        heart.style.position = 'fixed';
        heart.style.width = '24px';
        heart.style.height = '24px';
        heart.style.pointerEvents = 'none';
        heart.style.zIndex = '1000';
        heart.style.transition = 'all 1.2s cubic-bezier(0.4, 0, 0.2, 1)';
        heart.style.transform = 'translate(-50%, -50%)';
        heart.style.opacity = '1';
        heart.style.imageRendering = 'pixelated';
        
        document.body.appendChild(heart);
        
        // Force reflow
        heart.offsetHeight;
        
        // Animate to top bar
        requestAnimationFrame(() => {
          heart.style.left = `${targetX}px`;
          heart.style.top = `${targetY}px`;
          heart.style.opacity = '0';
          heart.style.transform = 'translate(-50%, -50%) scale(0.5)';
        });
        
        // Update hearts count as heart reaches target (when it's about to enter)
        // Cap at 30 to ensure we never show more than 30
        setTimeout(() => {
          setAnimatedHeartsCount(prev => {
            const newCount = Math.min(prev + 1, 30); // Never exceed 30
            return newCount;
          });
        }, 1000 + (i * 40)); // Update count when heart reaches target
        
        // Remove after animation
        setTimeout(() => {
          if (heart.parentNode) {
            heart.remove();
          }
        }, 1200);
      }, i * 40); // Stagger hearts slightly
    }
  };

  if (!avatarData) {
    return <div className="intro-loading">Učitavanje...</div>;
  }

  return (
    <div className={`intro-sequence ${fadeOut ? 'fade-out' : ''}`}>
      {/* Render LoveMap as background */}
      <div className="intro-map-container">
        <LoveMap
          levels={levels}
          hearts={heartsAnimating ? Math.min(animatedHeartsCount, 30) : Math.min(hearts || 0, 30)}
          playerName={user?.displayName || 'Lanči'}
          onBack={() => {}}
          onShop={() => {}}
          onAvatar={() => {}}
          onOpenLevel={() => {}}
          hideAvatar={true}
        />
      </div>
      
      {/* Avatar */}
      {showAvatar && (
        <div 
          className="intro-avatar-container"
          style={{
            position: 'fixed',
            left: `${avatarPosition.x}px`,
            top: `${avatarPosition.y}%`,
            transform: 'translateY(-50%)',
            opacity: fadeOut ? 0 : 1,
            transition: fadeOut 
              ? 'opacity 0.5s ease-out' 
              : (avatarWalkingToGame ? 'left 0.1s linear, top 0.1s linear' : 'none'),
            zIndex: 100,
          }}
        >
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

      {/* Chat Bubble */}
      {showChatBubble && (
        <div className={`intro-chat-bubble ${messageAnimating ? 'animating' : ''} ${chatBubbleHiding ? 'hiding' : ''}`}>
          <div 
            className="chat-bubble-content"
            style={{
              backgroundImage: `url(${UIAssets.basic.find(b => b.includes('pop up window')) || '/assets/ui/basic/pop up window.png'})`,
              backgroundSize: '100% 100%',
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'center',
            }}
          >
            <p ref={chatMessageRef} className="chat-message">
              {currentMessageIndex < INTRO_MESSAGES.length ? renderMessageWithHearts(INTRO_MESSAGES[currentMessageIndex]) : ''}
            </p>
            <div className="chat-buttons">
              {currentMessageIndex > 0 && !chatBubbleHiding && (
                <button 
                  className="chat-back-button"
                  onClick={handlePrevMessage}
                >
                  <img 
                    src={UIAssets.basic.find(b => b.includes('arrow left')) || '/assets/ui/basic/arrow left.png'} 
                    alt="Nazad" 
                    style={{ width: '16px', height: '16px' }}
                  />
                  Nazad
                </button>
              )}
              {!chatBubbleHiding && (
                <button 
                  className="chat-next-button"
                  onClick={handleNextMessage}
                  disabled={heartsAnimating}
                >
                  {currentMessageIndex < INTRO_MESSAGES.length - 1 ? (
                    <>
                      Dalje
                      <img 
                        src={UIAssets.basic.find(b => b.includes('arrow right')) || '/assets/ui/basic/arrow right.png'} 
                        alt="Dalje" 
                        style={{ width: '16px', height: '16px' }}
                      />
                    </>
                  ) : (
                    'Započni! 💖'
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Hearts animation container */}
      <div ref={heartsContainerRef} className="hearts-animation-container" />
    </div>
  );
};

export default IntroSequence;
