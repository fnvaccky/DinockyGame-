# Dinocky — Snack Meadow

A Three.js meadow lobby and Supabase accounts around the original JavaScript/Canvas platformer. Login → lobby → levels → World 1-1 → results. The shop previews and equips colors and accessories in both renderers.

## Run locally

Live site: https://dinocky-game.vercel.app — deployed on Vercel's Hobby plan. The `fnvaccky/DinockyGame-` GitHub repository is connected for automatic deployments from `main`. Vercel stores the two public `VITE_SUPABASE_*` settings; local environment files are not committed.

```sh
npm install
npm start
```

Open the URL printed by Vite (normally http://127.0.0.1:3000; the current development session uses port 3001 because 3000 was occupied). On PowerShell with script execution disabled, use `npm.cmd`. `npm run build` produces `dist`; `npm run preview` serves that production build. The old `serve.js` is not the bundled app server.

Copy `.env.example` to `.env.local` when setting up another checkout. Use only the project URL and **publishable** key in Vite variables; never a secret/service-role key. The current ignored `.env.local` is connected to dedicated project **Dinocky**, ref `izudarafpjgosbuiycms`, Singapore, in **fnvaccky's**, created at the approved $0/month quote.

## Email setup still required

Production redirect setup is still pending: set the Supabase Site URL to `https://dinocky-game.vercel.app` and allow `https://dinocky-game.vercel.app/` and `https://dinocky-game.vercel.app/?recovery=1`. The deployment smoke check verified public HTTP 200, WebGL rendering, enabled login, and no page errors; it did not verify email delivery.

The user has no email provider ready. Public signup confirmation and password recovery must be verified after configuring a verified SMTP sender in Supabase Authentication → Email → SMTP settings. Keep email confirmation enabled. Supabase's default sender is restricted; the app does not bypass confirmation or provide guest accounts.

See [Supabase SMTP setup](https://supabase.com/docs/guides/auth/auth-smtp). In Authentication → URL Configuration, set the Site URL and explicitly allow the local URLs you use, including `http://127.0.0.1:3001/` and `http://127.0.0.1:3001/?recovery=1` (and the matching port 3000 URLs if used). Add the eventual production origin and recovery URL before public launch. Then verify actual inbox delivery, confirmation links, recovery links, and two separate accounts on the hosted service. These email-delivery checks are not claimed as completed.

## Play and development

- Move: A/D or Left/Right. Jump: Space, W, Up, or Z. Chomp: X, E, or Enter.
- Down + Jump drops through shelves. Down in the air activates Burger stomp. P pauses; use Resume to continue.
- Touch controls support simultaneous movement, Down, Jump and Chomp; cancellation, blur and navigation clear held inputs.
- World 1-1 contains nine edible enemies, eight pickups, pits, spikes, a checkpoint and a finish flag. Three hearts and 240 seconds per run. Worlds 1-2 and 1-3 are marked Coming soon.
- Drag the lobby character to turn; automatic 20-second rotation resumes after three seconds. Reduced motion stops ambient motion and automatic rotation. WebGL failure uses the existing 2D character.
- `/dev.html` opens the original Test Arena, Studio and power buttons during development. It is excluded from the default production build and cannot award coins. `tests/browser-smoke.mjs` is the legacy standalone dev-game check; use the new browser suite below for the app.

## Accounts and economy

The deployed migration is `supabase/migrations/20261025061429_dinocky_accounts_shop.sql`. Profiles, owned cosmetics, level bests and run records have account-scoped read policies. Authenticated clients cannot directly modify wallets or ownership. RPCs start runs, finish runs, buy and equip items; server functions lock the profile and enforce ownership. Purchases deduct and grant in one transaction. Duplicate completion requests return the same reward.

Starting balance is zero. The first successful World 1-1 clear earns 100 coins; later clears earn 25. Failures/abandoned runs earn zero. Pink is free, mint/lavender cost 75, sky blue 100, cap/scarf 150. One color and one accessory can be equipped. Buying does not equip automatically.

Completed results queue locally by account and run ID until confirmed; no optimistic coins are credited. Interrupted requests retry with the same ID. Clearing browser storage before a pending result reaches the server can lose that pending submission. Run validation checks plausible time/score and ownership; client-side gameplay is not a competitive anti-cheat system.

## Structure

`src/main.js` controls explicit app screens. `src/game/GameSession.js` owns the Canvas game lifecycle. `src/lobby/` owns disposable Three.js scene/model resources. `src/services/` contains Supabase operations and the pending reward queue. `src/cosmetics.js` defines the shared palette/catalog. The Part 2 tilemap, veggie/candy enemies, World 1-1, HUD and synthesized 8-bit sound effects remain in their existing modules. Existing shared event payloads are preserved.

## Verification

```sh
npm test
npm run test:browser
npm run build
```

The 28 automated tests include the original 12 gameplay checks plus input isolation, lifecycle cleanup, cosmetics, pending retries and real PostgreSQL execution of the migration using PGlite. Database cases cover account isolation, direct-write denial, insufficient funds, unowned equips, repeated purchases/rewards, failed runs and invalid results.

Run the browser suite with Vite running. It defaults to `http://127.0.0.1:3001`; override `GAME_URL` as needed. Install Chromium with `npx playwright install chromium` if unavailable, or set `CHROMIUM_PATH`. It exercises real WebGL, responsive screens, multitouch, settings, recovery/session UI, completion, interrupted-save retry, buying/equipping/reload and Canvas fallback. Auth/email transport is isolated; shop/reward RPCs execute the actual migration locally. Screenshots are written to `.impeccable/review/`. This suite is not a substitute for the pending live SMTP tests.
