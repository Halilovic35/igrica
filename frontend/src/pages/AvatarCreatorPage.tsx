import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import '../styles/AvatarCreatorPage.css';

const AvatarCreatorPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [avatarImageUrl, setAvatarImageUrl] = useState<string>('');
  const [bodyColor, setBodyColor] = useState('#FFB6C1');
  const [equippedOutfitId, setEquippedOutfitId] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [previewImage, setPreviewImage] = useState<string>('');

  const bodyColors = [
    { name: 'Pink', value: '#FFB6C1' },
    { name: 'Peach', value: '#FFDAB9' },
    { name: 'Lavender', value: '#E6E6FA' },
    { name: 'Mint', value: '#F0FFF0' },
    { name: 'Sky', value: '#87CEEB' },
  ];

  useEffect(() => {
    fetchAvatar();
  }, []);

  const fetchAvatar = async () => {
    try {
      const response = await api.get('/avatar');
      const avatar = response.data;
      setAvatarImageUrl(avatar.avatarImageUrl || '');
      setBodyColor(avatar.bodyColor || '#FFB6C1');
      setEquippedOutfitId(avatar.equippedOutfitId || '');
      if (avatar.avatarImageUrl) {
        const imageUrl = avatar.avatarImageUrl;
        setPreviewImage(imageUrl.startsWith('http') ? imageUrl : `http://localhost:3001${imageUrl}`);
      }
    } catch (error) {
      console.error('Failed to fetch avatar:', error);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('image', file);

    try {
      const response = await api.post('/avatar/upload-image', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      setAvatarImageUrl(response.data.avatarImageUrl);
      const imageUrl = response.data.avatarImageUrl;
      setPreviewImage(imageUrl.startsWith('http') ? imageUrl : `http://localhost:3001${imageUrl}`);
    } catch (error) {
      console.error('Failed to upload image:', error);
      alert('Greška pri učitavanju slike');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put('/avatar', {
        bodyColor,
        equippedOutfitId: equippedOutfitId || null,
      });
      navigate('/love-map');
    } catch (error) {
      console.error('Failed to save avatar:', error);
      alert('Greška pri čuvanju avatara');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="avatar-creator-page">
      <div className="avatar-creator-container">
        <h1 className="creator-title">Kreiraj svoj avatar 💖</h1>

        <div className="creator-content">
          {/* Avatar Preview */}
          <div className="avatar-preview-section">
            <h2>Tvoj avatar</h2>
            <div className="avatar-display-pedestal">
              <div className="avatar-display">
                {/* Head */}
                <div 
                  className="avatar-head-display"
                  style={{
                    backgroundImage: previewImage ? `url(${previewImage})` : 'none',
                    backgroundColor: previewImage ? 'transparent' : '#FFB6C1',
                  }}
                />
                {/* Body */}
                <div 
                  className="avatar-body-display"
                  style={{ backgroundColor: bodyColor }}
                />
              </div>
            </div>
          </div>

          {/* Customization Options */}
          <div className="customization-section">
            {/* Image Upload */}
            <div className="customization-group">
              <label className="customization-label">Glava (tvoja slika)</label>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                disabled={uploading}
                className="file-input"
              />
              {uploading && <p className="upload-status">Učitavanje...</p>}
            </div>

            {/* Body Color */}
            <div className="customization-group">
              <label className="customization-label">Boja tijela</label>
              <div className="color-picker">
                {bodyColors.map((color) => (
                  <button
                    key={color.value}
                    className={`color-option ${bodyColor === color.value ? 'active' : ''}`}
                    style={{ backgroundColor: color.value }}
                    onClick={() => setBodyColor(color.value)}
                    title={color.name}
                  />
                ))}
              </div>
              <input
                type="color"
                value={bodyColor}
                onChange={(e) => setBodyColor(e.target.value)}
                className="color-input"
              />
            </div>

            {/* Outfit Selection (basic for now) */}
            <div className="customization-group">
              <label className="customization-label">Odjeća</label>
              <select
                value={equippedOutfitId}
                onChange={(e) => setEquippedOutfitId(e.target.value)}
                className="outfit-select"
              >
                <option value="">Osnovna (besplatno)</option>
              </select>
              <p className="customization-hint">Više opcija će biti dostupno u Shop-u! 💝</p>
            </div>
          </div>
        </div>

        <button 
          onClick={handleSave}
          disabled={saving}
          className="save-button"
        >
          {saving ? 'Čuvanje...' : 'Sačuvaj i nastavi'}
        </button>
      </div>
    </div>
  );
};

export default AvatarCreatorPage;

