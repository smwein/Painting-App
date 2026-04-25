const STORAGE_KEY = 'coatcalc_attribution';

export interface Attribution {
  source: string | null;
  medium: string | null;
  campaign: string | null;
  referrer: string | null;
}

const EMPTY: Attribution = { source: null, medium: null, campaign: null, referrer: null };

function readStored(): Attribution {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw);
    return {
      source: parsed.source ?? null,
      medium: parsed.medium ?? null,
      campaign: parsed.campaign ?? null,
      referrer: parsed.referrer ?? null,
    };
  } catch {
    return EMPTY;
  }
}

// First-touch attribution: only writes if we don't already have a stored source.
// Run on every public-route mount; cheap and idempotent.
export function captureAttribution(): void {
  if (typeof window === 'undefined') return;

  const existing = readStored();
  if (existing.source) return;

  const params = new URLSearchParams(window.location.search);
  const source = params.get('utm_source');
  const medium = params.get('utm_medium');
  const campaign = params.get('utm_campaign');

  const docReferrer = document.referrer || '';
  const referrer = docReferrer && !docReferrer.includes(window.location.host) ? docReferrer : null;

  if (!source && !medium && !campaign && !referrer) return;

  const next: Attribution = { source, medium, campaign, referrer };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // localStorage unavailable (private mode, etc.) — silently skip.
  }
}

export function getAttribution(): Attribution {
  if (typeof window === 'undefined') return EMPTY;
  return readStored();
}
