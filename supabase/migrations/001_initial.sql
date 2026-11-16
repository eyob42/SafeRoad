-- =============================================================
-- SafeRoad — initial migration
-- Apply via: Supabase SQL editor or `supabase db push`
-- =============================================================

-- ─────────────────────────────────────────
-- 1. TABLES
-- ─────────────────────────────────────────

-- drivers: one row per anonymous auth user
CREATE TABLE IF NOT EXISTS public.drivers (
  id           uuid        PRIMARY KEY,          -- must equal auth.uid()
  display_name text        NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- reports: public columns only — safe to broadcast via Realtime
CREATE TABLE IF NOT EXISTS public.reports (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  type       text        NOT NULL
               CHECK (type IN ('security','blocked','accident','safe')),
  lat        float8      NOT NULL,
  lng        float8      NOT NULL,
  status     text        NOT NULL DEFAULT 'pending'
               CHECK (status IN ('pending','suspicious','confirmed','rejected')),
  yes_count  int         NOT NULL DEFAULT 0,
  no_count   int         NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT now() + interval '30 minutes'
);

-- report_private: sensitive columns — no client SELECT ever
CREATE TABLE IF NOT EXISTS public.report_private (
  report_id    uuid    PRIMARY KEY
                 REFERENCES public.reports(id) ON DELETE CASCADE,
  driver_id    uuid    NOT NULL,          -- auth.uid() of reporter
  reporter_lat float8  NOT NULL,
  reporter_lng float8  NOT NULL
);

-- votes: one row per (report, driver) pair
CREATE TABLE IF NOT EXISTS public.votes (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id  uuid        NOT NULL
               REFERENCES public.reports(id) ON DELETE CASCADE,
  driver_id  uuid        NOT NULL,        -- auth.uid() of voter
  value      boolean     NOT NULL,        -- true = yes, false = no
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (report_id, driver_id)
);

-- ─────────────────────────────────────────
-- 2. HELPER: haversine_km
--    Pure pl/pgsql — no PostGIS needed.
-- ─────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.haversine_km(
  lat1 float8, lng1 float8,
  lat2 float8, lng2 float8
)
RETURNS float8
LANGUAGE plpgsql
IMMUTABLE STRICT
SET search_path = public
AS $$
DECLARE
  r     float8 := 6371;
  d_lat float8 := radians(lat2 - lat1);
  d_lng float8 := radians(lng2 - lng1);
  a     float8;
BEGIN
  a := sin(d_lat / 2) ^ 2
     + cos(radians(lat1)) * cos(radians(lat2)) * sin(d_lng / 2) ^ 2;
  RETURN r * 2 * asin(sqrt(a));
END;
$$;

-- ─────────────────────────────────────────
-- 3. submit_report  (SECURITY DEFINER)
--    Validates inputs, inserts report + private row,
--    sets expires_at on the server, checks distance.
-- ─────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.submit_report(
  p_type         text,
  p_lat          float8,
  p_lng          float8,
  p_reporter_lat float8,
  p_reporter_lng float8
)
RETURNS public.reports
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid    uuid := auth.uid();
  v_report public.reports;
  v_dist   float8;
BEGIN
  -- 1. Must be authenticated
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  -- 2. Validate type
  IF p_type NOT IN ('security','blocked','accident','safe') THEN
    RAISE EXCEPTION 'invalid report type: %', p_type;
  END IF;

  -- 3. Validate coordinate ranges
  IF p_lat < -90 OR p_lat > 90 THEN
    RAISE EXCEPTION 'lat out of range: %', p_lat;
  END IF;
  IF p_lng < -180 OR p_lng > 180 THEN
    RAISE EXCEPTION 'lng out of range: %', p_lng;
  END IF;

  -- 4. Insert public report row (expires_at set here, never from client)
  INSERT INTO public.reports (type, lat, lng, expires_at)
  VALUES (p_type, p_lat, p_lng, now() + interval '30 minutes')
  RETURNING * INTO v_report;

  -- 5. Check distance and flag suspicious if > 10 km
  v_dist := public.haversine_km(p_reporter_lat, p_reporter_lng, p_lat, p_lng);
  IF v_dist > 10 THEN
    UPDATE public.reports
    SET status = 'suspicious'
    WHERE id = v_report.id
    RETURNING * INTO v_report;
  END IF;

  -- 6. Insert private row
  INSERT INTO public.report_private (report_id, driver_id, reporter_lat, reporter_lng)
  VALUES (v_report.id, v_uid, p_reporter_lat, p_reporter_lng);

  RETURN v_report;
END;
$$;

-- ─────────────────────────────────────────
-- 4. cast_vote  (SECURITY DEFINER)
--    Upserts a vote, blocks self-voting at DB level,
--    recomputes yes_count / no_count / status.
-- ─────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.cast_vote(
  p_report_id uuid,
  p_value     boolean
)
RETURNS public.reports
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid       uuid := auth.uid();
  v_report    public.reports;
  v_reporter  uuid;
  v_yes       int;
  v_no        int;
  v_new_status text;
BEGIN
  -- 1. Must be authenticated
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  -- 2. Load report; verify it exists, is not expired, and is not rejected
  SELECT * INTO v_report
  FROM public.reports
  WHERE id = p_report_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'report not found';
  END IF;
  IF v_report.expires_at <= now() THEN
    RAISE EXCEPTION 'report has expired';
  END IF;
  IF v_report.status = 'rejected' THEN
    RAISE EXCEPTION 'report is already rejected';
  END IF;

  -- 3. Block self-voting (authoritative DB-level check)
  SELECT driver_id INTO v_reporter
  FROM public.report_private
  WHERE report_id = p_report_id;

  IF v_reporter = v_uid THEN
    RAISE EXCEPTION 'cannot vote on own report';
  END IF;

  -- 4. Upsert vote (insert or update if voter switches yes↔no)
  INSERT INTO public.votes (report_id, driver_id, value)
  VALUES (p_report_id, v_uid, p_value)
  ON CONFLICT (report_id, driver_id)
  DO UPDATE SET value = EXCLUDED.value;

  -- 5. Recompute counts
  SELECT
    COUNT(*) FILTER (WHERE value = true),
    COUNT(*) FILTER (WHERE value = false)
  INTO v_yes, v_no
  FROM public.votes
  WHERE report_id = p_report_id;

  -- 6. Determine new status (never demote from suspicious back to pending)
  IF v_yes >= 2 THEN
    v_new_status := 'confirmed';
  ELSIF (v_no - v_yes) >= 2 THEN
    v_new_status := 'rejected';
  ELSE
    -- keep existing status (preserves 'suspicious' or 'pending')
    v_new_status := v_report.status;
  END IF;

  -- 7. Update report
  UPDATE public.reports
  SET yes_count = v_yes,
      no_count  = v_no,
      status    = v_new_status
  WHERE id = p_report_id
  RETURNING * INTO v_report;

  RETURN v_report;
END;
$$;

-- ─────────────────────────────────────────
-- 5. ROW-LEVEL SECURITY
-- ─────────────────────────────────────────

ALTER TABLE public.drivers        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_private ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.votes          ENABLE ROW LEVEL SECURITY;

-- drivers
CREATE POLICY "drivers_insert_own" ON public.drivers
  FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

CREATE POLICY "drivers_select_own" ON public.drivers
  FOR SELECT TO authenticated
  USING (id = auth.uid());

-- reports: SELECT must allow BOTH anon and authenticated roles.
-- Anonymous sign-in users get the 'authenticated' role in Supabase.
-- Realtime evaluates RLS using this role; omitting either role
-- causes change events to be silently dropped.
CREATE POLICY "reports_select_anon" ON public.reports
  FOR SELECT TO anon
  USING (true);

CREATE POLICY "reports_select_authenticated" ON public.reports
  FOR SELECT TO authenticated
  USING (true);

-- report_private: no client access at all
-- (No SELECT / INSERT / UPDATE / DELETE policies = all denied)

-- votes: each driver can read only their own votes
CREATE POLICY "votes_select_own" ON public.votes
  FOR SELECT TO authenticated
  USING (driver_id = auth.uid());

-- ─────────────────────────────────────────
-- 6. REALTIME
--    Enable publication on reports table.
--    Run in Supabase dashboard if ALTER PUBLICATION
--    is not available in migration context.
-- ─────────────────────────────────────────

-- Add reports to the supabase_realtime publication.
-- This may require superuser in some Supabase tiers;
-- if it fails, enable Realtime in the dashboard instead.
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.reports;
EXCEPTION
  WHEN others THEN
    RAISE NOTICE 'Could not add reports to supabase_realtime publication: %. Enable Realtime in the Supabase dashboard manually.', SQLERRM;
END;
$$;
