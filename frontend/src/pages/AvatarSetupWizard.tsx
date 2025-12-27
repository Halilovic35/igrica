// First-time avatar creation wizard for Keri character
// User selects base, hair, eyes, eyebrows, mouth, and optionally top/bottom

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import { 
  AVATAR_BODIES, 
  HAIR_STYLES, 
  EYE_STYLES, 
  EYEBROWS, 
  MOUTHS,
  TOPS,
  BOTTOMS,
  AvatarSlot,
  AvatarItem
} from '../features/avatar/AvatarAssets';
import LayeredAvatarRenderer from '../features/avatar/LayeredAvatarRenderer';
import '../styles/AvatarSetupWizard.css';

const AvatarSetupWizard = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1=base, 2=hair, 3=eyes, 4=eyebrows, 5=mouth, 6=clothing (optional)
  const [saving, setSaving] = useState(false);
  const [showJokeMessage, setShowJokeMessage] = useState(false);
  
  // Selected items
  const [selectedBase, setSelectedBase] = useState<string>('base_1');
  const [selectedHair, setSelectedHair] = useState<string>('hair_1_1');
  const [selectedEyes, setSelectedEyes] = useState<string>('eyes_1_1');
  const [selectedEyebrows, setSelectedEyebrows] = useState<string>('eyebrows_1');
  const [selectedMouth, setSelectedMouth] = useState<string>('mouth_1');
  const [selectedTop, setSelectedTop] = useState<string | null>('top_1_1'); // Default top
  const [selectedBottom, setSelectedBottom] = useState<string | null>('bottom_1_1'); // Default bottom

  // No longer using dropdown selectors - all items are selected directly from grid

  useEffect(() => {
    checkAvatar();
  }, []);

  // Auto-close joke message after 5 seconds
  useEffect(() => {
    if (showJokeMessage) {
      const timer = setTimeout(() => {
        setShowJokeMessage(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [showJokeMessage]);

  // Hair is now selected directly from grid, no need for style/color state
  
  // Helper function to render item grid with locked items
  const renderItemGrid = (
    items: AvatarItem[],
    selectedId: string,
    onSelect: (id: string) => void,
    hintMessage?: string
  ) => {
    return (
      <div className="wizard-step">
        {hintMessage && (
          <p className="wizard-hint" style={{ marginBottom: '20px', color: '#ff7bc6', fontWeight: 600 }}>
            {hintMessage}
          </p>
        )}
        <div className="item-grid">
          {items.map((item: AvatarItem) => {
            const isFree = item.priceHearts === 0;
            const isSelected = selectedId === item.id;
            return (
              <div
                key={item.id}
                className={`item-option ${isSelected ? 'selected' : ''} ${!isFree ? 'locked' : ''}`}
                onClick={() => {
                  if (isFree) {
                    onSelect(item.id);
                  }
                }}
                style={{
                  cursor: isFree ? 'pointer' : 'not-allowed',
                  opacity: isFree ? 1 : 0.6,
                }}
              >
                {!isFree && (
                  <div className="lock-overlay">
                    <span className="lock-icon">🔒</span>
                  </div>
                )}
                <img src={item.assetPath} alt={item.name} className="item-preview" />
                <span className="item-name">{item.name}</span>
                {!isFree && (
                  <span className="price-badge" style={{ color: '#ff7bc6', fontSize: '12px', marginTop: '5px' }}>
                    {item.priceHearts} ❤️
                  </span>
                )}
                {isFree && (
                  <span className="free-badge" style={{ color: '#4CAF50', fontSize: '12px', marginTop: '5px' }}>
                    Besplatno
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // All items are now selected directly from grid, no need for style/variant state

  const checkAvatar = async () => {
    try {
      const response = await api.get('/avatar');
      const avatar = response.data;
      // If avatar exists and has baseBodyId, redirect to map
      // If avatar is null, stay on wizard
      if (avatar && avatar.baseBodyId) {
        navigate('/love-map');
      }
    } catch (error) {
      // Avatar doesn't exist, start wizard
      console.log('No avatar found, starting wizard');
    }
  };

  const handleNext = () => {
    if (step < 6) {
      setStep(step + 1);
    } else {
      handleFinish();
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleFinish = async () => {
    setSaving(true);
    try {
      await api.put('/avatar', {
        baseBodyId: selectedBase,
        equippedItems: {
          Base: selectedBase,
          Hair: selectedHair,
          Eyes: selectedEyes,
          Eyebrows: selectedEyebrows,
          Mouth: selectedMouth,
          Top: selectedTop || 'top_1_1', // Default top if not selected
          Bottom: selectedBottom || 'bottom_1_1', // Default bottom if not selected
          Misc: null,
        },
      });

      // Trigger avatar update event
      window.dispatchEvent(new Event('avatar-updated'));

      // Navigate to intro sequence
      navigate('/intro');
    } catch (error) {
      console.error('Failed to save avatar:', error);
      alert('Greška pri čuvanju avatara');
    } finally {
      setSaving(false);
    }
  };

  // Preview avatar data
  const previewAvatar = {
    baseBodyId: selectedBase,
    equippedItems: {
      Base: selectedBase,
      Hair: selectedHair,
      Eyes: selectedEyes,
      Eyebrows: selectedEyebrows,
      Mouth: selectedMouth,
      Top: selectedTop || 'top_1_1',
      Bottom: selectedBottom || 'bottom_1_1',
      Misc: null,
    } as Record<AvatarSlot, string | null>,
  };

  const getStepTitle = () => {
    switch (step) {
      case 1: return 'Izaberi boju kože';
      case 2: return 'Izaberi frizuru';
      case 3: return 'Izaberi oči';
      case 4: return 'Izaberi obrve';
      case 5: return 'Izaberi usta';
      case 6: return 'Izaberi odjeću (opciono)';
      default: return '';
    }
  };

  return (
    <div className="avatar-setup-wizard">
      {/* Joke message overlay */}
      {showJokeMessage && (
        <div className="joke-message-overlay" onClick={() => setShowJokeMessage(false)}>
          <div className="joke-message" onClick={(e) => e.stopPropagation()}>
            <p>aha znaci lozis se i na crne zene !? 😏</p>
          </div>
        </div>
      )}
      <div className="wizard-container">
        <h1 className="wizard-title">Kreiraj svoj Cikac 💖</h1>
        <div className="wizard-progress">
          {[1, 2, 3, 4, 5, 6].map((s) => (
            <div key={s} className={`progress-step ${step >= s ? 'active' : ''}`}>
              <span className="step-number">{s}</span>
            </div>
          ))}
        </div>

        <h2 className="step-title">{getStepTitle()}</h2>

        {/* Avatar Preview */}
        <div className="avatar-preview-section">
          <LayeredAvatarRenderer avatar={previewAvatar} size="small" />
        </div>

        {/* Step 1: Base */}
        {step === 1 && (
          <div className="wizard-step">
            <div className="item-grid">
              {AVATAR_BODIES.map((body) => (
                <div
                  key={body.id}
                  className={`item-option ${selectedBase === body.id ? 'selected' : ''}`}
                  onClick={() => {
                    setSelectedBase(body.id);
                    // Show joke message for Base 5
                    if (body.id === 'base_5') {
                      setShowJokeMessage(true);
                    }
                  }}
                >
                  <img src={body.assetPath} alt={body.name} className="item-preview" />
                  <span className="item-name">{body.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Hair */}
        {step === 2 && (
          <div className="wizard-step">
            <p className="wizard-hint" style={{ marginBottom: '20px', color: '#ff7bc6', fontWeight: 600 }}>
              💡 Kosa se kupuje u shopu! Ovdje možeš vidjeti sve opcije, ali samo prva je besplatna.
            </p>
            <div className="item-grid">
              {HAIR_STYLES.map((hair: AvatarItem) => {
                const isFree = hair.priceHearts === 0;
                const isSelected = selectedHair === hair.id;
                return (
                  <div
                    key={hair.id}
                    className={`item-option ${isSelected ? 'selected' : ''} ${!isFree ? 'locked' : ''}`}
                    onClick={() => {
                      if (isFree) {
                        setSelectedHair(hair.id);
                      }
                    }}
                    style={{
                      cursor: isFree ? 'pointer' : 'not-allowed',
                      opacity: isFree ? 1 : 0.6,
                    }}
                  >
                    {!isFree && (
                      <div className="lock-overlay">
                        <span className="lock-icon">🔒</span>
                      </div>
                    )}
                    <img src={hair.assetPath} alt={hair.name} className="item-preview" />
                    <span className="item-name">{hair.name}</span>
                    {!isFree && (
                      <span className="price-badge" style={{ color: '#ff7bc6', fontSize: '12px', marginTop: '5px' }}>
                        {hair.priceHearts} ❤️
                      </span>
                    )}
                    {isFree && (
                      <span className="free-badge" style={{ color: '#4CAF50', fontSize: '12px', marginTop: '5px' }}>
                        Besplatno
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 3: Eyes */}
        {step === 3 && renderItemGrid(
          EYE_STYLES,
          selectedEyes,
          (id) => setSelectedEyes(id),
          '💡 Oči se kupuju u shopu! Ovdje možeš vidjeti sve opcije, ali samo prva je besplatna.'
        )}

        {/* Step 4: Eyebrows */}
        {step === 4 && renderItemGrid(
          EYEBROWS,
          selectedEyebrows,
          (id) => setSelectedEyebrows(id),
          '💡 Obrve se kupuju u shopu! Ovdje možeš vidjeti sve opcije, ali samo prva je besplatna.'
        )}

        {/* Step 5: Mouth */}
        {step === 5 && renderItemGrid(
          MOUTHS,
          selectedMouth,
          (id) => setSelectedMouth(id),
          '💡 Usta se kupuju u shopu! Ovdje možeš vidjeti sve opcije, ali samo prva je besplatna.'
        )}

        {/* Step 6: Clothing (Optional) */}
        {step === 6 && (
          <div className="wizard-step">
            <p className="wizard-hint" style={{ marginBottom: '20px', color: '#ff7bc6', fontWeight: 600 }}>
              💡 Odjeća se kupuje u shopu! Ovdje možeš vidjeti sve opcije, ali samo prva majica i hlače su besplatne.
            </p>
            
            <h3 style={{ color: '#fff', fontSize: '20px', marginBottom: '15px', marginTop: '20px' }}>Majica (opciono)</h3>
            <div className="item-grid">
              {/* "None" option */}
              <div
                className={`item-option ${!selectedTop || selectedTop === '' ? 'selected' : ''}`}
                onClick={() => setSelectedTop(null)}
                style={{ cursor: 'pointer' }}
              >
                <div className="item-preview" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '40px' }}>✕</div>
                <span className="item-name">Ništa</span>
              </div>
              
              {/* Top items */}
              {TOPS.map((item: AvatarItem) => {
                const isFree = item.priceHearts === 0;
                const isSelected = selectedTop === item.id;
                return (
                  <div
                    key={item.id}
                    className={`item-option ${isSelected ? 'selected' : ''} ${!isFree ? 'locked' : ''}`}
                    onClick={() => {
                      if (isFree) {
                        setSelectedTop(item.id);
                      }
                    }}
                    style={{
                      cursor: isFree ? 'pointer' : 'not-allowed',
                      opacity: isFree ? 1 : 0.6,
                    }}
                  >
                    {!isFree && (
                      <div className="lock-overlay">
                        <span className="lock-icon">🔒</span>
                      </div>
                    )}
                    <img src={item.assetPath} alt={item.name} className="item-preview" />
                    <span className="item-name">{item.name}</span>
                    {!isFree && (
                      <span className="price-badge" style={{ color: '#ff7bc6', fontSize: '12px', marginTop: '5px' }}>
                        {item.priceHearts} ❤️
                      </span>
                    )}
                    {isFree && (
                      <span className="free-badge" style={{ color: '#4CAF50', fontSize: '12px', marginTop: '5px' }}>
                        Besplatno
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            <h3 style={{ color: '#fff', fontSize: '20px', marginBottom: '15px', marginTop: '30px' }}>Hlače (opciono)</h3>
            <div className="item-grid">
              {/* "None" option */}
              <div
                className={`item-option ${!selectedBottom || selectedBottom === '' ? 'selected' : ''}`}
                onClick={() => setSelectedBottom(null)}
                style={{ cursor: 'pointer' }}
              >
                <div className="item-preview" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '40px' }}>✕</div>
                <span className="item-name">Ništa</span>
              </div>
              
              {/* Bottom items */}
              {BOTTOMS.map((item: AvatarItem) => {
                const isFree = item.priceHearts === 0;
                const isSelected = selectedBottom === item.id;
                return (
                  <div
                    key={item.id}
                    className={`item-option ${isSelected ? 'selected' : ''} ${!isFree ? 'locked' : ''}`}
                    onClick={() => {
                      if (isFree) {
                        setSelectedBottom(item.id);
                      }
                    }}
                    style={{
                      cursor: isFree ? 'pointer' : 'not-allowed',
                      opacity: isFree ? 1 : 0.6,
                    }}
                  >
                    {!isFree && (
                      <div className="lock-overlay">
                        <span className="lock-icon">🔒</span>
                      </div>
                    )}
                    <img src={item.assetPath} alt={item.name} className="item-preview" />
                    <span className="item-name">{item.name}</span>
                    {!isFree && (
                      <span className="price-badge" style={{ color: '#ff7bc6', fontSize: '12px', marginTop: '5px' }}>
                        {item.priceHearts} ❤️
                      </span>
                    )}
                    {isFree && (
                      <span className="free-badge" style={{ color: '#4CAF50', fontSize: '12px', marginTop: '5px' }}>
                        Besplatno
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="wizard-actions">
          {step > 1 && (
            <button className="wizard-button secondary" onClick={handleBack}>
              ← Nazad
            </button>
          )}
          <button 
            className="wizard-button"
            onClick={handleNext}
            disabled={saving}
          >
            {step === 6 ? (saving ? 'Čuvanje...' : 'Završi i nastavi') : 'Nastavi →'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AvatarSetupWizard;
