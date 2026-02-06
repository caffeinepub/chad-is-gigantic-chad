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
type Bullet = Position & { active: boolean };
type Alien = Position & { alive: boolean };

const CANVAS_WIDTH = 600;
const CANVAS_HEIGHT = 500;
const PLAYER_WIDTH = 40;
const PLAYER_HEIGHT = 30;
const ALIEN_WIDTH = 30;
const ALIEN_HEIGHT = 25;
const ALIEN_ROWS = 4;
const ALIEN_COLS = 8;

export default function SpaceInvadersGame() {
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [player, setPlayer] = useState<Position>({ x: CANVAS_WIDTH / 2 - PLAYER_WIDTH / 2, y: CANVAS_HEIGHT - 60 });
  const [aliens, setAliens] = useState<Alien[]>([]);
  const [bullets, setBullets] = useState<Bullet[]>([]);
  const [alienBullets, setAlienBullets] = useState<Bullet[]>([]);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [gameOver, setGameOver] = useState(false);
  const [isPaused, setIsPaused] = useState(true);
  const [showScoreDialog, setShowScoreDialog] = useState(false);
  const [playerName, setPlayerName] = useState('');
  const [alienDirection, setAlienDirection] = useState(1);
  const keysPressed = useRef<Set<string>>(new Set());
  const gameLoopRef = useRef<number | null>(null);
  const submitScoreMutation = useSubmitScore();

  const initializeAliens = useCallback(() => {
    const newAliens: Alien[] = [];
    for (let row = 0; row < ALIEN_ROWS; row++) {
      for (let col = 0; col < ALIEN_COLS; col++) {
        newAliens.push({
          x: col * (ALIEN_WIDTH + 20) + 50,
          y: row * (ALIEN_HEIGHT + 15) + 50,
          alive: true,
        });
      }
    }
    return newAliens;
  }, []);

  const resetGame = useCallback(() => {
    setPlayer({ x: CANVAS_WIDTH / 2 - PLAYER_WIDTH / 2, y: CANVAS_HEIGHT - 60 });
    setAliens(initializeAliens());
    setBullets([]);
    setAlienBullets([]);
    setScore(0);
    setLives(3);
    setGameOver(false);
    setIsPaused(true);
    setAlienDirection(1);
  }, [initializeAliens]);

  useEffect(() => {
    setAliens(initializeAliens());
  }, [initializeAliens]);

  const gameLoop = useCallback(() => {
    if (isPaused || gameOver) return;

    setPlayer(prev => {
      let newX = prev.x;
      if (keysPressed.current.has('ArrowLeft') || keysPressed.current.has('a')) {
        newX = Math.max(0, prev.x - 5);
      }
      if (keysPressed.current.has('ArrowRight') || keysPressed.current.has('d')) {
        newX = Math.min(CANVAS_WIDTH - PLAYER_WIDTH, prev.x + 5);
      }
      return { ...prev, x: newX };
    });

    setBullets(prev => 
      prev.map(bullet => ({ ...bullet, y: bullet.y - 8 }))
        .filter(bullet => bullet.y > 0)
    );

    setAlienBullets(prev => 
      prev.map(bullet => ({ ...bullet, y: bullet.y + 5 }))
        .filter(bullet => bullet.y < CANVAS_HEIGHT)
    );

    setAliens(prev => {
      let newAliens = [...prev];
      let shouldMoveDown = false;
      let newDirection = alienDirection;

      const leftmost = Math.min(...newAliens.filter(a => a.alive).map(a => a.x));
      const rightmost = Math.max(...newAliens.filter(a => a.alive).map(a => a.x));

      if (rightmost >= CANVAS_WIDTH - ALIEN_WIDTH - 10 && alienDirection > 0) {
        shouldMoveDown = true;
        newDirection = -1;
      } else if (leftmost <= 10 && alienDirection < 0) {
        shouldMoveDown = true;
        newDirection = 1;
      }

      newAliens = newAliens.map(alien => ({
        ...alien,
        x: alien.x + alienDirection * 2,
        y: shouldMoveDown ? alien.y + 20 : alien.y,
      }));

      if (shouldMoveDown) {
        setAlienDirection(newDirection);
      }

      if (Math.random() < 0.02) {
        const aliveAliens = newAliens.filter(a => a.alive);
        if (aliveAliens.length > 0) {
          const shooter = aliveAliens[Math.floor(Math.random() * aliveAliens.length)];
          setAlienBullets(prev => [...prev, { x: shooter.x + ALIEN_WIDTH / 2, y: shooter.y + ALIEN_HEIGHT, active: true }]);
        }
      }

      return newAliens;
    });

    setBullets(prevBullets => {
      let newBullets = [...prevBullets];
      setAliens(prevAliens => {
        let newAliens = [...prevAliens];
        newBullets.forEach(bullet => {
          newAliens.forEach(alien => {
            if (alien.alive &&
                bullet.x >= alien.x && bullet.x <= alien.x + ALIEN_WIDTH &&
                bullet.y >= alien.y && bullet.y <= alien.y + ALIEN_HEIGHT) {
              alien.alive = false;
              bullet.y = -100;
              setScore(prev => prev + 100);
            }
          });
        });
        return newAliens;
      });
      return newBullets;
    });

    setAlienBullets(prevBullets => {
      const hit = prevBullets.some(bullet => 
        bullet.x >= player.x && bullet.x <= player.x + PLAYER_WIDTH &&
        bullet.y >= player.y && bullet.y <= player.y + PLAYER_HEIGHT
      );

      if (hit) {
        setLives(prev => {
          const newLives = prev - 1;
          if (newLives <= 0) {
            setGameOver(true);
            setShowScoreDialog(true);
          }
          return newLives;
        });
        return prevBullets.filter(bullet => 
          !(bullet.x >= player.x && bullet.x <= player.x + PLAYER_WIDTH &&
            bullet.y >= player.y && bullet.y <= player.y + PLAYER_HEIGHT)
        );
      }
      return prevBullets;
    });

    setAliens(prev => {
      const allDead = prev.every(alien => !alien.alive);
      if (allDead) {
        setGameOver(true);
        setShowScoreDialog(true);
      }
      const reachedBottom = prev.some(alien => alien.alive && alien.y + ALIEN_HEIGHT >= player.y);
      if (reachedBottom) {
        setGameOver(true);
        setShowScoreDialog(true);
      }
      return prev;
    });
  }, [isPaused, gameOver, player, alienDirection]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameOver) return;

      keysPressed.current.add(e.key.toLowerCase());

      if (e.key === ' ') {
        e.preventDefault();
        if (!isPaused) {
          setBullets(prev => [...prev, { x: player.x + PLAYER_WIDTH / 2, y: player.y, active: true }]);
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
  }, [gameOver, isPaused, player]);

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

    ctx.fillStyle = 'oklch(0.646 0.222 41.116)';
    ctx.fillRect(player.x, player.y, PLAYER_WIDTH, PLAYER_HEIGHT);
    ctx.beginPath();
    ctx.moveTo(player.x + PLAYER_WIDTH / 2, player.y - 10);
    ctx.lineTo(player.x, player.y);
    ctx.lineTo(player.x + PLAYER_WIDTH, player.y);
    ctx.fill();

    aliens.forEach(alien => {
      if (alien.alive) {
        ctx.fillStyle = 'oklch(0.6 0.25 120)';
        ctx.fillRect(alien.x, alien.y, ALIEN_WIDTH, ALIEN_HEIGHT);
        ctx.fillStyle = 'oklch(0.145 0 0)';
        ctx.fillRect(alien.x + 5, alien.y + 5, 8, 8);
        ctx.fillRect(alien.x + ALIEN_WIDTH - 13, alien.y + 5, 8, 8);
      }
    });

    ctx.fillStyle = 'oklch(0.9 0.2 60)';
    bullets.forEach(bullet => {
      ctx.fillRect(bullet.x - 2, bullet.y, 4, 10);
    });

    ctx.fillStyle = 'oklch(0.7 0.25 0)';
    alienBullets.forEach(bullet => {
      ctx.fillRect(bullet.x - 2, bullet.y, 4, 10);
    });
  }, [player, aliens, bullets, alienBullets]);

  const handleSubmitScore = async () => {
    if (!playerName.trim()) {
      toast.error('Please enter your name');
      return;
    }

    try {
      await submitScoreMutation.mutateAsync({
        game: 'Space Invaders',
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
              <CardTitle className="text-3xl pixel-font">SPACE INVADERS</CardTitle>
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
                <p>🎮 <strong>Arrow Keys</strong> or <strong>A/D</strong> to move</p>
                <p>🔫 <strong>Space</strong> to shoot</p>
                <p>⏸️ <strong>P</strong> to pause</p>
                <p>👾 Destroy all aliens = 100 points each</p>
                <p>⚠️ Avoid alien bullets!</p>
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
