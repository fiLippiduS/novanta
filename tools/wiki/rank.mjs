/* Passo 2: quanto è conosciuto ciascun candidato.
   Le visualizzazioni della pagina negli ultimi sessanta giorni sono una
   misura imperfetta ma onesta: nessuno decide a mano chi è famoso. */

import { pageviews, readJSON, writeJSON, progress, ROOT } from './lib.mjs';
import { join } from 'node:path';
import { existsSync } from 'node:fs';

const { titles } = readJSON(join(ROOT, 'tools/wiki/cache/candidates.json'));

/* Le visualizzazioni già misurate si tengono (ranked-old.json, sessanta
   giorni). I candidati nuovi si misurano sull'ultima settimana, che l'API restituisce
   con una sola richiesta ogni cinquanta titoli, e si riportano alla stessa scala. */
const OLD = join(ROOT, 'tools/wiki/cache/ranked-old.json');
const known = new Map(existsSync(OLD) ? readJSON(OLD).map((r) => [r.title, r.views]) : []);
const fresh = titles.filter((t) => !known.has(t));
const DAYS = 7;
const measured = await pageviews(fresh, progress(`visualizzazioni (${fresh.length} nuovi)`), DAYS);
const views = new Map(known);
for (const [t, v] of measured) views.set(t, Math.round(v * 60 / DAYS));

const ranked = titles
  .map((t) => ({ title: t, views: views.get(t) || 0 }))
  .filter((r) => r.views > 0)
  .sort((a, b) => b.views - a.views);

writeJSON(join(ROOT, 'tools/wiki/cache/ranked.json'), ranked);
console.log(`con visualizzazioni: ${ranked.length}`);
for (const i of [0, 99, 499, 999, 1999, 2999, 3999, 5999]) {
  if (ranked[i]) console.log(`#${i + 1}  ${ranked[i].views}  ${ranked[i].title}`);
}
