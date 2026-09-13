/* Passo 1: chi può entrare nel catalogo.
   Non una lista scritta a mano ma le categorie di Wikipedia: chi ha giocato
   un Mondiale, un Europeo o una Copa América, e chi ha vestito la maglia di
   uno dei club principali. Da qui si pesca, poi le visualizzazioni decidono
   chi è conosciuto e chi meno. */

import { categoryMembers, writeJSON, ROOT } from './lib.mjs';
import { join } from 'node:path';

const WC = [1970, 1974, 1978, 1982, 1986, 1990, 1994, 1998, 2002, 2006, 2010, 2014, 2018, 2022]
  .map((y) => `Category:${y} FIFA World Cup players`);
const EURO = [1980, 1984, 1988, 1992, 1996, 2000, 2004, 2008, 2012, 2016, 2020, 2024]
  .map((y) => `Category:UEFA Euro ${y} players`);
const COPA = [1987, 1989, 1991, 1993, 1995, 1997, 1999, 2001, 2004, 2007, 2011, 2015, 2019, 2021, 2024]
  .map((y) => `Category:${y} Copa América players`).concat(['Category:Copa América Centenario players']);

const CLUBS = [
  'AC Milan players', 'Inter Milan players', 'Juventus FC players', 'AS Roma players', 'SS Lazio players',
  'SSC Napoli players', 'ACF Fiorentina players', 'Atalanta BC players', 'Torino FC players', 'Genoa CFC players',
  'UC Sampdoria players', 'Bologna FC 1909 players', 'Parma Calcio 1913 players', 'Udinese Calcio players',
  'Real Madrid CF players', 'FC Barcelona players', 'Atlético Madrid footballers', 'Valencia CF players',
  'Sevilla FC players', 'Villarreal CF players', 'Real Betis players', 'Athletic Bilbao footballers',
  'Manchester United F.C. players', 'Liverpool F.C. players', 'Arsenal F.C. players', 'Chelsea F.C. players',
  'Manchester City F.C. players', 'Tottenham Hotspur F.C. players', 'Newcastle United F.C. players',
  'Everton F.C. players', 'Aston Villa F.C. players', 'West Ham United F.C. players', 'Leeds United F.C. players',
  'FC Bayern Munich footballers', 'Borussia Dortmund players', 'Bayer 04 Leverkusen players', 'VfB Stuttgart players',
  'FC Schalke 04 players', 'SV Werder Bremen players', 'Hamburger SV players', 'RB Leipzig players',
  'Paris Saint-Germain FC players', 'Olympique de Marseille players', 'Olympique Lyonnais players',
  'AS Monaco FC players', 'Lille OSC players', 'AFC Ajax players', 'PSV Eindhoven players', 'Feyenoord players',
  'S.L. Benfica footballers', 'FC Porto players', 'Sporting CP footballers', 'Celtic F.C. players', 'Rangers F.C. players',
  'Galatasaray S.K. footballers', 'Fenerbahçe S.K. footballers', 'Beşiktaş J.K. footballers',
  'Boca Juniors footballers', 'Club Atlético River Plate footballers', 'CR Flamengo footballers', 'Santos FC players',
  'São Paulo FC players', 'SE Palmeiras players', 'SC Corinthians Paulista players',
  'LA Galaxy players', 'Inter Miami CF players', 'Al-Nassr FC players', 'Al Hilal SFC players',
  'Club América footballers', 'C.D. Guadalajara footballers',
].map((c) => `Category:${c}`);

const out = { sources: {}, titles: [] };
const all = new Set();

for (const cat of [...WC, ...EURO, ...COPA, ...CLUBS]) {
  const members = await categoryMembers(cat);
  out.sources[cat] = members.length;
  members.forEach((t) => all.add(t));
  console.log(`${String(members.length).padStart(5)}  ${cat}`);
}

/* le pagine "List of..." e simili non sono giocatori */
out.titles = [...all].filter((t) => !/^(List of|Lists of)/.test(t)).sort();
writeJSON(join(ROOT, 'tools/wiki/cache/candidates.json'), out, true);
console.log(`\ncandidati unici: ${out.titles.length}`);
const vuote = Object.entries(out.sources).filter(([, n]) => n === 0).map(([c]) => c);
if (vuote.length) console.log('CATEGORIE VUOTE (nome da correggere):\n  ' + vuote.join('\n  '));
