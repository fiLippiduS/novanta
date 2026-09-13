/* Passo 4: i club che compaiono nelle carriere.
   Nome breve e colori sociali letti dalla scheda del club su Wikipedia
   (body1, shorts1: i colori della prima maglia). */

import { wikitexts, resolveTitles, readJSON, writeJSON, progress, ROOT } from './lib.mjs';
import { findTemplate, splitParams, clean } from './parse.mjs';
import { SOCIAL_COLORS } from './colors.mjs';
import { join } from 'node:path';

const players = readJSON(join(ROOT, 'tools/wiki/cache/parsed.json'));

/* ogni link di club usato nelle schede, con i nomi con cui viene mostrato */
const shown = new Map();
for (const p of players) {
  for (const s of [...p.clubs, ...p.youth]) {
    if (!s.link) continue;
    if (!shown.has(s.link)) shown.set(s.link, new Map());
    const m = shown.get(s.link);
    m.set(s.name, (m.get(s.name) || 0) + 1);
  }
}

const links = [...shown.keys()];
const canonical = await resolveTitles(links);
const titles = [...new Set([...canonical.values()].filter(Boolean))];
const pages = await wikitexts(titles, progress('club'), 10);

function hex(v) {
  const m = /#?([0-9a-f]{6}|[0-9a-f]{3})\b/i.exec(clean(v || ''));
  if (!m) return null;
  let h = m[1].toUpperCase();
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  return `#${h}`;
}

const clubs = {};
for (const t of titles) {
  const page = pages.get(t);
  const box = page && findTemplate(page.text, 'Infobox football club|Infobox football team|Infobox national football team');
  const params = box ? splitParams(box).params : {};
  const kit = [hex(params.body1) || hex(params.leftarm1), hex(params.shorts1), hex(params.socks1)].filter(Boolean);
  const colors = SOCIAL_COLORS[t] || [...new Set(kit)].slice(0, 2);
  const short = clean(params['short name'] || params.shortname || '');
  clubs[t] = { title: t, short, colors, national: /national (football|soccer) team/i.test(t) };
}

/* nome da mostrare: quello scelto da Wikipedia come nome breve, altrimenti
   il più usato nelle schede dei giocatori */
const aliasOf = {};
for (const [link, names] of shown) {
  const t = canonical.get(link);
  if (!t) continue;
  aliasOf[link] = t;
  const c = clubs[t];
  if (!c) continue;
  c.names = c.names || new Map();
  for (const [n, k] of names) c.names.set(n, (c.names.get(n) || 0) + k);
}
/* Il "nome breve" delle schede dei club è spesso una sigla (RMA, BVB, SLB):
   vince il nome con cui i giocatori li citano, e la sigla serve solo quando
   quel nome è troppo lungo per stare in una riga. Poche eccezioni a mano
   per i nomi con cui un club è conosciuto ovunque. */
const OVERRIDE = {
  'Inter Milan': 'Inter', 'AC Milan': 'Milan', 'Internazionale': 'Inter',
  'Paris Saint-Germain FC': 'Paris Saint-Germain',
};
/* Settori giovanili e squadre riserve hanno una voce loro ma nelle schede
   compaiono col nome del club principale: "Manchester United" per l'Under-21.
   Sono squadre diverse (una presenza con l'Under-21 non è una presenza in
   prima squadra), quindi prendono un suffisso che le distingue. */
const RESERVE = [
  [/Under-?21s?|\bU-?21\b/i, 'U21'], [/Under-?23s?|\bU-?23\b/i, 'U23'], [/Under-?19s?|\bU-?19\b/i, 'U19'],
  [/Reserves|B Team|Development Squad|\bII$|\sB$/i, 'B'],
  [/Youth|Academy|Cantera|La Masia|La Fábrica|Junior Team|Varkenoord/i, 'Youth'],
];
for (const c of Object.values(clubs)) {
  const ranked = c.names ? [...c.names.entries()].sort((a, b) => b[1] - a[1]).map(([n]) => n) : [];
  const best = ranked.find((n) => !/\b(B|II|U-?\d{2}|guest|reserves?)\)?$/i.test(n)) || ranked[0] || c.title.replace(/\s*\([^)]*\)$/, '');
  const shortOk = c.short && c.short.length >= 5 && c.short.length <= 22 && c.short !== c.short.toUpperCase() && !/[,;]/.test(c.short);
  let name = OVERRIDE[c.title] || (best.length > 24 && shortOk ? c.short : best);
  const reserve = RESERVE.find(([re]) => re.test(c.title));
  if (reserve && !/\b(B|II|U-?\d{2}|Youth|Castilla|Atlètic|Jong)\b/i.test(name)) name = `${name} ${reserve[1]}`;
  c.name = name;
  delete c.names; delete c.short;
}

/* Polisportive: alcune schede linkano la voce della società (Fenerbahçe S.K.),
   altre quella della sezione calcio (Fenerbahçe S.K. (football)). È la stessa
   squadra: tutto confluisce nella voce del calcio. */
for (const [link, title] of Object.entries(aliasOf)) {
  const football = `${title} (football)`;
  if (clubs[football]) aliasOf[link] = football;
}
for (const title of Object.keys(clubs)) {
  if (clubs[`${title} (football)`]) delete clubs[title];
}

writeJSON(join(ROOT, 'tools/wiki/cache/clubs.json'), { clubs, aliasOf });
const all = Object.values(clubs);
console.log(`club: ${all.length} · con colori: ${all.filter((c) => c.colors.length).length}`);
