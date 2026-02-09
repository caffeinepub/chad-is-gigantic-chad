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

type Ball = { x: number; y: number; vx: number; vy: number };
type Flipper = { x: number; y: number; angle: number; active: boolean };
type Bumper = { x: number; y: number; radius: number };

const CANVAS_WIDTH = 400;
const CANVAS_HEIGHT = 700;
const BALL_RADIUS = 8;
const GRAVITY = 0.3;
const FLIPPER_LENGTH = 80;

export default function PinballGame() {
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [balls, setBalls] = useState(3);
  const [gameOver, setGameOver] = useState(false);
  const [isPaused, setIsPaused] = useState(true);
  const [showScoreDialog, setShowScoreDialog] = useState(false);
  const [playerName, setPlayerName] = useState('');
  const gameLoopRef = useRef<number | null>(null);
  const submitScoreMutation = useSubmitScore();

  const ballRef = useRef<Ball>({ x: 200, y: 100, vx: 2, vy: 0 });
  const leftFlipperRef = useRef<Flipper>({ x: 120, y: 620, angle: -30, active: false });
  const rightFlipperRef = useRef<Flipper>({ x: 280, y: 620, angle: 30, active: false });
  const bumpersRef = useRef<Bumper[]>([
    { x: 150, y: 200, radius: 25 },
    { x: 250, y: 200, radius: 25 },
    { x: 200, y: 280, radius: 25 },
    { x: 120, y: 350, radius: 20 },
    { x: 280, y: 350, radius: 20 },
  ]);
  const keysRef = useRef<Set<string>>(new Set());

  const initGame = useCallback(() => {
    ballRef.current = { x: 200, y: 100, vx: 2, vy: 0 };
    leftFlipperRef.current = { x: 120, y: 620, angle: -30, active: false };
    rightFlipperRef.current = { x: 280, y: 620, angle: 30, active: false };
    setScore(0);
    setBalls(3);
    setGameOver(false);
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = 'oklch(0.15 0.02 264)';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw walls
    ctx.strokeStyle = 'oklch(0.75 0.15 180)';
    ctx.lineWidth = 4;
    ctx.strokeRect(10, 10, CANVAS_WIDTH - 20, CANVAS_HEIGHT - 20);

    // Draw bumpers
    bumpersRef.current.forEach((bumper) => {
      ctx.fillStyle = 'oklch(0.75 0.25 0)';
      ctx.beginPath();
      ctx.arc(bumper.x, bumper.y, bumper.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'oklch(0.85 0.25 60)';
      ctx.lineWidth = 3;
      ctx.stroke();
    });

    // Draw flippers
    const drawFlipper = (flipper: Flipper, isLeft: boolean) => {
      ctx.save();
      ctx.translate(flipper.x, flipper.y);
      ctx.rotate((flipper.angle * Math.PI) / 180);
      ctx.fillStyle = 'oklch(0.75 0.25 140)';
      ctx.fillRect(0, -8, isLeft ? FLIPPER_LENGTH : -FLIPPER_LENGTH, 16);
      ctx.restore();
    };

    drawFlipper(leftFlipperRef.current, true);
    drawFlipper(rightFlipperRef.current, false);

    // Draw ball
    ctx.fillStyle = 'oklch(0.85 0.25 85)';
    ctx.beginPath();
    ctx.arc(ballRef.current.x, ballRef.current.y, BALL_RADIUS, 0, Math.PI * 2);
    ctx.fill();
  }, []);

  const update = useCallback(() => {
    if (isPaused || gameOver) return;

    const ball = ballRef.current;

    // Apply gravity
    ball.vy += GRAVITY;

    // Move ball
    ball.x += ball.vx;
    ball.y += ball.vy;

    // Wall collisions
    if (ball.x - BALL_RADIUS < 10 || ball.x + BALL_RADIUS > CANVAS_WIDTH - 10) {
      ball.vx *= -0.9;
      ball.x = ball.x < CANVAS_WIDTH / 2 ? 10 + BALL_RADIUS : CANVAS_WIDTH - 10 - BALL_RADIUS;
    }
    if (ball.y - BALL_RADIUS < 10) {
      ball.vy *= -0.9;
      ball.y = 10 + BALL_RADIUS;
    }

    // Bottom collision (lose ball)
    if (ball.y > CANVAS_HEIGHT - 10) {
      setBalls((b) => {
        const newBalls = b - 1;
        if (newBalls <= 0) {
          setGameOver(true);
          setIsPaused(true);
          setShowScoreDialog(true);
        } else {
          ballRef.current = { x: 200, y: 100, vx: 2, vy: 0 };
        }
        return newBalls;
      });
    }

    // Bumper collisions
    bumpersRef.current.forEach((bumper) => {
      const dx = ball.x - bumper.x;
      const dy = ball.y - bumper.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < BALL_RADIUS + bumper.radius) {
        const angle = Math.atan2(dy, dx);
        ball.vx = Math.cos(angle) * 8;
        ball.vy = Math.sin(angle) * 8;
        setScore((s) => s + 10);
      }
    });

    // Flipper controls
    if (keysRef.current.has('ArrowLeft') || keysRef.current.has('a')) {
      leftFlipperRef.current.active = true;
      leftFlipperRef.current.angle = Math.min(30, leftFlipperRef.current.angle + 10);
    } else {
      leftFlipperRef.current.active = false;
      leftFlipperRef.current.angle = Math.max(-30, leftFlipperRef.current.angle - 10);
    }

    if (keysRef.current.has('ArrowRight') || keysRef.current.has('d')) {
      rightFlipperRef.current.active = true;
      rightFlipperRef.current.angle = Math.max(-30, rightFlipperRef.current.angle - 10);
    } else {
      rightFlipperRef.current.active = false;
      rightFlipperRef.current.angle = Math.min(30, rightFlipperRef.current.angle + 10);
    }

    // Flipper collisions (simplified)
    const checkFlipperCollision = (flipper: Flipper) => {
      const dx = ball.x - flipper.x;
      const dy = ball.y - flipper.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < FLIPPER_LENGTH && Math.abs(dy) < 20 && flipper.active) {
        ball.vy = -12;
        ball.vx += (ball.x - flipper.x) * 0.1;
        setScore((s) => s + 5);
      }
    };

    checkFlipperCollision(leftFlipperRef.current);
    checkFlipperCollision(rightFlipperRef.current);

    // Friction
    ball.vx *= 0.99;
    ball.vy *= 0.99;
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
      if (['ArrowLeft', 'ArrowRight', 'a', 'd'].includes(e.key)) {
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
        game: 'Pinball',
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
              <CardTitle className="text-3xl pixel-font text-center">PINBALL</CardTitle>
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
              <div className="text-lg mt-2">Balls: {balls}</div>
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
              <p>• Left Arrow or A: Left flipper</p>
              <p>• Right Arrow or D: Right flipper</p>
              <p>• Hit bumpers for points</p>
              <p>• Keep ball in play</p>
              <p>• 3 balls per game</p>
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
