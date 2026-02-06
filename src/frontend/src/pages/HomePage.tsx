import { useNavigate } from '@tanstack/react-router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Play, Trophy } from 'lucide-react';
import { useGetAvailableGames } from '@/hooks/useQueries';

export default function HomePage() {
  const navigate = useNavigate();
  const { data: games, isLoading } = useGetAvailableGames();

  const gameRoutes: Record<string, string> = {
    Snake: '/snake',
    Tetris: '/tetris',
    Pong: '/pong',
    'Pac-Man': '/pacman',
    'Space Invaders': '/space-invaders',
    Breakout: '/breakout',
    Asteroids: '/asteroids',
    'Donkey Kong': '/donkey-kong',
    'Rolling Balls': '/rolling-balls',
    Frogger: '/frogger',
    Galaga: '/galaga',
    Minesweeper: '/minesweeper',
  };

  const gameImages: Record<string, string> = {
    Snake: '/assets/generated/snake-preview.dim_300x200.png',
    Tetris: '/assets/generated/tetris-preview.dim_300x200.png',
    Pong: '/assets/generated/pong-preview.dim_300x200.png',
    'Pac-Man': '/assets/generated/pacman-preview.dim_300x200.png',
    'Space Invaders': '/assets/generated/space-invaders-preview.dim_300x200.png',
    Breakout: '/assets/generated/breakout-preview.dim_300x200.png',
    Asteroids: '/assets/generated/asteroids-preview.dim_300x200.png',
    'Donkey Kong': '/assets/generated/donkey-kong-preview.dim_300x200.png',
    'Rolling Balls': '/assets/generated/rolling-balls-preview.dim_300x200.png',
    Frogger: '/assets/generated/frogger-preview.dim_300x200.png',
    Galaga: '/assets/generated/galaga-preview.dim_300x200.png',
    Minesweeper: '/assets/generated/minesweeper-preview.dim_300x200.png',
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Hero Banner */}
      <div className="relative mb-12 rounded-xl overflow-hidden border-4 border-primary shadow-2xl">
        <img
          src="/assets/generated/gaming-hero-banner.dim_800x300.png"
          alt="Gaming Hero Banner"
          className="w-full h-48 md:h-64 object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background/95 via-background/50 to-transparent flex items-end">
          <div className="p-6 md:p-8">
            <h2 className="text-3xl md:text-5xl font-black text-foreground pixel-font mb-2">
              CLASSIC ARCADE GAMES
            </h2>
            <p className="text-lg md:text-xl text-muted-foreground">
              Relive the golden age of gaming. Play now!
            </p>
          </div>
        </div>
      </div>

      {/* Games Grid */}
      <div className="mb-8">
        <h3 className="text-2xl font-bold pixel-font mb-6 text-center">SELECT YOUR GAME</h3>
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((i) => (
              <Card key={i} className="border-2 border-primary/20">
                <CardHeader className="h-48 bg-muted animate-pulse" />
                <CardContent className="p-6">
                  <div className="h-6 bg-muted animate-pulse rounded mb-2" />
                  <div className="h-4 bg-muted animate-pulse rounded" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {games?.map((game) => (
              <Card
                key={game.name}
                className="border-4 border-primary hover:border-accent transition-all hover:scale-105 hover:shadow-2xl group overflow-hidden"
              >
                <CardHeader className="p-0">
                  <div className="relative h-48 overflow-hidden bg-muted">
                    <img
                      src={gameImages[game.name]}
                      alt={game.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-card/90 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <CardTitle className="text-2xl pixel-font mb-2">{game.name}</CardTitle>
                  <CardDescription className="text-base mb-4">{game.description}</CardDescription>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => navigate({ to: gameRoutes[game.name] })}
                      className="flex-1 pixel-font"
                      size="lg"
                    >
                      <Play className="h-4 w-4 mr-2" />
                      Play Now
                    </Button>
                    <Button
                      onClick={() => navigate({ to: '/leaderboard', search: { game: game.name } })}
                      variant="outline"
                      size="lg"
                    >
                      <Trophy className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Features Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
        <Card className="border-2 border-primary/50 text-center">
          <CardContent className="pt-6">
            <div className="text-4xl mb-2">🎮</div>
            <h4 className="font-bold pixel-font mb-2">Classic Games</h4>
            <p className="text-sm text-muted-foreground">
              Enjoy timeless arcade classics reimagined for the web
            </p>
          </CardContent>
        </Card>
        <Card className="border-2 border-primary/50 text-center">
          <CardContent className="pt-6">
            <div className="text-4xl mb-2">🏆</div>
            <h4 className="font-bold pixel-font mb-2">High Scores</h4>
            <p className="text-sm text-muted-foreground">
              Compete for the top spot on the global leaderboard
            </p>
          </CardContent>
        </Card>
        <Card className="border-2 border-primary/50 text-center">
          <CardContent className="pt-6">
            <div className="text-4xl mb-2">⚡</div>
            <h4 className="font-bold pixel-font mb-2">Instant Play</h4>
            <p className="text-sm text-muted-foreground">
              No downloads required. Play directly in your browser
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
