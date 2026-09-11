/* Consenso. Obbligatorio per il traffico europeo prima di caricare
   qualunque script pubblicitario, e prerequisito per l'approvazione AdSense.
   Questa è una implementazione minima e onesta: in produzione va sostituita
   con un CMP certificato IAB TCF fra quelli riconosciuti da Google. */

import { el } from '../ui/components.js';
import { t } from '../core/i18n.js';

const KEY = 'novanta:consent';

export function consentState() {
  try { return localStorage.getItem(KEY); } catch { return null; }
}

/* Quando il consenso lo gestisce la piattaforma certificata di Google,
   la risposta non passa più di qui: lo script degli annunci legge da solo il
   segnale TCF. A noi basta sapere che qualcuno se n'è occupato. */
let external = false;
export function markExternal() { external = true; }

export function hasConsent() { return external || consentState() === 'all'; }

function record(value) {
  try { localStorage.setItem(KEY, value); } catch { /* ignora */ }
}

/** true se abbiamo bisogno di chiedere: mai chiesto prima */
export function needsPrompt() { return consentState() === null; }

export function showBanner() {
  return new Promise((resolve) => {
    const bar = el('div', 'consent');
    const text = el('p', 'consent__text');
    text.innerHTML = `${t('consent.text')} <a href="privacy.html" target="_blank" rel="noopener">${t('consent.privacy')}</a>`;

    const deny = el('button', 'btn btn--ghost', t('consent.deny'));
    const allow = el('button', 'btn btn--go', t('consent.allow'));
    deny.type = allow.type = 'button';

    const done = (v) => {
      record(v);
      bar.animate([{ transform: 'none', opacity: 1 }, { transform: 'translateY(100%)', opacity: 0 }],
        { duration: 220, easing: 'ease-in', fill: 'forwards' });
      setTimeout(() => bar.remove(), 230);
      resolve(v);
    };

    deny.addEventListener('click', () => done('essential'));
    allow.addEventListener('click', () => done('all'));

    const actions = el('div', 'consent__actions');
    actions.append(deny, allow);
    bar.append(text, actions);
    document.getElementById('overlay-root').appendChild(bar);
    bar.animate([{ transform: 'translateY(100%)' }, { transform: 'none' }],
      { duration: 320, easing: 'cubic-bezier(0.18,1.32,0.42,1)' });
  });
}
