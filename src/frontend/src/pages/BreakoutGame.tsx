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
type Ball = Position & { dx: number; dy: number };
type Brick = Position & { alive: boolean; color: string };

const CANVAS_WIDTH = 600;
const CANVAS_HEIGHT = 500;
const PADDLE_WIDTH = 100;
const PADDLE_HEIGHT = 15;
const BALL_RADIUS = 8;
const BRICK_ROWS = 6;
const BRICK_COLS = 10;
const BRICK_WIDTH = 55;
const BRICK_HEIGHT = 20;

export default function BreakoutGame() {
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [paddle, setPaddle] = useState<Position>({ x: CANVAS_WIDTH / 2 - PADDLE_WIDTH / 2, y: CANVAS_HEIGHT - 40 });
  const [ball, setBall] = useState<Ball>({ x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT - 60, dx: 4, dy: -4 });
  const [bricks, setBricks] = useState<Brick[]>([]);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [gameOver, setGameOver] = useState(false);
  const [isPaused, setIsPaused] = useState(true);
  const [showScoreDialog, setShowScoreDialog] = useState(false);
  const [playerName, setPlayerName] = useState('');
  const keysPressed = useRef<Set<string>>(new Set());
  const gameLoopRef = useRef<number | null>(null);
  const submitScoreMutation = useSubmitScore();

  const initializeBricks = useCallback(() => {
    const newBricks: Brick[] = [];
    const colors = [
      'oklch(0.7 0.25 0)',
      'oklch(0.7 0.2 30)',
      'oklch(0.7 0.2 60)',
      'oklch(0.6 0.25 120)',
      'oklch(0.6 0.2 200)',
      'oklch(0.6 0.2 280)',
    ];
    for (let row = 0; row < BRICK_ROWS; row++) {
      for (let col = 0; col < BRICK_COLS; col++) {
        newBricks.push({
          x: col * (BRICK_WIDTH + 5) + 20,
          y: row * (BRICK_HEIGHT + 5) + 50,
          alive: true,
          color: colors[row],
        });
      }
    }
    return newBricks;
  }, []);

  const resetGame = useCallback(() => {
    setPaddle({ x: CANVAS_WIDTH / 2 - PADDLE_WIDTH / 2, y: CANVAS_HEIGHT - 40 });
    setBall({ x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT - 60, dx: 4, dy: -4 });
    setBricks(initializeBricks());
    setScore(0);
    setLives(3);
    setGameOver(false);
    setIsPaused(true);
  }, [initializeBricks]);

  useEffect(() => {
    setBricks(initializeBricks());
  }, [initializeBricks]);

  const gameLoop = useCallback(() => {
    if (isPaused || gameOver) return;

    setPaddle(prev => {
      let newX = prev.x;
      if (keysPressed.current.has('arrowleft') || keysPressed.current.has('a')) {
        newX = Math.max(0, prev.x - 7);
      }
      if (keysPressed.current.has('arrowright') || keysPressed.current.has('d')) {
        newX = Math.min(CANVAS_WIDTH - PADDLE_WIDTH, prev.x + 7);
      }
      return { ...prev, x: newX };
    });

    setBall(prevBall => {
      let newBall = { ...prevBall };
      newBall.x += newBall.dx;
      newBall.y += newBall.dy;

      if (newBall.x - BALL_RADIUS <= 0 || newBall.x + BALL_RADIUS >= CANVAS_WIDTH) {
        newBall.dx = -newBall.dx;
      }

      if (newBall.y - BALL_RADIUS <= 0) {
        newBall.dy = -newBall.dy;
      }

      if (newBall.y + BALL_RADIUS >= paddle.y &&
          newBall.y - BALL_RADIUS <= paddle.y + PADDLE_HEIGHT &&
          newBall.x >= paddle.x &&
          newBall.x <= paddle.x + PADDLE_WIDTH) {
        newBall.dy = -Math.abs(newBall.dy);
        const hitPos = (newBall.x - paddle.x) / PADDLE_WIDTH;
        newBall.dx = (hitPos - 0.5) * 10;
      }

      if (newBall.y - BALL_RADIUS > CANVAS_HEIGHT) {
        setLives(prev => {
          const newLives = prev - 1;
          if (newLives <= 0) {
            setGameOver(true);
            setShowScoreDialog(true);
          } else {
            setBall({ x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT - 60, dx: 4, dy: -4 });
            setIsPaused(true);
          }
          return newLives;
        });
        return prevBall;
      }

      setBricks(prevBricks => {
        let newBricks = [...prevBricks];
        let hit = false;

        newBricks.forEach(brick => {
          if (brick.alive &&
              newBall.x + BALL_RADIUS >= brick.x &&
              newBall.x - BALL_RADIUS <= brick.x + BRICK_WIDTH &&
              newBall.y + BALL_RADIUS >= brick.y &&
              newBall.y - BALL_RADIUS <= brick.y + BRICK_HEIGHT) {
            brick.alive = false;
            hit = true;
            setScore(prev => prev + 50);
          }
        });

        if (hit) {
          newBall.dy = -newBall.dy;
        }

        const allDestroyed = newBricks.every(brick => !brick.alive);
        if (allDestroyed) {
          setGameOver(true);
          setShowScoreDialog(true);
        }

        return newBricks;
      });

      return newBall;
    });
  }, [isPaused, gameOver, paddle]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameOver) return;
      keysPressed.current.add(e.key.toLowerCase());

      if (e.key === ' ') {
        e.preventDefault();
        setIsPaused(prev => !prev);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.current.delete(e.key.toLowerCase());
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameOver]);

  useEffect(() => {
    if (!isPaused && !gameOver) {
      gameLoopRef.current = window.requestAnimationFrame(function animate() {
        gameLoop();
        gameLoopRef.current = window.requestAnimationFrame(animate);
      });
    }
    return () => {
      if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
    };
  }, [gameLoop, isPaused, gameOver]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = 'oklch(0.145 0 0)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    bricks.forEach(brick => {
      if (brick.alive) {
        ctx.fillStyle = brick.color;
        ctx.fillRect(brick.x, brick.y, BRICK_WIDTH, BRICK_HEIGHT);
        ctx.strokeStyle = 'oklch(0.145 0 0)';
        ctx.lineWidth = 2;
        ctx.strokeRect(brick.x, brick.y, BRICK_WIDTH, BRICK_HEIGHT);
      }
    });

    ctx.fillStyle = 'oklch(0.646 0.222 41.116)';
    ctx.fillRect(paddle.x, paddle.y, PADDLE_WIDTH, PADDLE_HEIGHT);

    ctx.fillStyle = 'oklch(0.9 0.2 60)';
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, BALL_RADIUS, 0, Math.PI * 2);
    ctx.fill();
  }, [paddle, ball, bricks]);

  const handleSubmitScore = async () => {
    if (!playerName.trim()) {
      toast.error('Please enter your name');
      return;
    }

    try {
      await submitScoreMutation.mutateAsync({
        game: 'Breakout',
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
              <CardTitle className="text-3xl pixel-font">BREAKOUT</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-center mb-4">
                <canvas
                  ref={canvasRef}
                  width={CANVAS_WIDTH}
                  height={CANVAS_HEIGHT}
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
                <div className="text-4xl text-center">{'❤️'.repeat(lives)}</div>
              </CardContent>
            </Card>

            <Card className="border-2 border-primary">
              <CardHeader>
                <CardTitle className="text-lg pixel-font">HOW TO PLAY</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p>🎮 <strong>Arrow Keys</strong> or <strong>A/D</strong> to move paddle</p>
                <p>⏸️ <strong>Space</strong> to pause</p>
                <p>🧱 Break all bricks = 50 points each</p>
                <p>⚠️ Don't let the ball fall!</p>
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
