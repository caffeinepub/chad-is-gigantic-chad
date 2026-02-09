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
type Mushroom = Position;
type CentipedeSegment = Position & { direction: number };
type Bullet = Position;

const CANVAS_WIDTH = 600;
const CANVAS_HEIGHT = 700;
const CELL_SIZE = 20;
const PLAYER_SPEED = 5;
const BULLET_SPEED = 8;
const CENTIPEDE_SPEED = 2;

export default function CentipedeGame() {
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

  const playerRef = useRef<Position>({ x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT - 40 });
  const centipedeRef = useRef<CentipedeSegment[]>([]);
  const mushroomsRef = useRef<Mushroom[]>([]);
  const bulletsRef = useRef<Bullet[]>([]);
  const keysRef = useRef<Set<string>>(new Set());
  const lastShotRef = useRef<number>(0);

  const initGame = useCallback(() => {
    playerRef.current = { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT - 40 };
    centipedeRef.current = [];
    mushroomsRef.current = [];
    bulletsRef.current = [];
    
    // Create centipede
    for (let i = 0; i < 12; i++) {
      centipedeRef.current.push({ x: i * CELL_SIZE, y: 20, direction: 1 });
    }
    
    // Create mushrooms
    for (let i = 0; i < 30; i++) {
      mushroomsRef.current.push({
        x: Math.floor(Math.random() * (CANVAS_WIDTH / CELL_SIZE)) * CELL_SIZE,
        y: Math.floor(Math.random() * (CANVAS_HEIGHT / CELL_SIZE - 3)) * CELL_SIZE + 40,
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

    ctx.fillStyle = 'oklch(0.15 0.02 264)';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw mushrooms
    ctx.fillStyle = 'oklch(0.75 0.15 140)';
    mushroomsRef.current.forEach((mushroom) => {
      ctx.beginPath();
      ctx.arc(mushroom.x + CELL_SIZE / 2, mushroom.y + CELL_SIZE / 2, CELL_SIZE / 2, 0, Math.PI * 2);
      ctx.fill();
    });

    // Draw centipede
    centipedeRef.current.forEach((segment, index) => {
      const hue = 280 + (index * 10);
      ctx.fillStyle = `oklch(0.65 0.25 ${hue})`;
      ctx.beginPath();
      ctx.arc(segment.x + CELL_SIZE / 2, segment.y + CELL_SIZE / 2, CELL_SIZE / 2, 0, Math.PI * 2);
      ctx.fill();
    });

    // Draw bullets
    ctx.fillStyle = 'oklch(0.85 0.25 85)';
    bulletsRef.current.forEach((bullet) => {
      ctx.fillRect(bullet.x - 2, bullet.y, 4, 10);
    });

    // Draw player
    ctx.fillStyle = 'oklch(0.75 0.25 180)';
    ctx.beginPath();
    ctx.moveTo(playerRef.current.x, playerRef.current.y + 20);
    ctx.lineTo(playerRef.current.x - 15, playerRef.current.y);
    ctx.lineTo(playerRef.current.x + 15, playerRef.current.y);
    ctx.closePath();
    ctx.fill();
  }, []);

  const update = useCallback(() => {
    if (isPaused || gameOver) return;

    // Move player
    if (keysRef.current.has('ArrowLeft')) {
      playerRef.current.x = Math.max(15, playerRef.current.x - PLAYER_SPEED);
    }
    if (keysRef.current.has('ArrowRight')) {
      playerRef.current.x = Math.min(CANVAS_WIDTH - 15, playerRef.current.x + PLAYER_SPEED);
    }
    if (keysRef.current.has('ArrowUp')) {
      playerRef.current.y = Math.max(CANVAS_HEIGHT - 150, playerRef.current.y - PLAYER_SPEED);
    }
    if (keysRef.current.has('ArrowDown')) {
      playerRef.current.y = Math.min(CANVAS_HEIGHT - 20, playerRef.current.y + PLAYER_SPEED);
    }

    // Shoot
    const now = Date.now();
    if (keysRef.current.has(' ') && now - lastShotRef.current > 300) {
      bulletsRef.current.push({ x: playerRef.current.x, y: playerRef.current.y });
      lastShotRef.current = now;
    }

    // Move bullets
    bulletsRef.current = bulletsRef.current.filter((bullet) => {
      bullet.y -= BULLET_SPEED;
      return bullet.y > 0;
    });

    // Move centipede
    centipedeRef.current.forEach((segment, index) => {
      segment.x += segment.direction * CENTIPEDE_SPEED;

      // Check boundaries and mushrooms
      if (segment.x <= 0 || segment.x >= CANVAS_WIDTH - CELL_SIZE) {
        segment.direction *= -1;
        segment.y += CELL_SIZE;
      }

      const hitMushroom = mushroomsRef.current.some(
        (m) => Math.abs(m.x - segment.x) < CELL_SIZE && Math.abs(m.y - segment.y) < CELL_SIZE
      );
      if (hitMushroom) {
        segment.direction *= -1;
        segment.y += CELL_SIZE;
      }
    });

    // Check bullet collisions with centipede
    bulletsRef.current = bulletsRef.current.filter((bullet) => {
      const hitIndex = centipedeRef.current.findIndex(
        (seg) => Math.abs(seg.x - bullet.x) < CELL_SIZE && Math.abs(seg.y - bullet.y) < CELL_SIZE
      );
      if (hitIndex !== -1) {
        centipedeRef.current.splice(hitIndex, 1);
        setScore((s) => s + 10);
        // Add mushroom where segment was hit
        mushroomsRef.current.push({ x: bullet.x, y: bullet.y });
        return false;
      }
      return true;
    });

    // Check bullet collisions with mushrooms
    bulletsRef.current = bulletsRef.current.filter((bullet) => {
      const hitIndex = mushroomsRef.current.findIndex(
        (m) => Math.abs(m.x - bullet.x) < CELL_SIZE && Math.abs(m.y - bullet.y) < CELL_SIZE
      );
      if (hitIndex !== -1) {
        mushroomsRef.current.splice(hitIndex, 1);
        setScore((s) => s + 1);
        return false;
      }
      return true;
    });

    // Check player collision with centipede
    const playerHit = centipedeRef.current.some(
      (seg) =>
        Math.abs(seg.x - playerRef.current.x) < CELL_SIZE &&
        Math.abs(seg.y - playerRef.current.y) < CELL_SIZE
    );
    if (playerHit) {
      setLives((l) => {
        const newLives = l - 1;
        if (newLives <= 0) {
          setGameOver(true);
          setIsPaused(true);
          setShowScoreDialog(true);
        }
        return newLives;
      });
      playerRef.current = { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT - 40 };
    }

    // Win condition
    if (centipedeRef.current.length === 0) {
      setScore((s) => s + 100);
      // Create new centipede
      for (let i = 0; i < 12; i++) {
        centipedeRef.current.push({ x: i * CELL_SIZE, y: 20, direction: 1 });
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
        game: 'Centipede',
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
              <CardTitle className="text-3xl pixel-font text-center">CENTIPEDE</CardTitle>
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
              <p>• Arrow keys to move</p>
              <p>• Space to shoot</p>
              <p>• Destroy centipede segments</p>
              <p>• Avoid getting hit</p>
              <p>• Clear all segments to win</p>
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
