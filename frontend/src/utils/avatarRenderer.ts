// Utility za renderovanje avatara u canvas igrama
import api from '../services/api';

export interface AvatarData {
  avatarImageUrl?: string;
  bodyColor: string;
  equippedOutfitId?: string;
  equippedEffectIds: string[];
}

let cachedAvatar: AvatarData | null = null;
let avatarImage: HTMLImageElement | null = null;

// Listen for avatar updates
if (typeof window !== 'undefined') {
  window.addEventListener('avatar-updated', () => {
    cachedAvatar = null;
    avatarImage = null;
    loadAvatarImage();
  });
}

export async function loadAvatarImage(): Promise<HTMLImageElement | null> {
  try {
    const response = await api.get('/avatar');
    const avatar = response.data;
    
    // Fix image URL
    let imageUrl = avatar.avatarImageUrl;
    if (imageUrl && !imageUrl.startsWith('http')) {
      imageUrl = `http://localhost:3001${imageUrl}`;
    }
    
    cachedAvatar = avatar;
    
    if (!imageUrl) {
      return null;
    }
    
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        avatarImage = img;
        resolve(img);
      };
      img.onerror = () => {
        console.error('Failed to load avatar image');
        resolve(null);
      };
      img.src = imageUrl;
    });
  } catch (error) {
    console.error('Failed to fetch avatar:', error);
    return null;
  }
}

export function drawAvatar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number = 40,
  facingRight: boolean = true
) {
  const avatar = cachedAvatar;
  if (!avatar) return;
  
  const headSize = size;
  const bodyWidth = size * 0.7;
  const bodyHeight = size * 0.5;
  
  // Draw body first (behind head)
  ctx.fillStyle = avatar.bodyColor;
  ctx.beginPath();
  ctx.ellipse(
    x,
    y + headSize * 0.6,
    bodyWidth / 2,
    bodyHeight / 2,
    0,
    0,
    2 * Math.PI
  );
  ctx.fill();
  
  // Add outfit visual indication
  if (avatar.equippedOutfitId) {
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 3;
    ctx.stroke();
    // Add sparkle effect for outfit
    ctx.fillStyle = 'rgba(255, 215, 0, 0.6)';
    ctx.beginPath();
    ctx.arc(x + bodyWidth / 3, y + headSize * 0.8, 3, 0, 2 * Math.PI);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x - bodyWidth / 3, y + headSize * 0.8, 3, 0, 2 * Math.PI);
    ctx.fill();
  }
  
  // Draw head (circular image or default)
  if (avatarImage && avatar.avatarImageUrl) {
    // Draw circular image
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, headSize / 2, 0, 2 * Math.PI);
    ctx.clip();
    ctx.drawImage(
      avatarImage,
      x - headSize / 2,
      y - headSize / 2,
      headSize,
      headSize
    );
    ctx.restore();
    
    // Draw border
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, headSize / 2, 0, 2 * Math.PI);
    ctx.stroke();
  } else {
    // Draw default circle
    ctx.fillStyle = avatar.bodyColor;
    ctx.beginPath();
    ctx.arc(x, y, headSize / 2, 0, 2 * Math.PI);
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Draw default face
    ctx.fillStyle = '#fff';
    ctx.font = `${headSize * 0.4}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('💖', x, y);
  }
  
  // Draw effects
  if (avatar.equippedEffectIds.length > 0) {
    ctx.fillStyle = 'rgba(255, 215, 0, 0.6)';
    ctx.beginPath();
    ctx.arc(x, y, headSize / 2 + 5, 0, 2 * Math.PI);
    ctx.fill();
  }
}

