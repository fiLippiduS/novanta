/* Passo 3: le schede dei giocatori.
   Scarica il wikitext dei candidati più letti, legge scheda e palmarès e
   salva tutto in cache. I file del gioco si costruiscono dopo, da qui. */

import { wikitexts, readJSON, writeJSON, progress, ROOT } from './lib.mjs';
import { parseInfobox, parseHonours } from './parse.mjs';
import { countryCode, isCountry } from './countries.mjs';
import { join } from 'node:path';

const LIMIT = Number(process.argv[2] || 6000);
const ranked = readJSON(join(ROOT, 'tools/wiki/cache/ranked.json')).slice(0, LIMIT);
const pages = await wikitexts(ranked.map((r) => r.title), progress('schede'));

/** nome da mostrare: il titolo senza la disambigua, che è il più affidabile */
function displayName(title) {
  return title.replace(/\s*\([^)]*\)\s*$/, '').trim();
}

function nationOf(ib) {
  const senior = ib.national.filter((n) => !n.youth);
  const pick = (list) => {
    for (let i = list.length - 1; i >= 0; i--) {
      const code = countryCode(list[i].link) || countryCode(list[i].name);
      if (code) return code;
    }
    return null;
  };
  /* niente nazione dedotta dal luogo di nascita: chi è nato in Francia può
     giocare per l'Algeria, e un dato indovinato è un dato sbagliato */
  return pick(senior) || pick(ib.national);
}

const out = [];
let noBox = 0; let noClubs = 0;
ranked.forEach((r, rank) => {
  const page = pages.get(r.title);
  if (!page) return;
  /* attori, politici, giocatori di cricket passati da una squadra per una stagione */
  if (/\((actor|singer|politician|cricketer|TV personality|musician|rugby|basketball|businessman|presenter|writer|boxer|athlete|priest|coach|manager|referee)[^)]*\)/i.test(r.title)) return;
  const ib = parseInfobox(page.text);
  if (!ib) { noBox++; return; }
  if (!ib.clubs.length) { noClubs++; return; }
  const honours = parseHonours(page.text, isCountry);
  /* le medaglie della scheda doppiano spesso il palmarès: tengo solo le nuove */
  const medals = ib.medals.filter((m) => !honours.some((h) => h.kind === 'national' && h.year === m.year));
  out.push({
    ...ib,
    /* il nome viene dal titolo della voce, non dalla scheda: nella scheda a
       volte è vuoto o porta con sé onorificenze ("Buffon OMRI CMS") */
    infoboxName: ib.name,
    title: page.title,
    name: displayName(page.title),
    rank,
    views: r.views,
    nation: nationOf(ib),
    honours,
    medals,
  });
});

writeJSON(join(ROOT, 'tools/wiki/cache/parsed.json'), out);
console.log(`schede valide: ${out.length} · senza scheda: ${noBox} · senza club: ${noClubs}`);
const noNation = out.filter((p) => !p.nation).length;
const noRole = out.filter((p) => !p.role).length;
const noHeight = out.filter((p) => !p.height).length;
console.log(`senza nazione: ${noNation} · senza ruolo: ${noRole} · senza altezza: ${noHeight}`);
