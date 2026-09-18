/* Allenatore: ogni regola chiesta alla modalità diventa un controllo.
   Rose complete, partite credibili, stili senza padroni, scelte in partita
   che contano senza un'opzione sempre giusta, overall che si muovono col
   rendimento, classifica corretta, esonero possibile ed evitabile, mercato
   che non svuota le rose, salvataggi identici, eventi tutti giocabili. */

import { readFileSync } from 'node:fs';
import { playerFromRow, DEPT, ROLES, PERSONALITIES, overallOf, ageOf, careerPhase, potentialRange } from '../src/manager/players.js';
import { autoLineup, aiTactics } from '../src/manager/lineup.js';
import { STYLE_IDS, STYLES, FORMATIONS } from '../src/manager/tactics.js';
import { createMatch, simulateToEnd, playerRatings, tick, decide, serializeMatch, restoreMatch } from '../src/manager/match.js';
import { makeFixtures, standings, zones } from '../src/manager/league.js';
import {
  newCareer, startUserMatch, applyMatch, simulateRest, closeMatchday, nextFixture, endSeason, beginNextSeason,
  jobOffers, takeJob, table, squadOf, leagueOf,
} from '../src/manager/career.js';
import { dueCup, startCupMatch, closeCupRound } from '../src/manager/cups.js';
import { planWeek, resolve as resolveEvent, fits, candidates, contextOf, applyFx } from '../src/manager/events.js';
import {
  incomingOffers, search, windowOpen, acceptOffer, release, canLetGo, SQUAD_MIN, openTalks, bidClub, payClause, offerContract,
  medicalChoice, withdrawTalk, talkById, counterIncoming, rejectOffer, wageRoom, isOpenTalk, setListed, listOf, CLUB_CUT,
} from '../src/manager/market.js';
import { matchTimeline } from '../src/manager/timeline.js';
import { mulberry32 } from '../src/core/rng.js';

const currentStrengthOf = (career) => Math.round(squadOf(career, career.club).map((p) => p.ovr).sort((a, b) => b - a).slice(0, 14).reduce((a, b) => a + b, 0) / 14);
const read = (f) => JSON.parse(readFileSync(new URL(`../data/manager/${f}`, import.meta.url), 'utf8'));
const leagues = read('leagues.json');
const squads = {};
for (const l of leagues.leagues) squads[l.id] = read(`squads-${l.id}.json`).squads;
const data = { leagues, squads };
const events = read('events.json').events;
const LANGS = ['it', 'en', 'es', 'fr', 'de', 'pt'];
const texts = Object.fromEntries(LANGS.map((l) => [l, read(`text.${l}.json`)]));

let pass = 0, fail = 0;
const check = (d, ok, extra = '') => { ok ? pass++ : (fail++, console.log(`  FALLITO  ${d} ${extra}`)); };
const t0 = Date.now();

function team(clubId, leagueId, rand, style = null, tag = '') {
  const players = squads[leagueId][clubId].map((r) => playerFromRow(r, clubId + tag, 2026)).filter((p) => !p.loanOut);
  const tt = aiTactics(players, rand);
  const s = style || tt.style;
  const formation = style ? STYLES[style].formations[0] : tt.formation;
  const { lineup, bench } = autoLineup(players, formation, s);
  return { id: clubId + tag, name: clubId, players, lineup, bench, formation, style: s, mentality: 'equilibrata', morale: 60, familiarity: { [s]: 60 } };
}

/** una stagione (o più) con l'allenatore automatico; `choose` decide le scelte della settimana */
function playSeason(career, { choose = () => 0, onMatchday = null } = {}) {
  let guard = 0;
  while (career.phase === 'season' && guard++ < 60) {
    const nf = nextFixture(career);
    if (nf) { const m = startUserMatch(career); m.autoUser = true; simulateToEnd(m); applyMatch(career, m, nf.fixture); }
    simulateRest(career);
    const report = closeMatchday(career, data);
    incomingOffers(career, data);
    let cup; let g = 0;
    while ((cup = dueCup(career)) && g++ < 20) {
      if (cup.silent) { closeCupRound(career, data, cup.id); continue; }
      const cm = startCupMatch(career, data, cup.id);
      cm.autoUser = true;
      simulateToEnd(cm);
      closeCupRound(career, data, cup.id, cm);
    }
    if (onMatchday) onMatchday(career, report);
    if (career.phase === 'season') {
      planWeek(career, data, events);
      for (const q of [...career.queue]) {
        const ev = events.find((e) => e.id === q.id);
        resolveEvent(career, data, events, q.key, choose(ev, q));
      }
    }
  }
}

/* ------------------------------------------------------------------ */
console.log('— rose —');
{
  const clubs = Object.entries(leagues.clubs);
  check('dieci campionati', leagues.leagues.length === 10, `(${leagues.leagues.length})`);
  for (const l of leagues.leagues) {
    const ids = clubs.filter(([, c]) => c.league === l.id).map(([id]) => id);
    check(`${l.id}: numero di squadre giusto`, ids.length === l.teams, `(${ids.length}/${l.teams})`);
    check(`${l.id}: ogni club ha la rosa`, ids.every((id) => Array.isArray(squads[l.id][id])));
  }
  const bad = [];
  let players = 0;
  for (const [id, c] of clubs) {
    const list = squads[c.league][id].map((r) => playerFromRow(r, id, 2026)).filter((p) => !p.loanOut);
    players += list.length;
    const by = { POR: 0, DIF: 0, CEN: 0, ATT: 0 };
    list.forEach((p) => { by[DEPT[p.role]]++; });
    /* le rose sono quelle vere: le ali a volte sono centrocampisti, quindi si
       controlla il minimo garantito dal build e che ogni modulo sia giocabile */
    if (list.length < 22 || by.POR < 2 || by.DIF < 6 || by.CEN < 4 || by.ATT < 3 || by.CEN + by.ATT < 10) bad.push(`${id} ${list.length} ${JSON.stringify(by)}`);
    if (list.some((p) => !ROLES.includes(p.role) || !PERSONALITIES.includes(p.personality) || !(p.ovr >= 40 && p.ovr <= 95) || Number.isNaN(p.ovr))) bad.push(`${id}: giocatore non valido`);
    for (const f of Object.keys(FORMATIONS)) {
      const { lineup, bench } = autoLineup(list, f, 'equilibrio');
      if (lineup.length !== 11 || new Set(lineup).size !== 11 || bench.length < 7 || lineup.some((x) => bench.includes(x))) bad.push(`${id} ${f}: formazione incompleta`);
    }
  }
  check('ogni club: almeno 22 giocatori, 2 portieri, 6 difensori, 10 fra centrocampo e attacco, undici titolari in ogni modulo', bad.length === 0, bad.slice(0, 5).join(' | '));
  check('migliaia di giocatori veri', players > 5000, `(${players})`);
  check('ogni modulo ha undici posti con un portiere', Object.values(FORMATIONS).every((f) => f.length === 11 && f.filter((s) => s.role === 'POR').length === 1));
}

/* ------------------------------------------------------------------ */
console.log('— potenziale —');
{
  const all = [];
  for (const [id, c] of Object.entries(leagues.clubs)) for (const r of squads[c.league][id]) all.push(playerFromRow(r, id, 2026));
  const group = (lo, hi) => all.filter((p) => ageOf(p, 2026) >= lo && ageOf(p, 2026) <= hi);
  const share = (list, f) => list.filter(f).length / Math.max(1, list.length);
  check('il potenziale sta fra l’overall e 95', all.every((p) => p.potential >= p.ovr && p.potential <= 95));
  const teens = group(15, 19);
  check('i ragazzi fino a 19 anni hanno quasi tutti margine (≥ 5 punti)', share(teens, (p) => p.potential - p.ovr >= 5) >= 0.7, `(${(share(teens, (p) => p.potential - p.ovr >= 5) * 100).toFixed(0)}%)`);
  const prime = group(25, 28);
  check('fra 25 e 28 anni quasi tutti sono già al massimo', share(prime, (p) => careerPhase(p, 2026) === 'peak') >= 0.85, `(${(share(prime, (p) => careerPhase(p, 2026) === 'peak') * 100).toFixed(0)}%)`);
  const mid = group(22, 24);
  const midPeak = share(mid, (p) => careerPhase(p, 2026) === 'peak');
  check('fra 22 e 24 anni c’è chi cresce ancora e chi è già al massimo', midPeak > 0.2 && midPeak < 0.8, `(${(midPeak * 100).toFixed(0)}% al massimo)`);
  const old = group(32, 45);
  check('dai 32 anni la gran parte è in declino', share(old, (p) => careerPhase(p, 2026) === 'declining') >= 0.75, `(${(share(old, (p) => careerPhase(p, 2026) === 'declining') * 100).toFixed(0)}%)`);
  const keepers = old.filter((p) => p.role === 'POR');
  check('i portieri durano di più', share(keepers, (p) => careerPhase(p, 2026) === 'declining') < share(old.filter((p) => p.role !== 'POR'), (p) => careerPhase(p, 2026) === 'declining'));
  const stars = all.filter((p) => p.potential >= 90);
  check('i futuri fuoriclasse sono pochi (potenziale 90+)', stars.length >= 3 && stars.length <= 40, `(${stars.length})`);
  check('i talenti con potenziale 85+ sono giovani famosi o già forti', all.filter((p) => ageOf(p, 2026) <= 21 && p.potential >= 85).every((p) => p.fame >= 55 || p.ovr >= 72));
  const phases = new Set(all.map((p) => careerPhase(p, 2026)));
  check('tutte e quattro le fasi esistono: talento, in crescita, al massimo, in declino', ['talent', 'growing', 'peak', 'declining'].every((x) => phases.has(x)));
  const young = group(17, 20).slice(0, 300);
  check('la forchetta degli osservatori contiene sempre il potenziale vero', all.every((p) => { const r = potentialRange(p, 2026); return r.lo <= p.potential && r.hi >= p.potential && r.lo >= p.ovr; }));
  const width = (own, staff) => young.reduce((n, p) => { const r = potentialRange(p, 2026, { own, staff }); return n + r.hi - r.lo; }, 0);
  check('i propri giocatori e uno staff bravo si conoscono meglio', width(true, 50) < width(false, 50) && width(false, 90) < width(false, 20));
}

/* ------------------------------------------------------------------ */
console.log('— partite —');
{
  const rand = mulberry32(42);
  const clubs = Object.entries(leagues.clubs);
  const N = 2400;
  let goals = 0, hw = 0, dr = 0, aw = 0, big = 0, bigWins = 0, reds = 0, broken = 0, crazy = 0;
  const ratings = [];
  for (let i = 0; i < N; i++) {
    const lg = leagues.leagues[i % leagues.leagues.length].id;
    const pool = clubs.filter(([, c]) => c.league === lg);
    const [a, ca] = pool[Math.floor(rand() * pool.length)];
    let [b, cb] = pool[Math.floor(rand() * pool.length)];
    if (a === b) [b, cb] = pool[(pool.findIndex(([id]) => id === a) + 1) % pool.length];
    const m = createMatch({ seed: (i * 2654435761) >>> 0, home: team(a, lg, rand), away: team(b, lg, rand) });
    simulateToEnd(m);
    const [H, A] = m.sides;
    if (!m.finished || !Number.isInteger(H.goals) || !Number.isInteger(A.goals)) broken++;
    if (H.goals + A.goals >= 10) crazy++;
    goals += H.goals + A.goals;
    if (H.goals > A.goals) hw++; else if (H.goals === A.goals) dr++; else aw++;
    reds += H.stats.reds + A.stats.reds;
    const gap = ca.strength - cb.strength;
    if (Math.abs(gap) >= 9) { big++; if ((gap > 0 && H.goals > A.goals) || (gap < 0 && A.goals > H.goals)) bigWins++; }
    if (i < 150) Object.values(playerRatings(m)).forEach((r) => ratings.push(r));
    for (const s of m.sides) {
      const subs = m.events.filter((e) => e.type === 'sub' && e.side === s.key).length;
      if (s.onPitch.length > 11 || s.onPitch.length < 7 || subs > 5 || s.subsLeft < 0 || s.windowsLeft < 0) broken++;
    }
  }
  check('ogni partita finisce con un risultato valido, da 7 a 11 in campo e al massimo 5 cambi', broken === 0, `(${broken})`);
  check('partite con dieci o più gol rarissime', crazy / N < 0.004, `(${crazy} su ${N})`);
  const gpm = goals / N;
  check('gol a partita fra 2,4 e 3,1', gpm >= 2.4 && gpm <= 3.1, `(${gpm.toFixed(2)})`);
  check('pareggi fra il 20% e il 31%', dr / N >= 0.2 && dr / N <= 0.31, `(${(dr / N * 100).toFixed(1)}%)`);
  check('fattore campo: vince più la squadra di casa', hw > aw * 1.15, `(${hw}/${aw})`);
  check('la squadra molto più forte vince spesso ma non sempre', bigWins / big > 0.5 && bigWins / big < 0.9, `(${(bigWins / big * 100).toFixed(0)}% su ${big})`);
  check('espulsioni rare', reds / N > 0.03 && reds / N < 0.35, `(${(reds / N).toFixed(3)})`);
  check('voti in pagella fra 3 e 10', ratings.every((r) => r >= 3 && r <= 10) && ratings.length > 1000);
}

/* ------------------------------------------------------------------ */
console.log('— stili —');
{
  /* torneo fra stili con la stessa rosa da entrambe le parti: conta solo lo stile.
     La taratura fine (±5%) è in tools/manager/styles.mjs con molte più partite;
     qui il campione è più piccolo e le soglie tengono conto del rumore (~4%). */
  const rand = mulberry32(7);
  const ids = Object.keys(squads.ita1);
  const pts = Object.fromEntries(STYLE_IDS.map((s) => [s, 0]));
  const games = Object.fromEntries(STYLE_IDS.map((s) => [s, 0]));
  const bestSomewhere = new Set();
  let seed = 1;
  for (const club of ['torino', 'bologna', 'napoli', 'lecce']) {
    const id = ids.find((x) => x.includes(club));
    const local = Object.fromEntries(STYLE_IDS.map((s) => [s, 0]));
    for (const a of STYLE_IDS) for (const b of STYLE_IDS) {
      if (a === b) continue;
      for (let i = 0; i < 5; i++) {
        const m = createMatch({ seed: seed++, home: team(id, 'ita1', rand, a, 'H'), away: team(id, 'ita1', rand, b, 'A') });
        simulateToEnd(m);
        const [H, A] = m.sides;
        const ph = H.goals > A.goals ? 3 : H.goals === A.goals ? 1 : 0;
        const pa = A.goals > H.goals ? 3 : H.goals === A.goals ? 1 : 0;
        pts[a] += ph; pts[b] += pa; local[a] += ph; local[b] += pa; games[a]++; games[b]++;
      }
    }
    Object.entries(local).sort((x, y) => y[1] - x[1]).slice(0, 3).forEach(([st]) => bestSomewhere.add(st));
  }
  const per = Object.fromEntries(STYLE_IDS.map((s) => [s, pts[s] / games[s]]));
  const mean = Object.values(per).reduce((a, b) => a + b, 0) / STYLE_IDS.length;
  const devs = Object.entries(per).map(([st, v]) => [st, v / mean - 1]).sort((x, y) => y[1] - x[1]);
  check('almeno dodici stili selezionabili', STYLE_IDS.length >= 12, `(${STYLE_IDS.length})`);
  check('con la stessa rosa nessuno stile domina', devs[0][1] <= 0.12, `(${devs[0][0]} +${(devs[0][1] * 100).toFixed(1)}%)`);
  check('con la stessa rosa nessuno stile è inutile', devs[devs.length - 1][1] >= -0.12, `(${devs[devs.length - 1][0]} ${(devs[devs.length - 1][1] * 100).toFixed(1)}%)`);
  check('stili diversi sono i migliori con rose diverse', bestSomewhere.size >= 6, `(${[...bestSomewhere].join(', ')})`);
}

/* ------------------------------------------------------------------ */
console.log('— scelte in partita —');
{
  const rand = mulberry32(11);
  const ids = Object.keys(squads.ita1);
  let offered = 0; let matches = 0; let decided = 0; let errors = 0;
  const byMoment = {};
  const optionIds = {};
  for (let i = 0; i < 160; i++) {
    const a = ids[i % ids.length]; const b = ids[(i * 7 + 3) % ids.length];
    if (a === b) continue;
    const m = createMatch({ seed: 900 + i, home: team(a, 'ita1', rand), away: team(b, 'ita1', rand), user: i % 2 ? 'home' : 'away' });
    matches++;
    let guard = 0;
    while (!m.finished && guard++ < 500) {
      if (m.pending) {
        offered++;
        const open = m.pending.options.filter((o) => !o.disabled);
        byMoment[m.pending.id] = (byMoment[m.pending.id] || 0) + 1;
        if (!open.length) { errors++; break; }
        const pick = open[Math.floor(rand() * open.length)];
        optionIds[`${m.pending.id}:${pick.id}`] = true;
        try { decide(m, pick.id); decided++; } catch { errors++; break; }
        /* le opzioni sono dati puri: la partita in attesa si salva */
        continue;
      }
      tick(m);
    }
    if (!m.finished) errors++;
  }
  check('ogni partita dal vivo arriva in fondo', errors === 0, `(${errors})`);
  check('da 2 a 6 scelte a partita in media', offered / matches >= 2 && offered / matches <= 6, `(${(offered / matches).toFixed(2)})`);
  check('scelte di tipo diverso', Object.keys(byMoment).length >= 8, JSON.stringify(byMoment));
  /* salvataggio a metà momento */
  const m = createMatch({ seed: 5, home: team(ids[0], 'ita1', rand), away: team(ids[1], 'ita1', rand), user: 'home' });
  let guard = 0;
  while (!m.pending && !m.finished && guard++ < 200) tick(m);
  const json = JSON.stringify(serializeMatch(m));
  const players = m.sides.flatMap((s) => s.team.players);
  const back = restoreMatch(JSON.parse(json), (id) => players.find((p) => p.id === id));
  check('una partita con una scelta aperta si salva e si riprende', Boolean(m.pending) && JSON.stringify(serializeMatch(back)) === json);
}

/* ------------------------------------------------------------------ */
console.log('— calendario e classifica —');
{
  const rand = mulberry32(3);
  for (const n of [18, 20, 22, 24]) {
    const ids = Array.from({ length: n }, (_, i) => `t${i}`);
    const fx = makeFixtures(ids, rand);
    const pairs = new Map();
    let onceEach = true; let maxRun = 0;
    fx.forEach((round) => {
      const seen = new Set();
      for (const f of round) {
        if (seen.has(f.h) || seen.has(f.a)) onceEach = false;
        seen.add(f.h); seen.add(f.a);
        pairs.set(`${f.h}>${f.a}`, (pairs.get(`${f.h}>${f.a}`) || 0) + 1);
      }
      if (seen.size !== n) onceEach = false;
    });
    for (const id of ids) {
      let run = 0; let last = null;
      fx.forEach((round) => {
        const f = round.find((x) => x.h === id || x.a === id);
        const v = f.h === id ? 'H' : 'A';
        run = v === last ? run + 1 : 1; last = v;
        maxRun = Math.max(maxRun, run);
      });
    }
    check(`${n} squadre: ${2 * (n - 1)} giornate, tutti giocano una volta a giornata`, fx.length === 2 * (n - 1) && onceEach);
    check(`${n} squadre: ogni coppia si affronta in casa e in trasferta`, pairs.size === n * (n - 1) && [...pairs.values()].every((v) => v === 1));
    check(`${n} squadre: mai più di tre partite di fila nello stesso campo`, maxRun <= 3, `(${maxRun})`);
    /* risultati a caso: la classifica deve tornare con i conti */
    fx.forEach((round) => round.forEach((f) => { f.res = [Math.floor(rand() * 4), Math.floor(rand() * 4)]; }));
    for (const tiebreak of ['gd', 'h2h']) {
      const rows = standings(ids, fx, { tiebreak });
      const okRows = rows.every((r) => r.p === 2 * (n - 1) && r.w + r.d + r.l === r.p && r.pts === r.w * 3 + r.d && r.gd === r.gf - r.ga);
      const gf = rows.reduce((a, r) => a + r.gf, 0); const ga = rows.reduce((a, r) => a + r.ga, 0);
      const ordered = rows.every((r, i) => i === 0 || rows[i - 1].pts >= r.pts);
      const gdOrder = tiebreak !== 'gd' || rows.every((r, i) => i === 0 || rows[i - 1].pts > r.pts || rows[i - 1].gd >= r.gd);
      check(`${n} squadre (${tiebreak}): punti, differenza reti e ordine corretti`, okRows && gf === ga && ordered && gdOrder && rows.map((r) => r.pos).join() === ids.map((_, i) => i + 1).join());
    }
  }
  /* classifica avulsa a tre: A batte B, B batte C, C batte A, stessi punti */
  const ids = ['a', 'b', 'c', 'd'];
  const fx = [[{ h: 'a', a: 'b', res: [1, 0] }, { h: 'c', a: 'd', res: [0, 0] }], [{ h: 'b', a: 'c', res: [3, 0] }, { h: 'd', a: 'a', res: [0, 0] }], [{ h: 'c', a: 'a', res: [2, 0] }, { h: 'b', a: 'd', res: [0, 0] }]];
  const rows = standings(ids, fx, { tiebreak: 'h2h' });
  check('classifica avulsa a tre squadre: prima la differenza reti negli scontri diretti', rows.slice(0, 3).map((r) => r.id).join() === 'b,c,a', rows.map((r) => `${r.id}${r.pts}`).join(' '));
  for (const l of leagues.leagues) {
    const z = zones(l);
    const down = Object.values(z).filter((v) => v === 'down').length;
    check(`${l.id}: zone della classifica coerenti`, down === (l.down || 0) && Object.keys(z).every((p) => p >= 1 && p <= l.teams));
  }
}

/* ------------------------------------------------------------------ */
console.log('— stagioni intere, un club per campionato —');
const careers = [];
{
  const clubs = Object.entries(leagues.clubs);
  let crashes = 0;
  for (const [i, l] of leagues.leagues.entries()) {
    const pool = clubs.filter(([, c]) => c.league === l.id).sort((a, b) => b[1].strength - a[1].strength);
    const clubId = pool[(i * 5) % pool.length][0];
    try {
      const career = newCareer(data, { seed: 100 + i, name: 'Prova', nation: 'IT', style: STYLE_IDS[i % STYLE_IDS.length], clubId });
      planWeek(career, data, events);
      const rand = mulberry32(i + 1);
      const sizes = [];
      playSeason(career, { choose: (ev) => Math.floor(rand() * ev.o.length), onMatchday: (c) => { const sq = squadOf(c, c.club).filter((p) => !p.loanOut); sizes.push([sq.length, sq.filter((p) => p.role === 'POR').length]); } });
      const rows = table(career, data);
      const played = rows.every((r) => r.p === career.fixtures.length);
      check(`${l.id} ${leagues.clubs[clubId].name}: stagione completa (${career.phase === 'sacked' ? 'esonerato' : 'finita'})`, career.phase === 'sacked' || (played && rows.length === l.teams));
      check(`${l.id}: la rosa non scende mai sotto 20 giocatori né resta senza portiere`, sizes.every(([n, gk]) => n >= 20 && gk >= 1), `(${Math.min(...sizes.map((x) => x[0]))})`);
      careers.push(career);
    } catch (e) {
      crashes++;
      console.log(`  ${l.id}: ${e.stack}`);
    }
  }
  check('nessuna eccezione in dieci stagioni', crashes === 0);
}

/* ------------------------------------------------------------------ */
console.log('— più stagioni: crescita, declino, promozioni —');
{
  const clubId = Object.keys(leagues.clubs).find((id) => id.includes('torino'));
  const career = newCareer(data, { seed: 3, name: 'Prova', nation: 'IT', style: 'gegenpressing', clubId });
  const start = Object.fromEntries(squadOf(career, clubId).map((p) => [p.id, p.ovr]));
  let exceptions = 0; const summaries = [];
  const deltas = [];
  for (let s = 0; s < 3; s++) {
    try {
      planWeek(career, data, events);
      playSeason(career);
      const before = Object.fromEntries(Object.values(career.players).map((p) => [p.id, { ovr: p.ovr, apps: p.stats.apps, avg: p.stats.apps ? p.stats.ratingSum / p.stats.apps : 0, age: ageOf(p, career.season), club: p.club }]));
      if (career.phase === 'sacked' && career.md < career.fixtures.length) { takeJob(career, data, jobOffers(career, data)[0].club); continue; }
      const sum = endSeason(career, data);
      summaries.push(sum);
      for (const p of Object.values(career.players)) {
        const b = before[p.id];
        if (b && b.club === career.club && b.apps >= 15) deltas.push({ d: p.ovr - b.ovr, avg: b.avg, age: b.age });
      }
      if (career.phase === 'sacked') takeJob(career, data, jobOffers(career, data)[0].club);
      else beginNextSeason(career, data);
    } catch (e) { exceptions++; console.log(e.stack); break; }
  }
  check('tre stagioni di fila senza eccezioni', exceptions === 0 && summaries.length >= 2);
  const all = Object.values(career.players);
  check('gli overall restano fra 40 e 95', all.every((p) => p.ovr >= 40 && p.ovr <= 95), `(${Math.min(...all.map((p) => p.ovr))}-${Math.max(...all.map((p) => p.ovr))})`);
  check('gli overall combaciano con le doti', all.slice(0, 300).every((p) => Math.abs(overallOf(p.attrs, p.role) - p.ovr) <= 1));
  /* l'allenatore può aver cambiato panchina: si guarda la cronologia del voto di chi è nel mondo adesso */
  void start;
  const changed = squadOf(career, career.club).filter((p) => new Set([...(p.history || []).map((h) => h.ovr), p.ovr]).size > 1).length;
  check('gli overall della rosa si muovono', changed >= 8, `(${changed})`);
  void deltas;
  const verdicts = summaries.map((s) => s.verdict);
  check('ogni stagione ha un verdetto e una classifica finale', verdicts.every(Boolean) && summaries.every((s) => s.table.length >= 18));
  const moves = summaries.every((s) => {
    const l = leagueOf(data, s.league);
    return l.level === 1
      ? s.moves.down.length >= (l.down || 0) && s.moves.inFrom.length === s.moves.down.length
      : s.moves.up.length >= (l.up || 0) && s.moves.inFrom.length === s.moves.up.length;
  });
  check('promozioni e retrocessioni a ogni stagione, con le squadre che prendono il posto', moves, JSON.stringify(summaries.map((s) => [s.league, s.moves.up.length, s.moves.down.length, s.moves.inFrom.length])));
}

/* ------------------------------------------------------------------ */
console.log('— sviluppo dei giocatori in tre stagioni —');
{
  /* un mondo senza esoneri: si guarda solo come crescono e calano i giocatori */
  const career = newCareer(data, { seed: 9, name: 'Prova', nation: 'IT', style: 'equilibrio', clubId: Object.keys(leagues.clubs).find((id) => id.includes('atalanta')) });
  const keyOf = (p) => `${p.name}|${p.birth}`;
  const start = Object.fromEntries(Object.values(career.players).map((p) => [keyOf(p), { ovr: p.ovr, pot: p.potential, phase: careerPhase(p, career.season), age: ageOf(p, career.season), peak: p.peakAge, decline: p.declineAge }]));
  const strength0 = Object.keys(career.clubs).reduce((n, id) => n + squadOf(career, id).filter((p) => !p.loanOut).map((p) => p.ovr).sort((a, b) => b - a).slice(0, 14).reduce((x, y) => x + y, 0) / 14, 0) / 20;
  const minutes = {}; const seasonRows = [];
  for (let s = 0; s < 3; s++) {
    playSeason(career, { onMatchday: (c) => { c.board.trust = 90; c.board.ultimatum = null; c.board.sacked = false; } });
    for (const p of Object.values(career.players)) {
      const k = keyOf(p);
      minutes[k] = (minutes[k] || 0) + (p.stats.minutes || 0) + (p.loanOut ? 2000 : 0);
      if (p.stats.apps >= 15) seasonRows.push({ k, ovr: p.ovr, avg: p.stats.ratingSum / p.stats.apps, role: p.role, age: ageOf(p, career.season), peak: p.peakAge, decline: p.declineAge });
    }
    const before = Object.fromEntries(seasonRows.filter((r) => !r.done).map((r) => [r.k, r]));
    career.board.trust = 90;
    endSeason(career, data);
    for (const p of Object.values(career.players)) { const r = before[keyOf(p)]; if (r && !r.done) { r.after = p.ovr; r.done = true; } }
    beginNextSeason(career, data);
  }
  const moves = { grow: [], bench: [], peak: [], decline: [] };
  for (const p of Object.values(career.players)) {
    const a = start[keyOf(p)];
    if (!a) continue;
    const per = (minutes[keyOf(p)] || 0) / 3;
    const d = p.ovr - a.ovr;
    if (a.phase === 'talent' || a.phase === 'growing') { if (per >= 1500) moves.grow.push({ d }); else if (per < 400) moves.bench.push({ d }); }
    else if (a.phase === 'peak') moves.peak.push({ d });
    else moves.decline.push({ d });
  }
  const avg = (l) => l.reduce((n, x) => n + x.d, 0) / Math.max(1, l.length);
  check('i giovani che giocano crescono davvero', moves.grow.length >= 5 && avg(moves.grow) >= 2, `(${avg(moves.grow).toFixed(2)} su ${moves.grow.length})`);
  check('i giovani che giocano crescono più di quelli in panchina', avg(moves.grow) > avg(moves.bench) + 1, `(${avg(moves.grow).toFixed(2)} contro ${avg(moves.bench).toFixed(2)})`);
  check('chi era al massimo resta più o meno lì', Math.abs(avg(moves.peak)) <= 1.5, `(${avg(moves.peak).toFixed(2)} su ${moves.peak.length})`);
  check('chi era in declino cala', moves.decline.length >= 5 && avg(moves.decline) <= -1.5, `(${avg(moves.decline).toFixed(2)} su ${moves.decline.length})`);
  /* a parità di fase, chi ha voti sopra la media del ruolo cresce più di chi sta sotto */
  const rows = seasonRows.filter((r) => r.done && r.age >= r.peak && r.age < r.decline);
  const pivot = { POR: 6.69, DC: 6.19, TZ: 6.3, MED: 6.41, CC: 6.54, TRQ: 6.58, ALA: 6.7, PUN: 6.22 };
  const good = rows.filter((r) => r.avg >= pivot[r.role] + 0.25).map((r) => ({ d: r.after - r.ovr }));
  const bad = rows.filter((r) => r.avg <= pivot[r.role] - 0.2).map((r) => ({ d: r.after - r.ovr }));
  check('chi rende sopra la media del ruolo cresce più di chi rende sotto', good.length >= 5 && bad.length >= 5 && avg(good) > avg(bad), `(${avg(good).toFixed(2)} su ${good.length} contro ${avg(bad).toFixed(2)} su ${bad.length})`);
  const strength1 = Object.keys(career.clubs).reduce((n, id) => n + squadOf(career, id).filter((p) => !p.loanOut).map((p) => p.ovr).sort((a, b) => b - a).slice(0, 14).reduce((x, y) => x + y, 0) / 14, 0) / 20;
  check('il livello del campionato resta stabile nel tempo', Math.abs(strength1 - strength0) <= 2, `(${strength0.toFixed(1)} → ${strength1.toFixed(1)})`);
  const elite = Object.values(career.players).filter((p) => p.ovr >= 90).length;
  check('i fuoriclasse restano rari', elite <= 4, `(${elite})`);
}

/* ------------------------------------------------------------------ */
console.log('— dirigenza: esonero —');
{
  const clubs = Object.entries(leagues.clubs).filter(([, c]) => c.league === 'ita1').sort((a, b) => b[1].strength - a[1].strength);
  /* raggiungibile: una grande squadra con la rosa azzoppata */
  const topId = clubs[0][0];
  const doomed = newCareer(data, { seed: 21, name: 'Prova', nation: 'IT', style: 'equilibrio', clubId: topId });
  for (const p of squadOf(doomed, topId)) {
    for (const k of Object.keys(p.attrs)) p.attrs[k] = Math.min(p.attrs[k], 34);
    p.ovr = overallOf(p.attrs, p.role);
  }
  let reports = [];
  playSeason(doomed, { onMatchday: (_, r) => reports.push(r) });
  check('una stagione disastrosa porta all’ultimatum e all’esonero', doomed.phase === 'sacked' && doomed.md < doomed.fixtures.length, `(${doomed.phase} alla giornata ${doomed.md})`);
  check('prima dell’esonero arriva un ultimatum', reports.some((r) => r.board?.ultimatum === 'given'));
  const offers = jobOffers(doomed, data);
  check('dopo l’esonero arrivano offerte da altri club', offers.length >= 1 && offers.every((o) => o.club !== topId));
  takeJob(doomed, data, offers[0].club);
  check('si riparte da un nuovo club', doomed.club === offers[0].club && doomed.phase === 'season');
  /* evitabile: una grande squadra che vince */
  let kept = 0;
  for (let s = 0; s < 3; s++) {
    const c = newCareer(data, { seed: 60 + s, name: 'Prova', nation: 'IT', style: 'equilibrio', clubId: clubs[s][0] });
    planWeek(c, data, events);
    playSeason(c);
    if (c.phase !== 'sacked') kept++;
  }
  check('le grandi squadre ben guidate non vengono esonerate', kept >= 2, `(${kept}/3)`);
  reports = null;
}

/* ------------------------------------------------------------------ */
console.log('— mercato —');
{
  const clubs = Object.entries(leagues.clubs).filter(([, c]) => c.league === 'ita1').sort((a, b) => a[1].strength - b[1].strength);
  const base = newCareer(data, { seed: 31, name: 'Prova', nation: 'IT', style: 'equilibrio', clubId: clubs[8][0] });
  check('il mercato estivo è aperto alla prima giornata', windowOpen(base));
  const found = search(base, data, {}, 60);
  check('la ricerca trova giocatori di altri club con prezzo e ingaggio', found.length >= 20 && found.every((x) => x.clubId !== base.club && x.price > 0 && x.wage > 0));
  const snapshot = JSON.stringify(base);
  const fresh = () => JSON.parse(snapshot);
  /* un allenatore ragionevole: offre poco sotto la richiesta, accetta i rilanci del club
     e le controproposte del procuratore, firma anche con un problema alle visite */
  const fair = (career, cand, kind = 'buy') => {
    const club = career.clubs[career.club];
    club.budget = 400; club.wageBudget = 200;
    const o = openTalks(career, data, cand, kind);
    if (!o.talk) return { error: o.error };
    const t = o.talk;
    let guard = 0;
    while (t.stage === 'club' && guard++ < 10) bidClub(career, data, t.id, { fee: guard === 1 ? t.ask * 0.9 : t.ask });
    guard = 0;
    while (t.stage === 'player' && guard++ < 10) {
      const c = t.counter || t.demand;
      offerContract(career, data, t.id, { wage: c.wage, years: c.years, role: c.role });
    }
    if (t.stage === 'medicalIssue') medicalChoice(career, data, t.id, 'proceed');
    return { talk: t, career };
  };
  const pool = search(base, data, { ovrMax: 84 }, 400).filter((_, i) => i % 3 === 0).slice(0, 90);
  const outcomes = {}; let signed = 0; let consistent = 0; let promises = 0; let starters = 0;
  for (const cand of pool) {
    const career = fresh();
    const c2 = search(career, data, { query: cand.player.name }, 5).find((x) => x.player.name === cand.player.name && x.clubId === cand.clubId);
    if (!c2) continue;
    const before = career.clubs[career.club].squad.length;
    const res = fair(career, c2);
    if (!res.talk) { outcomes[res.error] = (outcomes[res.error] || 0) + 1; continue; }
    const t = res.talk;
    outcomes[t.stage === 'signed' ? 'signed' : t.reason] = (outcomes[t.stage === 'signed' ? 'signed' : t.reason] || 0) + 1;
    if (t.stage === 'signed') {
      signed++;
      const p = career.players[t.signedId];
      const club = career.clubs[career.club];
      if (p && club.squad.length === before + 1 && p.wage === t.contract.wage && p.contract === career.season + t.contract.years && Math.abs(club.budget - (400 - t.fee - t.agentFee)) < 0.2) consistent++;
      if (t.contract.role === 'starter') { starters++; if ((career.promises || []).some((x) => x.player === t.signedId && x.need === 6)) promises++; }
    }
  }
  const total = Object.values(outcomes).reduce((a, b) => a + b, 0);
  check('le trattative ragionevoli spesso vanno in porto, ma non sempre', signed / total >= 0.3 && signed / total <= 0.9, JSON.stringify(outcomes));
  check('le trattative saltano per motivi diversi', Object.keys(outcomes).filter((k) => k !== 'signed' && k !== 'noLoan').length >= 2, JSON.stringify(outcomes));
  check('chi firma arriva con i soldi, l’ingaggio e gli anni pattuiti', signed > 0 && consistent === signed, `(${consistent}/${signed})`);
  check('il ruolo da titolare promesso diventa una promessa da mantenere', starters === 0 || promises === starters, `(${promises}/${starters})`);

  /* offerte al ribasso: il club perde la pazienza */
  let broke = 0; let tries = 0;
  for (const cand of pool.slice(0, 30)) {
    const career = fresh();
    career.clubs[career.club].budget = 400;
    const o = openTalks(career, data, cand);
    if (!o.talk) continue;
    tries++;
    let g = 0;
    while (o.talk.stage === 'club' && g++ < 10) bidClub(career, data, o.talk.id, { fee: Math.max(0.1, o.talk.startAsk * 0.5) });
    if (o.talk.stage === 'collapsed' && ['clubBroke', 'hijacked'].includes(o.talk.reason)) broke++;
  }
  check('chi offre la metà viene mandato via', tries >= 10 && broke === tries, `(${broke}/${tries})`);

  /* niente trucchi: la stessa trattativa non si rigioca */
  {
    const career = fresh();
    career.clubs[career.club].budget = 400;
    const cand = pool[3];
    const a = openTalks(career, data, cand).talk;
    const b = openTalks(career, data, cand).talk;
    check('riaprire una trattativa restituisce la stessa', a && a === b);
    withdrawTalk(career, a.id);
    const c = openTalks(career, data, cand).talk;
    check('una trattativa saltata resta saltata per tutta la finestra', c === a && c.stage === 'collapsed');
    const twin = fresh();
    twin.clubs[twin.club].budget = 400;
    const x = openTalks(twin, data, pool[5]).talk; const y = openTalks(fresh(), data, pool[5]).talk;
    check('stesse mosse, stesse risposte', JSON.stringify({ ...x, log: x.log.length }) === JSON.stringify({ ...y, log: y.log.length }));
    check('senza soldi non si offre', bidClub(twin, data, x.id, { fee: 9999 }).status === 'noBudget');
    bidClub(twin, data, x.id, { fee: x.ask * 2 });
    if (x.stage === 'player') {
      const room = wageRoom(twin);
      check('senza spazio nel monte ingaggi non si firma', offerContract(twin, data, x.id, { wage: room + 5, years: 3, role: 'starter' }).status === 'noWages');
    }
  }

  /* la finestra chiude: le trattative aperte saltano */
  {
    const career = fresh();
    career.clubs[career.club].budget = 400;
    const t = openTalks(career, data, pool[7]).talk;
    const sizes0 = Object.fromEntries(Object.keys(career.clubs).map((id) => [id, squadOf(career, id).filter((p) => !p.loanOut).length]));
    let g = 0;
    while (career.md < 3 && g++ < 5) {
      const nf = nextFixture(career);
      if (nf) { const m = startUserMatch(career); m.autoUser = true; simulateToEnd(m); applyMatch(career, m, nf.fixture); }
      simulateRest(career);
      closeMatchday(career, data);
    }
    check('a mercato chiuso le trattative aperte saltano', t.stage === 'collapsed' && ['windowClosed', 'hijacked'].includes(t.reason), `(${t.stage} ${t.reason})`);
    check('anche i club del computer comprano', (career.news || []).length >= 1, `(${(career.news || []).length})`);
    const aiIds = Object.keys(career.clubs).filter((id) => id !== career.club);
    const ok = aiIds.every((id) => { const n = squadOf(career, id).filter((p) => !p.loanOut).length; return n >= 20 && n <= Math.max(sizes0[id], 29); });
    check('gli acquisti del computer non gonfiano né svuotano le rose', ok);
  }

  /* visite mediche: un giocatore infortunato non passa liscio */
  {
    const live = search(base, data, {}, 400).filter((x) => x.live).slice(0, 40);
    let issues = 0; let walked = 0; let signedHurt = 0;
    for (const [i, cand] of live.entries()) {
      const career = fresh();
      const p = career.players[cand.player.id];
      p.injury = 4;
      const c2 = { ...cand, player: p };
      career.clubs[career.club].budget = 400; career.clubs[career.club].wageBudget = 200;
      const t = openTalks(career, data, c2).talk;
      if (!t) continue;
      let g = 0;
      while (t.stage === 'club' && g++ < 6) bidClub(career, data, t.id, { fee: t.ask * 1.2 });
      g = 0;
      while (t.stage === 'player' && g++ < 6) { const c = t.counter || t.demand; offerContract(career, data, t.id, { wage: c.wage * 1.25, years: c.years, role: 'starter' }); }
      if (t.stage !== 'medicalIssue') continue;
      issues++;
      if (i % 2) { medicalChoice(career, data, t.id, 'walk'); if (t.reason === 'medical') walked++; }
      else { medicalChoice(career, data, t.id, 'proceed'); if (t.stage === 'signed' && career.players[t.signedId].injury >= 4) signedHurt++; }
    }
    check('le visite mediche trovano gli infortuni', issues >= 5, `(${issues})`);
    check('dopo le visite si può lasciar perdere o firmare lo stesso', walked >= 1 && signedHurt >= 1, `(${walked}, ${signedHurt})`);
  }

  /* offerte ricevute: controproposte, rilanci, rifiuti */
  {
    const career = fresh();
    const mine = squadOf(career, career.club).filter((p) => p.role !== 'POR').sort((a, b) => b.ovr - a.ovr);
    const mk = (p, extra) => { const o = { id: `t-${p.id}`, player: p.id, club: clubs[19][0], clubName: 'Test', fee: 10, expires: 99, max: 14, patience: 2, stance: 'open', ...extra }; career.offersIn = [...(career.offersIn || []), o]; return o.id; };
    check('una controproposta entro il massimo chiude l’affare', counterIncoming(career, data, mk(mine[0]), 13).status === 'sold' && !career.players[mine[0].id]);
    const id2 = mk(mine[1]);
    const r2 = counterIncoming(career, data, id2, 20);
    check('una controproposta troppo alta fa rilanciare il compratore', r2.status === 'raised' && r2.fee > 10 && r2.fee <= 14);
    check('insistere troppo lo fa andare via', counterIncoming(career, data, id2, 20).status === 'walkedAway' && !career.offersIn.some((o) => o.id === id2));
    check('un giocatore legato al club rifiuta di partire', acceptOffer(career, data, mk(mine[2], { stance: 'refuses' })).status === 'playerRefuses' && career.players[mine[2].id]);
    const morale = mine[3].morale;
    rejectOffer(career, mk(mine[3], { stance: 'wants' }));
    check('dire di no a chi voleva andare lo fa arrabbiare', mine[3].morale < morale);
  }

  /* la rosa minima: si svincola fino a 20, poi basta */
  {
    const career = fresh();
    const club = career.clubs[career.club];
    let blocked = null; let guard = 0;
    while (!blocked && guard++ < 40) {
      const squad = squadOf(career, career.club).filter((p) => !p.loanOut).sort((a, b) => a.ovr - b.ovr);
      const p = squad.find((x) => x.role !== 'POR') || squad[0];
      club.budget = 999;
      const r = release(career, p.id);
      if (r.status !== 'released') blocked = r.status;
    }
    check(`gli svincoli si fermano a ${SQUAD_MIN} giocatori`, blocked === 'squadMin' && squadOf(career, career.club).filter((p) => !p.loanOut).length === SQUAD_MIN, `(${blocked})`);
    const keepers = squadOf(career, career.club).filter((p) => p.role === 'POR' && !p.loanOut);
    check('non si resta mai con un solo portiere', keepers.length >= 2 && (keepers.length > 2 || canLetGo(career, keepers[0]) !== null));
    career.offersIn = [{ id: 'x', player: keepers[0].id, club: clubs[5][0], clubName: 'X', fee: 5, expires: 99, max: 6, patience: 2, stance: 'open' }];
    check('un’offerta accettata non scavalca la rosa minima', acceptOffer(career, data, 'x').status !== 'sold' && career.players[keepers[0].id]);
    const sub = squadOf(career, career.club).find((p) => p.role === 'POR');
    applyFx(career, data, { sell: 0.8 }, sub, mulberry32(4));
    const after = squadOf(career, career.club).filter((p) => !p.loanOut);
    check('dopo una cessione in un evento restano 20 giocatori e due portieri', after.length >= SQUAD_MIN && after.filter((p) => p.role === 'POR').length >= 2);
  }
  /* la richiesta del procuratore è un impegno: pareggiarla chiude sempre, anche all'ultima occasione */
  {
    let tested = 0; let broken = 0; let lastChance = 0; let countered = 0; let counterBroken = 0;
    for (const cand of pool.slice(0, 80)) {
      for (const mode of ['demand', 'counter']) {
        const career = fresh();
        const club = career.clubs[career.club];
        club.budget = 400; club.wageBudget = 200;
        const o = openTalks(career, data, cand);
        if (!o.talk) continue;
        const tk = o.talk;
        let g = 0;
        while (tk.stage === 'club' && g++ < 10) bidClub(career, data, tk.id, { fee: tk.ask });
        if (tk.stage !== 'player') continue;
        const d = { ...tk.demand };
        if (mode === 'demand') {
          /* due proposte basse, poi la cifra chiesta all'ultima occasione */
          offerContract(career, data, tk.id, { wage: d.wage * 0.55, years: d.years, role: d.role });
          if (tk.stage === 'player') offerContract(career, data, tk.id, { wage: d.wage * 0.6, years: d.years, role: d.role });
          if (tk.stage !== 'player') continue;
          if (tk.playerPatience === 1) lastChance++;
          tested++;
          const r = offerContract(career, data, tk.id, { wage: d.wage, years: d.years, role: d.role });
          if (!['signed', 'medicalIssue'].includes(r.status)) broken++;
        } else {
          /* una proposta bassa, poi si accetta la controproposta così com'è */
          const r0 = offerContract(career, data, tk.id, { wage: d.wage * 0.8, years: d.years, role: d.role });
          if (r0.status !== 'countered') continue;
          countered++;
          const c = tk.counter;
          const r = offerContract(career, data, tk.id, { wage: c.wage, years: c.years, role: c.role });
          if (!['signed', 'medicalIssue'].includes(r.status)) counterBroken++;
        }
      }
    }
    check('pareggiare la richiesta del procuratore chiude sempre, anche all’ultima occasione', tested >= 15 && broken === 0 && lastChance >= 5, `(${broken}/${tested}, all’ultima ${lastChance})`);
    check('accettare la controproposta del procuratore chiude sempre', countered >= 10 && counterBroken === 0, `(${counterBroken}/${countered})`);
  }

  /* liste trasferimenti e prestiti: più offerte, soldi divisi, messaggio */
  {
    const career = fresh();
    const club = career.clubs[career.club];
    const outfield = squadOf(career, career.club).filter((x) => x.role !== 'POR').sort((a, b) => b.ovr - a.ovr);
    const sellers = outfield.slice(4, 9);
    for (const p of sellers) setListed(career, data, p.id, 'transfer');
    const offersOf = (p) => career.offersIn.filter((o) => o.player === p.id);
    check('in lista trasferimenti arrivano subito offerte, da club diversi', sellers.every((p) => offersOf(p).length >= 1 && new Set(offersOf(p).map((o) => o.club)).size === offersOf(p).length && listOf(p) === 'transfer'));
    /* una giornata di mercato dopo: altre offerte */
    const nf = nextFixture(career);
    const m = startUserMatch(career); m.autoUser = true; simulateToEnd(m); applyMatch(career, m, nf.fixture);
    simulateRest(career); closeMatchday(career, data); incomingOffers(career, data);
    const alive = sellers.filter((p) => career.players[p.id]);
    check('con il mercato aperto le offerte continuano ad arrivare', alive.some((p) => offersOf(p).length >= 2), alive.map((p) => offersOf(p).length).join(','));
    const target = alive.find((p) => offersOf(p).some((o) => o.stance !== 'refuses'));
    const o = offersOf(target).filter((x) => x.stance !== 'refuses').sort((a, b) => b.fee - a.fee)[0];
    const budget0 = club.budget; const rev0 = club.revenue || 0;
    const res = acceptOffer(career, data, o.id);
    check('la cessione va in porto', res.status === 'sold' && !career.players[target.id]);
    check(`il ${100 - CLUB_CUT * 100}% dell’incasso va al budget di mercato, il ${CLUB_CUT * 100}% alla società`, Math.abs(club.budget - (budget0 + o.fee * (1 - CLUB_CUT))) < 0.11 && Math.abs(club.revenue - rev0 - o.fee * CLUB_CUT) < 0.11, `(${budget0} → ${club.budget}, fee ${o.fee})`);
    check('un messaggio racconta cessione e soldi', career.inbox[0].key === 'sold' && career.inbox[0].vars.toBudget === res.toBudget && career.inbox[0].vars.club === o.clubName);
    check('venduto il giocatore, le altre offerte per lui spariscono', !career.offersIn.some((x) => x.player === target.id));
    /* il prestito: resta nostro, gioca altrove, torna a fine stagione */
    const young = squadOf(career, career.club).filter((x) => !x.loanOut && x.role !== 'POR' && ageOf(x, career.season) <= 22).sort((a, b) => a.ovr - b.ovr);
    let loaned = null;
    for (const y of young) {
      setListed(career, data, y.id, 'loan');
      const lo = offersOf(y).find((x) => x.kind === 'loan' && x.stance !== 'refuses');
      if (!lo) continue;
      const r = acceptOffer(career, data, lo.id);
      if (r.status === 'loaned') { loaned = y; break; }
    }
    check('un giovane in lista prestiti parte in prestito', loaned && loaned.loanOut && loaned.loanTo && career.clubs[career.club].squad.includes(loaned.id) && career.inbox[0].key === 'loanedOut');
    /* a mercato chiuso niente offerte, e quelle vecchie scadono */
    career.md = 5;
    incomingOffers(career, data);
    check('a mercato chiuso le offerte scadono', (career.offersIn || []).length === 0);
    if (loaned) {
      career.md = career.fixtures.length;
      career.phase = 'seasonEnd';
      const sum = endSeason(career, data);
      const back = career.players[loaned.id];
      check('a fine stagione il prestito finisce e il giocatore torna', !back || (!back.loanOut && !back.loanTo && sum.returned.some((x) => x.id === loaned.id)));
    }
  }
  void payClause; void talkById; void isOpenTalk;
}

/* ------------------------------------------------------------------ */
console.log('— partite: nessuna scelta dopo il fischio, tabellino giusto —');
{
  const clubs = Object.entries(leagues.clubs).filter(([, c]) => c.league === 'ita1').map(([id]) => id);
  let afterWhistle = 0; let lateSetPiece = 0; let timelineOk = 0; let n = 0; let addedOk = true;
  for (let i = 0; i < 300; i++) {
    const rand = mulberry32(900 + i);
    const h = clubs[i % clubs.length]; const a = clubs[(i * 7 + 3) % clubs.length];
    if (h === a) continue;
    const m = createMatch({ seed: 5000 + i, home: team(h, 'ita1', rand, null, ':h'), away: team(a, 'ita1', rand, null, ':a'), user: i % 2 ? 'home' : 'away' });
    let g = 0;
    while (!m.finished && g++ < 900) {
      if (m.pending) {
        if (m.minute >= 89 && ['penalty', 'freekick'].includes(m.pending.id)) lateSetPiece++;
        decide(m, m.pending.options.find((o) => !o.disabled).id);
      } else tick(m);
      if (m.finished && m.pending) afterWhistle++;
    }
    n++;
    const tl = matchTimeline(m);
    const goals = (side) => tl.filter((x) => x.side === side && ['goal', 'penGoal'].includes(x.type)).length;
    if (goals(0) === m.sides[0].goals && goals(1) === m.sides[1].goals && tl.every((x) => x.type === 'shootout' || x.type === 'halftime' || x.name || x.in)) timelineOk++;
    for (const x of tl) if (x.min && !/^\d+(\+\d+)?$/.test(x.min)) addedOk = false;
  }
  check('nessuna scelta resta aperta a partita finita', afterWhistle === 0, `(${afterWhistle})`);
  check('un rigore all’ultimo minuto si decide prima del fischio', lateSetPiece >= 1, `(${lateSetPiece})`);
  check('il tabellino ha tutti i gol, con nome e minuto', timelineOk === n, `(${timelineOk}/${n})`);
  check('i minuti di recupero si scrivono 45+2, 90+4', addedOk);
}

/* ------------------------------------------------------------------ */
console.log('— eventi verosimili —');
{
  const byId = (id) => events.find((e) => e.id === id);
  const home = { ita1: 'IT', eng1: 'GB-ENG', esp1: 'ES', ger1: 'DE', fra1: 'FR' };
  let racismLocal = 0; let racismTotal = 0; let langWrong = 0; let langTotal = 0;
  for (const [lg, code] of Object.entries(home)) {
    for (const clubId of leagues.leagues.find((l) => l.id === lg).clubs.slice(0, 6)) {
      const career = newCareer(data, { seed: 12, name: 'Prova', nation: 'IT', style: 'equilibrio', clubId });
      const ctx = contextOf(career, data);
      for (const p of candidates(byId('pr_racism_episode'), ctx, career)) {
        racismTotal++;
        if (p.nation === code || (code === 'GB-ENG' && p.nation.startsWith('GB-'))) racismLocal++;
      }
      for (const p of candidates(byId('dr_translator'), ctx, career)) {
        langTotal++;
        const same = { ES: ['AR', 'UY', 'CO', 'MX', 'CL'], FR: ['BE', 'SN', 'CI', 'CM'], DE: ['AT', 'CH'], 'GB-ENG': ['IE', 'US', 'GB-SCT', 'GB-WLS'], IT: ['SM'] }[code];
        if (p.nation === code || same.includes(p.nation)) langWrong++;
      }
    }
  }
  check('il razzismo non tocca mai un giocatore del paese del club', racismTotal >= 10 && racismLocal === 0, `(${racismLocal}/${racismTotal})`);
  check('l’interprete serve solo a chi non parla la lingua del campionato', langTotal >= 10 && langWrong === 0, `(${langWrong}/${langTotal})`);
  const derbyTalk = ['dr_old_captain_speech', 'dr_rival_friendship'].every((id) => byId(id).when.derbyNext);
  const afterLoss = ['dr_youngster_cries', 'pl_fragile_confidence', 'pl_social_post', 'pr_captain_press', 'p2_mistake_media_protect'].every((id) => byId(id).when.last === 'L');
  check('chi parla di derby o di sconfitta arriva solo prima di un derby o dopo una sconfitta', derbyTalk && afterLoss);
  check('le età scritte nei testi sono quelle vere', byId('pl_young_debut').when.player.ageMin === 18 && byId('pl_young_debut').when.player.ageMax === 18 && byId('p2_captain_old_new').when.player.ageMax === 33);
}

/* ------------------------------------------------------------------ */
console.log('— salvataggio —');
{
  const clubId = Object.keys(leagues.clubs).find((id) => id.includes('napoli'));
  const a = newCareer(data, { seed: 77, name: 'Prova', nation: 'IT', style: 'tikitaka', clubId });
  planWeek(a, data, events);
  let n = 0;
  const run = (c, until) => {
    let g = 0;
    while (c.md < until && c.phase === 'season' && g++ < 60) {
      const nf = nextFixture(c);
      if (nf) { const m = startUserMatch(c); m.autoUser = true; simulateToEnd(m); applyMatch(c, m, nf.fixture); }
      simulateRest(c);
      closeMatchday(c, data);
      incomingOffers(c, data);
      if (c.phase === 'season') { planWeek(c, data, events); for (const q of [...c.queue]) resolveEvent(c, data, events, q.key, 0); }
      n++;
    }
  };
  run(a, 8);
  const saved = JSON.stringify(a);
  const b = JSON.parse(saved);
  check('il salvataggio è JSON puro', JSON.stringify(b) === saved);
  run(a, 14);
  run(b, 14);
  check('una carriera caricata prosegue identica all’originale', JSON.stringify(a) === JSON.stringify(b));
  check('il salvataggio resta sotto i 2 MB', saved.length < 2 * 1024 * 1024, `(${(saved.length / 1024).toFixed(0)} KB)`);
}

/* ------------------------------------------------------------------ */
console.log('— eventi —');
{
  const drawable = events.filter((e) => !e.chainOnly);
  check('almeno 400 eventi', events.length >= 400, `(${events.length})`);
  const personal = events.filter((e) => e.when?.player).length;
  check('almeno 120 eventi sui singoli giocatori', personal >= 120, `(${personal})`);
  const chains = events.filter((e) => e.o.some((o) => o.chain)).length;
  check('catene con conseguenze a distanza', chains >= 15, `(${chains})`);
  for (const l of LANGS) {
    const missing = events.filter((e) => {
      const tx = texts[l][e.id];
      return !tx || !tx.t || !tx.d || tx.o.length !== e.o.length || tx.o.some((o, i) => !o.l || !o.r || (e.o[i].odds && !o.rb));
    }).map((e) => e.id);
    check(`ogni evento ha titolo, descrizione ed esiti in ${l}`, missing.length === 0, missing.slice(0, 5).join(','));
  }
  for (const l of ['es', 'fr', 'de', 'pt']) {
    const english = events.filter((e) => texts[l][e.id]?.d === texts.en[e.id]?.d).map((e) => e.id);
    check(`gli eventi sono tradotti davvero in ${l}, non ripiegano sull’inglese`, english.length === 0, english.slice(0, 5).join(','));
  }
  const withBoth = events.filter((e) => e.o.some((o) => o.odds)).length;
  check('molte scelte possono andare bene o male', withBoth >= 100, `(${withBoth})`);
  /* le condizioni si possono soddisfare: si registrano i contesti di dieci stagioni */
  const satisfied = new Set();
  const flagsSeen = new Set();
  for (const career of careers) {
    for (const f of Object.keys(career.flags || {})) flagsSeen.add(f);
  }
  const probe = (career) => {
    const ctx = contextOf(career, data);
    for (const ev of drawable) {
      if (satisfied.has(ev.id)) continue;
      if (fits(ev, ctx, career) && candidates(ev, ctx, career).length) satisfied.add(ev.id);
    }
  };
  const rand = mulberry32(99);
  const clubs = Object.keys(leagues.clubs);
  for (let i = 0; i < 12; i++) {
    const c = newCareer(data, { seed: 500 + i, name: 'Prova', nation: 'IT', style: STYLE_IDS[i % STYLE_IDS.length], clubId: clubs[Math.floor(rand() * clubs.length)] });
    probe(c);
    playSeason(c, { choose: (ev) => Math.floor(rand() * ev.o.length), onMatchday: (cc) => probe(cc) });
  }
  const never = drawable.filter((e) => !satisfied.has(e.id));
  check('almeno il 95% degli eventi può uscire in dodici stagioni', never.length <= drawable.length * 0.05, `(${never.length}: ${never.map((e) => e.id).slice(0, 12).join(', ')})`);
  /* ogni effetto si applica senza errori */
  const career = careers[0];
  let fxErrors = 0;
  for (const ev of events) {
    for (const o of ev.o) {
      for (const fx of [o.fx, o.odds?.good, o.odds?.bad]) {
        if (!fx) continue;
        const clone = JSON.parse(JSON.stringify(career));
        const subject = ev.when?.player ? squadOf(clone, clone.club).find((p) => !p.loanOut) : null;
        try { applyFx(clone, data, { ...fx, ...(o.fx || {}) }, subject, mulberry32(1)); } catch (e) { fxErrors++; if (fxErrors < 3) console.log(ev.id, e.message); }
      }
    }
  }
  check('ogni effetto di ogni opzione si applica senza errori', fxErrors === 0, `(${fxErrors})`);
}

console.log(`\n${pass} passati, ${fail} falliti · ${((Date.now() - t0) / 1000).toFixed(0)}s`);
if (fail) process.exit(1);
