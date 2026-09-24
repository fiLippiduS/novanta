/* I colori delle squadre dell'Allenatore, presi dalla maglia.

   La scheda di Wikipedia dà un colore di sfondo che per le squadre a strisce
   inganna: il Pisa risulta nero, il Vicenza bianco, e mezza Serie B finisce
   con un colore solo. Il riquadro della divisa, invece, ha i codici esatti di
   maglia, calzoncini e calzettoni (body1, leftarm1, shorts1, socks1): da lì
   si ricavano i due colori sociali.

   Quello che il riquadro non dice — le strisce, che stanno dentro il nome
   dell'immagine — lo copre la tabella qui sotto, scritta a mano per i club
   dove il colore secondario non compare da nessuna parte.

   node tools/manager/club-colors.mjs            controlla e scrive
   node tools/manager/club-colors.mjs --check    solo il rapporto */

import { readFileSync, writeFileSync } from 'node:fs';
import { wikitexts } from '../wiki/lib.mjs';

const FILE = new URL('../../data/manager/leagues.json', import.meta.url);
const leagues = JSON.parse(readFileSync(FILE, 'utf8'));

/* i colori che il riquadro della divisa non può dare: strisce, bordi, seconde
   maglie storiche. Scritti a mano, club per club. */
const MANUAL = {
  'inter-milan': ['#0068A8', '#000000'], milan: ['#FB090B', '#000000'], juventus: ['#FFFFFF', '#000000'],
  napoli: ['#12A0D7', '#FFFFFF'], roma: ['#8E1F2F', '#F0BC42'], lazio: ['#87D8F7', '#FFFFFF'],
  atalanta: ['#1E71B8', '#000000'], fiorentina: ['#592C82', '#FFFFFF'], torino: ['#881F19', '#FFFFFF'],
  frosinone: ['#FFD100', '#0057A8'], pisa: ['#1B2F5E', '#000000'], 'lr-vicenza': ['#FFFFFF', '#D2232A'],
  'mantova-1911': ['#FFFFFF', '#D2232A'], padova: ['#FFFFFF', '#D2232A'], 'virtus-entella': ['#9FD5F0', '#FFFFFF'],
  'carrarese-1908': ['#0072CE', '#FFFFFF'], avellino: ['#FFFFFF', '#00843D'], arezzo: ['#8E1F3C', '#FFFFFF'],
  palermo: ['#F7B6D2', '#000000'], cesena: ['#FFFFFF', '#000000'], ascoli: ['#000000', '#FFFFFF'],
  'hellas-verona': ['#FFD700', '#003366'], sampdoria: ['#1B5497', '#FFFFFF'], cremonese: ['#E4002B', '#8E8E8E'],

  barcelona: ['#A50044', '#004D98'], 'real-madrid': ['#FFFFFF', '#FEBE10'], 'atletico-madrid': ['#CB3524', '#272E61'],
  'athletic-bilbao': ['#EE2523', '#FFFFFF'], sevilla: ['#FFFFFF', '#D81920'], valencia: ['#FFFFFF', '#EE3524'],
  'rcd-espanyol': ['#007FC8', '#FFFFFF'], 'sd-eibar': ['#00539F', '#A50044'], 'cd-castellon': ['#FFFFFF', '#000000'],
  'real-sociedad-b': ['#0067B1', '#FFFFFF'], 'ce-sabadell': ['#0000A0', '#FFFFFF'], 'cd-leganes': ['#005BAC', '#FFFFFF'],
  'rc-celta-fortuna': ['#8AC3EE', '#FFFFFF'], 'cd-eldense': ['#173097', '#FFFFFF'], cordoba: ['#FFFFFF', '#00713C'],
  'albacete-balompie': ['#FFFFFF', '#000000'], 'ad-ceuta': ['#FFFFFF', '#000000'], 'ud-las-palmas': ['#FFE400', '#0055A4'],

  'bayern-munich': ['#DC052D', '#FFFFFF'], 'borussia-dortmund': ['#FDE100', '#000000'],
  'borussia-monchengladbach': ['#FFFFFF', '#00A14B'], 'schalke-04': ['#004D9D', '#FFFFFF'],
  'hannover-96': ['#E30613', '#000000'], 'st-pauli': ['#65423A', '#FFFFFF'], 'paderborn-07': ['#004F9F', '#000000'],
  '1-heidenheim': ['#E30613', '#003C7D'], karlsruher: ['#0033A0', '#FFFFFF'], '1-magdeburg': ['#004A99', '#FFFFFF'],
  'vfl-osnabruck': ['#5B2A86', '#FFFFFF'], 'sv-elversberg': ['#000000', '#FFFFFF'],
  'hamburger-sv': ['#0A3F86', '#FFFFFF'], 'vfb-stuttgart': ['#FFFFFF', '#E32219'], 'rb-leipzig': ['#FFFFFF', '#DD0741'],

  'paris-saint-germain': ['#004170', '#DA291C'], 'olympique-de-marseille': ['#FFFFFF', '#2FAEE0'],
  'olympique-lyonnais': ['#FFFFFF', '#1D3D8F'], 'saint-etienne': ['#009639', '#FFFFFF'],
  paris: ['#0B2265', '#FFFFFF'], 'le-mans': ['#FFD100', '#E4002B'], annecy: ['#E4002B', '#FFFFFF'],
  'nancy-lorraine': ['#FFFFFF', '#D2232A'], 'rodez-af': ['#D2232A', '#FFCC00'], 'grenoble-foot-38': ['#0055A4', '#FFFFFF'],
  'dijon-fco': ['#E4002B', '#FFFFFF'], pau: ['#003DA5', '#FFD100'], 'clermont-foot-63': ['#E4002B', '#003DA5'],
  'stade-lavallois': ['#F36F21', '#000000'], 'red-star': ['#FFFFFF', '#0C6646'],

  'manchester-united': ['#DA291C', '#FFFFFF'], liverpool: ['#C8102E', '#FFFFFF'], arsenal: ['#EF0107', '#FFFFFF'],
  chelsea: ['#034694', '#FFFFFF'], 'manchester-city': ['#6CABDD', '#FFFFFF'], 'tottenham-hotspur': ['#FFFFFF', '#132257'],
  'newcastle-united': ['#000000', '#FFFFFF'], 'west-ham-united': ['#7A263A', '#1BB1E7'],
  'aston-villa': ['#670E36', '#95BFE5'], wrexham: ['#D0021B', '#FFFFFF'],
  'lincoln-city': ['#CE131A', '#FFFFFF'], 'spvgg-greuther-furth': ['#01744D', '#FFFFFF'],
  'arminia-bielefeld': ['#0030FF', '#FFFFFF'],
};

/* i grigi e i quasi-bianchi da scartare quando si sceglie il secondo colore */
const isDull = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  const max = Math.max(r, g, b); const min = Math.min(r, g, b);
  return max - min < 18 && max > 40 && max < 225;
};
const norm = (raw) => {
  const h = String(raw).trim().replace(/^#/, '').toUpperCase();
  return /^[0-9A-F]{6}$/.test(h) ? `#${h}` : null;
};

/** i codici della prima divisa: maglia, maniche, calzoncini, calzettoni */
function kitColors(text) {
  const grab = (key) => {
    const m = text.match(new RegExp(`\\|\\s*${key}\\s*=\\s*([#0-9A-Fa-f]{6,7})`));
    return m ? norm(m[1]) : null;
  };
  const body = grab('body1');
  const parts = ['leftarm1', 'rightarm1', 'shorts1', 'socks1'].map(grab).filter(Boolean);
  const all = [body, ...parts].filter(Boolean);
  if (!all.length) return null;
  /* il colore della maglia viene prima; il secondo è il primo diverso che non sia un grigio */
  const first = body || all[0];
  const second = all.find((c) => c !== first && !isDull(c)) || all.find((c) => c !== first);
  return second ? [first, second] : [first];
}

const clubs = Object.values(leagues.clubs);
const titles = clubs.map((c) => c.title);
process.stdout.write(`voci da leggere: ${titles.length}\n`);
const pages = await wikitexts(titles, (i, n) => process.stdout.write(`\r  ${i}/${n}`), 20);
process.stdout.write('\n');

const report = [];
let fixed = 0;
for (const club of clubs) {
  const before = club.colors || [];
  const page = pages.get(club.title);
  const fromKit = page ? kitColors(page.text) : null;
  const manual = MANUAL[club.id];
  /* la tabella scritta a mano vince sempre; quello che già c'è e sta in piedi
     non si tocca; la divisa serve solo a riempire i buchi */
  const next = manual || (before.length === 2 && !before.includes('#EDE8DA') ? before : null) || (fromKit && fromKit.length === 2 ? fromKit : null) || before;
  const changed = JSON.stringify(next) !== JSON.stringify(before);
  if (changed) fixed++;
  club.colors = next;
  report.push({ id: club.id, name: club.name, before, after: next, source: manual ? 'mano' : fromKit && fromKit.length === 2 ? 'divisa' : 'scheda', changed });
}

const weak = report.filter((r) => r.after.length < 2);
console.log(`colori cambiati: ${fixed} su ${clubs.length}`);
console.log(`ancora con un colore solo: ${weak.length}${weak.length ? ` (${weak.map((w) => w.name).join(', ')})` : ''}`);
for (const r of report.filter((x) => x.changed)) {
  console.log(`  ${r.name.padEnd(26)} ${JSON.stringify(r.before).padEnd(24)} → ${JSON.stringify(r.after).padEnd(24)} ${r.source}`);
}

if (!process.argv.includes('--check')) {
  /* stesso formato con cui lo scrive tools/wiki: il file si legge e il diff pure */
  writeFileSync(FILE, `${JSON.stringify(leagues, null, 2)}\n`);
  console.log('scritto data/manager/leagues.json');
}
