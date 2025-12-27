import { MetalUIAssets } from '../../assetsIndex';

interface MetalIconProps {
  src: string;
  size?: number;
  alt?: string;
  className?: string;
  noInlineStyles?: boolean;
}

const MetalIcon: React.FC<MetalIconProps> = ({ src, size = 24, alt = '', className = '', noInlineStyles = false }) => {
  return (
    <img
      src={src}
      alt={alt}
      className={`metal-icon ${className}`}
      style={noInlineStyles ? {} : {
        width: `${size}px`,
        height: `${size}px`,
        objectFit: 'contain',
        display: 'inline-block',
        verticalAlign: 'middle',
      }}
    />
  );
};

export default MetalIcon;

// Predefined icon exports
export const MetalIcons = {
  heartFilled: MetalUIAssets.hearts.filled,
  heartEmpty: MetalUIAssets.hearts.empty,
  starFilled: MetalUIAssets.stars.filled,
  starEmpty: MetalUIAssets.stars.empty,
  arrowLeft: MetalUIAssets.arrows.left,
  arrowRight: MetalUIAssets.arrows.right,
  arrowUp: MetalUIAssets.arrows.up,
  arrowDown: MetalUIAssets.arrows.down,
  play: MetalUIAssets.icons.play,
  pause: MetalUIAssets.icons.pause,
  home: MetalUIAssets.icons.home,
  settings: MetalUIAssets.icons.settings,
  restart: MetalUIAssets.icons.restart,
  tick: MetalUIAssets.icons.tick,
  cross: MetalUIAssets.icons.cross,
  info: MetalUIAssets.icons.info,
  menu: MetalUIAssets.icons.menu,
  question: MetalUIAssets.icons.question,
  soundOn: MetalUIAssets.icons.soundOn,
  soundOff: MetalUIAssets.icons.soundOff,
};

