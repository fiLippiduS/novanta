/* L'asta deve garantire una cosa sopra tutte: nessuno finisce con
   una casella vuota o con i crediti sotto zero. */

import { readFileSync } from 'node:fs';
import {
  createAuction, createTeam, openNext, raise, settle, isComplete,
  maxBid, needs, canBid, slotsLeft, ROLES, NEED, START_CREDITS,
} from '../src/auction/engine.js';
import { createBot, decide, valuation } from '../src/auction/bot.js';
import { simulate, shootout, takers, strength, MINUTES } from '../src/auction/match.js';

const catalog = JSON.parse(readFileSync(new URL('../data/auction.json', import.meta.url), 'utf8')).players;

let pass = 0, fail = 0;
const check = (d, ok, extra = '') => { ok ? pass++ : (fail++, console.log(`  FALLITO  ${d} ${extra}`)); };

function seeded(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

/** un'asta intera: l'umano è finto e si comporta secondo `style` */
function playAuction(rand, style) {
  const you = createTeam('Tu', true);
  const bot = createTeam('Bot', false);
  const brain = createBot(rand);
  const a = createAuction(rand, catalog, [you, bot]);

  while (openNext(a)) {
    const c = a.current;
    let guard = 0;
    while (guard++ < 80) {
      let acted = false;

      // l'umano
      if (c.leader !== you && canBid(you, c.role, c.price)) {
        let soglia;
        if (style === 'aggressivo') soglia = maxBid(you, c.role);
        else if (style === 'timido') soglia = 2;
        else if (style === 'ragionato') {
          // gioca come il bot: valuta e non si fa trascinare
          const restanti = a.lots.slice(a.index).filter((l) => l.role === c.role).length;
          soglia = valuation({ greed: 1.05, patience: 0.5, bluff: 0 }, you, c, restanti);
        } else soglia = Math.ceil(maxBid(you, c.role) * rand());
        if (c.price + 1 <= soglia) { raise(a, you); acted = true; }
      }

      // il bot
      if (c.leader !== bot && canBid(bot, c.role, c.price)) {
        const restanti = a.lots.slice(a.index).filter((l) => l.role === c.role).length;
        if (decide(brain, bot, c, restanti, rand)) { raise(a, bot); acted = true; }
      }

      if (!acted) break;
    }
    settle(a);
  }
  return { you, bot, a };
}

console.log('— nessuna rosa incompleta, mai —');
{
  let incomplete = 0, negativi = 0, lotti = new Set();
  const stili = ['aggressivo', 'timido', 'casuale'];
  for (let seed = 0; seed < 900; seed++) {
    const { you, bot, a } = playAuction(seeded(seed), stili[seed % 3]);
    lotti.add(a.history.length);
    for (const t of [you, bot]) {
      if (!isComplete(t)) {
        incomplete++;
        if (incomplete < 4) console.log(`   seed ${seed}: ${t.name} →`,
          ROLES.map((r) => `${r} ${t.squad[r].length}/${NEED[r]}`).join(' '));
      }
      if (t.credits < 0) negativi++;
    }
  }
  check('900 aste, tutte le rose complete', incomplete === 0, `(${incomplete} incomplete)`);
  check('i crediti non vanno mai sotto zero', negativi === 0, `(${negativi})`);
  check('ogni asta assegna esattamente 10 giocatori', [...lotti].join() === '10', `(${[...lotti]})`);
}

console.log('— i crediti tornano —');
{
  const { you, bot } = playAuction(seeded(42), 'casuale');
  for (const t of [you, bot]) {
    const speso = ROLES.flatMap((r) => t.squad[r]).reduce((n, p) => n + p.paid, 0);
    check(`${t.name}: speso + residuo = ${START_CREDITS}`, speso + t.credits === START_CREDITS,
      `(${speso} + ${t.credits})`);
  }
}

console.log('— nessun giocatore assegnato due volte —');
{
  let dup = 0;
  for (let seed = 0; seed < 200; seed++) {
    const { you, bot } = playAuction(seeded(seed + 5000), 'casuale');
    const tutti = [...ROLES.flatMap((r) => you.squad[r]), ...ROLES.flatMap((r) => bot.squad[r])]
      .map((p) => p.name);
    if (new Set(tutti).size !== tutti.length) dup++;
  }
  check('200 aste senza doppioni', dup === 0, `(${dup})`);
}

console.log('— il bot è un avversario vero —');
{
  const vinti = { ragionato: 0, aggressivo: 0, timido: 0 };
  for (const stile of ['ragionato', 'aggressivo', 'timido']) {
    for (let seed = 0; seed < 300; seed++) {
      const { you, bot } = playAuction(seeded(seed + 900), stile);
      const rand = seeded(seed + 77);
      const m = simulate(rand, you, bot);
      if (m.outcome === 'win') vinti[stile]++;
    }
  }
  const rag = vinti.ragionato / 300, agg = vinti.aggressivo / 300, tim = vinti.timido / 300;
  console.log(`   vittorie: comprando bene ${(rag*100).toFixed(0)}% · `
    + `spendendo tutto ${(agg*100).toFixed(0)}% · risparmiando ${(tim*100).toFixed(0)}%`);
  check('chi compra bene vince più spesso di chi risparmia', rag - tim > 0.10,
    `(${rag.toFixed(2)} vs ${tim.toFixed(2)})`);
  check('il bot non è una comparsa', rag < 0.90, `(${rag.toFixed(2)})`);
  check('anche giocando male qualcosa si vince', tim > 0.03, `(${tim.toFixed(2)})`);
}

console.log('— la partita è leggibile —');
{
  let gol = 0, gialli = 0, rossi = 0, minutiSballati = 0, partite = 600;
  let espulsiTroppi = 0, cartelliniAPortieri = 0, cartelliniAEspulsi = 0;
  for (let seed = 0; seed < partite; seed++) {
    const { you, bot } = playAuction(seeded(seed + 200), 'casuale');
    const m = simulate(seeded(seed), you, bot);
    gol += m.goalsHome + m.goalsAway;

    const fuori = { home: new Set(), away: new Set() };
    let prev = 0;
    for (const e of m.events) {
      if (e.minute < 1 || e.minute > MINUTES || e.minute < prev) minutiSballati++;
      prev = e.minute;
      if (e.type === 'yellow') gialli++;
      if (e.type === 'red') rossi++;
      if (e.type !== 'goal') {
        if (e.player.role === 'POR') cartelliniAPortieri++;
        if (fuori[e.side].has(e.player.name)) cartelliniAEspulsi++;
      }
      if (e.type === 'goal' && fuori[e.side].has(e.player.name)) cartelliniAEspulsi++;
      if (e.type === 'red') fuori[e.side].add(e.player.name);
    }
    if (m.sentOff.home.length > 2 || m.sentOff.away.length > 2) espulsiTroppi++;
  }
  const golPartita = gol / partite;
  console.log(`   a partita: ${golPartita.toFixed(1)} gol · ${(gialli/partite).toFixed(1)} gialli · `
    + `${(rossi/partite).toFixed(2)} rossi`);
  check('i minuti sono in ordine e dentro i 40', minutiSballati === 0, `(${minutiSballati})`);
  check('il punteggio è da calcio a 5, non da tennis', golPartita > 1.5 && golPartita < 9,
    `(${golPartita.toFixed(1)})`);
  check('i gialli ci sono ma non a ogni azione', gialli / partite > 0.4 && gialli / partite < 4,
    `(${(gialli/partite).toFixed(2)})`);
  check('le espulsioni restano un evento raro', rossi / partite > 0.02 && rossi / partite < 0.9,
    `(${(rossi/partite).toFixed(2)})`);
  check('mai più di due espulsi per squadra', espulsiTroppi === 0, `(${espulsiTroppi})`);
  check('il portiere non prende cartellini', cartelliniAPortieri === 0, `(${cartelliniAPortieri})`);
  check('chi è espulso non gioca più', cartelliniAEspulsi === 0, `(${cartelliniAEspulsi})`);
}

console.log('— l\'espulsione pesa —');
{
  // stessa rosa, ma con un difensore fuori: deve subire di più
  const { you, bot } = playAuction(seeded(7), 'casuale');
  const pieno = strength(you, new Set());
  const inDieci = strength(you, new Set([you.squad.DIF[0].name]));
  check('in dieci si difende peggio', inDieci.defence < pieno.defence,
    `(${pieno.defence.toFixed(1)} → ${inDieci.defence.toFixed(1)})`);
  check('in dieci si attacca peggio', inDieci.attack < pieno.attack,
    `(${pieno.attack.toFixed(1)} → ${inDieci.attack.toFixed(1)})`);
}

console.log('— i rigori decidono sempre, e nessuno tira due volte di fila —');
{
  let pari = 0, ordineRotto = 0, tiriAssurdi = 0, tiratoriFuori = 0;
  for (let seed = 0; seed < 600; seed++) {
    const { you, bot } = playAuction(seeded(seed + 1200), 'casuale');
    const so = shootout(seeded(seed), you, bot);
    if (so.home === so.away) pari++;
    if (so.kicks.length < 2 || so.kicks.length > 40) tiriAssurdi++;

    // dentro un giro non si tira due volte per parte
    const perGiro = {};
    for (const k of so.kicks) {
      const key = `${k.side}-${k.round}`;
      perGiro[key] = (perGiro[key] || 0) + 1;
      if (perGiro[key] > 1) ordineRotto++;
      const rosa = [...takers(k.side === 'home' ? you : bot)].map((p) => p.name);
      if (!rosa.includes(k.taker.name)) tiratoriFuori++;
    }
    const segnatiCasa = so.kicks.filter((k) => k.side === 'home' && k.scored).length;
    if (segnatiCasa !== so.home) tiriAssurdi++;
  }
  check('600 serie, nessuna finisce in parità', pari === 0, `(${pari})`);
  check('nessuno tira due volte nello stesso giro', ordineRotto === 0, `(${ordineRotto})`);
  check('tira solo chi è in campo', tiratoriFuori === 0, `(${tiratoriFuori})`);
  check('il conteggio dei gol torna', tiriAssurdi === 0, `(${tiriAssurdi})`);

  const lunghezze = [];
  for (let seed = 0; seed < 300; seed++) {
    const { you, bot } = playAuction(seeded(seed + 60), 'casuale');
    lunghezze.push(shootout(seeded(seed + 9), you, bot).kicks.length);
  }
  const media = lunghezze.reduce((a, b) => a + b, 0) / lunghezze.length;
  console.log(`   media ${media.toFixed(1)} tiri a serie · massimo ${Math.max(...lunghezze)}`);
  check('una serie dura quanto una serie vera', media > 6 && media < 14, `(${media.toFixed(1)})`);
}

console.log('— il tetto di offerta lascia il budget per tutti i ruoli —');
{
  const t = createTeam('Tu', true);
  t.credits = 20;
  check('con 5 posti liberi non si arriva a 20', maxBid(t, 'POR') === 12, `(${maxBid(t, 'POR')})`);

  t.squad.POR.push({ name: 'x', rating: 90, paid: 12 });
  t.credits = 8;
  check('portiere preso: non si offre più su un portiere', maxBid(t, 'POR') === 0);
  check('restano 4 posti e 8 crediti: massimo 2', maxBid(t, 'DIF') === 2, `(${maxBid(t, 'DIF')})`);

  // anche spendendo il massimo ogni volta, il budget copre sempre i cinque ruoli
  const u = createTeam('Tu', true);
  let speso = 0;
  for (const r of ['POR', 'DIF', 'DIF', 'CEN', 'ATT']) {
    const m = maxBid(u, r);
    check(`c'è sempre almeno un credito da offrire (${r})`, m >= 1, `(${m})`);
    u.credits -= m;
    speso += m;
    u.squad[r].push({ name: `${r}${speso}`, rating: 90, paid: m });
  }
  check('rosa completa spendendo il massimo ogni volta', isComplete(u));
  check('senza sforare i venti crediti', speso <= START_CREDITS && u.credits >= 0,
    `(speso ${speso}, restano ${u.credits})`);
}

console.log(`\n${pass} passati, ${fail} falliti`);
process.exit(fail ? 1 : 0);
