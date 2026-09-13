/* NOVANTA — avvio.
   Nessun bundler: i moduli arrivano al browser così come sono scritti. */

import * as i18n from './core/i18n.js';
import * as audio from './core/audio.js';
import * as router from './core/router.js';
import * as ads from './ads/adapter.js';
import { needsPrompt, showBanner } from './consent/cmp.js';
import * as googleCmp from './consent/google-cmp.js';

async function boot() {
  await i18n.init();
  audio.init();

  router.register('hub', () => import('./scenes/hub.js'));
  router.register('squad', () => import('./scenes/squad.js'));
  router.register('arcade', () => import('./scenes/arcade.js'));
  router.register('daily', () => import('./scenes/daily.js'));
  router.register('asta', () => import('./scenes/asta.js'));
  router.register('carriera', () => import('./scenes/carriera.js'));
  router.register('duello', () => import('./scenes/duello.js'));
  router.register('chi', () => import('./scenes/chi.js'));
  router.register('catena', () => import('./scenes/catena.js'));
  router.register('impostore', () => import('./scenes/impostore.js'));

  router.start(document.getElementById('app'));

  // Il consenso si chiede dopo il primo disegno, non prima:
  // la prima cosa che l'utente vede deve essere il gioco.
  setTimeout(async () => {
    /* In produzione il consenso lo chiede Google con la sua piattaforma
       certificata: è l'unica che l'Europa e AdSense accettano. Il banner
       nostro resta per lo sviluppo, quando non c'è nessun codice editore. */
    if (googleCmp.isAvailable()) {
      const handled = await googleCmp.load();
      if (!handled && needsPrompt()) await showBanner();
    } else if (needsPrompt()) {
      await showBanner();
    }
    ads.init();
  }, 1200);

  // ricarica le stringhe visibili quando cambia la lingua
  i18n.onLangChange(() => {
    const scene = router.current();
    location.hash = '#/reload';
    requestAnimationFrame(() => { location.hash = `#/${scene}`; });
  });
}

/* Il service worker rende il gioco installabile sulla schermata Home e lo
   tiene in piedi se la rete cade. Registrato dopo l'avvio, mai prima: la
   prima partita non deve aspettare niente. */
function registerWorker() {
  if (!('serviceWorker' in navigator)) return;
  if (location.protocol !== 'https:' && location.hostname !== 'localhost') return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => { /* non è un problema */ });
  });
}
registerWorker();

boot().catch((e) => {
  console.error(e);
  document.getElementById('app').innerHTML =
    '<div class="shell" style="padding-block:4rem"><h1 class="t-xl">Qualcosa non ha caricato</h1>'
    + '<p class="dim">Ricarica la pagina.</p></div>';
});
