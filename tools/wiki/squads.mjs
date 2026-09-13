/* Passo 5: le rose dei grandi tornei per La Rosa.
   Le pagine delle convocazioni di Mondiali, Europei e Copa América usano
   tutte lo stesso template: sono l'elenco più affidabile che esista di chi
   c'era davvero in quella squadra, in quell'anno. */

import { wikitexts, readJSON, writeJSON, progress, ROOT } from './lib.mjs';
import { findTemplate, splitParams, clean, linkTarget } from './parse.mjs';
import { countryCode } from './countries.mjs';
import { join } from 'node:path';

const TOURNAMENTS = [
  ...[1970, 1974, 1978, 1982, 1986, 1990, 1994, 1998, 2002, 2006, 2010, 2014, 2018, 2022]
    .map((y) => ({ key: 'wc', year: y, page: `${y} FIFA World Cup squads` })),
  ...[1980, 1984, 1988, 1992, 1996, 2000, 2004, 2008, 2012, 2016, 2020, 2024]
    .map((y) => ({ key: 'euro', year: y, page: `UEFA Euro ${y} squads` })),
  ...[1993, 1995, 1997, 1999, 2001, 2004, 2007, 2011, 2015, 2019, 2021, 2024]
    .map((y) => ({ key: 'copa', year: y, page: `${y} Copa América squads` })),
  { key: 'copa', year: 2016, page: 'Copa América Centenario squads' },
];

const pages = await wikitexts(TOURNAMENTS.map((t) => t.page), progress('tornei'), 5);
const displayName = (title) => title.replace(/\s*\([^)]*\)\s*$/, '').trim();

const squads = [];
for (const tour of TOURNAMENTS) {
  const page = pages.get(tour.page);
  if (!page) { console.log('manca', tour.page); continue; }
  let team = null;
  let current = null;
  for (const line of page.text.split('\n')) {
    const h = /^(={3,4})\s*(.+?)\s*\1\s*$/.exec(line.trim());
    if (h) {
      const name = clean(h[2]);
      const code = countryCode(name);
      if (code) {
        team = { code, name };
        current = { id: `${tour.key}${tour.year}-${code}`, tournament: tour.key, year: tour.year, nation: code, nationName: name, players: [] };
        squads.push(current);
      }
      continue;
    }
    if (!current || !/\{\{\s*(nat fs g player|national football squad player|nat fs player|fs player)/i.test(line)) continue;
    const body = findTemplate(line, 'nat fs g player|National football squad player|nat fs player|Fs player');
    if (!body) continue;
    const { params } = splitParams(body);
    const target = linkTarget(params.name);
    const name = target ? displayName(target) : clean(params.name).replace(/\((?:c|captain|vc)\)/gi, '').trim();
    if (!name) continue;
    current.players.push({ name, title: target, pos: clean(params.pos).toUpperCase() });
  }
}

const valid = squads.filter((s) => s.players.length >= 18 && s.players.length <= 30);
writeJSON(join(ROOT, 'tools/wiki/cache/squads.json'), valid);
console.log(`rose di torneo valide: ${valid.length} (scartate ${squads.length - valid.length})`);
const per = {};
valid.forEach((s) => { per[s.tournament] = (per[s.tournament] || 0) + 1; });
console.log(per);
