import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import '../styles/AdminPage.css';

interface User {
  id: string;
  email: string;
  displayName: string;
  createdAt: string;
  updatedAt: string;
}

const AdminPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await api.get('/auth/users');
      setUsers(response.data);
      setError('');
    } catch (err: any) {
      console.error('Failed to fetch users:', err);
      setError(err.response?.data?.error || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('bs-BA', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="admin-page">
        <div className="loading-message">Učitavanje korisnika...</div>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <div className="admin-header">
        <button className="back-button" onClick={() => navigate('/love-map')}>
          ← Nazad
        </button>
        <h1>Korisnici</h1>
        <button className="refresh-button" onClick={fetchUsers}>
          🔄 Osvježi
        </button>
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      <div className="users-container">
        <div className="users-header">
          <div className="users-count">Ukupno korisnika: {users.length}</div>
        </div>

        <div className="users-list">
          {users.length === 0 ? (
            <div className="no-users">Nema korisnika</div>
          ) : (
            <table className="users-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Ime</th>
                  <th>Email</th>
                  <th>Kreiran</th>
                  <th>Ažuriran</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td className="user-id">{user.id.substring(0, 8)}...</td>
                    <td className="user-name">{user.displayName}</td>
                    <td className="user-email">{user.email}</td>
                    <td className="user-date">{formatDate(user.createdAt)}</td>
                    <td className="user-date">{formatDate(user.updatedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminPage;
