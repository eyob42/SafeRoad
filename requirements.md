# SafeRoad — Requirements

## 1. Overview

SafeRoad is a mobile-first Progressive Web App (PWA) for drivers travelling the Addis Ababa → Ambo corridor. It lets drivers anonymously report and verify road conditions in real time, and provides audio alerts when approaching a hazard.

**Route waypoints (in order)**
1. Addis Ababa (8.9806° N, 38.7578° E)
2. Holeta (9.0500° N, 38.5100° E)
3. Addis Alem (9.0333° N, 38.3833° E)
4. Ginchi (9.0167° N, 38.1333° E)
5. Ambo (8.9833° N, 37.8500° E)

---

## 2. Users & Access

| Requirement | Detail |
|---|---|
| REQ-U1 | The only user role is **driver**. No admin UI is in scope. |
| REQ-U2 | Login requires only a **display name or phone number**. No password, no OTP, no email. |
| REQ-U3 | The Supabase **anonymous sign-in** (`signInAnonymously`) is called on first visit; `auth.uid()` is used as the driver's permanent identity. The session is persisted by `supabase-js` and survives page reloads. |
| REQ-U4 | The display name entered at login is stored in `drivers.display_name` and is **never revealed** to other drivers. |
| REQ-U5 | No driver's precise location is ever displayed to other users. |

---

## 3. Map

| Requirement | Detail |
|---|---|
| REQ-M1 | The map uses **Leaflet** with **OpenStreetMap** tiles (no proprietary map API key required). |
| REQ-M2 | The map is centered on the Addis Ababa–Ambo route and shows a polyline connecting the five waypoints. |
| REQ-M3 | Active, non-expired, non-rejected reports appear as icons on the map at their reported coordinates. |
| REQ-M4 | Tapping a report icon opens a bottom sheet with the report type, verification status, time ago, and vote buttons. |
| REQ-M5 | The user's own device location is shown (blue dot) when location permission is granted. Other drivers' locations are never shown. |
| REQ-M6 | The map must render correctly on screens ≥ 320 px wide. |

---

## 4. Reporting

| Requirement | Detail |
|---|---|
| REQ-R1 | A driver can submit one of four report types with a single tap: **Security Threat** (ደህንነት ስጋት), **Road Blocked** (መንገድ ታግዷል), **Traffic Accident** (የትራፊክ አደጋ), **Road is Safe** (መንገዱ ደህና ነው). |
| REQ-R2 | A report captures: type, `auth.uid()` as reporter identity, the pin coordinates (`lat`, `lng`), the reporter's GPS coordinates, timestamp, and expiry time (timestamp + 30 min). `expires_at` is always computed on the server inside `submit_report`; the client never sends it. |
| REQ-R3 | Reports expire 30 minutes after creation. The client removes them from the map using a local countdown timer; it does not rely solely on a server-side filter. |
| REQ-R4 | The reporter's GPS coordinates and `driver_id` are stored in a separate table (`report_private`) and are **never readable by any client**. |
| REQ-R5 | Submitting a report requires location permission to be granted; if denied, the app shows a prompt: "ሪፖርት ለማቅረብ የቦታ ፈቃድ ያስፈልጋል።" |

---

## 5. Verification

| Requirement | Detail |
|---|---|
| REQ-V1 | Any driver can cast a **Yes** or **No** vote on any report they did not create. |
| REQ-V2 | Each user may cast **at most one vote** per report. Tapping the same button a second time does nothing; tapping the opposite button switches the vote. |
| REQ-V3 | A report is marked **Suspicious** when the reporter's GPS coordinates at submission time are more than **10 km** from the report's pin location. This check is performed by a server-side Postgres trigger using a pure pl/pgsql haversine function (no PostGIS extension). |
| REQ-V2a | Self-voting is blocked inside the `cast_vote` SQL function by checking `report_private.driver_id = auth.uid()`. Hiding buttons in the UI is a convenience only; the database enforces the rule. |
| REQ-V4 | A report is marked **Confirmed** when `yes_count ≥ 2`. |
| REQ-V5 | A report is marked **Rejected** when `no_count − yes_count ≥ 2`. |
| REQ-V6 | Verification status is recomputed on every vote by a SQL function (`cast_vote`) called via `supabase.rpc`. |
| REQ-V7 | Rejected reports are hidden from the map. |

---

## 6. Real-time Updates

| Requirement | Detail |
|---|---|
| REQ-RT1 | The map updates within ≤ 3 seconds when another driver submits a report or casts a vote, without a page refresh. |
| REQ-RT2 | Real-time delivery is handled via **Supabase Realtime** subscribed to the `reports` table directly (not a view). |
| REQ-RT3 | If the WebSocket connection drops, the app attempts automatic reconnection. |

---

## 7. Demo Mode

| Requirement | Detail |
|---|---|
| REQ-D1 | A **Demo Mode** button is available on the main screen without requiring login. |
| REQ-D2 | Demo mode simulates a driver moving from Addis Ababa toward Ambo at a fixed speed (default: 1 km every 2 seconds of wall-clock time). |
| REQ-D3 | A set of hardcoded demo reports is seeded at fixed coordinates along the route and shown alongside any real reports from the database. |
| REQ-D4 | While demo mode is active, `useLocation` returns the **simulated position** rather than the device's GPS. This means the simulated driver's position is used for all distance checks, map display, and report submission. |
| REQ-D5 | Demo mode **may write real reports** to the database using the simulated position as the reporter's location. |
| REQ-D6 | Audio alerts fire when the simulated driver comes within **2 km** of any report that is **not suspicious and not rejected** — this includes both the hardcoded demo reports and real database reports. Alerts do not fire only for confirmed reports. |
| REQ-D7 | Audio alerts use **pre-recorded Amharic MP3 files** in `public/audio/` as the primary source (one file per report type). `speechSynthesis` with `lang = 'am-ET'` is the fallback if the audio file cannot be played. |
| REQ-D8 | Audio is unlocked (context resumed) on the **Start Demo tap** to satisfy browser autoplay policies. |
| REQ-D9 | A visible **Stop Demo** button ends the simulation and restores `useLocation` to real GPS. |

---

## 8. Settings

| Requirement | Detail |
|---|---|
| REQ-S1 | The Settings screen shows the driver's display name (read-only) and a logout button. |
| REQ-S2 | The Settings screen contains a **"Test: Far-Away Report"** button that inserts a report whose pin coordinates are fixed at a point on the route near Ginchi (9.0167° N, 38.1333° E). The reporter location is the driver's real current GPS position. Because the driver is almost certainly not physically at Ginchi, the server computes a distance > 10 km and sets `status = 'suspicious'`. |

---

## 9. UI & Internationalisation

| Requirement | Detail |
|---|---|
| REQ-I1 | All UI text is in **Amharic** (Ethiopic script). |
| REQ-I2 | The app is mobile-first; layout is optimised for portrait phones (360–414 px wide). Tablet and desktop views stretch gracefully. |
| REQ-I3 | Report type icons are distinguishable by both colour and shape. |
| REQ-I4 | A bottom navigation bar provides access to: Map, Report, and Settings. |

---

## 10. PWA Requirements

| Requirement | Detail |
|---|---|
| REQ-P1 | The app includes a valid **Web App Manifest** (`manifest.json`) so it can be installed to the home screen on Android Chrome and iOS Safari. |
| REQ-P2 | No service worker or offline caching is in scope. |

---

## 11. Non-functional Requirements

| Requirement | Detail |
|---|---|
| REQ-NF1 | **Stack**: React 18 + Vite, Tailwind CSS v3, Supabase (Postgres 15 + Realtime + Auth). |
| REQ-NF2 | No server-side rendering; the app is a pure SPA served from a static host (e.g. Vercel, Netlify). |
| REQ-NF3 | Supabase Row-Level Security (RLS) policies ensure clients cannot read `report_private` or any other driver's sensitive data. The SELECT policy on `reports` grants access to both the `anon` and `authenticated` roles so that Supabase Realtime (which runs under the `authenticated` role for anonymous sign-in users) delivers change events to the client. |
| REQ-NF4 | The `cast_vote` and `submit_report` SQL functions are defined with `SECURITY DEFINER` and `SET search_path = public` to prevent search-path injection attacks. `submit_report` validates: `type` is one of the four allowed values; `lat` is in `[−90, 90]`; `lng` is in `[−180, 180]`. `expires_at` is set inside the function (`now() + interval '30 minutes'`) and is never accepted from the client. |
| REQ-NF5 | No PostGIS extension is required. The suspicious-distance check uses a pl/pgsql haversine implementation. |
