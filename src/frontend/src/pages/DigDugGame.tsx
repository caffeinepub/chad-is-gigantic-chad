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
type Player = Position & { direction: string };
type Enemy = Position & { type: string; alive: boolean };
type Tunnel = Position;

const CANVAS_WIDTH = 600;
const CANVAS_HEIGHT = 600;
const CELL_SIZE = 30;
const PLAYER_SPEED = 3;

export default function DigDugGame() {
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [gameOver, setGameOver] = useState(false);
  const [isPaused, setIsPaused] = useState(true);
  const [showScoreDialog, setShowScoreDialog] = useState(false);
  const [playerName, setPlayerName] = useState('');
  const gameLoopRef = useRef<number | null>(null);
  const submitScoreMutation = useSubmitScore();

  const playerRef = useRef<Player>({ x: CELL_SIZE, y: CELL_SIZE, direction: 'right' });
  const enemiesRef = useRef<Enemy[]>([]);
  const tunnelsRef = useRef<Tunnel[]>([]);
  const keysRef = useRef<Set<string>>(new Set());

  const initGame = useCallback(() => {
    playerRef.current = { x: CELL_SIZE, y: CELL_SIZE, direction: 'right' };
    tunnelsRef.current = [{ x: CELL_SIZE, y: CELL_SIZE }];
    enemiesRef.current = [];

    // Spawn enemies
    for (let i = 0; i < 4; i++) {
      enemiesRef.current.push({
        x: Math.floor(Math.random() * (CANVAS_WIDTH / CELL_SIZE)) * CELL_SIZE,
        y: (Math.floor(Math.random() * 10) + 5) * CELL_SIZE,
        type: i % 2 === 0 ? 'pooka' : 'fygar',
        alive: true,
      });
    }

    setScore(0);
    setLives(3);
    setGameOver(false);
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Draw dirt background
    ctx.fillStyle = 'oklch(0.35 0.08 60)';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw tunnels
    ctx.fillStyle = 'oklch(0.15 0.02 264)';
    tunnelsRef.current.forEach((tunnel) => {
      ctx.fillRect(tunnel.x, tunnel.y, CELL_SIZE, CELL_SIZE);
    });

    // Draw enemies
    enemiesRef.current.forEach((enemy) => {
      if (enemy.alive) {
        const color = enemy.type === 'pooka' ? 'oklch(0.75 0.25 0)' : 'oklch(0.75 0.25 140)';
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(enemy.x + CELL_SIZE / 2, enemy.y + CELL_SIZE / 2, CELL_SIZE / 2 - 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'oklch(0.95 0.05 85)';
        ctx.beginPath();
        ctx.arc(enemy.x + CELL_SIZE / 3, enemy.y + CELL_SIZE / 3, 4, 0, Math.PI * 2);
        ctx.arc(enemy.x + (CELL_SIZE * 2) / 3, enemy.y + CELL_SIZE / 3, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    // Draw player
    ctx.fillStyle = 'oklch(0.75 0.25 180)';
    ctx.fillRect(
      playerRef.current.x + CELL_SIZE / 4,
      playerRef.current.y + CELL_SIZE / 4,
      CELL_SIZE / 2,
      CELL_SIZE / 2
    );
    ctx.fillStyle = 'oklch(0.85 0.25 180)';
    ctx.beginPath();
    ctx.arc(playerRef.current.x + CELL_SIZE / 2, playerRef.current.y + CELL_SIZE / 2, CELL_SIZE / 3, 0, Math.PI * 2);
    ctx.fill();
  }, []);

  const update = useCallback(() => {
    if (isPaused || gameOver) return;

    const player = playerRef.current;
    let moved = false;

    // Move player
    if (keysRef.current.has('ArrowLeft')) {
      player.x = Math.max(0, player.x - PLAYER_SPEED);
      player.direction = 'left';
      moved = true;
    }
    if (keysRef.current.has('ArrowRight')) {
      player.x = Math.min(CANVAS_WIDTH - CELL_SIZE, player.x + PLAYER_SPEED);
      player.direction = 'right';
      moved = true;
    }
    if (keysRef.current.has('ArrowUp')) {
      player.y = Math.max(0, player.y - PLAYER_SPEED);
      player.direction = 'up';
      moved = true;
    }
    if (keysRef.current.has('ArrowDown')) {
      player.y = Math.min(CANVAS_HEIGHT - CELL_SIZE, player.y + PLAYER_SPEED);
      player.direction = 'down';
      moved = true;
    }

    // Create tunnels
    if (moved) {
      const gridX = Math.floor(player.x / CELL_SIZE) * CELL_SIZE;
      const gridY = Math.floor(player.y / CELL_SIZE) * CELL_SIZE;
      const exists = tunnelsRef.current.some((t) => t.x === gridX && t.y === gridY);
      if (!exists) {
        tunnelsRef.current.push({ x: gridX, y: gridY });
        setScore((s) => s + 10);
      }
    }

    // Move enemies toward player (simple AI)
    enemiesRef.current.forEach((enemy) => {
      if (!enemy.alive) return;

      if (Math.random() < 0.02) {
        const dx = player.x - enemy.x;
        const dy = player.y - enemy.y;

        if (Math.abs(dx) > Math.abs(dy)) {
          enemy.x += dx > 0 ? PLAYER_SPEED : -PLAYER_SPEED;
        } else {
          enemy.y += dy > 0 ? PLAYER_SPEED : -PLAYER_SPEED;
        }

        enemy.x = Math.max(0, Math.min(CANVAS_WIDTH - CELL_SIZE, enemy.x));
        enemy.y = Math.max(0, Math.min(CANVAS_HEIGHT - CELL_SIZE, enemy.y));
      }
    });

    // Check collisions with enemies
    enemiesRef.current.forEach((enemy) => {
      if (!enemy.alive) return;
      const dx = Math.abs(player.x - enemy.x);
      const dy = Math.abs(player.y - enemy.y);
      if (dx < CELL_SIZE && dy < CELL_SIZE) {
        setLives((l) => {
          const newLives = l - 1;
          if (newLives <= 0) {
            setGameOver(true);
            setIsPaused(true);
            setShowScoreDialog(true);
          } else {
            playerRef.current = { x: CELL_SIZE, y: CELL_SIZE, direction: 'right' };
          }
          return newLives;
        });
      }
    });

    // Attack (space key)
    if (keysRef.current.has(' ')) {
      enemiesRef.current.forEach((enemy) => {
        if (!enemy.alive) return;
        const dx = Math.abs(player.x - enemy.x);
        const dy = Math.abs(player.y - enemy.y);
        if (dx < CELL_SIZE * 2 && dy < CELL_SIZE * 2) {
          enemy.alive = false;
          setScore((s) => s + 100);
        }
      });
    }

    // Check level complete
    if (enemiesRef.current.every((e) => !e.alive)) {
      setScore((s) => s + 500);
      // Respawn enemies
      enemiesRef.current = [];
      for (let i = 0; i < 4; i++) {
        enemiesRef.current.push({
          x: Math.floor(Math.random() * (CANVAS_WIDTH / CELL_SIZE)) * CELL_SIZE,
          y: (Math.floor(Math.random() * 10) + 5) * CELL_SIZE,
          type: i % 2 === 0 ? 'pooka' : 'fygar',
          alive: true,
        });
      }
    }
  }, [isPaused, gameOver]);

  const gameLoop = useCallback(() => {
    update();
    draw();
    gameLoopRef.current = requestAnimationFrame(gameLoop);
  }, [update, draw]);

  useEffect(() => {
    initGame();
  }, [initGame]);

  useEffect(() => {
    if (!isPaused && !gameOver) {
      gameLoopRef.current = requestAnimationFrame(gameLoop);
    }
    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
    };
  }, [isPaused, gameOver, gameLoop]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' '].includes(e.key)) {
        e.preventDefault();
        keysRef.current.add(e.key);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current.delete(e.key);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  const handleStart = () => {
    if (gameOver) {
      initGame();
    }
    setIsPaused(false);
  };

  const handlePause = () => {
    setIsPaused(true);
  };

  const handleReset = () => {
    initGame();
    setIsPaused(true);
  };

  const handleSubmitScore = async () => {
    if (!playerName.trim()) {
      toast.error('Please enter your name');
      return;
    }

    try {
      await submitScoreMutation.mutateAsync({
        game: 'Dig Dug',
        playerName: playerName.trim(),
        score: BigInt(score),
      });
      toast.success('Score submitted successfully!');
      setShowScoreDialog(false);
      setPlayerName('');
    } catch (error) {
      toast.error('Failed to submit score');
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <Button variant="ghost" onClick={() => navigate({ to: '/' })} className="mb-4">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Games
      </Button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card className="border-4 border-primary">
            <CardHeader>
              <CardTitle className="text-3xl pixel-font text-center">DIG DUG</CardTitle>
            </CardHeader>
            <CardContent className="flex justify-center">
              <canvas
                ref={canvasRef}
                width={CANVAS_WIDTH}
                height={CANVAS_HEIGHT}
                className="border-4 border-accent rounded-lg bg-background"
              />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border-2 border-primary">
            <CardHeader>
              <CardTitle className="pixel-font">SCORE</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold pixel-font text-primary">{score}</div>
              <div className="text-lg mt-2">Lives: {lives}</div>
            </CardContent>
          </Card>

          <Card className="border-2 border-primary">
            <CardHeader>
              <CardTitle className="pixel-font">CONTROLS</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button onClick={handleStart} disabled={!isPaused && !gameOver} className="w-full pixel-font">
                <Play className="h-4 w-4 mr-2" />
                Start
              </Button>
              <Button onClick={handlePause} disabled={isPaused || gameOver} className="w-full pixel-font" variant="outline">
                <Pause className="h-4 w-4 mr-2" />
                Pause
              </Button>
              <Button onClick={handleReset} className="w-full pixel-font" variant="outline">
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset
              </Button>
            </CardContent>
          </Card>

          <Card className="border-2 border-primary">
            <CardHeader>
              <CardTitle className="pixel-font">HOW TO PLAY</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <p>• Arrow keys to move and dig</p>
              <p>• Space to attack enemies</p>
              <p>• Dig tunnels through dirt</p>
              <p>• Defeat all enemies</p>
              <p>• Avoid getting caught</p>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={showScoreDialog} onOpenChange={setShowScoreDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="pixel-font text-2xl">Game Over!</DialogTitle>
            <DialogDescription>
              Your final score: <span className="text-primary font-bold text-xl">{score}</span>
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
