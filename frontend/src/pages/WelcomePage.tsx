import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import MetalIcon from '../components/metal-ui/MetalIcon';
import { CandyAssets } from '../assetsIndex';
import '../styles/WelcomePage.css';

const WelcomePage = () => {
  const [name, setName] = useState('');
  const [showSpecialMessage, setShowSpecialMessage] = useState(false);
  const [nameFocused, setNameFocused] = useState(false);
  const navigate = useNavigate();

  const handleNameFocus = () => {
    if (!nameFocused) {
      setNameFocused(true);
      setName('Lanči');
      setShowSpecialMessage(true);
      
      // Hide message after 5 seconds
      setTimeout(() => {
        setShowSpecialMessage(false);
      }, 5000);
    }
  };

  const handleContinue = () => {
    if (name.trim()) {
      // Store name in sessionStorage to use during registration
      sessionStorage.setItem('pendingName', name.trim());
      navigate('/register');
    }
  };

  return (
    <div className="welcome-page">
      <div className="welcome-container">
        <h1 className="welcome-title">
          <MetalIcon src={CandyAssets.hearts.find(h => h.includes('white')) || CandyAssets.hearts[0]} size={32} alt="Heart" />
          {' '}Dobrodošla u tvoju igricu ljubavi{' '}
          <MetalIcon src={CandyAssets.hearts.find(h => h.includes('white')) || CandyAssets.hearts[0]} size={32} alt="Heart" />
        </h1>
        
        <div className="name-input-container">
          <label htmlFor="name-input" className="name-label">
            Kako želiš da te zovem u igrici?
          </label>
          <input
            id="name-input"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onFocus={handleNameFocus}
            placeholder="Unesi svoje ime..."
            className="name-input"
            maxLength={20}
          />
          {showSpecialMessage && (
            <div className="special-message">
              Ti ćeš biti uvijek moja Lanči, pa i u mojoj igrici ❤️
            </div>
          )}
        </div>

        <button 
          onClick={handleContinue}
          disabled={!name.trim()}
          className="continue-button"
        >
          Nastavi
        </button>

        <div className="welcome-footer">
          <p>Već imaš račun?</p>
          <button 
            onClick={() => navigate('/login')}
            className="link-button"
          >
            Uloguj se
          </button>
        </div>
      </div>
    </div>
  );
};

export default WelcomePage;

