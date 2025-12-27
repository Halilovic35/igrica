import { useState, useEffect } from 'react';
import '../styles/PasswordGate.css';

const PASSWORD = '2908';
const STORAGE_KEY = 'lanci_loveverse_authenticated';

const PasswordGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    // Check if user is already authenticated
    const authenticated = sessionStorage.getItem(STORAGE_KEY) === 'true';
    setIsAuthenticated(authenticated);
    setIsChecking(false);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password === PASSWORD) {
      sessionStorage.setItem(STORAGE_KEY, 'true');
      setIsAuthenticated(true);
    } else {
      setError('Pogrešna šifra. Pokušaj ponovo.');
      setPassword('');
    }
  };

  if (isChecking) {
    return (
      <div className="password-gate">
        <div className="password-gate-container">
          <div className="password-gate-loading">Učitavanje...</div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="password-gate">
        <div className="password-gate-container">
          <div className="password-gate-header">
            <h1>🔒 Zaštićeno</h1>
            <p>Unesi šifru za pristup</p>
          </div>
          <form onSubmit={handleSubmit} className="password-gate-form">
            <input
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError('');
              }}
              placeholder="Unesi šifru..."
              className="password-gate-input"
              autoFocus
            />
            {error && <div className="password-gate-error">{error}</div>}
            <button type="submit" className="password-gate-button">
              Unesi
            </button>
          </form>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default PasswordGate;

