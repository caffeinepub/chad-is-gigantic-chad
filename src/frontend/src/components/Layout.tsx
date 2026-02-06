import { Outlet, useNavigate, useRouterState } from '@tanstack/react-router';
import { Gamepad2, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Layout() {
  const navigate = useNavigate();
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="border-b-4 border-primary bg-card shadow-lg">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate({ to: '/' })}
              className="flex items-center gap-3 group"
            >
              <div className="bg-primary p-2 rounded-lg group-hover:scale-110 transition-transform">
                <Gamepad2 className="h-8 w-8 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-black tracking-tight text-foreground pixel-font">
                  RETRO ARCADE
                </h1>
                <p className="text-xs text-muted-foreground">Classic Games Collection</p>
              </div>
            </button>
            <nav className="flex items-center gap-2">
              <Button
                variant={currentPath === '/' ? 'default' : 'ghost'}
                onClick={() => navigate({ to: '/' })}
                className="pixel-font"
              >
                <Gamepad2 className="h-4 w-4 mr-2" />
                Games
              </Button>
              <Button
                variant={currentPath === '/leaderboard' ? 'default' : 'ghost'}
                onClick={() => navigate({ to: '/leaderboard' })}
                className="pixel-font"
              >
                <Trophy className="h-4 w-4 mr-2" />
                Leaderboard
              </Button>
            </nav>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t-4 border-primary bg-card mt-auto">
        <div className="container mx-auto px-4 py-6">
          <div className="text-center text-sm text-muted-foreground">
            <p>
              © 2025. Built with <span className="text-destructive">♥</span> using{' '}
              <a
                href="https://caffeine.ai"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline font-semibold"
              >
                caffeine.ai
              </a>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
