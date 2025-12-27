import { useEffect, useState } from 'react';
import api from '../services/api';
import '../styles/AvatarPreview.css';

interface Avatar {
  avatarImageUrl?: string;
  bodyColor: string;
  equippedOutfitId?: string;
  equippedEffectIds: string[];
}

interface AvatarPreviewProps {
  userId: string;
  size?: 'small' | 'medium' | 'large';
}

const AvatarPreview: React.FC<AvatarPreviewProps> = ({ userId, size = 'medium' }) => {
  const [avatar, setAvatar] = useState<Avatar | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAvatar();
    
    // Listen for avatar updates
    const handleAvatarUpdate = () => {
      fetchAvatar();
    };
    window.addEventListener('avatar-updated', handleAvatarUpdate);
    
    return () => {
      window.removeEventListener('avatar-updated', handleAvatarUpdate);
    };
  }, [userId]);

  const fetchAvatar = async () => {
    try {
      const response = await api.get('/avatar');
      const avatarData = response.data;
      // Fix image URL if it's relative
      if (avatarData.avatarImageUrl && !avatarData.avatarImageUrl.startsWith('http')) {
        avatarData.avatarImageUrl = `http://localhost:3001${avatarData.avatarImageUrl}`;
      }
      setAvatar(avatarData);
    } catch (error) {
      console.error('Failed to fetch avatar:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className={`avatar-preview avatar-${size}`}>...</div>;
  }

  if (!avatar) {
    return null;
  }

  const sizeMap = {
    small: 60,
    medium: 100,
    large: 150,
  };

  const avatarSize = sizeMap[size];

  return (
    <div className={`avatar-preview avatar-${size}`} style={{ width: avatarSize, height: avatarSize * 1.5 }}>
      {/* Head - circular profile image */}
      <div 
        className="avatar-head"
        style={{
          width: avatarSize,
          height: avatarSize,
          backgroundImage: avatar.avatarImageUrl ? `url(${avatar.avatarImageUrl})` : 'none',
          backgroundColor: avatar.avatarImageUrl ? 'transparent' : '#FFB6C1',
        }}
      />
      
      {/* Body - chibi style */}
      <div 
        className={`avatar-body ${avatar.equippedOutfitId ? 'has-outfit' : ''}`}
        style={{
          backgroundColor: avatar.bodyColor,
          width: avatarSize * 0.7,
          height: avatarSize * 0.5,
        }}
      >
        {/* Simple body shape */}
        <div className="body-shape" />
        {/* Outfit indicator */}
        {avatar.equippedOutfitId && (
          <div className="outfit-indicator">👗</div>
        )}
      </div>

      {/* Effects */}
      {avatar.equippedEffectIds.length > 0 && (
        <div className="avatar-effects">
          {avatar.equippedEffectIds.map((effectId) => (
            <div key={effectId} className="effect-particles">✨</div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AvatarPreview;

