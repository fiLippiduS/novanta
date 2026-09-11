/* PIÙ O MENO — le regole del confronto.
   Il gioco non chiede mai quanto vale un dato: chiede solo quale dei due è
   maggiore. Per questo una coppia viene proposta soltanto quando lo scarto
   è netto, e un confronto ambiguo non compare mai. */

/**
 * I parametri. Per ognuno: quanto deve essere largo lo scarto perché la
 * domanda sia onesta, in percentuale e in valore assoluto. Vale il più
 * severo dei due.
 */
export const PARAMS = [
  { key: 'g', minRel: 0.10, minAbs: 40 },
  { key: 'a', minRel: 0.12, minAbs: 30 },
  { key: 'pr', minRel: 0.10, minAbs: 90 },
  { key: 't', minRel: 0.20, minAbs: 4 },
  { key: 'c', minRel: 0.15, minAbs: 18 },
  { key: 'ng', minRel: 0.18, minAbs: 10 },
  { key: 'ucl', minRel: 0, minAbs: 1 },
  { key: 'lg', minRel: 0.20, minAbs: 2 },
  { key: 'bd', minRel: 0, minAbs: 1 },
  { key: 'r', minRel: 0.20, minAbs: 5 },
  { key: 'h', minRel: 0, minAbs: 5 },
  { key: 'cl', minRel: 0.20, minAbs: 2 },
  { key: 'ws', minRel: 0, minAbs: 1 },
  { key: 'bs', minRel: 0.15, minAbs: 8 },
  { key: 'cs', minRel: 0.12, minAbs: 45 },
];

export const byKey = Object.fromEntries(PARAMS.map((p) => [p.key, p]));

export function has(player, key) {
  return typeof player[key] === 'number';
}

/** lo scarto è abbastanza largo da non lasciare dubbi? */
export function clearGap(param, a, b) {
  const hi = Math.max(a, b);
  const lo = Math.min(a, b);
  if (hi === lo) return false;
  const diff = hi - lo;
  if (diff < param.minAbs) return false;
  if (param.minRel > 0 && diff / hi < param.minRel) return false;
  return true;
}

function pick(rand, arr) {
  return arr[Math.floor(rand() * arr.length)];
}

/**
 * Un turno: dato il giocatore che resta in gioco, trova un parametro che
 * possiede e uno sfidante con cui il confronto sia netto.
 * `recent` tiene fuori chi è appena passato, così non torna subito.
 */
export function nextRound(rand, players, keeper, recent = [], lastParam = null) {
  const skip = new Set([keeper.name, ...recent]);

  const options = [];
  for (const param of PARAMS) {
    if (!has(keeper, param.key)) continue;
    if (param.key === lastParam) continue;
    const rivals = players.filter((p) => !skip.has(p.name)
      && has(p, param.key) && clearGap(param, keeper[param.key], p[param.key]));
    if (rivals.length) options.push({ param, rivals });
  }

  if (!options.length) return null;
  const chosen = pick(rand, options);
  return { param: chosen.param, rival: pick(rand, chosen.rivals) };
}

/** il primo confronto: due giocatori qualsiasi, purché il divario sia chiaro */
export function firstRound(rand, players) {
  for (let tries = 0; tries < 200; tries++) {
    const a = pick(rand, players);
    const round = nextRound(rand, players, a, []);
    if (round) return { left: a, ...round };
  }
  return null;
}

/** chi vince resta in gioco */
export function winnerOf(param, a, b) {
  return a[param.key] >= b[param.key] ? a : b;
}
