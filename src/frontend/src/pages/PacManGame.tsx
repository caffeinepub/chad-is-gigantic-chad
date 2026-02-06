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

type Position = { x: number; y: number };
type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

const GRID_SIZE = 19;
const CELL_SIZE = 20;
const PACMAN_SPEED = 150;
const GHOST_SPEED = 200;

const MAZE = [
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [1,2,2,2,2,2,2,2,2,1,2,2,2,2,2,2,2,2,1],
  [1,2,1,1,2,1,1,1,2,1,2,1,1,1,2,1,1,2,1],
  [1,3,1,1,2,1,1,1,2,1,2,1,1,1,2,1,1,3,1],
  [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
  [1,2,1,1,2,1,2,1,1,1,1,1,2,1,2,1,1,2,1],
  [1,2,2,2,2,1,2,2,2,1,2,2,2,1,2,2,2,2,1],
  [1,1,1,1,2,1,1,1,0,1,0,1,1,1,2,1,1,1,1],
  [0,0,0,1,2,1,0,0,0,0,0,0,0,1,2,1,0,0,0],
  [1,1,1,1,2,1,0,1,1,0,1,1,0,1,2,1,1,1,1],
  [0,0,0,0,2,0,0,1,0,0,0,1,0,0,2,0,0,0,0],
  [1,1,1,1,2,1,0,1,1,1,1,1,0,1,2,1,1,1,1],
  [0,0,0,1,2,1,0,0,0,0,0,0,0,1,2,1,0,0,0],
  [1,1,1,1,2,1,0,1,1,1,1,1,0,1,2,1,1,1,1],
  [1,2,2,2,2,2,2,2,2,1,2,2,2,2,2,2,2,2,1],
  [1,2,1,1,2,1,1,1,2,1,2,1,1,1,2,1,1,2,1],
  [1,3,2,1,2,2,2,2,2,2,2,2,2,2,2,1,2,3,1],
  [1,1,2,1,2,1,2,1,1,1,1,1,2,1,2,1,2,1,1],
  [1,2,2,2,2,1,2,2,2,1,2,2,2,1,2,2,2,2,1],
  [1,2,1,1,1,1,1,1,2,1,2,1,1,1,1,1,1,2,1],
  [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
];

export default function PacManGame() {
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [pacman, setPacman] = useState<Position>({ x: 9, y: 15 });
  const [direction, setDirection] = useState<Direction>('RIGHT');
  const [nextDirection, setNextDirection] = useState<Direction>('RIGHT');
  const [ghosts, setGhosts] = useState<Position[]>([
    { x: 8, y: 9 },
    { x: 9, y: 9 },
    { x: 10, y: 9 },
  ]);
  const [dots, setDots] = useState<number[][]>(() => MAZE.map(row => [...row]));
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [gameOver, setGameOver] = useState(false);
  const [isPaused, setIsPaused] = useState(true);
  const [showScoreDialog, setShowScoreDialog] = useState(false);
  const [playerName, setPlayerName] = useState('');
  const [powerMode, setPowerMode] = useState(false);
  const gameLoopRef = useRef<number | null>(null);
  const ghostLoopRef = useRef<number | null>(null);
  const submitScoreMutation = useSubmitScore();

  const canMove = useCallback((pos: Position): boolean => {
    if (pos.y < 0 || pos.y >= MAZE.length || pos.x < 0 || pos.x >= MAZE[0].length) return false;
    return MAZE[pos.y][pos.x] !== 1;
  }, []);

  const resetGame = useCallback(() => {
    setPacman({ x: 9, y: 15 });
    setDirection('RIGHT');
    setNextDirection('RIGHT');
    setGhosts([
      { x: 8, y: 9 },
      { x: 9, y: 9 },
      { x: 10, y: 9 },
    ]);
    setDots(MAZE.map(row => [...row]));
    setScore(0);
    setLives(3);
    setGameOver(false);
    setIsPaused(true);
    setPowerMode(false);
  }, []);

  const moveGhosts = useCallback(() => {
    if (isPaused || gameOver) return;

    setGhosts(prevGhosts => 
      prevGhosts.map(ghost => {
        const directions: Direction[] = ['UP', 'DOWN', 'LEFT', 'RIGHT'];
        const validMoves = directions.filter(dir => {
          let newPos = { ...ghost };
          switch (dir) {
            case 'UP': newPos.y--; break;
            case 'DOWN': newPos.y++; break;
            case 'LEFT': newPos.x--; break;
            case 'RIGHT': newPos.x++; break;
          }
          return canMove(newPos);
        });

        if (validMoves.length > 0) {
          const randomDir = validMoves[Math.floor(Math.random() * validMoves.length)];
          let newPos = { ...ghost };
          switch (randomDir) {
            case 'UP': newPos.y--; break;
            case 'DOWN': newPos.y++; break;
            case 'LEFT': newPos.x--; break;
            case 'RIGHT': newPos.x++; break;
          }
          return newPos;
        }
        return ghost;
      })
    );
  }, [isPaused, gameOver, canMove]);

  const gameLoop = useCallback(() => {
    if (isPaused || gameOver) return;

    setPacman(prevPacman => {
      let newPos = { ...prevPacman };
      
      switch (nextDirection) {
        case 'UP': newPos.y--; break;
        case 'DOWN': newPos.y++; break;
        case 'LEFT': newPos.x--; break;
        case 'RIGHT': newPos.x++; break;
      }

      if (canMove(newPos)) {
        setDirection(nextDirection);
      } else {
        newPos = { ...prevPacman };
        switch (direction) {
          case 'UP': newPos.y--; break;
          case 'DOWN': newPos.y++; break;
          case 'LEFT': newPos.x--; break;
          case 'RIGHT': newPos.x++; break;
        }
        if (!canMove(newPos)) {
          return prevPacman;
        }
      }

      setDots(prevDots => {
        const newDots = prevDots.map(row => [...row]);
        if (newDots[newPos.y][newPos.x] === 2) {
          newDots[newPos.y][newPos.x] = 0;
          setScore(prev => prev + 10);
        } else if (newDots[newPos.y][newPos.x] === 3) {
          newDots[newPos.y][newPos.x] = 0;
          setScore(prev => prev + 50);
          setPowerMode(true);
          setTimeout(() => setPowerMode(false), 5000);
        }
        return newDots;
      });

      return newPos;
    });
  }, [isPaused, gameOver, direction, nextDirection, canMove]);

  useEffect(() => {
    const collision = ghosts.some(ghost => 
      ghost.x === pacman.x && ghost.y === pacman.y
    );

    if (collision && !powerMode) {
      setLives(prev => {
        const newLives = prev - 1;
        if (newLives <= 0) {
          setGameOver(true);
          setShowScoreDialog(true);
        } else {
          setPacman({ x: 9, y: 15 });
        }
        return newLives;
      });
    } else if (collision && powerMode) {
      setScore(prev => prev + 200);
      setGhosts(prevGhosts => 
        prevGhosts.filter(ghost => !(ghost.x === pacman.x && ghost.y === pacman.y))
      );
    }
  }, [pacman, ghosts, powerMode]);

  useEffect(() => {
    const allDotsEaten = dots.every(row => row.every(cell => cell !== 2 && cell !== 3));
    if (allDotsEaten && !gameOver) {
      setGameOver(true);
      setShowScoreDialog(true);
    }
  }, [dots, gameOver]);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (gameOver) return;

      switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          e.preventDefault();
          setNextDirection('UP');
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          e.preventDefault();
          setNextDirection('DOWN');
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          e.preventDefault();
          setNextDirection('LEFT');
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          e.preventDefault();
          setNextDirection('RIGHT');
          break;
        case ' ':
          e.preventDefault();
          setIsPaused(prev => !prev);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [gameOver]);

  useEffect(() => {
    if (!isPaused && !gameOver) {
      gameLoopRef.current = window.setInterval(gameLoop, PACMAN_SPEED);
      ghostLoopRef.current = window.setInterval(moveGhosts, GHOST_SPEED);
    }
    return () => {
      if (gameLoopRef.current) clearInterval(gameLoopRef.current);
      if (ghostLoopRef.current) clearInterval(ghostLoopRef.current);
    };
  }, [gameLoop, moveGhosts, isPaused, gameOver]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = 'oklch(0.145 0 0)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    dots.forEach((row, y) => {
      row.forEach((cell, x) => {
        if (cell === 1) {
          ctx.fillStyle = 'oklch(0.4 0.15 250)';
          ctx.fillRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
        } else if (cell === 2) {
          ctx.fillStyle = 'oklch(0.9 0.1 60)';
          ctx.beginPath();
          ctx.arc(x * CELL_SIZE + CELL_SIZE / 2, y * CELL_SIZE + CELL_SIZE / 2, 2, 0, Math.PI * 2);
          ctx.fill();
        } else if (cell === 3) {
          ctx.fillStyle = 'oklch(0.9 0.2 60)';
          ctx.beginPath();
          ctx.arc(x * CELL_SIZE + CELL_SIZE / 2, y * CELL_SIZE + CELL_SIZE / 2, 5, 0, Math.PI * 2);
          ctx.fill();
        }
      });
    });

    ctx.fillStyle = powerMode ? 'oklch(0.8 0.2 120)' : 'oklch(0.704 0.191 22.216)';
    ctx.beginPath();
    ctx.arc(pacman.x * CELL_SIZE + CELL_SIZE / 2, pacman.y * CELL_SIZE + CELL_SIZE / 2, CELL_SIZE / 2 - 2, 0.2 * Math.PI, 1.8 * Math.PI);
    ctx.lineTo(pacman.x * CELL_SIZE + CELL_SIZE / 2, pacman.y * CELL_SIZE + CELL_SIZE / 2);
    ctx.fill();

    ghosts.forEach(ghost => {
      ctx.fillStyle = powerMode ? 'oklch(0.4 0.15 250)' : 'oklch(0.55 0.25 0)';
      ctx.beginPath();
      ctx.arc(ghost.x * CELL_SIZE + CELL_SIZE / 2, ghost.y * CELL_SIZE + CELL_SIZE / 2 - 2, CELL_SIZE / 2 - 2, Math.PI, 0);
      ctx.lineTo(ghost.x * CELL_SIZE + CELL_SIZE - 2, ghost.y * CELL_SIZE + CELL_SIZE - 2);
      ctx.lineTo(ghost.x * CELL_SIZE + CELL_SIZE / 2, ghost.y * CELL_SIZE + CELL_SIZE / 2 + 2);
      ctx.lineTo(ghost.x * CELL_SIZE + 2, ghost.y * CELL_SIZE + CELL_SIZE - 2);
      ctx.fill();
    });
  }, [pacman, ghosts, dots, powerMode]);

  const handleSubmitScore = async () => {
    if (!playerName.trim()) {
      toast.error('Please enter your name');
      return;
    }

    try {
      await submitScoreMutation.mutateAsync({
        game: 'Pac-Man',
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
              <CardTitle className="text-3xl pixel-font">PAC-MAN</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-center mb-4">
                <canvas
                  ref={canvasRef}
                  width={GRID_SIZE * CELL_SIZE}
                  height={MAZE.length * CELL_SIZE}
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
                <CardTitle className="pixel-font">SCORE</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-5xl font-black text-center pixel-font text-primary">{score}</div>
              </CardContent>
            </Card>

            <Card className="border-2 border-primary">
              <CardHeader>
                <CardTitle className="pixel-font">LIVES</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-4xl text-center">{'💛'.repeat(lives)}</div>
              </CardContent>
            </Card>

            <Card className="border-2 border-primary">
              <CardHeader>
                <CardTitle className="text-lg pixel-font">HOW TO PLAY</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p>🎮 <strong>Arrow Keys</strong> or <strong>WASD</strong> to move</p>
                <p>⏸️ <strong>Space</strong> to pause</p>
                <p>🔵 Collect dots = 10 points</p>
                <p>🟡 Power pellets = 50 points</p>
                <p>👻 Avoid ghosts or eat them in power mode!</p>
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
