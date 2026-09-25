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
- `src/state/` — typed state plus v1–v4 local save migration
- `src/render/art.ts` — original SVG hero, suits, and world backgrounds
- `src/audio/sound.ts` — procedural Web Audio effects
- `src/styles/main.css` — responsive RTL presentation and animation
- `public/` — manifest, service worker, and app icons

Existing `webHeroTimes.v1`, `.v2`, and `.v3` saves migrate automatically to v4. The original sixteen stage IDs are unchanged.
