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
const CANVAS_HEIGHT = 400;
const PADDLE_WIDTH = 10;
const PADDLE_HEIGHT = 80;
const BALL_SIZE = 10;
const PADDLE_SPEED = 6;
const INITIAL_BALL_SPEED = 4;

export default function PongGame() {
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [playerY, setPlayerY] = useState(CANVAS_HEIGHT / 2 - PADDLE_HEIGHT / 2);
  const [aiY, setAiY] = useState(CANVAS_HEIGHT / 2 - PADDLE_HEIGHT / 2);
  const [ballX, setBallX] = useState(CANVAS_WIDTH / 2);
  const [ballY, setBallY] = useState(CANVAS_HEIGHT / 2);
  const [ballVelX, setBallVelX] = useState(INITIAL_BALL_SPEED);
  const [ballVelY, setBallVelY] = useState(INITIAL_BALL_SPEED);
  const [playerScore, setPlayerScore] = useState(0);
  const [aiScore, setAiScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [isPaused, setIsPaused] = useState(true);
  const [showScoreDialog, setShowScoreDialog] = useState(false);
  const [playerName, setPlayerName] = useState('');
  const keysPressed = useRef<Set<string>>(new Set());
  const gameLoopRef = useRef<number | null>(null);
  const submitScoreMutation = useSubmitScore();

  const resetBall = useCallback(() => {
    setBallX(CANVAS_WIDTH / 2);
    setBallY(CANVAS_HEIGHT / 2);
    const direction = Math.random() > 0.5 ? 1 : -1;
    setBallVelX(INITIAL_BALL_SPEED * direction);
    setBallVelY((Math.random() - 0.5) * INITIAL_BALL_SPEED);
  }, []);

  const resetGame = useCallback(() => {
    setPlayerY(CANVAS_HEIGHT / 2 - PADDLE_HEIGHT / 2);
    setAiY(CANVAS_HEIGHT / 2 - PADDLE_HEIGHT / 2);
    setPlayerScore(0);
    setAiScore(0);
    setGameOver(false);
    setIsPaused(true);
    resetBall();
  }, [resetBall]);

  const gameLoop = useCallback(() => {
    if (isPaused || gameOver) return;

    setPlayerY((prev) => {
      let newY = prev;
      if (keysPressed.current.has('ArrowUp') || keysPressed.current.has('w')) {
        newY = Math.max(0, prev - PADDLE_SPEED);
      }
      if (keysPressed.current.has('ArrowDown') || keysPressed.current.has('s')) {
        newY = Math.min(CANVAS_HEIGHT - PADDLE_HEIGHT, prev + PADDLE_SPEED);
      }
      return newY;
    });

    setAiY((prev) => {
      const aiCenter = prev + PADDLE_HEIGHT / 2;
      const ballCenter = ballY;
      if (aiCenter < ballCenter - 20) {
        return Math.min(CANVAS_HEIGHT - PADDLE_HEIGHT, prev + PADDLE_SPEED * 0.7);
      } else if (aiCenter > ballCenter + 20) {
        return Math.max(0, prev - PADDLE_SPEED * 0.7);
      }
      return prev;
    });

    setBallX((prev) => prev + ballVelX);
    setBallY((prev) => {
      const newY = prev + ballVelY;
      if (newY <= 0 || newY >= CANVAS_HEIGHT - BALL_SIZE) {
        setBallVelY((v) => -v);
        return newY <= 0 ? 0 : CANVAS_HEIGHT - BALL_SIZE;
      }
      return newY;
    });

    setBallX((currentBallX) => {
      if (currentBallX <= PADDLE_WIDTH) {
        if (ballY >= playerY && ballY <= playerY + PADDLE_HEIGHT) {
          const hitPos = (ballY - playerY) / PADDLE_HEIGHT - 0.5;
          setBallVelX((v) => Math.abs(v) * 1.05);
          setBallVelY((v) => v + hitPos * 3);
          return PADDLE_WIDTH;
        } else if (currentBallX <= 0) {
          setAiScore((s) => s + 1);
          resetBall();
          return CANVAS_WIDTH / 2;
        }
      }

      if (currentBallX >= CANVAS_WIDTH - PADDLE_WIDTH - BALL_SIZE) {
        if (ballY >= aiY && ballY <= aiY + PADDLE_HEIGHT) {
          const hitPos = (ballY - aiY) / PADDLE_HEIGHT - 0.5;
          setBallVelX((v) => -Math.abs(v) * 1.05);
          setBallVelY((v) => v + hitPos * 3);
          return CANVAS_WIDTH - PADDLE_WIDTH - BALL_SIZE;
        } else if (currentBallX >= CANVAS_WIDTH) {
          setPlayerScore((s) => {
            const newScore = s + 1;
            if (newScore >= 10) {
              setGameOver(true);
              setShowScoreDialog(true);
            }
            return newScore;
          });
          resetBall();
          return CANVAS_WIDTH / 2;
        }
      }

      return currentBallX;
    });
  }, [isPaused, gameOver, ballVelX, ballVelY, ballY, playerY, aiY, resetBall]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'w', 's', ' '].includes(e.key)) {
        e.preventDefault();
      }
      if (e.key === ' ') {
        setIsPaused((prev) => !prev);
      } else {
        keysPressed.current.add(e.key);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.current.delete(e.key);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

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
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    ctx.strokeStyle = 'oklch(0.269 0 0)';
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 10]);
    ctx.beginPath();
    ctx.moveTo(CANVAS_WIDTH / 2, 0);
    ctx.lineTo(CANVAS_WIDTH / 2, CANVAS_HEIGHT);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = 'oklch(0.6 0.118 184.704)';
    ctx.fillRect(0, playerY, PADDLE_WIDTH, PADDLE_HEIGHT);

    ctx.fillStyle = 'oklch(0.704 0.191 22.216)';
    ctx.fillRect(CANVAS_WIDTH - PADDLE_WIDTH, aiY, PADDLE_WIDTH, PADDLE_HEIGHT);

    ctx.fillStyle = 'oklch(0.828 0.189 84.429)';
    ctx.fillRect(ballX, ballY, BALL_SIZE, BALL_SIZE);
  }, [playerY, aiY, ballX, ballY]);

  const handleSubmitScore = async () => {
    if (!playerName.trim()) {
      toast.error('Please enter your name');
      return;
    }

    try {
      await submitScoreMutation.mutateAsync({
        game: 'Pong',
        playerName: playerName.trim(),
        score: BigInt(playerScore),
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
              <CardTitle className="text-3xl pixel-font">PONG</CardTitle>
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
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="text-sm text-muted-foreground">You</div>
                    <div className="text-4xl font-black pixel-font text-primary">{playerScore}</div>
                  </div>
                  <div className="text-2xl text-muted-foreground">-</div>
                  <div className="text-right">
                    <div className="text-sm text-muted-foreground">AI</div>
                    <div className="text-4xl font-black pixel-font text-destructive">{aiScore}</div>
                  </div>
                </div>
                <div className="text-xs text-center text-muted-foreground">First to 10 wins!</div>
              </CardContent>
            </Card>

            <Card className="border-2 border-primary">
              <CardHeader>
                <CardTitle className="text-lg pixel-font">HOW TO PLAY</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p>⬆️⬇️ <strong>Arrow Keys</strong> or <strong>W/S</strong> to move</p>
                <p>⏸️ <strong>Space</strong> to pause</p>
                <p>🎯 Hit the ball past the AI</p>
                <p>🏆 First to 10 points wins</p>
                <p>⚡ Ball speeds up on each hit</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <Dialog open={showScoreDialog} onOpenChange={setShowScoreDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-2xl pixel-font">YOU WIN!</DialogTitle>
            <DialogDescription>
              Final score: <span className="text-2xl font-bold text-primary">{playerScore}</span> - {aiScore}
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
