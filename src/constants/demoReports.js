const FAR_FUTURE = new Date(Date.now() + 30 * 60 * 1000).toISOString()
const NOW        = new Date().toISOString()

/** Hardcoded demo reports — never written to the DB. */
export const DEMO_REPORTS = [
  {
    id:         'demo-1',
    type:       'accident',
    lat:        9.0450,
    lng:        38.5050,
    status:     'confirmed',
    yes_count:  3,
    no_count:   0,
    created_at: NOW,
    expires_at: FAR_FUTURE,
  },
  {
    id:         'demo-2',
    type:       'blocked',
    lat:        9.0280,
    lng:        38.3700,
    status:     'confirmed',
    yes_count:  2,
    no_count:   0,
    created_at: NOW,
    expires_at: FAR_FUTURE,
  },
  {
    id:         'demo-3',
    type:       'security',
    lat:        9.0200,
    lng:        38.1200,
    status:     'confirmed',
    yes_count:  2,
    no_count:   1,
    created_at: NOW,
    expires_at: FAR_FUTURE,
  },
  {
    id:         'demo-4',
    type:       'safe',
    lat:        8.9900,
    lng:        37.8800,
    status:     'confirmed',
    yes_count:  4,
    no_count:   0,
    created_at: NOW,
    expires_at: FAR_FUTURE,
  },
]
