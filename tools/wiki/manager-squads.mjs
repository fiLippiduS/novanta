/* Carriera allenatore, passo 2: le rose di oggi, giocatore per giocatore.

   Da ogni pagina di club si leggono i template {{Fs player}} (o
   {{football squad player}}) della prima squadra, dei prestiti in uscita e,
   solo per completare una rosa corta, del settore giovanile. Poi la scheda di
   ogni giocatore dà anno di nascita, ruolo preciso, altezza e presenze in
   nazionale; le visualizzazioni della voce dicono quanto è conosciuto.

   Il voto non è scritto da nessuna parte su Wikipedia: nasce dalla forza del
   club nel suo campionato, da quanto il giocatore spicca dentro la rosa, dalle
   presenze in nazionale e dall'età. È un punto di partenza: in partita i voti
   si muovono con il rendimento.

   node tools/wiki/leagues.mjs && node tools/wiki/manager-squads.mjs */

import { wikitexts, resolveTitles, pageviews, readJSON, writeJSON, progress, ROOT } from './lib.mjs';
import { findTemplate, splitParams, clean, linkTarget, parseInfobox } from './parse.mjs';
import { countryCode } from './countries.mjs';
import { SOCIAL_COLORS } from './colors.mjs';
import { SEASON, LEAGUES, previousStandings } from './leagues.mjs';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const leagues = readJSON(join(ROOT, 'tools/wiki/cache/leagues.json'));
const SEASON_YEAR = Number(SEASON.slice(0, 4)); // 2026: l'età si conta a inizio stagione

/* ------------------------------------------------------------------ */
/* 1. pagine dei club e sezioni della rosa                              */
/* ------------------------------------------------------------------ */

const clubTitles = leagues.flatMap((l) => l.clubs.map((c) => c.page));
const clubPages = await wikitexts(clubTitles, progress('club'), 10);

const PLAYER_TPL = /\{\{\s*(fs player|football squad player|fs2 player|football squad player2)\s*\|/i;
const FIRST = /squad|players|first[- ]team|current|roster|plantilla|kader/i;
const LOAN = /loan/i;
const YOUTH = /under-?\s?\d{2}|\bu-?\d{2}\b|youth|academy|primavera|reserve|\bb team\b|castilla|atl[eè]tic|juvenil|development|next gen|\bii\b|women|femen|ladies/i;
const NOT_SQUAD = /former|notable|retired|record|captain|staff|management|coach|board|season|year|history|international|hall of fame|player of|award|kit|stadium|honou?r|statistic|ownership|numbers?/i;

function squadOf(text) {
  const out = [];
  let ctx = null; // 'first' | 'loan' | 'youth' | null
  let level = 0;
  let youthLevel = 99;
  for (const line of text.split('\n')) {
    const h = /^(={2,5})\s*(.+?)\s*\1\s*$/.exec(line.trim());
    if (h) {
      const lv = h[1].length;
      const name = clean(h[2]);
      if (lv <= youthLevel) youthLevel = 99;
      if (YOUTH.test(name) && !/first/i.test(name)) { ctx = 'youth'; youthLevel = lv; }
      else if (youthLevel < 99) ctx = 'youth';
      else if (LOAN.test(name)) ctx = 'loan';
      else if (NOT_SQUAD.test(name) && !/current squad|first[- ]team squad/i.test(name)) ctx = null;
      else if (FIRST.test(name)) ctx = 'first';
      else if (lv <= level) ctx = null;
      level = lv;
      continue;
    }
    if (!ctx || !PLAYER_TPL.test(line)) continue;
    let rest = line;
    let m;
    while ((m = PLAYER_TPL.exec(rest))) {
      const body = findTemplate(rest.slice(m.index), 'fs player|football squad player|fs2 player|football squad player2');
      if (!body) break;
      rest = rest.slice(m.index + body.length + 4);
      const { params } = splitParams(body);
      const title = linkTarget(params.name);
      const name = clean(params.name).replace(/\((?:c|vc|captain)\)/gi, '').trim();
      if (!name) continue;
      const other = clean(params.other || '');
      out.push({
        ctx,
        no: /^\d{1,2}$/.test(clean(params.no)) ? Number(clean(params.no)) : null,
        pos: clean(params.pos).toUpperCase().slice(0, 2),
        nat: clean(params.nat).toUpperCase(),
        name,
        title,
        captain: /^captain\b|\bcaptain$/i.test(other) && !/vice/i.test(other),
        loanIn: /on loan from/i.test(other),
      });
    }
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* 2. nazionalità: {{Fs player|nat=ITA}} usa i codici FIFA/CIO           */
/* ------------------------------------------------------------------ */

const rawSquads = new Map();
for (const league of leagues) {
  for (const club of league.clubs) {
    const page = clubPages.get(club.page);
    if (!page) throw new Error(`manca la pagina ${club.page}`);
    rawSquads.set(club.page, { league, club, page, players: squadOf(page.text) });
  }
}
const natCodes = [...new Set([...rawSquads.values()].flatMap((s) => s.players.map((p) => p.nat)).filter(Boolean))];
const natTitles = await resolveTitles(natCodes.map((c) => `Template:Country data ${c}`));
const NAT = new Map();
for (const code of natCodes) {
  const t = natTitles.get(`Template:Country data ${code}`);
  const country = t && t.replace(/^Template:Country data /, '');
  const iso = country && (countryCode(country) || countryCode(country.replace(/\s*\([^)]*\)\s*$/, '')) || countryCode(country.replace(/^Saint /, 'St. ')));
  if (iso) NAT.set(code, iso);
}
const unknownNat = natCodes.filter((c) => !NAT.has(c) && !countryCode(c.toLowerCase()));
if (unknownNat.length) console.log('nazionalità non riconosciute:', unknownNat.join(', '));

/* ------------------------------------------------------------------ */
/* 3. schede dei giocatori e visualizzazioni                            */
/* ------------------------------------------------------------------ */

const playerTitles = [...new Set([...rawSquads.values()].flatMap((s) => s.players.map((p) => p.title)).filter(Boolean))];
const playerPages = await wikitexts(playerTitles, progress('giocatori'), 20);
const canonical = new Map(playerTitles.map((t) => [t, playerPages.get(t)?.title || t]));
const views = await pageviews([...new Set(canonical.values())], progress('visualizzazioni'), 7);

/* ruolo preciso dalla scheda; se manca, dal GK/DF/MF/FW della rosa */
function fineRole(position, pos) {
  const p = (position || '').toLowerCase();
  const first = p.split(/[,/;]| and | or /)[0] || '';
  const pick = (s) => {
    if (/goalkeeper|keeper/.test(s)) return 'POR';
    if (/wing[- ]?back|full[- ]?back|(left|right)[- ]back|lateral/.test(s)) return 'TZ';
    if (/centre[- ]?back|center[- ]?back|central defender|sweeper|libero|stopper|defender/.test(s)) return 'DC';
    if (/defensive midfield|holding|anchor/.test(s)) return 'MED';
    if (/attacking midfield|playmaker|trequartista|number 10/.test(s)) return 'TRQ';
    if (/winger|wide midfield|wide forward|(left|right) midfield/.test(s)) return 'ALA';
    if (/midfield|box-to-box|mezzala/.test(s)) return 'CC';
    if (/striker|centre[- ]?forward|center[- ]?forward|forward|attacker|second striker/.test(s)) return 'PUN';
    return null;
  };
  const r = pick(first) || pick(p);
  const fromPos = { GK: 'POR', DF: 'DC', MF: 'CC', FW: 'PUN' }[pos] || null;
  /* la rosa ha l'ultima parola sul reparto: un "defender" in una lista di
     centrocampisti è un mediano adattato, non un errore della rosa */
  if (!r) return fromPos;
  const dept = { POR: 'GK', DC: 'DF', TZ: 'DF', MED: 'MF', CC: 'MF', TRQ: 'MF', ALA: 'MF', PUN: 'FW' }[r];
  if (!fromPos || dept === pos || (r === 'ALA' && pos === 'FW') || (r === 'TRQ' && pos === 'FW') || (r === 'MED' && pos === 'DF')) return r;
  return fromPos;
}
const side = (position) => (/\bleft\b/i.test(position || '') ? 'L' : /\bright\b/i.test(position || '') ? 'R' : '');

function detail(p) {
  const page = p.title ? playerPages.get(p.title) : null;
  const box = page ? parseInfobox(page.text) : null;
  const senior = (box?.national || []).filter((s) => !s.youth);
  const caps = senior.reduce((n, s) => n + (s.caps || 0), 0);
  const intlGoals = senior.reduce((n, s) => n + (s.goals || 0), 0);
  const leagueApps = (box?.clubs || []).reduce((n, s) => n + (s.caps || 0), 0);
  return {
    birth: box?.birthYear && box.birthYear > 1980 && box.birthYear < SEASON_YEAR - 14 ? box.birthYear : null,
    role: fineRole(box?.position, p.pos),
    side: side(box?.position),
    height: box?.height || null,
    caps,
    intlGoals,
    apps: leagueApps,
    views: p.title ? views.get(canonical.get(p.title)) || 0 : 0,
    nation: NAT.get(p.nat) || countryCode(p.nat.toLowerCase()) || (senior[0] && countryCode(senior[0].name)) || null,
  };
}

/* ------------------------------------------------------------------ */
/* 4. forza dei club e voti                                             */
/* ------------------------------------------------------------------ */

/* il livello medio di ogni campionato, prima delle differenze fra club */
const LEAGUE_BASE = { eng1: 77, esp1: 76, ita1: 75, ger1: 75, fra1: 72, eng2: 67, ger2: 66.5, esp2: 65.5, ita2: 64, fra2: 63 };
const SPREAD = { eng1: 4.2, esp1: 4.6, ita1: 4.3, ger1: 4.6, fra1: 4.4, eng2: 2.6, ger2: 2.5, esp2: 2.4, ita2: 2.4, fra2: 2.4 };

function hash(s) {
  let h = 2166136261;
  for (const ch of s) { h ^= ch.codePointAt(0); h = Math.imul(h, 16777619); }
  return ((h >>> 0) % 10000) / 10000;
}

const clubs = [];
for (const { league, club, page, players } of rawSquads.values()) {
  const seen = new Set();
  const list = [];
  for (const p of players) {
    const key = p.title || p.name;
    if (seen.has(key)) continue;
    seen.add(key);
    list.push({ ...p, ...detail(p) });
  }
  clubs.push({ league, club, page, players: list });
}

/* La forza di un club nel suo campionato, da tre indizi messi insieme:
   - dove è arrivato la stagione scorsa (chi è salito parte dal fondo, chi è
     sceso dal campionato sopra parte dall'alto);
   - quante presenze in nazionale hanno i suoi sedici giocatori più usati;
   - quanto sono seguiti su Wikipedia (i club ricchi comprano nomi famosi).
   Ognuno si legge come distanza dalla media del campionato. */
const prev = await previousStandings();
const prevTitles = await resolveTitles([...new Set(Object.values(prev).flat().map((r) => r.page))]);
const prevByTitle = new Map();
for (const [lid, rows] of Object.entries(prev)) {
  for (const r of rows) prevByTitle.set(prevTitles.get(r.page) || r.page, { league: lid, pos: r.pos, of: r.of });
}
const LEVEL = Object.fromEntries(LEAGUES.map((l) => [l.id, l.level]));
const COUNTRY = Object.fromEntries(LEAGUES.map((l) => [l.id, l.code]));

function lastSeasonScore(c) {
  const p = prevByTitle.get(c.page.title);
  const level = c.league.level;
  if (!p || COUNTRY[p.league] !== c.league.code) return level === 1 ? -0.2 : 0.05; // salita da sotto
  const share = 1 - (p.pos - 1) / (p.of - 1);
  if (LEVEL[p.league] === level) return share;
  if (LEVEL[p.league] < level) return 0.75 + share * 0.25;                 // retrocessa: fra le migliori
  return -0.25 + share * 0.2;                                               // promossa
}

for (const league of leagues) {
  const mine = clubs.filter((c) => c.league.id === league.id);
  const top16 = (c, key) => c.players.filter((p) => p.ctx === 'first').map((p) => p[key]).sort((a, b) => b - a).slice(0, 16);
  const signals = [
    [0.45, mine.map(lastSeasonScore)],
    [0.3, mine.map((c) => top16(c, 'caps').reduce((n, v) => n + Math.log1p(v), 0) / 16)],
    [0.25, mine.map((c) => top16(c, 'views').reduce((n, v) => n + Math.log1p(v), 0) / 16)],
  ];
  const z = (vals) => {
    const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
    const sd = Math.sqrt(vals.reduce((a, b) => a + (b - mean) ** 2, 0) / vals.length) || 1;
    return vals.map((v) => (v - mean) / sd);
  };
  const zs = signals.map(([w, vals]) => z(vals).map((v) => v * w));
  const raw = mine.map((c, i) => zs.reduce((n, arr) => n + arr[i], 0));
  const zr = z(raw);
  mine.forEach((c, i) => {
    c.strength = Math.round((LEAGUE_BASE[league.id] + Math.max(-2, Math.min(2.2, zr[i])) * SPREAD[league.id]) * 10) / 10;
    c.lastSeason = prevByTitle.get(c.page.title) || null;
  });
}

function ageAdjust(age, role) {
  const peak = role === 'POR' ? [27, 33] : [24, 30];
  if (age < 18) return -9;
  if (age < peak[0]) return -(peak[0] - age) * (age < 21 ? 1.6 : 0.9);
  if (age > peak[1]) return -(age - peak[1]) * 1.1;
  return 0;
}

for (const c of clubs) {
  const first = c.players.filter((p) => p.ctx !== 'youth');
  const ranked = [...first].sort((a, b) => b.views - a.views);
  ranked.forEach((p, i) => { p.fameRank = ranked.length > 1 ? 1 - i / (ranked.length - 1) : 0.5; });
  for (const p of c.players) {
    if (!p.birth) {
      /* senza voce o senza data: giovani della rosa, quasi sempre */
      p.birth = SEASON_YEAR - (p.ctx === 'youth' ? 18 : 20) - Math.floor(hash(p.name) * 3);
      p.estimatedBirth = true;
    }
    const age = SEASON_YEAR - p.birth;
    const fame = p.ctx === 'youth' ? 0 : p.fameRank;
    const capsBoost = Math.min(3, Math.log1p(p.caps) * 0.75);
    const appsBoost = Math.min(1.2, Math.log1p(p.apps) * 0.2);
    const noise = (hash(`${p.name}|r`) - 0.5) * 2.4;
    let r = c.strength - 9.5 + fame ** 1.4 * 10.5 + capsBoost + appsBoost + ageAdjust(age, p.role) + noise;
    if (p.ctx === 'youth') r -= 6;
    if (!p.title) r -= 3;
    /* in cima la scala si stringe: i fuoriclasse sono pochi */
    if (r > 86) r = 86 + (r - 86) * 0.55;
    p.rating = Math.max(45, Math.min(93, Math.round(r)));
    p.age = age;
  }
}

/* ------------------------------------------------------------------ */
/* 5. rose complete: prima squadra, poi i prestiti, poi i giovani       */
/* ------------------------------------------------------------------ */

/* nomi per i rarissimi ragazzi generati: nome e cognome presi da due
   giocatori diversi del catalogo, della stessa nazione del club */
const INDEX = readJSON(join(ROOT, 'data/players/index.json'));
function generatedName(code, seed) {
  const pool = INDEX.players.filter((p) => p[3] === code && / /.test(p[1]));
  const a = pool[Math.floor(hash(`${seed}|a`) * pool.length)][1].split(' ');
  const b = pool[Math.floor(hash(`${seed}|b`) * pool.length)][1].split(' ');
  return `${a[0]} ${b[b.length - 1]}`;
}

const NEED = { POR: 2, DIF: 6, CEN: 4, ATT: 3 };
const NEED_MIDATT = 10;
const DEPT = { POR: 'POR', DC: 'DIF', TZ: 'DIF', MED: 'CEN', CC: 'CEN', TRQ: 'CEN', ALA: 'ATT', PUN: 'ATT' };
const MIN_SQUAD = 22;

function hex(v) {
  const m = /#?([0-9a-f]{6}|[0-9a-f]{3})\b/i.exec(clean(v || ''));
  if (!m) return null;
  let h = m[1].toUpperCase();
  if (h.length === 3) h = h.split('').map((x) => x + x).join('');
  return `#${h}`;
}

const oldClubs = existsSync(join(ROOT, 'tools/wiki/cache/clubs.json')) ? readJSON(join(ROOT, 'tools/wiki/cache/clubs.json')).clubs : {};
const problems = [];
const outClubs = {};
const outSquads = {};
for (const c of clubs) {
  const id = c.page.title.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/\b(f\.?c\.?|a\.?f\.?c\.?|c\.?f\.?|s\.?s\.?c?\.?|u\.?s\.?|a\.?c\.?|acf|ssc|us|as|ss|fc|cf|sc|bc|calcio|club|de futbol|football|sad)\b/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  const firstTeam = c.players.filter((p) => p.ctx === 'first');
  const youth = c.players.filter((p) => p.ctx === 'youth').sort((a, b) => b.rating - a.rating);
  const loansAll = c.players.filter((p) => p.ctx === 'loan').sort((a, b) => b.rating - a.rating);
  const squad = [...firstTeam];
  const used = new Set(squad.map((p) => p.title || p.name));
  const count = (d) => squad.filter((p) => DEPT[p.role] === d).length;
  const midAtt = () => count('CEN') + count('ATT');
  const add = (p, extra) => { used.add(p.title || p.name); squad.push({ ...p, ...extra }); };
  /* un reparto scoperto si completa: prima i giovani del vivaio, poi chi è
     in prestito altrove (richiamato), e solo alla fine un ragazzo generato */
  const short = () => Object.keys(NEED).filter((d) => count(d) < NEED[d]).concat(midAtt() < NEED_MIDATT ? ['MIDATT'] : []);
  const fits = (p, d) => (d === 'MIDATT' ? ['CEN', 'ATT'].includes(DEPT[p.role]) : DEPT[p.role] === d);
  for (const pool of [youth.map((p) => [p, { promoted: true }]), loansAll.map((p) => [p, { recalled: true, ctx: 'first' }])]) {
    for (const d of short()) {
      for (const [p, extra] of pool) {
        if (!short().includes(d)) break;
        if (!used.has(p.title || p.name) && fits(p, d)) add(p, extra);
      }
    }
  }
  for (const [p, extra] of youth.map((y) => [y, { promoted: true }])) {
    if (squad.length >= MIN_SQUAD) break;
    if (!used.has(p.title || p.name)) add(p, extra);
  }
  let gen = 0;
  const genRole = { POR: 'POR', DIF: 'DC', CEN: 'CC', ATT: 'PUN', MIDATT: 'CC' };
  while (short().length || squad.length < MIN_SQUAD) {
    const d = short()[0] || 'MIDATT';
    const name = generatedName(c.league.code, `${c.page.title}|${gen++}`);
    const role = genRole[d];
    const birth = SEASON_YEAR - 17 - Math.floor(hash(name) * 3);
    add({ name, title: null, no: null, ctx: 'first', role, side: '', height: 0, caps: 0, views: 0, nation: c.league.code, birth,
      rating: Math.max(45, Math.round(c.strength - 17 + hash(`${name}|g`) * 4)) }, { generated: true, promoted: true });
  }
  const loans = loansAll.filter((p) => !used.has(p.title || p.name));
  if (gen) problems.push(`${c.club.label} (${c.league.name}): ${gen} ragazzi generati`);

  const box = findTemplate(c.page.text, 'Infobox football club');
  const params = box ? splitParams(box).params : {};
  const old = oldClubs[c.page.title];
  const kit = [hex(params.body1) || hex(params.leftarm1), hex(params.shorts1)].filter(Boolean);
  const colors = SOCIAL_COLORS[c.page.title] || old?.colors?.length ? (SOCIAL_COLORS[c.page.title] || old.colors) : [...new Set(kit)].slice(0, 2);
  const capacity = Number(clean(params.capacity || '').replace(/[^\d]/g, '').slice(0, 6)) || null;
  if (outClubs[id]) throw new Error(`due club con lo stesso id ${id}: ${outClubs[id].title} e ${c.page.title}`);
  outClubs[id] = {
    id,
    title: c.page.title,
    name: old?.name || c.club.label,
    league: c.league.id,
    strength: c.strength,
    lastSeason: c.lastSeason,
    colors: colors.length ? colors : ['#EDE8DA', '#0B1220'],
    ground: clean(params.ground || '').replace(/\s*\(.*$/, '') || null,
    capacity,
  };
  const row = (p) => [
    p.name, p.birth, p.nation || '', p.role, p.rating, p.no ?? 0, p.side || '', p.height || 0, p.caps || 0,
    /* bandierine: c capitano · i in prestito da un altro club · o in prestito altrove · y dal vivaio · e data stimata */
    [p.captain && 'c', p.loanIn && 'i', p.ctx === 'loan' && 'o', (p.promoted || p.ctx === 'youth') && 'y', p.estimatedBirth && 'e', p.generated && 'g'].filter(Boolean).join(''),
    Math.round(Math.log1p(p.views) * 10),
  ];
  outSquads[id] = [...squad.map(row), ...loans.map(row)];
}

const byLeague = {};
for (const league of leagues) {
  byLeague[league.id] = Object.fromEntries(Object.entries(outSquads).filter(([id]) => outClubs[id].league === league.id));
  writeJSON(join(ROOT, `data/manager/squads-${league.id}.json`), { v: 1, season: SEASON, generated: new Date().toISOString().slice(0, 10), squads: byLeague[league.id] });
}
writeJSON(join(ROOT, 'data/manager/leagues.json'), {
  v: 1,
  season: SEASON,
  fields: ['name', 'birth', 'nation', 'role', 'rating', 'number', 'side', 'height', 'caps', 'flags', 'fame'],
  leagues: leagues.map(({ page, clubs: lc, ...l }) => ({ ...l, clubs: Object.values(outClubs).filter((c) => c.league === l.id).map((c) => c.id) })),
  clubs: outClubs,
}, true);

const total = Object.values(outSquads).reduce((n, s) => n + s.length, 0);
console.log(`club ${Object.keys(outClubs).length} · giocatori ${total}`);
for (const league of leagues) {
  const cs = Object.values(outClubs).filter((c) => c.league === league.id).sort((a, b) => b.strength - a.strength);
  console.log(`${league.name}: ${cs.map((c) => `${c.name} ${c.strength}`).join(' · ')}`);
}
if (problems.length) {
  console.log('\nDA CONTROLLARE:');
  problems.forEach((p) => console.log(' ', p));
}
