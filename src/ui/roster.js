/* Chi gioca: da due a dieci nomi, scelti da chi tiene il telefono.
   I nomi dell'ultima partita restano salvati, così la seconda sera con gli
   stessi amici non si riscrive niente. */

import { el } from './components.js';
import { t } from '../core/i18n.js';
import * as store from '../core/storage.js';

export function roster({ min = 2, max = 10, key = 'party' } = {}) {
  const wrap = el('div', 'roster');
  const list = el('div', 'roster__list');
  const tools = el('div', 'roster__tools');
  const add = el('button', 'btn btn--ghost', `+ ${t('party.add')}`);
  add.type = 'button';
  const count = el('span', 'label');
  tools.append(count, add);
  wrap.append(list, tools);

  const saved = (store.get(key) || []).filter((n) => typeof n === 'string' && n.trim());
  let names = saved.length >= min ? saved.slice(0, max) : Array.from({ length: min }, (_, i) => t('party.player', { n: i + 1 }));

  function paint() {
    list.textContent = '';
    names.forEach((name, i) => {
      const row = el('div', 'roster__row');
      const n = el('span', 'roster__n', String(i + 1));
      const input = el('input', 'roster__input');
      input.value = name;
      input.maxLength = 18;
      input.placeholder = t('party.player', { n: i + 1 });
      input.autocomplete = 'off';
      input.setAttribute('aria-label', t('party.player', { n: i + 1 }));
      input.addEventListener('input', () => { names[i] = input.value; });
      input.addEventListener('focus', () => input.select());
      const del = el('button', 'roster__del', '×');
      del.type = 'button';
      del.setAttribute('aria-label', t('party.remove'));
      del.disabled = names.length <= min;
      del.addEventListener('click', () => { names.splice(i, 1); paint(); });
      row.append(n, input, del);
      list.appendChild(row);
    });
    add.disabled = names.length >= max;
    count.textContent = t('party.count', { n: names.length, max });
  }

  add.addEventListener('click', () => {
    if (names.length >= max) return;
    names.push(t('party.player', { n: names.length + 1 }));
    paint();
    const inputs = list.querySelectorAll('.roster__input');
    inputs[inputs.length - 1].focus();
  });

  paint();

  return {
    el: wrap,
    /** i nomi puliti: vuoti rimpiazzati, doppioni numerati */
    names() {
      const clean = names.map((n, i) => (n || '').trim() || t('party.player', { n: i + 1 }));
      const seen = new Map();
      const out = clean.map((n) => {
        const k = n.toLowerCase();
        const c = (seen.get(k) || 0) + 1;
        seen.set(k, c);
        return c > 1 ? `${n} ${c}` : n;
      });
      store.save({ [key]: out });
      return out;
    },
  };
}

/** schermata a tutto schermo per passare il telefono: il turno parte al tocco */
export function handoff({ name, note, action }) {
  return new Promise((resolve) => {
    const root = el('div', 'handoff');
    root.setAttribute('role', 'dialog');
    const inner = el('div', 'handoff__inner');
    const kicker = el('p', 'label', t('party.passTo'));
    const who = el('h2', 'handoff__who display', name);
    const btn = el('button', 'btn btn--go btn--lg', action || t('party.ready'));
    btn.type = 'button';
    inner.append(kicker, who);
    if (note) inner.appendChild(el('p', 'handoff__note', note));
    inner.appendChild(btn);
    root.appendChild(inner);
    document.getElementById('overlay-root').appendChild(root);
    setTimeout(() => btn.focus(), 60);
    btn.addEventListener('click', () => {
      root.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 160, fill: 'forwards' });
      setTimeout(() => { root.remove(); resolve(); }, 170);
    });
  });
}
