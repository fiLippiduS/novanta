/* Nessuno stile domina: torneo fra stili con rose identiche e con rose diverse.
   node tools/manager/styles.mjs [partite per coppia] */
import { readFileSync } from 'node:fs';
import { playerFromRow } from '../../src/manager/players.js';
import { autoLineup } from '../../src/manager/lineup.js';
import { STYLE_IDS, STYLES } from '../../src/manager/tactics.js';
import { createMatch, simulateToEnd } from '../../src/manager/match.js';

const N = Number(process.argv[2] || 60);
const L = JSON.parse(readFileSync(new URL('../../data/manager/leagues.json', import.meta.url)));
const S = JSON.parse(readFileSync(new URL('../../data/manager/squads-ita1.json', import.meta.url))).squads;
const ids = Object.keys(S);
function team(id, style, tag) {
  const players = S[id].map((r) => playerFromRow(r, `${id}${tag}`, 2026)).filter((p) => !p.loanOut);
  const formation = STYLES[style].formations[0] === '5-4-1' ? '5-4-1' : STYLES[style].formations[0];
  const { lineup, bench } = autoLineup(players, formation, style);
  return { id: id + tag, name: id, players, lineup, bench, formation, style, mentality: 'equilibrata', morale: 60, familiarity: { [style]: 70 } };
}
const pts = Object.fromEntries(STYLE_IDS.map((s) => [s, 0]));
const games = Object.fromEntries(STYLE_IDS.map((s) => [s, 0]));
const bestIn = {};
let seed = 1;
/* stessa rosa da entrambe le parti: conta solo lo stile */
for (const club of ['torino', 'bologna', 'napoli', 'lecce']) {
  const id = ids.find((x) => x.includes(club));
  const local = Object.fromEntries(STYLE_IDS.map((s) => [s, 0]));
  for (const a of STYLE_IDS) for (const b of STYLE_IDS) {
    if (a === b) continue;
    for (let i = 0; i < N; i++) {
      const m = createMatch({ seed: seed++, home: team(id, a, 'H'), away: team(id, b, 'A') });
      simulateToEnd(m);
      const [H, A] = m.sides;
      const ph = H.goals > A.goals ? 3 : H.goals === A.goals ? 1 : 0;
      const pa = A.goals > H.goals ? 3 : H.goals === A.goals ? 1 : 0;
      pts[a] += ph; pts[b] += pa; games[a]++; games[b]++;
      local[a] += ph; local[b] += pa;
    }
  }
  const ranked = Object.entries(local).sort((x, y) => y[1] - x[1]);
  bestIn[club] = ranked.slice(0, 3).map(([s]) => s).join(', ') + '  ·  ultimo ' + ranked[ranked.length - 1][0];
}
const avg = Object.entries(pts).map(([s, p]) => [s, p / games[s]]).sort((a, b) => b[1] - a[1]);
const mean = avg.reduce((n, [, v]) => n + v, 0) / avg.length;
console.log('punti per partita (media', mean.toFixed(3), ')');
avg.forEach(([s, v]) => console.log(`  ${s.padEnd(14)} ${v.toFixed(3)}  ${(((v / mean) - 1) * 100).toFixed(1)}%`));
console.log('migliori per rosa:'); Object.entries(bestIn).forEach(([k, v]) => console.log(`  ${k}: ${v}`));
