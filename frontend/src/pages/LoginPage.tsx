import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import '../styles/AuthPage.css';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      await login(email, password);
      navigate('/love-map');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Greška pri prijavljivanju');
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <h1 className="auth-title">Dobrodošla nazad, Lanči 💖</h1>
        
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tvoj@email.com"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Lozinka</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Tvoja lozinka"
              required
            />
          </div>

          {error && <div className="error-message">{error}</div>}

          <button type="submit" className="auth-button">
            Uloguj se
          </button>
        </form>

        <div className="auth-footer">
          <p>Nemaš račun?</p>
          <button 
            onClick={() => navigate('/register')}
            className="link-button"
          >
            Registruj se
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;

