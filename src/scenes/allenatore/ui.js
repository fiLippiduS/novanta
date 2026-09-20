/* ALLENATORE — pezzi d'interfaccia condivisi dalle schermate. */

import { t } from '../../core/i18n.js';
import { el, crest } from '../../ui/components.js';
import { flagEmoji, countryName } from '../../ui/flags.js';
import { ROLE_ATTRS, readiness, careerPhase, potentialRange } from '../../manager/players.js';

export function button(label, variant = 'btn--ghost', onClick = null) {
  const b = el('button', `btn ${variant}`, label);
  b.type = 'button';
  if (onClick) b.addEventListener('click', onClick);
  return b;
}

/* un bottone che sta dentro a un altro bottone: si comporta come un tasto,
   ma non è un <button> annidato (che il browser non accetta) */
export function tapButton(label, cls, onClick) {
  const b = el('span', `btn ${cls}`, label);
  b.setAttribute('role', 'button');
  b.tabIndex = 0;
  const go = (ev) => { ev.preventDefault(); ev.stopPropagation(); if (!b.classList.contains('is-off')) onClick(ev); };
  b.addEventListener('click', go);
  b.addEventListener('keydown', (ev) => { if (ev.key === 'Enter' || ev.key === ' ') go(ev); });
  return b;
}

export function chip(label, tone = '') {
  return el('span', `mchip ${tone ? `mchip--${tone}` : ''}`.trim(), label);
}

export function clubBadge(club, { size = 32, sub = null } = {}) {
  const box = el('div', 'mclub');
  const txt = el('div', 'mclub__txt');
  txt.appendChild(el('strong', 'mclub__name', club.name));
  if (sub) txt.appendChild(el('span', 'mclub__sub label', sub));
  box.append(crest(club.colors || [], size), txt);
  return box;
}

export function meter(label, value, { tone = 'lime', delta = null, max = 100 } = {}) {
  const m = el('div', 'mmeter');
  const head = el('div', 'mmeter__head');
  const num = el('span', 'num mmeter__v', String(Math.round(value)));
  if (delta) {
    const d = el('span', `mmeter__d ${delta > 0 ? 'is-up' : 'is-down'}`, `${delta > 0 ? '+' : ''}${Math.round(delta * 10) / 10}`);
    num.appendChild(d);
  }
  head.append(el('span', 'label', label), num);
  const track = el('div', 'mmeter__track');
  const fill = el('i', `mmeter__fill mmeter__fill--${tone}`);
  fill.style.width = `${Math.max(2, Math.min(100, (value / max) * 100))}%`;
  track.appendChild(fill);
  m.append(head, track);
  return m;
}

/** voto complessivo in un tondino colorato per fascia */
export function ovrBadge(ovr, delta = 0) {
  const tone = ovr >= 85 ? 'gold' : ovr >= 78 ? 'lime' : ovr >= 70 ? 'sky' : ovr >= 62 ? 'chalk' : 'dim';
  const b = el('span', `movr movr--${tone} display num`, String(ovr));
  if (delta) b.appendChild(el('i', `movr__d ${delta > 0 ? 'is-up' : 'is-down'}`, delta > 0 ? '▲' : '▼'));
  return b;
}

export function roleTag(role) {
  return el('span', `mrole mrole--${role} label`, t(`allenatore.rolesShort.${role}`));
}

export function nationTag(code) {
  if (!code) return el('span', 'mnat');
  return el('span', 'mnat', `${flagEmoji(code)}`);
}

export function fitnessBar(p) {
  const bar = el('span', 'mfit');
  const i = el('i', `mfit__i ${p.fitness < 55 ? 'is-low' : p.fitness < 75 ? 'is-mid' : ''}`);
  i.style.width = `${Math.max(4, p.fitness)}%`;
  bar.appendChild(i);
  bar.title = `${t('allenatore.fitness')} ${Math.round(p.fitness)}`;
  return bar;
}

export function moraleIcon(p) {
  const m = p.morale;
  const k = m >= 78 ? 'high' : m >= 58 ? 'ok' : m >= 38 ? 'low' : 'bad';
  const s = el('span', `mmor mmor--${k}`, { high: '●', ok: '●', low: '●', bad: '●' }[k]);
  s.title = `${t('allenatore.morale')} ${Math.round(m)} · ${t(`allenatore.moraleLevels.${k}`)}`;
  return s;
}

export function statusTags(p) {
  const box = el('span', 'mstatus');
  if (p.injury) box.appendChild(chip(`✚ ${p.injury}`, 'bad'));
  if (p.suspended) box.appendChild(chip(`▮ ${p.suspended}`, 'warn'));
  if (p.loanOut) box.appendChild(chip(p.loanToName ? t('allenatore.onLoanAt', { club: p.loanToName }) : t('allenatore.onLoan'), 'dim'));
  else if ((p.flags || []).includes('listed')) box.appendChild(chip(t('allenatore.listChip.transfer'), 'amber'));
  else if ((p.flags || []).includes('loanListed')) box.appendChild(chip(t('allenatore.listChip.loan'), 'sky'));
  if (p.loanIn) box.appendChild(chip(t('allenatore.loanIn'), 'dim'));
  return box;
}

const PHASE_TONE = { talent: 'lime', growing: 'sky', peak: 'amber', declining: 'flare' };
const PHASE_MARK = { talent: '✦', growing: '▲', peak: '●', declining: '▼' };

/** la fase della carriera: talento, in crescita, al massimo, in declino */
export function phaseChip(p, season) {
  const ph = careerPhase(p, season);
  return chip(`${PHASE_MARK[ph]} ${t(`allenatore.phase.${ph}`)}`, PHASE_TONE[ph]);
}

/** il potenziale come lo vede lo staff: un numero o una forchetta */
export function potentialText(p, season, opts = {}) {
  const r = potentialRange(p, season, opts);
  return r.lo === r.hi ? t('allenatore.potShort', { value: r.lo }) : t('allenatore.potRange', { lo: r.lo, hi: r.hi });
}

/** riga di un giocatore in una lista */
export function playerRow(p, season, { onClick = null, right = null, delta = 0 } = {}) {
  const row = el(onClick ? 'button' : 'div', 'mprow');
  if (onClick) { row.type = 'button'; row.addEventListener('click', onClick); }
  const age = season - p.birth;
  const main = el('span', 'mprow__main');
  const name = el('strong', 'mprow__name', p.name);
  const sub = el('span', 'mprow__sub label', `${flagEmoji(p.nation)} ${age} · ${t(`allenatore.roles.${p.role}`)}`);
  main.append(name, sub);
  row.append(roleTag(p.role), main, statusTags(p));
  if (right) row.appendChild(right);
  else row.append(fitnessBar(p), moraleIcon(p));
  row.appendChild(ovrBadge(p.ovr, delta));
  return row;
}

/** grafico del voto nel tempo: una linea, niente assi */
export function sparkline(points, { w = 220, h = 48 } = {}) {
  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
  svg.setAttribute('class', 'mspark');
  if (points.length < 2) return svg;
  const min = Math.min(...points) - 1;
  const max = Math.max(...points) + 1;
  const xs = (i) => (i / (points.length - 1)) * (w - 8) + 4;
  const ys = (v) => h - 4 - ((v - min) / Math.max(1, max - min)) * (h - 8);
  const d = points.map((v, i) => `${i ? 'L' : 'M'}${xs(i).toFixed(1)},${ys(v).toFixed(1)}`).join(' ');
  const path = document.createElementNS(svgNS, 'path');
  path.setAttribute('d', d);
  path.setAttribute('class', 'mspark__line');
  svg.appendChild(path);
  const dot = document.createElementNS(svgNS, 'circle');
  dot.setAttribute('cx', xs(points.length - 1));
  dot.setAttribute('cy', ys(points[points.length - 1]));
  dot.setAttribute('r', 3.2);
  dot.setAttribute('class', 'mspark__dot');
  svg.appendChild(dot);
  return svg;
}

/** barre delle doti del ruolo, dalla più pesante */
export function attrBars(p) {
  const box = el('div', 'mattrs');
  const keys = Object.entries(ROLE_ATTRS[p.role]).sort((a, b) => b[1] - a[1]).map(([k]) => k);
  for (const k of keys) {
    const v = Math.round(p.attrs[k]);
    const row = el('div', 'mattr');
    const track = el('span', 'mattr__track');
    const fill = el('i', `mattr__fill ${v >= 80 ? 'is-hi' : v < 55 ? 'is-lo' : ''}`);
    fill.style.width = `${v}%`;
    track.appendChild(fill);
    row.append(el('span', 'mattr__k label', t(`allenatore.attrs.${k}`)), track, el('span', 'mattr__v num', String(v)));
    box.appendChild(row);
  }
  return box;
}

export function formLetters(list) {
  const box = el('span', 'mform');
  for (const r of list) box.appendChild(el('i', `mform__i mform__i--${r}`, t(`allenatore.formShort.${r}`)));
  return box;
}

export function euro(m) {
  if (m >= 1) return `€${(Math.round(m * 10) / 10).toLocaleString()}M`;
  return `€${Math.round(m * 1000)}K`;
}

export function countryLabel(code) {
  return `${flagEmoji(code)} ${countryName(code)}`;
}

export const tr = (p) => readiness(p);

/** campo da gioco disegnato: righe leggere, niente erba finta */
export function pitchSvg() {
  return `<svg class="mpitch__lines" viewBox="0 0 100 140" preserveAspectRatio="none" aria-hidden="true">
    <rect x="1" y="1" width="98" height="138" fill="none" stroke="rgba(237,232,218,0.16)" stroke-width="0.5"/>
    <line x1="1" y1="70" x2="99" y2="70" stroke="rgba(237,232,218,0.16)" stroke-width="0.5"/>
    <circle cx="50" cy="70" r="12" fill="none" stroke="rgba(237,232,218,0.16)" stroke-width="0.5"/>
    <rect x="22" y="1" width="56" height="20" fill="none" stroke="rgba(237,232,218,0.14)" stroke-width="0.5"/>
    <rect x="22" y="119" width="56" height="20" fill="none" stroke="rgba(237,232,218,0.14)" stroke-width="0.5"/>
    <rect x="37" y="1" width="26" height="8" fill="none" stroke="rgba(237,232,218,0.12)" stroke-width="0.5"/>
    <rect x="37" y="131" width="26" height="8" fill="none" stroke="rgba(237,232,218,0.12)" stroke-width="0.5"/>
  </svg>`;
}

/**
 * Un testo tradotto con alcune parti in evidenza: i segnaposto in `strong`
 * diventano <strong>, così nomi e cifre saltano all'occhio in ogni lingua.
 */
export function richText(key, vars = {}, strong = [], cls = 'minbox__i') {
  const tpl = String(t(key));
  const p = el('p', cls);
  let last = 0;
  tpl.replace(/\{(\w+)\}/g, (m, k, i) => {
    if (i > last) p.appendChild(document.createTextNode(tpl.slice(last, i)));
    const v = vars[k] !== undefined ? String(vars[k]) : m;
    p.appendChild(strong.includes(k) ? el('strong', `mhl mhl--${k}`, v) : document.createTextNode(v));
    last = i + m.length;
    return m;
  });
  if (last < tpl.length) p.appendChild(document.createTextNode(tpl.slice(last)));
  return p;
}

/** una riga di mercato degli altri: chi, da dove, dove, quanto */
export function newsLine(n) {
  return richText('allenatore.news.line', { to: n.toName, name: `${n.name} (${n.ovr})`, from: n.fromName, fee: euro(n.fee) }, ['name', 'to', 'fee'], 'minbox__i mnews');
}

const TL_ICON = { goal: '⚽', penGoal: '⚽', penMissed: '✕', penSaved: '🧤', yellow: '🟨', red: '🟥', secondYellow: '🟥', injury: '✚', disallowed: '⚑', woodwork: '▮', error: '!', sub: '⇄', halftime: '⏸', shootout: '●' };

/** una riga del tabellino: minuto, icona, nome, dettaglio */
export function timelineRow(x, teams = null) {
  if (x.type === 'halftime') return el('li', 'mtl__sep label', `${t('allenatore.tl.halftime')} ${x.score ? `${x.score[0]}–${x.score[1]}` : ''}`);
  if (x.type === 'shootout') return el('li', 'mtl__sep label', t('allenatore.tl.shootout', { home: x.score[0], away: x.score[1] }));
  const row = el('li', `mtl__i mtl__i--${x.side ? 'a' : 'h'} mtl--${x.type}`);
  const what = el('span', 'mtl__what');
  /* di che squadra è: tre lettere, così si legge anche il tabellino in miniatura */
  if (teams) what.appendChild(el('span', `mtl__team label mtl__team--${x.side ? 'a' : 'h'}`, abbr(teams[x.side ? 1 : 0])));
  if (x.type === 'sub') {
    what.append(el('strong', 'mhl', x.in || ''), document.createTextNode(` ${t('allenatore.tl.subFor')} ${x.out || ''}`));
  } else {
    what.appendChild(el('strong', 'mhl', x.name || ''));
    const extra = x.type === 'goal' && x.assist ? t('allenatore.tl.assist', { name: x.assist })
      : x.type === 'injury' ? ((x.weeks || 1) === 1 ? t('allenatore.tl.injury1') : t('allenatore.tl.injury', { weeks: x.weeks }))
        : ['goal', 'yellow', 'sub'].includes(x.type) ? '' : t(`allenatore.tl.${x.type}`);
    if (extra) what.appendChild(el('span', 'mtl__x dim', ` · ${extra}`));
  }
  const score = (x.type === 'goal' || x.type === 'penGoal') && x.score ? el('span', 'mtl__score num', `${x.score[0]}–${x.score[1]}`) : el('span', 'mtl__score');
  row.append(el('span', 'mtl__min num', x.min ? `${x.min}'` : ''), el('span', 'mtl__ic', TL_ICON[x.type] || '·'), what, score);
  return row;
}

/** il tabellino completo della partita, casa a sinistra e trasferta a destra */
export function timelineCard(timeline, { home, away, title = null } = {}) {
  const card = el('section', 'mcard card mtl');
  card.appendChild(el('h3', 'mhead display', title || t('allenatore.tl.title')));
  if (home && away) {
    const head = el('div', 'mtl__teams label');
    head.append(el('span', '', home), el('span', '', away));
    card.appendChild(head);
  }
  const list = el('ol', 'mtl__list');
  if (!timeline.length) list.appendChild(el('li', 'dim', t('allenatore.tl.quiet')));
  for (const x of timeline) list.appendChild(timelineRow(x, home && away ? [home, away] : null));
  card.appendChild(list);
  return card;
}

/** la sigla di una squadra: le prime tre lettere del nome che conta */
export function abbr(name = '') {
  const words = String(name).replace(/^(FC|AC|AS|SS|US|SSC|ACF|UC|CF|RC|RCD|CD|UD|SD|SC|SV|VfB|VfL|TSG|1\.|FSV|OGC|AJ|RB|Real|Racing|Stade|Olympique|Borussia)\s+/i, '').split(/\s+/);
  return (words[0] || '').slice(0, 3).toUpperCase();
}

/**
 * Un risultato di giornata: la squadra che vince in grassetto e, sotto,
 * chi ha segnato (e chi è stato espulso) con il minuto.
 */
export function resultRow(f, clubName, meId) {
  const wrap = el('div', `mres2 ${f.h === meId || f.a === meId ? 'is-me' : ''}`);
  const r = el('div', 'mres');
  const win = f.res ? Math.sign(f.res[0] - f.res[1]) || (f.info?.pens ? Math.sign(f.info.pens[0] - f.info.pens[1]) : 0) : 0;
  r.append(
    el(win > 0 ? 'strong' : 'span', `mres__h ${win > 0 ? 'is-win' : ''}`, clubName(f.h)),
    el('strong', 'mres__s num', f.res ? `${f.res[0]}–${f.res[1]}` : '–'),
    el(win < 0 ? 'strong' : 'span', `mres__a ${win < 0 ? 'is-win' : ''}`, clubName(f.a)),
  );
  wrap.appendChild(r);
  const moments = f.info?.moments || [];
  if (moments.length) {
    const sc = el('div', 'mres__sc');
    for (const side of [0, 1]) {
      const col = el('span', `mres__col mres__col--${side ? 'a' : 'h'}`);
      const items = moments.filter((m) => m[1] === side).map(([min, , type, name]) => `${type === 'red' || type === 'secondYellow' ? '🟥' : '⚽'} ${(name || '').split(' ').slice(-1)[0]} ${min}'${type === 'penGoal' ? ` (${t('allenatore.live.penShort')})` : ''}`);
      items.forEach((txt, i) => { if (i) col.appendChild(document.createTextNode(' · ')); col.appendChild(el('span', 'mres__who', txt)); });
      sc.appendChild(col);
    }
    wrap.appendChild(sc);
  }
  return wrap;
}
