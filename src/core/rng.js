/* Generatore deterministico.
   Stessa data, stessa sfida, ovunque nel mondo, senza chiamate di rete. */

export function fnv1a(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* La data di riferimento è UTC: la sfida è la stessa per tutti.
   Il conto alla rovescia mostrato all'utente resta invece locale. */
export function utcDayKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

export function seedFor(namespace, dayKey = utcDayKey()) {
  return fnv1a(`novanta|${namespace}|${dayKey}`);
}

export function rngFor(namespace, dayKey = utcDayKey()) {
  return mulberry32(seedFor(namespace, dayKey));
}

export function pick(rand, arr) {
  return arr[Math.floor(rand() * arr.length)];
}

export function intBetween(rand, min, max) {
  return min + Math.floor(rand() * (max - min + 1));
}

export function shuffled(rand, arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* quanto manca alla prossima sfida, nel fuso dell'utente */
export function msToNextDay() {
  const now = new Date();
  const next = new Date(now);
  next.setUTCHours(24, 0, 0, 0);
  return next - now;
}
