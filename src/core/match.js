/* Riconoscimento indulgente dei nomi.
   Regola guida: chi sa la risposta non deve MAI perdere un punto
   per un accento, una maiuscola o un carattere sbagliato.
   È il punto in cui questi giochi falliscono più spesso. */

const EXTRA = {
  '\u00f8': 'o', '\u0111': 'd', '\u00f0': 'd', '\u0142': 'l',
  '\u00df': 'ss', '\u00e6': 'ae',
  '\u0153': 'oe', '\u00fe': 'th', '\u0131': 'i',
};

export function normalize(s) {
  if (!s) return '';
  let out = String(s).toLowerCase();
  out = out.replace(/[\u00f8\u0111\u00f0\u0142\u00df\u00e6\u0153\u00fe\u0131]/g, (c) => EXTRA[c] ?? c);
  out = out.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  out = out.replace(/[\u2018\u2019'`\u00b4]/g, ' ');
  out = out.replace(/[^a-z0-9]+/g, ' ');
  return out.trim().replace(/\s+/g, ' ');
}

/* particelle che appartengono al cognome e non vanno perse */
const PARTICLES = new Set([
  'van', 'von', 'der', 'den', 'de', 'del', 'della', 'di', 'da', 'dal',
  'dos', 'das', 'do', 'la', 'le', 'el', 'al', 'bin', 'ibn', 'mc', 'mac',
  'st', 'ten', 'ter', 'op',
]);

export function surnameOf(fullName) {
  const t = normalize(fullName).split(' ').filter(Boolean);
  if (t.length <= 1) return t.join(' ');
  let start = t.length - 1;
  while (start > 1 && PARTICLES.has(t[start - 1])) start--;
  return t.slice(start).join(' ');
}

/* distanza di edit limitata: si ferma appena supera il massimo consentito */
export function editDistance(a, b, max) {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const prev = new Array(b.length + 1);
  const cur = new Array(b.length + 1);
  for (let j = 0; j <= b.length; j++) prev[j] = j;
  for (let i = 1; i <= a.length; i++) {
    cur[0] = i;
    let best = cur[0];
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
      if (cur[j] < best) best = cur[j];
    }
    if (best > max) return max + 1;
    for (let j = 0; j <= b.length; j++) prev[j] = cur[j];
  }
  return prev[b.length];
}

/* più il nome è lungo, più errori possiamo perdonare senza creare ambiguità */
function tolerance(len) {
  if (len <= 4) return 0;
  if (len <= 9) return 1;
  return 2;
}

/* Le iniziali devono restare le stesse: chi sbaglia a scrivere sbaglia in mezzo
   alla parola, non all'inizio. È questa regola a impedire che "Ederson"
   diventi "Henderson" o che "David Silva" diventi "David Villa". */
function initialsMatch(a, b) {
  if (a[0] !== b[0]) return false;
  const ta = a.split(' ');
  const tb = b.split(' ');
  if (ta.length > 1 && ta.length === tb.length) {
    return ta.every((x, i) => x[0] === tb[i][0]);
  }
  return true;
}

/**
 * Costruisce l'indice di una rosa.
 * players: array di stringhe ("Gianluigi Buffon")
 * aliases: { "Gianluigi Buffon": ["gigi buffon", "gigione"] }
 */
export function buildIndex(players, aliases = {}) {
  const entries = players.map((name, id) => {
    const full = normalize(name);
    const surname = surnameOf(name);
    const lastToken = full.split(' ').slice(-1)[0];
    const keys = new Set([full, surname, lastToken].filter((k) => k.length >= 3));
    for (const a of aliases[name] || []) {
      const n = normalize(a);
      if (n.length >= 3) keys.add(n);
    }
    return { id, name, full, surname, keys: [...keys] };
  });

  const exact = new Map();
  for (const e of entries) {
    for (const k of e.keys) {
      if (!exact.has(k)) exact.set(k, []);
      exact.get(k).push(e.id);
    }
  }
  return { entries, exact };
}

/**
 * Confronta un tentativo con l'indice.
 * found: Set degli id già trovati.
 * → { status: 'hit' | 'duplicate' | 'miss', entry }
 */
export function matchGuess(index, raw, found) {
  const guess = normalize(raw);
  if (guess.length < 2) return { status: 'miss', entry: null };

  const resolve = (ids) => {
    const fresh = ids.find((id) => !found.has(id));
    if (fresh !== undefined) return { status: 'hit', entry: index.entries[fresh] };
    return { status: 'duplicate', entry: index.entries[ids[0]] };
  };

  if (index.exact.has(guess)) return resolve(index.exact.get(guess));

  // nome e cognome invertiti: "buffon gianluigi"
  const parts = guess.split(' ');
  if (parts.length > 1) {
    const flipped = parts.slice().reverse().join(' ');
    if (index.exact.has(flipped)) return resolve(index.exact.get(flipped));
  }

  // tolleranza sugli errori di battitura, ma solo se il candidato è unico:
  // meglio rifiutare che assegnare il giocatore sbagliato
  let best = null;
  let tie = false;
  for (const e of index.entries) {
    for (const k of e.keys) {
      const max = tolerance(k.length);
      if (max === 0 || !initialsMatch(guess, k)) continue;
      // sostituzione pura (stessa lunghezza) solo sui nomi lunghi: è così che
      // "Emerson" resta Emerson e non diventa Ederson, mentre "Tiago" può
      // ancora arrivare a Thiago, che è una lettera in meno e basta
      if (guess.length === k.length && k.length < 10) continue;
      const d = editDistance(guess, k, max);
      if (d > max) continue;
      if (!best || d < best.d) { best = { d, id: e.id }; tie = false; }
      else if (d === best.d && e.id !== best.id) tie = true;
    }
  }
  if (best && !tie) return resolve([best.id]);

  return { status: 'miss', entry: null };
}

/**
 * C'è un ALTRO giocatore ancora da trovare la cui chiave comincia con quanto
 * scritto, ma è più lunga? Serve per non accettare "Ronaldo" mentre si sta
 * scrivendo "Ronaldinho". Le chiavi più lunghe dello stesso giocatore non
 * bloccano nulla: "lewa" è già Lewandowski, non serve aspettare il resto.
 */
export function hasLongerCandidate(index, raw, found, exceptId) {
  const guess = normalize(raw);
  if (!guess) return false;
  return index.entries.some((e) =>
    e.id !== exceptId
    && !found.has(e.id)
    && e.keys.some((k) => k.length > guess.length && k.startsWith(guess)));
}

/** solo corrispondenza esatta: è quella che autorizza l'accettazione automatica */
export function matchExact(index, raw, found) {
  const guess = normalize(raw);
  if (guess.length < 3 || !index.exact.has(guess)) return null;
  const ids = index.exact.get(guess);
  const fresh = ids.find((id) => !found.has(id));
  return fresh === undefined ? null : index.entries[fresh];
}

/** iniziali per il suggerimento: "K. K." */
export function initialsOf(name) {
  return normalize(name).split(' ')
    .map((w) => w[0].toUpperCase())
    .join('. ') + '.';
}
