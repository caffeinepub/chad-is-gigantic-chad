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

const CANVAS_WIDTH = 400;
const CANVAS_HEIGHT = 600;
const CELL_SIZE = 40;
const ROWS = 15;
const COLS = 10;

type Position = { x: number; y: number };
type Vehicle = { x: number; y: number; width: number; speed: number };
type Log = { x: number; y: number; width: number; speed: number };

export default function FroggerGame() {
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [frogPos, setFrogPos] = useState<Position>({ x: 4, y: 14 });
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [logs, setLogs] = useState<Log[]>([]);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [gameOver, setGameOver] = useState(false);
  const [isPaused, setIsPaused] = useState(true);
  const [showScoreDialog, setShowScoreDialog] = useState(false);
  const [playerName, setPlayerName] = useState('');
  const gameLoopRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const submitScoreMutation = useSubmitScore();

  const initializeObstacles = useCallback(() => {
    const newVehicles: Vehicle[] = [];
    // Road rows: 8-12
    for (let row = 8; row <= 12; row++) {
      const speed = (row % 2 === 0 ? 1 : -1) * (1 + Math.random() * 0.5);
      const count = 2 + Math.floor(Math.random() * 2);
      for (let i = 0; i < count; i++) {
        newVehicles.push({
          x: (i * COLS) / count,
          y: row,
          width: 1 + Math.floor(Math.random() * 2),
          speed,
        });
      }
    }

    const newLogs: Log[] = [];
    // Water rows: 2-6
    for (let row = 2; row <= 6; row++) {
      const speed = (row % 2 === 0 ? 0.5 : -0.5) * (1 + Math.random() * 0.3);
      const count = 2 + Math.floor(Math.random() * 2);
      for (let i = 0; i < count; i++) {
        newLogs.push({
          x: (i * COLS) / count,
          y: row,
          width: 2 + Math.floor(Math.random() * 2),
          speed,
        });
      }
    }

    setVehicles(newVehicles);
    setLogs(newLogs);
  }, []);

  const resetGame = useCallback(() => {
    setFrogPos({ x: 4, y: 14 });
    setScore(0);
    setLives(3);
    setGameOver(false);
    setIsPaused(true);
    initializeObstacles();
  }, [initializeObstacles]);

  useEffect(() => {
    initializeObstacles();
  }, [initializeObstacles]);

  const checkCollision = useCallback(
    (pos: Position): boolean => {
      // Check vehicle collision
      for (const vehicle of vehicles) {
        if (pos.y === vehicle.y) {
          const vehicleLeft = vehicle.x;
          const vehicleRight = vehicle.x + vehicle.width;
          if (pos.x >= vehicleLeft && pos.x < vehicleRight) {
            return true;
          }
        }
      }
      return false;
    },
    [vehicles]
  );

  const isOnLog = useCallback(
    (pos: Position): Log | null => {
      for (const log of logs) {
        if (pos.y === log.y) {
          const logLeft = log.x;
          const logRight = log.x + log.width;
          if (pos.x >= logLeft && pos.x < logRight) {
            return log;
          }
        }
      }
      return null;
    },
    [logs]
  );

  const handleDeath = useCallback(() => {
    setLives((prev) => {
      const newLives = prev - 1;
      if (newLives <= 0) {
        setGameOver(true);
        setShowScoreDialog(true);
      } else {
        setFrogPos({ x: 4, y: 14 });
      }
      return newLives;
    });
  }, []);

  const gameLoop = useCallback(
    (timestamp: number) => {
      if (isPaused || gameOver) {
        gameLoopRef.current = requestAnimationFrame(gameLoop);
        return;
      }

      const deltaTime = timestamp - lastTimeRef.current;
      if (deltaTime < 16) {
        gameLoopRef.current = requestAnimationFrame(gameLoop);
        return;
      }
      lastTimeRef.current = timestamp;

      // Update vehicles
      setVehicles((prev) =>
        prev.map((v) => ({
          ...v,
          x: v.x + v.speed * 0.02,
        }))
      );

      // Update logs
      setLogs((prev) =>
        prev.map((l) => ({
          ...l,
          x: l.x + l.speed * 0.02,
        }))
      );

      // Update frog position if on log
      setFrogPos((pos) => {
        const log = isOnLog(pos);
        if (log) {
          const newX = pos.x + log.speed * 0.02;
          if (newX < 0 || newX >= COLS) {
            handleDeath();
            return { x: 4, y: 14 };
          }
          return { ...pos, x: newX };
        }

        // Check if in water without log
        if (pos.y >= 2 && pos.y <= 6) {
          handleDeath();
          return { x: 4, y: 14 };
        }

        // Check vehicle collision
        if (checkCollision(pos)) {
          handleDeath();
          return { x: 4, y: 14 };
        }

        return pos;
      });

      gameLoopRef.current = requestAnimationFrame(gameLoop);
    },
    [isPaused, gameOver, checkCollision, isOnLog, handleDeath]
  );

  useEffect(() => {
    gameLoopRef.current = requestAnimationFrame(gameLoop);
    return () => {
      if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
    };
  }, [gameLoop]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw safe zones
    ctx.fillStyle = '#16a34a';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CELL_SIZE); // Top safe zone
    ctx.fillRect(0, 13 * CELL_SIZE, CANVAS_WIDTH, 2 * CELL_SIZE); // Bottom safe zone
    ctx.fillRect(0, 7 * CELL_SIZE, CANVAS_WIDTH, CELL_SIZE); // Middle safe zone

    // Draw water
    ctx.fillStyle = '#0ea5e9';
    for (let row = 2; row <= 6; row++) {
      ctx.fillRect(0, row * CELL_SIZE, CANVAS_WIDTH, CELL_SIZE);
    }

    // Draw road
    ctx.fillStyle = '#374151';
    for (let row = 8; row <= 12; row++) {
      ctx.fillRect(0, row * CELL_SIZE, CANVAS_WIDTH, CELL_SIZE);
    }

    // Draw logs
    ctx.fillStyle = '#92400e';
    for (const log of logs) {
      const x = ((log.x % COLS) + COLS) % COLS;
      ctx.fillRect(x * CELL_SIZE, log.y * CELL_SIZE, log.width * CELL_SIZE, CELL_SIZE - 4);
    }

    // Draw vehicles
    ctx.fillStyle = '#dc2626';
    for (const vehicle of vehicles) {
      const x = ((vehicle.x % COLS) + COLS) % COLS;
      ctx.fillRect(x * CELL_SIZE, vehicle.y * CELL_SIZE, vehicle.width * CELL_SIZE, CELL_SIZE - 4);
    }

    // Draw frog
    ctx.fillStyle = '#22c55e';
    ctx.fillRect(frogPos.x * CELL_SIZE + 5, frogPos.y * CELL_SIZE + 5, CELL_SIZE - 10, CELL_SIZE - 10);
  }, [frogPos, vehicles, logs]);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (gameOver || isPaused) return;

      let newPos = { ...frogPos };
      switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          if (frogPos.y > 0) newPos.y -= 1;
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          if (frogPos.y < ROWS - 1) newPos.y += 1;
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          if (frogPos.x > 0) newPos.x -= 1;
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          if (frogPos.x < COLS - 1) newPos.x += 1;
          break;
        default:
          return;
      }

      e.preventDefault();

      // Check if reached top
      if (newPos.y === 0) {
        setScore((prev) => prev + 100);
        setFrogPos({ x: 4, y: 14 });
        return;
      }

      setFrogPos(newPos);
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [frogPos, gameOver, isPaused]);

  const handleSubmitScore = async () => {
    if (!playerName.trim()) {
      toast.error('Please enter your name');
      return;
    }

    try {
      await submitScoreMutation.mutateAsync({
        game: 'Frogger',
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card className="border-4 border-primary">
              <CardHeader>
                <CardTitle className="text-3xl pixel-font text-center">FROGGER</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center gap-4">
                <canvas
                  ref={canvasRef}
                  width={CANVAS_WIDTH}
                  height={CANVAS_HEIGHT}
                  className="border-4 border-accent rounded-lg"
                />
                <div className="flex gap-2">
                  <Button onClick={() => setIsPaused(!isPaused)} size="lg" className="pixel-font">
                    {isPaused ? <Play className="h-4 w-4 mr-2" /> : <Pause className="h-4 w-4 mr-2" />}
                    {isPaused ? 'Start' : 'Pause'}
                  </Button>
                  <Button onClick={resetGame} variant="outline" size="lg" className="pixel-font">
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Reset
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="border-2 border-primary/50">
              <CardHeader>
                <CardTitle className="pixel-font">Score</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-4xl font-bold pixel-font text-primary">{score}</p>
              </CardContent>
            </Card>

            <Card className="border-2 border-primary/50">
              <CardHeader>
                <CardTitle className="pixel-font">Lives</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-4xl font-bold pixel-font text-destructive">{lives}</p>
              </CardContent>
            </Card>

            <Card className="border-2 border-primary/50">
              <CardHeader>
                <CardTitle className="pixel-font text-sm">How to Play</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-2">
                <p>🎮 Use arrow keys or WASD to move</p>
                <p>🐸 Reach the top to score points</p>
                <p>🚗 Avoid vehicles on the road</p>
                <p>🪵 Jump on logs to cross water</p>
                <p>💀 Don't fall in the water!</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <Dialog open={showScoreDialog} onOpenChange={setShowScoreDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="pixel-font text-2xl">Game Over!</DialogTitle>
            <DialogDescription>Your final score: {score}</DialogDescription>
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
