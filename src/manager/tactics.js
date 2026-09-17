/* ALLENATORE — moduli, stili di gioco e mentalità.
   Ogni stile è una manciata di numeri che il motore della partita legge:
   quanto si tiene palla, quanto si pressa, dove si attacca, quanto si
   stanca la squadra, cosa si concede. Nessuno è il migliore in assoluto:
   ognuno batte qualcuno e soffre qualcun altro (MATCHUP). */

/* ------------------------------------------------------------------ */
/* moduli: undici posti, ognuno con ruolo, corsia e posizione sul campo */
/* x 0-100 da sinistra a destra, y 0-100 dalla propria porta             */
/* ------------------------------------------------------------------ */

const S = (role, x, y) => ({ role, x, y, lane: x < 36 ? 'L' : x > 64 ? 'R' : 'C' });

export const FORMATIONS = {
  '4-3-3': [S('POR', 50, 5), S('TZ', 12, 26), S('DC', 37, 20), S('DC', 63, 20), S('TZ', 88, 26),
    S('CC', 28, 50), S('MED', 50, 42), S('CC', 72, 50), S('ALA', 14, 76), S('PUN', 50, 84), S('ALA', 86, 76)],
  '4-2-3-1': [S('POR', 50, 5), S('TZ', 12, 26), S('DC', 37, 20), S('DC', 63, 20), S('TZ', 88, 26),
    S('MED', 38, 42), S('MED', 62, 42), S('ALA', 14, 66), S('TRQ', 50, 64), S('ALA', 86, 66), S('PUN', 50, 85)],
  '4-4-2': [S('POR', 50, 5), S('TZ', 12, 26), S('DC', 37, 20), S('DC', 63, 20), S('TZ', 88, 26),
    S('ALA', 12, 56), S('CC', 38, 48), S('CC', 62, 48), S('ALA', 88, 56), S('PUN', 38, 82), S('PUN', 62, 82)],
  '4-3-1-2': [S('POR', 50, 5), S('TZ', 12, 26), S('DC', 37, 20), S('DC', 63, 20), S('TZ', 88, 26),
    S('CC', 26, 46), S('MED', 50, 40), S('CC', 74, 46), S('TRQ', 50, 64), S('PUN', 38, 84), S('PUN', 62, 84)],
  '3-5-2': [S('POR', 50, 5), S('DC', 26, 21), S('DC', 50, 18), S('DC', 74, 21),
    S('TZ', 8, 52), S('CC', 32, 48), S('MED', 50, 40), S('CC', 68, 48), S('TZ', 92, 52), S('PUN', 38, 82), S('PUN', 62, 82)],
  '3-4-3': [S('POR', 50, 5), S('DC', 26, 21), S('DC', 50, 18), S('DC', 74, 21),
    S('TZ', 8, 50), S('CC', 38, 46), S('CC', 62, 46), S('TZ', 92, 50), S('ALA', 16, 76), S('PUN', 50, 84), S('ALA', 84, 76)],
  '5-3-2': [S('POR', 50, 5), S('TZ', 8, 32), S('DC', 28, 20), S('DC', 50, 17), S('DC', 72, 20), S('TZ', 92, 32),
    S('CC', 28, 50), S('MED', 50, 42), S('CC', 72, 50), S('PUN', 38, 80), S('PUN', 62, 80)],
  '5-4-1': [S('POR', 50, 5), S('TZ', 8, 30), S('DC', 28, 20), S('DC', 50, 17), S('DC', 72, 20), S('TZ', 92, 30),
    S('ALA', 12, 54), S('CC', 38, 46), S('CC', 62, 46), S('ALA', 88, 54), S('PUN', 50, 80)],
  '4-1-4-1': [S('POR', 50, 5), S('TZ', 12, 26), S('DC', 37, 20), S('DC', 63, 20), S('TZ', 88, 26),
    S('MED', 50, 38), S('ALA', 12, 60), S('CC', 38, 54), S('CC', 62, 54), S('ALA', 88, 60), S('PUN', 50, 84)],
};
export const FORMATION_IDS = Object.keys(FORMATIONS);

/* ------------------------------------------------------------------ */
/* stili                                                               */
/* ------------------------------------------------------------------ */

/*
 * possession  quanto pesa il palleggio nel prendersi il pallone (+ tieni palla)
 * tempo       quante azioni per minuto di possesso (ritmo)
 * wide        quota di azioni sulle fasce (0..1)
 * direct      lanci lunghi: saltano il centrocampo, meno precisi
 * press       recuperi alti: palle rubate vicino alla porta avversaria
 * line        altezza della difesa: più alta = più contropiedi subiti
 * counter     pericolosità in ripartenza dopo un recupero
 * setPiece    qualità su calci piazzati
 * quality     qualità media delle occasioni create (xG per tiro); tarata con
 *             tools/manager/autotune-styles.mjs perché nessuno stile domini
 * block       quanto si chiude l'area (occasioni concesse di minore qualità)
 * fatigue     moltiplicatore della fatica
 * needs       doti che lo stile chiede alla rosa (per l'affinità)
 * formations  moduli con cui si sposa meglio
 */
export const STYLES = {
  tikitaka: {
    possession: 1.12, tempo: 0.86, wide: 0.34, direct: 0, press: 1.05, line: 1.12, counter: 0.8, setPiece: 0.9,
    quality: 1.251, block: 1.0, fatigue: 1.0,
    needs: { passing: 0.35, technique: 0.25, vision: 0.2, composure: 0.2 }, formations: ['4-3-3', '4-1-4-1', '3-4-3'],
  },
  gegenpressing: {
    possession: 1.04, tempo: 1.14, wide: 0.44, direct: 0.1, press: 1.45, line: 1.2, counter: 1.1, setPiece: 1.0,
    quality: 0.964, block: 0.95, fatigue: 1.32,
    needs: { stamina: 0.4, pace: 0.2, tackling: 0.2, strength: 0.2 }, formations: ['4-3-3', '4-2-3-1', '3-4-3'],
  },
  contropiede: {
    possession: 0.88, tempo: 0.92, wide: 0.46, direct: 0.35, press: 0.8, line: 0.84, counter: 1.36, setPiece: 1.0,
    quality: 0.933, block: 1.1, fatigue: 0.96,
    needs: { pace: 0.45, dribbling: 0.2, finishing: 0.2, positioning: 0.15 }, formations: ['4-4-2', '4-2-3-1', '5-3-2'],
  },
  catenaccio: {
    possession: 0.9, tempo: 0.78, wide: 0.4, direct: 0.3, press: 0.72, line: 0.7, counter: 1.2, setPiece: 1.1,
    quality: 0.902, block: 1.28, fatigue: 0.86,
    needs: { marking: 0.35, positioning: 0.3, tackling: 0.2, composure: 0.15 }, formations: ['5-3-2', '3-5-2', '4-4-2'],
  },
  totale: {
    possession: 1.07, tempo: 1.12, wide: 0.46, direct: 0.05, press: 1.25, line: 1.3, counter: 1.0, setPiece: 1.0,
    quality: 1.247, block: 0.86, fatigue: 1.18,
    needs: { technique: 0.25, stamina: 0.25, passing: 0.25, pace: 0.25 }, formations: ['4-3-3', '3-4-3'],
  },
  fasce: {
    possession: 0.98, tempo: 1.04, wide: 0.72, direct: 0.15, press: 0.98, line: 1.0, counter: 1.0, setPiece: 1.1,
    quality: 1.034, block: 1.02, fatigue: 1.04,
    needs: { crossing: 0.35, pace: 0.2, heading: 0.25, stamina: 0.2 }, formations: ['4-4-2', '3-5-2', '4-2-3-1'],
  },
  verticale: {
    possession: 0.92, tempo: 1.1, wide: 0.38, direct: 0.8, press: 0.92, line: 0.94, counter: 1.1, setPiece: 1.12,
    quality: 0.909, block: 1.06, fatigue: 0.98,
    needs: { strength: 0.3, heading: 0.3, passing: 0.2, pace: 0.2 }, formations: ['4-4-2', '3-5-2', '5-3-2'],
  },
  equilibrio: {
    possession: 1.0, tempo: 1.0, wide: 0.48, direct: 0.15, press: 1.0, line: 1.0, counter: 1.0, setPiece: 1.0,
    quality: 1.038, block: 1.04, fatigue: 1.0,
    needs: { positioning: 0.25, passing: 0.25, stamina: 0.25, tackling: 0.25 }, formations: FORMATION_IDS,
  },
  quinti: {
    possession: 0.96, tempo: 1.0, wide: 0.62, direct: 0.2, press: 1.0, line: 0.96, counter: 1.06, setPiece: 1.0,
    quality: 0.979, block: 1.08, fatigue: 1.12,
    needs: { stamina: 0.35, crossing: 0.2, marking: 0.25, pace: 0.2 }, formations: ['3-5-2', '3-4-3', '5-3-2'],
  },
  falsonove: {
    possession: 1.07, tempo: 0.96, wide: 0.3, direct: 0, press: 1.04, line: 1.06, counter: 0.92, setPiece: 0.92,
    quality: 1.201, block: 1.0, fatigue: 1.02,
    needs: { vision: 0.3, dribbling: 0.25, technique: 0.25, longshots: 0.2 }, formations: ['4-3-3', '4-1-4-1', '4-3-1-2'],
  },
  pallainattiva: {
    possession: 0.94, tempo: 0.98, wide: 0.52, direct: 0.3, press: 0.94, line: 0.94, counter: 0.98, setPiece: 1.42,
    quality: 0.857, block: 1.1, fatigue: 0.95,
    needs: { heading: 0.4, strength: 0.2, crossing: 0.2, technique: 0.2 }, formations: ['4-4-2', '3-5-2', '4-2-3-1'],
  },
  pullman: {
    possession: 0.8, tempo: 0.62, wide: 0.42, direct: 0.5, press: 0.55, line: 0.56, counter: 1.1, setPiece: 1.0,
    quality: 1, block: 1.6, fatigue: 0.8,
    needs: { marking: 0.35, strength: 0.25, positioning: 0.25, heading: 0.15 }, formations: ['5-3-2', '4-1-4-1', '5-4-1'],
  },
};
export const STYLE_IDS = Object.keys(STYLES);

/* chi soffre chi: >1 lo stile di riga si trova bene contro quello di colonna */
export const MATCHUP = {
  tikitaka: { gegenpressing: 0.92, pullman: 0.94, catenaccio: 0.96, contropiede: 0.95, verticale: 1.06, equilibrio: 1.04, fasce: 1.04 },
  gegenpressing: { tikitaka: 1.08, falsonove: 1.07, totale: 1.04, verticale: 0.92, contropiede: 0.94, pullman: 0.96 },
  contropiede: { tikitaka: 1.06, totale: 1.08, gegenpressing: 1.05, falsonove: 1.05, pullman: 0.9, catenaccio: 0.93 },
  catenaccio: { fasce: 1.04, falsonove: 1.06, tikitaka: 1.04, pallainattiva: 0.93, verticale: 0.95, totale: 1.02 },
  totale: { equilibrio: 1.05, pullman: 1.04, catenaccio: 0.98, contropiede: 0.92, verticale: 0.96 },
  fasce: { catenaccio: 0.96, pullman: 1.05, quinti: 0.94, falsonove: 1.04, tikitaka: 0.98 },
  verticale: { gegenpressing: 1.08, totale: 1.05, tikitaka: 0.95, pallainattiva: 0.96, catenaccio: 1.04 },
  equilibrio: {},
  quinti: { fasce: 1.07, contropiede: 1.02, falsonove: 0.95, tikitaka: 0.97 },
  falsonove: { catenaccio: 0.94, pullman: 1.02, gegenpressing: 0.94, quinti: 1.05, verticale: 1.04 },
  pallainattiva: { catenaccio: 1.07, pullman: 1.06, tikitaka: 0.97, contropiede: 0.97 },
  pullman: { tikitaka: 1.05, totale: 0.97, fasce: 0.95, pallainattiva: 0.93, contropiede: 1.08 },
};
export function matchup(a, b) { return MATCHUP[a]?.[b] ?? 1; }

/* ------------------------------------------------------------------ */
/* mentalità: si cambia anche a partita in corso                        */
/* ------------------------------------------------------------------ */

export const MENTALITIES = {
  ultradif: { attack: 0.62, defence: 1.28, tempo: 0.8, risk: 0.7 },
  difensiva: { attack: 0.82, defence: 1.12, tempo: 0.9, risk: 0.85 },
  equilibrata: { attack: 1, defence: 1, tempo: 1, risk: 1 },
  offensiva: { attack: 1.18, defence: 0.9, tempo: 1.08, risk: 1.18 },
  tuttoattacco: { attack: 1.4, defence: 0.74, tempo: 1.18, risk: 1.45 },
};
export const MENTALITY_IDS = Object.keys(MENTALITIES);

/* ------------------------------------------------------------------ */
/* affinità: quanto una rosa è fatta per uno stile                      */
/* ------------------------------------------------------------------ */

/** 0-100: le doti chieste dallo stile, confrontate con il livello del giocatore */
export function playerAffinity(p, styleId) {
  const st = STYLES[styleId];
  if (!st || p.role === 'POR') return 70;
  let s = 0;
  for (const [k, w] of Object.entries(st.needs)) s += (p.attrs[k] ?? 40) * w;
  const learned = (p.styleXp?.[styleId] || 0);
  return Math.max(0, Math.min(100, Math.round(50 + (s - p.ovr) * 1.6 + learned)));
}

/** moltiplicatore sulla squadra: stile ben scelto 1.04, stile contro natura 0.92 */
export function styleFit(players, styleId, formationId, familiarity = 0) {
  const st = STYLES[styleId];
  const outfield = players.filter((p) => p.role !== 'POR');
  const aff = outfield.reduce((n, p) => n + playerAffinity(p, styleId), 0) / Math.max(1, outfield.length);
  const shape = st.formations.includes(formationId) ? 0.015 : -0.01;
  const fam = Math.min(1, familiarity / 100) * 0.025;
  return Math.max(0.9, Math.min(1.07, 0.955 + (aff - 50) * 0.0016 + shape + fam));
}
