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
type Platform = { x: number; y: number; width: number };
type Ladder = { x: number; y: number; height: number };
type Barrel = Position & { dx: number; active: boolean };

const CANVAS_WIDTH = 600;
const CANVAS_HEIGHT = 500;
const PLAYER_WIDTH = 25;
const PLAYER_HEIGHT = 30;
const GRAVITY = 0.5;
const JUMP_STRENGTH = -10;

export default function DonkeyKongGame() {
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [player, setPlayer] = useState<Position & { dy: number; onGround: boolean }>({ 
    x: 50, 
    y: CANVAS_HEIGHT - 80, 
    dy: 0, 
    onGround: true 
  });
  const [barrels, setBarrels] = useState<Barrel[]>([]);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [gameOver, setGameOver] = useState(false);
  const [isPaused, setIsPaused] = useState(true);
  const [showScoreDialog, setShowScoreDialog] = useState(false);
  const [playerName, setPlayerName] = useState('');
  const [level, setLevel] = useState(1);
  const keysPressed = useRef<Set<string>>(new Set());
  const gameLoopRef = useRef<number | null>(null);
  const barrelSpawnRef = useRef<number>(0);
  const submitScoreMutation = useSubmitScore();

  const platforms: Platform[] = [
    { x: 0, y: CANVAS_HEIGHT - 50, width: CANVAS_WIDTH },
    { x: 100, y: CANVAS_HEIGHT - 150, width: 400 },
    { x: 50, y: CANVAS_HEIGHT - 250, width: 450 },
    { x: 100, y: CANVAS_HEIGHT - 350, width: 400 },
    { x: 0, y: 50, width: CANVAS_WIDTH },
  ];

  const ladders: Ladder[] = [
    { x: 150, y: CANVAS_HEIGHT - 150, height: 100 },
    { x: 450, y: CANVAS_HEIGHT - 250, height: 100 },
    { x: 200, y: CANVAS_HEIGHT - 350, height: 100 },
    { x: 400, y: 50, height: 100 },
  ];

  const resetGame = useCallback(() => {
    setPlayer({ x: 50, y: CANVAS_HEIGHT - 80, dy: 0, onGround: true });
    setBarrels([]);
    setScore(0);
    setLives(3);
    setGameOver(false);
    setIsPaused(true);
    setLevel(1);
    barrelSpawnRef.current = 0;
  }, []);

  const checkPlatformCollision = useCallback((x: number, y: number): Platform | null => {
    for (const platform of platforms) {
      if (x + PLAYER_WIDTH > platform.x && 
          x < platform.x + platform.width &&
          y + PLAYER_HEIGHT >= platform.y &&
          y + PLAYER_HEIGHT <= platform.y + 10) {
        return platform;
      }
    }
    return null;
  }, []);

  const checkLadderCollision = useCallback((x: number, y: number): boolean => {
    for (const ladder of ladders) {
      if (x + PLAYER_WIDTH / 2 >= ladder.x && 
          x + PLAYER_WIDTH / 2 <= ladder.x + 20 &&
          y + PLAYER_HEIGHT >= ladder.y &&
          y <= ladder.y + ladder.height) {
        return true;
      }
    }
    return false;
  }, []);

  const gameLoop = useCallback(() => {
    if (isPaused || gameOver) return;

    barrelSpawnRef.current++;
    if (barrelSpawnRef.current > 120 / level) {
      barrelSpawnRef.current = 0;
      setBarrels(prev => [...prev, { x: 500, y: 70, dx: -2 * level, active: true }]);
    }

    setPlayer(prev => {
      let newPlayer = { ...prev };
      const onLadder = checkLadderCollision(newPlayer.x, newPlayer.y);

      if (keysPressed.current.has('arrowleft') || keysPressed.current.has('a')) {
        newPlayer.x = Math.max(0, newPlayer.x - 3);
      }
      if (keysPressed.current.has('arrowright') || keysPressed.current.has('d')) {
        newPlayer.x = Math.min(CANVAS_WIDTH - PLAYER_WIDTH, newPlayer.x + 3);
      }

      if (onLadder) {
        if (keysPressed.current.has('arrowup') || keysPressed.current.has('w')) {
          newPlayer.y = Math.max(0, newPlayer.y - 3);
          newPlayer.dy = 0;
          newPlayer.onGround = false;
        }
        if (keysPressed.current.has('arrowdown') || keysPressed.current.has('s')) {
          newPlayer.y = Math.min(CANVAS_HEIGHT - PLAYER_HEIGHT, newPlayer.y + 3);
          newPlayer.dy = 0;
        }
      } else {
        newPlayer.dy += GRAVITY;
        newPlayer.y += newPlayer.dy;

        const platform = checkPlatformCollision(newPlayer.x, newPlayer.y);
        if (platform) {
          newPlayer.y = platform.y - PLAYER_HEIGHT;
          newPlayer.dy = 0;
          newPlayer.onGround = true;
        } else {
          newPlayer.onGround = false;
        }

        if (newPlayer.y > CANVAS_HEIGHT) {
          setLives(prev => {
            const newLives = prev - 1;
            if (newLives <= 0) {
              setGameOver(true);
              setShowScoreDialog(true);
            }
            return newLives;
          });
          newPlayer = { x: 50, y: CANVAS_HEIGHT - 80, dy: 0, onGround: true };
        }
      }

      if (newPlayer.y < 100 && newPlayer.x > 200 && newPlayer.x < 400) {
        setScore(prev => prev + 1000);
        setLevel(prev => prev + 1);
        newPlayer = { x: 50, y: CANVAS_HEIGHT - 80, dy: 0, onGround: true };
        setBarrels([]);
      }

      return newPlayer;
    });

    setBarrels(prev => {
      const newBarrels = prev.map(barrel => {
        let newBarrel = { ...barrel };
        newBarrel.x += newBarrel.dx;

        if (newBarrel.x < -30 || newBarrel.x > CANVAS_WIDTH) {
          newBarrel.active = false;
        }

        const collision = 
          newBarrel.x < player.x + PLAYER_WIDTH &&
          newBarrel.x + 20 > player.x &&
          newBarrel.y < player.y + PLAYER_HEIGHT &&
          newBarrel.y + 20 > player.y;

        if (collision) {
          setLives(prev => {
            const newLives = prev - 1;
            if (newLives <= 0) {
              setGameOver(true);
              setShowScoreDialog(true);
            }
            return newLives;
          });
          newBarrel.active = false;
        }

        return newBarrel;
      }).filter(barrel => barrel.active);

      return newBarrels;
    });

    setScore(prev => prev + 1);
  }, [isPaused, gameOver, player, level, checkLadderCollision, checkPlatformCollision]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameOver) return;
      keysPressed.current.add(e.key.toLowerCase());

      if (e.key === ' ') {
        e.preventDefault();
        if (!isPaused && player.onGround) {
          setPlayer(prev => ({ ...prev, dy: JUMP_STRENGTH, onGround: false }));
        } else if (isPaused) {
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
  }, [gameOver, isPaused, player.onGround]);

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

    ctx.fillStyle = 'oklch(0.5 0.15 30)';
    platforms.forEach(platform => {
      ctx.fillRect(platform.x, platform.y, platform.width, 10);
    });

    ctx.fillStyle = 'oklch(0.6 0.2 60)';
    ladders.forEach(ladder => {
      for (let i = 0; i < ladder.height; i += 15) {
        ctx.fillRect(ladder.x, ladder.y + i, 5, 15);
        ctx.fillRect(ladder.x + 15, ladder.y + i, 5, 15);
        ctx.fillRect(ladder.x, ladder.y + i, 20, 3);
      }
    });

    ctx.fillStyle = 'oklch(0.7 0.25 0)';
    ctx.fillRect(player.x, player.y, PLAYER_WIDTH, PLAYER_HEIGHT);
    ctx.fillStyle = 'oklch(0.9 0.1 60)';
    ctx.fillRect(player.x + 5, player.y + 5, 15, 10);

    ctx.fillStyle = 'oklch(0.5 0.2 30)';
    barrels.forEach(barrel => {
      ctx.fillRect(barrel.x, barrel.y, 20, 20);
    });

    ctx.fillStyle = 'oklch(0.6 0.2 0)';
    ctx.font = '20px Arial';
    ctx.fillText('🦍', 500, 50);

    ctx.fillStyle = 'oklch(0.9 0.2 60)';
    ctx.fillText('👸', 300, 40);
  }, [player, barrels]);

  const handleSubmitScore = async () => {
    if (!playerName.trim()) {
      toast.error('Please enter your name');
      return;
    }

    try {
      await submitScoreMutation.mutateAsync({
        game: 'Donkey Kong',
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
              <CardTitle className="text-3xl pixel-font">DONKEY KONG</CardTitle>
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
                <CardTitle className="pixel-font">LEVEL</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-black text-center pixel-font">{level}</div>
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
                <p>🎮 <strong>Arrow Keys</strong> or <strong>WASD</strong> to move</p>
                <p>⬆️ <strong>Space</strong> to jump</p>
                <p>🪜 Climb ladders to reach the top</p>
                <p>🛢️ Avoid barrels!</p>
                <p>👸 Rescue the princess!</p>
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
