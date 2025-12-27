import { useParams, useNavigate } from 'react-router-dom';
import CandyHeartsGame from '../games/CandyHeartsGame';
import BlockPuzzleGame from '../games/BlockPuzzleGame';
import RunnerGame from '../games/RunnerGame';
import DartGame from '../games/DartGame';
import '../styles/LevelPage.css';

const LevelPage = () => {
  const { levelCode } = useParams<{ levelCode: string }>();
  const navigate = useNavigate();

  const renderGame = () => {
    switch (levelCode) {
      case 'level_1_candy':
        return <CandyHeartsGame onComplete={() => navigate('/love-map', { state: { fromLevel: true } })} />;
      case 'level_2_block_puzzle':
        return <BlockPuzzleGame onComplete={() => navigate('/love-map', { state: { fromLevel: true } })} />;
      case 'level_3_runner':
        return <RunnerGame onComplete={() => navigate('/love-map', { state: { fromLevel: true } })} />;
      case 'level_3_dart':
        return <DartGame onComplete={() => navigate('/love-map', { state: { fromLevel: true } })} />;
      // Keep old codes for backward compatibility
      case 'level_2_save_me':
        return <BlockPuzzleGame onComplete={() => navigate('/love-map')} />;
      case 'level_3_running_heart':
        return <RunnerGame onComplete={() => navigate('/love-map')} />;
      default:
        return (
          <div className="level-not-found">
            <h2>Nivo nije pronađen</h2>
            <button onClick={() => navigate('/love-map')}>Nazad na mapu</button>
          </div>
        );
    }
  };

  return (
    <div className="level-page">
      {renderGame()}
    </div>
  );
};

export default LevelPage;

