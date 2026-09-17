/* Per ogni momento chiave: quanti punti porta in media ogni opzione, e in
   quali situazioni vince. Serve a tarare le opzioni perché nessuna domini.
   node tools/manager/moments-options.mjs [partite] [run per opzione] */
import { readFileSync } from 'node:fs';
import { playerFromRow } from '../../src/manager/players.js';
import { autoLineup, aiTactics } from '../../src/manager/lineup.js';
import { createMatch, tick, decide, cloneMatch, simulateToEnd } from '../../src/manager/match.js';
import { mulberry32 } from '../../src/core/rng.js';

const N = Number(process.argv[2] || 150);
const RUNS = Number(process.argv[3] || 30);
const S = JSON.parse(readFileSync(new URL('../../data/manager/squads-ita1.json', import.meta.url))).squads;
const ids = Object.keys(S);
const rand = mulberry32(21);
function team(id, tag) {
  const players = S[id].map((r) => playerFromRow(r, `${id}${tag}`, 2026)).filter((p) => !p.loanOut);
  const t = aiTactics(players, mulberry32(id.length * 7));
  const { lineup, bench } = autoLineup(players, t.formation, t.style);
  return { id: id + tag, name: id, players, lineup, bench, formation: t.formation, style: t.style, mentality: 'equilibrata', morale: 60, familiarity: { [t.style]: 60 } };
}
const stats = {};
for (let i = 0; i < N; i++) {
  const a = ids[Math.floor(rand() * ids.length)];
  let b = ids[Math.floor(rand() * ids.length)];
  if (a === b) b = ids[(ids.indexOf(a) + 1) % ids.length];
  const home = rand() < 0.5;
  const m = createMatch({ seed: (i * 104729 + 7) >>> 0, home: team(home ? a : b, 'H'), away: team(home ? b : a, 'A'), user: home ? 'home' : 'away' });
    m.autoUser = true;
  let guard = 0;
  while (!m.finished && guard++ < 400) {
    if (m.pending) {
      const id = m.pending.id;
      if (id === 'penalty' || id === 'freekick') { decide(m, m.pending.options[0].id); continue; }
      const me = m.sides.find((s) => s.key === m.user); const ot = m.sides.find((s) => s !== me);
      const diff = me.goals - ot.goals;
      const ctxKey = `${id}|${diff > 0 ? 'avanti' : diff < 0 ? 'sotto' : 'pari'}`;
      const opts = m.pending.options.filter((o) => !o.disabled);
      const res = opts.map((o) => {
        let pts = 0;
        for (let r = 0; r < RUNS; r++) {
          const c = cloneMatch(m);
          c.seed = (m.seed ^ (r * 2654435761)) >>> 0; c.draws = 0;
          decide(c, o.id);
          c.user = null;
          simulateToEnd(c);
          const [H, A] = c.sides;
          const g = home ? H.goals - A.goals : A.goals - H.goals;
          pts += g > 0 ? 3 : g === 0 ? 1 : 0;
        }
        return [o.id, pts / RUNS];
      });
      for (const key of [id, ctxKey]) {
        stats[key] = stats[key] || {};
        for (const [oid, v] of res) { stats[key][oid] = stats[key][oid] || { sum: 0, n: 0, best: 0 }; stats[key][oid].sum += v; stats[key][oid].n++; }
        const best = res.sort((x, y) => y[1] - x[1])[0][0];
        stats[key][best].best++;
      }
      decide(m, opts[Math.floor(rand() * opts.length)].id);
      continue;
    }
    tick(m);
  }
}
for (const [key, opts] of Object.entries(stats).sort()) {
  const line = Object.entries(opts).map(([o, v]) => `${o} ${(v.sum / v.n).toFixed(2)} (migliore ${v.best}/${v.n})`).join(' · ');
  console.log(`${key.padEnd(26)} ${line}`);
}
