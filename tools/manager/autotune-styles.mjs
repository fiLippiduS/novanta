/* Equilibra gli stili: gira un torneo fra tutti gli stili con rose identiche
   e corregge `quality` di ognuno verso la media. Stampa i valori da copiare
   in src/manager/tactics.js. node tools/manager/autotune-styles.mjs [giri] [partite] */
import { readFileSync } from 'node:fs';
import { playerFromRow } from '../../src/manager/players.js';
import { autoLineup } from '../../src/manager/lineup.js';
import { STYLE_IDS, STYLES } from '../../src/manager/tactics.js';
import { createMatch, simulateToEnd } from '../../src/manager/match.js';

const ROUNDS = Number(process.argv[2] || 3);
const N = Number(process.argv[3] || 16);
const S = JSON.parse(readFileSync(new URL('../../data/manager/squads-ita1.json', import.meta.url))).squads;
const clubs = ['torino', 'bologna', 'napoli', 'lecce', 'como'].map((c) => Object.keys(S).find((x) => x.includes(c)));
const cache = new Map();
function team(id, style, tag) {
  const players = S[id].map((r) => playerFromRow(r, `${id}${tag}`, 2026)).filter((p) => !p.loanOut);
  const formation = STYLES[style].formations[0];
  const { lineup, bench } = autoLineup(players, formation, style);
  return { id: id + tag, name: id, players, lineup, bench, formation, style, mentality: 'equilibrata', morale: 60, familiarity: { [style]: 70 } };
}
let seed = 1000;
for (let round = 0; round < ROUNDS; round++) {
  const pts = Object.fromEntries(STYLE_IDS.map((s) => [s, 0]));
  const games = Object.fromEntries(STYLE_IDS.map((s) => [s, 0]));
  for (const id of clubs) for (const a of STYLE_IDS) for (const b of STYLE_IDS) {
    if (a === b) continue;
    for (let i = 0; i < N; i++) {
      const m = createMatch({ seed: seed++, home: team(id, a, 'H'), away: team(id, b, 'A') });
      simulateToEnd(m);
      const [H, A] = m.sides;
      pts[a] += H.goals > A.goals ? 3 : H.goals === A.goals ? 1 : 0;
      pts[b] += A.goals > H.goals ? 3 : H.goals === A.goals ? 1 : 0;
      games[a]++; games[b]++;
    }
  }
  const avg = Object.fromEntries(STYLE_IDS.map((s) => [s, pts[s] / games[s]]));
  const mean = Object.values(avg).reduce((a, b) => a + b, 0) / STYLE_IDS.length;
  console.log(`giro ${round + 1}: ` + STYLE_IDS.map((s) => `${s} ${(((avg[s] / mean) - 1) * 100).toFixed(1)}%`).join(' · '));
  for (const s of STYLE_IDS) {
    STYLES[s].quality = Math.round(Math.max(0.8, Math.min(1.3, STYLES[s].quality * (mean / avg[s]) ** 0.35)) * 1000) / 1000;
  }
}
console.log('quality:', JSON.stringify(Object.fromEntries(STYLE_IDS.map((s) => [s, STYLES[s].quality]))));
