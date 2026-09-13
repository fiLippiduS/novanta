/* Più o Meno: ai 111 giocatori con i numeri di tutte le competizioni
   (scritti a mano, tools/wiki/duel-manual.json) si aggiungono i giocatori
   più noti del catalogo Wikipedia, con i numeri che l'infobox riporta.

   I parametri presi da Wikipedia hanno chiavi proprie (presenze e gol in
   campionato non sono presenze e gol in carriera): non si confrontano mai
   numeri di natura diversa.

   node tools/wiki/duel.mjs */

import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from './lib.mjs';

const MIN_FAME = 48;
const RESERVE = /(\s(B|C|II|U-?\d\d)|Reserves|Youth|Castilla|Atlètic|Primavera|Juvenil|Academy)$/i;
const THIS_YEAR = 2026;

const manual = JSON.parse(readFileSync(join(ROOT, 'tools/wiki/duel-manual.json'), 'utf8')).players;
const index = JSON.parse(readFileSync(join(ROOT, 'data/players/index.json'), 'utf8'));
const clubs = index.clubs.map((c) => c[0]);
const norm = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s*\(.*\)/, '').replace(/[^a-z ]/g, ' ').replace(/\s+/g, ' ').trim();

const shards = new Map();
function career(id) {
  const k = Math.floor(id / 400);
  if (!shards.has(k)) shards.set(k, JSON.parse(readFileSync(join(ROOT, `data/players/careers-${k}.json`), 'utf8')));
  return shards.get(k)[id];
}

/** i numeri che l'infobox e il palmarès permettono di dire con sicurezza */
function wikiStats(p, c) {
  const [, , , , role, , , complete] = p;
  const out = {};
  const senior = c.c;
  /* -1 nei dati vuol dire "non riportato": un totale con un buco non è un totale */
  const known = (rows, i) => rows.every((r) => r[i] >= 0);
  const apps = senior.reduce((n, r) => n + (r[4] || 0), 0);
  const goals = senior.reduce((n, r) => n + (r[5] || 0), 0);
  if (complete && known(senior, 4) && apps >= 30) out.lp = apps;
  if (complete && known(senior, 5) && role !== 'POR' && apps >= 30) out.lgl = goals;
  const national = c.n.filter((r) => !r[3]);
  const caps = national.reduce((n, r) => n + (r[4] || 0), 0);
  if (caps > 0 && known(national, 4)) {
    out.c = caps;
    if (role !== 'POR' && known(national, 5)) out.ng = national.reduce((n, r) => n + (r[5] || 0), 0);
  }
  if (c.h && c.h >= 155 && c.h <= 210) out.h = c.h;
  /* le squadre riserve (Barcelona B, Real Madrid Castilla) non sono un altro club */
  const clubSet = new Set(senior.filter((r) => !RESERVE.test(clubs[r[2]] || '')).map((r) => r[2]));
  if (clubSet.size) out.cl = clubSet.size;
  const loans = senior.filter((r) => r[3]).length;
  if (senior.length >= 3) out.lo = loans;
  const first = Math.min(...senior.map((r) => r[0]).filter(Boolean));
  const last = Math.max(...senior.map((r) => r[1] || THIS_YEAR));
  if (Number.isFinite(first) && last >= first) out.yrs = last - first;
  const won = c.hon.filter((h) => h[5] === 'w');
  const clubWins = won.filter((h) => h[0] === 'c').length;
  const natWins = won.filter((h) => h[0] === 'n' && !String(h[1]).includes('|U') && !/OLY/.test(String(h[1]))).length;
  const awards = won.filter((h) => h[0] === 'i').length;
  if (c.full) { out.ht = clubWins; out.aw = awards; if (caps > 0) out.nt = natWins; }
  return out;
}

function mainClub(c) {
  const by = new Map();
  for (const [, , club, loan, caps] of c.c) { if (!loan) by.set(club, (by.get(club) || 0) + (caps || 0)); }
  let best = null;
  for (const [club, n] of by) if (!best || n > best[1]) best = [club, n];
  return best ? clubs[best[0]] : null;
}

const byName = new Map(index.players.map((p) => [norm(p[1]), p]));
const players = [];
const used = new Set();

/* i giocatori a mano: tengono i loro numeri, ricevono quelli di Wikipedia */
for (const m of manual) {
  const p = byName.get(norm(m.name));
  const row = { ...m };
  if (p) {
    used.add(p[0]);
    const c = career(p[0]);
    if (c) {
      const w = wikiStats(p, c);
      /* nazionale, altezza e club: Wikipedia è più aggiornata del foglio a mano */
      for (const k of ['lp', 'lgl', 'lo', 'yrs', 'ht', 'aw', 'nt']) if (w[k] !== undefined) row[k] = w[k];
      for (const k of ['c', 'ng', 'h', 'cl']) if (w[k] !== undefined) row[k] = w[k];
    }
    if (p[3]) row.nation = p[3];
  }
  players.push(row);
}

const seen = new Set(players.map((p) => norm(p.name)));
for (const p of index.players) {
  const [id, label, , nation, role, fame, , complete] = p;
  if (used.has(id) || fame < MIN_FAME || !nation || !complete) continue;
  const name = label.replace(/\s*\(.*\)/, '');
  if (seen.has(norm(name))) continue;
  const c = career(id);
  if (!c) continue;
  const club = mainClub(c);
  if (!club) continue;
  const w = wikiStats(p, c);
  if (Object.keys(w).length < 5) continue;
  seen.add(norm(name));
  players.push({ name, club, nation, role, ...w });
}

writeFileSync(join(ROOT, 'data/duel.json'), JSON.stringify({ version: 2, players }));
const keys = {};
players.forEach((p) => Object.keys(p).forEach((k) => { keys[k] = (keys[k] || 0) + 1; }));
console.log(`giocatori: ${players.length} (a mano ${manual.length})`, keys);
