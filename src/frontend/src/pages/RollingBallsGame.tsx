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

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const BALL_RADIUS = 15;
const GRAVITY = 0.5;
const FRICTION = 0.98;
const ACCELERATION = 0.8;
const MAX_VELOCITY = 12;
const CHECKPOINT_RADIUS = 25;

interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

interface Platform {
  x: number;
  y: number;
  width: number;
  height: number;
  angle: number;
  color: string;
}

interface MovingPlatform extends Platform {
  startX: number;
  endX: number;
  speed: number;
  direction: number;
}

interface Checkpoint {
  x: number;
  y: number;
  collected: boolean;
}

export default function RollingBallsGame() {
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ballRef = useRef<Ball>({ x: 100, y: 100, vx: 0, vy: 0 });
  const keysRef = useRef<Set<string>>(new Set());
  const platformsRef = useRef<(Platform | MovingPlatform)[]>([]);
  const checkpointsRef = useRef<Checkpoint[]>([]);
  const movingPlatformsRef = useRef<MovingPlatform[]>([]);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [isPaused, setIsPaused] = useState(true);
  const [showScoreDialog, setShowScoreDialog] = useState(false);
  const [playerName, setPlayerName] = useState('');
  const [checkpointsCollected, setCheckpointsCollected] = useState(0);
  const animationFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const scoreIntervalRef = useRef<number | null>(null);
  const submitScoreMutation = useSubmitScore();

  const initializeLevel = useCallback(() => {
    // Starting platform
    platformsRef.current = [
      { x: 50, y: 150, width: 150, height: 20, angle: 0, color: 'oklch(0.6 0.118 184.704)' },
      { x: 250, y: 200, width: 120, height: 20, angle: -15, color: 'oklch(0.6 0.118 184.704)' },
      { x: 400, y: 250, width: 100, height: 20, angle: 10, color: 'oklch(0.6 0.118 184.704)' },
      { x: 550, y: 300, width: 150, height: 20, angle: -5, color: 'oklch(0.6 0.118 184.704)' },
      { x: 100, y: 350, width: 120, height: 20, angle: 20, color: 'oklch(0.6 0.118 184.704)' },
      { x: 300, y: 420, width: 180, height: 20, angle: 0, color: 'oklch(0.6 0.118 184.704)' },
      { x: 550, y: 480, width: 140, height: 20, angle: -10, color: 'oklch(0.6 0.118 184.704)' },
    ];

    // Moving platforms
    const movingPlatform1: MovingPlatform = {
      x: 200,
      y: 380,
      width: 100,
      height: 20,
      angle: 0,
      color: 'oklch(0.704 0.191 22.216)',
      startX: 200,
      endX: 400,
      speed: 2,
      direction: 1,
    };

    const movingPlatform2: MovingPlatform = {
      x: 450,
      y: 180,
      width: 80,
      height: 20,
      angle: 0,
      color: 'oklch(0.704 0.191 22.216)',
      startX: 350,
      endX: 550,
      speed: 1.5,
      direction: 1,
    };

    movingPlatformsRef.current = [movingPlatform1, movingPlatform2];
    platformsRef.current.push(movingPlatform1, movingPlatform2);

    // Checkpoints
    checkpointsRef.current = [
      { x: 300, y: 170, collected: false },
      { x: 450, y: 220, collected: false },
      { x: 625, y: 270, collected: false },
      { x: 180, y: 320, collected: false },
      { x: 390, y: 390, collected: false },
      { x: 620, y: 450, collected: false },
    ];

    ballRef.current = { x: 100, y: 100, vx: 0, vy: 0 };
    setCheckpointsCollected(0);
  }, []);

  const resetGame = useCallback(() => {
    initializeLevel();
    setScore(0);
    setGameOver(false);
    setIsPaused(true);
    keysRef.current.clear();
  }, [initializeLevel]);

  useEffect(() => {
    initializeLevel();
  }, [initializeLevel]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameOver) return;
      
      if (e.key === ' ') {
        e.preventDefault();
        setIsPaused((prev) => !prev);
        return;
      }

      keysRef.current.add(e.key.toLowerCase());
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current.delete(e.key.toLowerCase());
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
      scoreIntervalRef.current = window.setInterval(() => {
        setScore((prev) => prev + 1);
      }, 100);
    }

    return () => {
      if (scoreIntervalRef.current) {
        clearInterval(scoreIntervalRef.current);
      }
    };
  }, [isPaused, gameOver]);

  const checkCollision = useCallback((ball: Ball, platform: Platform): boolean => {
    const angleRad = (platform.angle * Math.PI) / 180;
    const cos = Math.cos(angleRad);
    const sin = Math.sin(angleRad);

    const relX = ball.x - platform.x;
    const relY = ball.y - platform.y;

    const rotX = relX * cos + relY * sin;
    const rotY = -relX * sin + relY * cos;

    const halfWidth = platform.width / 2;
    const halfHeight = platform.height / 2;

    const closestX = Math.max(-halfWidth, Math.min(halfWidth, rotX));
    const closestY = Math.max(-halfHeight, Math.min(halfHeight, rotY));

    const distX = rotX - closestX;
    const distY = rotY - closestY;

    return distX * distX + distY * distY < BALL_RADIUS * BALL_RADIUS;
  }, []);

  const gameLoop = useCallback((timestamp: number) => {
    if (isPaused || gameOver) {
      animationFrameRef.current = requestAnimationFrame(gameLoop);
      return;
    }

    const deltaTime = timestamp - lastTimeRef.current;
    if (deltaTime < 16) {
      animationFrameRef.current = requestAnimationFrame(gameLoop);
      return;
    }
    lastTimeRef.current = timestamp;

    const ball = ballRef.current;

    // Handle input
    if (keysRef.current.has('arrowleft') || keysRef.current.has('a')) {
      ball.vx = Math.max(ball.vx - ACCELERATION, -MAX_VELOCITY);
    }
    if (keysRef.current.has('arrowright') || keysRef.current.has('d')) {
      ball.vx = Math.min(ball.vx + ACCELERATION, MAX_VELOCITY);
    }

    // Apply gravity
    ball.vy += GRAVITY;

    // Apply friction
    ball.vx *= FRICTION;

    // Update position
    ball.x += ball.vx;
    ball.y += ball.vy;

    // Update moving platforms
    movingPlatformsRef.current.forEach((platform) => {
      platform.x += platform.speed * platform.direction;
      if (platform.x >= platform.endX || platform.x <= platform.startX) {
        platform.direction *= -1;
      }
    });

    // Check platform collisions
    let onPlatform = false;
    platformsRef.current.forEach((platform) => {
      if (checkCollision(ball, platform)) {
        const angleRad = (platform.angle * Math.PI) / 180;
        
        // Simple collision response - place ball on top of platform
        if (ball.vy > 0) {
          ball.y = platform.y - BALL_RADIUS - platform.height / 2;
          ball.vy = 0;
          onPlatform = true;

          // Transfer platform velocity if it's a moving platform
          const movingPlatform = movingPlatformsRef.current.find(mp => mp === platform);
          if (movingPlatform) {
            ball.vx += movingPlatform.speed * movingPlatform.direction * 0.5;
          }

          // Apply slope effect
          ball.vx += Math.sin(angleRad) * 0.5;
        }
      }
    });

    // Check checkpoint collection
    checkpointsRef.current.forEach((checkpoint) => {
      if (!checkpoint.collected) {
        const dx = ball.x - checkpoint.x;
        const dy = ball.y - checkpoint.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < BALL_RADIUS + CHECKPOINT_RADIUS) {
          checkpoint.collected = true;
          setCheckpointsCollected((prev) => prev + 1);
          setScore((prev) => prev + 100);
          toast.success('Checkpoint collected! +100 points');
        }
      }
    });

    // Check if ball fell off
    if (ball.y > CANVAS_HEIGHT + 100) {
      setGameOver(true);
      setShowScoreDialog(true);
      return;
    }

    // Render
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = 'oklch(0.145 0 0)';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw platforms
    platformsRef.current.forEach((platform) => {
      ctx.save();
      ctx.translate(platform.x, platform.y);
      ctx.rotate((platform.angle * Math.PI) / 180);
      ctx.fillStyle = platform.color;
      ctx.fillRect(-platform.width / 2, -platform.height / 2, platform.width, platform.height);
      ctx.strokeStyle = 'oklch(0.8 0.1 184.704)';
      ctx.lineWidth = 2;
      ctx.strokeRect(-platform.width / 2, -platform.height / 2, platform.width, platform.height);
      ctx.restore();
    });

    // Draw checkpoints
    checkpointsRef.current.forEach((checkpoint) => {
      if (!checkpoint.collected) {
        ctx.beginPath();
        ctx.arc(checkpoint.x, checkpoint.y, CHECKPOINT_RADIUS, 0, Math.PI * 2);
        ctx.fillStyle = 'oklch(0.704 0.191 22.216)';
        ctx.fill();
        ctx.strokeStyle = 'oklch(0.8 0.2 22.216)';
        ctx.lineWidth = 3;
        ctx.stroke();
        
        // Draw star in checkpoint
        ctx.fillStyle = 'oklch(0.9 0.1 60)';
        ctx.font = 'bold 20px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('★', checkpoint.x, checkpoint.y);
      }
    });

    // Draw ball
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, BALL_RADIUS, 0, Math.PI * 2);
    const gradient = ctx.createRadialGradient(ball.x - 5, ball.y - 5, 0, ball.x, ball.y, BALL_RADIUS);
    gradient.addColorStop(0, 'oklch(0.8 0.2 184.704)');
    gradient.addColorStop(1, 'oklch(0.6 0.15 184.704)');
    ctx.fillStyle = gradient;
    ctx.fill();
    ctx.strokeStyle = 'oklch(0.9 0.15 184.704)';
    ctx.lineWidth = 2;
    ctx.stroke();

    animationFrameRef.current = requestAnimationFrame(gameLoop);
  }, [isPaused, gameOver, checkCollision]);

  useEffect(() => {
    lastTimeRef.current = performance.now();
    animationFrameRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [gameLoop]);

  const handleSubmitScore = async () => {
    if (!playerName.trim()) {
      toast.error('Please enter your name');
      return;
    }

    try {
      await submitScoreMutation.mutateAsync({
        game: 'Rolling Balls',
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
      <div className="max-w-6xl mx-auto">
        <Button variant="ghost" onClick={() => navigate({ to: '/' })} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Games
        </Button>

        <div className="grid lg:grid-cols-[1fr_300px] gap-6">
          <Card className="border-4 border-primary">
            <CardHeader>
              <CardTitle className="text-3xl pixel-font">ROLLING BALLS</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-center mb-4">
                <canvas
                  ref={canvasRef}
                  width={CANVAS_WIDTH}
                  height={CANVAS_HEIGHT}
                  className="border-4 border-accent rounded-lg max-w-full"
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
                <CardTitle className="pixel-font">CHECKPOINTS</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-black text-center pixel-font text-accent">
                  {checkpointsCollected} / {checkpointsRef.current.length}
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 border-primary">
              <CardHeader>
                <CardTitle className="text-lg pixel-font">HOW TO PLAY</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p>🎮 <strong>Arrow Keys</strong> or <strong>A/D</strong> to roll</p>
                <p>⏸️ <strong>Space</strong> to pause</p>
                <p>⭐ Collect checkpoints for bonus points</p>
                <p>🎯 Each checkpoint = 100 points</p>
                <p>⏱️ Score increases over time</p>
                <p>⚠️ Don't fall off the platforms!</p>
                <p>🟠 Orange platforms move</p>
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
              <br />
              Checkpoints collected: <span className="text-xl font-bold text-accent">{checkpointsCollected}</span>
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
