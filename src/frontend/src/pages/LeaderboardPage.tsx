import { useState, useEffect } from 'react';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Trophy, Medal } from 'lucide-react';
import { useGetHighScores, useGetAvailableGames } from '@/hooks/useQueries';

const GAME_ROUTES: Record<string, string> = {
  'Snake': '/snake',
  'Tetris': '/tetris',
  'Pong': '/pong',
  'Pac-Man': '/pacman',
  'Space Invaders': '/space-invaders',
  'Breakout': '/breakout',
  'Asteroids': '/asteroids',
  'Donkey Kong': '/donkey-kong',
  'Rolling Balls': '/rolling-balls',
  'Frogger': '/frogger',
  'Galaga': '/galaga',
  'Minesweeper': '/minesweeper',
};

export default function LeaderboardPage() {
  const navigate = useNavigate();
  const search = useSearch({ strict: false }) as { game?: string };
  const { data: availableGames, isLoading: gamesLoading } = useGetAvailableGames();
  const [selectedGame, setSelectedGame] = useState<string>('');

  useEffect(() => {
    if (availableGames && availableGames.length > 0) {
      setSelectedGame(search.game || availableGames[0].name);
    }
  }, [availableGames, search.game]);

  const { data: scores, isLoading: scoresLoading } = useGetHighScores(selectedGame);

  const getMedalIcon = (index: number) => {
    if (index === 0) return <Trophy className="h-5 w-5 text-yellow-500" />;
    if (index === 1) return <Medal className="h-5 w-5 text-gray-400" />;
    if (index === 2) return <Medal className="h-5 w-5 text-amber-700" />;
    return <span className="text-muted-foreground">#{index + 1}</span>;
  };

  const getShortName = (name: string) => {
    const shortNames: Record<string, string> = {
      'Space Invaders': 'Space',
      'Donkey Kong': 'DK',
      'Rolling Balls': 'Balls',
    };
    return shortNames[name] || name;
  };

  if (gamesLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-5xl mx-auto">
          <div className="h-96 flex items-center justify-center">
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-5xl mx-auto">
        <Button variant="ghost" onClick={() => navigate({ to: '/' })} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Games
        </Button>

        <Card className="border-4 border-primary">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="bg-primary p-4 rounded-full">
                <Trophy className="h-12 w-12 text-primary-foreground" />
              </div>
            </div>
            <CardTitle className="text-4xl pixel-font">LEADERBOARD</CardTitle>
            <p className="text-muted-foreground">Top players across all games</p>
          </CardHeader>
          <CardContent>
            <Tabs value={selectedGame} onValueChange={setSelectedGame}>
              <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6 mb-6">
                {availableGames?.map((game) => (
                  <TabsTrigger key={game.name} value={game.name} className="pixel-font text-xs lg:text-sm">
                    {getShortName(game.name)}
                  </TabsTrigger>
                ))}
              </TabsList>

              {availableGames?.map((game) => (
                <TabsContent key={game.name} value={game.name}>
                  {scoresLoading ? (
                    <div className="space-y-2">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="h-16 bg-muted animate-pulse rounded" />
                      ))}
                    </div>
                  ) : scores && scores.length > 0 ? (
                    <div className="rounded-lg border-2 border-primary/50 overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-primary/10">
                            <TableHead className="w-16 pixel-font">Rank</TableHead>
                            <TableHead className="pixel-font">Player</TableHead>
                            <TableHead className="text-right pixel-font">Score</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {scores.map((score, index) => (
                            <TableRow
                              key={`${score.playerName}-${index}`}
                              className={index < 3 ? 'bg-accent/5' : ''}
                            >
                              <TableCell className="font-medium">
                                <div className="flex items-center justify-center">
                                  {getMedalIcon(index)}
                                </div>
                              </TableCell>
                              <TableCell className="font-semibold">{score.playerName}</TableCell>
                              <TableCell className="text-right text-lg font-bold pixel-font text-primary">
                                {score.score.toString()}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <Trophy className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                      <p className="text-lg text-muted-foreground">No scores yet</p>
                      <p className="text-sm text-muted-foreground mb-4">
                        Be the first to set a high score!
                      </p>
                      <Button
                        onClick={() => navigate({ to: GAME_ROUTES[game.name] })}
                        className="pixel-font"
                      >
                        Play {game.name}
                      </Button>
                    </div>
                  )}
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
