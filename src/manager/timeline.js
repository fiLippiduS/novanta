/* ALLENATORE — la partita in poche righe.
   Da una partita finita (dal vivo o simulata) si tengono gli episodi che
   contano, con il minuto e i nomi già scritti: così il resoconto resta
   leggibile anche quando i giocatori cambiano squadra o si ritirano. */

/** gli episodi che finiscono nel tabellino */
export const TIMELINE_TYPES = new Set(['goal', 'penGoal', 'penMissed', 'penSaved', 'yellow', 'red', 'secondYellow', 'injury', 'disallowed', 'woodwork', 'error', 'sub', 'halftime']);

/** 45+2, 90+4: il minuto come si scrive */
export function minuteText(minute, period = 1) {
  const reg = [45, 90, 105, 120][Math.min(3, Math.max(0, (period || 1) - 1))];
  return minute > reg ? `${reg}+${minute - reg}` : String(minute);
}

/**
 * Il tabellino: [{ min, side (0 casa, 1 trasferta), type, name, assist, in, out, weeks, score }].
 * I cambi entrano solo per la squadra `onlySubsFor` ('home' o 'away'): per
 * l'avversario sarebbero rumore.
 */
export function matchTimeline(match, { onlySubsFor = match.user } = {}) {
  const name = (id) => {
    if (!id) return null;
    for (const s of match.sides) { const p = s.byId?.get(id); if (p) return p.name; }
    return null;
  };
  const out = [];
  for (const e of match.events) {
    if (!TIMELINE_TYPES.has(e.type)) continue;
    if (e.type === 'sub' && e.side !== onlySubsFor) continue;
    out.push({
      min: minuteText(e.minute, e.period),
      side: e.side === 'away' ? 1 : 0,
      type: e.type,
      name: name(e.player),
      assist: name(e.assist),
      in: name(e.in),
      out: name(e.out),
      weeks: e.weeks || null,
      score: e.score || null,
    });
  }
  if (match.shootout) out.push({ min: '', side: null, type: 'shootout', score: [match.shootout.home, match.shootout.away] });
  return out;
}

/** i nomi dei protagonisti delle altre partite: gol e rossi, con il minuto */
export function keyMoments(match) {
  return matchTimeline(match, { onlySubsFor: null }).filter((x) => ['goal', 'penGoal', 'red', 'secondYellow'].includes(x.type));
}
