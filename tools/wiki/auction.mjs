/* Allarga il catalogo dell'asta con i giocatori del catalogo Wikipedia.
   I 647 nomi scritti a mano restano come sono (voto compreso): si aggiungono
   gli altri, con un voto ricavato dalla notorietà e dalla carriera, tenuto
   basso di proposito. Così ogni ruolo ha i suoi campioni e i suoi comprimari.

   node tools/wiki/auction.mjs */

import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from './lib.mjs';

const AUCTION = join(ROOT, 'data/auction.json');
const src = JSON.parse(readFileSync(AUCTION, 'utf8'));
/* il catalogo scritto a mano: quello del commit che l'ha introdotto, senza
   le aggiunte di un giro precedente di questo script */
const manual = src.players.filter((p) => !p.wiki);
const index = JSON.parse(readFileSync(join(ROOT, 'data/players/index.json'), 'utf8'));
const clubs = index.clubs.map((c) => c[0]);

const norm = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s*\(.*\)/, '').replace(/[^a-z ]/g, ' ').replace(/\s+/g, ' ').trim();

const shards = new Map();
function career(id) {
  const k = Math.floor(id / 400);
  if (!shards.has(k)) shards.set(k, JSON.parse(readFileSync(join(ROOT, `data/players/careers-${k}.json`), 'utf8')));
  return shards.get(k)[id];
}

/* il club della carriera: quello con più presenze, prestiti esclusi */
function mainClub(c) {
  const by = new Map();
  for (const [, , club, loan, caps] of c.c) {
    if (loan) continue;
    by.set(club, (by.get(club) || 0) + (caps || 0));
  }
  let best = null;
  for (const [club, n] of by) if (!best || n > best[1]) best = [club, n];
  return best ? clubs[best[0]] : null;
}

const byName = new Map(index.players.map((p) => [norm(p[1]), p]));
const taken = new Set();

/* i nomi a mano ricevono il codice del paese, così la carta si traduce */
let coded = 0;
for (const m of manual) {
  const p = byName.get(norm(m.name));
  if (p && p[3]) { m.nation = p[3]; coded++; taken.add(p[0]); }
  m.club = m.tag.split(' · ')[0];
}

const added = [];
for (const p of index.players) {
  const [id, label, birthYear, nation, role, fame, , complete] = p;
  if (taken.has(id) || !complete || !nation || fame < 30) continue;
  if (manual.some((m) => norm(m.name) === norm(label))) continue;
  const c = career(id);
  if (!c) continue;
  const senior = c.c.reduce((n, r) => n + (r[3] ? 0 : r[4] || 0), 0);
  if (senior < 80) continue;
  const intl = c.n.filter((r) => !r[3]).reduce((n, r) => n + (r[4] || 0), 0);
  const club = mainClub(c);
  if (!club) continue;
  /* notorietà e presenze in nazionale: da 60 a 84, mai sopra i campioni */
  const rating = Math.max(60, Math.min(84, Math.round(59 + fame * 0.26 + Math.min(intl, 100) * 0.05)));
  const surname = label.replace(/\s*\(.*\)/, '').split(' ').slice(-1)[0].toLowerCase();
  added.push({ name: label.replace(/\s*\(.*\)/, ''), role, rating, club, nation, aliases: [surname], wiki: 1, born: birthYear });
}

/* Lo stesso giocatore scritto in due modi (Andrew e Andy Robertson, Raúl e
   Raúl González, Mahmoud Trézéguet e Trézéguet): fra i nomi a mano senza
   corrispondenza, stesso ruolo e stesso cognome o soprannome vuol dire doppione. */
const words = (s) => norm(s).split(' ');
const orphan = manual.filter((m) => !m.nation);
function sameAsManual(a) {
  const w = words(a.name);
  return orphan.some((m) => {
    if (m.role !== a.role) return false;
    const mw = words(m.name);
    if (mw.length === 1) return w[0] === mw[0] || w[w.length - 1] === mw[0];
    if (w.length === 1) return w[0] === mw[mw.length - 1];
    return w[w.length - 1] === mw[mw.length - 1] && w[0][0] === mw[0][0];
  });
}

/* nomi uguali (due omonimi): resta il più noto */
const seen = new Set(manual.map((m) => norm(m.name)));
const unique = [];
for (const a of added) {
  const k = norm(a.name);
  if (seen.has(k) || sameAsManual(a)) continue;
  seen.add(k);
  unique.push(a);
}

const players = [...manual, ...unique.map(({ born, ...rest }) => rest)];
writeFileSync(AUCTION, JSON.stringify({ version: 2, players }));

const stats = {};
for (const p of players) {
  const s = stats[p.role] || (stats[p.role] = { n: 0, weak: 0, strong: 0 });
  s.n++;
  if (p.rating <= 72) s.weak++;
  if (p.rating >= 85) s.strong++;
}
console.log(`a mano: ${manual.length} (${coded} con il paese) · aggiunti: ${unique.length} · totale ${players.length}`);
console.log(stats);
