/* Passo 6: le rose dei club, stagione per stagione, per La Rosa.
   Le pagine "2009–10 Inter Milan season" elencano la prima squadra con lo
   stesso template dei tornei. Si prende solo la sezione della rosa (non i
   prestiti in uscita, non le giovanili) e si scartano le pagine sospette. */

import { wikitexts, writeJSON, progress, ROOT } from './lib.mjs';
import { findTemplate, splitParams, clean, linkTarget } from './parse.mjs';
import { SOCIAL_COLORS } from './colors.mjs';
import { join } from 'node:path';

/* titolo Wikipedia · nome mostrato · campionato · paese */
const CLUBS = [
  ['Inter Milan', 'Inter', 'Serie A', 'IT'], ['AC Milan', 'Milan', 'Serie A', 'IT'], ['Juventus FC', 'Juventus', 'Serie A', 'IT'],
  ['SSC Napoli', 'Napoli', 'Serie A', 'IT'], ['AS Roma', 'Roma', 'Serie A', 'IT'], ['SS Lazio', 'Lazio', 'Serie A', 'IT'],
  ['ACF Fiorentina', 'Fiorentina', 'Serie A', 'IT'], ['Atalanta BC', 'Atalanta', 'Serie A', 'IT'], ['Parma Calcio 1913', 'Parma', 'Serie A', 'IT'],
  ['UC Sampdoria', 'Sampdoria', 'Serie A', 'IT'], ['Bologna FC 1909', 'Bologna', 'Serie A', 'IT'], ['Torino FC', 'Torino', 'Serie A', 'IT'],
  ['Udinese Calcio', 'Udinese', 'Serie A', 'IT'], ['Genoa CFC', 'Genoa', 'Serie A', 'IT'],
  ['FC Barcelona', 'Barcelona', 'LaLiga', 'ES'], ['Real Madrid CF', 'Real Madrid', 'LaLiga', 'ES'], ['Atlético Madrid', 'Atlético Madrid', 'LaLiga', 'ES'],
  ['Sevilla FC', 'Sevilla', 'LaLiga', 'ES'], ['Valencia CF', 'Valencia', 'LaLiga', 'ES'], ['Villarreal CF', 'Villarreal', 'LaLiga', 'ES'],
  ['Athletic Bilbao', 'Athletic Bilbao', 'LaLiga', 'ES'], ['Real Betis', 'Real Betis', 'LaLiga', 'ES'], ['Deportivo de La Coruña', 'Deportivo La Coruña', 'LaLiga', 'ES'],
  ['Manchester United F.C.', 'Manchester United', 'Premier League', 'GB-ENG'], ['Liverpool F.C.', 'Liverpool', 'Premier League', 'GB-ENG'],
  ['Arsenal F.C.', 'Arsenal', 'Premier League', 'GB-ENG'], ['Chelsea F.C.', 'Chelsea', 'Premier League', 'GB-ENG'],
  ['Manchester City F.C.', 'Manchester City', 'Premier League', 'GB-ENG'], ['Tottenham Hotspur F.C.', 'Tottenham Hotspur', 'Premier League', 'GB-ENG'],
  ['Newcastle United F.C.', 'Newcastle United', 'Premier League', 'GB-ENG'], ['Aston Villa F.C.', 'Aston Villa', 'Premier League', 'GB-ENG'],
  ['Everton F.C.', 'Everton', 'Premier League', 'GB-ENG'], ['Leeds United F.C.', 'Leeds United', 'Premier League', 'GB-ENG'],
  ['West Ham United F.C.', 'West Ham', 'Premier League', 'GB-ENG'], ['Leicester City F.C.', 'Leicester City', 'Premier League', 'GB-ENG'],
  ['FC Bayern Munich', 'Bayern', 'Bundesliga', 'DE'], ['Borussia Dortmund', 'Borussia Dortmund', 'Bundesliga', 'DE'],
  ['Bayer 04 Leverkusen', 'Bayer Leverkusen', 'Bundesliga', 'DE'], ['FC Schalke 04', 'Schalke 04', 'Bundesliga', 'DE'],
  ['SV Werder Bremen', 'Werder Bremen', 'Bundesliga', 'DE'], ['Hamburger SV', 'Hamburger SV', 'Bundesliga', 'DE'], ['VfB Stuttgart', 'VfB Stuttgart', 'Bundesliga', 'DE'],
  ['Paris Saint-Germain FC', 'Paris Saint-Germain', 'Ligue 1', 'FR'], ['Olympique de Marseille', 'Marseille', 'Ligue 1', 'FR'],
  ['Olympique Lyonnais', 'Lyon', 'Ligue 1', 'FR'], ['AS Monaco FC', 'Monaco', 'Ligue 1', 'FR'], ['LOSC Lille', 'Lille', 'Ligue 1', 'FR'],
  ['AFC Ajax', 'Ajax', 'Eredivisie', 'NL'], ['PSV Eindhoven', 'PSV', 'Eredivisie', 'NL'], ['Feyenoord', 'Feyenoord', 'Eredivisie', 'NL'],
  ['FC Porto', 'Porto', 'Primeira Liga', 'PT'], ['S.L. Benfica', 'Benfica', 'Primeira Liga', 'PT'], ['Sporting CP', 'Sporting CP', 'Primeira Liga', 'PT'],
  ['Celtic F.C.', 'Celtic', 'Scottish Premiership', 'GB-SCT'], ['Rangers F.C.', 'Rangers', 'Scottish Premiership', 'GB-SCT'],
  ['Galatasaray S.K.', 'Galatasaray', 'Süper Lig', 'TR'], ['Fenerbahçe S.K.', 'Fenerbahçe', 'Süper Lig', 'TR'],
];

const FIRST = 1992;
const LAST = 2025;
const dash = (y) => `${y}–${String((y + 1) % 100).padStart(2, '0')}`;
const displayName = (title) => title.replace(/\s*\([^)]*\)\s*$/, '').trim();

const wanted = [];
for (const [title, name, league, code] of CLUBS) {
  for (let y = FIRST; y <= LAST; y++) wanted.push({ page: `${dash(y)} ${title} season`, title, name, league, code, year: y });
}

const pages = await wikitexts(wanted.map((w) => w.page), progress('stagioni'), 20);

const SQUAD_HEAD = /squad|players|rosa|first[- ]team/i;
const NOT_SQUAD = /loan|out|youth|reserve|academy|transfer|left|departure|arrival|in\b|under-|u2\d|u19|b team|women|statistic|appearance|goal|disciplin|staff|management|contract|retire|number/i;
const FS = 'fs player|football squad player|fs player2|nat fs player|nat fs g player';
const ALL = 'efs player|fb si player|fb cs player|' + FS;
const TEMPLATE = new RegExp(`\\{\\{\\s*(${ALL})\\s*[|}]`, 'i');

/** il giocatore da un campo name/p: link, {{sortname}} o testo */
function who(value) {
  if (!value) return null;
  const sort = /\{\{\s*sortname\s*\|([^|}]*)\|([^|}]*)(?:\|([^|}]*))?/i.exec(value);
  if (sort) {
    const title = (sort[3] && !/=/.test(sort[3]) ? sort[3] : `${sort[1]} ${sort[2]}`).trim();
    return { title, name: displayName(`${sort[1]} ${sort[2]}`.trim()) };
  }
  const target = linkTarget(value);
  if (target) {
    const label = /\[\[[^\]|]+\|([^\]]+)\]\]/.exec(value);
    return { title: target, name: displayName(target), label: label ? clean(label[1]) : null };
  }
  const name = clean(value).replace(/\((?:c|captain|vc|vice-captain)\)/gi, '').trim();
  return name ? { title: null, name } : null;
}

const apps = (v) => String(v || '').split('+').reduce((n, x) => n + (parseInt(x, 10) || 0), 0);

/** tutti i template giocatore della pagina, con la sezione in cui stanno */
function scan(text) {
  const out = [];
  let inSquad = false;
  let squadLevel = 0;
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    const h = /^(={2,5})\s*(.+?)\s*\1\s*$/.exec(line);
    if (h) {
      const level = h[1].length;
      const head = clean(h[2]);
      if (inSquad && level <= squadLevel) inSquad = false;
      if (!inSquad && SQUAD_HEAD.test(head) && !NOT_SQUAD.test(head)) { inSquad = true; squadLevel = level; }
      else if (inSquad && NOT_SQUAD.test(head)) inSquad = false;
      continue;
    }
    let rest = raw;
    for (;;) {
      const m = TEMPLATE.exec(rest);
      if (!m) break;
      const body = findTemplate(rest.slice(m.index), ALL);
      if (!body) break;
      rest = rest.slice(m.index + body.length + 4);
      const kind = m[1].toLowerCase().replace(/\s+/g, ' ');
      const { params, positional } = splitParams(body);
      out.push({ kind, params, positional: positional || [], inSquad });
    }
  }
  return out;
}

function squadFrom(text) {
  const found = scan(text);
  const build = (rows, pick) => {
    const seen = new Set();
    const players = [];
    for (const r of rows) {
      const p = pick(r);
      if (!p || seen.has(p.name)) continue;
      seen.add(p.name);
      players.push(p);
    }
    return players;
  };

  /* 1. le statistiche: chi ha giocato davvero, ordinati per presenze */
  const efs = found.filter((r) => r.kind === 'efs player');
  if (efs.length >= 18) {
    const rows = efs.map((r) => {
      const w = who(r.params.name);
      if (!w) return null;
      const n = r.positional.filter((_, i) => i % 2 === 0).reduce((k, v) => k + apps(v), 0);
      return { ...w, pos: clean(r.params.pos).toUpperCase(), apps: n };
    }).filter((x) => x && x.apps > 0).sort((a, b) => b.apps - a.apps);
    const players = build(rows, (x) => x);
    if (players.length >= 18) return { source: 'stats', players: players.slice(0, 30) };
  }
  /* 2. le informazioni sulla rosa */
  const si = found.filter((r) => r.kind === 'fb si player' || r.kind === 'fb cs player');
  if (si.length >= 18) {
    const players = build(si, (r) => {
      const w = who(r.params.p || r.params.name);
      return w && { ...w, pos: clean(r.params.pos).toUpperCase() };
    });
    if (players.length >= 18) return { source: 'info', players };
  }
  /* 3. la rosa elencata, solo nella sua sezione */
  const fs = found.filter((r) => r.inSquad && new RegExp(`^(${FS})$`, 'i').test(r.kind));
  const players = build(fs, (r) => {
    if (/loan/i.test(clean(r.params.other || ''))) return null;
    const w = who(r.params.name);
    return w && { ...w, pos: clean(r.params.pos).toUpperCase() };
  });
  return { source: 'squad', players };
}

const squads = [];
let noPage = 0; let noSquad = 0;
const sources = {};
for (const w of wanted) {
  const page = pages.get(w.page);
  if (!page) { noPage++; continue; }
  const { source, players } = squadFrom(page.text);
  if (players.length < 18 || players.length > 36) { noSquad++; continue; }
  sources[source] = (sources[source] || 0) + 1;
  squads.push({
    id: `${w.name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-')}-${w.year + 1}`,
    club: w.title, name: w.name, league: w.league, code: w.code, year: w.year,
    season: `${w.year}/${String((w.year + 1) % 100).padStart(2, '0')}`,
    colors: SOCIAL_COLORS[w.title] || null,
    source,
    players: players.map(({ name, title, pos, label }) => ({ name, title, pos, ...(label && label !== name ? { label } : {}) })),
  });
}
console.log('fonti:', sources);

if (process.argv.includes('--diag')) {
  const freq = {};
  for (const w of wanted) {
    const page = pages.get(w.page);
    if (!page || squads.some((q) => q.club === w.title && q.year === w.year)) continue;
    const names = new Set([...page.text.matchAll(/\{\{\s*([A-Za-z][A-Za-z0-9 _-]{1,40}?)\s*\|/g)].map((m) => m[1].toLowerCase()));
    names.forEach((n) => { freq[n] = (freq[n] || 0) + 1; });
  }
  console.log(Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 60));
}
writeJSON(join(ROOT, 'tools/wiki/cache/seasons.json'), squads);
console.log(`rose di club: ${squads.length} · pagine mancanti ${noPage} · senza rosa leggibile ${noSquad}`);
const per = {};
squads.forEach((s) => { per[s.name] = (per[s.name] || 0) + 1; });
console.log(per);
