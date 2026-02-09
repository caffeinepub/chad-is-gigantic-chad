# Specification

## Summary
**Goal:** Add six additional classic games to Retro Arcade (Centipede, Missile Command, Pinball, Bubble Shooter, Q*bert, Dig Dug) with playable pages and full high-score support.

**Planned changes:**
- Add six new playable React/TypeScript game pages, each matching existing game UI/UX patterns (back navigation, score panel, how-to-play, pause/reset controls where applicable, and game-over score submission dialog).
- Add six new frontend routes and update Home page and Leaderboard navigation mappings so each new game is reachable and “Play {game.name}” works for all games.
- Update the Motoko backend to include the six new games in `getAvailableGames()` (with English descriptions and thumbnails) and to persist/retrieve high scores for each via the existing score APIs.
- Add static preview images for the six new games under `frontend/public/assets/generated` and wire them into the existing preview image mapping.
- If needed due to stable state changes, adjust backend migration so upgrades do not trap and existing game scores remain intact.

**User-visible outcome:** Users can see six new classic games on the Home page, launch each one to play, and submit/view high scores for each game (including via the Leaderboard) without navigation or backend score issues.
