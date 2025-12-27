import { useState } from 'react';
import { MetalUIAssets } from '../../assetsIndex';
import MetalIcon, { MetalIcons } from './MetalIcon';
import './MetalButton.css';

interface MetalButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'wide' | 'square' | 'wider';
  iconLeftSrc?: string;
  iconRightSrc?: string;
  children: React.ReactNode;
}

const MetalButton: React.FC<MetalButtonProps> = ({
  variant = 'wide',
  iconLeftSrc,
  iconRightSrc,
  children,
  className = '',
  ...props
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isActive, setIsActive] = useState(false);

  const getButtonImage = () => {
    if (variant === 'square') {
      if (isActive) return MetalUIAssets.buttons.squareClick;
      if (isHovered) return MetalUIAssets.buttons.squareHover;
      return MetalUIAssets.buttons.squareIdle;
    }
    if (variant === 'wider') {
      if (isActive) return MetalUIAssets.buttons.widerClick;
      if (isHovered) return MetalUIAssets.buttons.widerHover;
      return MetalUIAssets.buttons.widerIdle;
    }
    // wide (default)
    if (isActive) return MetalUIAssets.buttons.wideClick;
    if (isHovered) return MetalUIAssets.buttons.wideHover;
    return MetalUIAssets.buttons.wideIdle;
  };

  const hasNoBackground = className.includes('back-button');
  
  return (
    <button
      className={`metal-button metal-button-${variant} ${className} ${isActive ? 'active' : ''}`}
      style={hasNoBackground ? {} : {
        backgroundImage: `url(${getButtonImage()})`,
        backgroundSize: '100% 100%',
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'center',
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setIsActive(false);
      }}
      onMouseDown={() => setIsActive(true)}
      onMouseUp={() => setIsActive(false)}
      onTouchStart={() => setIsActive(true)}
      onTouchEnd={() => setIsActive(false)}
      {...props}
    >
      <span className="metal-button-content">
        {iconLeftSrc && (
          <MetalIcon src={iconLeftSrc} size={20} className="metal-button-icon-left" />
        )}
        <span className="metal-button-text">{children}</span>
        {iconRightSrc && (
          <MetalIcon src={iconRightSrc} size={20} className="metal-button-icon-right" />
        )}
      </span>
    </button>
  );
};

export default MetalButton;
export { MetalIcons };

