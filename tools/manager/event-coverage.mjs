/* Quali eventi escono davvero: molte carriere su club diversi, scelte a caso.
   Un evento mai pescato ha condizioni troppo strette o impossibili.
   node tools/manager/event-coverage.mjs [carriere] [stagioni] */
import { readFileSync } from 'node:fs';
import { newCareer, startUserMatch, applyMatch, simulateRest, closeMatchday, nextFixture, endSeason, beginNextSeason, jobOffers, takeJob } from '../../src/manager/career.js';
import { simulateToEnd } from '../../src/manager/match.js';
import { dueCup, startCupMatch, closeCupRound } from '../../src/manager/cups.js';
import { planWeek, resolve as resolveEvent } from '../../src/manager/events.js';
import { incomingOffers } from '../../src/manager/market.js';
import { STYLES } from '../../src/manager/tactics.js';
import { mulberry32 } from '../../src/core/rng.js';

const read = (f) => JSON.parse(readFileSync(new URL(`../../data/manager/${f}`, import.meta.url)));
const events = read('events.json').events;
const leagues = read('leagues.json');
const squads = {};
for (const l of leagues.leagues) squads[l.id] = read(`squads-${l.id}.json`).squads;
const data = { leagues, squads };

const careers = Number(process.argv[2] || 24);
const seasons = Number(process.argv[3] || 2);
const count = Object.fromEntries(events.map((e) => [e.id, 0]));
const clubs = Object.keys(leagues.clubs);
const styles = Object.keys(STYLES);
const pick = mulberry32(77);
const t0 = Date.now();

function playCups(career) {
  let cup; let guard = 0;
  while ((cup = dueCup(career)) && guard++ < 20) {
    if (cup.silent) { closeCupRound(career, data, cup.id); continue; }
    const m = startCupMatch(career, data, cup.id);
    m.autoUser = true;
    simulateToEnd(m);
    closeCupRound(career, data, cup.id, m);
  }
}

/* come l'interfaccia: si decide anche prima della prima giornata */
function week(career) {
  planWeek(career, data, events);
  for (const q of [...career.queue]) {
    count[q.id]++;
    const ev = events.find((e) => e.id === q.id);
    resolveEvent(career, data, events, q.key, Math.floor(pick() * ev.o.length));
  }
}

for (let c = 0; c < careers; c++) {
  const clubId = clubs[Math.floor(pick() * clubs.length)];
  const career = newCareer(data, { seed: 1000 + c, name: 'Test', nation: 'IT', style: styles[c % styles.length], clubId });
  week(career);
  for (let s = 0; s < seasons; s++) {
    let guard = 0;
    while (career.phase === 'season' && guard++ < 60) {
      const nf = nextFixture(career);
      if (nf) { const m = startUserMatch(career); m.autoUser = true; simulateToEnd(m); applyMatch(career, m, nf.fixture); }
      simulateRest(career);
      closeMatchday(career, data);
      incomingOffers(career, data);
      playCups(career);
      if (career.phase === 'season') week(career);
    }
    playCups(career);
    if (career.phase === 'sacked' && career.md < career.fixtures.length) {
      takeJob(career, data, jobOffers(career, data)[0].club);
      week(career);
      continue;
    }
    endSeason(career, data);
    if (career.phase === 'sacked') takeJob(career, data, jobOffers(career, data)[0].club);
    else beginNextSeason(career, data);
    week(career);
  }
  process.stdout.write('.');
}
const never = events.filter((e) => !count[e.id]);
const drawn = Object.values(count).reduce((a, b) => a + b, 0);
const top = Object.entries(count).sort((a, b) => b[1] - a[1]).slice(0, 12);
console.log(`\n${careers} carriere × ${seasons} stagioni in ${((Date.now() - t0) / 1000).toFixed(0)}s · ${drawn} eventi pescati · ${events.length - never.length}/${events.length} diversi`);
console.log(`più frequenti: ${top.map(([id, n]) => `${id} ${n}`).join(', ')}`);
console.log(`mai usciti (${never.length}): ${never.map((e) => `${e.id}${e.chainOnly ? '*' : ''}`).join(', ')}`);
