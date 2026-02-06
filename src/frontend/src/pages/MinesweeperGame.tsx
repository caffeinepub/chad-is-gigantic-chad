import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, RotateCcw, Flag } from 'lucide-react';
import { useSubmitScore } from '@/hooks/useQueries';
import { toast } from 'sonner';

const ROWS = 12;
const COLS = 12;
const MINES = 20;
const CELL_SIZE = 40;

type Cell = {
  isMine: boolean;
  isRevealed: boolean;
  isFlagged: boolean;
  adjacentMines: number;
};

export default function MinesweeperGame() {
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [grid, setGrid] = useState<Cell[][]>([]);
  const [gameState, setGameState] = useState<'playing' | 'won' | 'lost'>('playing');
  const [flagsPlaced, setFlagsPlaced] = useState(0);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [showScoreDialog, setShowScoreDialog] = useState(false);
  const [playerName, setPlayerName] = useState('');
  const timerRef = useRef<number | null>(null);
  const submitScoreMutation = useSubmitScore();

  const initializeGrid = useCallback(() => {
    const newGrid: Cell[][] = Array(ROWS)
      .fill(null)
      .map(() =>
        Array(COLS)
          .fill(null)
          .map(() => ({
            isMine: false,
            isRevealed: false,
            isFlagged: false,
            adjacentMines: 0,
          }))
      );

    // Place mines
    let minesPlaced = 0;
    while (minesPlaced < MINES) {
      const row = Math.floor(Math.random() * ROWS);
      const col = Math.floor(Math.random() * COLS);
      if (!newGrid[row][col].isMine) {
        newGrid[row][col].isMine = true;
        minesPlaced++;
      }
    }

    // Calculate adjacent mines
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        if (!newGrid[row][col].isMine) {
          let count = 0;
          for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
              const newRow = row + dr;
              const newCol = col + dc;
              if (
                newRow >= 0 &&
                newRow < ROWS &&
                newCol >= 0 &&
                newCol < COLS &&
                newGrid[newRow][newCol].isMine
              ) {
                count++;
              }
            }
          }
          newGrid[row][col].adjacentMines = count;
        }
      }
    }

    setGrid(newGrid);
    setGameState('playing');
    setFlagsPlaced(0);
    setTimeElapsed(0);
  }, []);

  useEffect(() => {
    initializeGrid();
  }, [initializeGrid]);

  useEffect(() => {
    if (gameState === 'playing') {
      timerRef.current = window.setInterval(() => {
        setTimeElapsed((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [gameState]);

  const revealCell = useCallback(
    (row: number, col: number) => {
      if (gameState !== 'playing') return;

      setGrid((prevGrid) => {
        const newGrid = prevGrid.map((r) => r.map((c) => ({ ...c })));
        const cell = newGrid[row][col];

        if (cell.isRevealed || cell.isFlagged) return prevGrid;

        cell.isRevealed = true;

        if (cell.isMine) {
          setGameState('lost');
          setShowScoreDialog(true);
          // Reveal all mines
          for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
              if (newGrid[r][c].isMine) {
                newGrid[r][c].isRevealed = true;
              }
            }
          }
          return newGrid;
        }

        // Auto-reveal adjacent cells if no adjacent mines
        if (cell.adjacentMines === 0) {
          const queue: [number, number][] = [[row, col]];
          const visited = new Set<string>();

          while (queue.length > 0) {
            const [r, c] = queue.shift()!;
            const key = `${r},${c}`;
            if (visited.has(key)) continue;
            visited.add(key);

            for (let dr = -1; dr <= 1; dr++) {
              for (let dc = -1; dc <= 1; dc++) {
                const newRow = r + dr;
                const newCol = c + dc;
                if (
                  newRow >= 0 &&
                  newRow < ROWS &&
                  newCol >= 0 &&
                  newCol < COLS &&
                  !newGrid[newRow][newCol].isRevealed &&
                  !newGrid[newRow][newCol].isFlagged
                ) {
                  newGrid[newRow][newCol].isRevealed = true;
                  if (newGrid[newRow][newCol].adjacentMines === 0 && !newGrid[newRow][newCol].isMine) {
                    queue.push([newRow, newCol]);
                  }
                }
              }
            }
          }
        }

        // Check win condition
        let allNonMinesRevealed = true;
        for (let r = 0; r < ROWS; r++) {
          for (let c = 0; c < COLS; c++) {
            if (!newGrid[r][c].isMine && !newGrid[r][c].isRevealed) {
              allNonMinesRevealed = false;
              break;
            }
          }
          if (!allNonMinesRevealed) break;
        }

        if (allNonMinesRevealed) {
          setGameState('won');
          setShowScoreDialog(true);
        }

        return newGrid;
      });
    },
    [gameState]
  );

  const toggleFlag = useCallback(
    (row: number, col: number) => {
      if (gameState !== 'playing') return;

      setGrid((prevGrid) => {
        const newGrid = prevGrid.map((r) => r.map((c) => ({ ...c })));
        const cell = newGrid[row][col];

        if (cell.isRevealed) return prevGrid;

        cell.isFlagged = !cell.isFlagged;
        setFlagsPlaced((prev) => (cell.isFlagged ? prev + 1 : prev - 1));

        return newGrid;
      });
    },
    [gameState]
  );

  const handleCanvasClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const col = Math.floor(x / CELL_SIZE);
      const row = Math.floor(y / CELL_SIZE);

      if (row >= 0 && row < ROWS && col >= 0 && col < COLS) {
        if (e.button === 0) {
          revealCell(row, col);
        }
      }
    },
    [revealCell]
  );

  const handleCanvasRightClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      e.preventDefault();
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const col = Math.floor(x / CELL_SIZE);
      const row = Math.floor(y / CELL_SIZE);

      if (row >= 0 && row < ROWS && col >= 0 && col < COLS) {
        toggleFlag(row, col);
      }
    },
    [toggleFlag]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, COLS * CELL_SIZE, ROWS * CELL_SIZE);

    // Draw grid
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        const cell = grid[row]?.[col];
        if (!cell) continue;

        const x = col * CELL_SIZE;
        const y = row * CELL_SIZE;

        if (cell.isRevealed) {
          if (cell.isMine) {
            ctx.fillStyle = '#dc2626';
            ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);
            ctx.fillStyle = '#000000';
            ctx.font = '24px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('💣', x + CELL_SIZE / 2, y + CELL_SIZE / 2);
          } else {
            ctx.fillStyle = '#374151';
            ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);
            if (cell.adjacentMines > 0) {
              const colors = ['', '#3b82f6', '#22c55e', '#ef4444', '#8b5cf6', '#f59e0b', '#ec4899', '#14b8a6', '#64748b'];
              ctx.fillStyle = colors[cell.adjacentMines];
              ctx.font = 'bold 20px Arial';
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText(cell.adjacentMines.toString(), x + CELL_SIZE / 2, y + CELL_SIZE / 2);
            }
          }
        } else {
          ctx.fillStyle = '#4b5563';
          ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);
          if (cell.isFlagged) {
            ctx.fillStyle = '#ef4444';
            ctx.font = '24px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('🚩', x + CELL_SIZE / 2, y + CELL_SIZE / 2);
          }
        }

        // Draw grid lines
        ctx.strokeStyle = '#1a1a2e';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, CELL_SIZE, CELL_SIZE);
      }
    }
  }, [grid]);

  const handleSubmitScore = async () => {
    if (!playerName.trim()) {
      toast.error('Please enter your name');
      return;
    }

    const score = gameState === 'won' ? Math.max(0, 10000 - timeElapsed * 10) : 0;

    try {
      await submitScoreMutation.mutateAsync({
        game: 'Minesweeper',
        playerName: playerName.trim(),
        score: BigInt(score),
      });
      toast.success('Score submitted successfully!');
      setShowScoreDialog(false);
      initializeGrid();
    } catch (error) {
      toast.error('Failed to submit score');
    }
  };

  const score = gameState === 'won' ? Math.max(0, 10000 - timeElapsed * 10) : 0;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <Button variant="ghost" onClick={() => navigate({ to: '/' })} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Games
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card className="border-4 border-primary">
              <CardHeader>
                <CardTitle className="text-3xl pixel-font text-center">MINESWEEPER</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center gap-4">
                <canvas
                  ref={canvasRef}
                  width={COLS * CELL_SIZE}
                  height={ROWS * CELL_SIZE}
                  className="border-4 border-accent rounded-lg cursor-pointer"
                  onClick={handleCanvasClick}
                  onContextMenu={handleCanvasRightClick}
                />
                <div className="flex gap-2">
                  <Button onClick={initializeGrid} variant="outline" size="lg" className="pixel-font">
                    <RotateCcw className="h-4 w-4 mr-2" />
                    New Game
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="border-2 border-primary/50">
              <CardHeader>
                <CardTitle className="pixel-font">Time</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-4xl font-bold pixel-font text-primary">{timeElapsed}s</p>
              </CardContent>
            </Card>

            <Card className="border-2 border-primary/50">
              <CardHeader>
                <CardTitle className="pixel-font">Flags</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-4xl font-bold pixel-font text-accent">
                  {flagsPlaced}/{MINES}
                </p>
              </CardContent>
            </Card>

            <Card className="border-2 border-primary/50">
              <CardHeader>
                <CardTitle className="pixel-font">Status</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold pixel-font">
                  {gameState === 'playing' && '🎮 Playing'}
                  {gameState === 'won' && '🎉 You Won!'}
                  {gameState === 'lost' && '💥 Game Over'}
                </p>
              </CardContent>
            </Card>

            <Card className="border-2 border-primary/50">
              <CardHeader>
                <CardTitle className="pixel-font text-sm">How to Play</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-2">
                <p>🖱️ Left click to reveal a cell</p>
                <p>🚩 Right click to place a flag</p>
                <p>💣 Avoid clicking on mines</p>
                <p>🔢 Numbers show adjacent mines</p>
                <p>⏱️ Faster time = higher score!</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <Dialog open={showScoreDialog} onOpenChange={setShowScoreDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="pixel-font text-2xl">
              {gameState === 'won' ? 'You Won!' : 'Game Over!'}
            </DialogTitle>
            <DialogDescription>
              {gameState === 'won' ? `Your score: ${score}` : 'Better luck next time!'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="playerName">Enter your name</Label>
              <Input
                id="playerName"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="Your name"
                onKeyDown={(e) => e.key === 'Enter' && handleSubmitScore()}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowScoreDialog(false)}>
              Cancel
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
