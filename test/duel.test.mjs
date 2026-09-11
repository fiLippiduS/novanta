/* Più o Meno: nessuna domanda ambigua, nessun confronto impossibile,
   e abbastanza materiale per non finire mai. */

import { readFileSync } from 'node:fs';
import { PARAMS, byKey, has, clearGap, nextRound, firstRound, winnerOf } from '../src/duel/engine.js';

const players = JSON.parse(readFileSync(new URL('../data/duel.json', import.meta.url), 'utf8')).players;

let pass = 0, fail = 0;
const check = (d, ok, extra = '') => { ok ? pass++ : (fail++, console.log(`  FALLITO  ${d} ${extra}`)); };

function seeded(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

console.log('— i dati sono sani —');
{
  const nomi = players.map((p) => p.name);
  check('nessun giocatore ripetuto', new Set(nomi).size === nomi.length);
  let vuoti = 0, negativi = 0, senzaRuolo = 0;
  for (const p of players) {
    if (!p.name || !p.club || !p.nation) vuoti++;
    if (!['POR', 'DIF', 'CEN', 'ATT'].includes(p.role)) senzaRuolo++;
    for (const k of Object.keys(byKey)) {
      if (has(p, k) && (p[k] < 0 || !Number.isFinite(p[k]))) negativi++;
    }
  }
  check('tutti hanno nome, club e nazione', vuoti === 0, `(${vuoti})`);
  check('tutti hanno un ruolo valido', senzaRuolo === 0, `(${senzaRuolo})`);
  check('nessun dato negativo o rotto', negativi === 0, `(${negativi})`);

  // ogni parametro deve avere abbastanza giocatori per essere giocabile
  const magri = PARAMS.filter((p) => players.filter((x) => has(x, p.key)).length < 8);
  check('ogni parametro ha almeno otto giocatori', magri.length === 0,
    `(${magri.map((p) => p.key)})`);

  // i portieri non hanno gol da confrontare, i movimenti non hanno porte inviolate
  const porteAiMovimenti = players.filter((p) => p.role !== 'POR' && has(p, 'cs')).length;
  check('le porte inviolate sono solo dei portieri', porteAiMovimenti === 0, `(${porteAiMovimenti})`);
}

console.log('— nessuna domanda ambigua —');
{
  let ambigue = 0, pari = 0, controlli = 0;
  for (let seed = 0; seed < 3000; seed++) {
    const rand = seeded(seed);
    const start = firstRound(rand, players);
    if (!start) { ambigue++; continue; }
    let keeper = winnerOf(start.param, start.left, start.rival);
    let recent = [start.left.name, start.rival.name];
    let lastParam = start.param.key;

    for (let i = 0; i < 12; i++) {
      const r = nextRound(rand, players, keeper, recent.slice(-4), lastParam);
      if (!r) break;
      controlli++;
      const a = keeper[r.param.key], b = r.rival[r.param.key];
      if (a === b) pari++;
      if (!clearGap(r.param, a, b)) ambigue++;
      if (r.rival.name === keeper.name) ambigue++;
      keeper = winnerOf(r.param, keeper, r.rival);
      recent.push(r.rival.name);
      lastParam = r.param.key;
    }
  }
  check('mai due valori identici', pari === 0, `(${pari})`);
  check('mai uno scarto troppo stretto', ambigue === 0, `(${ambigue})`);
  console.log(`   ${controlli} confronti verificati`);
}

console.log('— la partita non si inceppa —');
{
  const lunghezze = [];
  for (let seed = 0; seed < 500; seed++) {
    const rand = seeded(seed + 900);
    const start = firstRound(rand, players);
    let keeper = winnerOf(start.param, start.left, start.rival);
    const recent = [start.left.name, start.rival.name];
    let lastParam = start.param.key;
    let n = 1;
    while (n < 200) {
      const r = nextRound(rand, players, keeper, recent.slice(-4), lastParam);
      if (!r) break;
      keeper = winnerOf(r.param, keeper, r.rival);
      recent.push(r.rival.name);
      lastParam = r.param.key;
      n += 1;
    }
    lunghezze.push(n);
  }
  const minimo = Math.min(...lunghezze);
  console.log(`   catena più corta ${minimo} turni · media ${(lunghezze.reduce((a, b) => a + b, 0) / lunghezze.length).toFixed(0)}`);
  check('si arriva sempre almeno a cinquanta turni', minimo >= 50, `(${minimo})`);
}

console.log('— i parametri girano davvero —');
{
  const usati = new Set();
  let consecutiviUguali = 0;
  for (let seed = 0; seed < 400; seed++) {
    const rand = seeded(seed + 40);
    const start = firstRound(rand, players);
    let keeper = winnerOf(start.param, start.left, start.rival);
    let lastParam = start.param.key;
    usati.add(lastParam);
    const recent = [start.left.name, start.rival.name];
    for (let i = 0; i < 25; i++) {
      const r = nextRound(rand, players, keeper, recent.slice(-4), lastParam);
      if (!r) break;
      if (r.param.key === lastParam) consecutiviUguali++;
      usati.add(r.param.key);
      keeper = winnerOf(r.param, keeper, r.rival);
      recent.push(r.rival.name);
      lastParam = r.param.key;
    }
  }
  check('mai lo stesso parametro due volte di fila', consecutiviUguali === 0, `(${consecutiviUguali})`);
  const mancanti = PARAMS.filter((p) => !usati.has(p.key)).map((p) => p.key);
  check('tutti i parametri escono prima o poi', mancanti.length === 0, `(${mancanti})`);
  console.log('   parametri visti:', [...usati].join(' · '));
}

console.log('— la regola dello scarto funziona —');
{
  const g = byKey.g;
  check('870 contro 760 è una domanda buona', clearGap(g, 870, 760));
  check('420 contro 430 non lo è', clearGap(g, 420, 430) === false);
  check('900 contro 875 nemmeno: lo scarto sta dentro l\'errore dei dati',
    clearGap(g, 900, 875) === false);
  const bd = byKey.bd;
  check('8 Palloni d\'Oro contro 5 vanno bene', clearGap(bd, 8, 5));
  check('1 contro 1 no', clearGap(bd, 1, 1) === false);
  const h = byKey.h;
  check('195 contro 170 è chiaro', clearGap(h, 195, 170));
  check('187 contro 185 no', clearGap(h, 187, 185) === false);
}

console.log(`\n${pass} passati, ${fail} falliti`);
process.exit(fail ? 1 : 0);
