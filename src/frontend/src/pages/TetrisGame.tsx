import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Play, Pause, RotateCcw } from 'lucide-react';
import { useSubmitScore } from '@/hooks/useQueries';
import { toast } from 'sonner';

const COLS = 10;
const ROWS = 20;
const CELL_SIZE = 25;

type Tetromino = number[][];
type Board = number[][];

const SHAPES: Tetromino[] = [
  [[1, 1, 1, 1]], // I
  [[1, 1], [1, 1]], // O
  [[0, 1, 0], [1, 1, 1]], // T
  [[1, 1, 0], [0, 1, 1]], // S
  [[0, 1, 1], [1, 1, 0]], // Z
  [[1, 0, 0], [1, 1, 1]], // L
  [[0, 0, 1], [1, 1, 1]], // J
];

const COLORS = [
  'oklch(0.6 0.118 184.704)',
  'oklch(0.828 0.189 84.429)',
  'oklch(0.488 0.243 264.376)',
  'oklch(0.646 0.222 41.116)',
  'oklch(0.704 0.191 22.216)',
  'oklch(0.696 0.17 162.48)',
  'oklch(0.769 0.188 70.08)',
];

export default function TetrisGame() {
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [board, setBoard] = useState<Board>(() => Array(ROWS).fill(null).map(() => Array(COLS).fill(0)));
  const [currentPiece, setCurrentPiece] = useState<Tetromino | null>(null);
  const [currentColor, setCurrentColor] = useState(0);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [score, setScore] = useState(0);
  const [lines, setLines] = useState(0);
  const [level, setLevel] = useState(1);
  const [gameOver, setGameOver] = useState(false);
  const [isPaused, setIsPaused] = useState(true);
  const [showScoreDialog, setShowScoreDialog] = useState(false);
  const [playerName, setPlayerName] = useState('');
  const gameLoopRef = useRef<number | null>(null);
  const submitScoreMutation = useSubmitScore();

  const createNewPiece = useCallback(() => {
    const shapeIndex = Math.floor(Math.random() * SHAPES.length);
    return {
      shape: SHAPES[shapeIndex],
      color: shapeIndex,
      x: Math.floor(COLS / 2) - 1,
      y: 0,
    };
  }, []);

  const checkCollision = useCallback((piece: Tetromino, x: number, y: number, currentBoard: Board): boolean => {
    for (let row = 0; row < piece.length; row++) {
      for (let col = 0; col < piece[row].length; col++) {
        if (piece[row][col]) {
          const newX = x + col;
          const newY = y + row;
          if (newX < 0 || newX >= COLS || newY >= ROWS) return true;
          if (newY >= 0 && currentBoard[newY][newX]) return true;
        }
      }
    }
    return false;
  }, []);

  const rotatePiece = useCallback((piece: Tetromino): Tetromino => {
    const rotated = piece[0].map((_, i) => piece.map(row => row[i]).reverse());
    return rotated;
  }, []);

  const mergePiece = useCallback((piece: Tetromino, x: number, y: number, color: number, currentBoard: Board): Board => {
    const newBoard = currentBoard.map(row => [...row]);
    for (let row = 0; row < piece.length; row++) {
      for (let col = 0; col < piece[row].length; col++) {
        if (piece[row][col] && y + row >= 0) {
          newBoard[y + row][x + col] = color + 1;
        }
      }
    }
    return newBoard;
  }, []);

  const clearLines = useCallback((currentBoard: Board): { newBoard: Board; linesCleared: number } => {
    let linesCleared = 0;
    const newBoard = currentBoard.filter(row => {
      if (row.every(cell => cell !== 0)) {
        linesCleared++;
        return false;
      }
      return true;
    });

    while (newBoard.length < ROWS) {
      newBoard.unshift(Array(COLS).fill(0));
    }

    return { newBoard, linesCleared };
  }, []);

  const movePiece = useCallback((dx: number, dy: number) => {
    if (!currentPiece || isPaused || gameOver) return;

    const newX = position.x + dx;
    const newY = position.y + dy;

    if (!checkCollision(currentPiece, newX, newY, board)) {
      setPosition({ x: newX, y: newY });
    } else if (dy > 0) {
      const mergedBoard = mergePiece(currentPiece, position.x, position.y, currentColor, board);
      const { newBoard, linesCleared } = clearLines(mergedBoard);
      
      setBoard(newBoard);
      setLines(prev => prev + linesCleared);
      setScore(prev => prev + linesCleared * 100 * level);
      setLevel(Math.floor((lines + linesCleared) / 10) + 1);

      const newPiece = createNewPiece();
      if (checkCollision(newPiece.shape, newPiece.x, newPiece.y, newBoard)) {
        setGameOver(true);
        setShowScoreDialog(true);
      } else {
        setCurrentPiece(newPiece.shape);
        setCurrentColor(newPiece.color);
        setPosition({ x: newPiece.x, y: newPiece.y });
      }
    }
  }, [currentPiece, position, board, currentColor, isPaused, gameOver, checkCollision, mergePiece, clearLines, createNewPiece, level, lines]);

  const rotate = useCallback(() => {
    if (!currentPiece || isPaused || gameOver) return;

    const rotated = rotatePiece(currentPiece);
    if (!checkCollision(rotated, position.x, position.y, board)) {
      setCurrentPiece(rotated);
    }
  }, [currentPiece, position, board, isPaused, gameOver, rotatePiece, checkCollision]);

  const hardDrop = useCallback(() => {
    if (!currentPiece || isPaused || gameOver) return;

    let newY = position.y;
    while (!checkCollision(currentPiece, position.x, newY + 1, board)) {
      newY++;
    }
    setPosition({ x: position.x, y: newY });
    movePiece(0, 1);
  }, [currentPiece, position, board, isPaused, gameOver, checkCollision, movePiece]);

  const resetGame = useCallback(() => {
    setBoard(Array(ROWS).fill(null).map(() => Array(COLS).fill(0)));
    const newPiece = createNewPiece();
    setCurrentPiece(newPiece.shape);
    setCurrentColor(newPiece.color);
    setPosition({ x: newPiece.x, y: newPiece.y });
    setScore(0);
    setLines(0);
    setLevel(1);
    setGameOver(false);
    setIsPaused(true);
  }, [createNewPiece]);

  useEffect(() => {
    const newPiece = createNewPiece();
    setCurrentPiece(newPiece.shape);
    setCurrentColor(newPiece.color);
    setPosition({ x: newPiece.x, y: newPiece.y });
  }, []);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (gameOver) return;

      switch (e.key) {
        case 'ArrowLeft':
        case 'a':
        case 'A':
          e.preventDefault();
          movePiece(-1, 0);
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          e.preventDefault();
          movePiece(1, 0);
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          e.preventDefault();
          movePiece(0, 1);
          break;
        case 'ArrowUp':
        case 'w':
        case 'W':
          e.preventDefault();
          rotate();
          break;
        case ' ':
          e.preventDefault();
          if (!isPaused) {
            hardDrop();
          } else {
            setIsPaused(false);
          }
          break;
        case 'p':
        case 'P':
          e.preventDefault();
          setIsPaused(prev => !prev);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [movePiece, rotate, hardDrop, gameOver, isPaused]);

  useEffect(() => {
    if (!isPaused && !gameOver) {
      const speed = Math.max(100, 1000 - (level - 1) * 100);
      gameLoopRef.current = window.setInterval(() => {
        movePiece(0, 1);
      }, speed);
    }
    return () => {
      if (gameLoopRef.current) clearInterval(gameLoopRef.current);
    };
  }, [movePiece, isPaused, gameOver, level]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = 'oklch(0.145 0 0)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        if (board[row][col]) {
          ctx.fillStyle = COLORS[board[row][col] - 1];
          ctx.fillRect(col * CELL_SIZE + 1, row * CELL_SIZE + 1, CELL_SIZE - 2, CELL_SIZE - 2);
        }
      }
    }

    if (currentPiece) {
      ctx.fillStyle = COLORS[currentColor];
      for (let row = 0; row < currentPiece.length; row++) {
        for (let col = 0; col < currentPiece[row].length; col++) {
          if (currentPiece[row][col]) {
            ctx.fillRect(
              (position.x + col) * CELL_SIZE + 1,
              (position.y + row) * CELL_SIZE + 1,
              CELL_SIZE - 2,
              CELL_SIZE - 2
            );
          }
        }
      }
    }

    ctx.strokeStyle = 'oklch(0.269 0 0)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= COLS; i++) {
      ctx.beginPath();
      ctx.moveTo(i * CELL_SIZE, 0);
      ctx.lineTo(i * CELL_SIZE, ROWS * CELL_SIZE);
      ctx.stroke();
    }
    for (let i = 0; i <= ROWS; i++) {
      ctx.beginPath();
      ctx.moveTo(0, i * CELL_SIZE);
      ctx.lineTo(COLS * CELL_SIZE, i * CELL_SIZE);
      ctx.stroke();
    }
  }, [board, currentPiece, currentColor, position]);

  const handleSubmitScore = async () => {
    if (!playerName.trim()) {
      toast.error('Please enter your name');
      return;
    }

    try {
      await submitScoreMutation.mutateAsync({
        game: 'Tetris',
        playerName: playerName.trim(),
        score: BigInt(score),
      });
      toast.success('Score submitted successfully!');
      setShowScoreDialog(false);
      resetGame();
    } catch (error) {
      toast.error('Failed to submit score');
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <Button variant="ghost" onClick={() => navigate({ to: '/' })} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Games
        </Button>

        <div className="grid md:grid-cols-[1fr_300px] gap-6">
          <Card className="border-4 border-primary">
            <CardHeader>
              <CardTitle className="text-3xl pixel-font">TETRIS</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-center mb-4">
                <canvas
                  ref={canvasRef}
                  width={COLS * CELL_SIZE}
                  height={ROWS * CELL_SIZE}
                  className="border-4 border-accent rounded-lg"
                  tabIndex={0}
                />
              </div>
              <div className="flex gap-2 justify-center">
                {isPaused && !gameOver && (
                  <Button onClick={() => setIsPaused(false)} size="lg" className="pixel-font">
                    <Play className="h-4 w-4 mr-2" />
                    Start
                  </Button>
                )}
                {!isPaused && !gameOver && (
                  <Button onClick={() => setIsPaused(true)} size="lg" variant="secondary" className="pixel-font">
                    <Pause className="h-4 w-4 mr-2" />
                    Pause
                  </Button>
                )}
                <Button onClick={resetGame} size="lg" variant="outline" className="pixel-font">
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reset
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <Card className="border-2 border-primary">
              <CardHeader>
                <CardTitle className="pixel-font">STATS</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <div className="text-sm text-muted-foreground">Score</div>
                  <div className="text-3xl font-black pixel-font text-primary">{score}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Lines</div>
                  <div className="text-2xl font-bold pixel-font">{lines}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Level</div>
                  <div className="text-2xl font-bold pixel-font">{level}</div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 border-primary">
              <CardHeader>
                <CardTitle className="text-lg pixel-font">HOW TO PLAY</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p>⬅️➡️ <strong>Arrow Keys</strong> or <strong>A/D</strong> to move</p>
                <p>⬆️ <strong>Up Arrow</strong> or <strong>W</strong> to rotate</p>
                <p>⬇️ <strong>Down Arrow</strong> or <strong>S</strong> to soft drop</p>
                <p>⏬ <strong>Space</strong> for hard drop</p>
                <p>⏸️ <strong>P</strong> to pause</p>
                <p>🎯 Clear lines to score points</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <Dialog open={showScoreDialog} onOpenChange={setShowScoreDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-2xl pixel-font">GAME OVER!</DialogTitle>
            <DialogDescription>
              Your final score: <span className="text-2xl font-bold text-primary">{score}</span>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="playerName">Enter your name for the leaderboard</Label>
              <Input
                id="playerName"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="Your name"
                maxLength={20}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowScoreDialog(false)}>
              Skip
            </Button>
            <Button onClick={handleSubmitScore} disabled={submitScoreMutation.isPending}>
              {submitScoreMutation.isPending ? 'Submitting...' : 'Submit Score'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
