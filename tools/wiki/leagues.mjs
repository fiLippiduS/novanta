/* Carriera allenatore, passo 1: i campionati della stagione in corso.
   Le squadre si leggono dalla classifica della pagina stagionale (il modulo
   Sports table con i parametri name_XXX), che su alcune pagine sta in un
   template a parte: "Template:2026–27 La Liga table". */

import { wikitexts, writeJSON, ROOT } from './lib.mjs';
import { linkTarget, clean } from './parse.mjs';
import { join } from 'node:path';

export const SEASON = '2026–27';

/* per ogni campionato: pagina, nazione, livello, quante squadre, chi sale e
   chi scende, i posti europei (dalle regole UEFA della stagione) */
export const LEAGUES = [
  { id: 'ita1', page: `${SEASON} Serie A`, name: 'Serie A', code: 'IT', level: 1, teams: 20, down: 3, europe: { ucl: 4, uel: 1, uecl: 1 }, cup: 'Coppa Italia', lower: 'ita2' },
  { id: 'ita2', page: `${SEASON} Serie B`, name: 'Serie B', code: 'IT', level: 2, teams: 20, up: 2, playoff: [3, 8], upper: 'ita1' },
  { id: 'eng1', page: `${SEASON} Premier League`, name: 'Premier League', code: 'GB-ENG', level: 1, teams: 20, down: 3, europe: { ucl: 4, uel: 1, uecl: 1 }, cup: 'FA Cup', lower: 'eng2' },
  { id: 'eng2', page: `${SEASON} EFL Championship`, name: 'Championship', code: 'GB-ENG', level: 2, teams: 24, up: 2, playoff: [3, 6], upper: 'eng1' },
  { id: 'esp1', page: `${SEASON} La Liga`, name: 'LaLiga', code: 'ES', level: 1, teams: 20, down: 3, europe: { ucl: 4, uel: 1, uecl: 1 }, cup: 'Copa del Rey', lower: 'esp2' },
  { id: 'esp2', page: `${SEASON} Segunda División`, name: 'LaLiga Hypermotion', code: 'ES', level: 2, teams: 22, up: 2, playoff: [3, 6], upper: 'esp1' },
  { id: 'ger1', page: `${SEASON} Bundesliga`, name: 'Bundesliga', code: 'DE', level: 1, teams: 18, down: 2, relegationPlayoff: 16, europe: { ucl: 4, uel: 1, uecl: 1 }, cup: 'DFB-Pokal', lower: 'ger2' },
  { id: 'ger2', page: `${SEASON} 2. Bundesliga`, name: '2. Bundesliga', code: 'DE', level: 2, teams: 18, up: 2, promotionPlayoff: 3, upper: 'ger1' },
  { id: 'fra1', page: `${SEASON} Ligue 1`, name: 'Ligue 1', code: 'FR', level: 1, teams: 18, down: 2, relegationPlayoff: 16, europe: { ucl: 3, uel: 1, uecl: 1 }, cup: 'Coupe de France', lower: 'fra2' },
  { id: 'fra2', page: `${SEASON} Ligue 2`, name: 'Ligue 2', code: 'FR', level: 2, teams: 18, up: 2, promotionPlayoff: 3, upper: 'fra1' },
];

/** le squadre di una classifica Sports table: name_XXX = [[Pagina|Nome]] */
export function teamsFromTable(text) {
  const names = new Map();
  for (const m of text.matchAll(/\|\s*name_([\p{L}\p{N}_]+)\s*=\s*((?:[^\n|[]|\[\[[^\]]*\]\])*)/gu)) {
    const page = linkTarget(m[2]);
    if (page && !names.has(m[1])) names.set(m[1], { code: m[1], page, label: clean(m[2]) });
  }
  /* chi gioca davvero lo dice team_order (o team1…teamN): i name_ possono
     contenere anche sigle vecchie rimaste nella pagina */
  let order = [];
  const to = /\|\s*team_order\s*=\s*([^\n|]+)/u.exec(text);
  if (to) order = to[1].split(',').map((s) => s.trim()).filter(Boolean);
  if (!order.length) {
    order = [...text.matchAll(/\|\s*team(\d+)\s*=\s*([\p{L}\p{N}_]+)/gu)]
      .sort((a, b) => a[1] - b[1]).map((m) => m[2]);
  }
  const seen = new Set();
  const out = [];
  for (const code of order.length ? order : [...names.keys()]) {
    const t = names.get(code);
    if (!t || seen.has(t.page)) continue;
    seen.add(t.page);
    out.push(t);
  }
  return out;
}

/** classifica finale da una tabella con win_/draw_/loss_/gf_/ga_ (null se mancano) */
export function standingsFromTable(text) {
  const teams = teamsFromTable(text);
  const num = (k, c) => {
    const m = new RegExp(`\\|\\s*${k}_${c}\\s*=\\s*(-?\\d+)`, 'u').exec(text);
    return m ? Number(m[1]) : null;
  };
  const rows = teams.map((t) => ({
    ...t, w: num('win', t.code), d: num('draw', t.code), l: num('loss', t.code),
    gf: num('gf', t.code), ga: num('ga', t.code), adj: num('adjust_points', t.code) || 0,
  }));
  if (rows.some((r) => r.w == null || r.d == null)) return null;
  rows.forEach((r) => { r.pts = 3 * r.w + r.d + r.adj; r.played = r.w + r.d + r.l; });
  rows.sort((a, b) => b.pts - a.pts || (b.gf - b.ga) - (a.gf - a.ga) || b.gf - a.gf);
  return rows;
}

/** la stagione prima: classifica di ogni campionato, per titolo di pagina del club */
export async function previousStandings(prevSeason = '2025–26') {
  const pages = LEAGUES.map((l) => l.page.replace(SEASON, prevSeason));
  const tables = await wikitexts(pages.map((p) => `Template:${p} table`), null, 10);
  const main = await wikitexts(pages, null, 10);
  const out = {};
  LEAGUES.forEach((l, i) => {
    const text = tables.get(`Template:${pages[i]} table`)?.text;
    const rows = (text && standingsFromTable(text)) || (main.get(pages[i]) && standingsFromTable(main.get(pages[i]).text));
    if (!rows) { console.log(`classifica ${pages[i]} non trovata`); return; }
    out[l.id] = rows.map((r, pos) => ({ page: r.page, pos: pos + 1, of: rows.length, pts: r.pts, played: r.played }));
  });
  return out;
}

async function main() {
  const pages = await wikitexts(LEAGUES.map((l) => l.page), null, 10);
  const tables = await wikitexts(LEAGUES.map((l) => `Template:${l.page} table`), null, 10);
  const leagues = [];
  for (const league of LEAGUES) {
    const page = pages.get(league.page);
    const table = tables.get(`Template:${league.page} table`);
    let teams = page ? teamsFromTable(page.text) : [];
    if (teams.length < league.teams && table) teams = teamsFromTable(table.text);
    if (teams.length !== league.teams) {
      throw new Error(`${league.name}: trovate ${teams.length} squadre invece di ${league.teams}`);
    }
    leagues.push({ ...league, clubs: teams.map((t) => ({ page: t.page, label: t.label })) });
    console.log(`${league.name}: ${teams.map((t) => t.label).join(', ')}`);
  }
  writeJSON(join(ROOT, 'tools/wiki/cache/leagues.json'), leagues, true);
}

if (import.meta.url === `file://${process.argv[1]}`) await main();
