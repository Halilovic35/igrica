import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { CandyAssets } from '../assetsIndex';
import MetalButton from '../components/metal-ui/MetalButton';
import MetalIcon, { MetalIcons } from '../components/metal-ui/MetalIcon';
import MetalPopup from '../components/metal-ui/MetalPopup';
import { animateHeartsToTopBar } from '../utils/heartsAnimation';
import { useAuth } from '../contexts/AuthContext';
import '../styles/GamePage.css';
import '../styles/BlockPuzzleGame.css';

interface BlockPuzzleGameProps {
  onComplete: () => void;
}

type BlockShape = number[][]; // 2D array where 1 = filled, 0 = empty

interface Position {
  row: number;
  col: number;
}

const BOARD_SIZE = 10;
const CELL_SIZE = 40;
const GAP = 2;
const MAX_MOVES = 40;
const TARGET_LINES = 8; // Number of lines to clear to win

// Predefined block shapes (pieces)
const BLOCK_SHAPES: BlockShape[] = [
  // Single block
  [[1]],
  // 2-block pieces
  [[1, 1]], // Horizontal line
  [[1], [1]], // Vertical line
  // 3-block pieces
  [[1, 1, 1]], // Horizontal line
  [[1], [1], [1]], // Vertical line
  [[1, 1], [1, 0]], // L-shape
  [[1, 1], [0, 1]], // Reverse L-shape
  // 4-block pieces
  [[1, 1, 1, 1]], // Horizontal line
  [[1], [1], [1], [1]], // Vertical line
  [[1, 1], [1, 1]], // Square
  [[1, 1, 1], [1, 0, 0]], // L-shape
  [[1, 1, 1], [0, 0, 1]], // Reverse L-shape
  [[1, 1, 0], [0, 1, 1]], // Z-shape
  [[0, 1, 1], [1, 1, 0]], // Reverse Z-shape
  [[1, 1, 1], [0, 1, 0]], // T-shape
];

const BlockPuzzleGame: React.FC<BlockPuzzleGameProps> = ({ onComplete }) => {
  const navigate = useNavigate();
  const [board, setBoard] = useState<(number | null)[][]>([]);
  const [currentPieces, setCurrentPieces] = useState<BlockShape[]>([]);
  const [selectedPiece, setSelectedPiece] = useState<number | null>(null);
  const [selectedPosition, setSelectedPosition] = useState<Position | null>(null);
  const [movesLeft, setMovesLeft] = useState(MAX_MOVES);
  const [linesCleared, setLinesCleared] = useState(0);
  const [showWinModal, setShowWinModal] = useState(false);
  const [showLoseModal, setShowLoseModal] = useState(false);
  const [hearts, setHearts] = useState(0);
  const [showTopBar, setShowTopBar] = useState(false);
  const [heartsAnimating, setHeartsAnimating] = useState(false);
  const [animatedHeartsCount, setAnimatedHeartsCount] = useState(0);
  const { fetchUser } = useAuth();
  
  // Map za čuvanje boja srcadi za svaki blok (piece) - osigurava konzistentne boje
  const [pieceHeartColors, setPieceHeartColors] = useState<Map<number, string[]>>(new Map());

  // Initialize board
  useEffect(() => {
    const newBoard: (number | null)[][] = [];
    for (let i = 0; i < BOARD_SIZE; i++) {
      newBoard.push(new Array(BOARD_SIZE).fill(null));
    }
    setBoard(newBoard);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    generateNewPieces();
  }, []);

  // Fetch initial hearts
  useEffect(() => {
    const fetchHearts = async () => {
      try {
        const response = await api.get('/stats');
        setHearts(response.data.heartsBalance || 0);
      } catch (error) {
        console.error('Failed to fetch hearts:', error);
      }
    };
    fetchHearts();
  }, []);


  // Generate heart colors for a piece - konzistentne boje za svaki blok
  const generatePieceHeartColors = (piece: BlockShape, pieceIndex: number): string[] => {
    const heartImages = CandyAssets.hearts.filter(h => 
      h.includes('gem_heart') && !h.includes('outline')
    );
    const colors: string[] = [];
    let totalCells = 0;
    for (let i = 0; i < piece.length; i++) {
      for (let j = 0; j < piece[i].length; j++) {
        if (piece[i][j] === 1) {
          totalCells++;
        }
      }
    }
    // Generiraj fiksne boje za ovaj blok koristeći pieceIndex kao seed za konzistentnost
    // Koristi modulo da osiguraš da se boje ponavljaju na predvidljiv način
    const startIndex = pieceIndex * 3; // Različiti start za svaki blok
    for (let i = 0; i < totalCells; i++) {
      const colorIndex = (startIndex + i) % heartImages.length;
      colors.push(heartImages[colorIndex]);
    }
    return colors;
  };

  // Generate 3 random pieces
  const generateNewPieces = () => {
    const pieces: BlockShape[] = [];
    const newColorsMap = new Map<number, string[]>();
    
    for (let i = 0; i < 3; i++) {
      const randomIndex = Math.floor(Math.random() * BLOCK_SHAPES.length);
      const piece = BLOCK_SHAPES[randomIndex];
      pieces.push(piece);
      // Generiraj i sačuvaj boje za ovaj blok - koristi i kao seed za konzistentnost
      newColorsMap.set(i, generatePieceHeartColors(piece, i));
    }
    
    setCurrentPieces(pieces);
    setPieceHeartColors(newColorsMap);
    setSelectedPiece(null);
    setSelectedPosition(null);
  };

  // Check if piece can be placed at position
  const canPlacePiece = useCallback((piece: BlockShape, row: number, col: number): boolean => {
    if (row + piece.length > BOARD_SIZE || col + piece[0].length > BOARD_SIZE) {
      return false;
    }

    for (let i = 0; i < piece.length; i++) {
      for (let j = 0; j < piece[i].length; j++) {
        if (piece[i][j] === 1 && board[row + i]?.[col + j] !== null) {
          return false;
        }
      }
    }
    return true;
  }, [board]);

  // Place piece on board (ne ažurira state, samo vraća novi board)
  const placePiece = useCallback((piece: BlockShape, row: number, col: number, currentBoard: (number | null)[][]) => {
    const newBoard = currentBoard.map(row => [...row]);
    
    for (let i = 0; i < piece.length; i++) {
      for (let j = 0; j < piece[i].length; j++) {
        if (piece[i][j] === 1) {
          newBoard[row + i][col + j] = 1;
        }
      }
    }

    return newBoard;
  }, []);

  // Clear full lines (rows and columns) - ne ažurira state, samo vraća novi board i broj očišćenih linija
  const clearLines = useCallback((newBoard: (number | null)[][]) => {
    let cleared = 0;
    const boardCopy = newBoard.map(row => [...row]);

    // Clear full rows
    for (let i = 0; i < BOARD_SIZE; i++) {
      if (boardCopy[i].every(cell => cell !== null)) {
        boardCopy[i] = new Array(BOARD_SIZE).fill(null);
        cleared++;
      }
    }

    // Clear full columns
    for (let j = 0; j < BOARD_SIZE; j++) {
      let isFull = true;
      for (let i = 0; i < BOARD_SIZE; i++) {
        if (boardCopy[i][j] === null) {
          isFull = false;
          break;
        }
      }
      if (isFull) {
        for (let i = 0; i < BOARD_SIZE; i++) {
          boardCopy[i][j] = null;
        }
        cleared++;
      }
    }

    return { clearedBoard: boardCopy, cleared };
  }, []);

  // Handle piece selection
  const handlePieceClick = (pieceIndex: number) => {
    if (selectedPiece === pieceIndex) {
      setSelectedPiece(null);
      setSelectedPosition(null);
    } else {
      setSelectedPiece(pieceIndex);
      setSelectedPosition(null);
    }
  };

  // Handle board cell click
  const handleCellClick = (row: number, col: number) => {
    if (selectedPiece === null || selectedPiece >= currentPieces.length) return;

    const piece = currentPieces[selectedPiece];
    if (canPlacePiece(piece, row, col)) {
      // Place piece and clear lines
      const boardAfterPlace = placePiece(piece, row, col, board);
      const { clearedBoard, cleared } = clearLines(boardAfterPlace);
      
      // Calculate new values
      const newLinesCleared = linesCleared + cleared;
      const newMovesLeft = movesLeft - 1;
      
      // Update board and lines cleared
      setBoard(clearedBoard);
      setLinesCleared(newLinesCleared);
      
      // Remove used piece
      const newPieces = currentPieces.filter((_, i) => i !== selectedPiece);
      
      if (newPieces.length === 0) {
        generateNewPieces();
        setMovesLeft(newMovesLeft);
      } else {
        setCurrentPieces(newPieces);
        setSelectedPiece(null);
        setSelectedPosition(null);
        setMovesLeft(newMovesLeft);
      }

      // Check win condition
      if (newLinesCleared >= TARGET_LINES) {
        setTimeout(() => {
          handleWin();
        }, 500);
        return; // Ne provjeravaj gubitak ako je pobjeda
      }

      // Check lose condition - provjeri NAKON što se smanji broj poteza
      // VAŽNO: Igra se prekida čim dođe na 0 ili manje poteza
      if (newMovesLeft <= 0 && newLinesCleared < TARGET_LINES) {
        setTimeout(() => {
          handleLose();
        }, 500);
        return;
      }
    }
  };

  // Handle mouse hover on board
  const handleCellHover = (row: number, col: number) => {
    if (selectedPiece === null || selectedPiece >= currentPieces.length) return;
    const piece = currentPieces[selectedPiece];
    if (canPlacePiece(piece, row, col)) {
      setSelectedPosition({ row, col });
    } else {
      setSelectedPosition(null);
    }
  };

  const handleWin = async () => {
    console.log('handleWin called - starting level completion');
    setShowWinModal(true);
    setShowTopBar(true);
    
    try {
      console.log('Sending completion request for level_2_block_puzzle');
      const completeResponse = await api.post('/levels/complete', { levelCode: 'level_2_block_puzzle' });
      console.log('Level completion response:', completeResponse.data);
      
      // Wait a bit for backend to process
      await new Promise(resolve => setTimeout(resolve, 200));
      
      await fetchUser();
      console.log('User data refreshed');
      
      // Ažuriraj level-e u pozadini da se osigura da je level označen kao completed
      try {
        const levelsResponse = await api.get('/levels');
        console.log('Refreshed levels:', levelsResponse.data);
        const completedLevel = levelsResponse.data.find((l: any) => l.code === 'level_2_block_puzzle');
        console.log('Level 2 status after refresh:', completedLevel ? { completed: completedLevel.completed, unlocked: completedLevel.unlocked } : 'not found');
      } catch (error) {
        console.error('Failed to refresh levels:', error);
      }
      
      // Animate hearts
      setHeartsAnimating(true);
      const heartsToAnimate = 10;
      for (let i = 0; i <= heartsToAnimate; i++) {
        setTimeout(() => {
          setAnimatedHeartsCount(i);
          if (i === heartsToAnimate) {
            setHeartsAnimating(false);
            setHearts(prev => prev + heartsToAnimate);
          }
        }, i * 50);
      }

      // Animate hearts to top bar
      animateHeartsToTopBar(heartsToAnimate);
      console.log('Level completion process finished - waiting for user to click Nastavi');
    } catch (error: any) {
      console.error('Failed to complete level:', error);
      if (error.response) {
        console.error('Error response:', error.response.status, error.response.data);
      } else if (error.request) {
        console.error('Error request:', error.request);
      } else {
        console.error('Error message:', error.message);
      }
    }
  };

  const handleLose = () => {
    setShowLoseModal(true);
  };

  const handleRetry = () => {
    setShowLoseModal(false);
    setMovesLeft(MAX_MOVES);
    setLinesCleared(0);
    const newBoard: (number | null)[][] = [];
    for (let i = 0; i < BOARD_SIZE; i++) {
      newBoard.push(new Array(BOARD_SIZE).fill(null));
    }
    setBoard(newBoard);
    generateNewPieces();
  };

  const handleBack = () => {
    navigate('/love-map');
  };

  // Get heart image for a specific cell in a piece
  const getHeartImageForPiece = (pieceIndex: number, cellIndex: number): string => {
    const colors = pieceHeartColors.get(pieceIndex);
    if (colors && colors[cellIndex]) {
      return colors[cellIndex];
    }
    // Fallback ako nema boja
    const heartImages = CandyAssets.hearts.filter(h => 
      h.includes('gem_heart') && !h.includes('outline')
    );
    return heartImages[cellIndex % heartImages.length] || heartImages[0];
  };

  return (
    <div className="game-container">
      {/* Top Bar - shown after level completion */}
      {showTopBar && (
        <div className="game-top-bar" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: '56px',
          background: 'rgba(35, 0, 70, 0.6)',
          backdropFilter: 'blur(10px)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '10px',
          padding: '0 20px',
        }}>
          <MetalIcon src={MetalIcons.heartFilled} size={20} alt="Heart" />
          <span style={{ fontSize: '18px', fontWeight: 600, color: 'white' }}>
            {heartsAnimating ? Math.min(animatedHeartsCount, hearts + 10) : hearts}
          </span>
        </div>
      )}

      <div className="game-header">
        <MetalButton
          variant="wide"
          iconLeftSrc={MetalIcons.arrowLeft}
          onClick={handleBack}
          className="back-button"
        >
          Nazad
        </MetalButton>
        <h1>
          Blokovi ljubavi <MetalIcon src={MetalIcons.heartFilled} size={32} alt="Heart" />
        </h1>
        <div className="game-stats">
          <div className="stat">
            Linije: {linesCleared} / {TARGET_LINES}
          </div>
          <div className="stat">
            Potezi: {movesLeft} / {MAX_MOVES}
          </div>
        </div>
      </div>

      <div className="game-content-wrapper">
        {/* Instructions Panel - Left Side */}
        <div className="game-instructions">
          <h2>Kako igrati?</h2>
          <div className="instructions-content">
            <p>
              <strong>Cilj:</strong> Očisti {TARGET_LINES} linija (redova ili kolona) postavljanjem blokova na tablu!
            </p>
            <p>
              <strong>Kako:</strong>
            </p>
            <ol>
              <li>Klikni na jedan od blokova gore</li>
              <li>Zatim klikni na mjesto na tabli gdje želiš postaviti blok</li>
              <li>Kada popuniš cijeli red ili kolonu, ona će nestati</li>
              <li>Nastavi postavljati blokove dok ne očistiš {TARGET_LINES} linija</li>
            </ol>
            <p>
              <strong>Savjet:</strong> Planiraj unaprijed! Pokušaj postaviti blokove tako da formiraš linije.
            </p>
            <div className="instructions-goals">
              <p><strong>Tvoj cilj:</strong></p>
              <ul>
                <li className={linesCleared >= TARGET_LINES ? 'goal-completed' : ''}>
                  {linesCleared >= TARGET_LINES ? '✓' : '○'} Očisti {TARGET_LINES} linija ({linesCleared}/{TARGET_LINES})
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Game Area - Right Side */}
        <div className="block-puzzle-game-area">
          {/* Available Pieces */}
          <div className="pieces-container">
            <h3>Dostupni blokovi:</h3>
            <div className="pieces-grid">
              {currentPieces.map((piece, index) => (
                <div
                  key={index}
                  className={`piece-preview ${selectedPiece === index ? 'selected' : ''}`}
                  onClick={() => handlePieceClick(index)}
                >
                  {piece.map((row, i) => {
                    let cellIndex = 0;
                    // Prebroji koliko ćelija je bilo prije ovog reda
                    for (let prevRow = 0; prevRow < i; prevRow++) {
                      for (let prevCol = 0; prevCol < piece[prevRow].length; prevCol++) {
                        if (piece[prevRow][prevCol] === 1) {
                          cellIndex++;
                        }
                      }
                    }
                    return (
                      <div key={i} className="piece-row">
                        {row.map((cell, j) => {
                          const currentCellIndex = cellIndex;
                          if (cell === 1) {
                            cellIndex++;
                          }
                          return cell === 1 ? (
                            <div
                              key={j}
                              className="piece-cell"
                              style={{
                                width: CELL_SIZE,
                                height: CELL_SIZE,
                              }}
                            >
                              <img
                                src={getHeartImageForPiece(index, currentCellIndex)}
                                alt="heart"
                                className="piece-heart"
                              />
                            </div>
                          ) : (
                            <div
                              key={j}
                              className="piece-cell empty"
                              style={{
                                width: CELL_SIZE,
                                height: CELL_SIZE,
                              }}
                            />
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* Game Board */}
          <div className="board-container">
            <div className="game-board">
              {board.map((row, rowIndex) =>
                row.map((cell, colIndex) => {
                  // Provjeri da li je ova ćelija dio preview-a
                  let previewCellIndex: number | null = null;
                  const isPreview = selectedPiece !== null &&
                    selectedPosition !== null &&
                    selectedPiece < currentPieces.length &&
                    canPlacePiece(currentPieces[selectedPiece], selectedPosition.row, selectedPosition.col) &&
                    (() => {
                      const piece = currentPieces[selectedPiece];
                      const r = rowIndex - selectedPosition!.row;
                      const c = colIndex - selectedPosition!.col;
                      if (r >= 0 && r < piece.length && c >= 0 && c < piece[0].length && piece[r][c] === 1) {
                        // Izračunaj index ćelije u bloku za preview
                        let cellIndex = 0;
                        for (let prevRow = 0; prevRow < r; prevRow++) {
                          for (let prevCol = 0; prevCol < piece[prevRow].length; prevCol++) {
                            if (piece[prevRow][prevCol] === 1) {
                              cellIndex++;
                            }
                          }
                        }
                        for (let prevCol = 0; prevCol < c; prevCol++) {
                          if (piece[r][prevCol] === 1) {
                            cellIndex++;
                          }
                        }
                        previewCellIndex = cellIndex;
                        return true;
                      }
                      return false;
                    })();

                  return (
                    <div
                      key={`${rowIndex}-${colIndex}`}
                      className={`board-cell ${cell !== null ? 'filled' : ''} ${isPreview ? 'preview' : ''}`}
                      style={{
                        width: CELL_SIZE,
                        height: CELL_SIZE,
                      }}
                      onClick={() => handleCellClick(rowIndex, colIndex)}
                      onMouseEnter={() => handleCellHover(rowIndex, colIndex)}
                      onMouseLeave={() => setSelectedPosition(null)}
                    >
                      {cell !== null && (
                        <img
                          src={getHeartImageForPiece(0, 0)}
                          alt="heart"
                          className="cell-heart"
                        />
                      )}
                      {isPreview && selectedPiece !== null && previewCellIndex !== null && (
                        <img
                          src={getHeartImageForPiece(selectedPiece, previewCellIndex)}
                          alt="heart"
                          className="cell-heart"
                          style={{ opacity: 0.7 }}
                        />
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {showWinModal && (
        <MetalPopup
          title="Bravo, ljubavi! Očistila si sve linije!"
          icon={MetalIcons.heartFilled}
          primaryAction={{
            label: 'Nastavi',
            onClick: () => {
              console.log('Nastavi clicked - navigating back to map');
              onComplete();
            },
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '24px', fontWeight: 600 }}>
            <MetalIcon src={MetalIcons.heartFilled} size={28} alt="Heart" />
            <span>+10</span>
          </div>
        </MetalPopup>
      )}

      {showLoseModal && (
        <MetalPopup
          title="Nedostaje još malo ljubavi… Pokušaj opet, Lanči."
          icon={MetalIcons.heartEmpty}
          primaryAction={{
            label: 'Pokušaj ponovo',
            onClick: handleRetry,
          }}
        />
      )}
    </div>
  );
};

export default BlockPuzzleGame;
