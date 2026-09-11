/* Mille carriere simulate. Una carriera non deve mai produrre numeri assurdi,
   e le scelte devono contare davvero. */

import { readFileSync } from 'node:fs';
import { ROLES, STYLES, ATTRS, createPlayer, overall, ageFactor } from '../src/career/model.js';
import { playSeason, minutesShare, clubDemand } from '../src/career/season.js';
import { pickDecisions, pickIncidents, applyEffects, offers, fits, reachableTier } from '../src/career/events.js';
import { TROPHY_TYPES, trophySvg } from '../src/career/trophies.js';

const clubs = JSON.parse(readFileSync(new URL('../data/clubs.json', import.meta.url), 'utf8')).clubs;
const events = JSON.parse(readFileSync(new URL('../data/events.json', import.meta.url), 'utf8')).events;

let pass = 0, fail = 0;
const check = (d, ok, extra = '') => { ok ? pass++ : (fail++, console.log(`  FALLITO  ${d} ${extra}`)); };

function seeded(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

const pick = (rand, arr) => arr[Math.floor(rand() * arr.length)];

/** una carriera intera, con scelte prese a caso */
function runCareer(rand, opts = {}) {
  const role = opts.role || pick(rand, ROLES);
  const style = opts.style || pick(rand, STYLES[role]);
  const p = createPlayer(rand, { name: 'Prova', role, style, number: 10, nation: 'Italia' });
  let club = { ...pick(rand, clubs.filter((c) => c.tier >= 4)), inCont: false };
  const seen = [];

  while (p.age < 38) {
    let focus = null;
    for (const d of pickDecisions(rand, events, p, club, seen, 3)) {
      const o = pick(rand, d.options);
      const f = applyEffects(p, o.effects);
      if (f) focus = f;
      if (!seen.includes(d.id)) seen.push(d.id);
    }
    for (const i of pickIncidents(rand, events, p, club, seen)) {
      applyEffects(p, i.effects);
      if (!seen.includes(i.id)) seen.push(i.id);
    }
    const share = minutesShare(p, club);
    const out = playSeason(rand, p, club, { focus, injuryRisk: p.pendingRisk || 0 });
    p.pendingRisk = 0;
    club.inCont = out.qualified;
    if (out.record.trophies.includes('promozione') && club.tier > 1) club.tier -= 1;

    const list = offers(rand, clubs, p, club, overall(p), out.share);
    if (list.length && rand() < 0.45) club = { ...list[0].club, inCont: false };
  }
  return { p, club };
}

console.log('— mille carriere, nessun numero impossibile —');
{
  let rotti = 0, negativi = 0, fuoriScala = 0;
  let somme = { apps: 0, goals: 0, trophies: 0, ovr: 0 };
  const N = 1000;
  for (let seed = 0; seed < N; seed++) {
    const { p } = runCareer(seeded(seed));
    const T = p.totals;
    for (const v of [T.apps, T.goals, T.assists, T.clean, T.rating, overall(p)]) {
      if (!Number.isFinite(v)) rotti++;
      if (v < 0) negativi++;
    }
    for (const a of ATTRS) if (p.attrs[a] < 20 || p.attrs[a] > 99) fuoriScala++;
    if (p.morale < 0 || p.morale > 100) fuoriScala++;
    for (const s of p.seasons) {
      if (s.apps < 0 || s.apps > 38) fuoriScala++;
      if (s.position < 1 || s.position > 20) fuoriScala++;
      if (s.goals > s.apps * 4) rotti++;
    }
    somme.apps += T.apps; somme.goals += T.goals;
    somme.trophies += T.trophies.length; somme.ovr += overall(p);
  }
  check('nessun valore rotto', rotti === 0, `(${rotti})`);
  check('niente sotto zero', negativi === 0, `(${negativi})`);
  check('tutto dentro la scala', fuoriScala === 0, `(${fuoriScala})`);
  console.log(`   medie a carriera: ${(somme.apps/N).toFixed(0)} presenze · `
    + `${(somme.goals/N).toFixed(0)} gol · ${(somme.trophies/N).toFixed(1)} trofei · `
    + `valore finale ${(somme.ovr/N).toFixed(0)}`);
  check('una carriera dura abbastanza', somme.apps / N > 250, `(${(somme.apps/N).toFixed(0)})`);
}

console.log('— il ruolo cambia quello che produci —');
{
  const media = (role, style, campo) => {
    let tot = 0;
    for (let s = 0; s < 120; s++) tot += runCareer(seeded(s + 4000), { role, style }).p.totals[campo];
    return tot / 120;
  };
  const golPunta = media('PUN', 'rapace', 'goals');
  const golDifensore = media('DC', 'marcatore', 'goals');
  const assistRifinitore = media('ALA', 'assistman', 'assists');
  const cleanPortiere = media('POR', 'linea', 'clean');
  const cleanAla = media('ALA', 'saltatore', 'clean');
  console.log(`   rapace ${golPunta.toFixed(0)} gol · marcatore ${golDifensore.toFixed(0)} gol`);
  console.log(`   rifinitore ${assistRifinitore.toFixed(0)} assist · portiere ${cleanPortiere.toFixed(0)} porte inviolate`);
  check('una punta segna molto più di un difensore', golPunta > golDifensore * 3,
    `(${golPunta.toFixed(0)} vs ${golDifensore.toFixed(0)})`);
  check('il rifinitore fa assist', assistRifinitore > 40, `(${assistRifinitore.toFixed(0)})`);
  check('solo chi difende tiene la porta inviolata', cleanPortiere > 30 && cleanAla === 0,
    `(${cleanPortiere.toFixed(0)} vs ${cleanAla})`);
}

console.log('— la squadra conta —');
{
  const trofei = (tier) => {
    let tot = 0;
    for (let s = 0; s < 200; s++) {
      const rand = seeded(s + 9000);
      const p = createPlayer(rand, { name: 'x', role: 'MEZ', style: 'incursore', number: 8, nation: 'Italia' });
      p.attrs = { tec: 78, fis: 78, men: 78, vel: 78 };
      const club = { ...clubs.find((c) => c.tier === tier), inCont: true };
      for (let y = 0; y < 10; y++) {
        const out = playSeason(rand, p, club, {});
        club.inCont = out.qualified;
      }
      tot += p.totals.trophies.length;
    }
    return tot / 200;
  };
  const elite = trofei(1), piccola = trofei(5);
  console.log(`   dieci anni: in una grande ${elite.toFixed(1)} trofei · in provincia ${piccola.toFixed(1)}`);
  check('una grande vince molto di più', elite > piccola * 2, `(${elite.toFixed(1)} vs ${piccola.toFixed(1)})`);
  check('ma in provincia qualcosa si alza', piccola > 0.2, `(${piccola.toFixed(1)})`);
}

console.log('— si cresce da giovani e si cala da vecchi —');
{
  check('a sedici anni si cresce', ageFactor(16) > 0.9);
  check('a ventinove si è al picco', ageFactor(29) > 0 && ageFactor(29) < 0.3);
  check('a trentaquattro si cala', ageFactor(34) < 0);

  let cresciuti = 0;
  for (let s = 0; s < 200; s++) {
    const rand = seeded(s + 300);
    const p = createPlayer(rand, { name: 'x', role: 'MEZ', style: 'incursore', number: 8, nation: 'Italia' });
    const start = overall(p);
    const club = { ...clubs.find((c) => c.tier === 4), inCont: false };
    for (let y = 0; y < 8; y++) playSeason(rand, p, club, {});
    if (overall(p) > start + 6) cresciuti++;
  }
  check('otto anni di carriera fanno crescere davvero', cresciuti > 180, `(${cresciuti}/200)`);
}

console.log('— il mercato propone squadre vere e diverse —');
{
  let vuote = 0, doppie = 0, stessaSquadra = 0;
  for (let s = 0; s < 400; s++) {
    const rand = seeded(s + 700);
    const p = createPlayer(rand, { name: 'x', role: 'ALA', style: 'saltatore', number: 7, nation: 'Italia' });
    p.attrs = { tec: 60 + (s % 30), fis: 60, men: 60, vel: 65 };
    p.reputation = s % 80;
    const club = { ...clubs[s % clubs.length], inCont: false };
    const list = offers(rand, clubs, p, club, overall(p), 0.6);
    if (!list.length) vuote++;
    const ids = list.map((o) => o.club.id);
    if (new Set(ids).size !== ids.length) doppie++;
    if (ids.includes(club.id)) stessaSquadra++;
  }
  check('ci sono sempre offerte', vuote === 0, `(${vuote})`);
  check('mai la stessa squadra due volte', doppie === 0, `(${doppie})`);
  check('mai l\'offerta dalla squadra in cui sei già', stessaSquadra === 0, `(${stessaSquadra})`);
  check('più vali, più in alto arrivi',
    reachableTier({ reputation: 70 }, 85) < reachableTier({ reputation: 5 }, 55));
}

console.log('— il mazzo eventi è sano —');
{
  const ids = events.map((e) => e.id);
  check('nessun evento ripetuto', new Set(ids).size === ids.length);
  let senzaTesto = 0, sbilanciati = 0;
  for (const e of events) {
    for (const l of ['it', 'en']) {
      if (!e[l] || !e[l].title || !e[l].text) senzaTesto++;
      if (e.type === 'decision') {
        for (const o of e.options) {
          if (!o[l] || !o[l].label || !o[l].outcome) senzaTesto++;
        }
      }
    }
    if (e.type === 'decision' && e.options.length < 2) sbilanciati++;
    if (e.type === 'incident' && !e.effects) sbilanciati++;
  }
  check('tutti gli eventi sono in due lingue', senzaTesto === 0, `(${senzaTesto})`);
  check('ogni decisione ha almeno due strade', sbilanciati === 0, `(${sbilanciati})`);

  // la scelta sull'allenamento deve esserci sempre, a qualsiasi età
  for (const age of [16, 22, 30, 36]) {
    const p = createPlayer(seeded(1), { name: 'x', role: 'PUN', style: 'rapace', number: 9, nation: 'Italia' });
    p.age = age;
    const d = pickDecisions(seeded(age), events, p, clubs[0], [], 3);
    check(`a ${age} anni si sceglie come allenarsi`, d.some((x) => x.id === 'focus'));
  }
}

console.log('— i trofei hanno tutti una sagoma —');
{
  const usati = new Set();
  for (let s = 0; s < 300; s++) runCareer(seeded(s + 60)).p.totals.trophies.forEach((t) => usati.add(t));
  const senzaForma = [...usati].filter((t) => !TROPHY_TYPES.includes(t));
  check('ogni trofeo vinto ha il suo disegno', senzaForma.length === 0, `(${senzaForma})`);
  check('il disegno è un SVG valido', trophySvg('campionato').startsWith('<svg'));
  console.log('   trofei che compaiono:', [...usati].join(' · '));
}

console.log(`\n${pass} passati, ${fail} falliti`);
process.exit(fail ? 1 : 0);
