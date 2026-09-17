/* ALLENATORE — il campionato: calendario, classifica, giornate.
   Niente DOM. La classifica non si salva: si ricalcola dai risultati, così
   non può mai andare fuori sincrono con le partite giocate. */

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/**
 * Calendario all'italiana, andata e ritorno (metodo del cerchio).
 * Restituisce un array di giornate; ogni giornata è un array di { h, a }.
 * Casa e trasferta si alternano: al massimo tre partite di fila nello stesso campo.
 */
export function makeFixtures(ids, rand) {
  const teams = [...ids];
  for (let i = teams.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [teams[i], teams[j]] = [teams[j], teams[i]]; }
  if (teams.length % 2) teams.push(null);
  const n = teams.length;
  const arr = [...teams];
  const pairsByRound = [];
  for (let r = 0; r < n - 1; r++) {
    const round = [];
    for (let i = 0; i < n / 2; i++) {
      const x = arr[i]; const y = arr[n - 1 - i];
      if (x != null && y != null) round.push([x, y]);
    }
    pairsByRound.push(round);
    arr.splice(1, 0, arr.pop());
  }
  /* casa e trasferta: ogni squadra alterna il più possibile, mai più di due
     partite di fila nello stesso campo */
  const last = {}; const streak = {}; const homes = {};
  for (const t of teams) if (t) { last[t] = null; streak[t] = 0; homes[t] = 0; }
  const venue = (t, v) => { streak[t] = last[t] === v ? streak[t] + 1 : 1; last[t] = v; if (v === 'H') homes[t]++; };
  const cost = (h, a) => (last[h] === 'H' ? streak[h] * 3 : 0) + (last[a] === 'A' ? streak[a] * 3 : 0) + (homes[h] - homes[a]) * 0.2;
  const first = pairsByRound.map((round) => round.map(([x, y]) => {
    const [h, a] = cost(x, y) <= cost(y, x) ? [x, y] : [y, x];
    venue(h, 'H'); venue(a, 'A');
    return { h, a, res: null };
  }));
  /* il ritorno ripete l'andata a campi invertiti */
  const second = first.map((round) => round.map(({ h, a }) => ({ h: a, a: h, res: null })));
  return [...first, ...second];
}

/* criteri di parità: in Italia e Spagna prima gli scontri diretti */
export const TIEBREAK = { IT: 'h2h', ES: 'h2h', 'GB-ENG': 'gd', DE: 'gd', FR: 'gd' };

/** righe di classifica ordinate: { id, p, w, d, l, gf, ga, gd, pts, form: ['W','D','L'…] } */
export function standings(ids, fixtures, { tiebreak = 'gd', upTo = Infinity, penalties = {} } = {}) {
  const rows = new Map(ids.map((id) => [id, { id, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, gd: 0, pts: -(penalties[id] || 0), form: [], home: { w: 0, d: 0, l: 0 }, away: { w: 0, d: 0, l: 0 } }]));
  fixtures.forEach((round, md) => {
    if (md >= upTo) return;
    for (const f of round) {
      if (!f.res) continue;
      const [gh, ga] = f.res;
      const H = rows.get(f.h); const A = rows.get(f.a);
      if (!H || !A) continue;
      H.p++; A.p++;
      H.gf += gh; H.ga += ga; A.gf += ga; A.ga += gh;
      if (gh > ga) { H.w++; A.l++; H.pts += 3; H.form.push('W'); A.form.push('L'); H.home.w++; A.away.l++; }
      else if (gh < ga) { A.w++; H.l++; A.pts += 3; H.form.push('L'); A.form.push('W'); H.home.l++; A.away.w++; }
      else { H.d++; A.d++; H.pts++; A.pts++; H.form.push('D'); A.form.push('D'); H.home.d++; A.away.d++; }
    }
  });
  const list = [...rows.values()];
  list.forEach((r) => { r.gd = r.gf - r.ga; r.form = r.form.slice(-5); });
  /* a pari punti: in Italia e Spagna la classifica avulsa fra le squadre
     appaiate (punti e differenza reti negli scontri diretti), poi la
     differenza reti generale e i gol fatti. Si calcola per gruppo, così
     l'ordine resta coerente anche con tre o più squadre alla pari. */
  const overall = (a, b) => (b.gd - a.gd) || (b.gf - a.gf) || a.id.localeCompare(b.id);
  const byPts = new Map();
  for (const r of list) byPts.set(r.pts, [...(byPts.get(r.pts) || []), r]);
  const sorted = [];
  for (const pts of [...byPts.keys()].sort((a, b) => b - a)) {
    const group = byPts.get(pts);
    if (tiebreak === 'h2h' && group.length > 1) {
      const ids2 = new Set(group.map((r) => r.id));
      const mini = new Map(group.map((r) => [r.id, { pts: 0, gd: 0 }]));
      fixtures.forEach((round, md) => {
        if (md >= upTo) return;
        for (const f of round) {
          if (!f.res || !ids2.has(f.h) || !ids2.has(f.a)) continue;
          const [gh, ga] = f.res;
          const H = mini.get(f.h); const A = mini.get(f.a);
          H.gd += gh - ga; A.gd += ga - gh;
          if (gh > ga) H.pts += 3; else if (gh < ga) A.pts += 3; else { H.pts++; A.pts++; }
        }
      });
      group.sort((a, b) => (mini.get(b.id).pts - mini.get(a.id).pts) || (mini.get(b.id).gd - mini.get(a.id).gd) || overall(a, b));
    } else {
      group.sort(overall);
    }
    sorted.push(...group);
  }
  list.length = 0;
  list.push(...sorted);
  list.forEach((r, i) => { r.pos = i + 1; });
  return list;
}

/** le zone della classifica per un campionato: { pos: 'ucl'|'uel'|'uecl'|'up'|'playoff'|'down' } */
export function zones(league) {
  const out = {};
  let pos = 1;
  if (league.europe) {
    for (const [k, n] of Object.entries(league.europe)) for (let i = 0; i < n; i++) out[pos++] = k;
  }
  if (league.up) for (let i = 1; i <= league.up; i++) out[i] = 'up';
  if (league.playoff) for (let i = league.playoff[0]; i <= league.playoff[1]; i++) out[i] = 'playoff';
  if (league.promotionPlayoff) out[league.promotionPlayoff] = 'playoff';
  if (league.down) for (let i = 0; i < league.down; i++) out[league.teams - i] = 'down';
  if (league.relegationPlayoff) out[league.relegationPlayoff] = 'relPlayoff';
  return out;
}

/** giornata di campionato (0-based) → data di gioco, per il calendario a schermo */
export function matchdayDate(season, md, total) {
  /* da fine agosto a fine maggio, con la sosta di Natale */
  const start = Date.UTC(season, 7, 23);
  const weeks = 40;
  const spacing = weeks / total;
  let w = md * spacing;
  if (w >= 17) w += 1.5; // sosta invernale
  return new Date(start + Math.round(w * 7) * 86400000);
}

/** quanti punti ci si aspetta da una squadra, data la forza sua e delle altre */
export function expectedPoints(strength, others, matches) {
  const avg = others.reduce((n, s) => n + s, 0) / Math.max(1, others.length);
  const gap = strength - avg;
  const ppm = clamp(1.36 + gap * 0.085, 0.5, 2.55);
  return ppm * matches;
}
