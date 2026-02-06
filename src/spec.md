# Specification

## Summary
**Goal:** Expand Retro Arcade by adding Frogger, Galaga, and Minesweeper with full gameplay pages, scoring, and leaderboard support.

**Planned changes:**
- Add dedicated playable pages/routes for Frogger, Galaga, and Minesweeper with consistent UI (back header, score panel, how-to-play, pause/reset where applicable, and end-of-game name entry for score submission).
- Extend the Motoko backend to include Frogger, Galaga, and Minesweeper in the available games list and to store/retrieve high scores for each without trapping.
- Update home navigation and leaderboard navigation so the new games are reachable from the home grid and from the leaderboard (including /leaderboard?game=<GameName> deep links).
- Change the leaderboard game tabs/list to be generated from the backend’s getAvailableGames() response rather than a hard-coded list.
- Add and wire static preview images for Frogger, Galaga, and Minesweeper under the existing /assets/generated/* convention for display on home game cards.

**User-visible outcome:** Users can play Frogger, Galaga, and Minesweeper, submit scores at game end, and view/select these games on the leaderboard with working navigation and preview images.
