import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import '../styles/AuthPage.css';

const RegisterPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const { register } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Get name from sessionStorage (set in welcome page)
    const pendingName = sessionStorage.getItem('pendingName');
    if (pendingName) {
      setName(pendingName);
      sessionStorage.removeItem('pendingName');
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Lozinke se ne poklapaju');
      return;
    }

    if (password.length < 6) {
      setError('Lozinka mora imati najmanje 6 karaktera');
      return;
    }

    try {
      await register(email, password, name);
      // Redirect to avatar setup wizard for new users
      navigate('/avatar-setup');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Greška pri registraciji');
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <h1 className="auth-title">Kreiraj svoj račun 💖</h1>
        
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="name">Ime</label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Tvoje ime u igrici"
              required
            />
          </div>

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
              placeholder="Najmanje 6 karaktera"
              required
              minLength={6}
            />
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Potvrdi lozinku</label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Ponovi lozinku"
              required
            />
          </div>

          {error && <div className="error-message">{error}</div>}

          <button type="submit" className="auth-button">
            Registruj se
          </button>
        </form>

        <div className="auth-footer">
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

export default RegisterPage;

