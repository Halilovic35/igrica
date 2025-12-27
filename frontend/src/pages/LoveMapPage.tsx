import { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import LoveMap from '../features/map/LoveMap';
import '../styles/LoveMapPage.css';

interface Level {
  id: string;
  code: string;
  name: string;
  orderIndex: number;
  heartsRewardDefault: number;
  completed: boolean;
  unlocked: boolean;
  bestScore: number | null;
}

const LoveMapPage = () => {
  const { user, fetchUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [levels, setLevels] = useState<Level[]>([]);
  const [hearts, setHearts] = useState(0);
  const [loading, setLoading] = useState(true);
  const [fadeIn, setFadeIn] = useState(false);

  useEffect(() => {
    checkAvatarAndRedirect();
    fetchLevels();
    fetchStats();
    
    // If coming from intro, refresh stats immediately to get updated hearts
    const introCompleted = localStorage.getItem('introCompleted');
    const storedHearts = localStorage.getItem('introHeartsCount');
    
    if (introCompleted === 'true') {
      // Use stored hearts count if available
      if (storedHearts) {
        const heartsCount = parseInt(storedHearts, 10);
        console.log('Using stored hearts count from intro:', heartsCount);
        setHearts(heartsCount);
        localStorage.removeItem('introHeartsCount');
      }
      
      // Immediate fetch with retry logic
      const fetchWithRetry = async (retries = 5, delay = 200) => {
        for (let i = 0; i < retries; i++) {
          const hearts = await fetchStats();
          console.log(`Hearts fetch attempt ${i + 1}:`, hearts);
          if (hearts >= 30) {
            setHearts(hearts);
            console.log('Successfully loaded hearts:', hearts);
            return;
          }
          if (i < retries - 1) {
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
        // Final attempt
        const finalHearts = await fetchStats();
        console.log('Final hearts fetch:', finalHearts);
        if (finalHearts > 0) {
          setHearts(finalHearts);
        }
      };
      
      fetchWithRetry();
    }
    
    // Also check if coming from level (in case location.state is not set)
    const state = location.state as { fromLevel?: boolean } | null;
    if (state?.fromLevel) {
      console.log('Detected fromLevel in initial mount, refreshing levels...');
      setTimeout(() => {
        fetchLevels();
        fetchStats();
        fetchUser();
      }, 500);
    }
  }, []);

  const checkAvatarAndRedirect = async () => {
    try {
      const response = await api.get('/avatar');
      const avatar = response.data;
      // If avatar is null or doesn't have baseBodyId, redirect to setup
      if (!avatar || !avatar.baseBodyId) {
        navigate('/avatar-setup');
        return;
      }
    } catch (error) {
      // Avatar doesn't exist, redirect to setup
      navigate('/avatar-setup');
    }
  };

  const fetchLevels = async () => {
    try {
      const response = await api.get('/levels');
      console.log('Fetched levels:', response.data);
      setLevels(response.data);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch levels:', error);
      return [];
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await api.get('/stats');
      const heartsBalance = response.data.heartsBalance || 0;
      console.log('Fetched hearts from server:', heartsBalance);
      setHearts(heartsBalance);
      return heartsBalance;
    } catch (error) {
      console.error('Failed to fetch stats:', error);
      return 0;
    }
  };

  // Fade in when coming from intro
  useEffect(() => {
    const introCompleted = localStorage.getItem('introCompleted');
    if (introCompleted === 'true') {
      setTimeout(() => {
        setFadeIn(true);
      }, 100);
    } else {
      setFadeIn(true);
    }
  }, []);

  // Refresh hearts periodically
  useEffect(() => {
    const interval = setInterval(() => {
      fetchStats();
    }, 5000);
    return () => clearInterval(interval);
  }, []);
  
  // Ažuriraj level-e i stats kada se vratiš sa levela
  const hasRefreshedFromLevel = useRef(false);
  useEffect(() => {
    // Provjeri da li dolaziš sa level stranice
    const state = location.state as { fromLevel?: boolean } | null;
    console.log('Location state:', state, 'hasRefreshedFromLevel:', hasRefreshedFromLevel.current);
    if (state?.fromLevel && !hasRefreshedFromLevel.current) {
      // Ažuriraj level-e i stats kada se vratiš sa levela (samo jednom)
      console.log('Refreshing levels after returning from level...');
      // Dodaj malu pauzu da se osigura da je backend ažuriran
      setTimeout(async () => {
        console.log('Fetching levels after returning from level...');
        const levelsData = await fetchLevels();
        console.log('Fetched levels:', levelsData);
        await fetchStats();
        await fetchUser();
        console.log('Levels refreshed after returning from level');
        
        // Log level 2 and 3 status from fetched data
        const level2 = levelsData.find((l: any) => l.code === 'level_2_block_puzzle');
        const level3 = levelsData.find((l: any) => l.code === 'level_3_dart');
        console.log('Level 2 status:', level2 ? { completed: level2.completed, unlocked: level2.unlocked } : 'not found');
        console.log('Level 3 status:', level3 ? { completed: level3.completed, unlocked: level3.unlocked } : 'not found');
      }, 500);
      hasRefreshedFromLevel.current = true;
      
      // Resetuj flag nakon kratke pauze
      setTimeout(() => {
        hasRefreshedFromLevel.current = false;
      }, 3000);
    }
  }, [location.state]);

  if (loading) {
    return (
      <div className="love-map-page">
        <div className="loading-message">Učitavanje...</div>
      </div>
    );
  }

  return (
    <div style={{ opacity: fadeIn ? 1 : 0, transition: 'opacity 0.5s ease-in' }}>
    <LoveMap
      levels={levels}
      hearts={hearts}
      playerName={user?.displayName || 'Lanči'}
      onBack={() => navigate('/register')}
      onShop={() => navigate('/shop')}
      onAvatar={() => navigate('/avatar')}
      onOpenLevel={(code) => {
        navigate(`/level/${code}`);
      }}
    />
    </div>
  );
};

export default LoveMapPage;
