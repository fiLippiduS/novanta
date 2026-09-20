/* Il banco dei nomi: da tutte le rose vere si ricavano nomi e cognomi per
   nazione, con il loro peso. Serve al vivaio e ai giovani generati, che così
   si chiamano come si chiamano davvero i ragazzi di quel paese — e non come
   un compagno di squadra.

   node tools/manager/names.mjs   →   src/manager/names.data.js */

import { readFileSync, writeFileSync } from 'node:fs';

const read = (f) => JSON.parse(readFileSync(new URL(`../../data/manager/${f}`, import.meta.url), 'utf8'));
const leagues = read('leagues.json');

/* le particelle restano attaccate al cognome: de Jong, van Dijk, Dos Santos */
const PARTICLES = new Set(['de', 'di', 'da', 'del', 'della', 'dos', 'das', 'van', 'von', 'der', 'den', 'le', 'la', 'el', 'al', 'bin', 'ben', 'mac', 'mc', "o'", 'st', 'ter', 'ten', 'op', 'af']);

const first = {};
const last = {};
const bump = (box, nation, word) => {
  if (!word || word.length < 2) return;
  box[nation] = box[nation] || {};
  box[nation][word] = (box[nation][word] || 0) + 1;
};

let rows = 0;
for (const lg of leagues.leagues) {
  const squads = read(`squads-${lg.id}.json`).squads;
  for (const list of Object.values(squads)) {
    for (const r of list) {
      const [name, , nation, , , , , , , flags] = r;
      /* solo nomi veri: i ragazzi generati dal vivaio non entrano nel banco */
      if (!nation || (flags || '').includes('g') || (flags || '').includes('p')) continue;
      const parts = String(name).split(/\s+/).filter(Boolean);
      if (parts.length < 2) { bump(last, nation, parts[0]); rows++; continue; }
      bump(first, nation, parts[0]);
      /* il cognome è l'ultima parola, con le particelle che la precedono */
      let i = parts.length - 1;
      while (i > 1 && PARTICLES.has(parts[i - 1].toLowerCase())) i--;
      bump(last, nation, parts.slice(i).join(' '));
      rows++;
    }
  }
}

/* solo le nazioni con abbastanza nomi: per le altre si pesca dai paesi vicini */
const MIN = 12;
const pack = (box) => {
  const out = {};
  for (const [nation, words] of Object.entries(box)) {
    const list = Object.entries(words).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
    if (list.length < MIN) continue;
    out[nation] = list.map(([w, n]) => (n > 1 ? [w, n] : w));
  }
  return out;
};

const data = { first: pack(first), last: pack(last) };
const nations = new Set([...Object.keys(data.first), ...Object.keys(data.last)]);
const body = `/* Generato da tools/manager/names.mjs: non si scrive a mano.
   Nomi e cognomi veri per nazione, con quante volte compaiono nelle rose.
   ${rows} giocatori, ${nations.size} nazioni. */

export default ${JSON.stringify(data)};
`;
writeFileSync(new URL('../../src/manager/names.data.js', import.meta.url), body);
console.log(`nomi: ${rows} giocatori · ${nations.size} nazioni · ${(body.length / 1024).toFixed(0)} KB`);
