/* La Rosa: il catalogo largo deve essere giocabile tutto, non solo le rose
   scritte a mano. Ogni rosa esiste, ha una lunghezza sensata, nessun nome
   ripetuto, e ogni giocatore si può trovare scrivendo il cognome o il nome. */

import { readFileSync } from 'node:fs';
import { buildIndex, matchGuess } from '../src/core/match.js';

const read = (p) => JSON.parse(readFileSync(new URL(`../${p}`, import.meta.url), 'utf8'));
let pass = 0, fail = 0;
const check = (d, ok, extra = '') => { ok ? pass++ : (fail++, console.log(`  FALLITO  ${d} ${extra}`)); };

const index = read('data/rosa/index.json');
const shards = new Map();
const body = (i) => {
  const k = Math.floor(i / index.shard);
  if (!shards.has(k)) shards.set(k, read(`data/rosa/s-${k}.json`));
  return shards.get(k)[index.squads[i][0]];
};

console.log('— il catalogo —');
const ids = new Set(index.squads.map((r) => r[0]));
check('almeno 1500 rose', index.squads.length >= 1500, `(${index.squads.length})`);
check('identificativi unici', ids.size === index.squads.length);
const kinds = index.squads.reduce((m, r) => { m[r[1]] = (m[r[1]] || 0) + 1; return m; }, {});
check('club e nazionali', kinds.club >= 800 && kinds.nation >= 500, JSON.stringify(kinds));
const clubs = new Map();
index.squads.filter((r) => r[1] === 'club').forEach((r) => clubs.set(r[2], (clubs.get(r[2]) || 0) + 1));
check('gli stessi club in più stagioni', [...clubs.values()].filter((n) => n >= 10).length >= 30, `(${[...clubs.values()].filter((n) => n >= 10).length})`);

console.log('— ogni rosa è giocabile —');
let missing = 0, badSize = 0, dup = 0, unfindable = 0, colorless = 0, total = 0;
index.squads.forEach((r, i) => {
  const b = body(i);
  if (!b) { missing++; return; }
  if (b.players.length !== r[7] || b.players.length < 18 || b.players.length > 30) badSize++;
  if (new Set(b.players).size !== b.players.length) dup++;
  if (!Array.isArray(r[6]) || !/^#[0-9A-F]{6}$/i.test(r[6][0])) colorless++;
  const idx = buildIndex(b.players, b.aliases);
  b.players.forEach((name) => {
    total++;
    const r2 = matchGuess(idx, name, new Set());
    if (r2.status !== 'hit') unfindable++;
  });
});
check('ogni rosa ha il suo pezzo', missing === 0, `(${missing})`);
check('da 18 a 30 giocatori', badSize === 0, `(${badSize})`);
check('nessun nome ripetuto in una rosa', dup === 0, `(${dup})`);
check('colori validi', colorless === 0, `(${colorless})`);
check('ogni giocatore si trova scrivendo il nome intero', unfindable / total < 0.002, `(${unfindable}/${total})`);

console.log(`\n${pass} passati, ${fail} falliti`);
process.exit(fail ? 1 : 0);
