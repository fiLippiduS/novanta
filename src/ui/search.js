/* Barra di ricerca con suggerimenti.
   Si scrive qualche lettera, compaiono i nomi possibili, se ne tocca uno.
   Niente accenti obbligatori, niente ordine obbligatorio delle parole:
   "cutrone", "patrick c", "Cutrone P" trovano tutti la stessa persona. */

import { el } from './components.js';
import { normalize } from '../core/match.js';

/**
 * Prepara un elenco per la ricerca veloce.
 * items: [{ id, label, ...qualsiasi }]
 * extraKeys(item): altre forme del nome (soprannomi, nome completo)
 */
export function buildSearchIndex(items, extraKeys = () => []) {
  return items.map((item) => {
    const keys = [item.label, ...extraKeys(item)].map(normalize).filter(Boolean);
    const tokens = new Set(keys.flatMap((k) => k.split(' ')));
    return { item, keys, tokens: [...tokens], weight: item.weight || 0 };
  });
}

/** i migliori risultati per quello che è stato scritto */
export function searchIndex(index, query, limit = 8, filter = null) {
  const q = normalize(query);
  if (q.length < 2) return [];
  const words = q.split(' ');
  const scored = [];
  for (const e of index) {
    if (filter && !filter(e.item)) continue;
    let score = 0;
    const full = e.keys[0];
    if (full === q) score = 1000;
    else if (e.keys.some((k) => k.startsWith(q))) score = 700;
    else if (words.every((w) => e.tokens.some((tok) => tok.startsWith(w)))) {
      score = 500 + (e.tokens.some((tok) => tok.startsWith(words[words.length - 1])) ? 20 : 0);
    } else if (q.length >= 4 && e.keys.some((k) => k.includes(q))) score = 300;
    else continue;
    /* a parità di corrispondenza vince chi è più conosciuto */
    scored.push({ item: e.item, score: score + Math.min(99, e.weight) });
  }
  scored.sort((a, b) => b.score - a.score || a.item.label.localeCompare(b.item.label));
  return scored.slice(0, limit).map((s) => s.item);
}

/**
 * Il componente.
 * render(item) restituisce il contenuto di una riga (nodo DOM).
 * onPick(item) quando se ne sceglie uno.
 */
export function searchBox({ placeholder, index, render, onPick, filter = null, limit = 8 }) {
  const wrap = el('div', 'search');
  const field = el('div', 'search__field');
  const input = el('input', 'search__input');
  input.type = 'search';
  input.placeholder = placeholder;
  input.autocomplete = 'off';
  input.autocapitalize = 'off';
  input.spellcheck = false;
  input.setAttribute('enterkeyhint', 'search');
  input.setAttribute('role', 'combobox');
  input.setAttribute('aria-expanded', 'false');
  input.setAttribute('aria-autocomplete', 'list');

  const clear = el('button', 'search__clear', '×');
  clear.type = 'button';
  clear.hidden = true;
  clear.setAttribute('aria-label', '×');

  const list = el('ul', 'search__list');
  list.setAttribute('role', 'listbox');
  list.hidden = true;
  const listId = `sl-${Math.random().toString(36).slice(2, 8)}`;
  list.id = listId;
  input.setAttribute('aria-controls', listId);

  field.append(input, clear);
  wrap.append(field, list);

  let results = [];
  let active = -1;
  let currentIndex = index;
  let currentFilter = filter;

  function close() {
    list.hidden = true;
    input.setAttribute('aria-expanded', 'false');
    active = -1;
  }

  function paint() {
    list.textContent = '';
    results.forEach((item, i) => {
      const li = el('li', `search__item${i === active ? ' is-active' : ''}`);
      li.setAttribute('role', 'option');
      li.appendChild(render(item));
      /* pointerdown invece di click: sul telefono il campo perde il fuoco
         prima del click e la lista sparirebbe sotto il dito */
      li.addEventListener('pointerdown', (e) => { e.preventDefault(); pick(item); });
      list.appendChild(li);
    });
    const open = results.length > 0;
    list.hidden = !open;
    input.setAttribute('aria-expanded', String(open));
  }

  function update() {
    clear.hidden = !input.value;
    results = searchIndex(currentIndex, input.value, limit, currentFilter);
    active = results.length ? 0 : -1;
    paint();
  }

  function pick(item) {
    input.value = '';
    clear.hidden = true;
    results = [];
    close();
    onPick(item);
  }

  input.addEventListener('input', update);
  input.addEventListener('focus', update);
  input.addEventListener('blur', () => setTimeout(close, 120));
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown' && results.length) { e.preventDefault(); active = (active + 1) % results.length; paint(); }
    else if (e.key === 'ArrowUp' && results.length) { e.preventDefault(); active = (active - 1 + results.length) % results.length; paint(); }
    else if (e.key === 'Enter') { e.preventDefault(); if (results[active]) pick(results[active]); }
    else if (e.key === 'Escape') close();
  });
  clear.addEventListener('click', () => { input.value = ''; update(); input.focus(); });

  return {
    el: wrap,
    input,
    focus: () => input.focus({ preventScroll: true }),
    clear: () => { input.value = ''; update(); },
    setDisabled: (v) => { input.disabled = v; if (v) close(); },
    setIndex: (idx, f = currentFilter) => { currentIndex = idx; currentFilter = f; update(); },
    setFilter: (f) => { currentFilter = f; update(); },
  };
}
