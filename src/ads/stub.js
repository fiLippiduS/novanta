/* Implementazione finta: serve a sviluppare e collaudare senza SDK.
   Riproduce tempi e comportamenti tipici degli annunci veri, così i punti
   in cui compaiono si provano come saranno davvero:
   - interstitial: sei secondi, si può saltare dopo cinque;
   - rewarded: dieci secondi, non si salta; chi chiude prima perde il premio. */

import { el } from '../ui/components.js';
import { t } from '../core/i18n.js';

function overlay({ kind, seconds, skipAfter }) {
  return new Promise((resolve) => {
    const root = el('div', 'adstub');
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-label', t('ads.label'));
    const panel = el('div', 'adstub__panel');
    const tag = el('span', 'adstub__tag label', t('ads.label'));
    const title = el('strong', 'display t-lg', t(kind === 'reward' ? 'ads.rewardTitle' : 'ads.breakTitle'));
    const bar = el('div', 'adstub__bar');
    const fill = el('i', 'adstub__fill');
    bar.appendChild(fill);
    const note = el('p', 'adstub__note dim', t('ads.simulated'));
    const action = el('button', 'btn btn--ghost adstub__action');
    action.type = 'button';

    const start = performance.now();
    const total = seconds * 1000;
    let finished = false;

    function tick() {
      if (finished) return;
      const elapsed = performance.now() - start;
      fill.style.transform = `scaleX(${Math.min(1, elapsed / total)})`;
      const left = Math.max(0, Math.ceil((total - elapsed) / 1000));
      if (kind === 'reward') {
        action.textContent = t('ads.closeNoReward');
      } else if (elapsed < skipAfter * 1000) {
        action.disabled = true;
        action.textContent = t('ads.skipIn', { n: Math.ceil(skipAfter - elapsed / 1000) });
      } else {
        action.disabled = false;
        action.textContent = t('ads.skip');
      }
      if (elapsed >= total) { done(true); return; }
      requestAnimationFrame(tick);
      void left;
    }

    function done(completed) {
      if (finished) return;
      finished = true;
      root.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 160, fill: 'forwards' });
      setTimeout(() => root.remove(), 170);
      resolve(completed);
    }

    action.addEventListener('click', () => done(kind !== 'reward'));
    panel.append(tag, title, bar, action, note);
    root.appendChild(panel);
    document.getElementById('overlay-root').appendChild(root);
    requestAnimationFrame(tick);
  });
}

export const stubAds = {
  async init() { console.info('[ads] modalità simulata'); },
  async interstitial() {
    await overlay({ kind: 'break', seconds: 6, skipAfter: 5 });
    return true;
  },
  async rewarded() {
    return overlay({ kind: 'reward', seconds: 10, skipAfter: Infinity });
  },
  /* annuncio chiesto dall'utente per avere qualcosa (la risposta): si salta
     dopo cinque secondi, e quello che era stato promesso arriva comunque */
  async breakThen() {
    await overlay({ kind: 'break', seconds: 8, skipAfter: 5 });
    return true;
  },
  ready() { return true; },
};
