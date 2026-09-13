/* Client minimo per l'API di Wikipedia.
   Tutti i dati dei cataloghi arrivano da qui: niente numeri scritti a
   memoria. Le risposte si salvano in cache su disco, così rigenerare i
   cataloghi non chiede a Wikipedia due volte la stessa cosa.

   Regole di buona educazione verso i server di Wikimedia:
   - una richiesta alla volta, con una pausa fra l'una e l'altra;
   - User-Agent che dice chi siamo e come contattarci;
   - maxlag, così se i server sono sotto carico aspettiamo noi. */

import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
export const ROOT = join(HERE, '..', '..');
const CACHE = join(HERE, 'cache');
mkdirSync(CACHE, { recursive: true });

const UA = 'NovantaGameDataBuilder/1.0 (https://instascope.app; ciao@instascope.app)';
const PAUSE_MS = 120;
let last = 0;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function cacheFile(url) {
  return join(CACHE, `${createHash('sha1').update(url).digest('hex')}.json`);
}

export async function getJSON(url, { cache = true } = {}) {
  const file = cacheFile(url);
  if (cache && existsSync(file)) return JSON.parse(readFileSync(file, 'utf8'));

  for (let attempt = 0; attempt < 6; attempt++) {
    const wait = last + PAUSE_MS - Date.now();
    if (wait > 0) await sleep(wait);
    last = Date.now();
    try {
      const res = await fetch(url, { headers: { 'User-Agent': UA, 'Accept-Encoding': 'gzip' } });
      if (res.status === 429 || res.status >= 500) { await sleep(1500 * (attempt + 1)); continue; }
      const json = await res.json();
      if (json.error && json.error.code === 'maxlag') { await sleep(3000); continue; }
      if (json.error) throw new Error(`${json.error.code}: ${json.error.info}`);
      if (cache) writeFileSync(file, JSON.stringify(json));
      return json;
    } catch (e) {
      if (attempt === 5) throw e;
      await sleep(1000 * (attempt + 1));
    }
  }
  throw new Error(`richiesta fallita: ${url}`);
}

export function apiUrl(params, host = 'en.wikipedia.org') {
  const u = new URL(`https://${host}/w/api.php`);
  const all = { format: 'json', formatversion: '2', maxlag: '5', ...params };
  Object.keys(all).sort().forEach((k) => u.searchParams.set(k, all[k]));
  return u.toString();
}

export const api = (params, opts) => getJSON(apiUrl(params), opts);

export function chunk(list, size) {
  const out = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
}

/** tutte le pagine (namespace 0) di una categoria, seguendo la paginazione */
export async function categoryMembers(category) {
  const titles = [];
  let cont = null;
  do {
    const params = {
      action: 'query', list: 'categorymembers', cmtitle: category,
      cmlimit: '500', cmnamespace: '0', cmprop: 'title',
    };
    if (cont) params.cmcontinue = cont;
    const j = await api(params);
    (j.query?.categorymembers || []).forEach((m) => titles.push(m.title));
    cont = j.continue?.cmcontinue || null;
  } while (cont);
  return titles;
}

/** visualizzazioni degli ultimi 60 giorni, 50 titoli per richiesta */
export async function pageviews(titles, onProgress) {
  const out = new Map();
  const groups = chunk(titles, 50);
  for (let i = 0; i < groups.length; i++) {
    let cont = null;
    do {
      const params = { action: 'query', prop: 'pageviews', pvipdays: '60', titles: groups[i].join('|'), redirects: '1' };
      if (cont) Object.assign(params, cont);
      const j = await api(params);
      const redirects = new Map((j.query?.redirects || []).map((r) => [r.to, r.from]));
      for (const p of j.query?.pages || []) {
        if (p.missing || !p.pageviews) continue;
        const v = Object.values(p.pageviews).reduce((a, b) => a + (b || 0), 0);
        const prev = out.get(p.title) || 0;
        out.set(p.title, Math.max(prev, v));
        if (redirects.has(p.title)) out.set(redirects.get(p.title), Math.max(prev, v));
      }
      cont = j.continue && j.continue.pvipcontinue ? { pvipcontinue: j.continue.pvipcontinue, continue: j.continue.continue } : null;
    } while (cont);
    if (onProgress) onProgress(i + 1, groups.length);
  }
  return out;
}

/**
 * Wikitext di molte pagine. Restituisce una mappa titolo richiesto -> {title, text}.
 * Segue i redirect: chi chiede "AC Milan" riceve la pagina "A.C. Milan".
 */
export async function wikitexts(titles, onProgress, size = 20) {
  const out = new Map();
  const groups = chunk(titles, size);
  for (let i = 0; i < groups.length; i++) {
    const j = await api({
      action: 'query', prop: 'revisions', rvprop: 'content', rvslots: 'main',
      titles: groups[i].join('|'), redirects: '1',
    });
    const norm = new Map((j.query?.normalized || []).map((n) => [n.to, n.from]));
    const redir = new Map((j.query?.redirects || []).map((r) => [r.to, r.from]));
    for (const p of j.query?.pages || []) {
      if (p.missing || !p.revisions) continue;
      const text = p.revisions[0].slots.main.content;
      let asked = p.title;
      if (redir.has(asked)) asked = redir.get(asked);
      if (norm.has(asked)) asked = norm.get(asked);
      out.set(asked, { title: p.title, text });
      out.set(p.title, { title: p.title, text });
    }
    if (onProgress) onProgress(i + 1, groups.length);
  }
  return out;
}

/** titolo canonico dopo i redirect, per molti titoli insieme */
export async function resolveTitles(titles) {
  const out = new Map();
  for (const group of chunk(titles, 50)) {
    const j = await api({ action: 'query', titles: group.join('|'), redirects: '1' });
    const norm = new Map((j.query?.normalized || []).map((n) => [n.from, n.to]));
    const redir = new Map((j.query?.redirects || []).map((r) => [r.from, r.to]));
    const missing = new Set((j.query?.pages || []).filter((p) => p.missing).map((p) => p.title));
    for (const t of group) {
      let x = norm.get(t) || t;
      x = redir.get(x) || x;
      out.set(t, missing.has(x) ? null : x);
    }
  }
  return out;
}

export function readJSON(path) { return JSON.parse(readFileSync(path, 'utf8')); }
export function writeJSON(path, data, pretty = false) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, pretty ? `${JSON.stringify(data, null, 2)}\n` : JSON.stringify(data));
}

export function progress(label) {
  let lastPrint = 0;
  return (n, tot) => {
    const now = Date.now();
    if (now - lastPrint > 2000 || n === tot) {
      lastPrint = now;
      process.stdout.write(`\r${label}: ${n}/${tot}   `);
      if (n === tot) process.stdout.write('\n');
    }
  };
}
