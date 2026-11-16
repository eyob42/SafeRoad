# SafeRoad — Design

## 1. Architecture Overview

```
┌──────────────────────────────────────────┐
│             Browser / PWA                │
│                                          │
│  ┌──────────┐  ┌──────────┐             │
│  │  React   │  │ Leaflet  │             │
│  │  (Vite)  │  │   Map    │             │
│  └────┬─────┘  └────┬─────┘             │
│       │              │                   │
│  ┌────▼──────────────▼─────────────┐    │
│  │         Supabase Client         │    │
│  │  supabase-js (REST + Realtime)  │    │
│  └───────────────┬─────────────────┘    │
└──────────────────┼───────────────────────┘
                   │ HTTPS / WSS
        ┌──────────▼──────────┐
        │      Supabase       │
        │  ┌───────────────┐  │
        │  │  Auth         │  │
        │  │  (anon sign-in│  │
        │  │   auth.uid()) │  │
        │  └───────┬───────┘  │
        │  ┌───────▼───────┐  │
        │  │  Postgres 15  │  │
        │  │  (RLS on)     │  │
        │  └───────┬───────┘  │
        │  ┌───────▼───────┐  │
        │  │   Realtime    │  │
        │  │ (on `reports`)│  │
        │  └───────────────┘  │
        └─────────────────────┘
```

**Key decisions**

- No custom backend and no Edge Functions. All mutation logic lives in Postgres SQL functions (`SECURITY DEFINER`), called via `supabase.rpc`.
- Realtime is subscribed to the `reports` table directly. Views are not used because Supabase Realtime does not propagate changes through views.
- Sensitive data (reporter GPS coordinates, `driver_id`) is split into a separate `report_private` table that has no client-readable RLS policy. The `reports` table contains only public columns.
- The suspicious-distance check is a pl/pgsql haversine function; PostGIS is not required.
- Identity uses Supabase anonymous sign-in. `auth.uid()` is the driver's stable UUID, managed by Supabase Auth and available in RLS policies.

---

## 2. Database Schema

### Table: `drivers`

Stores display names for logged-in anonymous users.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | Must equal `auth.uid()` of the creating session |
| `display_name` | `text` not null | Name or phone entered at login |
| `created_at` | `timestamptz` default `now()` | |

**RLS policies**
- `INSERT`: allowed when `id = auth.uid()`.
- `SELECT`: own row only (`id = auth.uid()`).
- `UPDATE` / `DELETE`: denied.

---

### Table: `reports`

Contains only public columns. Realtime is enabled on this table.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK default `gen_random_uuid()` | |
| `type` | `text` not null check in `('security','blocked','accident','safe')` | |
| `lat` | `float8` not null | Report pin latitude |
| `lng` | `float8` not null | Report pin longitude |
| `status` | `text` not null default `'pending'` check in `('pending','suspicious','confirmed','rejected')` | |
| `yes_count` | `int` not null default `0` | |
| `no_count` | `int` not null default `0` | |
| `created_at` | `timestamptz` not null default `now()` | |
| `expires_at` | `timestamptz` not null default `now() + interval '30 minutes'` | |

**RLS policies**
- `SELECT`: granted to both the `anon` role and the `authenticated` role. Anonymous sign-in users receive the `authenticated` role, and Supabase Realtime uses that role to evaluate RLS when broadcasting change events. Both roles must be allowed or Realtime events will be silently suppressed.
- `INSERT`: denied for clients. Insertion goes through the `submit_report` SQL function.
- `UPDATE` / `DELETE`: denied for clients.

> Keeping `driver_id` out of `reports` entirely means there is no risk of it leaking via Realtime payloads.

---

### Table: `report_private`

Holds the sensitive columns that must never reach any client.

| Column | Type | Notes |
|---|---|---|
| `report_id` | `uuid` PK FK → `reports.id` ON DELETE CASCADE | |
| `driver_id` | `uuid` not null | `auth.uid()` of the reporter |
| `reporter_lat` | `float8` not null | GPS latitude at submission time |
| `reporter_lng` | `float8` not null | GPS longitude at submission time |

**RLS policies**
- `SELECT`: denied for all roles including `authenticated`. Only `SECURITY DEFINER` functions can read this table.
- `INSERT` / `UPDATE` / `DELETE`: denied for clients.

---

### Table: `votes`

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK default `gen_random_uuid()` | |
| `report_id` | `uuid` not null FK → `reports.id` ON DELETE CASCADE | |
| `driver_id` | `uuid` not null | `auth.uid()` of the voter |
| `value` | `boolean` not null | `true` = Yes, `false` = No |
| `created_at` | `timestamptz` default `now()` | |

Unique constraint: `(report_id, driver_id)`.

**RLS policies**
- `SELECT`: own votes only (`driver_id = auth.uid()`). Clients read vote counts from `reports.yes_count` / `reports.no_count` instead.
- `INSERT` / `UPDATE` / `DELETE`: denied for clients. All mutations go through `cast_vote`.

---

## 3. SQL Functions (SECURITY DEFINER)

### `haversine_km(lat1, lng1, lat2, lng2)`

A pure pl/pgsql helper used by the suspicious-check trigger. Returns distance in kilometres.

```sql
CREATE OR REPLACE FUNCTION haversine_km(
  lat1 float8, lng1 float8,
  lat2 float8, lng2 float8
) RETURNS float8 LANGUAGE plpgsql AS $$
DECLARE
  r  float8 := 6371;  -- Earth radius km
  d_lat float8 := radians(lat2 - lat1);
  d_lng float8 := radians(lng2 - lng1);
  a  float8;
BEGIN
  a := sin(d_lat/2)^2
     + cos(radians(lat1)) * cos(radians(lat2)) * sin(d_lng/2)^2;
  RETURN r * 2 * asin(sqrt(a));
END;
$$;
```

---

### `submit_report(p_type, p_lat, p_lng, p_reporter_lat, p_reporter_lng)`

Inserts one report and its private row; sets suspicious flag in one transaction.

```
SECURITY DEFINER
SET search_path = public
Called via: supabase.rpc('submit_report', { ... })
```

**Logic**:
1. Verify caller is authenticated (`auth.uid()` is not null).
2. Validate inputs:
   - `p_type` must be one of `'security'`, `'blocked'`, `'accident'`, `'safe'`; raise exception otherwise.
   - `p_lat` must be in `[−90, 90]`; `p_lng` must be in `[−180, 180]`; raise exception otherwise.
3. Insert into `reports` (`type`, `lat`, `lng`); `status` defaults to `'pending'`; `expires_at` is set to `now() + interval '30 minutes'` inside the function (never from the client).
4. Call `haversine_km(p_reporter_lat, p_reporter_lng, p_lat, p_lng)`.
5. If distance > 10 km, `UPDATE reports SET status = 'suspicious'` on the new row.
6. Insert into `report_private` (`report_id`, `driver_id = auth.uid()`, `reporter_lat`, `reporter_lng`).
7. Return the new `reports` row (public columns only).

---

### `cast_vote(p_report_id, p_value)`

Upserts a vote and recomputes report status.

```
SECURITY DEFINER
SET search_path = public
Called via: supabase.rpc('cast_vote', { p_report_id, p_value })
```

**Logic**:
1. Verify caller is authenticated.
2. Verify report exists and `expires_at > now()` and `status <> 'rejected'`.
3. Verify caller is not the reporter (`report_private.driver_id <> auth.uid()`).
4. Upsert into `votes (report_id, driver_id)` with `value = p_value`.
5. Recompute `yes_count` and `no_count` from `votes` where `report_id = p_report_id`.
6. Determine new status:
   - `yes_count >= 2` → `'confirmed'`
   - `no_count - yes_count >= 2` → `'rejected'`
   - else keep existing status (preserves `'suspicious'` or `'pending'`)
7. `UPDATE reports SET yes_count, no_count, status`.
8. Return `(id, status, yes_count, no_count)`.

---

## 4. Client-Side State & Data Flow

### Session bootstrap

```
App load
  → supabase.auth.getSession()
  → if no session → supabase.auth.signInAnonymously()
  → check localStorage for displayName
  → if no displayName → show LoginScreen (name entry)
  → if displayName present → fetch active reports → show MapScreen
```

> Anonymous sign-in creates a real Supabase Auth user with a stable `auth.uid()`. The user only needs to enter a display name once; on subsequent visits `getSession()` restores the session automatically.

### Report submission flow

```
Driver taps report type button
  → useLocation() returns current position
      (real GPS in normal mode; simulated position in demo mode)
  → supabase.rpc('submit_report', {
        p_type, p_lat, p_lng,
        p_reporter_lat, p_reporter_lng
    })
  → SQL function validates inputs, inserts into reports + report_private,
    computes expires_at, checks distance
  → returned row.id is saved to localStorage key 'ownReportIds' (JSON array)
  → Supabase Realtime broadcasts INSERT on `reports`
  → All connected clients receive new pin
```

### Vote flow

```
Driver taps Yes/No
  → supabase.rpc('cast_vote', { p_report_id, p_value })
  → SQL function upserts vote, recomputes counts + status
  → Supabase Realtime broadcasts UPDATE on `reports`
  → All clients receive updated pin status
```

### Real-time subscription

```javascript
supabase
  .channel('reports-changes')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'reports'
  }, handleReportChange)
  .subscribe()
```

### Client-side expiry timer

After fetching reports, the client schedules a `setTimeout` for each report set to fire at `expires_at`. When the timer fires, that report is removed from local state and its marker is removed from the map. This runs in addition to the server-side `expires_at` column so that reports disappear promptly even when no Realtime event arrives.

---

## 5. Frontend Component Tree

```
App
├── LoginScreen
│   └── LoginForm (name/phone input + submit)
├── MapScreen  ← main view
│   ├── LeafletMap
│   │   ├── RoutePolyline
│   │   ├── ReportMarker (×N, one per active report)
│   │   └── UserLocationMarker
│   ├── ReportBottomSheet (shown when marker tapped)
│   │   ├── ReportTypeIcon
│   │   ├── StatusBadge
│   │   └── VoteButtons (Yes / No)
│   ├── ReportPanel (slide-up panel for new report)
│   │   └── ReportTypeButton (×4)
│   └── DemoModeOverlay
│       ├── SimulatedDriverMarker
│       └── AlertToast
├── SettingsScreen
│   ├── DisplayName (read-only)
│   ├── LogoutButton
│   ├── DemoModeButton
│   └── FarAwayReportButton  ← "Test: Far-Away Report"
└── BottomNav
    ├── MapTab
    ├── ReportTab
    └── SettingsTab
```

---

## 6. Report Type Icons & Colours

| Type | Amharic Label | Icon Shape | Colour |
|---|---|---|---|
| `security` | ደህንነት ስጋት | Shield | Red `#DC2626` |
| `blocked` | መንገድ ታግዷል | Barrier | Orange `#EA580C` |
| `accident` | የትራፊክ አደጋ | Warning triangle | Yellow `#CA8A04` |
| `safe` | መንገዱ ደህና ነው | Checkmark circle | Green `#16A34A` |

Verification status overlays a small badge on the icon:

| Status | Badge |
|---|---|
| `pending` | Grey dot |
| `suspicious` | Yellow exclamation `!` |
| `confirmed` | Green tick `✓` |
| `rejected` | — (hidden from map) |

---

## 7. Demo Mode Design

### Location override

While demo mode is active, `useLocation` returns `simPosition` instead of the device GPS. This is the single source of truth for all location-dependent behaviour: the user's map dot, the proximity check for audio alerts, and the reporter coordinates when submitting a report during demo mode.

### Hardcoded demo reports

Defined in `src/constants/demoReports.js` (never written to the DB):

| # | Type | Location |
|---|---|---|
| 1 | `accident` | Near Holeta |
| 2 | `blocked` | Near Addis Alem |
| 3 | `security` | Near Ginchi |
| 4 | `safe` | Near Ambo |

These are merged with real database reports in `useReports` while demo mode is active.

### Simulation loop

1. Initialise `simPosition = Addis Ababa`.
2. Every 2 seconds, advance `simPosition` by 1 km along the route polyline (linear interpolation between waypoints).
3. Merge hardcoded demo reports with real reports from `useReports`.
4. For each merged report within 2 km of `simPosition` whose `status` is not `'suspicious'` and not `'rejected'`:
   - If not already in `alertedIds`, call `playAlert(type)` and add to `alertedIds`.
5. Update `SimulatedDriverMarker` position on map.
6. When `simPosition` reaches Ambo, reset to Addis Ababa and clear `alertedIds`.

### Audio alerts

**Primary**: `new Audio('/audio/<type>.mp3').play()` — one file per report type in `public/audio/`.

**Fallback**: `window.speechSynthesis.speak(utterance)` with `lang = 'am-ET'` if the Audio element fails or `speechSynthesis` is chosen explicitly.

**Autoplay unlock**: on the Start Demo button tap, call `AudioContext.resume()` (or play + immediately pause a silent buffer) to satisfy browser autoplay policy before the first alert fires.

**Alert strings (used for speechSynthesis fallback)**:

| Report type | Amharic text |
|---|---|
| `security` | "ጥንቃቄ፡ ፊት ለፊት ደህንነት ስጋት አለ" |
| `blocked` | "ጥንቃቄ፡ ፊት ለፊት መንገዱ ታግዷል" |
| `accident` | "ጥንቃቄ፡ ፊት ለፊት የትራፊክ አደጋ አለ" |
| `safe` | "መንገዱ ደህና ነው። ደህና ሂዱ" |

**MP3 file names**: `public/audio/security.mp3`, `blocked.mp3`, `accident.mp3`, `safe.mp3`.

---

## 8. Settings — Far-Away Report Test

The **"Test: Far-Away Report"** button in Settings calls `submit_report` with:

- `p_lat = 9.0167`, `p_lng = 38.1333` — the Ginchi waypoint on the route.
- `p_reporter_lat` / `p_reporter_lng`: the driver's real current GPS position from `useLocation` (the demo override is **not** used here; the raw device GPS is read directly from `navigator.geolocation`).

Unless the driver is physically standing at Ginchi, `haversine_km(reporter, pin)` will exceed 10 km and the function sets `status = 'suspicious'`. The report appears on the map at Ginchi with the suspicious badge, demonstrating the feature without special tooling.

---

## 9. PWA Shell

- **`manifest.json`**: `name="SafeRoad"`, `short_name="SafeRoad"`, `start_url="/"`, `display="standalone"`, `theme_color="#1D4ED8"`, `background_color="#0F172A"`, icons at 192 and 512 px.
- No service worker. `vite-plugin-pwa` is not used. The manifest is a plain static file.

---

## 10. Security Considerations

| Risk | Mitigation |
|---|---|
| Reporter location leakage | `reporter_lat/lng` and `driver_id` are in `report_private` which has `SELECT` denied for all client roles. Never included in Realtime payloads. |
| Vote stuffing | Unique constraint `(report_id, driver_id)` on `votes`; `cast_vote` runs as `SECURITY DEFINER` and reads `auth.uid()` directly. |
| Self-voting | `cast_vote` checks `report_private.driver_id <> auth.uid()` and returns an error if equal. |
| Fake far-away reports | Suspicious flag set server-side by trigger; community voting can then reject. |
| Anonymous abuse | 30-minute expiry limits damage window; rejection rules suppress noise quickly. |
| XSS | React's default escaping; no `dangerouslySetInnerHTML` usage. |

---

## 11. Folder Structure (target)

```
SafeRoad/
├── public/
│   ├── manifest.json
│   ├── icons/
│   │   ├── icon-192.png
│   │   └── icon-512.png
│   └── audio/
│       ├── security.mp3
│       ├── blocked.mp3
│       ├── accident.mp3
│       └── safe.mp3
├── src/
│   ├── main.jsx
│   ├── App.jsx
│   ├── constants/
│   │   ├── route.js            ← waypoint coordinates + ROUTE_POLYLINE
│   │   └── demoReports.js      ← hardcoded demo report data
│   ├── components/
│   │   ├── map/
│   │   │   ├── LeafletMap.jsx
│   │   │   ├── RoutePolyline.jsx
│   │   │   ├── ReportMarker.jsx
│   │   │   └── UserLocationMarker.jsx
│   │   ├── reports/
│   │   │   ├── ReportPanel.jsx
│   │   │   ├── ReportBottomSheet.jsx
│   │   │   └── ReportTypeButton.jsx
│   │   ├── voting/
│   │   │   └── VoteButtons.jsx
│   │   ├── demo/
│   │   │   ├── DemoModeOverlay.jsx
│   │   │   └── AlertToast.jsx
│   │   ├── ui/
│   │   │   ├── StatusBadge.jsx
│   │   │   └── BottomNav.jsx
│   │   └── auth/
│   │       └── LoginForm.jsx
│   ├── hooks/
│   │   ├── useReports.js       ← fetch + realtime + expiry timers
│   │   ├── useLocation.js      ← Geolocation API; overridden in demo mode
│   │   ├── useSession.js       ← Supabase anon auth + display name
│   │   └── useDemoMode.js      ← simulation loop + location override
│   ├── lib/
│   │   ├── supabase.js         ← createClient
│   │   ├── audio.js            ← playAlert (mp3 primary, speechSynthesis fallback)
│   │   └── geo.js              ← client-side haversineKm helper
│   └── styles/
│       └── index.css
├── supabase/
│   └── migrations/
│       └── 001_initial.sql     ← all tables, functions, triggers, RLS
├── requirements.md
├── design.md
├── tasks.md
├── index.html
├── vite.config.js
├── tailwind.config.js
└── package.json
```
