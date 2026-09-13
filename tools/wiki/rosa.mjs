/* Il catalogo di La Rosa: le 32 rose scritte a mano, le rose dei club
   stagione per stagione e le convocate dei grandi tornei.

   data/rosa/index.json   → l'elenco (per estrarre a caso senza scaricare tutto)
   data/rosa/s-<k>.json   → le rose, cento alla volta

   node tools/wiki/seasons.mjs && node tools/wiki/squads.mjs && node tools/wiki/rosa.mjs */

import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from './lib.mjs';

const SHARD = 100;
const MAX_PLAYERS = 26;
const read = (p) => JSON.parse(readFileSync(join(ROOT, p), 'utf8'));

const curated = read('data/squads.json').squads;
const seasons = read('tools/wiki/cache/seasons.json');
const tournaments = read('tools/wiki/cache/squads.json');

/* i colori delle nazionali: maglia e dettaglio */
const NATION_COLORS = {
  IT: ['#1E5AA8', '#F0EDE4'], BR: ['#FFDC02', '#19AE47'], AR: ['#75AADB', '#FFFFFF'], DE: ['#F0EDE4', '#111111'],
  FR: ['#21304D', '#E8E8E8'], ES: ['#C60B1E', '#FFC400'], 'GB-ENG': ['#F0EDE4', '#1D2B5C'], NL: ['#F36C21', '#1D2B5C'],
  PT: ['#9E1B32', '#006A4E'], BE: ['#C8102E', '#111111'], UY: ['#5CBFEB', '#111111'], MX: ['#006847', '#CE1126'],
  CL: ['#D52B1E', '#0039A6'], CO: ['#FCD116', '#003893'], PY: ['#D52B1E', '#FFFFFF'], PE: ['#FFFFFF', '#D91023'],
  EC: ['#FFDD00', '#034EA2'], BO: ['#007934', '#F9E300'], VE: ['#7B1B2B', '#FFFFFF'], US: ['#FFFFFF', '#0A3161'],
  SE: ['#FECC02', '#006AA7'], DK: ['#C60C30', '#FFFFFF'], NO: ['#BA0C2F', '#00205B'], FI: ['#FFFFFF', '#002F6C'],
  PL: ['#FFFFFF', '#DC143C'], HR: ['#FF0000', '#FFFFFF'], RS: ['#C6363C', '#0C4076'], YU: ['#0C4076', '#FFFFFF'],
  CS: ['#D7141A', '#FFFFFF'], CZ: ['#D7141A', '#11457E'], SK: ['#FFFFFF', '#0B4EA2'], RO: ['#FCD116', '#002B7F'],
  BG: ['#FFFFFF', '#00966E'], HU: ['#CD2A3E', '#436F4D'], AT: ['#FFFFFF', '#ED2939'], CH: ['#D52B1E', '#FFFFFF'],
  GR: ['#0D5EAF', '#FFFFFF'], TR: ['#E30A17', '#FFFFFF'], RU: ['#FFFFFF', '#D52B1E'], SU: ['#CC0000', '#FFFFFF'],
  UA: ['#FFD700', '#0057B7'], 'GB-SCT': ['#1D2B5C', '#FFFFFF'], 'GB-WLS': ['#C8102E', '#00B140'], 'GB-NIR': ['#00843D', '#FFFFFF'],
  IE: ['#169B62', '#FFFFFF'], IS: ['#02529C', '#DC1E35'], SI: ['#FFFFFF', '#005DA4'], BA: ['#002395', '#FECB00'],
  AL: ['#E41E20', '#111111'], MK: ['#D20000', '#FFE600'], GE: ['#FFFFFF', '#FF0000'], LV: ['#9E3039', '#FFFFFF'],
  DD: ['#FFFFFF', '#1D4E9E'], CSXX: ['#0C4076', '#FFFFFF'], IL: ['#FFFFFF', '#0038B8'],
  JP: ['#1D2B8C', '#FFFFFF'], KR: ['#C60C30', '#003478'], KP: ['#ED1C27', '#FFFFFF'], CN: ['#DE2910', '#FFDE00'],
  AU: ['#FFCD00', '#00843D'], NZ: ['#FFFFFF', '#111111'], IR: ['#FFFFFF', '#DA0000'], SA: ['#FFFFFF', '#006C35'],
  QA: ['#8A1538', '#FFFFFF'], AE: ['#FFFFFF', '#00732F'], KW: ['#007A3D', '#FFFFFF'], IQ: ['#FFFFFF', '#007A3D'],
  CM: ['#007A5E', '#CE1126'], NG: ['#008751', '#FFFFFF'], SN: ['#FFFFFF', '#00853F'], GH: ['#FFFFFF', '#CE1126'],
  CI: ['#F77F00', '#009E60'], MA: ['#C1272D', '#006233'], TN: ['#E70013', '#FFFFFF'], DZ: ['#FFFFFF', '#006233'],
  EG: ['#CE1126', '#FFFFFF'], ZA: ['#FFB81C', '#007749'], ZR: ['#007A3D', '#FCD116'], AO: ['#CC092F', '#111111'],
  TG: ['#FFCE00', '#006A4E'], CR: ['#CE1126', '#002B7F'], HN: ['#FFFFFF', '#0073CF'], SV: ['#0F47AF', '#FFFFFF'],
  JM: ['#FED100', '#009B3A'], HT: ['#00209F', '#D21034'], TT: ['#CE1126', '#111111'], PA: ['#DA121A', '#072357'],
  CA: ['#D80621', '#FFFFFF'],
};

/* nomi storici che non hanno un codice proprio */
const HISTORIC = { 'West Germany': 'DE-W' };

const CURATED_KEY = {
  Barcelona: 'Barcelona', Bayern: 'Bayern', 'Leicester City': 'Leicester City',
  Italia: 'IT', Brasile: 'BR', Francia: 'FR', Spagna: 'ES', Argentina: 'AR', Germania: 'DE', Portogallo: 'PT',
};
const TOUR_NAME = { Mondiali: 'wc', Europei: 'euro' };

const clean = (s) => s.replace(/\s*\([^)]*\)\s*$/, '').trim();
const out = [];
const taken = new Set();

for (const c of curated) {
  const kind = TOUR_NAME[c.league] ? 'nation' : 'club';
  const key = kind === 'nation'
    ? `${TOUR_NAME[c.league]}${c.season}-${CURATED_KEY[c.name] || c.name}`
    : `${CURATED_KEY[c.name] || c.name}|${c.season}`;
  taken.add(key);
  out.push({
    id: c.id, kind, name: c.name, season: c.season, league: c.league, colors: c.colors,
    code: kind === 'nation' ? CURATED_KEY[c.name] : null,
    tour: kind === 'nation' ? TOUR_NAME[c.league] : null,
    players: c.players, aliases: c.aliases || {}, curated: 1,
  });
}

for (const s of seasons) {
  if (taken.has(`${s.name}|${s.season}`)) continue;
  const players = s.players.slice(0, MAX_PLAYERS);
  const aliases = {};
  players.forEach((p) => { if (p.label && clean(p.label) !== p.name) aliases[p.name] = [clean(p.label)]; });
  out.push({
    id: s.id, kind: 'club', name: s.name, season: s.season, league: s.league, code: s.code,
    colors: s.colors || ['#EDE8DA', '#0D0F14'],
    players: players.map((p) => p.name), aliases,
  });
}

for (const s of tournaments) {
  if (taken.has(`${s.tournament}${s.year}-${s.nation}`)) continue;
  const code = HISTORIC[s.nationName] || s.nation;
  out.push({
    id: s.id, kind: 'nation', name: s.nationName, season: String(s.year), league: s.tournament, tour: s.tournament,
    code, colors: NATION_COLORS[s.nation] || ['#EDE8DA', '#0D0F14'],
    players: s.players.map((p) => p.name).slice(0, 30), aliases: {},
  });
}

/* nessuna rosa con doppioni o troppo corta */
const valid = out.filter((s) => new Set(s.players).size === s.players.length && s.players.length >= 18);

rmSync(join(ROOT, 'data/rosa'), { recursive: true, force: true });
mkdirSync(join(ROOT, 'data/rosa'), { recursive: true });
const index = [];
for (let i = 0; i < valid.length; i += SHARD) {
  const part = valid.slice(i, i + SHARD);
  const shard = {};
  part.forEach((s, j) => {
    index.push([s.id, s.kind, s.name, s.season, s.league, s.code || '', s.colors, s.players.length, s.curated ? 1 : 0]);
    shard[s.id] = { players: s.players, aliases: s.aliases };
  });
  writeFileSync(join(ROOT, `data/rosa/s-${i / SHARD}.json`), JSON.stringify(shard));
}
writeFileSync(join(ROOT, 'data/rosa/index.json'), JSON.stringify({ v: 1, generated: new Date().toISOString().replace(/[-:T]/g, '').slice(0, 12), shard: SHARD, squads: index }));
const kinds = valid.reduce((m, s) => { m[s.kind] = (m[s.kind] || 0) + 1; return m; }, {});
console.log(`rose: ${valid.length}`, kinds, `scartate ${out.length - valid.length}`);
