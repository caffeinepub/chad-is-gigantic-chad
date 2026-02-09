import { RouterProvider, createRouter, createRoute, createRootRoute } from '@tanstack/react-router';
import { ThemeProvider } from 'next-themes';
import { Toaster } from '@/components/ui/sonner';
import HomePage from './pages/HomePage';
import SnakeGame from './pages/SnakeGame';
import TetrisGame from './pages/TetrisGame';
import PongGame from './pages/PongGame';
import PacManGame from './pages/PacManGame';
import SpaceInvadersGame from './pages/SpaceInvadersGame';
import BreakoutGame from './pages/BreakoutGame';
import AsteroidsGame from './pages/AsteroidsGame';
import DonkeyKongGame from './pages/DonkeyKongGame';
import RollingBallsGame from './pages/RollingBallsGame';
import FroggerGame from './pages/FroggerGame';
import GalagaGame from './pages/GalagaGame';
import MinesweeperGame from './pages/MinesweeperGame';
import CentipedeGame from './pages/CentipedeGame';
import MissileCommandGame from './pages/MissileCommandGame';
import PinballGame from './pages/PinballGame';
import BubbleShooterGame from './pages/BubbleShooterGame';
import QbertGame from './pages/QbertGame';
import DigDugGame from './pages/DigDugGame';
import LeaderboardPage from './pages/LeaderboardPage';
import Layout from './components/Layout';

const rootRoute = createRootRoute({
  component: Layout,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: HomePage,
});

const snakeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/snake',
  component: SnakeGame,
});

const tetrisRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/tetris',
  component: TetrisGame,
});

const pongRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/pong',
  component: PongGame,
});

const pacManRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/pacman',
  component: PacManGame,
});

const spaceInvadersRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/space-invaders',
  component: SpaceInvadersGame,
});

const breakoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/breakout',
  component: BreakoutGame,
});

const asteroidsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/asteroids',
  component: AsteroidsGame,
});

const donkeyKongRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/donkey-kong',
  component: DonkeyKongGame,
});

const rollingBallsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/rolling-balls',
  component: RollingBallsGame,
});

const froggerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/frogger',
  component: FroggerGame,
});

const galagaRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/galaga',
  component: GalagaGame,
});

const minesweeperRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/minesweeper',
  component: MinesweeperGame,
});

const centipedeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/centipede',
  component: CentipedeGame,
});

const missileCommandRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/missile-command',
  component: MissileCommandGame,
});

const pinballRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/pinball',
  component: PinballGame,
});

const bubbleShooterRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/bubble-shooter',
  component: BubbleShooterGame,
});

const qbertRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/qbert',
  component: QbertGame,
});

const digDugRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/dig-dug',
  component: DigDugGame,
});

const leaderboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/leaderboard',
  component: LeaderboardPage,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  snakeRoute,
  tetrisRoute,
  pongRoute,
  pacManRoute,
  spaceInvadersRoute,
  breakoutRoute,
  asteroidsRoute,
  donkeyKongRoute,
  rollingBallsRoute,
  froggerRoute,
  galagaRoute,
  minesweeperRoute,
  centipedeRoute,
  missileCommandRoute,
  pinballRoute,
  bubbleShooterRoute,
  qbertRoute,
  digDugRoute,
  leaderboardRoute,
]);

const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

export default function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      <RouterProvider router={router} />
      <Toaster />
    </ThemeProvider>
  );
}
