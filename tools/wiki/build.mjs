/* Passo 6: dai dati grezzi ai file del gioco.
   Qui si fanno i controlli di qualità: una carriera con anni al contrario,
   presenze impossibili o gol più delle partite viene scartata, non
   corretta a occhio. Il rapporto finale dice cosa è stato tolto e perché. */

import { readJSON, writeJSON, ROOT } from './lib.mjs';
import { join } from 'node:path';
import { countryCode } from './countries.mjs';

const parsed = readJSON(join(ROOT, 'tools/wiki/cache/parsed.json'));
const { clubs: clubInfo, aliasOf } = readJSON(join(ROOT, 'tools/wiki/cache/clubs.json'));
const OUT = join(ROOT, 'data/players');
const NOW = 2026;

/* stesse competizioni scritte in modi diversi da una voce all'altra.
   I nomi storici restano quelli dell'epoca (Coppa dei Campioni non diventa
   Champions League): qui si uniscono solo le grafie dello stesso trofeo. */
const COMP_ALIASES = {
  'Football League Cup': 'EFL Cup', 'Football League/EFL Cup': 'EFL Cup', 'League Cup': 'EFL Cup',
  'FA Charity Shield': 'FA Community Shield',
  "European Cup Winners' Cup": "UEFA Cup Winners' Cup",
  'European Super Cup': 'UEFA Super Cup', 'European/UEFA Super Cup': 'UEFA Super Cup',
  'UEFA Europa Conference League': 'UEFA Conference League',
  'African Cup of Nations': 'Africa Cup of Nations',
  'Summer Olympic Games': 'Summer Olympics', 'Olympic Games': 'Summer Olympics', 'Olympic': 'Summer Olympics',
  'Olympic Gold Medal': 'Summer Olympics', 'Football at the Summer Olympics': 'Summer Olympics', 'Olympics': 'Summer Olympics',
  'FIFA World Youth Championship': 'FIFA U-20 World Cup',
  'UEFA Euro': 'UEFA European Championship', 'European Championship': 'UEFA European Championship',
  'FIFA Intercontinental Cup': 'Intercontinental Cup',
};

/* gli stessi nomi di ruolo che il gioco sa tradurre (src/players/terms.js) */
const POSITION_TERMS = [
  'goalkeeper', 'centre-back', 'center-back', 'full-back', 'right-back', 'left-back', 'wing-back', 'sweeper',
  'defensive midfielder', 'central midfielder', 'attacking midfielder', 'wide midfielder', 'midfielder',
  'left winger', 'right winger', 'winger', 'centre-forward', 'second striker', 'striker', 'inside forward',
  'forward', 'wing half', 'half-back', 'defender',
];

const report = { scartati: {}, spells: {}, note: [] };
const drop = (why) => { report.scartati[why] = (report.scartati[why] || 0) + 1; };
const dropSpell = (why) => { report.spells[why] = (report.spells[why] || 0) + 1; };

/* ------------------------------------------------------------------ */
/* club                                                                */
/* ------------------------------------------------------------------ */

const clubIds = new Map();
const clubs = [];
function clubRef(link, fallbackName) {
  const title = link ? (aliasOf[link] || link) : null;
  const key = title || `name:${fallbackName}`;
  if (clubIds.has(key)) return clubIds.get(key);
  const info = title ? clubInfo[title] : null;
  const id = clubs.length;
  clubs.push({
    key,
    name: (info && info.name) || fallbackName,
    colors: info && info.colors.length ? info.colors.slice(0, 2) : [],
    national: Boolean(info && info.national),
    players: 0,
  });
  clubIds.set(key, id);
  return id;
}

/* ------------------------------------------------------------------ */
/* controlli su una singola esperienza                                 */
/* ------------------------------------------------------------------ */

function okYears(y, birthYear, deathYear) {
  if (!y) return false;
  if (y.from < 1900 || y.from > NOW) return false;
  if (y.to != null && (y.to < y.from || y.to > NOW + 1)) return false;
  if (birthYear && (y.from < birthYear + 5 || y.from > birthYear + 50)) return false;
  if (deathYear && y.from > deathYear) return false;
  return true;
}

function okNumbers(caps, goals, role) {
  if (caps != null && caps > 900) return false;
  if (goals != null && caps != null && caps > 0 && goals > caps * 1.6 + 3) return false;
  if (goals != null && caps === 0 && goals > 0) return false;
  if (role === 'POR' && goals != null && goals > 30) return false;
  return true;
}

/* ------------------------------------------------------------------ */
/* giocatori                                                           */
/* ------------------------------------------------------------------ */

const seen = new Set();
const players = [];

for (const p of parsed) {
  if (seen.has(p.title)) { drop('doppione'); continue; }
  seen.add(p.title);
  if (!p.role) { drop('ruolo non leggibile'); continue; }
  if (!p.nation) { drop('nazione non leggibile'); continue; }
  if (!p.birthYear || p.birthYear < 1920 || p.birthYear > 2011) { drop('anno di nascita assente o strano'); continue; }

  const senior = [];
  for (const s of p.clubs) {
    if (!okYears(s.years, p.birthYear, p.deathYear)) { dropSpell('anni non validi'); continue; }
    if (!okNumbers(s.caps, s.goals, p.role)) { dropSpell('numeri impossibili'); continue; }
    if (/national|U-?\d{2}\b/i.test(s.link || '') && /national (football|soccer) team/i.test(s.link || '')) { dropSpell('nazionale fra i club'); continue; }
    senior.push(s);
  }
  if (!senior.length) { drop('nessuna squadra di club valida'); continue; }

  /* un'esperienza non valida in mezzo alla carriera rende inaffidabile tutta
     la scheda per il gioco delle carriere: la segno, non la uso lì */
  const complete = senior.length === p.clubs.length;

  const youth = p.youth.filter((s) => okYears(s.years, p.birthYear, p.deathYear) || !s.years);
  const national = p.national.filter((s) => okYears(s.years, p.birthYear, p.deathYear) && okNumbers(s.caps, s.goals, p.role));

  players.push({ p, senior, youth, national, complete });
}

/* notorietà da 0 a 99 sulle visualizzazioni, in scala logaritmica */
const fameOf = (views) => Math.max(0, Math.min(99, Math.round(26 * Math.log10(Math.max(1, views)) - 62)));

players.sort((a, b) => b.p.views - a.p.views);

const index = [];
const careers = {};
const nameCount = new Map();
players.forEach(({ p }) => nameCount.set(p.name, (nameCount.get(p.name) || 0) + 1));

players.forEach(({ p, senior, youth, national, complete }, id) => {
  const played = new Set();
  const c = senior.map((s) => {
    const ref = clubRef(s.link, s.name);
    if (s.caps !== 0) played.add(ref);
    return [s.years.from, s.years.to ?? 0, ref, s.loan ? 1 : 0, s.caps ?? -1, s.goals ?? -1];
  });
  played.forEach((ref) => { clubs[ref].players++; });

  const y = youth.map((s) => [s.years ? s.years.from : 0, s.years ? (s.years.to ?? 0) : 0, clubRef(s.link, s.name)]);

  /* ogni riga ha la sua nazione: chi ha cambiato nazionale (Diego Costa,
     Brasile e poi Spagna) non deve vedere tutta la carriera sotto una bandiera */
  const suffixOf = (name) => ((/\b(U-?\d{2}|Olympic|B)\b/i.exec(name || '') || [''])[0].replace('-', '').replace(/^olympic$/i, 'OLY'));
  const n = national.map((s) => {
    const code = countryCode(s.link) || countryCode(s.name) || p.nation;
    return [s.years.from, s.years.to ?? 0, code, suffixOf(s.name), s.caps ?? -1, s.goals ?? -1];
  });

  /* palmarès: gruppo del club collegato alla squadra della carriera, se c'è */
  const hon = p.honours.map((h) => {
    let group = h.group || '';
    if (h.kind === 'national') {
      const code = countryCode(group) || p.nation;
      group = `${code}|${suffixOf(group)}`;
    } else if (h.kind === 'club' && group) {
      const match = senior.find((s) => s.name === group || (s.link && (aliasOf[s.link] || s.link) === group));
      if (match) group = clubRef(match.link, match.name);
    } else if (h.kind === 'club' && !group) {
      /* chi ha giocato per un solo club spesso non scrive l'intestazione */
      const distinct = [...new Set(senior.map((s) => aliasOf[s.link] || s.link || s.name))];
      if (distinct.length === 1) group = clubRef(senior[0].link, senior[0].name);
    }
    return [h.kind[0], group, COMP_ALIASES[h.comp] || h.comp, h.label, h.year, h.result[0]];
  }).concat(p.medals.map((m) => ['n', `${p.nation}|${/olympic/i.test(m.comp) ? 'OLY' : ((/U-?(\d{2})|Under-?(\d{2})/i.exec(m.comp) || []).slice(1).filter(Boolean).map((d) => `U${d}`)[0] || '')}`,COMP_ALIASES[m.comp] || m.comp, String(m.year), m.year, { gold: 'w', silver: 'r', bronze: 't', semi: 's' }[m.medal]]));

  /* il primo ruolo riconoscibile, anche quando la scheda li scrive attaccati */
  const lower = p.position.toLowerCase();
  const found = POSITION_TERMS
    .map((term) => ({ term, at: lower.indexOf(term) }))
    .filter((x) => x.at >= 0)
    .sort((a, b) => a.at - b.at || b.term.length - a.term.length)[0];
  const pos = found ? found.term : p.position.split(/[,;]/)[0].trim().toLowerCase();
  const label = nameCount.get(p.name) > 1 ? `${p.name} (${p.birthYear})` : p.name;

  index.push([id, label, p.birthYear, p.nation, p.role, fameOf(p.views), [...played], complete ? 1 : 0, p.deathYear || 0]);
  careers[id] = {
    t: p.title, h: p.height || 0, pos, cc: p.currentClub || '',
    y, c, n, hon, full: p.fullname && p.fullname !== p.name ? p.fullname : '',
  };
});

/* i club senza giocatori con presenze non servono a nessuno */
/* due squadre diverse con lo stesso nome (Arsenal, Barcelona SC, Nacional...)
   nella ricerca si confonderebbero: a chi ha un omonimo va il nome completo */
const byName = new Map();
clubs.forEach((c) => {
  if (!c.players) return;
  if (!byName.has(c.name)) byName.set(c.name, []);
  byName.get(c.name).push(c);
});
for (const [name, group] of byName) {
  if (group.length < 2) continue;
  /* il più presente nel catalogo tiene il nome breve, gli altri il nome intero */
  group.sort((a, b) => b.players - a.players).slice(1).forEach((c) => {
    if (c.key.startsWith('name:')) return;
    const full = c.key.replace(/\s*\((football|soccer|men's team|men's football)\)$/i, '');
    if (full !== name) { report.note.push(`omonimo: ${name} -> ${full}`); c.name = full; }
  });
}
const clubsOut = clubs.map((c) => [c.name, ...(c.colors.length ? c.colors : [])]);

writeJSON(join(OUT, 'index.json'), { v: 1, generated: new Date().toISOString().replace(/[-:T]/g, '').slice(0, 12), clubs: clubsOut, players: index });
const SHARD = 400;
const shards = Math.ceil(index.length / SHARD);
for (let k = 0; k < shards; k++) {
  const part = {};
  for (let id = k * SHARD; id < Math.min(index.length, (k + 1) * SHARD); id++) part[id] = careers[id];
  writeJSON(join(OUT, `careers-${k}.json`), part);
}

/* ------------------------------------------------------------------ */
/* indizi per l'Impostore                                              */
/* ------------------------------------------------------------------ */
/* Ogni indizio è un fatto ricavato dai dati, non un'opinione: una squadra in
   cui ha giocato (mai la più importante), il decennio, il continente, un
   trofeo vinto, un tratto della carriera. Vago abbastanza da non tradire il
   nome, preciso abbastanza da poterci giocare sopra. */

const CONFED = {
  UEFA: 'AD AL AM AT AZ BA BE BG BY CH CY CZ DE DK EE ES FI FO FR GB GB-ENG GB-NIR GB-SCT GB-WLS GE GI GR HR HU IE IL IS IT KZ LI LT LU LV MC MD ME MK MT NL NO PL PT RO RS RU SE SI SK SM TR UA XK CS SU YU DD CSXX',
  CONMEBOL: 'AR BO BR CL CO EC PE PY UY VE',
  CONCACAF: 'AG AI AW BB BM BS BZ CA CR CU CW DM DO GD GF GP GT GY HN HT JM KN KY LC MQ MS MX NI PA PR SR SV TC TT US VC VG',
  CAF: 'AO BF BI BJ BW CD CF CG CI CM CV DJ DZ EG ER ET GA GH GM GN GQ GW KE KM LR LS LY MA MG ML MR MU MW MZ NA NE NG RW SC SD SL SN SO SS ST SZ TD TG TN TZ UG ZA ZM ZW ZR',
  AFC: 'AE AF AU BD BH BN BT CN HK ID IN IQ IR JO JP KG KH KP KR KW LA LB LK MM MN MO MV MY NP OM PH PK PS QA SA SG SY TH TJ TL TM TW UZ VN YE',
  OFC: 'FJ NC NZ PF PG SB TO VU WS',
};
const confedOf = new Map();
Object.entries(CONFED).forEach(([k, list]) => list.split(' ').forEach((c) => confedOf.set(c, k)));

const WIN = (h, re) => h.result === 'winner' && re.test(h.comp);
const clues = {};
players.forEach(({ p, senior }, id) => {
  const row = index[id];
  if (row[5] < 50) return;
  const out = [];

  /* una squadra con almeno quindici presenze che non sia quella della vita */
  const byClub = new Map();
  senior.forEach((s) => {
    const ref = clubRef(s.link, s.name);
    byClub.set(ref, (byClub.get(ref) || 0) + (s.caps || 0));
  });
  const ranked = [...byClub.entries()].sort((a, b) => b[1] - a[1]);
  ranked.slice(1).filter(([, caps]) => caps >= 15).slice(0, 2).forEach(([ref]) => out.push(`club:${ref}`));

  const first = Math.min(...senior.map((s) => s.years.from));
  const last = Math.max(...senior.map((s) => s.years.to || NOW));
  out.push(`decade:${Math.floor(((first + last) / 2) / 10) * 10}`);
  if (confedOf.has(p.nation)) out.push(`confed:${confedOf.get(p.nation)}`);
  out.push(`role:${p.role}`);

  const hon = p.honours;
  if (hon.some((h) => WIN(h, /^FIFA World Cup$/))) out.push('win:wc');
  if (hon.some((h) => WIN(h, /^(UEFA European Championship|UEFA Euro)$/))) out.push('win:euro');
  if (hon.some((h) => WIN(h, /^Copa Am[eé]rica$/))) out.push('win:copa');
  if (hon.some((h) => WIN(h, /^Africa Cup of Nations$/))) out.push('win:afcon');
  if (hon.some((h) => WIN(h, /(UEFA Champions League|European Cup)$/) && !/Winners/.test(h.comp))) out.push('win:ucl');
  if (hon.some((h) => WIN(h, /^(UEFA Europa League|UEFA Cup)$/))) out.push('win:uel');
  if (hon.some((h) => WIN(h, /^Copa Libertadores$/))) out.push('win:libertadores');
  if (hon.some((h) => h.kind === 'individual' && WIN(h, /^Ballon d'Or$/))) out.push('win:ballon');

  const leagueCaps = senior.reduce((n, s) => n + (s.caps || 0), 0);
  const leagueGoals = senior.reduce((n, s) => n + (s.goals || 0), 0);
  const distinct = new Set(senior.map((s) => clubRef(s.link, s.name))).size;
  if (ranked[0] && ranked[0][1] >= 250 && ranked[0][1] >= leagueCaps * 0.85) out.push('trait:oneclub');
  if (distinct >= 8) out.push('trait:journeyman');
  if (senior.filter((s) => s.loan).length >= 4) out.push('trait:loans');
  const caps = p.national.filter((n) => !n.youth).reduce((a, n) => a + (n.caps || 0), 0);
  if (caps >= 100) out.push('trait:centurion');
  if (p.height && p.height >= 193) out.push('trait:tall');
  if (p.height && p.height <= 170) out.push('trait:short');
  if (p.role !== 'POR' && leagueGoals >= 250) out.push('trait:scorer');
  if (last - first >= 20) out.push('trait:long');

  clues[id] = out;
});
writeJSON(join(OUT, 'clues.json'), clues);
report.indizi = Object.keys(clues).length;

report.giocatori = index.length;
report.completi = index.filter((r) => r[7]).length;
report.club = clubs.length;
report.clubConColori = clubs.filter((c) => c.colors.length).length;
report.shard = shards;
writeJSON(join(ROOT, 'tools/wiki/report.json'), report, true);
console.log(JSON.stringify(report, null, 2));
