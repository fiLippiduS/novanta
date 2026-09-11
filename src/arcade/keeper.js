/* Il cervello del portiere: memoria, lettura, progressione.
   E una regola di correttezza che vale più di tutte le altre. */

const COLS = 3, ROWS = 3;
const DECAY = 0.82;

export function createKeeper() {
  return {
    memory: new Float32Array(COLS * ROWS).fill(0.4),
    round: 0,
    lastDives: [],
  };
}

export function zoneOf(shot, goal) {
  const u = (shot.tx - goal.left) / (goal.right - goal.left);
  const v = (shot.ty - goal.top) / (goal.bottom - goal.top);
  const col = u < 0.34 ? 0 : u < 0.66 ? 1 : 2;
  const row = v < 0.34 ? 0 : v < 0.68 ? 1 : 2;
  return { col, row, idx: row * COLS + col, u, v };
}

/** angolo alto o basso ai lati, colpito forte: il tiro che non si para */
export function isPerfectCorner(shot, goal) {
  const z = zoneOf(shot, goal);
  const cornerCol = z.col !== 1;
  const cornerRow = z.row !== 1;
  return cornerCol && cornerRow && shot.power >= 0.76;
}

function argmaxWithNoise(memory, rand) {
  let best = 0, bestV = -1;
  for (let i = 0; i < memory.length; i++) {
    const v = memory[i] + rand() * 0.45;
    if (v > bestV) { bestV = v; best = i; }
  }
  return best;
}

function zoneCenter(idx, goal) {
  const col = idx % COLS, row = Math.floor(idx / COLS);
  const w = (goal.right - goal.left) / COLS;
  const h = (goal.bottom - goal.top) / ROWS;
  return {
    x: goal.left + w * (col + 0.5),
    y: goal.top + h * (row + 0.5),
  };
}

/**
 * Progressione: a ogni turno il portiere reagisce prima e arriva più lontano.
 * La regola di correttezza sospende tutto questo sui tiri perfetti nei primi
 * dieci turni: l'utente deve sempre poter dire "ho sbagliato io".
 */
export function difficulty(round) {
  return {
    reactionMs: Math.max(180, 430 - round * 15),
    /* Il raggio è tarato sulle mani vere del portiere: da quando le braccia
       arrivano dove si vedono, ne serve meno per la stessa difficoltà. */
    saveRadius: (54 + Math.min(48, round * 2.7)) * 1.15,
    readProb: Math.min(0.74, 0.16 + round * 0.037),
    feints: round >= 8,
  };
}

export function decide(keeper, shot, goal, rand) {
  const d = difficulty(keeper.round);
  const truth = zoneOf(shot, goal);

  const reads = rand() < d.readProb;
  const idx = reads ? truth.idx : argmaxWithNoise(keeper.memory, rand);
  const target = zoneCenter(idx, goal);

  // errore di posizionamento: più bassa la lettura, più largo l'errore
  const err = reads ? 26 : 74;
  target.x += (rand() * 2 - 1) * err;
  target.y += (rand() * 2 - 1) * err * 0.45;

  // un tiro telegrafato regala millisecondi al portiere
  const tell = shot.tell || 0;
  const reaction = Math.max(150, d.reactionMs - tell * 70);

  const fair = isPerfectCorner(shot, goal) && keeper.round < 10;

  return {
    zoneIdx: idx,
    target,
    reactionMs: reaction,
    saveRadius: fair ? 0 : d.saveRadius,
    feint: d.feints && rand() < 0.45,
    reads,
    unbeatable: false,
    fairGoal: fair,
  };
}

/** dopo ogni tiro la memoria si aggiorna e sbiadisce */
export function remember(keeper, shot, goal) {
  const z = zoneOf(shot, goal);
  for (let i = 0; i < keeper.memory.length; i++) keeper.memory[i] *= DECAY;
  keeper.memory[z.idx] += 1;
  keeper.round += 1;
}
