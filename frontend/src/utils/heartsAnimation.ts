import { CandyAssets } from '../assetsIndex';

/**
 * Animates hearts flying from a source position to the top bar
 * @param sourceX - X position of source (in pixels)
 * @param sourceY - Y position of source (in pixels)
 * @param heartsCount - Number of hearts to animate
 * @param onHeartUpdate - Callback called when each heart reaches target (receives current count)
 * @param onComplete - Callback called when all hearts finish animating
 */
export const animateHeartsToTopBar = (
  sourceX: number,
  sourceY: number,
  heartsCount: number,
  onHeartUpdate?: (count: number) => void,
  onComplete?: () => void
) => {
  // Target position - heart in top bar (centered horizontally, 28px from top)
  const targetX = window.innerWidth / 2; // Center of screen (where hearts display is)
  const targetY = 28; // Top bar hearts position (center of 56px bar)
  
  // Use heart asset from 10k-assets
  const heartAsset = CandyAssets.hearts.find(h => h.includes('pink') && !h.includes('outline')) || CandyAssets.hearts[8];
  
  let completedHearts = 0;
  
  for (let i = 0; i < heartsCount; i++) {
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
      setTimeout(() => {
        completedHearts++;
        if (onHeartUpdate) {
          onHeartUpdate(completedHearts);
        }
        
        // Check if all hearts completed
        if (completedHearts >= heartsCount && onComplete) {
          setTimeout(() => {
            onComplete();
          }, 200); // Small delay after last heart
        }
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
