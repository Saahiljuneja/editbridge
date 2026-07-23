// Node.js runtime only — module-level variable persists between requests in the same process

type MaintenanceState = {
  manualOn: boolean;
  windowStart: string; // "HH:MM" 24-hour, or ""
  windowEnd: string;   // "HH:MM" 24-hour, or ""
  ts: number;
};

let _cache: MaintenanceState | null = null;
const TTL = 30_000; // 30 seconds — re-read DB at most every 30s

export function readMaintenanceCache(): Omit<MaintenanceState, "ts"> | null {
  if (_cache && Date.now() - _cache.ts < TTL) {
    const { ts: _ts, ...rest } = _cache;
    return rest;
  }
  return null;
}

export function writeMaintenanceCache(state: Omit<MaintenanceState, "ts">) {
  _cache = { ...state, ts: Date.now() };
}

export function bustMaintenanceCache() {
  _cache = null;
}

// Returns true if current IST time is within the scheduled window
export function isWithinMaintenanceWindow(start: string, end: string): boolean {
  if (!start || !end) return false;

  // Current time in IST (UTC+5:30)
  const now = new Date();
  const istMs = now.getTime() + 5.5 * 60 * 60 * 1000;
  const ist = new Date(istMs);
  const currentMinutes = ist.getUTCHours() * 60 + ist.getUTCMinutes();

  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  const startMin = sh * 60 + sm;
  const endMin = eh * 60 + em;

  if (startMin <= endMin) {
    // Same-day window e.g. 15:00–17:00
    return currentMinutes >= startMin && currentMinutes < endMin;
  } else {
    // Crosses midnight e.g. 23:00–02:00
    return currentMinutes >= startMin || currentMinutes < endMin;
  }
}
