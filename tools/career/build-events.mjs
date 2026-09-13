/* Unisce le fonti degli eventi della carriera e le divide in:
   - data/career/events.json: la logica (condizioni ed effetti)
   - data/career/text.<lingua>.json: i testi, uno per lingua
   Controlla che ogni evento abbia i testi per ogni opzione, che le doti
   toccate esistano nel ruolo, che gli identificativi siano unici. */

import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { ROLE_ATTRS } from '../../src/career/model.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const LANGS = ['it', 'en', 'fr', 'es', 'de', 'pt'];

const sources = ['ev-roles.mjs', 'ev-life.mjs', 'ev-world.mjs'];
const all = [];
for (const f of sources) all.push(...(await import(pathToFileURL(join(HERE, f)))).default);

/* traduzioni aggiuntive: tools/career/text-<lingua>.mjs, stessa forma di it/en */
const extra = {};
for (const l of LANGS.slice(2)) {
  const file = join(HERE, `text-${l}.mjs`);
  if (existsSync(file)) extra[l] = (await import(pathToFileURL(file))).default;
}

/* Situazioni che nella vita di un calciatore tornano: un rinnovo, un litigio
   con l'allenatore, un'infiltrazione prima della partita importante. Possono
   ripresentarsi, ma solo dopo queste stagioni. Gli eventi unici (il primo
   contratto, l'esordio, il matrimonio) restano unici. */
const REPEAT = {
  gk_notebook: 5, gk_crosses: 4, gk_kicking: 5, gk_shootout: 3, gk_rival_signing: 5, gk_howler: 5,
  dc_markstar: 3, dc_setpieces: 5, dc_gym: 4, dc_fullback: 5, dc_redcard: 4, dc_viral_tackle: 5,
  tz_overlap: 4, tz_altitude: 4, tz_crosscoach: 4, tz_otherside: 5, tz_inverted: 6, tz_nightmare: 5, tz_chant: 6,
  med_screen: 4, med_diagonals: 5, med_enforcer: 4, med_engine: 4, med_suspension: 3, med_pundit: 5,
  mez_runs: 4, mez_street: 5, mez_press: 5, mez_tempo: 5, mez_freekicks: 4, mez_rival: 5, mez_screamer: 4,
  ala_1v1: 4, ala_weakfoot: 6, ala_sprint: 4, ala_showboat: 4, ala_trackback: 5, ala_socials: 6, ala_hamstring: 5, ala_nickname: 8,
  pun_shots: 3, pun_penalties: 4, pun_supersub: 4, pun_presser: 4, pun_gym: 4, pun_star_arrives: 5, pun_drought: 5, pun_bicycle: 6, pun_target: 6,
  p_coach_clash: 4, p_injection: 4, p_revolution: 5, p_ritual: 5, p_renewal: 4, p_rival_offer: 6, p_anxiety: 5,
  p_tv: 6, p_boots: 8, p_media: 8, p_fight: 5, p_hot: 4, p_derby: 3, p_chant: 6, p_fake_news: 5, p_saga: 5,
  y_party: 2, v_rotation: 3, v_physio: 4, v_revolt: 5, v_replacement: 4, v_finished: 4, v_exotic: 3,
  e_body_stop: 3, e_record: 3, e_hometown: 2,
  n_system: 4, n_prep: 4, n_friendlies: 3, n_provocation: 4, n_shootout: 4, n_gk_shootout: 4, n_new_gen: 4, n_blame: 4, n_anthem: 5,
  i_flu: 4, i_sacked: 3, i_potm: 3, i_var: 3, i_heat: 3, i_travel: 3, i_teammate_hurt: 6, i_meme: 6, i_takeover: 8, i_wages: 6,
  i_family: 8, i_kit: 6, i_car: 10, i_bad_company: 4,
};

const errors = [];
const ids = new Set();
Object.keys(REPEAT).forEach((id) => { if (!all.some((e) => e.id === id)) errors.push(`REPEAT: evento inesistente ${id}`); });
const ALL_ATTRS = new Set(Object.values(ROLE_ATTRS).flatMap((o) => Object.keys(o)));

function checkFx(ev, fx, where) {
  const walk = (x) => {
    if (!x) return;
    if (x.attrs) {
      for (const a of Object.keys(x.attrs)) {
        if (!ALL_ATTRS.has(a)) errors.push(`${ev.id} ${where}: dote sconosciuta ${a}`);
        if (ev.when && ev.when.roles && !ev.when.roles.some((r) => ROLE_ATTRS[r][a] !== undefined)) {
          errors.push(`${ev.id} ${where}: ${a} non appartiene ai ruoli ${ev.when.roles.join(',')}`);
        }
      }
    }
    if (x.p !== undefined) { walk(x.base); walk(x.win); walk(x.lose); }
  };
  walk(fx);
}

const logic = [];
const texts = Object.fromEntries(LANGS.map((l) => [l, {}]));

for (const ev of all) {
  if (ids.has(ev.id)) errors.push(`id doppio: ${ev.id}`);
  ids.add(ev.id);
  const entry = { id: ev.id, kind: ev.kind, group: ev.group || null, forced: Boolean(ev.forced), w: ev.w || 1, when: ev.when || {} };
  if (REPEAT[ev.id]) entry.repeat = REPEAT[ev.id];
  if (ev.kind === 'decision') {
    entry.o = ev.o.map((o) => o.fx);
    ev.o.forEach((o, i) => checkFx(ev, o.fx, `opzione ${i}`));
  } else {
    entry.fx = ev.fx;
    checkFx(ev, ev.fx, 'effetto');
  }
  logic.push(entry);

  for (const l of LANGS) {
    const tx = ev[l] || (extra[l] && extra[l][ev.id]);
    if (!tx) { if (l === 'it' || l === 'en') errors.push(`${ev.id}: manca il testo ${l}`); continue; }
    if (!tx.t || !tx.d) errors.push(`${ev.id} ${l}: titolo o descrizione mancanti`);
    if (ev.kind === 'decision') {
      if (!tx.o || tx.o.length !== ev.o.length) { errors.push(`${ev.id} ${l}: opzioni ${tx.o ? tx.o.length : 0} invece di ${ev.o.length}`); continue; }
      tx.o.forEach((o, i) => {
        const chance = ev.o[i].fx.p !== undefined;
        if (!o.l) errors.push(`${ev.id} ${l} opzione ${i}: etichetta mancante`);
        if (chance && (!o.rw || !o.rl)) errors.push(`${ev.id} ${l} opzione ${i}: servono rw e rl`);
        if (!chance && !o.r) errors.push(`${ev.id} ${l} opzione ${i}: esito mancante`);
      });
    }
    texts[l][ev.id] = tx;
  }
}

if (errors.length) {
  console.error(`ERRORI (${errors.length}):\n  ${errors.join('\n  ')}`);
  process.exit(1);
}

mkdirSync(join(ROOT, 'data/career'), { recursive: true });
writeFileSync(join(ROOT, 'data/career/events.json'), JSON.stringify({ v: 2, events: logic }));
for (const l of LANGS) {
  if (!Object.keys(texts[l]).length) continue;
  writeFileSync(join(ROOT, `data/career/text.${l}.json`), JSON.stringify(texts[l]));
}

const count = (k) => logic.filter((e) => e.kind === k).length;
const groups = logic.reduce((m, e) => { m[e.group || e.kind] = (m[e.group || e.kind] || 0) + 1; return m; }, {});
console.log(`eventi: ${logic.length} · decisioni ${count('decision')} · imprevisti ${count('incident')}`);
console.log('per gruppo:', groups);
console.log('lingue:', LANGS.filter((l) => Object.keys(texts[l]).length === logic.length).join(', '));
