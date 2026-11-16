# SafeRoad — Implementation Tasks

Each task is self-contained. Complete them in the order shown; later tasks depend on earlier ones unless a note says otherwise.

---

## Phase 1 — Project Bootstrap

### Task 1.1 — Scaffold Vite + React project
- Run `npm create vite@latest . -- --template react` inside the workspace root.
- Install runtime dependencies: `react-leaflet`, `leaflet`, `@supabase/supabase-js`.
- Install dev dependencies: `tailwindcss`, `postcss`, `autoprefixer`.
- Initialise Tailwind (`npx tailwindcss init -p`); set `content` paths to `./index.html` and `./src/**/*.{js,jsx}`.
- Add Leaflet CSS import to `src/main.jsx`.
- Add `src/styles/index.css` with Tailwind directives and import it in `main.jsx`.
- Verify dev server starts and renders a blank page without console errors.

### Task 1.2 — PWA manifest (no service worker)
- Create `public/manifest.json` per design §9: name, short_name, start_url, display, theme_color, background_color, icons.
- Add placeholder icon files at `public/icons/icon-192.png` and `icon-512.png`.
- Add `<link rel="manifest">` to `index.html`.
- Do **not** add `vite-plugin-pwa` or any service worker.

### Task 1.3 — Supabase project wiring
- Document the two required env vars in `.env.example`: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.
- Create `src/lib/supabase.js` that exports a `supabase` client via `createClient`.
- Create `src/lib/geo.js` with a `haversineKm(lat1, lng1, lat2, lng2)` function (client-side use in demo mode proximity checks).

---

## Phase 2 — Database

### Task 2.1 — Write database migration
Create `supabase/migrations/001_initial.sql` containing everything below in order.

**Tables**
- `drivers`: `id uuid PK`, `display_name text not null`, `created_at`.
  - `id` must equal `auth.uid()` — enforced by RLS, not a default.
- `reports`: `id uuid PK gen_random_uuid()`, `type text check(...)`, `lat float8`, `lng float8`, `status text default 'pending' check(...)`, `yes_count int default 0`, `no_count int default 0`, `created_at`, `expires_at default now()+30min`.
- `report_private`: `report_id uuid PK FK→reports.id ON DELETE CASCADE`, `driver_id uuid not null`, `reporter_lat float8`, `reporter_lng float8`.
- `votes`: `id uuid PK gen_random_uuid()`, `report_id uuid FK→reports.id ON DELETE CASCADE`, `driver_id uuid not null`, `value boolean not null`, `created_at`. Unique on `(report_id, driver_id)`.

**Haversine helper function**
- Implement `haversine_km(lat1, lng1, lat2, lng2)` as a pl/pgsql function (see design §3). No PostGIS.

**`submit_report` function (`SECURITY DEFINER`)**
- Signature: `submit_report(p_type text, p_lat float8, p_lng float8, p_reporter_lat float8, p_reporter_lng float8) RETURNS reports`
- Must include `SET search_path = public`.
- Logic per design §3:
  1. Verify `auth.uid()` is not null.
  2. Validate `p_type` ∈ `{'security','blocked','accident','safe'}` — raise exception if not.
  3. Validate `p_lat` ∈ `[−90, 90]` and `p_lng` ∈ `[−180, 180]` — raise exception if not.
  4. Insert into `reports` with `expires_at = now() + interval '30 minutes'` (never from client).
  5. Call `haversine_km`; if > 10 km, update `status = 'suspicious'`.
  6. Insert into `report_private`.
  7. Return the new `reports` row.

**`cast_vote` function (`SECURITY DEFINER`)**
- Signature: `cast_vote(p_report_id uuid, p_value boolean) RETURNS reports`
- Must include `SET search_path = public`.
- Logic per design §3: verify not expired/rejected; check `report_private.driver_id = auth.uid()` and raise exception `'cannot vote on own report'` if equal (this is the authoritative enforcement — UI hiding is secondary); upsert vote; recompute counts; update status; return updated `reports` row.

**RLS policies** (enable RLS on all four tables first)
- `drivers`: INSERT when `id = auth.uid()`; SELECT own row only.
- `reports`: SELECT granted to **both `anon` and `authenticated` roles** (anonymous sign-in users receive the `authenticated` role; Realtime uses it when evaluating RLS for change broadcasts — omitting `anon` or `authenticated` silently drops events). INSERT/UPDATE/DELETE denied for clients.
- `report_private`: all operations denied for clients (SELECT included).
- `votes`: SELECT own rows (`driver_id = auth.uid()`); INSERT/UPDATE/DELETE denied.

**Realtime**
- Enable Realtime publication on the `reports` table.

### Task 2.2 — Apply migration and smoke-test
- Apply the migration via `supabase db push` or the Supabase SQL editor.
- Manually call `submit_report` with nearby coordinates and verify `status = 'pending'`.
- Call `submit_report` with pin far from reporter (> 10 km) and verify `status = 'suspicious'`.
- Call `cast_vote` twice with the same user on the same report and verify only one vote row exists.
- Verify `report_private` is inaccessible with the anon key (expect 0 rows / RLS error).

---

## Phase 3 — Auth & Session

### Task 3.1 — `useSession` hook
- Create `src/hooks/useSession.js`.
- On mount: call `supabase.auth.getSession()`.
  - If no session: call `supabase.auth.signInAnonymously()`.
- Read `displayName` from `localStorage`.
- Return `{ session, displayName, isNewUser, login, logout }`.
  - `isNewUser = true` when `displayName` is absent (triggers LoginScreen).
  - `login(name)`: insert row into `drivers` (`id = auth.uid(), display_name = name`), store `displayName` in `localStorage`.
  - `logout()`: call `supabase.auth.signOut()`, clear `localStorage`.
- Wrap in a React Context so any component can call `useSession()`.

### Task 3.2 — Login screen
- Create `src/components/auth/LoginForm.jsx`.
- Text input with Amharic placeholder: "ስምዎን ወይም ስልክ ቁጥርዎን ያስገቡ".
- Submit button label: "ግባ".
- On submit: call `login(name)` from `useSession`; show spinner during the async call.
- Validation: non-empty input only.
- On success: app routes to MapScreen.

---

## Phase 4 — Map Foundation

### Task 4.1 — Route constants
- Create `src/constants/route.js` exporting:
  - `WAYPOINTS`: array of `{ name, lat, lng }` for the five towns.
  - `ROUTE_POLYLINE`: array of `[lat, lng]` pairs in order.

### Task 4.2 — Leaflet map base
- Create `src/components/map/LeafletMap.jsx` using `react-leaflet` `<MapContainer>`.
- Centre on route midpoint (near Addis Alem), zoom 9.
- Add OSM `<TileLayer>`.
- Fix the Vite + Leaflet default icon path issue (delete `L.Icon.Default.prototype._getIconUrl` and manually set icon URLs).
- Render `<RoutePolyline>` (a blue `<Polyline>` through `ROUTE_POLYLINE`).

### Task 4.3 — `useLocation` hook
- Create `src/hooks/useLocation.js`.
- Normally: call `navigator.geolocation.watchPosition`; return `{ position: {lat,lng}|null, error }`.
- Accept an optional `override` parameter. When `override` is a `{lat,lng}` object, return it directly instead of the device GPS.
- This is the single point of location truth; demo mode passes `simPosition` as the override.

### Task 4.4 — User location marker
- Create `src/components/map/UserLocationMarker.jsx`.
- Render a blue circle marker at `position` when it is not null.
- Do not render when `position` is null.

---

## Phase 5 — Reports: Fetch, Display, Expire

### Task 5.1 — `useReports` hook
- Create `src/hooks/useReports.js`.
- On mount: query `reports` where `expires_at > now()` and `status <> 'rejected'`.
- Subscribe to Supabase Realtime `postgres_changes` on `reports` (all events).
  - `INSERT`: add to local list; schedule expiry timer.
  - `UPDATE`: replace matching row in local list; reschedule expiry timer if `expires_at` changed.
  - `DELETE`: remove from local list; cancel expiry timer.
- **Expiry timer**: for each report, call `setTimeout(() => removeReport(id), ms)` where `ms = expires_at - Date.now()`. When the timer fires, remove the report from state.
- In demo mode, also merge in hardcoded demo reports from `src/constants/demoReports.js` (passed in as a prop or via context).
- Return `{ reports, loading, error }`.

### Task 5.2 — Demo report constants
- Create `src/constants/demoReports.js` with 4 hardcoded objects: `{ id, type, lat, lng, status: 'confirmed', yes_count: 2, no_count: 0, created_at, expires_at }`.
  - Accident near Holeta.
  - Road blocked near Addis Alem.
  - Security threat near Ginchi.
  - Safe near Ambo.
- Use fake UUIDs prefixed `demo-` so they are distinguishable from real reports.

### Task 5.3 — Report markers
- Create `src/components/map/ReportMarker.jsx`.
- Render a custom `L.DivIcon` per report using the colour and shape from design §6.
- Overlay a `<StatusBadge>` for pending / suspicious / confirmed.
- On click, call `onSelect(report)` to open the bottom sheet.

### Task 5.4 — Status badge
- Create `src/components/ui/StatusBadge.jsx`.
- Accept `status` prop; render the correct badge per design §6 colour/icon table.

---

## Phase 6 — Reporting Flow

### Task 6.1 — Report panel UI
- Create `src/components/reports/ReportPanel.jsx`.
- Slide-up bottom sheet with four `<ReportTypeButton>` components.
- Each button shows the Amharic label and icon/colour per design §6.
- If `useLocation` returns no position (permission denied), show the message "ሪፖርት ለማቅረብ የቦታ ፈቃድ ያስፈልጋል።" and disable buttons.
- Disable all buttons and show a spinner while submission is in flight.
- On success: close panel, show toast "ሪፖርቱ ተልኳል".
- On error: show Amharic error toast.

### Task 6.2 — Submit report logic
- Inside `ReportPanel`, on button tap:
  1. Get `position` from `useLocation` (may be simulated in demo mode).
  2. Call `supabase.rpc('submit_report', { p_type, p_lat: position.lat, p_lng: position.lng, p_reporter_lat: position.lat, p_reporter_lng: position.lng })`.
  3. On success: append the returned `id` to the `'ownReportIds'` JSON array in `localStorage`.
  4. The returned row is added to local state via the Realtime subscription (no manual state mutation needed).

### Task 6.3 — Report bottom sheet (view + vote)
- Create `src/components/reports/ReportBottomSheet.jsx`.
- Show: type label (Amharic), `<StatusBadge>`, relative time in Amharic ("X ደቂቃ በፊት"), `yes_count`, `no_count`.
- Track own reports with a client-side `Set` populated from `localStorage` key `'ownReportIds'`. When `submit_report` succeeds, append the returned `id` to this list and persist it.
- If the viewing driver is not the reporter: show Yes ("አዎ") / No ("አይደለም") `<VoteButtons>`.
- If driver owns the report (id in `ownReportIds`): show "ይህ የእርስዎ ሪፖርት ነው" instead of vote buttons.
- For demo reports (id starts with `demo-`): show vote buttons as disabled with label "ዴሞ ሪፖርት".

### Task 6.4 — Vote buttons
- Create `src/components/voting/VoteButtons.jsx`.
- Accept `reportId`, `currentVote` (true/false/null), `onVote` callback.
- Tapping the already-selected vote does nothing.
- Tapping the opposite vote calls `supabase.rpc('cast_vote', { p_report_id, p_value })`.
- Optimistically update `currentVote` and counts; roll back on error.

---

## Phase 7 — Demo Mode

### Task 7.1 — `useDemoMode` hook
- Create `src/hooks/useDemoMode.js`.
- State: `{ active, simPosition, alertedIds }`.
- `start()`:
  1. Unlock audio (see Task 7.3).
  2. Set `simPosition = WAYPOINTS[0]` (Addis Ababa).
  3. Clear `alertedIds`.
  4. Start `setInterval` every 2 seconds.
- Each tick:
  1. Advance `simPosition` 1 km along `ROUTE_POLYLINE` using linear interpolation.
  2. When past Ambo, reset to Addis Ababa and clear `alertedIds`.
  3. Return `simPosition` so `useLocation` can expose it.
- `stop()`: clear interval, set `active = false`, reset `simPosition`.
- Export `{ active, simPosition, start, stop }`.

### Task 7.2 — Wire location override into `useLocation`
- In `useDemoMode`, expose `simPosition`.
- In `LeafletMap` (or `App`), pass `simPosition` as the `override` to `useLocation` when `active` is true.
- Confirm the blue dot on the map tracks the simulated position during demo mode.

### Task 7.3 — Audio system (`src/lib/audio.js`)
- Export `unlockAudio()`: create a silent `AudioContext`, call `.resume()`, and play + immediately stop a 0-duration buffer. Call this once on the Start Demo tap.
- Export `playAlert(type)`:
  1. Try `const a = new Audio('/audio/${type}.mp3'); a.play()`.
  2. If `.play()` rejects or the file is unavailable, fall back to `window.speechSynthesis.cancel(); window.speechSynthesis.speak(new SpeechSynthesisUtterance(ALERT_STRINGS[type]))` with `lang = 'am-ET'`.
- Define `ALERT_STRINGS` per design §7.
- Graceful no-op if neither API is available (log to console).

### Task 7.4 — Demo mode alert logic
- In `useDemoMode` each tick, after advancing `simPosition`:
  - Merge hardcoded demo reports with real `reports` from `useReports`.
  - Filter: `status !== 'suspicious' && status !== 'rejected'`.
  - For each matching report within 2 km (using `haversineKm` from `src/lib/geo.js`):
    - If `report.id` not in `alertedIds`: call `playAlert(report.type)`, add to `alertedIds`.

### Task 7.5 — Demo mode UI
- Create `src/components/demo/DemoModeOverlay.jsx`.
- Render a blue top banner: "ዴሞ ሁናቴ".
- Render `<SimulatedDriverMarker>` (a distinctive car icon `L.DivIcon`) at `simPosition`.
- Render `<AlertToast>` when an alert fires: shows the Amharic alert text, auto-dismisses after 4 seconds.
- "Stop Demo" button ("ዴሞ ቁም") calls `stop()` from `useDemoMode`.

---

## Phase 8 — Navigation & Settings

### Task 8.1 — Bottom navigation bar
- Create `src/components/ui/BottomNav.jsx`.
- Three tabs: Map ("ካርታ"), Report ("ሪፖርት"), Settings ("ቅንብሮች").
- Active tab is highlighted.
- Tapping Report opens `<ReportPanel>`. If no session display name yet, redirect to login.

### Task 8.2 — Settings screen
- Create `src/components/SettingsScreen.jsx`.
- Show `displayName` from `useSession` (read-only, label: "ስም").
- Logout button ("ውጣ"): calls `logout()`, routes to LoginScreen.
- Demo mode button ("ዴሞ ሁናቴ ጀምር"): calls `start()` from `useDemoMode`, routes to MapScreen.
- **"Test: Far-Away Report"** button ("ሩቅ ሪፖርት ሙከራ"):
  - Reads the driver's real GPS position directly from `navigator.geolocation.getCurrentPosition` (bypasses any demo override).
  - Calls `submit_report` with `p_lat=9.0167, p_lng=38.1333` (Ginchi waypoint) and the real reporter coords.
  - Shows "ሪፖርቱ ተልኳል — ጥርጣሬ ሁናቴ" on success.

### Task 8.3 — App shell routing
- Implement routing in `App.jsx` (hash-based or React Router):
  - No display name in localStorage → `LoginScreen`.
  - `/map` (default after login) → `MapScreen`.
  - `/settings` → `SettingsScreen`.
- Render `<BottomNav>` on all authenticated screens.
- Render `<DemoModeOverlay>` inside `MapScreen` when `active` is true.

---

## Phase 9 — Polish

### Task 9.1 — Amharic copy audit
- Review every visible string against the labels in requirements §9 and design §6–7.
- Ensure all labels, toasts, error messages, and placeholders are in Amharic Ethiopic script.
- Check relative-time formatting ("X ደቂቃ በፊት") for 1, 2–10, and 11+ minute cases.

### Task 9.2 — Mobile layout QA
- Test layout at 320 px, 375 px, and 414 px viewport widths.
- Confirm: map fills the viewport, bottom sheet doesn't clip, bottom nav is thumb-reachable, report panel slides up without covering the nav bar.
- Fix any overflow or z-index conflicts between Leaflet layers and Tailwind-positioned elements.

### Task 9.3 — Environment & deployment
- Verify `.env.example` lists all required variables.
- Write `README.md` with: prerequisites, `npm install`, configure `.env`, `npm run dev`, apply Supabase migration, `npm run build`.
- Add `vercel.json` or `netlify.toml` for SPA routing (all paths → `index.html`).

---

## Dependency Order Summary

```
1.1 → 1.2, 1.3

1.3 → 2.1 → 2.2

2.2 → 3.1 → 3.2

3.2 → 4.1 → 4.2 → 4.3 → 4.4

4.2, 4.3 → 5.1
           5.2 (independent)
           5.1, 5.2 → 5.3 → 5.4

5.1, 5.3 → 6.1 → 6.2
           6.3 → 6.4

5.1, 5.2 → 7.1
1.3       → 7.3
7.1, 7.3  → 7.2 → 7.4 → 7.5

6.1, 7.5 → 8.1
7.1      → 8.2
8.1, 8.2 → 8.3

8.3 → 9.1 → 9.2 → 9.3
```
