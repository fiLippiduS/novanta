/* Unisce le fonti degli eventi dell'Allenatore e le divide in:
   - data/manager/events.json: la logica (condizioni, effetti, probabilità)
   - data/manager/text.<lingua>.json: i testi, uno per lingua
   Controlla che ogni evento abbia i testi per ogni opzione in ogni lingua,
   che i segnaposto siano disponibili, che le doti toccate esistano, che le
   catene puntino a eventi veri e che gli identificativi siano unici.

   Forma di un evento nelle fonti (tools/manager/ev-*.mjs):
   { id, cat, w, repeat, when, chainOnly,
     o: [{ fx, odds, chain, promise }],
     it: [titolo, descrizione, [etichetta, esito, esito se va male], ...],
     en: [...] }
   Traduzioni: tools/manager/text-<lingua>-*.mjs → { id: [titolo, descrizione, [etichetta, esito, esito male], ...] } */

import { writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { ATTRS, ROLES, PERSONALITIES } from '../../src/manager/players.js';
import { STYLES } from '../../src/manager/tactics.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const LANGS = ['it', 'en', 'es', 'fr', 'de', 'pt'];
const CATS = ['board', 'press', 'dressing', 'player', 'medical', 'fans', 'market', 'youth', 'rival', 'private', 'finance', 'staff', 'style', 'national'];

const files = readdirSync(HERE).filter((f) => /^ev-.*\.mjs$/.test(f)).sort();
const all = [];
for (const f of files) {
  const list = (await import(pathToFileURL(join(HERE, f)))).default;
  list.forEach((e) => { e._file = f; });
  all.push(...list);
}
const translations = {};
for (const f of readdirSync(HERE).filter((x) => /^text-(es|fr|de|pt)-.*\.mjs$/.test(x)).sort()) {
  const l = f.slice(5, 7);
  translations[l] = { ...(translations[l] || {}), ...(await import(pathToFileURL(join(HERE, f)))).default };
}

const errors = [];
const ids = new Set();
const PLAYER_VARS = new Set(['player', 'surname', 'value']);
const ALWAYS_VARS = new Set(['club', 'opponent', 'coach', 'need', 'count', 'type']);

/* ogni chiave deve essere letta dal motore: una chiave sbagliata non farebbe nulla in silenzio */
const WHEN_KEYS = new Set(['mdMin', 'mdMax', 'mdFromEndMax', 'posMin', 'posMax', 'gapMin', 'gapMax', 'trustMin', 'trustMax', 'fansMin', 'fansMax', 'moraleMin', 'moraleMax', 'repMin', 'repMax', 'budgetMin', 'budgetMax', 'seasonsMin', 'seasonsMax', 'injuredMin', 'injuredMax', 'level', 'streakW', 'streakL', 'unbeaten', 'winless', 'last', 'derbyNext', 'objective', 'styles', 'notStyles', 'window', 'ultimatum', 'flag', 'noFlag', 'coachForeign', 'player']);
const PLAYER_WHEN = new Set(['roles', 'depts', 'ageMin', 'ageMax', 'ovrMin', 'ovrMax', 'rankMax', 'rankMin', 'personality', 'formMin', 'formMax', 'moraleMin', 'moraleMax', 'fitnessMin', 'fitnessMax', 'bondMin', 'bondMax', 'potentialGap', 'injured', 'starter', 'captain', 'contractLeft', 'capsMin', 'injuryProneMin', 'goalsMin', 'appsMax', 'appsMin', 'avgMin', 'avgMax', 'foreign', 'farAway', 'newLang', 'newSigning', 'penMissedLast', 'errorLast', 'errorsMin', 'exClubNext', 'justBack', 'lastRatingMin', 'academy', 'flag', 'noFlag']);
const FX_KEYS = new Set(['trust', 'fans', 'reputation', 'budget', 'budgetPct', 'teamMorale', 'teamForm', 'teamFitness', 'senior', 'youngsters', 'familiarity', 'nextMatch', 'setFlag', 'clearFlag', 'suspendCoach', 'academyInvest', 'staff', 'attrs', 'potential', 'morale', 'form', 'fitness', 'bond', 'injury', 'injuryProne', 'consistency', 'newRole', 'contract', 'wage', 'flag', 'unflag', 'suspended', 'renew', 'raise', 'noRenew', 'sell', 'loanOut', 'promiseStarts', 'captain', 'penalties', 'youthPromote', 'youthQuality', 'signVeteran']);
const GROUP_FX = new Set(['attrs', 'potential', 'morale', 'form', 'fitness', 'bond', 'injury', 'injuryProne', 'consistency']);
const MATCH_MODS = new Set(['aerial', 'attack', 'block', 'central', 'control', 'counter', 'defence', 'direct', 'discipline', 'keeper', 'line', 'press', 'risk', 'tempo', 'wide']);
const ODDS_KEYS = new Set(['base', 'pers', 'bond', 'form', 'morale', 'age', 'trust', 'fans', 'rep', 'teamMorale', 'good', 'bad']);
const OBJECTIVES = new Set(['title', 'ucl', 'europe', 'topHalf', 'survival', 'promotion', 'playoff', 'midTable', 'safe']);
const DEPTS = new Set(['POR', 'DIF', 'CEN', 'ATT']);

function checkWhen(e) {
  const w = e.when || {};
  for (const k of Object.keys(w)) if (!WHEN_KEYS.has(k)) errors.push(`${e.id}: condizione sconosciuta ${k}`);
  for (const o of w.objective || []) if (!OBJECTIVES.has(o)) errors.push(`${e.id}: obiettivo sconosciuto ${o}`);
  for (const s of [...(w.styles || []), ...(w.notStyles || [])]) if (!STYLES[s]) errors.push(`${e.id}: stile sconosciuto ${s}`);
  if (w.last && !['W', 'D', 'L'].includes(w.last)) errors.push(`${e.id}: risultato sconosciuto ${w.last}`);
  if (w.mdMin !== undefined && w.mdMax !== undefined && w.mdMin > w.mdMax) errors.push(`${e.id}: giornate impossibili`);
  const f = w.player;
  if (!f) return;
  for (const k of Object.keys(f)) if (!PLAYER_WHEN.has(k)) errors.push(`${e.id}: condizione sul giocatore sconosciuta ${k}`);
  for (const r of f.roles || []) if (!ROLES.includes(r)) errors.push(`${e.id}: ruolo sconosciuto ${r}`);
  for (const d of f.depts || []) if (!DEPTS.has(d)) errors.push(`${e.id}: reparto sconosciuto ${d}`);
  for (const p of f.personality || []) if (!PERSONALITIES.includes(p)) errors.push(`${e.id}: personalità sconosciuta ${p}`);
  if (f.ageMin !== undefined && f.ageMax !== undefined && f.ageMin > f.ageMax) errors.push(`${e.id}: età impossibile`);
}

function checkFx(e, fx, where) {
  if (!fx) return;
  for (const k of Object.keys(fx)) if (!FX_KEYS.has(k)) errors.push(`${e.id} ${where}: effetto sconosciuto ${k}`);
  for (const k of Object.keys(fx.nextMatch || {})) if (!MATCH_MODS.has(k)) errors.push(`${e.id} ${where}: modificatore di partita sconosciuto ${k}`);
  for (const g of ['senior', 'youngsters']) {
    for (const k of Object.keys(fx[g] || {})) if (!GROUP_FX.has(k)) errors.push(`${e.id} ${where}: effetto di gruppo sconosciuto ${g}.${k}`);
  }
  if (fx.attrs) {
    for (const k of Object.keys(fx.attrs)) if (k !== 'role' && !ATTRS.includes(k)) errors.push(`${e.id} ${where}: dote sconosciuta ${k}`);
  }
  if (fx.newRole && !ROLES.includes(fx.newRole)) errors.push(`${e.id} ${where}: ruolo sconosciuto ${fx.newRole}`);
  const playerKeys = ['attrs', 'potential', 'morale', 'form', 'fitness', 'bond', 'injury', 'injuryProne', 'consistency', 'newRole', 'contract', 'wage', 'renew', 'noRenew', 'sell', 'loanOut', 'captain', 'penalties', 'suspended', 'promiseStarts'];
  if (!e.when?.player && playerKeys.some((k) => fx[k] !== undefined)) errors.push(`${e.id} ${where}: effetto su un giocatore senza giocatore`);
}

function texts(e, arr, lang) {
  if (!Array.isArray(arr) || arr.length !== e.o.length + 2) {
    errors.push(`${e.id} ${lang}: servono titolo, descrizione e ${e.o.length} opzioni`);
    return null;
  }
  const [t, d, ...opts] = arr;
  const out = { t, d, o: opts.map((x) => ({ l: x[0], r: x[1], ...(x[2] ? { rb: x[2] } : {}) })) };
  const strings = [t, d, ...opts.flat()];
  for (const s of strings) {
    for (const m of String(s).matchAll(/\{(\w+)\}/g)) {
      if (PLAYER_VARS.has(m[1]) && !e.when?.player) errors.push(`${e.id} ${lang}: {${m[1]}} senza giocatore`);
      else if (!PLAYER_VARS.has(m[1]) && !ALWAYS_VARS.has(m[1])) errors.push(`${e.id} ${lang}: segnaposto sconosciuto {${m[1]}}`);
    }
  }
  e.o.forEach((o, i) => {
    if (o.odds && !opts[i][2]) errors.push(`${e.id} ${lang}: l'opzione ${i + 1} è una scommessa e manca l'esito negativo`);
  });
  return out;
}

const events = [];
const text = Object.fromEntries(LANGS.map((l) => [l, {}]));
for (const e of all) {
  if (ids.has(e.id)) errors.push(`id duplicato: ${e.id} (${e._file})`);
  ids.add(e.id);
  if (!CATS.includes(e.cat)) errors.push(`${e.id}: categoria sconosciuta ${e.cat}`);
  if (!e.o || e.o.length < 1 || e.o.length > 3) errors.push(`${e.id}: da 1 a 3 opzioni`);
  checkWhen(e);
  e.o.forEach((o, i) => {
    for (const k of Object.keys(o.odds || {})) if (!ODDS_KEYS.has(k)) errors.push(`${e.id} opzione ${i + 1}: probabilità sconosciuta ${k}`);
    for (const p of Object.keys(o.odds?.pers || {})) if (!PERSONALITIES.includes(p)) errors.push(`${e.id} opzione ${i + 1}: personalità sconosciuta ${p}`);
    checkFx(e, o.fx, `opzione ${i + 1}`);
    if (o.odds) { checkFx(e, o.odds.good, `opzione ${i + 1} bene`); checkFx(e, o.odds.bad, `opzione ${i + 1} male`); }
    if (o.promise && !e.when?.player) errors.push(`${e.id}: promessa senza giocatore`);
  });
  for (const l of ['it', 'en']) {
    const tt = texts(e, e[l], l);
    if (tt) text[l][e.id] = tt;
  }
  for (const l of ['es', 'fr', 'de', 'pt']) {
    const src = translations[l]?.[e.id];
    if (!src) continue;
    const tt = texts(e, src, l);
    if (tt) text[l][e.id] = tt;
  }
  const { it, en, _file, ...logic } = e;
  events.push(logic);
}
for (const e of all) for (const o of e.o) if (o.chain && !ids.has(o.chain.id)) errors.push(`${e.id}: catena verso ${o.chain.id} che non esiste`);
for (const need of ['promise_kept', 'promise_broken']) if (!ids.has(need)) errors.push(`manca l'evento ${need}`);

if (errors.length) {
  console.error(`ERRORI (${errors.length}):\n  ${errors.join('\n  ')}`);
  process.exit(1);
}

mkdirSync(join(ROOT, 'data/manager'), { recursive: true });
writeFileSync(join(ROOT, 'data/manager/events.json'), JSON.stringify({ v: 1, events }));
for (const l of LANGS) {
  const missing = events.filter((e) => !text[l][e.id]).length;
  /* una lingua senza traduzione di un evento usa l'inglese per quell'evento */
  const merged = { ...text.en, ...text[l] };
  writeFileSync(join(ROOT, `data/manager/text.${l}.json`), JSON.stringify(merged));
  console.log(`${l}: ${Object.keys(text[l]).length} testi${missing ? ` (${missing} in inglese)` : ''}`);
}
const byCat = {};
events.forEach((e) => { byCat[e.cat] = (byCat[e.cat] || 0) + 1; });
const decisions = events.filter((e) => !e.chainOnly).length;
console.log(`eventi: ${events.length} (${decisions} pescabili, ${events.length - decisions} solo in catena) · ${JSON.stringify(byCat)}`);
