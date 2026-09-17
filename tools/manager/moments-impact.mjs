/* Quanto contano le scelte in partita: stesse partite giocate senza scelte,
   scegliendo sempre la prima opzione, scegliendo a caso e con il consiglio del vice.
   node tools/manager/moments-impact.mjs [partite] */
import { readFileSync } from 'node:fs';
import { playerFromRow } from '../../src/manager/players.js';
import { autoLineup, aiTactics } from '../../src/manager/lineup.js';
import { createMatch, tick, decide, adviseMoment } from '../../src/manager/match.js';
import { mulberry32 } from '../../src/core/rng.js';

const N = Number(process.argv[2] || 300);
const S = JSON.parse(readFileSync(new URL('../../data/manager/squads-ita1.json', import.meta.url))).squads;
const ids = Object.keys(S);
const rand = mulberry32(9);
function team(id, tag) {
  const players = S[id].map((r) => playerFromRow(r, `${id}${tag}`, 2026)).filter((p) => !p.loanOut);
  const t = aiTactics(players, mulberry32(id.length * 7));
  const { lineup, bench } = autoLineup(players, t.formation, t.style);
  return { id: id + tag, name: id, players, lineup, bench, formation: t.formation, style: t.style, mentality: 'equilibrata', morale: 60, familiarity: { [t.style]: 60 } };
}
const modes = ['none', 'first', 'random', 'last', 'advisor'];
const pts = Object.fromEntries(modes.map((m) => [m, 0]));
const decisions = {};
for (let i = 0; i < N; i++) {
  const a = ids[Math.floor(rand() * ids.length)];
  let b = ids[Math.floor(rand() * ids.length)];
  if (a === b) b = ids[(ids.indexOf(a) + 1) % ids.length];
  const home = rand() < 0.5;
  const seed = (i * 7919 + 13) >>> 0;
  for (const mode of modes) {
    const m = createMatch({ seed, home: team(home ? a : b, 'H'), away: team(home ? b : a, 'A'), user: home ? 'home' : 'away' });
    m.autoUser = true;
    if (mode === 'none') m.coachBan = true;
    const r2 = mulberry32(seed + 1);
    let guard = 0;
    while (!m.finished && guard++ < 400) {
      if (m.pending) {
        const opts = m.pending.options.filter((o) => !o.disabled);
        let pick = opts[0].id;
        if (mode === 'random') pick = opts[Math.floor(r2() * opts.length)].id;
        if (mode === 'last') pick = opts[opts.length - 1].id;
        if (mode === 'advisor') pick = adviseMoment(m, Number(process.env.RUNS || 0), 1, i).pick;
        if (mode !== 'none') decisions[m.pending.id] = (decisions[m.pending.id] || 0) + 1;
        decide(m, pick);
        continue;
      }
      tick(m);
    }
    const [H, A] = m.sides;
    const mine = home ? H.goals - A.goals : A.goals - H.goals;
    pts[mode] += mine > 0 ? 3 : mine === 0 ? 1 : 0;
  }
}
for (const mode of modes) console.log(`${mode.padEnd(8)} ${(pts[mode] / N).toFixed(3)} punti a partita`);
console.log('momenti per partita:', JSON.stringify(Object.fromEntries(Object.entries(decisions).map(([k, v]) => [k, +(v / N / 4).toFixed(2)]))));
