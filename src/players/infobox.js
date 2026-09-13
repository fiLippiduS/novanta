/* La scheda del giocatore, disegnata come una voce di enciclopedia ma con
   la grafica del gioco: nazionalità, altezza, ruolo, squadra, giovanili,
   club con presenze e gol, nazionale, palmarès in ordine cronologico. */

import { el } from '../ui/components.js';
import { t } from '../core/i18n.js';
import { nationTag, countryName, flagEmoji } from '../ui/flags.js';
import { positionName, compName, MAJOR } from './terms.js';
import { yearsLabel } from './data.js';

export function kitNode(colors) {
  const k = el('span', 'kit');
  k.setAttribute('aria-hidden', 'true');
  const list = colors && colors.length ? colors : ['#8B8779'];
  k.style.gridTemplateColumns = `repeat(${list.length}, 1fr)`;
  list.forEach((c) => { const i = el('i'); i.style.background = c; k.appendChild(i); });
  return k;
}

export function clubNode(club) {
  const s = el('span', 'club');
  s.append(kitNode(club ? club.colors : null), el('span', 'club__name', club ? club.name : '—'));
  return s;
}

function row(label, value) {
  const r = el('div', 'ibox__row');
  r.append(el('span', 'ibox__key label', label));
  const v = el('span', 'ibox__val');
  if (typeof value === 'string') v.textContent = value; else v.appendChild(value);
  r.appendChild(v);
  return r;
}

function band(title) {
  return el('div', 'ibox__band label', title);
}

function numbers(caps, goals) {
  if (caps == null) return '–';
  return goals == null ? String(caps) : `${caps} (${goals})`;
}

function nationalLabel(nation, suffix) {
  const name = countryName(nation);
  if (!suffix) return name;
  if (/^OLY$/i.test(suffix)) return `${name} ${t('chi.olympic')}`;
  return `${name} ${suffix.toUpperCase().replace(/^U(\d+)/, 'U-$1')}`;
}

/**
 * info: voce dell'indice (nazione, ruolo, anno)
 * career: carriera completa
 * opts.hidden: il nome non si vede
 */
export function renderInfobox(info, career, clubs, opts = {}) {
  const box = el('article', 'ibox card halftone misreg card--print');
  box.style.setProperty('--misreg-color', 'var(--sky)');

  const head = el('header', 'ibox__head');
  const name = el('h3', 'ibox__name display', opts.hidden ? '? ? ?' : info.label);
  name.dataset.hidden = opts.hidden ? '1' : '0';
  head.append(el('p', 'label ibox__kicker', t('chi.kicker')), name);
  box.appendChild(head);
  box.__name = name;

  const facts = el('div', 'ibox__facts');
  facts.appendChild(row(t('chi.nationality'), nationTag(info.nation)));
  if (career.height) facts.appendChild(row(t('chi.height'), `${career.height} cm`));
  facts.appendChild(row(t('chi.position'), positionName(career.position, info.role)));
  const open = [...career.clubs].reverse().find((s) => !s.to);
  if (open) facts.appendChild(row(t('chi.team'), clubNode(clubs[open.club])));
  const born = row(t('chi.born'), String(info.birthYear));
  born.classList.add('ibox__born');
  if (opts.hidden && !opts.showBirth) born.hidden = true;
  facts.appendChild(born);
  box.__born = born;
  box.appendChild(facts);

  const addSpells = (title, spells, withNumbers) => {
    if (!spells.length) return;
    box.appendChild(band(title));
    const list = el('div', 'ibox__table');
    spells.forEach((s) => {
      const r = el('div', `ibox__spell${s.loan ? ' ibox__spell--loan' : ''}`);
      r.append(el('span', 'ibox__years num', yearsLabel(s.from, s.to)));
      const club = el('span', 'ibox__club');
      if (s.loan) club.appendChild(el('span', 'ibox__loan', '→'));
      club.appendChild(clubNode(clubs[s.club]));
      r.appendChild(club);
      if (withNumbers) r.appendChild(el('span', 'ibox__apps num', numbers(s.caps, s.goals)));
      r.dataset.club = s.club;
      list.appendChild(r);
    });
    box.appendChild(list);
  };

  addSpells(t('chi.youth'), career.youth, false);
  if (career.clubs.length) {
    const hdr = band(t('chi.clubs'));
    hdr.appendChild(el('span', 'ibox__band-note', t('chi.appsGoals')));
    box.appendChild(hdr);
    const list = el('div', 'ibox__table');
    career.clubs.forEach((s) => {
      const r = el('div', `ibox__spell${s.loan ? ' ibox__spell--loan' : ''}`);
      r.dataset.club = s.club;
      r.append(el('span', 'ibox__years num', yearsLabel(s.from, s.to)));
      const club = el('span', 'ibox__club');
      if (s.loan) club.appendChild(el('span', 'ibox__loan', '→'));
      club.appendChild(clubNode(clubs[s.club]));
      r.append(club, el('span', 'ibox__apps num', numbers(s.caps, s.goals)));
      list.appendChild(r);
    });
    box.appendChild(list);
  }

  if (career.national.length) {
    box.appendChild(band(t('chi.national')));
    const list = el('div', 'ibox__table');
    career.national.forEach((s) => {
      const r = el('div', `ibox__spell${s.suffix ? ' ibox__spell--youth' : ''}`);
      r.append(el('span', 'ibox__years num', yearsLabel(s.from, s.to)));
      const team = el('span', 'ibox__club nation');
      const f = flagEmoji(s.nation);
      if (f) team.appendChild(el('span', 'flag', f));
      team.appendChild(el('span', 'club__name', nationalLabel(s.nation, s.suffix)));
      r.append(team, el('span', 'ibox__apps num', numbers(s.caps, s.goals)));
      list.appendChild(r);
    });
    box.appendChild(list);
  }

  const team = career.honours.filter((h) => h.kind !== 'individual');
  const individual = career.honours.filter((h) => h.kind === 'individual');
  if (team.length || individual.length) {
    box.appendChild(band(t('chi.honours')));
    const list = el('div', 'ibox__honours');
    const order = (a, b) => a.year - b.year || (MAJOR.has(b.comp) - MAJOR.has(a.comp)) || a.comp.localeCompare(b.comp);
    const paint = (h) => {
      const r = el('div', `hon hon--${h.result}`);
      r.append(el('i', 'hon__medal'), el('span', 'hon__year num', h.label));
      const main = el('span', 'hon__main');
      main.append(el('span', 'hon__comp', compName(h.comp)));
      let group = '';
      if (typeof h.group === 'number') group = clubs[h.group] ? clubs[h.group].name : '';
      else if (h.kind === 'national') {
        const [code, suffix] = String(h.group || '').split('|');
        group = nationalLabel(code || info.nation, suffix || '');
      }
      else group = h.group || '';
      if (group && h.kind !== 'individual') main.append(el('span', 'hon__group', group));
      if (h.result !== 'winner') main.append(el('span', 'hon__result label', t(`chi.${h.result}`)));
      r.appendChild(main);
      return r;
    };
    team.sort(order).forEach((h) => list.appendChild(paint(h)));
    if (individual.length) {
      const more = el('details', 'hon__more');
      more.appendChild(el('summary', 'label', t('chi.individual', { n: individual.length })));
      individual.sort(order).forEach((h) => more.appendChild(paint(h)));
      list.appendChild(more);
    }
    box.appendChild(list);
  }

  return box;
}
