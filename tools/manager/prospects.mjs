/* Il vivaio di ogni club: quattro ragazzi fra i 16 e i 20 anni per squadra,
   con nomi veri del paese del club e un voto proporzionato alla società.
   Nelle rose di Wikipedia i ragazzi quasi non compaiono: senza di loro il
   mercato dei giovani non esiste.

   Sono marcati con la lettera 'p' fra i flag: rilanciare lo script li
   rigenera senza accumularli, e il gioco sa che sono ragazzi del vivaio.

   node tools/manager/prospects.mjs */

import { readFileSync, writeFileSync } from 'node:fs';
import { fnv1a, mulberry32 } from '../../src/core/rng.js';
import { pickName } from '../../src/manager/names.js';

const DIR = new URL('../../data/manager/', import.meta.url);
const read = (f) => JSON.parse(readFileSync(new URL(f, DIR), 'utf8'));
const leagues = read('leagues.json');
const SEASON = 2026;
const PER_CLUB = 3;
const ROLES = ['POR', 'DC', 'DC', 'TZ', 'MED', 'CC', 'CC', 'TRQ', 'ALA', 'ALA', 'PUN', 'PUN'];

let added = 0;
for (const lg of leagues.leagues) {
  const file = `squads-${lg.id}.json`;
  const json = read(file);
  for (const [clubId, rows] of Object.entries(json.squads)) {
    /* si riparte sempre dalle rose vere */
    const real = rows.filter((r) => !String(r[9] || '').includes('p'));
    const club = leagues.clubs[clubId];
    const rand = mulberry32(fnv1a(`${clubId}|prospects|1`));
    const taken = new Set(real.map((r) => r[0]));
    /* la nazionalità del vivaio è quella che si vede in prima squadra */
    const counts = {};
    for (const r of real) counts[r[2]] = (counts[r[2]] || 0) + 1;
    const home = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'IT';
    const foreign = real.map((r) => r[2]).filter((n) => n !== home);
    const out = [...real];
    for (let i = 0; i < PER_CLUB; i++) {
      const nation = rand() < 0.78 || !foreign.length ? home : foreign[Math.floor(rand() * foreign.length)];
      const name = pickName(rand, nation, (n) => taken.has(n));
      taken.add(name);
      const role = ROLES[Math.floor(rand() * ROLES.length)];
      const birth = SEASON - 16 - Math.floor(rand() * 5);
      /* un ragazzo di prima squadra sta molto sotto ai titolari, ma qualcuno
         è già pronto: il voto segue la forza del club, con code larghe */
      const rating = Math.round(Math.max(42, Math.min(68, club.strength - 20 + rand() * 12 + (rand() < 0.12 ? 5 : 0))));
      const height = 168 + Math.round(rand() * 24);
      out.push([name, birth, nation, role, rating, 0, '', height, 0, 'p', 0]);
      added++;
    }
    json.squads[clubId] = out;
  }
  writeFileSync(new URL(file, DIR), `${JSON.stringify(json)}\n`);
}
console.log(`vivai: ${added} ragazzi in ${Object.keys(leagues.clubs).length} club`);
