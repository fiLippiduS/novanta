/* Implementazione finta: serve a sviluppare e collaudare senza SDK.
   Riproduce gli stessi tempi e gli stessi stati di quella vera. */

import { el } from '../ui/components.js';

function overlay(label, seconds, { skippable }) {
  return new Promise((resolve) => {
    const root = el('div', 'adstub');
    const panel = el('div', 'adstub__panel');
    const tag = el('span', 'label', 'AD · SIMULATO');
    const title = el('strong', 'display t-lg', label);
    const count = el('div', 'adstub__count display num', String(seconds));
    const skip = el('button', 'btn btn--ghost', 'Salta');
    skip.type = 'button';

    let left = seconds;
    const timer = setInterval(() => {
      left -= 1;
      count.textContent = String(Math.max(0, left));
      if (left <= 0) { clearInterval(timer); done(true); }
    }, 1000);

    function done(completed) {
      clearInterval(timer);
      root.remove();
      resolve(completed);
    }

    skip.addEventListener('click', () => done(!skippable ? true : false));
    panel.append(tag, title, count, skip);
    root.appendChild(panel);
    document.getElementById('overlay-root').appendChild(root);
  });
}

export const stubAds = {
  async init() { console.info('[ads] modalità simulata'); },
  async interstitial(name) {
    await overlay(`Interstitial · ${name}`, 3, { skippable: false });
    return true;
  },
  async rewarded(name) {
    return overlay(`Rewarded · ${name}`, 5, { skippable: true });
  },
  ready() { return true; },
};
