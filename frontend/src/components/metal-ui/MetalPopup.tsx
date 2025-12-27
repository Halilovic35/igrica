import { MetalUIAssets } from '../../assetsIndex';
import MetalButton from './MetalButton';
import { MetalIcons } from './MetalIcon';
import './MetalPopup.css';

interface MetalPopupProps {
  title: string;
  children?: React.ReactNode;
  onClose?: () => void;
  primaryAction?: { label: string; onClick: () => void };
  secondaryAction?: { label: string; onClick: () => void };
  icon?: string;
}

const MetalPopup: React.FC<MetalPopupProps> = ({
  title,
  children,
  onClose,
  primaryAction,
  secondaryAction,
  icon,
}) => {
  return (
    <div className="metal-popup-overlay" onClick={onClose}>
      <div className="metal-popup-container" onClick={(e) => e.stopPropagation()}>
        <div
          className="metal-popup-window"
          style={{
            backgroundImage: `url(${MetalUIAssets.popup.window})`,
            backgroundSize: '100% 100%',
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'center',
          }}
        >
          <div className="metal-popup-content">
            {icon && (
              <div className="metal-popup-icon">
                <img src={icon} alt="" style={{ width: '64px', height: '64px' }} />
              </div>
            )}
            <h2 className="metal-popup-title">{title}</h2>
            {children && <div className="metal-popup-body">{children}</div>}
            <div className="metal-popup-actions">
              {secondaryAction && (
                <MetalButton
                  variant="wide"
                  onClick={secondaryAction.onClick}
                  style={{ marginRight: '10px' }}
                >
                  {secondaryAction.label}
                </MetalButton>
              )}
              {primaryAction && (
                <MetalButton variant="wide" onClick={primaryAction.onClick}>
                  {primaryAction.label}
                </MetalButton>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MetalPopup;
export { MetalIcons };

