/* Sei lingue: ogni traduzione ha le stesse chiavi dell'italiano, gli stessi
   segnaposto, e ogni chiave usata nel codice esiste. */

import { readFileSync, readdirSync } from 'node:fs';

const LANGS = ['it', 'en', 'es', 'fr', 'de', 'pt'];
const load = (l) => JSON.parse(readFileSync(new URL(`../i18n/${l}.json`, import.meta.url), 'utf8'));
let pass = 0, fail = 0;
const check = (d, ok, extra = '') => { ok ? pass++ : (fail++, console.log(`  FALLITO  ${d} ${extra}`)); };

function flatten(o, prefix = '', out = {}) {
  for (const [k, v] of Object.entries(o)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) flatten(v, key, out);
    else out[key] = v;
  }
  return out;
}
const holes = (v) => [...new Set((Array.isArray(v) ? v.join(' ') : String(v)).match(/\{\w+\}/g) || [])].sort().join(',');

const base = flatten(load('it'));
for (const l of LANGS.slice(1)) {
  let dict;
  try { dict = flatten(load(l)); } catch (e) { check(`${l}: file leggibile`, false, e.message); continue; }
  const missing = Object.keys(base).filter((k) => !(k in dict));
  const extra = Object.keys(dict).filter((k) => !(k in base));
  const badHoles = Object.keys(base).filter((k) => k in dict && holes(base[k]) !== holes(dict[k]));
  const empty = Object.keys(dict).filter((k) => dict[k] === '' || (Array.isArray(dict[k]) && !dict[k].length));
  check(`${l}: nessuna chiave mancante`, missing.length === 0, missing.slice(0, 12).join(' '));
  check(`${l}: nessuna chiave in più`, extra.length === 0, extra.slice(0, 12).join(' '));
  check(`${l}: stessi segnaposto`, badHoles.length === 0, badHoles.slice(0, 12).join(' '));
  check(`${l}: nessun testo vuoto`, empty.length === 0, empty.slice(0, 8).join(' '));
}

/* le chiavi statiche usate nel codice esistono in italiano */
const files = [];
const walk = (dir) => readdirSync(new URL(dir, import.meta.url), { withFileTypes: true }).forEach((d) => {
  if (d.isDirectory()) walk(`${dir}${d.name}/`); else if (d.name.endsWith('.js')) files.push(`${dir}${d.name}`);
});
walk('../src/');
const used = new Set();
for (const f of files) {
  const src = readFileSync(new URL(f, import.meta.url), 'utf8');
  for (const m of src.matchAll(/\bt(?:Random)?\('([a-zA-Z]+\.[a-zA-Z0-9_.]+)'/g)) used.add(m[1]);
  for (const m of src.matchAll(/comm\.say\('([a-zA-Z]+\.[a-zA-Z0-9_.]+)'/g)) used.add(m[1]);
}
const it = load('it');
const has = (path) => path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), it) !== undefined;
const absent = [...used].filter((k) => !has(k));
check('ogni chiave usata nel codice esiste', absent.length === 0, absent.join(' '));

console.log(`\n${pass} passati, ${fail} falliti`);
process.exit(fail ? 1 : 0);
