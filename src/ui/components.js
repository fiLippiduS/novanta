/* Pezzi condivisi fra le scene. Niente template engine: solo DOM. */

import { t } from '../core/i18n.js';
import { go } from '../core/router.js';

export function el(tag, className, text) {
  const n = document.createElement(tag);
  if (className) n.className = className;
  if (text != null) n.textContent = text;
  return n;
}

export function frag(html) {
  const tpl = document.createElement('template');
  tpl.innerHTML = html.trim();
  return tpl.content;
}

/** barra superiore di una modalità: uscita, titolo, due misure a destra */
export function topbar({ title, onExit }) {
  const bar = el('header', 'topbar');
  const back = el('button', 'topbar__back');
  back.type = 'button';
  back.setAttribute('aria-label', t('common.back'));
  back.innerHTML = '<span aria-hidden="true">&#8592;</span>';
  back.addEventListener('click', () => (onExit ? onExit() : go('hub')));

  const h = el('h2', 'topbar__title display', title);
  const slot = el('div', 'topbar__slot');

  bar.append(back, h, slot);
  return { el: bar, slot, setTitle: (v) => { h.textContent = v; } };
}

/**
 * Stemma astratto: solo fasce di colore.
 * Niente loghi, niente maglie riprodotte: nessun asset di terzi nel progetto.
 */
export function crest(colors, size = 64) {
  const wrap = el('div', 'crest');
  wrap.style.setProperty('--crest-size', `${size}px`);
  const bars = colors.length ? colors : ['#EDE8DA', '#0F1728'];
  bars.forEach((c) => {
    const b = el('i', 'crest__bar');
    b.style.background = c;
    wrap.appendChild(b);
  });
  wrap.style.setProperty('--crest-glow', bars[0]);
  return wrap;
}

/** pannello a comparsa dal basso: fine partita, impostazioni, ricompense */
export function sheet({ title, body, actions = [], dismissable = true }) {
  const root = el('div', 'sheet');
  root.setAttribute('role', 'dialog');
  root.setAttribute('aria-modal', 'true');

  const scrim = el('div', 'sheet__scrim');
  const panel = el('div', 'sheet__panel card halftone misreg card--print');

  if (title) panel.appendChild(el('h3', 'sheet__title display t-xl', title));
  if (body) panel.appendChild(body);

  if (actions.length) {
    const row = el('div', 'sheet__actions');
    actions.forEach((a) => {
      const b = el('button', `btn ${a.variant || 'btn--ghost'}`, a.label);
      b.type = 'button';
      b.addEventListener('click', () => a.onClick(close, b));
      row.appendChild(b);
    });
    panel.appendChild(row);
  }

  function close() {
    panel.animate([{ transform: 'none', opacity: 1 }, { transform: 'translateY(24px)', opacity: 0 }],
      { duration: 180, easing: 'ease-in', fill: 'forwards' });
    scrim.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 180, fill: 'forwards' });
    setTimeout(() => root.remove(), 190);
  }

  if (dismissable) scrim.addEventListener('click', close);
  root.append(scrim, panel);
  document.getElementById('overlay-root').appendChild(root);

  panel.animate([{ transform: 'translateY(34px)', opacity: 0 }, { transform: 'none', opacity: 1 }],
    { duration: 320, easing: 'cubic-bezier(0.18,1.32,0.42,1)' });

  const focusable = panel.querySelector('button');
  if (focusable) setTimeout(() => focusable.focus(), 340);

  return { el: root, close, panel };
}

/** riga di statistica: etichetta piccola sopra, numero grande sotto */
export function stat(label, value, tone) {
  const n = el('div', `stat ${tone ? `stat--${tone}` : ''}`.trim());
  n.append(el('span', 'label', label), el('strong', 'stat__v display num', String(value)));
  return n;
}
