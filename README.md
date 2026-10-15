# Northbate LM — Loan/Load Management UI Prototype

The client (`client/`) is a UI-only prototype of a trucking/logistics Load
Management System: load lifecycle management, planning and dispatch
boards, driver/vehicle/carrier/customer records, documents, billing,
reports, exceptions, and user/role administration. **There is no real
backend for any of this** — all of it runs against an in-memory mock
dataset (`client/src/mock/seed.ts`) held in a React context
(`client/src/store/AppStore.tsx`). Actions like changing a load's status,
assigning a carrier, approving a carrier, inviting a user, or marking an
invoice paid mutate that in-memory state only; everything resets on reload.
A "Viewing as" role switcher in the topbar swaps the current role to show
how nav/actions are gated per role (UI-only — not real authorization).

The app's home screen (`/`, nav label **Markets**) is a separate thing: a
real-market-data stock dashboard (watchlist, quote stats, a candlestick +
volume chart) fed by a live proxy to Yahoo Finance's public chart endpoint
in `server/`. See "Markets dashboard" below — it's the one part of this
app that isn't mock data.

The original SDUI (Server-Driven UI) demo described below still exists and
is reachable from the sidebar as **SDUI Demo** — it's unrelated to the Load
Management UI and still talks to the real Express backend in `server/`.

## SDUI demo: how it works

```
server/data/home.json  --GET /api/screen/home-->  client fetches JSON
                                                          |
                                                          v
                                        SduiRenderer walks the JSON tree
                                        and draws it with React primitives
                                        it already knows (Text, Button,
                                        Card, Banner, Container, Image...)
```

- **`server/`** — a tiny Express app. `GET /api/screen/:id` reads
  `server/data/<id>.json` fresh off disk on every request. Editing that
  file *is* "deploying a UI change" — no restart needed.
- **`client/`** — a Vite + React app wrapped with Capacitor so it can be
  packaged as a real Android app. It never imports screen-specific
  components; everything comes from `src/sdui/SduiRenderer.tsx`, a single
  recursive renderer that maps a fixed vocabulary of node `type`s
  (`screen`, `container`, `text`, `image`, `banner`, `card`, `button`,
  `spacer`) to real DOM/React elements.

**The honest limit of this pattern:** you can only change *arrangement,
content, color, and which pre-built animation/action runs* over the wire.
Teaching the client an entirely new node `type` (a brand-new interaction
pattern) still requires a client code change and a real release. That's
true for Naukri too — the SDUI JSON picks from an already-shipped palette
of native building blocks, it doesn't send new native code.

## Markets dashboard: real data, plus a second server-driven surface

The **Markets** page (nav label, route `/`) is a stock watchlist +
candlestick/volume chart, not a load-management screen. Two backend
endpoints in `server/index.js` make it work:

- `GET /api/stocks/quote/:symbol` — current price, change, day/52-week
  range, volume.
- `GET /api/stocks/chart/:symbol?range=&interval=` — OHLCV candles for
  the selected range.

Both proxy Yahoo Finance's public (unofficial, undocumented) chart
endpoint server-side — this is **real market data**, not mocked, but
there's no published SLA or terms for that endpoint, so treat it as
demo-grade, not production-grade. The proxy exists so the browser/WebView
never calls a third-party API directly (avoids CORS, keeps the "client
only talks to our backend" pattern, and gives a place to add a real
provider + API key later without touching the client). A small in-memory
TTL cache (20s for quotes, 60s for charts) keeps repeated polling from
hammering the upstream endpoint.

`GET /api/dashboard-widgets` (`server/data/dashboard-widgets.json`) is
the same server-driven-arrangement idea as the SDUI demo, now applied to
this screen: it controls *which* ticker symbols appear in the watchlist,
in what order, under what label, plus an optional announcement banner
above it — not the price data itself, which always comes live from the
quote/chart endpoints above. Edit the file and tap **Refresh** on the
Markets page to see the watchlist change — no rebuild. If the backend is
unreachable, it falls back to a built-in default watchlist
(`DEFAULT_DASHBOARD_WIDGETS` in `client/src/domain/stocks.ts`).

**Important, same caveat as always:** the Markets page *knowing how* to
ask the server for a watchlist, fetch quotes, and draw a candlestick
chart is client code, shipped once. Only the symbol list/labels/banner
are free to change from here on; a new chart type or data field still
needs a client change and rebuild.

## Load Management UI prototype: structure

- `client/src/domain/` — plain TypeScript types (`types.ts`), the load
  status state machine and its transition rules (`statusMachine.ts`),
  role-gating helpers (`permissions.ts` — UI-only, no server to enforce
  it), status→color mappings (`presentation.ts`), and margin/revenue math
  (`finance.ts`).
- `client/src/mock/seed.ts` — generates the deterministic mock dataset
  (customers, carriers, drivers, vehicles, loads, invoices, carrier bills,
  documents, exceptions, notifications, users) from a seeded PRNG so it's
  the same every reload.
- `client/src/store/AppStore.tsx` — a React context + reducer holding that
  dataset plus the current "viewing as" role, and every mutating action
  (status changes, assignments, invites, etc.) used by the pages.
- `client/src/components/` — shared UI: `AppShell` (sidebar/topbar/role
  switcher/notifications), `DataTable` (generic sortable/searchable/paged
  table), `Tabs`, `Modal`/`ConfirmDialog`, `Toast`, small primitives
  (`Badge`, `Card`, `KpiCard`, `EmptyState`, `FieldRow`), and
  `charts/CandlestickChart.tsx` (a thin `lightweight-charts` wrapper used
  only by the Markets page).
- `client/src/pages/` — one file per route: Markets (`DashboardPage.tsx`,
  the stock dashboard), Loads (list, detail, create/edit form), Planning,
  Dispatch, Drivers, Vehicles, Carriers, Customers, Documents, Billing,
  Reports, Exceptions, Settings/Users, and the original SDUI Demo (now a
  photo gallery — see `server/data/home.json`).
- `client/src/app.smoke.test.tsx` — clicks through every nav destination
  plus the load detail → edit → create flow and asserts each page renders
  without throwing. `client/src/sdui/sduiRenderer.test.tsx` still covers
  the SDUI demo against the real backend.

Run `npx vitest run` in `client/` to execute both (the SDUI test needs
`server`'s `npm run dev` running on port 4000; the smoke tests don't).

## Run it

### 1. Backend (only needed for the SDUI Demo nav item)

```bash
cd server
npm install
npm run dev     # http://localhost:4000
```

### 2. Client (web, fastest way to see it)

```bash
cd client
npm install
npm run dev      # http://localhost:5173
```

Open the browser, click "Refresh UI" any time. Now edit
`server/data/home.json` (change `text`, `backgroundColor`,
`enterAnimation`, reorder `children`, bump `version`) and save — reload
the page or hit "Refresh UI". No client rebuild happened.

### 3. Admin page (publish changes without hand-editing JSON)

With the backend running, open **http://localhost:4000/admin**. It's a
plain static page served directly by Express (`server/public/admin/`) —
no build step, no extra server.

- Loads the current screen into a form (banner text/color/animation,
  info text, card title/subtitle, button text/URL/color, background).
- "Show raw JSON instead" swaps to a textarea for anything the form
  doesn't expose — same publish button either way.
- **Publish to backend** sends `PUT /api/screen/:id`, which:
  - rejects unknown node types or malformed shapes (`400`, with a
    message pointing at the bad node) instead of corrupting the file,
  - rejects path-traversal attempts in the screen id,
  - writes atomically (temp file + rename) so a crash mid-write can't
    leave a half-written screen,
  - auto-increments `version` and stamps `updatedAt`.
- The right-hand panel embeds the actual running client
  (`http://localhost:5173`) in a phone-shaped frame. Click **Reload
  preview** after publishing to see the change — that reload only
  re-fetches JSON, the client bundle itself is never rebuilt.

This is the same effect as hand-editing `home.json`, just with
validation and versioning instead of trusting a manual edit — which is
what a real CMS/admin backend for this pattern would give you.

### 4. Android shell (Capacitor)

```bash
cd client
npm run build
npx cap sync android
npx cap open android     # opens the project in Android Studio
```

From Android Studio, run it on an emulator or device like any native app.
Because the emulator's `localhost` points at the emulator itself (not your
PC), the client auto-targets `10.0.2.2:4000` when running as an Android
platform (see `src/sdui/config.ts`). For a **physical phone** on your WiFi,
set your machine's LAN IP instead:

```bash
# client/.env.local
VITE_API_BASE_URL=http://192.168.1.42:4000
```

then `npm run build && npx cap sync android` again (this one rebuild wires
the app to your backend's address — after that, UI *content* changes never
need another build, only backend edits).

To build an installable debug APK directly from the command line instead
of Android Studio: `cd client/android && ./gradlew.bat assembleDebug` (or
`./gradlew assembleDebug` outside Windows). The APK lands at
`client/android/app/build/outputs/apk/debug/app-debug.apk`.

### App name, icon, and splash screen

- **Name**: `appName` in `client/capacitor.config.ts`, plus `app_name` /
  `title_activity_main` in `client/android/app/src/main/res/values/strings.xml`
  (Capacitor doesn't rewrite the Android strings file on `cap sync`, so
  this one is edited by hand).
- **Icon and splash**: generated from four source images in
  `client/resources/` (`icon.png`, `icon-foreground.png`,
  `icon-background.png`, `splash.png`) via
  [`@capacitor/assets`](https://github.com/ionic-team/capacitor-assets),
  a devDependency. `client/resources/generate-assets.ps1` regenerates
  those four PNGs (a blue `#2563EB` background with a white "NG"
  monogram, matching the web app's sidebar brand mark) using
  `System.Drawing` — no image-editing tool required. After changing any
  of them, regenerate every density with:
  ```bash
  cd client
  npx capacitor-assets generate --android
  npm run build && npx cap sync android
  ```

## Where the JSON schema lives

`client/src/sdui/types.ts` is the contract both sides agree on:

- `SduiNode` — `type`, `props`, `style`, `action`, `enterAnimation`, `children`
- `SduiAction` — `OPEN_URL`, `SHOW_ALERT`, `NAVIGATE`
- `SduiStyle` — a small set of style keys translated to real CSS in
  `src/sdui/style.ts` (this indirection is what would let a native
  Android/iOS renderer interpret the same JSON differently, e.g.
  `elevation` → a real Material shadow instead of `box-shadow`)
- `id` on a node is how the admin page finds "the banner" or "the CTA
  button" inside the tree (`findById` in `admin.js`) without relying on
  array position, which would silently break the moment someone
  reorders `children`.

Add a new visual primitive by: adding a case to the `SduiNodeType` union,
adding a `case` to the switch in `SduiRenderer.tsx`, and shipping that one
client update. After that, the server can use it in any arrangement,
forever, without another release.

## Tests

`client/src/sdui/sduiRenderer.test.tsx` is an integration test, not a
unit test — it renders the real `App` and expects the real backend to be
reachable at `:4000`. Start `server` (`npm run dev`) before running
`npx vitest run` in `client`, or it fails on the fetch, not on the UI.
#   s e r v e r - d r i v e n U I  
 