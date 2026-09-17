import { readFileSync } from 'node:fs';
import { playerFromRow } from '../../src/manager/players.js';
import { autoLineup } from '../../src/manager/lineup.js';
import { STYLE_IDS, STYLES } from '../../src/manager/tactics.js';
import { createMatch, simulateToEnd } from '../../src/manager/match.js';
const N = Number(process.argv[2] || 150);
const vs = process.argv[3] || 'equilibrio';
const S = JSON.parse(readFileSync(new URL('../../data/manager/squads-ita1.json', import.meta.url))).squads;
const id = Object.keys(S).find((x) => x.includes(process.argv[4] || 'torino'));
function team(style, tag) {
  const players = S[id].map((r) => playerFromRow(r, `${id}${tag}`, 2026)).filter((p) => !p.loanOut);
  const formation = '4-3-3';
  const { lineup, bench } = autoLineup(players, formation, style);
  return { id: id + tag, name: id, players, lineup, bench, formation, style, mentality: 'equilibrata', morale: 60, familiarity: { [style]: 70 } };
}
let seed = 7;
console.log('stile'.padEnd(14), 'pts  xgF  xgA  shF  shA  poss counters');
for (const st of STYLE_IDS) {
  let p = 0, xf = 0, xa = 0, sf = 0, sa = 0, pos = 0, ctr = 0;
  for (let i = 0; i < N; i++) {
    const home = i % 2 === 0;
    const m = createMatch({ seed: seed++, home: home ? team(st, 'H') : team(vs, 'H'), away: home ? team(vs, 'A') : team(st, 'A') });
    simulateToEnd(m);
    const me = home ? m.sides[0] : m.sides[1]; const ot = home ? m.sides[1] : m.sides[0];
    p += me.goals > ot.goals ? 3 : me.goals === ot.goals ? 1 : 0;
    xf += me.stats.xg; xa += ot.stats.xg; sf += me.stats.shots; sa += ot.stats.shots; pos += me.stats.possessionPct;
    ctr += m.events.filter((e) => e.side === me.key && e.kind === 'counter').length;
  }
  const f = (v, d = 2) => (v / N).toFixed(d);
  console.log(st.padEnd(14), f(p), f(xf), f(xa), f(sf, 1), f(sa, 1), f(pos, 0), f(ctr, 1));
}
