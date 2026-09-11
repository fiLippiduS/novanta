/* Il telecronista. Frasi corte, mai due volte di fila la stessa.
   Costa pochissimo ed è ciò che fa percepire qualcuno dall'altra parte. */

import { tRandom } from '../core/i18n.js';

export function createCommentary() {
  const el = document.createElement('p');
  el.className = 'commentary';
  el.setAttribute('aria-live', 'polite');
  let timer = null;

  function say(key, tone = 'neutral') {
    const line = tRandom(key);
    el.dataset.tone = tone;
    el.textContent = line;
    el.animate(
      [{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }],
      { duration: 220, easing: 'cubic-bezier(0.16,0.84,0.28,1)' },
    );
    clearTimeout(timer);
    timer = setTimeout(() => {
      el.animate([{ opacity: 1 }, { opacity: 0.35 }], { duration: 400, fill: 'forwards' });
    }, 2600);
    return line;
  }

  return { el, say, destroy: () => clearTimeout(timer) };
}
