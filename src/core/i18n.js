/* Bilingue dal primo giorno: nessuna stringa scritta a mano nelle scene. */

import * as store from './storage.js';

export const LANGS = ['it', 'en'];
let dict = {};
let current = 'it';
const listeners = new Set();

function detect() {
  const saved = store.get('lang');
  if (saved && LANGS.includes(saved)) return saved;
  const nav = (navigator.languages || [navigator.language || 'it'])
    .map((l) => String(l).slice(0, 2).toLowerCase());
  return nav.find((l) => LANGS.includes(l)) || 'en';
}

export async function init() {
  await setLang(detect(), false);
}

export async function setLang(lang, persist = true) {
  if (!LANGS.includes(lang)) lang = 'en';
  const res = await fetch(`i18n/${lang}.json`, { cache: 'no-cache' });
  dict = await res.json();
  current = lang;
  document.documentElement.lang = lang;
  if (persist) store.save({ lang });
  listeners.forEach((fn) => fn(lang));
}

export function lang() { return current; }

export function onLangChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** t('squad.title') · t('squad.found', { n: 7 }) */
export function t(path, params) {
  let v = path.split('.').reduce((o, k) => (o == null ? o : o[k]), dict);
  if (v == null) return path;
  if (Array.isArray(v)) return v;
  if (params) {
    v = String(v).replace(/\{(\w+)\}/g, (m, k) =>
      (params[k] !== undefined ? params[k] : m));
  }
  return v;
}

/** una riga a caso da una lista, mai la stessa due volte di fila */
const lastPicked = new Map();
export function tRandom(path) {
  const list = t(path);
  if (!Array.isArray(list) || !list.length) return String(list);
  if (list.length === 1) return list[0];
  let idx;
  do { idx = Math.floor(Math.random() * list.length); }
  while (idx === lastPicked.get(path));
  lastPicked.set(path, idx);
  return list[idx];
}
