/* Simulazione dei rigori senza browser.
   Serve a rispondere a due domande: il portiere è difficile?
   e soprattutto: è corretto? */

import { createShot, updateShot, advance, ballAt, PHASE } from '../src/arcade/shot.js';
import { createKeeper, decide, remember, isPerfectCorner, difficulty } from '../src/arcade/keeper.js';
import { createRig, updateRig, setState, handPositions } from '../src/arcade/keeper-rig.js';
import { resolveOutcome, GOAL, SAVE, POST, OUT } from '../src/arcade/outcome.js';

const G = { left: 165, right: 835, top: 110, bottom: 418 };
const SPOT = { x: 500, y: 566 };
const KS = 2.05;
const STEP = 16.67;

let pass = 0, fail = 0;
function check(desc, ok, extra = '') {
  ok ? pass++ : fail++;
  if (!ok) console.log(`  FALLITO  ${desc} ${extra}`);
}

/* rng deterministico, così il test non traballa */
function seeded(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

/** gioca un rigore mirando a un punto preciso della porta */
function takeShot(keeper, rand, { targetX, targetY, power }) {
  const shot = createShot(G, keeper.round);
  advance(shot);                       // mira → potenza
  advance(shot);                       // potenza → effetto
  shot.tx = targetX;
  shot.ty = targetY;
  shot.power = power;
  advance(shot);                       // effetto → volo (senza curva)
  shot.tx = targetX;                   // lockCurve sposta tx con l'effetto: annullo
  shot.flightMs = 900 - power * 400;

  const plan = decide(keeper, shot, G, rand);
  const rig = createRig({ x: (G.left + G.right) / 2, y: G.bottom - 34 * KS, scale: KS });

  let t = 0;
  let dived = false;
  while (t < shot.flightMs) {
    const dt = Math.min(STEP, shot.flightMs - t);
    t += dt;
    if (!dived && t >= plan.reactionMs) {
      dived = true;
      rig.dir = plan.target.x < rig.x ? -1 : 1;
      rig.diveFrom = { x: rig.x, y: rig.y };
      rig.diveTo = { x: plan.target.x, y: Math.min(plan.target.y + 20, G.bottom - 10) };
      rig.diveMs = 300;
      setState(rig, 'dive');
    }
    updateRig(rig, dt);
  }

  const pos = ballAt(shot, 1, SPOT);
  const outcome = resolveOutcome(pos, G, {
    hands: handPositions(rig), body: { x: rig.x, y: rig.y }, radius: plan.saveRadius,
  });
  remember(keeper, shot, G);
  return { outcome, plan, shot };
}

console.log('— il tiro parte sempre, anche senza il terzo tocco —');
{
  /* La finestra dell'effetto scade da sola. Prima il tiro passava in volo
     senza che la scena se ne accorgesse, il portiere restava senza piano e
     la palla si fermava a mezz'aria. */
  const shot = createShot(G, 3);
  advance(shot);                 // mira → potenza
  advance(shot);                 // potenza → effetto
  for (let i = 0; i < 80 && shot.phase === PHASE.CURVE; i++) updateShot(shot, 16.67);
  check('scaduta la finestra il tiro è in volo', shot.phase === PHASE.FLIGHT, `(${shot.phase})`);
  check('con una durata di volo sensata', shot.flightMs > 100 && shot.flightMs < 1500,
    `(${shot.flightMs})`);
  check('e senza effetto, perché non è stato scelto', shot.curve === 0, `(${shot.curve})`);
}

console.log('— nessun numero impossibile lungo il volo —');
{
  let rotti = 0;
  for (let seed = 0; seed < 400; seed++) {
    const rand = seeded(seed);
    const shot = createShot(G, 1 + (seed % 20));
    advance(shot);
    updateShot(shot, rand() * 900);
    advance(shot);
    updateShot(shot, rand() * 900);
    // metà delle volte lascio scadere la finestra invece di toccare
    if (seed % 2) { for (let i = 0; i < 80 && shot.phase === PHASE.CURVE; i++) updateShot(shot, 16.67); }
    else advance(shot);

    for (let k = 0; k <= 1.0001; k += 0.05) {
      const p = ballAt(shot, k, SPOT);
      if (!Number.isFinite(p.x) || !Number.isFinite(p.y) || !Number.isFinite(p.scale)) rotti++;
    }
    if (!Number.isFinite(shot.tx) || !Number.isFinite(shot.ty)) rotti++;
  }
  check('400 tiri, nessuna coordinata impossibile', rotti === 0, `(${rotti})`);
}

console.log('— la regola di correttezza —');
{
  // angolo alto a sinistra, colpito forte: nei primi dieci turni deve entrare
  let entrati = 0;
  for (let seed = 0; seed < 300; seed++) {
    const k = createKeeper();
    k.round = seed % 10;                      // turni da 0 a 9
    const r = takeShot(k, seeded(seed), { targetX: 250, targetY: 165, power: 0.92 });
    if (r.outcome === GOAL) entrati++;
  }
  check('300 tiri perfetti nei primi 10 turni entrano tutti', entrati === 300, `(${entrati}/300)`);

  const k = createKeeper();
  k.round = 3;
  const s = createShot(G, 3);
  s.tx = 250; s.ty = 165; s.power = 0.92;
  check('un angolo alto forte è riconosciuto come imparabile', isPerfectCorner(s, G) === true);
  s.power = 0.5;
  check('lo stesso angolo ma piano non lo è', isPerfectCorner(s, G) === false);
}

console.log('— la difficoltà cresce davvero —');
{
  const salva = (round, tiri = 400) => {
    let parati = 0;
    for (let i = 0; i < tiri; i++) {
      const k = createKeeper();
      k.round = round;
      // tiro medio, non negli angoli: qui il portiere deve poter parare
      const rand = seeded(i * 7919 + round);
      const r = takeShot(k, rand, {
        targetX: 340 + rand() * 320, targetY: 230 + rand() * 120, power: 0.55,
      });
      if (r.outcome === SAVE) parati++;
    }
    return parati / tiri;
  };
  const t1 = salva(1), t8 = salva(8), t16 = salva(16);
  console.log(`   parate: turno 1 ${(t1*100).toFixed(0)}% · turno 8 ${(t8*100).toFixed(0)}% · turno 16 ${(t16*100).toFixed(0)}%`);
  check('al primo turno para qualcosa ma non tutto', t1 > 0.05 && t1 < 0.75, `(${t1.toFixed(2)})`);
  check('al turno 16 para più che al primo', t16 > t1, `(${t1.toFixed(2)} → ${t16.toFixed(2)})`);
  check('non diventa mai imbattibile al centro', t16 < 0.97, `(${t16.toFixed(2)})`);
}

console.log('— la memoria funziona —');
{
  // battendo sempre nello stesso angolo il portiere deve arrivarci più spesso
  const provaSequenza = (ripeti) => {
    let parati = 0;
    for (let seed = 0; seed < 250; seed++) {
      const k = createKeeper();
      k.round = 6;
      const rand = seeded(seed);
      for (let i = 0; i < ripeti; i++) {
        takeShot(k, rand, { targetX: 280, targetY: 300, power: 0.55 });
        k.round = 6;                      // isolo l'effetto memoria dalla progressione
      }
      const r = takeShot(k, rand, { targetX: 280, targetY: 300, power: 0.55 });
      if (r.outcome === SAVE) parati++;
    }
    return parati / 250;
  };
  const primo = provaSequenza(0);
  const quarto = provaSequenza(3);
  console.log(`   stesso angolo: 1º tiro ${(primo*100).toFixed(0)}% parato · 4º tiro ${(quarto*100).toFixed(0)}%`);
  check('insistere sullo stesso angolo si paga', quarto > primo, `(${primo.toFixed(2)} → ${quarto.toFixed(2)})`);
}

console.log('— gli esiti geometrici —');
{
  const k = createKeeper();
  const fuori = takeShot(k, seeded(1), { targetX: 80, targetY: 260, power: 0.6 });
  check('largo di 70 unità è fuori', fuori.outcome === OUT, `(${fuori.outcome})`);
  const alto = takeShot(createKeeper(), seeded(2), { targetX: 500, targetY: 50, power: 0.9 });
  check('sopra la traversa è fuori', alto.outcome === OUT, `(${alto.outcome})`);
  const palo = takeShot(createKeeper(), seeded(3), { targetX: 167, targetY: 260, power: 0.8 });
  check('sul palo è palo', palo.outcome === POST, `(${palo.outcome})`);
}

console.log('— una partita intera resta giocabile —');
{
  // un giocatore bravo che varia gli angoli deve arrivare lontano
  let totale = 0;
  const partite = 200;
  for (let seed = 0; seed < partite; seed++) {
    const rand = seeded(seed);
    const k = createKeeper();
    let gol = 0;
    const angoli = [[250, 165], [750, 165], [250, 370], [750, 370]];
    for (let i = 0; i < 40; i++) {
      const [x, y] = angoli[Math.floor(rand() * 4)];
      const r = takeShot(k, rand, { targetX: x, targetY: y, power: 0.88 });
      if (r.outcome !== GOAL) break;
      gol++;
    }
    totale += gol;
  }
  const media = totale / partite;
  console.log(`   chi mira sempre agli angoli segna in media ${media.toFixed(1)} rigori`);
  check('la partita dura abbastanza da valere una sessione', media >= 8, `(${media.toFixed(1)})`);
  check('ma non è infinita', media < 40, `(${media.toFixed(1)})`);
}

console.log(`\n${pass} passati, ${fail} falliti`);
process.exit(fail ? 1 : 0);
