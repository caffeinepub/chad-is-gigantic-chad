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

type Cube = { row: number; col: number; x: number; y: number; color: number; target: number };
type Player = { row: number; col: number; x: number; y: number };
type Enemy = { row: number; col: number; x: number; y: number; type: string };

const CANVAS_WIDTH = 700;
const CANVAS_HEIGHT = 600;
const CUBE_SIZE = 50;

export default function QbertGame() {
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [level, setLevel] = useState(1);
  const [gameOver, setGameOver] = useState(false);
  const [isPaused, setIsPaused] = useState(true);
  const [showScoreDialog, setShowScoreDialog] = useState(false);
  const [playerName, setPlayerName] = useState('');
  const gameLoopRef = useRef<number | null>(null);
  const submitScoreMutation = useSubmitScore();

  const cubesRef = useRef<Cube[]>([]);
  const playerRef = useRef<Player>({ row: 0, col: 0, x: 0, y: 0 });
  const enemiesRef = useRef<Enemy[]>([]);
  const keysRef = useRef<Set<string>>(new Set());
  const lastMoveRef = useRef<number>(0);

  const initPyramid = useCallback(() => {
    cubesRef.current = [];
    const startX = CANVAS_WIDTH / 2;
    const startY = 100;

    for (let row = 0; row < 7; row++) {
      for (let col = 0; col <= row; col++) {
        const x = startX + (col - row / 2) * CUBE_SIZE;
        const y = startY + row * CUBE_SIZE * 0.7;
        cubesRef.current.push({
          row,
          col,
          x,
          y,
          color: 0,
          target: 1,
        });
      }
    }

    playerRef.current = {
      row: 0,
      col: 0,
      x: cubesRef.current[0].x,
      y: cubesRef.current[0].y,
    };

    enemiesRef.current = [];
  }, []);

  const initGame = useCallback(() => {
    initPyramid();
    setScore(0);
    setLives(3);
    setLevel(1);
    setGameOver(false);
  }, [initPyramid]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = 'oklch(0.15 0.02 264)';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw cubes
    cubesRef.current.forEach((cube) => {
      const hue = cube.color === 0 ? 200 : cube.color === 1 ? 60 : 140;
      ctx.fillStyle = `oklch(0.65 0.25 ${hue})`;

      // Draw isometric cube
      ctx.beginPath();
      ctx.moveTo(cube.x, cube.y);
      ctx.lineTo(cube.x + CUBE_SIZE / 2, cube.y + CUBE_SIZE / 4);
      ctx.lineTo(cube.x, cube.y + CUBE_SIZE / 2);
      ctx.lineTo(cube.x - CUBE_SIZE / 2, cube.y + CUBE_SIZE / 4);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'oklch(0.85 0.25 85)';
      ctx.lineWidth = 2;
      ctx.stroke();
    });

    // Draw player (Q*bert)
    ctx.fillStyle = 'oklch(0.75 0.25 30)';
    ctx.beginPath();
    ctx.arc(playerRef.current.x, playerRef.current.y - 20, 15, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'oklch(0.85 0.25 30)';
    ctx.beginPath();
    ctx.arc(playerRef.current.x - 5, playerRef.current.y - 25, 5, 0, Math.PI * 2);
    ctx.arc(playerRef.current.x + 5, playerRef.current.y - 25, 5, 0, Math.PI * 2);
    ctx.fill();

    // Draw enemies
    enemiesRef.current.forEach((enemy) => {
      ctx.fillStyle = 'oklch(0.65 0.25 0)';
      ctx.beginPath();
      ctx.arc(enemy.x, enemy.y - 20, 12, 0, Math.PI * 2);
      ctx.fill();
    });
  }, []);

  const getCubeAt = useCallback((row: number, col: number): Cube | null => {
    return cubesRef.current.find((c) => c.row === row && c.col === col) || null;
  }, []);

  const movePlayer = useCallback((dRow: number, dCol: number) => {
    const newRow = playerRef.current.row + dRow;
    const newCol = playerRef.current.col + dCol;

    if (newCol < 0 || newCol > newRow || newRow < 0 || newRow >= 7) {
      // Fell off
      setLives((l) => {
        const newLives = l - 1;
        if (newLives <= 0) {
          setGameOver(true);
          setIsPaused(true);
          setShowScoreDialog(true);
        } else {
          playerRef.current = {
            row: 0,
            col: 0,
            x: cubesRef.current[0].x,
            y: cubesRef.current[0].y,
          };
        }
        return newLives;
      });
      return;
    }

    const cube = getCubeAt(newRow, newCol);
    if (cube) {
      playerRef.current = {
        row: newRow,
        col: newCol,
        x: cube.x,
        y: cube.y,
      };

      // Change cube color
      if (cube.color !== cube.target) {
        cube.color = cube.target;
        setScore((s) => s + 25);
      }

      // Check level complete
      if (cubesRef.current.every((c) => c.color === c.target)) {
        setLevel((l) => l + 1);
        setScore((s) => s + 500);
        initPyramid();
      }
    }
  }, [getCubeAt, initPyramid]);

  const update = useCallback(() => {
    if (isPaused || gameOver) return;

    const now = Date.now();
    if (now - lastMoveRef.current > 200) {
      if (keysRef.current.has('ArrowUp')) {
        movePlayer(-1, 0);
        lastMoveRef.current = now;
      } else if (keysRef.current.has('ArrowDown')) {
        movePlayer(1, 1);
        lastMoveRef.current = now;
      } else if (keysRef.current.has('ArrowLeft')) {
        movePlayer(0, -1);
        lastMoveRef.current = now;
      } else if (keysRef.current.has('ArrowRight')) {
        movePlayer(1, 0);
        lastMoveRef.current = now;
      }
    }

    // Simple enemy movement
    enemiesRef.current.forEach((enemy) => {
      if (Math.random() < 0.02) {
        const moves = [
          { dRow: -1, dCol: 0 },
          { dRow: 1, dCol: 1 },
          { dRow: 0, dCol: -1 },
          { dRow: 1, dCol: 0 },
        ];
        const move = moves[Math.floor(Math.random() * moves.length)];
        const newRow = enemy.row + move.dRow;
        const newCol = enemy.col + move.dCol;
        const cube = getCubeAt(newRow, newCol);
        if (cube) {
          enemy.row = newRow;
          enemy.col = newCol;
          enemy.x = cube.x;
          enemy.y = cube.y;
        }
      }
    });

    // Check collision with enemies
    enemiesRef.current.forEach((enemy) => {
      if (enemy.row === playerRef.current.row && enemy.col === playerRef.current.col) {
        setLives((l) => {
          const newLives = l - 1;
          if (newLives <= 0) {
            setGameOver(true);
            setIsPaused(true);
            setShowScoreDialog(true);
          } else {
            playerRef.current = {
              row: 0,
              col: 0,
              x: cubesRef.current[0].x,
              y: cubesRef.current[0].y,
            };
          }
          return newLives;
        });
      }
    });

    // Spawn enemies
    if (Math.random() < 0.005 && enemiesRef.current.length < 3) {
      const cube = cubesRef.current[0];
      enemiesRef.current.push({
        row: 0,
        col: 0,
        x: cube.x,
        y: cube.y,
        type: 'coily',
      });
    }
  }, [isPaused, gameOver, movePlayer, getCubeAt]);

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
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
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
        game: 'Q*bert',
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
              <CardTitle className="text-3xl pixel-font text-center">Q*BERT</CardTitle>
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
              <div className="text-lg">Level: {level}</div>
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
              <p>• Arrow keys to hop</p>
              <p>• Change all cube colors</p>
              <p>• Avoid enemies</p>
              <p>• Don't fall off pyramid</p>
              <p>• Complete levels for bonus</p>
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
