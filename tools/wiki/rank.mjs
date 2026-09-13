/* Passo 2: quanto è conosciuto ciascun candidato.
   Le visualizzazioni della pagina negli ultimi sessanta giorni sono una
   misura imperfetta ma onesta: nessuno decide a mano chi è famoso. */

import { pageviews, readJSON, writeJSON, progress, ROOT } from './lib.mjs';
import { join } from 'node:path';

const { titles } = readJSON(join(ROOT, 'tools/wiki/cache/candidates.json'));
const views = await pageviews(titles, progress('visualizzazioni'));

const ranked = titles
  .map((t) => ({ title: t, views: views.get(t) || 0 }))
  .filter((r) => r.views > 0)
  .sort((a, b) => b.views - a.views);

writeJSON(join(ROOT, 'tools/wiki/cache/ranked.json'), ranked);
console.log(`con visualizzazioni: ${ranked.length}`);
for (const i of [0, 99, 499, 999, 1999, 2999, 3999, 5999]) {
  if (ranked[i]) console.log(`#${i + 1}  ${ranked[i].views}  ${ranked[i].title}`);
}
