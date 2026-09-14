/* La partita di calcio a 5 che chiude l'asta.
   Quaranta minuti simulati uno per uno, non un risultato estratto in blocco:
   solo così un'espulsione al dodicesimo può cambiare quello che succede dopo. */

export const MINUTES = 40;

const ATTACK_W = { ATT: 0.50, CEN: 0.32, DIF: 0.18, POR: 0 };
const DEFENCE_W = { POR: 0.46, DIF: 0.44, CEN: 0.10, ATT: 0 };
const SCORER_W = { ATT: 0.52, CEN: 0.28, DIF: 0.18, POR: 0.02 };
const CARD_W = { DIF: 0.46, CEN: 0.36, ATT: 0.18 };

const YELLOW_PER_MIN = 0.020;
const RED_PER_MIN = 0.0015;
const MAX_SENT_OFF = 2;      // in cinque contro cinque, sotto i tre non si gioca

function roleGroups(team, off) {
  const out = {};
  for (const role of Object.keys(team.squad)) {
    out[role] = team.squad[role].filter((p) => !off.has(p.name));
  }
  return out;
}

function weighted(groups, weights) {
  let sum = 0;
  for (const role of Object.keys(weights)) {
    const group = groups[role];
    if (!group || !group.length || !weights[role]) continue;
    const avg = group.reduce((n, p) => n + p.rating, 0) / group.length;
    sum += avg * weights[role];
  }
  return sum;
}

/** forza attuale, tenendo conto di chi è stato espulso */
export function strength(team, off = new Set()) {
  const groups = roleGroups(team, off);
  const down = Object.values(team.squad).flat().filter((p) => off.has(p.name)).length;
  return {
    attack: weighted(groups, ATTACK_W) * Math.pow(0.84, down),
    defence: weighted(groups, DEFENCE_W) * Math.pow(0.80, down),
    down,
  };
}

/* la differenza fra attacco e difesa avversaria letta su una curva
   esponenziale: due punti di voto in più si devono vedere nel risultato */
function xgPerMatch(att, def) {
  return Math.min(5, Math.max(0.15, 1.25 * Math.exp((att - def) * 0.20)));
}

function pickWeighted(rand, groups, weights) {
  const candidates = [];
  for (const role of Object.keys(weights)) {
    for (const p of groups[role] || []) {
      candidates.push({ p, w: weights[role] * (0.6 + p.rating / 160) });
    }
  }
  if (!candidates.length) return null;
  const total = candidates.reduce((n, c) => n + c.w, 0);
  let r = rand() * total;
  for (const c of candidates) { r -= c.w; if (r <= 0) return c.p; }
  return candidates[candidates.length - 1].p;
}

export function simulate(rand, home, away) {
  const sides = [
    { key: 'home', team: home, goals: 0, off: new Set(), booked: new Set() },
    { key: 'away', team: away, goals: 0, off: new Set(), booked: new Set() },
  ];
  const events = [];
  let dirty = true;
  let rate = { home: 0, away: 0 };

  const refresh = () => {
    const sh = strength(home, sides[0].off);
    const sa = strength(away, sides[1].off);
    rate = {
      home: xgPerMatch(sh.attack, sa.defence) / MINUTES,
      away: xgPerMatch(sa.attack, sh.defence) / MINUTES,
    };
    dirty = false;
  };

  for (let minute = 1; minute <= MINUTES; minute++) {
    if (dirty) refresh();

    for (const s of sides) {
      const groups = roleGroups(s.team, s.off);

      // gol
      if (rand() < rate[s.key]) {
        const scorer = pickWeighted(rand, groups, SCORER_W);
        if (scorer) {
          s.goals += 1;
          events.push({ minute, side: s.key, type: 'goal', player: scorer });
        }
      }

      // cartellini: solo per chi sta in campo, e mai per il portiere
      if (s.off.size < MAX_SENT_OFF) {
        const direct = rand() < RED_PER_MIN;
        const yellow = rand() < YELLOW_PER_MIN;
        if (direct || yellow) {
          const target = pickWeighted(rand, groups, CARD_W);
          if (target) {
            const already = s.booked.has(target.name);
            if (direct || already) {
              s.off.add(target.name);
              dirty = true;
              events.push({
                minute, side: s.key, type: 'red', player: target,
                second: !direct && already,
              });
            } else {
              s.booked.add(target.name);
              events.push({ minute, side: s.key, type: 'yellow', player: target });
            }
          }
        }
      }
    }
  }

  events.sort((a, b) => a.minute - b.minute);

  const goalsHome = sides[0].goals;
  const goalsAway = sides[1].goals;
  return {
    minutes: MINUTES,
    goalsHome,
    goalsAway,
    events,
    sentOff: { home: [...sides[0].off], away: [...sides[1].off] },
    outcome: goalsHome > goalsAway ? 'win' : goalsHome < goalsAway ? 'loss' : 'draw',
  };
}

/* ------------------------------------------------------------------ */
/*  Rigori                                                             */
/* ------------------------------------------------------------------ */

const SHOOTOUT_ORDER = ['ATT', 'CEN', 'DIF', 'POR'];

/** chi va sul dischetto, nell'ordine in cui ci andrebbe davvero */
export function takers(team, off = new Set()) {
  const list = [];
  for (const role of SHOOTOUT_ORDER) {
    for (const p of team.squad[role] || []) if (!off.has(p.name)) list.push(p);
  }
  return list;
}

/**
 * Cinque tiri a testa, poi a oltranza.
 * La percentuale parte alta come nella realtà e si muove col valore di chi
 * tira e di chi para: un rigore lo sbaglia anche il migliore, ma meno spesso.
 */
export function shootout(rand, home, away, sentOff = { home: new Set(), away: new Set() }) {
  const sides = [
    { key: 'home', team: home, list: takers(home, sentOff.home), score: 0 },
    { key: 'away', team: away, list: takers(away, sentOff.away), score: 0 },
  ];
  const keeperOf = (t) => (t.squad.POR && t.squad.POR[0]) || { rating: 80 };

  const kicks = [];
  const kick = (s, other, round) => {
    const taker = s.list[(round - 1) % Math.max(1, s.list.length)];
    const keeper = keeperOf(other.team);
    const p = Math.max(0.42, Math.min(0.88,
      0.76 + (taker.rating - 88) * 0.012 - (keeper.rating - 87) * 0.014));
    const scored = rand() < p;
    if (scored) s.score += 1;
    kicks.push({ side: s.key, round, taker, scored });
    return scored;
  };

  // i cinque regolamentari, con la chiusura anticipata quando non servono più
  for (let round = 1; round <= 5; round++) {
    for (const [i, s] of sides.entries()) {
      const other = sides[1 - i];
      const restanti = 5 - round + (i === 0 ? 1 : 0);
      if (s.score - other.score > restanti) continue;
      if (other.score - s.score > 5 - round + (i === 0 ? 0 : 1)) continue;
      kick(s, other, round);
    }
    if (sides[0].score !== sides[1].score && round === 5) break;
  }

  // a oltranza, finché uno sbaglia e l'altro no: come nel regolamento, non
  // c'è un limite di giri (il tetto serve solo a non girare all'infinito)
  let round = 6;
  while (sides[0].score === sides[1].score && round < 400) {
    const a = kick(sides[0], sides[1], round);
    const b = kick(sides[1], sides[0], round);
    if (a !== b) break;
    round += 1;
  }

  return {
    home: sides[0].score,
    away: sides[1].score,
    kicks,
    winner: sides[0].score > sides[1].score ? 'home' : 'away',
  };
}
