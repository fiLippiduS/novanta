/* Taratura del motore partita sulle rose vere.
   node tools/manager/calibrate.mjs [partite] */
import { readFileSync } from 'node:fs';
import { playerFromRow } from '../../src/manager/players.js';
import { autoLineup, aiTactics } from '../../src/manager/lineup.js';
import { createMatch, simulateToEnd, playerRatings } from '../../src/manager/match.js';
import { mulberry32 } from '../../src/core/rng.js';

const N = Number(process.argv[2] || 2000);
const L = JSON.parse(readFileSync(new URL('../../data/manager/leagues.json', import.meta.url)));
const clubs = [];
for (const lg of L.leagues) {
  const S = JSON.parse(readFileSync(new URL(`../../data/manager/squads-${lg.id}.json`, import.meta.url))).squads;
  for (const [id, rows] of Object.entries(S)) clubs.push({ id, league: lg.id, info: L.clubs[id], rows });
}
const rand = mulberry32(42);
function team(c) {
  const players = c.rows.map((r) => playerFromRow(r, c.id, 2026)).filter((p) => !p.loanOut);
  const t = aiTactics(players, rand);
  const { lineup, bench } = autoLineup(players, t.formation, t.style);
  return { id: c.id, name: c.info.name, players, lineup, bench, formation: t.formation, style: t.style, mentality: 'equilibrata', morale: 60, familiarity: { [t.style]: 60 } };
}
const agg = { goals: 0, hw: 0, d: 0, aw: 0, shots: 0, onT: 0, xg: 0, corners: 0, yellows: 0, reds: 0, fouls: 0, pens: 0, injuries: 0, strongerWins: 0, strongerN: 0, bigGapWins: 0, bigGapN: 0 };
const scoreDist = {};
const ratingsAll = [];
const t0 = Date.now();
for (let i = 0; i < N; i++) {
  const lg = L.leagues[Math.floor(rand() * L.leagues.length)].id;
  const pool = clubs.filter((c) => c.league === lg);
  const a = pool[Math.floor(rand() * pool.length)];
  let b = pool[Math.floor(rand() * pool.length)];
  if (b === a) b = pool[(pool.indexOf(a) + 1) % pool.length];
  const m = createMatch({ seed: (i * 2654435761) >>> 0, home: team(a), away: team(b) });
  simulateToEnd(m);
  const [H, A] = m.sides;
  agg.goals += H.goals + A.goals;
  if (H.goals > A.goals) agg.hw++; else if (H.goals === A.goals) agg.d++; else agg.aw++;
  for (const s of m.sides) { agg.shots += s.stats.shots; agg.onT += s.stats.onTarget; agg.xg += s.stats.xg; agg.corners += s.stats.corners; agg.yellows += s.stats.yellows; agg.reds += s.stats.reds; agg.fouls += s.stats.fouls; }
  agg.pens += m.events.filter((e) => e.type === 'penalty').length;
  agg.injuries += m.events.filter((e) => e.type === 'injury').length;
  const k = `${Math.min(H.goals, 5)}-${Math.min(A.goals, 5)}`; scoreDist[k] = (scoreDist[k] || 0) + 1;
  const gap = a.info.strength - b.info.strength;
  if (Math.abs(gap) >= 3) { agg.strongerN++; if ((gap > 0 && H.goals > A.goals) || (gap < 0 && A.goals > H.goals)) agg.strongerWins++; }
  if (Math.abs(gap) >= 9) { agg.bigGapN++; if ((gap > 0 && H.goals > A.goals) || (gap < 0 && A.goals > H.goals)) agg.bigGapWins++; }
  if (i < 300) Object.values(playerRatings(m)).forEach((r) => ratingsAll.push(r));
}
const per = (x) => (x / N).toFixed(2);
const pct = (x, n = N) => `${Math.round((x / n) * 100)}%`;
console.log(`${N} partite in ${Date.now() - t0}ms`);
console.log(`gol/partita ${per(agg.goals)} · casa ${pct(agg.hw)} pari ${pct(agg.d)} trasferta ${pct(agg.aw)}`);
console.log(`tiri/squadra ${(agg.shots / N / 2).toFixed(1)} · in porta ${(agg.onT / N / 2).toFixed(1)} · xG ${(agg.xg / N / 2).toFixed(2)} · corner ${(agg.corners / N / 2).toFixed(1)}`);
console.log(`falli/squadra ${(agg.fouls / N / 2).toFixed(1)} · gialli ${(agg.yellows / N / 2).toFixed(2)} · rossi ${(agg.reds / N).toFixed(3)} a partita · rigori ${per(agg.pens)} · infortuni ${per(agg.injuries)}`);
console.log(`la più forte (≥3 punti) vince ${pct(agg.strongerWins, agg.strongerN)} · con ≥9 punti ${pct(agg.bigGapWins, agg.bigGapN)}`);
console.log('risultati più frequenti', Object.entries(scoreDist).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([k, v]) => `${k} ${pct(v)}`).join(' · '));
ratingsAll.sort((a, b) => a - b);
console.log('voti p10/50/90', ratingsAll[Math.floor(ratingsAll.length * 0.1)], ratingsAll[Math.floor(ratingsAll.length * 0.5)], ratingsAll[Math.floor(ratingsAll.length * 0.9)]);
