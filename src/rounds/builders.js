/* I round della sfida quotidiana si ricavano tutti dalle rose già curate:
   nessun secondo archivio da mantenere, nessun dato che può scadere. */

import { shuffled, pick, intBetween } from '../core/rng.js';

/** tutti i giocatori di una rosa, con la squadra da cui vengono */
function roster(squad) {
  return squad.players.map((name) => ({ name, squad }));
}

/* ---- 1. L'intruso: tre compagni e uno che non c'entra ---- */
export function buildIntruder(rand, squads) {
  const home = pick(rand, squads);
  const dentro = new Set(home.players);

  /* attenzione: molti giocatori compaiono in più rose. Cafu sta nella Roma,
     nel Milan e nel Brasile. L'intruso va cercato fra chi in questa rosa
     non c'è davvero, altrimenti la domanda ha due risposte giuste. */
  const estranei = squads
    .filter((s) => s.id !== home.id)
    .flatMap((s) => s.players.map((name) => ({ name, squad: s })))
    .filter((p) => !dentro.has(p.name));

  const three = shuffled(rand, home.players).slice(0, 3);
  const odd = pick(rand, estranei);
  const options = shuffled(rand, [...three, odd.name]);

  return {
    type: 'intruder',
    promptKey: 'daily.intruderPrompt',
    subject: null,
    options: options.map((name) => ({ label: name, correct: name === odd.name })),
    reveal: { team: home, other: odd.squad, odd: odd.name },
  };
}

/* Le squadre sbagliate non devono contenere nessuno degli indizi:
   de Ligt ha giocato nell'Ajax e nella Juventus, e se comparissero
   entrambe fra le opzioni la domanda avrebbe due risposte giuste. */
function distractors(rand, squads, home, clues, howMany) {
  const pool = squads.filter((s) => s.id !== home.id
    && !clues.some((c) => s.players.includes(c)));
  return shuffled(rand, pool).slice(0, howMany);
}

/* ---- 2. Di che squadra sono? Quattro nomi, una rosa ---- */
export function buildWhichTeam(rand, squads) {
  const home = pick(rand, squads);
  const clues = shuffled(rand, home.players).slice(0, 4);
  const others = distractors(rand, squads, home, clues, 3);
  const options = shuffled(rand, [home, ...others]);
  return {
    type: 'whichTeam',
    promptKey: 'daily.whichTeamPrompt',
    clues,
    options: options.map((s) => ({
      label: `${s.name} ${s.season}`, correct: s.id === home.id, colors: s.colors,
    })),
    reveal: { team: home },
  };
}

/* ---- 3. Compagni di squadra, sì o no ---- */
export function buildTeammates(rand, squads) {
  const wantTrue = rand() < 0.5;
  const home = pick(rand, squads);

  let a, b;
  if (wantTrue) {
    const two = shuffled(rand, home.players).slice(0, 2);
    [a, b] = two;
  } else {
    a = pick(rand, home.players);
    // il secondo non deve comparire in NESSUNA rosa insieme al primo
    const insieme = new Set(
      squads.filter((s) => s.players.includes(a)).flatMap((s) => s.players),
    );
    const pool = squads.flatMap((s) => s.players).filter((p) => !insieme.has(p));
    b = pool.length ? pick(rand, pool) : pick(rand, squads[0].players);
  }

  return {
    type: 'teammates',
    promptKey: 'daily.teammatesPrompt',
    pair: [a, b],
    options: [
      { label: 'daily.yes', correct: wantTrue, i18n: true },
      { label: 'daily.no', correct: !wantTrue, i18n: true },
    ],
    reveal: { team: wantTrue ? home : null, pair: [a, b] },
  };
}

/* ---- 4. Il nome sotto gli indizi: la rosa si scopre un giocatore alla volta ---- */
export function buildDrip(rand, squads) {
  const home = pick(rand, squads);
  const order = shuffled(rand, home.players).slice(0, 5);
  const others = distractors(rand, squads, home, order, 3);
  return {
    type: 'drip',
    promptKey: 'daily.dripPrompt',
    clues: order,
    options: shuffled(rand, [home, ...others]).map((s) => ({
      label: `${s.name} ${s.season}`, correct: s.id === home.id, colors: s.colors,
    })),
    reveal: { team: home },
  };
}

const BUILDERS = [buildIntruder, buildWhichTeam, buildTeammates, buildDrip];

/** cinque round, sempre di tipi diversi finché possibile */
export function buildDay(rand, squads) {
  const order = shuffled(rand, BUILDERS);
  const rounds = [];
  for (let i = 0; i < 5; i++) {
    const make = order[i % order.length];
    rounds.push(make(rand, squads));
  }
  return rounds;
}
