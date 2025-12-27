import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import PasswordGate from './components/PasswordGate';
import WelcomePage from './pages/WelcomePage';
import RegisterPage from './pages/RegisterPage';
import LoginPage from './pages/LoginPage';
import LoveMapPage from './pages/LoveMapPage';
import AvatarCreatorPage from './pages/AvatarCreatorPage';
import AvatarSetupWizard from './pages/AvatarSetupWizard';
import AvatarEditorPage from './pages/AvatarEditorPage';
import ShopPage from './pages/ShopPage';
import LevelPage from './pages/LevelPage';
import IntroSequence from './pages/IntroSequence';
import AdminPage from './pages/AdminPage';

function App() {
  return (
    <PasswordGate>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<WelcomePage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/avatar"
              element={
                <ProtectedRoute>
                  <AvatarEditorPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/avatar-setup"
              element={
                <ProtectedRoute>
                  <AvatarSetupWizard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/intro"
              element={
                <ProtectedRoute>
                  <IntroSequence />
                </ProtectedRoute>
              }
            />
            <Route
              path="/avatar-creator"
              element={
                <ProtectedRoute>
                  <AvatarCreatorPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/love-map"
              element={
                <ProtectedRoute>
                  <LoveMapPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/shop"
              element={
                <ProtectedRoute>
                  <ShopPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/level/:levelCode"
              element={
                <ProtectedRoute>
                  <LevelPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <ProtectedRoute>
                  <AdminPage />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </PasswordGate>
  );
}

export default App;

