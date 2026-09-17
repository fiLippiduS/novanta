/* Una o più stagioni simulate da cima a fondo, per controllare che i numeri
   abbiano senso. node tools/manager/season.mjs [club] [stagioni] */
import { readFileSync } from 'node:fs';
import { newCareer, startUserMatch, applyMatch, simulateRest, closeMatchday, nextFixture, table, squadOf, leagueOf } from '../../src/manager/career.js';
import { simulateToEnd } from '../../src/manager/match.js';

const clubArg = process.argv[2] || 'torino';
const read = (f) => JSON.parse(readFileSync(new URL(`../../data/manager/${f}`, import.meta.url)));
const leagues = read('leagues.json');
const squads = {};
for (const l of leagues.leagues) squads[l.id] = read(`squads-${l.id}.json`).squads;
const data = { leagues, squads };
const clubId = Object.keys(leagues.clubs).find((id) => id.includes(clubArg));
const t0 = Date.now();
const career = newCareer(data, { seed: Number(process.argv[3] || 7), name: 'Test', nation: 'IT', style: 'equilibrio', clubId });
const startOvr = Object.fromEntries(Object.values(career.players).map((p) => [p.id, p.ovr]));
const trust = [];
while (career.phase === 'season') {
  const nf = nextFixture(career);
  if (nf) {
    const m = startUserMatch(career);
    m.autoUser = true;
    simulateToEnd(m);
    applyMatch(career, m, nf.fixture);
  }
  simulateRest(career);
  const r = closeMatchday(career, data);
  trust.push(Math.round(career.board.trust));
  if (r.board.ultimatum) console.log(`giornata ${r.md + 1}: ultimatum ${r.board.ultimatum}`);
  if (r.board.sacked) console.log(`giornata ${r.md + 1}: ESONERATO`);
}
const rows = table(career, data);
const name = (id) => career.clubs[id].name;
console.log(`${leagueOf(data, career.league).name} ${career.season} in ${Date.now() - t0}ms · fase ${career.phase}`);
console.log(`obiettivo ${career.board.objective.id} (${career.board.objective.target}°) · fiducia ${trust.join(' ')}`);
rows.forEach((r) => console.log(`${String(r.pos).padStart(2)} ${name(r.id).padEnd(24)} ${String(r.pts).padStart(3)}  ${r.w}-${r.d}-${r.l}  ${r.gf}:${r.ga}  forza ${career.clubs[r.id].strength}${r.id === career.club ? '  ◀' : ''}`));
const all = Object.values(career.players);
const scorers = all.sort((a, b) => b.stats.goals - a.stats.goals).slice(0, 8);
console.log('capocannonieri:', scorers.map((p) => `${p.name} ${p.stats.goals} (${career.clubs[p.club]?.name})`).join(' · '));
const assist = all.sort((a, b) => b.stats.assists - a.stats.assists).slice(0, 5);
console.log('assist:', assist.map((p) => `${p.name} ${p.stats.assists}`).join(' · '));
const deltas = all.map((p) => ({ p, d: p.ovr - startOvr[p.id] }));
deltas.sort((a, b) => b.d - a.d);
console.log('crescite:', deltas.slice(0, 6).map(({ p, d }) => `${p.name} ${startOvr[p.id]}→${p.ovr} (${2026 - p.birth}a, voto ${(p.stats.ratingSum / Math.max(1, p.stats.apps)).toFixed(2)}, ${p.stats.apps}pr)`).join(' · '));
console.log('cali:', deltas.slice(-6).map(({ p, d }) => `${p.name} ${startOvr[p.id]}→${p.ovr} (${2026 - p.birth}a, ${p.stats.apps}pr)`).join(' · '));
const dist = {}; deltas.forEach(({ d }) => { const k = Math.max(-6, Math.min(6, d)); dist[k] = (dist[k] || 0) + 1; });
console.log('variazioni overall:', JSON.stringify(dist));
const mine = squadOf(career, career.club).sort((a, b) => b.stats.minutes - a.stats.minutes);
console.log('mia rosa:', mine.slice(0, 16).map((p) => `${p.name.split(' ').pop()} ${p.stats.apps}pr ${p.stats.goals}g ${p.stats.assists}a ${(p.stats.ratingSum / Math.max(1, p.stats.apps)).toFixed(1)}`).join(' · '));
