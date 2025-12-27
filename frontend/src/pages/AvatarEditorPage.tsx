// Avatar Editor / Inventory Page for Keri Character
// Users can equip/unequip items and see live preview

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import { 
  AvatarSlot, 
  getItemsByCategory, 
  getItemById,
  AVATAR_BODIES,
  HAIR_STYLES,
  EYE_STYLES,
  EYEBROWS,
  MOUTHS,
  TOPS,
  BOTTOMS,
  MISC_EFFECTS,
} from '../features/avatar/AvatarAssets';
import LayeredAvatarRenderer from '../features/avatar/LayeredAvatarRenderer';
import '../styles/AvatarEditorPage.css';

interface AvatarData {
  id: string;
  userId: string;
  baseBodyId: string;
  equippedItems: Record<AvatarSlot, string | null>;
}

const AvatarEditorPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [avatar, setAvatar] = useState<AvatarData | null>(null);
  const [ownedItemIds, setOwnedItemIds] = useState<Set<string>>(new Set());
  const [selectedCategory, setSelectedCategory] = useState<AvatarSlot>('Base');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Variant selectors for items with multiple variants
  const [hairStyle, setHairStyle] = useState(1);
  const [hairColor, setHairColor] = useState(1);
  const [eyeStyle, setEyeStyle] = useState(1);
  const [eyeColor, setEyeColor] = useState(1);
  const [topStyle, setTopStyle] = useState(0);
  const [topVariant, setTopVariant] = useState(1);
  const [bottomStyle, setBottomStyle] = useState(0);
  const [bottomVariant, setBottomVariant] = useState(1);

  useEffect(() => {
    fetchAvatarData();
  }, []);

  useEffect(() => {
    // Sync variant selectors with equipped items
    if (avatar) {
      const hairId = avatar.equippedItems.Hair;
      if (hairId) {
        const parts = hairId.split('_');
        if (parts.length === 3) {
          setHairStyle(Number(parts[1]));
          setHairColor(Number(parts[2]));
        }
      }
      
      const eyesId = avatar.equippedItems.Eyes;
      if (eyesId) {
        const parts = eyesId.split('_');
        if (parts.length === 3) {
          setEyeStyle(Number(parts[1]));
          setEyeColor(Number(parts[2]));
        }
      }
      
      const topId = avatar.equippedItems.Top;
      if (topId) {
        const parts = topId.split('_');
        if (parts.length === 3) {
          setTopStyle(Number(parts[1]));
          setTopVariant(Number(parts[2]));
        }
      } else {
        setTopStyle(0);
      }
      
      const bottomId = avatar.equippedItems.Bottom;
      if (bottomId) {
        const parts = bottomId.split('_');
        if (parts.length === 3) {
          setBottomStyle(Number(parts[1]));
          setBottomVariant(Number(parts[2]));
        }
      } else {
        setBottomStyle(0);
      }
    }
  }, [avatar]);

  const fetchAvatarData = async () => {
    try {
      const [avatarResponse, itemsResponse] = await Promise.all([
        api.get('/avatar'),
        api.get('/shop/items'),
      ]);

      const avatarData = avatarResponse.data;
      
      // If avatar is null or doesn't have baseBodyId, redirect to setup
      if (!avatarData || !avatarData.baseBodyId) {
        navigate('/avatar-setup');
        return;
      }
      
      // Normalize equippedItems
      const equippedItems: Record<AvatarSlot, string | null> = {
        Base: avatarData.baseBodyId || 'base_1',
        Hair: null,
        Eyes: null,
        Eyebrows: null,
        Mouth: null,
        Top: null,
        Bottom: null,
        Misc: null,
      };

      if (avatarData.equippedItems && typeof avatarData.equippedItems === 'object') {
        Object.assign(equippedItems, avatarData.equippedItems);
      }

      // Ensure required items have defaults
      if (!equippedItems.Hair) equippedItems.Hair = 'hair_1_1';
      if (!equippedItems.Eyes) equippedItems.Eyes = 'eyes_1_1';
      if (!equippedItems.Eyebrows) equippedItems.Eyebrows = 'eyebrows_1';
      if (!equippedItems.Mouth) equippedItems.Mouth = 'mouth_1';
      // Default outfit so the character is not naked on first load
      if (!equippedItems.Top) equippedItems.Top = 'top_1_1';
      if (!equippedItems.Bottom) equippedItems.Bottom = 'bottom_1_1';

      setAvatar({
        ...avatarData,
        equippedItems,
      });

      // Get owned items
      const owned = itemsResponse.data
        .filter((item: any) => item.owned)
        .map((item: any) => item.id);
      setOwnedItemIds(new Set(owned));
    } catch (error) {
      console.error('Failed to fetch avatar data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEquip = async (slot: AvatarSlot, itemId: string | null) => {
    if (!avatar) return;

    setSaving(true);
    try {
      const newEquippedItems = {
        ...avatar.equippedItems,
        [slot]: itemId,
      };

      await api.post('/avatar/equip', {
        slot,
        itemId,
      });

      setAvatar({
        ...avatar,
        equippedItems: newEquippedItems,
      });

      // Trigger update event
      window.dispatchEvent(new Event('avatar-updated'));
    } catch (error) {
      console.error('Failed to equip item:', error);
      alert('Greška pri opremanju predmeta');
    } finally {
      setSaving(false);
    }
  };

  const handleVariantChange = async (slot: AvatarSlot, style: number, variant: number) => {
    if (!avatar) return;
    
    let itemId: string | null = null;
    if (style > 0 && variant > 0) {
      itemId = `${slot.toLowerCase()}_${style}_${variant}`;
    }
    
    await handleEquip(slot, itemId);
  };

  if (loading) {
    return (
      <div className="avatar-editor-page">
        <div className="loading-message">Učitavanje...</div>
      </div>
    );
  }

  if (!avatar) {
    return (
      <div className="avatar-editor-page">
        <div className="error-message">Avatar nije pronađen</div>
        <button onClick={() => navigate('/avatar-setup')}>Kreiraj avatar</button>
      </div>
    );
  }

  // Get items for selected category
  let categoryItems = getItemsByCategory(selectedCategory);
  
  // Debug: log how many items we have
  console.log(`Category: ${selectedCategory}, Items count: ${categoryItems.length}`);
  
  // Show ALL items, but mark which ones are owned/available
  // Free items (priceHearts === 0) are always available
  // Paid items are available if owned
  const availableItems = categoryItems; // Show all items, don't filter

  const currentEquippedId = avatar.equippedItems[selectedCategory];

  return (
    <div className="avatar-editor-page">
      <div className="editor-header">
        <button className="header-back" onClick={() => navigate('/love-map')}>
          ← Nazad
        </button>
        <h1 className="editor-title">Uredi svog karaktera</h1>
      </div>

      <div className="editor-content">
        {/* Avatar Preview */}
        <div className="avatar-preview-section">
          <div className="preview-container">
            <LayeredAvatarRenderer
              avatar={avatar}
              size="medium"
            />
          </div>
        </div>

        {/* Inventory Tabs */}
        <div className="inventory-section">
          <div className="category-tabs">
            {(['Base', 'Hair', 'Eyes', 'Eyebrows', 'Mouth', 'Top', 'Bottom', 'Misc'] as AvatarSlot[]).map((category) => (
              <button
                key={category}
                className={`category-tab ${selectedCategory === category ? 'active' : ''}`}
                onClick={() => setSelectedCategory(category)}
              >
                {getCategoryLabel(category)}
              </button>
            ))}
          </div>

          <div className="items-section">
            {/* Items Grid - Show visual previews for all categories */}
            <div className="items-grid">
                {/* "None" option for optional categories */}
                {(selectedCategory === 'Top' || selectedCategory === 'Bottom' || selectedCategory === 'Misc') && (
                  <div
                    className={`item-card ${currentEquippedId === null ? 'equipped' : ''}`}
                    onClick={() => handleEquip(selectedCategory, null)}
                  >
                    <div className="item-preview none-preview">✕</div>
                    <span className="item-name">Ništa</span>
                  </div>
                )}

                {/* Available items - Show ALL items */}
                {availableItems.length > 0 ? (
                  availableItems.map((item) => {
                  const isEquipped = currentEquippedId === item.id;
                  // Item is available if it's free OR owned
                  const isOwned = ownedItemIds.has(item.id) || item.priceHearts === 0;
                  // Item is free if priceHearts === 0
                  const isFree = item.priceHearts === 0;

                  return (
                    <div
                      key={item.id}
                      className={`item-card ${isEquipped ? 'equipped' : ''} ${!isOwned ? 'locked' : ''}`}
                      onClick={() => {
                        if (isOwned) {
                          handleEquip(selectedCategory, item.id);
                        }
                      }}
                      style={{
                        cursor: isOwned ? 'pointer' : 'not-allowed',
                        opacity: isOwned ? 1 : 0.6,
                      }}
                    >
                      {!isOwned && (
                        <div className="lock-overlay">
                          <span className="lock-icon">🔒</span>
                        </div>
                      )}
                      <img 
                        src={item.assetPath || ''} 
                        alt={item.name}
                        className="item-preview"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                        }}
                      />
                      <span className="item-name">{item.name}</span>
                      {isEquipped && <span className="equipped-badge">Opremljeno</span>}
                      {!isFree && !isOwned && (
                        <span className="price-badge">
                          {item.priceHearts} ❤️
                        </span>
                      )}
                      {isFree && (
                        <span className="free-badge" style={{ color: '#4CAF50', fontSize: '12px' }}>
                          Besplatno
                        </span>
                      )}
                    </div>
                  );
                  })
                ) : (
                  <div className="empty-category">
                    <p>Nema dostupnih predmeta u ovoj kategoriji.</p>
                  </div>
                )}
            </div>

            {availableItems.length === 0 && (
              <div className="empty-category">
                <p>Nemaš još predmeta u ovoj kategoriji.</p>
                <button 
                  className="shop-link-button"
                  onClick={() => navigate('/shop')}
                >
                  Idi u Shop →
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

function getCategoryLabel(category: AvatarSlot): string {
  const labels: Record<AvatarSlot, string> = {
    Base: 'Tijelo',
    Hair: 'Kosa',
    Eyes: 'Oči',
    Eyebrows: 'Obrve',
    Mouth: 'Usta',
    Top: 'Majica',
    Bottom: 'Hlače',
    Misc: 'Efekti',
  };
  return labels[category] || category;
}

export default AvatarEditorPage;
