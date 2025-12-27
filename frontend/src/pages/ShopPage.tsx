import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import { AvatarSlot, getItemById } from '../features/avatar/AvatarAssets';
import MetalIcon, { MetalIcons } from '../components/metal-ui/MetalIcon';
import '../styles/ShopPage.css';

interface ShopItem {
  id: string;
  type: string;
  name: string;
  priceHearts: number;
  assetPath?: string;
  assetKey?: string | null;
  rarity?: string;
  slot?: string;
  owned: boolean;
}

const ShopPage = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState<ShopItem[]>([]);
  const [hearts, setHearts] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState<'ALL' | AvatarSlot>('ALL');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [previewItem, setPreviewItem] = useState<ShopItem | null>(null);

  useEffect(() => {
    fetchShopData();
  }, []);

  const fetchShopData = async () => {
    try {
      const [itemsResponse, statsResponse] = await Promise.all([
        api.get('/shop/items'),
        api.get('/stats'),
      ]);
      
      // Map items: convert type to slot if slot is missing, and ensure assetPath is set
      const mappedItems = itemsResponse.data.map((item: any) => {
        // If slot is missing, map from type
        let slot = item.slot;
        if (!slot) {
          const typeToSlotMap: Record<string, AvatarSlot> = {
            'BODY': 'Base',
            'HAIR': 'Hair',
            'EYES': 'Eyes',
            'EYEBROWS': 'Eyebrows',
            'MOUTH': 'Mouth',
            'TOP': 'Top',
            'BOTTOM': 'Bottom',
            'MISC': 'Misc',
            // Legacy mappings
            'OUTFIT': 'Top',
            'HEAD_ACCESSORY': 'Hair',
            'AURA': 'Misc',
            'EFFECT': 'Misc',
          };
          slot = typeToSlotMap[item.type] || null;
        }
        
        // Get assetPath from AvatarAssets if missing
        let assetPath = item.assetPath;
        if (!assetPath && item.id) {
          try {
            const avatarItem = getItemById(item.id);
            if (avatarItem) {
              assetPath = avatarItem.assetPath;
            }
          } catch (e) {
            console.warn('Could not load assetPath from AvatarAssets for item:', item.id);
          }
        }
        
        // If still no assetPath, use placeholder
        if (!assetPath) {
          assetPath = '/assets/ui/basic/icon panel big.png';
        }
        
        return {
          ...item,
          slot: slot || item.slot,
          assetPath: assetPath || item.assetPath,
        };
      });
      
      setItems(mappedItems);
      setHearts(statsResponse.data.heartsBalance || 0);
    } catch (error) {
      console.error('Failed to fetch shop data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBuy = async (item: ShopItem) => {
    if (item.owned) return;

    if (hearts < item.priceHearts) {
      setError('Treba ti još malo ljubavi da ovo otključaš 😉');
      setTimeout(() => setError(''), 3000);
      return;
    }

    try {
      const response = await api.post('/shop/buy', { itemId: item.id });
      // Update hearts immediately from response
      if (response.data.heartsBalance !== undefined) {
        setHearts(response.data.heartsBalance);
      }
      await fetchShopData();
      setError('');
    } catch (err: any) {
      const message = err.response?.data?.message || err.response?.data?.error || 'Greška pri kupovini';
      setError(message);
      setTimeout(() => setError(''), 3000);
    }
  };

  const openPreview = (item: ShopItem) => {
    setPreviewItem(item);
  };

  const closePreview = () => setPreviewItem(null);

  const handleEquip = async (item: ShopItem) => {
    if (!item.owned) return;

    try {
      // Use slot-based equip endpoint
      const slot = item.slot;
      if (!slot) {
        setError('Item nema definisan slot');
        setTimeout(() => setError(''), 3000);
        return;
      }
      
      await api.post('/avatar/equip', { slot, itemId: item.id });
      await fetchShopData();
      // Force reload avatar
        window.dispatchEvent(new Event('avatar-updated'));
      setError('');
    } catch (error) {
      console.error('Failed to equip item:', error);
      setError('Greška pri opremanju');
      setTimeout(() => setError(''), 3000);
    }
  };

  // Filter items - only show paid items (priceHearts > 0)
  const filteredItems = selectedCategory === 'ALL' 
    ? items.filter(item => item.priceHearts > 0)
    : items.filter(item => {
        // Filter by slot (preferred) or type (fallback)
        const matchesSlot = item.slot === selectedCategory;
        const matchesType = item.type === selectedCategory;
        return (matchesSlot || matchesType) && item.priceHearts > 0;
      });

  if (loading) {
    return (
      <div className="shop-page">
        <div className="loading-message">Učitavanje...</div>
      </div>
    );
  }

  return (
    <div className="shop-page">
      <div className="shop-header">
        <button onClick={() => navigate('/love-map')} className="shop-back">
          ← Nazad
        </button>
        <h1 className="shop-title">Shop 💝</h1>
        <div className="hearts-display shop-hearts">
          <MetalIcon src={MetalIcons.heartFilled} size={18} alt="Heart" className="hearts-icon" noInlineStyles={true} />
          <span className="hearts-count">{hearts.toLocaleString('bs-BA')}</span>
        </div>
      </div>

      {error && (
        <div className="error-banner">
          {error}
        </div>
      )}

      <div className="shop-content">
        {/* Category Filter */}
        <div className="category-tabs">
          <button
            className={`category-tab ${selectedCategory === 'ALL' ? 'active' : ''}`}
            onClick={() => setSelectedCategory('ALL')}
          >
            Sve
          </button>
          <button
            className={`category-tab ${selectedCategory === 'Hair' ? 'active' : ''}`}
            onClick={() => setSelectedCategory('Hair')}
          >
            Kosa
          </button>
          <button
            className={`category-tab ${selectedCategory === 'Eyes' ? 'active' : ''}`}
            onClick={() => setSelectedCategory('Eyes')}
          >
            Oči
          </button>
          <button
            className={`category-tab ${selectedCategory === 'Top' ? 'active' : ''}`}
            onClick={() => setSelectedCategory('Top')}
          >
            Majice
          </button>
          <button
            className={`category-tab ${selectedCategory === 'Bottom' ? 'active' : ''}`}
            onClick={() => setSelectedCategory('Bottom')}
          >
            Hlače
          </button>
          <button
            className={`category-tab ${selectedCategory === 'Misc' ? 'active' : ''}`}
            onClick={() => setSelectedCategory('Misc')}
          >
            Efekti
          </button>
        </div>

        {/* Items Grid */}
        <div className="items-grid">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className={`shop-item ${item.owned ? 'owned' : ''} ${item.rarity || 'common'}`}
              onClick={() => openPreview(item)}
            >
              <div className="item-preview">
                {item.assetPath ? (
                  <>
                    <img 
                      src={item.assetPath} 
                      alt={item.name}
                      className="item-image"
                      onError={(e) => {
                        // Fallback to placeholder if image fails to load
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        const placeholder = target.nextElementSibling as HTMLElement;
                        if (placeholder && placeholder.classList.contains('item-placeholder')) {
                          placeholder.style.display = 'flex';
                        }
                      }}
                    />
                    <div className="item-placeholder" style={{ display: 'none' }}>
                      {item.slot === 'Hair' && '💇'}
                      {item.slot === 'Eyes' && '👁️'}
                      {item.slot === 'Top' && '👕'}
                      {item.slot === 'Bottom' && '👖'}
                      {item.slot === 'Misc' && '✨'}
                      {!item.slot && '❓'}
                    </div>
                  </>
                ) : (
                  <div className="item-placeholder">
                    {item.slot === 'Hair' && '💇'}
                    {item.slot === 'Eyes' && '👁️'}
                    {item.slot === 'Top' && '👕'}
                    {item.slot === 'Bottom' && '👖'}
                    {item.slot === 'Misc' && '✨'}
                    {!item.slot && '❓'}
                  </div>
                )}
                {item.rarity && (
                  <span className={`rarity-badge ${item.rarity}`}>
                    {item.rarity === 'common' && '●'}
                    {item.rarity === 'rare' && '◆'}
                    {item.rarity === 'epic' && '★'}
                    {item.rarity === 'legendary' && '✦'}
                  </span>
                )}
              </div>
              <div className="item-info">
                <h3 className="item-name">{item.name}</h3>
                <div className="item-price">
                  {item.priceHearts} ❤️
                </div>
              </div>
              <div className="item-actions">
                {item.owned ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      // Owned items prikazujemo kao kupljene; nema dodatne akcije
                    }}
                    className="owned-button"
                    disabled
                  >
                    Kupljeno
                  </button>
                ) : (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleBuy(item);
                    }}
                    className={`buy-button ${hearts < item.priceHearts ? 'disabled' : ''}`}
                    disabled={hearts < item.priceHearts}
                  >
                    Kupi
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {filteredItems.length === 0 && (
          <div className="empty-state">
            <p>Nema dostupnih proizvoda u ovoj kategoriji.</p>
          </div>
        )}
      </div>

      {previewItem && (
        <div className="preview-overlay" onClick={closePreview}>
          <div className="preview-card" onClick={(e) => e.stopPropagation()}>
            <button className="preview-close" onClick={closePreview}>✕</button>
            <div className="preview-image">
              <img src={previewItem.assetPath} alt={previewItem.name} />
            </div>
            <div className="preview-info">
              <h3>{previewItem.name}</h3>
              <div className="preview-price">
                <MetalIcon src={MetalIcons.heartFilled} size={18} alt="Heart" className="hearts-icon" noInlineStyles={true} />
                <span>{previewItem.priceHearts}</span>
              </div>
              <div className="preview-actions">
                {previewItem.owned ? (
                  <button className="equip-button" onClick={() => { handleEquip(previewItem); closePreview(); }}>
                    Opremi
                  </button>
                ) : (
                  <button
                    className={`buy-button ${hearts < previewItem.priceHearts ? 'disabled' : ''}`}
                    disabled={hearts < previewItem.priceHearts}
                    onClick={() => { handleBuy(previewItem); closePreview(); }}
                  >
                    Kupi
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShopPage;
