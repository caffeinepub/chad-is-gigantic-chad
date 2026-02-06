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
type Ship = Position & { angle: number; dx: number; dy: number };
type Bullet = Position & { dx: number; dy: number; life: number };
type Asteroid = Position & { dx: number; dy: number; size: number };

const CANVAS_WIDTH = 600;
const CANVAS_HEIGHT = 500;
const SHIP_SIZE = 15;

export default function AsteroidsGame() {
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ship, setShip] = useState<Ship>({ x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2, angle: 0, dx: 0, dy: 0 });
  const [bullets, setBullets] = useState<Bullet[]>([]);
  const [asteroids, setAsteroids] = useState<Asteroid[]>([]);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [gameOver, setGameOver] = useState(false);
  const [isPaused, setIsPaused] = useState(true);
  const [showScoreDialog, setShowScoreDialog] = useState(false);
  const [playerName, setPlayerName] = useState('');
  const [invulnerable, setInvulnerable] = useState(false);
  const keysPressed = useRef<Set<string>>(new Set());
  const gameLoopRef = useRef<number | null>(null);
  const submitScoreMutation = useSubmitScore();

  const initializeAsteroids = useCallback(() => {
    const newAsteroids: Asteroid[] = [];
    for (let i = 0; i < 5; i++) {
      const angle = Math.random() * Math.PI * 2;
      newAsteroids.push({
        x: Math.random() * CANVAS_WIDTH,
        y: Math.random() * CANVAS_HEIGHT,
        dx: Math.cos(angle) * 2,
        dy: Math.sin(angle) * 2,
        size: 3,
      });
    }
    return newAsteroids;
  }, []);

  const resetGame = useCallback(() => {
    setShip({ x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2, angle: 0, dx: 0, dy: 0 });
    setBullets([]);
    setAsteroids(initializeAsteroids());
    setScore(0);
    setLives(3);
    setGameOver(false);
    setIsPaused(true);
    setInvulnerable(false);
  }, [initializeAsteroids]);

  useEffect(() => {
    setAsteroids(initializeAsteroids());
  }, [initializeAsteroids]);

  const gameLoop = useCallback(() => {
    if (isPaused || gameOver) return;

    setShip(prev => {
      let newShip = { ...prev };

      if (keysPressed.current.has('arrowleft') || keysPressed.current.has('a')) {
        newShip.angle -= 0.1;
      }
      if (keysPressed.current.has('arrowright') || keysPressed.current.has('d')) {
        newShip.angle += 0.1;
      }
      if (keysPressed.current.has('arrowup') || keysPressed.current.has('w')) {
        newShip.dx += Math.cos(newShip.angle) * 0.3;
        newShip.dy += Math.sin(newShip.angle) * 0.3;
      }

      newShip.dx *= 0.99;
      newShip.dy *= 0.99;

      newShip.x += newShip.dx;
      newShip.y += newShip.dy;

      if (newShip.x < 0) newShip.x = CANVAS_WIDTH;
      if (newShip.x > CANVAS_WIDTH) newShip.x = 0;
      if (newShip.y < 0) newShip.y = CANVAS_HEIGHT;
      if (newShip.y > CANVAS_HEIGHT) newShip.y = 0;

      return newShip;
    });

    setBullets(prev => 
      prev.map(bullet => ({
        ...bullet,
        x: bullet.x + bullet.dx,
        y: bullet.y + bullet.dy,
        life: bullet.life - 1,
      }))
      .filter(bullet => bullet.life > 0)
    );

    setAsteroids(prev => {
      let newAsteroids = prev.map(asteroid => {
        let newAst = { ...asteroid };
        newAst.x += newAst.dx;
        newAst.y += newAst.dy;

        if (newAst.x < 0) newAst.x = CANVAS_WIDTH;
        if (newAst.x > CANVAS_WIDTH) newAst.x = 0;
        if (newAst.y < 0) newAst.y = CANVAS_HEIGHT;
        if (newAst.y > CANVAS_HEIGHT) newAst.y = 0;

        return newAst;
      });

      if (!invulnerable) {
        const collision = newAsteroids.some(asteroid => {
          const dx = asteroid.x - ship.x;
          const dy = asteroid.y - ship.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          return distance < asteroid.size * 10 + SHIP_SIZE;
        });

        if (collision) {
          setLives(prev => {
            const newLives = prev - 1;
            if (newLives <= 0) {
              setGameOver(true);
              setShowScoreDialog(true);
            } else {
              setShip({ x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2, angle: 0, dx: 0, dy: 0 });
              setInvulnerable(true);
              setTimeout(() => setInvulnerable(false), 2000);
            }
            return newLives;
          });
        }
      }

      return newAsteroids;
    });

    setBullets(prevBullets => {
      let newBullets = [...prevBullets];
      setAsteroids(prevAsteroids => {
        let newAsteroids: Asteroid[] = [];
        let asteroidsToRemove = new Set<number>();

        prevAsteroids.forEach((asteroid, astIndex) => {
          let hit = false;
          newBullets.forEach((bullet, bulletIndex) => {
            const dx = asteroid.x - bullet.x;
            const dy = asteroid.y - bullet.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance < asteroid.size * 10) {
              hit = true;
              newBullets[bulletIndex].life = 0;
            }
          });

          if (hit) {
            asteroidsToRemove.add(astIndex);
            setScore(prev => prev + (4 - asteroid.size) * 100);

            if (asteroid.size > 1) {
              for (let i = 0; i < 2; i++) {
                const angle = Math.random() * Math.PI * 2;
                newAsteroids.push({
                  x: asteroid.x,
                  y: asteroid.y,
                  dx: Math.cos(angle) * 2,
                  dy: Math.sin(angle) * 2,
                  size: asteroid.size - 1,
                });
              }
            }
          } else {
            newAsteroids.push(asteroid);
          }
        });

        if (newAsteroids.length === 0) {
          setGameOver(true);
          setShowScoreDialog(true);
        }

        return newAsteroids;
      });
      return newBullets;
    });
  }, [isPaused, gameOver, ship, invulnerable]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameOver) return;
      keysPressed.current.add(e.key.toLowerCase());

      if (e.key === ' ') {
        e.preventDefault();
        if (!isPaused) {
          setBullets(prev => [...prev, {
            x: ship.x + Math.cos(ship.angle) * SHIP_SIZE,
            y: ship.y + Math.sin(ship.angle) * SHIP_SIZE,
            dx: Math.cos(ship.angle) * 8,
            dy: Math.sin(ship.angle) * 8,
            life: 60,
          }]);
        } else {
          setIsPaused(false);
        }
      }
      if (e.key === 'p' || e.key === 'P') {
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
  }, [gameOver, isPaused, ship]);

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

    ctx.strokeStyle = invulnerable ? 'oklch(0.7 0.2 60)' : 'oklch(0.646 0.222 41.116)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(
      ship.x + Math.cos(ship.angle) * SHIP_SIZE,
      ship.y + Math.sin(ship.angle) * SHIP_SIZE
    );
    ctx.lineTo(
      ship.x + Math.cos(ship.angle + 2.5) * SHIP_SIZE,
      ship.y + Math.sin(ship.angle + 2.5) * SHIP_SIZE
    );
    ctx.lineTo(
      ship.x + Math.cos(ship.angle + Math.PI) * SHIP_SIZE * 0.5,
      ship.y + Math.sin(ship.angle + Math.PI) * SHIP_SIZE * 0.5
    );
    ctx.lineTo(
      ship.x + Math.cos(ship.angle - 2.5) * SHIP_SIZE,
      ship.y + Math.sin(ship.angle - 2.5) * SHIP_SIZE
    );
    ctx.closePath();
    ctx.stroke();

    ctx.fillStyle = 'oklch(0.9 0.2 60)';
    bullets.forEach(bullet => {
      ctx.beginPath();
      ctx.arc(bullet.x, bullet.y, 3, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.strokeStyle = 'oklch(0.6 0.15 280)';
    ctx.lineWidth = 2;
    asteroids.forEach(asteroid => {
      ctx.beginPath();
      const radius = asteroid.size * 10;
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        const x = asteroid.x + Math.cos(angle) * radius;
        const y = asteroid.y + Math.sin(angle) * radius;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.stroke();
    });
  }, [ship, bullets, asteroids, invulnerable]);

  const handleSubmitScore = async () => {
    if (!playerName.trim()) {
      toast.error('Please enter your name');
      return;
    }

    try {
      await submitScoreMutation.mutateAsync({
        game: 'Asteroids',
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
              <CardTitle className="text-3xl pixel-font">ASTEROIDS</CardTitle>
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
                <div className="text-4xl text-center">{'🚀'.repeat(lives)}</div>
              </CardContent>
            </Card>

            <Card className="border-2 border-primary">
              <CardHeader>
                <CardTitle className="text-lg pixel-font">HOW TO PLAY</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p>🎮 <strong>Arrow Keys</strong> or <strong>A/D</strong> to rotate</p>
                <p>⬆️ <strong>Up Arrow</strong> or <strong>W</strong> to thrust</p>
                <p>🔫 <strong>Space</strong> to shoot</p>
                <p>⏸️ <strong>P</strong> to pause</p>
                <p>💥 Destroy all asteroids!</p>
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
