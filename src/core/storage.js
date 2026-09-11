/* Persistenza locale con versione dello schema.
   Il numero di versione serve a migrare senza perdere i record
   il giorno in cui arriverà un backend. */

const KEY = 'novanta:v1';
const SCHEMA = 1;

const DEFAULTS = {
  schema: SCHEMA,
  lang: null,            // null = deduci dal browser al primo avvio
  sound: true,
  coins: 0,
  squad: { best: 0, played: 0, bestTeam: null, queue: [], lastTeam: null },
  arcade: { best: 0, played: 0, totalGoals: 0 },
  daily: { lastDay: null, lastScore: 0, streak: 0, freezeUsed: null, results: {} },
  asta: { wins: 0, played: 0 },
  duel: { best: 0, played: 0, total: 0 },
  career: null,
  seen: { intro: false },
};

function clone(o) { return JSON.parse(JSON.stringify(o)); }

function merge(base, patch) {
  const out = clone(base);
  for (const k of Object.keys(patch || {})) {
    const v = patch[k];
    out[k] = (v && typeof v === 'object' && !Array.isArray(v))
      ? merge(base[k] || {}, v)
      : v;
  }
  return out;
}

let cache = null;

export function load() {
  if (cache) return cache;
  let raw = null;
  try { raw = localStorage.getItem(KEY); } catch { /* modalità privata */ }
  let parsed = {};
  if (raw) {
    try { parsed = JSON.parse(raw); } catch { parsed = {}; }
  }
  cache = merge(DEFAULTS, parsed);
  cache.schema = SCHEMA;
  return cache;
}

export function save(patch) {
  cache = merge(load(), patch);
  try { localStorage.setItem(KEY, JSON.stringify(cache)); } catch { /* ignora */ }
  return cache;
}

export function get(path) {
  return path.split('.').reduce((o, k) => (o == null ? o : o[k]), load());
}

export function wipe() {
  cache = null;
  try { localStorage.removeItem(KEY); } catch { /* ignora */ }
}
