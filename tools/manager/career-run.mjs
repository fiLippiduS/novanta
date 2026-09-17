/* Più stagioni di fila con l'allenatore automatico: controlla che la
   carriera non si inceppi mai. node tools/manager/career-run.mjs [club] [stagioni] [seme] */
import { readFileSync } from 'node:fs';
import { newCareer, startUserMatch, applyMatch, simulateRest, closeMatchday, nextFixture, endSeason, beginNextSeason, jobOffers, takeJob, table, squadOf, leagueOf } from '../../src/manager/career.js';
import { simulateToEnd } from '../../src/manager/match.js';
import { dueCup, startCupMatch, closeCupRound } from '../../src/manager/cups.js';
import { planWeek, resolve as resolveEvent } from '../../src/manager/events.js';
import { incomingOffers } from '../../src/manager/market.js';
const events = JSON.parse(readFileSync(new URL('../../data/manager/events.json', import.meta.url))).events;
let cupLog = [];
function playCups(career, data) {
  let cup;
  let guard = 0;
  while ((cup = dueCup(career)) && guard++ < 20) {
    if (cup.silent) { closeCupRound(career, data, cup.id); continue; }
    const m = startCupMatch(career, data, cup.id);
    m.autoUser = true;
    simulateToEnd(m);
    const r = closeCupRound(career, data, cup.id, m);
    cupLog.push(`${cup.id}:${r.round}${r.eliminated ? '✗' : r.trophy ? '🏆' : '✓'}`);
  }
}

const read = (f) => JSON.parse(readFileSync(new URL(`../../data/manager/${f}`, import.meta.url)));
const leagues = read('leagues.json');
const squads = {};
for (const l of leagues.leagues) squads[l.id] = read(`squads-${l.id}.json`).squads;
const data = { leagues, squads };
const clubId = Object.keys(leagues.clubs).find((id) => id.includes(process.argv[2] || 'torino'));
const seasons = Number(process.argv[3] || 5);
const career = newCareer(data, { seed: Number(process.argv[4] || 3), name: 'Test', nation: 'IT', style: 'gegenpressing', clubId });
const t0 = Date.now();
let size = 0;
for (let s = 0; s < seasons; s++) {
  let guard = 0;
  while (career.phase === 'season' && guard++ < 60) {
    const nf = nextFixture(career);
    if (nf) { const m = startUserMatch(career); m.autoUser = true; simulateToEnd(m); applyMatch(career, m, nf.fixture); }
    simulateRest(career);
    closeMatchday(career, data);
    incomingOffers(career, data);
    playCups(career, data);
    if (career.phase === 'season') {
      planWeek(career, data, events);
      /* l'allenatore automatico sceglie sempre la prima opzione */
      for (const q of [...career.queue]) resolveEvent(career, data, events, q.key, 0);
    }
  }
  playCups(career, data);
  if (career.phase === 'sacked' && career.md < career.fixtures.length) {
    const offers = jobOffers(career, data);
    console.log(`  esonerato alla giornata ${career.md} · offerte: ${offers.map((o) => o.name).join(', ')}`);
    takeJob(career, data, offers[0].club);
    s--;
    continue;
  }
  const sum = endSeason(career, data);
  console.log(`  coppe: ${cupLog.join(' ')} · Europa prossima: ${sum.europe || '-'}`);
  cupLog = [];
  const lg = leagueOf(data, sum.league).name;
  console.log(`${sum.season} ${career.clubs[career.club].name} (${lg}): ${sum.pos}° ${sum.pts}pt · obiettivo ${sum.objective.id} ${sum.objective.target}° · ${sum.verdict} · rep ${career.coach.reputation} · trofei ${sum.trophies.map((t) => t.type).join(',') || '-'} · ritirati ${sum.retired.length} · partiti ${sum.left.length} · vivaio ${sum.youth.length} · spareggi ${sum.playoffs.length} · su ${sum.moves.up.map((id) => career.clubs[id]?.name).join('/')} giù ${sum.moves.down.map((id) => career.clubs[id]?.name).join('/')}`);
  if (career.phase === 'sacked') {
    const offers = jobOffers(career, data);
    console.log(`  lascia il club · offerte: ${offers.map((o) => o.name).join(', ')}`);
    takeJob(career, data, offers[0].club);
  } else {
    beginNextSeason(career, data);
  }
  const all = squadOf(career, career.club);
  const mine = all.filter((p) => !p.loanOut);
  const counts = {}; mine.forEach((p) => { counts[p.role] = (counts[p.role] || 0) + 1; });
  size = JSON.stringify(career).length;
  console.log(`  ${career.season}: ${career.clubs[career.club].name} in ${leagueOf(data, career.league).name} · rosa ${mine.length} (+${all.length - mine.length} in prestito) ${JSON.stringify(counts)} · club ${Object.keys(career.clubs).length} · salvataggio ${(size / 1024).toFixed(0)} KB`);
}
console.log(`fatto in ${Date.now() - t0}ms`);
