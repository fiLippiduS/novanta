/* Il messaggio di consenso di Google (Privacy & messaging, ex Funding Choices).
   Perché non basta il banner fatto in casa: dal 2024 Google serve annunci al
   traffico europeo solo se il consenso arriva da una piattaforma certificata
   IAB TCF. Con un banner nostro, in Europa, gli annunci semplicemente non
   partono. Questo modulo carica quello vero appena esiste un codice editore.

   Non c'è niente da configurare nel codice: il messaggio si crea e si modifica
   dal pannello AdSense, alla voce Privacy e messaggi. */

import { AD_CONFIG } from '../ads/config.js';
import { markExternal } from './cmp.js';

const TIMEOUT_MS = 3500;

export function isAvailable() {
  return Boolean(AD_CONFIG.publisherId);
}

/** true se il consenso è stato gestito da Google e possiamo proseguire. */
export function load() {
  if (!isAvailable()) return Promise.resolve(false);

  return new Promise((resolve) => {
    let settled = false;
    const done = (v) => { if (!settled) { settled = true; resolve(v); } };

    /* Se la rete è lenta o l'utente ha un blocco annunci, il gioco non deve
       restare fermo ad aspettare: si prosegue senza pubblicità. */
    setTimeout(() => done(false), TIMEOUT_MS);

    const s = document.createElement('script');
    s.async = true;
    s.src = `https://fundingchoicesmessages.google.com/i/${AD_CONFIG.publisherId}?ers=1`;
    s.onerror = () => done(false);
    s.onload = () => {
      /* Lo snippet ufficiale: segnala allo script che la pagina è pronta. */
      (function signal(w) {
        w.googlefc = w.googlefc || {};
        w.googlefc.callbackQueue = w.googlefc.callbackQueue || [];
        w.googlefc.callbackQueue.push({
          CONSENT_DATA_READY: () => { markExternal(); done(true); },
        });
      }(window));
    };
    document.head.appendChild(s);
  });
}
