/* Unisce i testi dell'Allenatore (tools/manager/i18n/<lingua>.mjs) nei
   dizionari del gioco (i18n/<lingua>.json), sotto la chiave "allenatore".
   node tools/manager/i18n-merge.mjs */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const LANGS = ['it', 'en', 'es', 'fr', 'de', 'pt'];
const HUB = {
  it: { allenatoreTitle: 'Allenatore', allenatoreDesc: 'Rose vere, partite minuto per minuto, la classifica che si muove. Una panchina da tenere.' },
  en: { allenatoreTitle: 'Manager', allenatoreDesc: 'Real squads, minute-by-minute matches, a table that moves. A job to keep.' },
  es: { allenatoreTitle: 'Entrenador', allenatoreDesc: 'Plantillas reales, partidos minuto a minuto, una clasificación que se mueve. Un banquillo que conservar.' },
  fr: { allenatoreTitle: 'Entraîneur', allenatoreDesc: 'Effectifs réels, matchs minute par minute, un classement qui bouge. Un banc à garder.' },
  de: { allenatoreTitle: 'Trainer', allenatoreDesc: 'Echte Kader, Spiele Minute für Minute, eine Tabelle, die sich bewegt. Ein Job, den du behalten musst.' },
  pt: { allenatoreTitle: 'Treinador', allenatoreDesc: 'Plantéis reais, jogos minuto a minuto, uma classificação que mexe. Um banco para segurar.' },
};

for (const l of LANGS) {
  const src = new URL(`./i18n/${l}.mjs`, import.meta.url);
  if (!existsSync(src)) { console.log(`${l}: manca tools/manager/i18n/${l}.mjs, salto`); continue; }
  const dict = { ...(await import(src.href)).default };
  /* i testi del mercato a trattative stanno in un file a parte */
  const extra = new URL(`./i18n/market-${l}.mjs`, import.meta.url);
  if (existsSync(extra)) Object.assign(dict, (await import(extra.href)).default);
  const file = new URL(`../../i18n/${l}.json`, import.meta.url);
  const json = JSON.parse(readFileSync(file, 'utf8'));
  json.allenatore = dict;
  json.hub = { ...json.hub, ...HUB[l] };
  writeFileSync(file, `${JSON.stringify(json, null, 2)}\n`);
  console.log(`${l}: ok`);
}
