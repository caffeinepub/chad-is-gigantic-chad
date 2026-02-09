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

type Bubble = { x: number; y: number; color: number; row: number; col: number };
type ShootingBubble = { x: number; y: number; vx: number; vy: number; color: number };

const CANVAS_WIDTH = 600;
const CANVAS_HEIGHT = 700;
const BUBBLE_RADIUS = 20;
const COLORS = [0, 60, 140, 200, 280, 330];

export default function BubbleShooterGame() {
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [isPaused, setIsPaused] = useState(true);
  const [showScoreDialog, setShowScoreDialog] = useState(false);
  const [playerName, setPlayerName] = useState('');
  const gameLoopRef = useRef<number | null>(null);
  const submitScoreMutation = useSubmitScore();

  const bubblesRef = useRef<Bubble[]>([]);
  const shootingBubbleRef = useRef<ShootingBubble | null>(null);
  const nextColorRef = useRef<number>(0);
  const shooterAngleRef = useRef<number>(0);
  const shooterXRef = useRef<number>(CANVAS_WIDTH / 2);

  const initGame = useCallback(() => {
    bubblesRef.current = [];
    shootingBubbleRef.current = null;
    nextColorRef.current = COLORS[Math.floor(Math.random() * COLORS.length)];
    shooterAngleRef.current = 0;

    // Create initial bubbles
    for (let row = 0; row < 5; row++) {
      const cols = row % 2 === 0 ? 13 : 12;
      for (let col = 0; col < cols; col++) {
        const x = col * (BUBBLE_RADIUS * 2) + (row % 2 === 0 ? BUBBLE_RADIUS : BUBBLE_RADIUS * 2) + 20;
        const y = row * (BUBBLE_RADIUS * 1.8) + BUBBLE_RADIUS + 20;
        bubblesRef.current.push({
          x,
          y,
          color: COLORS[Math.floor(Math.random() * COLORS.length)],
          row,
          col,
        });
      }
    }

    setScore(0);
    setGameOver(false);
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = 'oklch(0.15 0.02 264)';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw bubbles
    bubblesRef.current.forEach((bubble) => {
      ctx.fillStyle = `oklch(0.7 0.25 ${bubble.color})`;
      ctx.beginPath();
      ctx.arc(bubble.x, bubble.y, BUBBLE_RADIUS, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'oklch(0.85 0.25 85)';
      ctx.lineWidth = 2;
      ctx.stroke();
    });

    // Draw shooting bubble
    if (shootingBubbleRef.current) {
      const sb = shootingBubbleRef.current;
      ctx.fillStyle = `oklch(0.7 0.25 ${sb.color})`;
      ctx.beginPath();
      ctx.arc(sb.x, sb.y, BUBBLE_RADIUS, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'oklch(0.85 0.25 85)';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // Draw shooter
    ctx.save();
    ctx.translate(shooterXRef.current, CANVAS_HEIGHT - 40);
    ctx.rotate(shooterAngleRef.current);
    ctx.strokeStyle = 'oklch(0.75 0.25 180)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, -40);
    ctx.stroke();
    ctx.fillStyle = `oklch(0.7 0.25 ${nextColorRef.current})`;
    ctx.beginPath();
    ctx.arc(0, 0, BUBBLE_RADIUS, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }, []);

  const findMatches = useCallback((bubble: Bubble): Bubble[] => {
    const matches: Bubble[] = [bubble];
    const toCheck: Bubble[] = [bubble];
    const checked = new Set<Bubble>();

    while (toCheck.length > 0) {
      const current = toCheck.pop()!;
      if (checked.has(current)) continue;
      checked.add(current);

      bubblesRef.current.forEach((b) => {
        if (checked.has(b) || b.color !== bubble.color) return;
        const dx = b.x - current.x;
        const dy = b.y - current.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < BUBBLE_RADIUS * 2.2) {
          matches.push(b);
          toCheck.push(b);
        }
      });
    }

    return matches;
  }, []);

  const update = useCallback(() => {
    if (isPaused || gameOver) return;

    if (shootingBubbleRef.current) {
      const sb = shootingBubbleRef.current;
      sb.x += sb.vx;
      sb.y += sb.vy;

      // Wall bounce
      if (sb.x - BUBBLE_RADIUS < 0 || sb.x + BUBBLE_RADIUS > CANVAS_WIDTH) {
        sb.vx *= -1;
        sb.x = sb.x < CANVAS_WIDTH / 2 ? BUBBLE_RADIUS : CANVAS_WIDTH - BUBBLE_RADIUS;
      }

      // Check collision with bubbles
      let collided = false;
      bubblesRef.current.forEach((bubble) => {
        const dx = bubble.x - sb.x;
        const dy = bubble.y - sb.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < BUBBLE_RADIUS * 2) {
          collided = true;
        }
      });

      // Check top collision
      if (sb.y - BUBBLE_RADIUS < 20) {
        collided = true;
      }

      if (collided) {
        // Add bubble to grid
        const newBubble: Bubble = {
          x: sb.x,
          y: sb.y,
          color: sb.color,
          row: Math.floor(sb.y / (BUBBLE_RADIUS * 1.8)),
          col: Math.floor(sb.x / (BUBBLE_RADIUS * 2)),
        };
        bubblesRef.current.push(newBubble);

        // Find matches
        const matches = findMatches(newBubble);
        if (matches.length >= 3) {
          bubblesRef.current = bubblesRef.current.filter((b) => !matches.includes(b));
          setScore((s) => s + matches.length * 10);
        }

        shootingBubbleRef.current = null;
        nextColorRef.current = COLORS[Math.floor(Math.random() * COLORS.length)];

        // Check win/lose
        if (bubblesRef.current.length === 0) {
          setScore((s) => s + 500);
          setGameOver(true);
          setIsPaused(true);
          setShowScoreDialog(true);
        } else if (bubblesRef.current.some((b) => b.y > CANVAS_HEIGHT - 150)) {
          setGameOver(true);
          setIsPaused(true);
          setShowScoreDialog(true);
        }
      }
    }
  }, [isPaused, gameOver, findMatches]);

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
    const handleMouseMove = (e: MouseEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      shooterAngleRef.current = Math.atan2(y - (CANVAS_HEIGHT - 40), x - shooterXRef.current);
    };

    const handleClick = () => {
      if (isPaused || gameOver || shootingBubbleRef.current) return;
      const speed = 10;
      shootingBubbleRef.current = {
        x: shooterXRef.current,
        y: CANVAS_HEIGHT - 40,
        vx: Math.cos(shooterAngleRef.current) * speed,
        vy: Math.sin(shooterAngleRef.current) * speed,
        color: nextColorRef.current,
      };
    };

    const canvas = canvasRef.current;
    if (canvas) {
      canvas.addEventListener('mousemove', handleMouseMove);
      canvas.addEventListener('click', handleClick);
      return () => {
        canvas.removeEventListener('mousemove', handleMouseMove);
        canvas.removeEventListener('click', handleClick);
      };
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
        game: 'Bubble Shooter',
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
              <CardTitle className="text-3xl pixel-font text-center">BUBBLE SHOOTER</CardTitle>
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
              <p>• Move mouse to aim</p>
              <p>• Click to shoot bubbles</p>
              <p>• Match 3+ same colors</p>
              <p>• Clear all bubbles to win</p>
              <p>• Don't let bubbles reach bottom</p>
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
