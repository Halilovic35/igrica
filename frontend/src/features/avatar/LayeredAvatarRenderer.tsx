// Modular Avatar Renderer for Keri Character
// Renders avatar using modular parts that compose together

import { getItemById, AvatarSlot } from './AvatarAssets';
import './LayeredAvatarRenderer.css';

interface AvatarData {
  baseBodyId: string; // Base ID (e.g., 'base_1')
  equippedItems: Record<AvatarSlot, string | null>;
}

interface LayeredAvatarRendererProps {
  avatar: AvatarData;
  size?: 'small' | 'medium' | 'large';
}

// Render order for Keri character (bottom to top)
const LAYER_ORDER: AvatarSlot[] = [
  'Base',      // Base body/skin (bottom layer)
  'Bottom',    // Pants/bottoms
  'Top',       // Shirt/top
  'Eyebrows',  // Eyebrows
  'Eyes',      // Eyes
  'Mouth',     // Mouth
  'Hair',      // Hair (on top)
  'Misc',      // Effects (blush, tears, etc.) (topmost)
];

const SIZE_MAP = {
  small: { width: 150, height: 304 },   // Scaled from 467x946
  medium: { width: 234, height: 473 },  // ~50% of original
  large: { width: 467, height: 946 },   // Original size
};

const LayeredAvatarRenderer: React.FC<LayeredAvatarRendererProps> = ({ 
  avatar, 
  size = 'medium' 
}) => {
  const dimensions = SIZE_MAP[size];
  const scale = dimensions.width / 467; // Scale factor from original 467px width

  const renderLayer = (slot: AvatarSlot) => {
    const itemId = avatar.equippedItems[slot];
    
    // Base is always required
    if (slot === 'Base') {
      const baseId = itemId || avatar.baseBodyId || 'base_1';
      const item = getItemById(baseId);
      if (!item) return null;
      
      return (
        <img
          key="base"
          src={item.assetPath}
          alt="Base"
          className="avatar-layer base-layer"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: dimensions.width,
            height: 'auto',
            zIndex: 1,
            imageRendering: 'pixelated',
          }}
        />
      );
    }

    // Skip if no item equipped (except Base which is always required)
    if (!itemId) return null;

    const item = getItemById(itemId);
    if (!item) return null;

    // Calculate z-index based on layer order
    const zIndex = LAYER_ORDER.indexOf(slot) + 1;

    return (
      <img
        key={itemId}
        src={item.assetPath}
        alt={item.name}
        className={`avatar-layer ${slot.toLowerCase()}-layer`}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: dimensions.width,
          height: 'auto',
          zIndex,
          imageRendering: 'pixelated',
        }}
      />
    );
  };

  return (
    <div 
      className={`layered-avatar-container avatar-${size} breathing-animation`}
      style={{
        width: dimensions.width,
        height: dimensions.height,
        position: 'relative',
        display: 'inline-block',
      }}
    >
      {/* Render all layers in order */}
      {LAYER_ORDER.map(slot => renderLayer(slot))}
    </div>
  );
};

export default LayeredAvatarRenderer;
