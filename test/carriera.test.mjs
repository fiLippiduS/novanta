/* Mille carriere simulate con scelte a caso. Ogni regola chiesta per la
   carriera diventa un controllo: numeri possibili, statistiche del ruolo,
   eventi coerenti con il resoconto, infortuni rari e coerenti con le partite,
   coppe coerenti con la classifica, nazionale solo per le più forti, scelte
   fino all'ultimo anno, e soprattutto carriere tutte diverse. */

import { readFileSync } from 'node:fs';
import { ROLES, STYLES, IDOLS, ROLE_ATTRS, attrsOf } from '../src/career/model.js';
import { NATIONS, NATION, tournamentsIn } from '../src/career/nations.js';
import { qualification } from '../src/career/season.js';
import { fits, context } from '../src/career/events.js';
import { TROPHY_TYPES, trophySvg } from '../src/career/trophies.js';
import {
  newCareer, signFor, beginSeason, chooseFocus, chooseOption, readyToPlay, finishSeason, openMarket, retirementAge,
} from '../src/career/runner.js';

const clubs = JSON.parse(readFileSync(new URL('../data/clubs.json', import.meta.url), 'utf8')).clubs;
const events = JSON.parse(readFileSync(new URL('../data/career/events.json', import.meta.url), 'utf8')).events;
const textIt = JSON.parse(readFileSync(new URL('../data/career/text.it.json', import.meta.url), 'utf8'));

let pass = 0, fail = 0;
const check = (d, ok, extra = '') => { ok ? pass++ : (fail++, console.log(`  FALLITO  ${d} ${extra}`)); };

function seeded(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const pick = (rand, arr) => arr[Math.floor(rand() * arr.length)];

/** una carriera intera con scelte a caso; registra tutto quello che serve ai controlli */
function runCareer(seed, opts = {}) {
  const rand = seeded(seed);
  const role = opts.role || pick(rand, ROLES);
  const style = pick(rand, STYLES[role]);
  const nation = opts.nation || pick(rand, NATIONS).code;
  const idol = opts.idol || pick(rand, IDOLS[role]).id;
  const state = newCareer(rand, { name: 'Prova', role, style, number: 9, nation, idol }, clubs);
  signFor(state, pick(rand, state.offersList));
  const log = [];
  const turns = [];

  while (!state.player.retired) {
    const pend = beginSeason(state, rand, events);
    const decisions = pend.decisions.map((d) => d.id);
    const ageBefore = state.player.age;
    const clubBefore = { ...state.club };
    chooseFocus(state, pick(rand, pend.focus.options));
    pend.decisions.forEach((d, i) => {
      const ev = events.find((e) => e.id === d.id);
      chooseOption(state, events, i, Math.floor(rand() * ev.o.length), rand);
    });
    const mods = { ...pend.mods };
    const ready = readyToPlay(state);
    const res = finishSeason(state, rand, events);
    turns.push({ decisions, seasons: res.seasons.length });
    /* un turno sono due stagioni: nel registro una riga per stagione, e le
       scelte (con i loro effetti raccontati) appartengono alla prima */
    res.seasons.forEach((x, k) => log.push({
      first: k === 0,
      decisions: k === 0 ? decisions : [],
      incidents: x.incidents,
      ageBefore: ageBefore + k,
      clubBefore,
      record: x.record,
      mods: k === 0 ? mods : {},
      ready,
      focus: res.focus,
    }));
    const list = openMarket(state, rand, clubs);
    if (list && list.length && rand() < 0.4) {
      const o = pick(rand, list);
      signFor(state, o.club, { loan: o.loan });
    }
    if (state.player.age > 45) break;   // rete di sicurezza: non deve mai scattare
  }
  return { state, log, turns };
}

console.log('— mille carriere —');
const careers = [];
for (let s = 1; s <= 1000; s++) careers.push({ seed: s, ...runCareer(s) });

{
  let impossible = 0, gkGoals = 0, gkClean = 0, badRole = 0, noDecisions = 0, notReady = 0;
  let minViolations = 0, injuryViolations = 0, injuredSeasons = 0, seasons = 0;
  let contViolations = 0, trophyViolations = 0, natViolations = 0, tooOld = 0, ageEventViolations = 0;
  let focusGain = 0, otherGain = 0, focusN = 0, otherN = 0;
  let ballon = 0, anyNatArc = 0;

  for (const { state, log } of careers) {
    const p = state.player;
    if (p.age > retirementAge(p.role) + 2) tooOld++;
    if (Object.keys(p.attrs).some((a) => !(a in ROLE_ATTRS[p.role]))) badRole++;
    if (p.national.arc && NATION.get(p.nation).tier !== 1) natViolations++;
    if (p.national.arc) anyNatArc++;
    if (p.totals.trophies.includes('pallone_oro')) ballon++;

    log.forEach((entry, i) => {
      const r = entry.record;
      const st = r.stats;
      seasons++;
      if (!entry.ready) notReady++;
      if (entry.first && entry.decisions.length < 3) noDecisions++;
      if (st.apps < 0 || st.apps > 62 || st.goals > 70 || st.assists > 40 || st.goals < 0) { impossible++; if (impossible <= 3) console.log('   impossibile:', p.role, JSON.stringify(st), JSON.stringify(entry.mods)); }
      if (p.role === 'POR' && st.goals > 0) gkGoals++;
      if (st.clean > st.apps) gkClean++;

      /* quello che gli eventi hanno raccontato è nei numeri */
      const m = entry.mods;
      if ((m.minApps && st.apps < m.minApps) || (m.minGoals && p.role !== 'POR' && st.goals < m.minGoals) || (m.minCaps && p.national.called && !p.national.retired && r.national.caps < m.minCaps && entry.clubBefore)) {
        if (!(m.minCaps && !r.national.caps && !p.national.arc)) minViolations++;
      }

      /* infortuni coerenti con le presenze */
      if (r.injury) {
        injuredSeasons++;
        const maxApps = Math.round(62 * (1 - r.injury.weeks / 42)) + 1;
        if (st.apps > Math.max(maxApps, m.minApps || 0)) injuryViolations++;
      }

      /* le coppe continentali arrivano dalla classifica dell'anno prima, nella stessa squadra */
      const prev = log[i - 1];
      if (prev && prev.record.club.id === r.club.id && !entry.clubBefore.loan) {
        const expected = qualification({ ...prev.clubBefore, tier: prev.record.club.tier }, prev.record.position);
        if ((r.cont || null) !== (expected || null)) contViolations++;
      }
      if (r.trophies.includes('campionato') && (r.position !== 1 || r.club.tier > 4)) trophyViolations++;
      for (const c of ['ucl', 'uel', 'uecl', 'libertadores', 'sudamericana']) {
        if (r.trophies.includes(c) && r.cont !== c) trophyViolations++;
      }
      if (r.trophies.includes('mondiale_club') && !r.cwc) trophyViolations++;
      for (const tour of ['mondiale', 'europeo', 'copa_america', 'nations_league']) {
        if (r.trophies.includes(tour)) {
          const nation = NATION.get(p.nation);
          if (!p.national.arc || !tournamentsIn(r.year, nation.confed).includes(tour)) trophyViolations++;
        }
      }
      if (p.role === 'POR' && (r.trophies.includes('capocannoniere') || r.trophies.includes('scarpa_oro'))) trophyViolations++;

      /* nessun evento fuori età */
      for (const id of [...entry.decisions, ...entry.incidents]) {
        const ev = events.find((e) => e.id === id);
        const w = ev.when || {};
        if ((w.ageMax !== undefined && entry.ageBefore > w.ageMax) || (w.ageMin !== undefined && entry.ageBefore < w.ageMin)) ageEventViolations++;
      }

      /* l'allenamento scelto cresce più delle altre doti, finché si è giovani */
      if (entry.focus && entry.focus !== 'rest' && r.age <= 23 && st.apps > 10) {
        for (const [a, d] of Object.entries(r.changes)) {
          if (a === entry.focus) { focusGain += d; focusN++; } else { otherGain += d; otherN++; }
        }
      }
    });
  }

  check('nessun numero impossibile', impossible === 0, `(${impossible})`);
  check('un portiere non segna mai nel resoconto', gkGoals === 0, `(${gkGoals})`);
  check('porte inviolate mai più delle presenze', gkClean === 0, `(${gkClean})`);
  check('le doti sono solo quelle del ruolo', badRole === 0, `(${badRole})`);
  check('ogni stagione ha tre scelte oltre all’allenamento', noDecisions === 0, `(${noDecisions})`);
  check('ogni stagione si gioca solo con tutte le scelte fatte', notReady === 0, `(${notReady})`);
  check('gli eventi raccontati compaiono nei numeri', minViolations === 0, `(${minViolations})`);
  check('chi è infortunato a lungo non gioca tutta la stagione', injuryViolations === 0, `(${injuryViolations})`);
  const injuryRate = injuredSeasons / seasons;
  console.log(`   stagioni con infortunio: ${(injuryRate * 100).toFixed(1)}%`);
  check('gli infortuni sono rari', injuryRate < 0.2 && injuryRate > 0.03, `(${(injuryRate * 100).toFixed(1)}%)`);
  check('le coppe continentali dipendono dalla classifica', contViolations === 0, `(${contViolations})`);
  check('i trofei sono coerenti con coppe, classifica e ruolo', trophyViolations === 0, `(${trophyViolations})`);
  check('la nazionale solo per le dieci più forti', natViolations === 0, `(${natViolations})`);
  check('non tutte le carriere delle nazioni forti hanno la nazionale', anyNatArc > 0 && anyNatArc < careers.length, `(${anyNatArc})`);
  check('nessun evento fuori età', ageEventViolations === 0, `(${ageEventViolations})`);
  check('nessuno gioca oltre l’età del ritiro', tooOld === 0, `(${tooOld})`);
  const f = focusGain / Math.max(1, focusN), o = otherGain / Math.max(1, otherN);
  console.log(`   crescita media da giovani: dote allenata +${f.toFixed(2)} · altre +${o.toFixed(2)}`);
  check('la dote allenata cresce di più', f > o * 1.4, `(${f.toFixed(2)} vs ${o.toFixed(2)})`);
  console.log(`   carriere con un Pallone d'Oro: ${(ballon / 10).toFixed(1)}%`);
  check('il Pallone d’Oro è raro', ballon / careers.length < 0.12, `(${ballon})`);
}

console.log('— due stagioni per turno —');
{
  let turns = 0, doubles = 0, turnCounts = [];
  for (const c of careers) {
    turns += c.turns.length - 1;
    doubles += c.turns.slice(0, -1).filter((x) => x.seasons === 2).length;
    turnCounts.push(c.turns.length);
  }
  const avg = turnCounts.reduce((a, b) => a + b, 0) / turnCounts.length;
  console.log(`   turni per carriera: media ${avg.toFixed(1)} · stagioni doppie ${(doubles / turns * 100).toFixed(1)}%`);
  check('ogni turno copre due stagioni, tranne a volte l’ultimo', doubles === turns, `(${doubles}/${turns})`);
  check('una carriera dura una dozzina di turni, non venti', avg >= 8 && avg <= 14, `(${avg.toFixed(1)})`);
}

console.log('— ogni carriera è diversa —');
{
  /* stesso ruolo, stessa nazione, stesso idolo: cambia solo il caso */
  const signatures = new Set();
  const N = 300;
  for (let s = 5000; s < 5000 + N; s++) {
    const { log } = runCareer(s, { role: 'PUN', nation: 'IT', idol: 'inzaghi' });
    signatures.add(log.map((e) => `${e.decisions.join('+')}|${e.record.club.id}`).join('/'));
  }
  check('trecento carriere con le stesse premesse sono tutte diverse', signatures.size === N, `(${signatures.size}/${N})`);

  const firstFive = new Set();
  for (let s = 7000; s < 7200; s++) {
    const { log } = runCareer(s, { role: 'POR', nation: 'BR', idol: 'casillas' });
    firstFive.add(log.filter((e) => e.first).slice(0, 5).map((e) => e.decisions.join('+')).join('/'));
  }
  check('anche i primi cinque anni cambiano da una carriera all’altra', firstFive.size >= 190, `(${firstFive.size}/200)`);
}

console.log('— scelte fino all’ultimo anno —');
{
  let lateSeasons = 0, lateWithRealChoices = 0;
  const lifeIds = new Set(events.filter((e) => e.group === 'life').map((e) => e.id));
  for (const { log } of careers.slice(0, 400)) {
    for (const e of log.filter((x) => x.first)) {
      if (e.ageBefore >= 33) {
        lateSeasons++;
        if (e.decisions.length >= 3) lateWithRealChoices++;
      }
    }
  }
  check('dopo i trentatré anni ogni stagione ha ancora le sue scelte', lateSeasons > 0 && lateWithRealChoices === lateSeasons, `(${lateWithRealChoices}/${lateSeasons})`);
  check('gli eventi di vita coprono tutte le età', [...lifeIds].length > 40);
}

console.log('— dati degli eventi —');
{
  check('almeno tre volte gli eventi di prima (47)', events.length >= 141, `(${events.length})`);
  const byRole = Object.fromEntries(ROLES.map((r) => [r, events.filter((e) => e.group === 'role' && e.when.roles && e.when.roles.includes(r)).length]));
  check('ogni ruolo ha le sue scelte', Object.values(byRole).every((n) => n >= 7), JSON.stringify(byRole));
  const missingText = events.filter((e) => !textIt[e.id]).map((e) => e.id);
  check('ogni evento ha il testo italiano', missingText.length === 0, missingText.join(','));
  check('ogni trofeo ha una sagoma', TROPHY_TYPES.every((tt) => trophySvg(tt).includes('<svg')));
  check('un portiere non migliora velocità né colpo di testa', !attrsOf('POR').includes('pace') && !attrsOf('POR').includes('heading'));
  const ctx = context(careers[0].state.player, careers[0].state.club);
  check('le condizioni si leggono senza errori', events.every((e) => typeof fits(e, ctx) === 'boolean'));
}

console.log(`\n${pass} passati, ${fail} falliti`);
if (fail) process.exit(1);
