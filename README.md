# ספיידר תיתוי

Hebrew RTL multiplication and division adventure with seven worlds, 46 stages, adaptive practice, four suits, snacks, procedural sound, and offline PWA support.

## Development

```bash
npm install
npm run dev
```

Quality checks:

```bash
npm run typecheck
npm test
npm run build
```

## Project structure

- `src/app/App.ts` — screens, navigation, session lifecycle, and DOM actions
- `src/config/` — difficulty, worlds, stages, suits, and snacks
- `src/game/engine.ts` — adaptive questions, mastery, scoring, stars, and progression
- `src/state/` — typed state plus v1–v6 local save migration
- `src/leaderboard/` — anonymous Supabase cloud saves and top-10 ranking
- `src/render/art.ts` — original SVG hero, suits, and world backgrounds
- `src/audio/sound.ts` — procedural Web Audio effects
- `src/styles/main.css` — responsive RTL presentation and animation
- `public/` — manifest, service worker, and app icons

Existing `webHeroTimes.v1`–`.v5` saves migrate automatically to v6. The original sixteen stage IDs are unchanged.

## Shared leaderboard (optional)

The game works offline without a backend. To enable the shared top-10 and cloud progress:

1. Create a Supabase project and enable **Authentication → Providers → Anonymous Sign-Ins**.
2. Run `supabase/schema.sql` in its SQL editor.
3. Copy `.env.example` to `.env.local` and enter the project URL and public anonymous key.
4. For GitHub Pages, add `VITE_SUPABASE_URL` as a repository variable and
   `VITE_SUPABASE_ANON_KEY` as a repository secret.

Profiles are anonymous and device-bound. Progress and leaderboard statistics are synchronized;
face photos always remain on the device and are never included in cloud data or recovery codes.
