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

/* I campionati interi: chi ha giocato almeno una partita nella massima serie.
   È da qui che arrivano i giocatori meno noti, quelli che fanno la differenza
   fra un quiz facile e uno vero. */
const LEAGUES = [
  'Serie A players', 'Premier League players', 'La Liga players', 'Bundesliga players', 'Ligue 1 players',
  'Eredivisie players', 'Primeira Liga players', 'Süper Lig players', 'Scottish Premiership players',
  'Belgian Pro League players', 'Major League Soccer players', 'Saudi Pro League players',
  'Argentine Primera División players', 'Campeonato Brasileiro Série A players', 'Liga MX players',
  'Serie B players', 'EFL Championship players', 'Segunda División players', '2. Bundesliga players', 'Ligue 2 players',
  'Swiss Super League players', 'Austrian Football Bundesliga players', 'Danish Superliga players',
  'Allsvenskan players', 'Eliteserien players', 'Greek Super League players', 'Russian Premier League players',
  'Ukrainian Premier League players', 'Croatian Football League players', 'Serbian SuperLiga players',
  'J1 League players', 'K League 1 players', 'Chinese Super League players', 'Qatar Stars League players',
  'UAE Pro League players', 'Egyptian Premier League players', 'Uruguayan Primera División players',
  'Categoría Primera A players', 'Chilean Primera División players',
].map((c) => `Category:${c}`);

const AFCON = [2000, 2002, 2004, 2006, 2008, 2010, 2012, 2013, 2015, 2017, 2019, 2021, 2023]
  .map((y) => `Category:${y} Africa Cup of Nations players`);
const ASIAN = [2000, 2004, 2007, 2011, 2015, 2019, 2023].map((y) => `Category:${y} AFC Asian Cup players`);
const GOLD = [2002, 2003, 2005, 2007, 2009, 2011, 2013, 2015, 2017, 2019, 2021, 2023].map((y) => `Category:${y} CONCACAF Gold Cup players`);

const MORE_CLUBS = [
  'Brighton & Hove Albion F.C. players', 'Crystal Palace F.C. players', 'Fulham F.C. players', 'Wolverhampton Wanderers F.C. players',
  'Leicester City F.C. players', 'Southampton F.C. players', 'Nottingham Forest F.C. players', 'AFC Bournemouth players',
  'Brentford F.C. players', 'Real Sociedad footballers', 'Celta de Vigo players', 'Girona FC players', 'Deportivo de La Coruña players',
  'RCD Espanyol footballers', 'Eintracht Frankfurt players', 'VfL Wolfsburg players', 'Borussia Mönchengladbach players',
  'SC Freiburg players', 'TSG 1899 Hoffenheim players', 'Stade Rennais F.C. players', 'OGC Nice players', 'RC Lens players',
  'Club Brugge KV players', 'R.S.C. Anderlecht players', 'US Sassuolo Calcio players', 'Hellas Verona FC players',
  'Cagliari Calcio players', 'US Lecce players', 'Empoli FC players', 'Como 1907 players', 'Brescia Calcio players',
  'Palermo FC players', 'SS Chievo Verona players', 'Olympiacos F.C. players', 'Panathinaikos F.C. players',
  'FC Zenit Saint Petersburg players', 'FC Shakhtar Donetsk players', 'FC Dynamo Kyiv players', 'Red Bull Salzburg players',
  'FC Copenhagen players', 'Grêmio Foot-Ball Porto Alegrense players', 'Sport Club Internacional players',
  'Clube Atlético Mineiro players', 'Fluminense FC players', 'Botafogo de Futebol e Regatas players',
  'Club Atlético Independiente footballers', 'Racing Club de Avellaneda footballers', 'Club Nacional de Football players',
  'Peñarol players', 'Al-Ittihad Club (Jeddah) players', 'Al-Ahli Saudi FC players',
].map((c) => `Category:${c}`);

const out = { sources: {}, titles: [] };
const all = new Set();

for (const cat of [...WC, ...EURO, ...COPA, ...AFCON, ...ASIAN, ...GOLD, ...CLUBS, ...MORE_CLUBS, ...LEAGUES]) {
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
