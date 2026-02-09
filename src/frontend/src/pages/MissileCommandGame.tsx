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
type Missile = Position & { targetX: number; targetY: number; speed: number };
type Explosion = Position & { radius: number; maxRadius: number; growing: boolean };
type DefenseMissile = Position & { targetX: number; targetY: number };

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const BASE_Y = CANVAS_HEIGHT - 40;

export default function MissileCommandGame() {
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [bases, setBases] = useState([true, true, true, true, true, true]);
  const [gameOver, setGameOver] = useState(false);
  const [isPaused, setIsPaused] = useState(true);
  const [showScoreDialog, setShowScoreDialog] = useState(false);
  const [playerName, setPlayerName] = useState('');
  const gameLoopRef = useRef<number | null>(null);
  const submitScoreMutation = useSubmitScore();

  const missilesRef = useRef<Missile[]>([]);
  const explosionsRef = useRef<Explosion[]>([]);
  const defenseMissilesRef = useRef<DefenseMissile[]>([]);
  const lastSpawnRef = useRef<number>(0);
  const waveRef = useRef<number>(1);

  const initGame = useCallback(() => {
    missilesRef.current = [];
    explosionsRef.current = [];
    defenseMissilesRef.current = [];
    lastSpawnRef.current = 0;
    waveRef.current = 1;
    setBases([true, true, true, true, true, true]);
    setScore(0);
    setGameOver(false);
  }, []);

  const spawnMissile = useCallback(() => {
    const targetBase = Math.floor(Math.random() * 6);
    const baseX = 100 + targetBase * 120;
    missilesRef.current.push({
      x: Math.random() * CANVAS_WIDTH,
      y: 0,
      targetX: baseX,
      targetY: BASE_Y,
      speed: 1 + waveRef.current * 0.2,
    });
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = 'oklch(0.1 0.02 264)';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw bases
    bases.forEach((active, index) => {
      if (active) {
        const x = 100 + index * 120;
        ctx.fillStyle = 'oklch(0.65 0.25 180)';
        ctx.fillRect(x - 20, BASE_Y, 40, 30);
        ctx.fillStyle = 'oklch(0.75 0.25 180)';
        ctx.beginPath();
        ctx.arc(x, BASE_Y, 15, 0, Math.PI, true);
        ctx.fill();
      }
    });

    // Draw enemy missiles
    ctx.strokeStyle = 'oklch(0.75 0.25 0)';
    ctx.lineWidth = 2;
    missilesRef.current.forEach((missile) => {
      ctx.beginPath();
      ctx.moveTo(missile.x, 0);
      ctx.lineTo(missile.x, missile.y);
      ctx.stroke();
      ctx.fillStyle = 'oklch(0.85 0.25 0)';
      ctx.beginPath();
      ctx.arc(missile.x, missile.y, 4, 0, Math.PI * 2);
      ctx.fill();
    });

    // Draw defense missiles
    ctx.strokeStyle = 'oklch(0.75 0.25 140)';
    defenseMissilesRef.current.forEach((dm) => {
      ctx.beginPath();
      ctx.moveTo(CANVAS_WIDTH / 2, BASE_Y);
      ctx.lineTo(dm.x, dm.y);
      ctx.stroke();
      ctx.fillStyle = 'oklch(0.85 0.25 140)';
      ctx.beginPath();
      ctx.arc(dm.x, dm.y, 3, 0, Math.PI * 2);
      ctx.fill();
    });

    // Draw explosions
    explosionsRef.current.forEach((explosion) => {
      const gradient = ctx.createRadialGradient(
        explosion.x,
        explosion.y,
        0,
        explosion.x,
        explosion.y,
        explosion.radius
      );
      gradient.addColorStop(0, 'oklch(0.85 0.25 85 / 0.8)');
      gradient.addColorStop(0.5, 'oklch(0.75 0.25 60 / 0.5)');
      gradient.addColorStop(1, 'oklch(0.65 0.25 30 / 0)');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(explosion.x, explosion.y, explosion.radius, 0, Math.PI * 2);
      ctx.fill();
    });
  }, [bases]);

  const update = useCallback(() => {
    if (isPaused || gameOver) return;

    const now = Date.now();
    if (now - lastSpawnRef.current > 2000 / waveRef.current) {
      spawnMissile();
      lastSpawnRef.current = now;
    }

    // Move enemy missiles
    missilesRef.current = missilesRef.current.filter((missile) => {
      const dx = missile.targetX - missile.x;
      const dy = missile.targetY - missile.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < missile.speed) {
        // Hit base
        const baseIndex = Math.floor((missile.targetX - 80) / 120);
        if (baseIndex >= 0 && baseIndex < 6 && bases[baseIndex]) {
          setBases((b) => {
            const newBases = [...b];
            newBases[baseIndex] = false;
            if (newBases.every((base) => !base)) {
              setGameOver(true);
              setIsPaused(true);
              setShowScoreDialog(true);
            }
            return newBases;
          });
        }
        return false;
      }

      missile.x += (dx / dist) * missile.speed;
      missile.y += (dy / dist) * missile.speed;
      return true;
    });

    // Move defense missiles
    defenseMissilesRef.current = defenseMissilesRef.current.filter((dm) => {
      const dx = dm.targetX - dm.x;
      const dy = dm.targetY - dm.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 5) {
        explosionsRef.current.push({
          x: dm.x,
          y: dm.y,
          radius: 0,
          maxRadius: 50,
          growing: true,
        });
        return false;
      }

      dm.x += (dx / dist) * 8;
      dm.y += (dy / dist) * 8;
      return true;
    });

    // Update explosions
    explosionsRef.current = explosionsRef.current.filter((explosion) => {
      if (explosion.growing) {
        explosion.radius += 2;
        if (explosion.radius >= explosion.maxRadius) {
          explosion.growing = false;
        }
      } else {
        explosion.radius -= 1;
      }
      return explosion.radius > 0;
    });

    // Check collisions
    missilesRef.current = missilesRef.current.filter((missile) => {
      const hit = explosionsRef.current.some((explosion) => {
        const dx = explosion.x - missile.x;
        const dy = explosion.y - missile.y;
        return Math.sqrt(dx * dx + dy * dy) < explosion.radius;
      });
      if (hit) {
        setScore((s) => s + 25);
      }
      return !hit;
    });

    // Check wave completion
    if (missilesRef.current.length === 0 && now - lastSpawnRef.current > 3000) {
      waveRef.current += 1;
      setScore((s) => s + 100);
    }
  }, [isPaused, gameOver, spawnMissile, bases]);

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
    const handleClick = (e: MouseEvent) => {
      if (isPaused || gameOver) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      defenseMissilesRef.current.push({
        x: CANVAS_WIDTH / 2,
        y: BASE_Y,
        targetX: x,
        targetY: y,
      });
    };

    const canvas = canvasRef.current;
    if (canvas) {
      canvas.addEventListener('click', handleClick);
      return () => canvas.removeEventListener('click', handleClick);
    }
  }, [isPaused, gameOver]);

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
        game: 'Missile Command',
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
              <CardTitle className="text-3xl pixel-font text-center">MISSILE COMMAND</CardTitle>
            </CardHeader>
            <CardContent className="flex justify-center">
              <canvas
                ref={canvasRef}
                width={CANVAS_WIDTH}
                height={CANVAS_HEIGHT}
                className="border-4 border-accent rounded-lg bg-background cursor-crosshair"
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
              <div className="text-lg mt-2">Wave: {waveRef.current}</div>
              <div className="text-sm mt-2">Bases: {bases.filter((b) => b).length}/6</div>
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
              <p>• Click to fire missiles</p>
              <p>• Destroy incoming missiles</p>
              <p>• Protect your bases</p>
              <p>• Survive waves of attacks</p>
              <p>• Game ends when all bases destroyed</p>
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
