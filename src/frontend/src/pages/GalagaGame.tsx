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

const CANVAS_WIDTH = 600;
const CANVAS_HEIGHT = 700;

type Position = { x: number; y: number };
type Bullet = { x: number; y: number; speed: number };
type Alien = { x: number; y: number; alive: boolean; type: number };
type AlienBullet = { x: number; y: number };

export default function GalagaGame() {
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [playerPos, setPlayerPos] = useState<Position>({ x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT - 60 });
  const [bullets, setBullets] = useState<Bullet[]>([]);
  const [aliens, setAliens] = useState<Alien[]>([]);
  const [alienBullets, setAlienBullets] = useState<AlienBullet[]>([]);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [wave, setWave] = useState(1);
  const [gameOver, setGameOver] = useState(false);
  const [isPaused, setIsPaused] = useState(true);
  const [showScoreDialog, setShowScoreDialog] = useState(false);
  const [playerName, setPlayerName] = useState('');
  const keysPressed = useRef<Set<string>>(new Set());
  const gameLoopRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const lastShotRef = useRef<number>(0);
  const lastAlienShotRef = useRef<number>(0);
  const submitScoreMutation = useSubmitScore();

  const initializeAliens = useCallback((waveNum: number) => {
    const newAliens: Alien[] = [];
    const rows = 4 + Math.floor(waveNum / 2);
    const cols = 8;
    const spacing = 60;
    const startX = (CANVAS_WIDTH - cols * spacing) / 2;
    const startY = 80;

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        newAliens.push({
          x: startX + col * spacing,
          y: startY + row * spacing,
          alive: true,
          type: row % 3,
        });
      }
    }
    setAliens(newAliens);
  }, []);

  const resetGame = useCallback(() => {
    setPlayerPos({ x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT - 60 });
    setBullets([]);
    setAlienBullets([]);
    setScore(0);
    setLives(3);
    setWave(1);
    setGameOver(false);
    setIsPaused(true);
    initializeAliens(1);
  }, [initializeAliens]);

  useEffect(() => {
    initializeAliens(1);
  }, [initializeAliens]);

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

      // Move player
      setPlayerPos((pos) => {
        let newX = pos.x;
        if (keysPressed.current.has('ArrowLeft') || keysPressed.current.has('a')) {
          newX = Math.max(20, pos.x - 5);
        }
        if (keysPressed.current.has('ArrowRight') || keysPressed.current.has('d')) {
          newX = Math.min(CANVAS_WIDTH - 20, pos.x + 5);
        }
        return { ...pos, x: newX };
      });

      // Shoot bullet
      if (keysPressed.current.has(' ') && timestamp - lastShotRef.current > 300) {
        lastShotRef.current = timestamp;
        setBullets((prev) => [...prev, { x: playerPos.x, y: playerPos.y - 20, speed: 8 }]);
      }

      // Update bullets
      setBullets((prev) =>
        prev
          .map((b) => ({ ...b, y: b.y - b.speed }))
          .filter((b) => b.y > 0)
      );

      // Alien shooting
      if (timestamp - lastAlienShotRef.current > 1000) {
        lastAlienShotRef.current = timestamp;
        const aliveAliens = aliens.filter((a) => a.alive);
        if (aliveAliens.length > 0) {
          const shooter = aliveAliens[Math.floor(Math.random() * aliveAliens.length)];
          setAlienBullets((prev) => [...prev, { x: shooter.x, y: shooter.y + 20 }]);
        }
      }

      // Update alien bullets
      setAlienBullets((prev) =>
        prev
          .map((b) => ({ ...b, y: b.y + 4 }))
          .filter((b) => b.y < CANVAS_HEIGHT)
      );

      // Check bullet-alien collisions
      setBullets((prevBullets) => {
        const remainingBullets = [...prevBullets];
        setAliens((prevAliens) =>
          prevAliens.map((alien) => {
            if (!alien.alive) return alien;
            const hitIndex = remainingBullets.findIndex(
              (b) =>
                b.x > alien.x - 20 &&
                b.x < alien.x + 20 &&
                b.y > alien.y - 20 &&
                b.y < alien.y + 20
            );
            if (hitIndex !== -1) {
              remainingBullets.splice(hitIndex, 1);
              setScore((prev) => prev + (10 * (alien.type + 1)));
              return { ...alien, alive: false };
            }
            return alien;
          })
        );
        return remainingBullets;
      });

      // Check alien bullet-player collisions
      setAlienBullets((prevBullets) => {
        const hit = prevBullets.some(
          (b) =>
            b.x > playerPos.x - 20 &&
            b.x < playerPos.x + 20 &&
            b.y > playerPos.y - 20 &&
            b.y < playerPos.y + 20
        );
        if (hit) {
          setLives((prev) => {
            const newLives = prev - 1;
            if (newLives <= 0) {
              setGameOver(true);
              setShowScoreDialog(true);
            }
            return newLives;
          });
          return [];
        }
        return prevBullets;
      });

      // Check if wave complete
      setAliens((prevAliens) => {
        if (prevAliens.every((a) => !a.alive)) {
          setWave((w) => w + 1);
          initializeAliens(wave + 1);
        }
        return prevAliens;
      });

      gameLoopRef.current = requestAnimationFrame(gameLoop);
    },
    [isPaused, gameOver, playerPos, aliens, wave, initializeAliens]
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
    ctx.fillStyle = '#0a0a0f';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw stars
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 50; i++) {
      const x = (i * 137) % CANVAS_WIDTH;
      const y = (i * 211) % CANVAS_HEIGHT;
      ctx.fillRect(x, y, 2, 2);
    }

    // Draw player
    ctx.fillStyle = '#22c55e';
    ctx.beginPath();
    ctx.moveTo(playerPos.x, playerPos.y - 15);
    ctx.lineTo(playerPos.x - 15, playerPos.y + 15);
    ctx.lineTo(playerPos.x + 15, playerPos.y + 15);
    ctx.closePath();
    ctx.fill();

    // Draw bullets
    ctx.fillStyle = '#fbbf24';
    for (const bullet of bullets) {
      ctx.fillRect(bullet.x - 2, bullet.y, 4, 10);
    }

    // Draw alien bullets
    ctx.fillStyle = '#ef4444';
    for (const bullet of alienBullets) {
      ctx.fillRect(bullet.x - 2, bullet.y, 4, 10);
    }

    // Draw aliens
    for (const alien of aliens) {
      if (!alien.alive) continue;
      const colors = ['#8b5cf6', '#ec4899', '#f59e0b'];
      ctx.fillStyle = colors[alien.type];
      ctx.fillRect(alien.x - 15, alien.y - 15, 30, 30);
      ctx.fillStyle = '#000000';
      ctx.fillRect(alien.x - 8, alien.y - 8, 5, 5);
      ctx.fillRect(alien.x + 3, alien.y - 8, 5, 5);
    }
  }, [playerPos, bullets, aliens, alienBullets]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysPressed.current.add(e.key.toLowerCase());
      if (e.key === ' ') e.preventDefault();
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
  }, []);

  const handleSubmitScore = async () => {
    if (!playerName.trim()) {
      toast.error('Please enter your name');
      return;
    }

    try {
      await submitScoreMutation.mutateAsync({
        game: 'Galaga',
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
                <CardTitle className="text-3xl pixel-font text-center">GALAGA</CardTitle>
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
                <CardTitle className="pixel-font">Wave</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-4xl font-bold pixel-font text-accent">{wave}</p>
              </CardContent>
            </Card>

            <Card className="border-2 border-primary/50">
              <CardHeader>
                <CardTitle className="pixel-font text-sm">How to Play</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-2">
                <p>🎮 Arrow keys or A/D to move</p>
                <p>🚀 Spacebar to shoot</p>
                <p>👾 Destroy all aliens to advance</p>
                <p>💥 Avoid alien bullets</p>
                <p>⭐ Higher waves = more points!</p>
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
