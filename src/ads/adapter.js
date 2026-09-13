/* Il gioco parla solo con questo modulo.
   Sotto può esserci lo stub o l'SDK vero: la logica di gioco non cambia
   e non deve mai bloccarsi se la pubblicità non parte. */

import { AD_CONFIG, isLive } from './config.js';
import { stubAds } from './stub.js';
import { hasConsent } from '../consent/cmp.js';
import { el } from '../ui/components.js';
import { t } from '../core/i18n.js';

let impl = stubAds;
let started = false;
let live = false;
const sessionStart = Date.now();
let lastInterstitial = 0;
/* Quante volte quel punto di rottura è stato raggiunto. Serve a mostrare
   l'annuncio una volta ogni N passaggi invece che a ogni passaggio. */
const seen = new Map();

export async function init() {
  if (started) return;
  started = true;
  if (isLive() && hasConsent()) {
    try {
      const { adsenseAds } = await import('./adsense.js');
      await adsenseAds.init();
      impl = adsenseAds;
      live = true;
      document.querySelectorAll('.adslot[data-pending]').forEach(fillSlot);
      return;
    } catch (e) {
      console.warn('[ads] SDK non disponibile, resto in simulazione', e);
    }
  }
  await impl.init();
}

/**
 * Interstitial: solo ai punti di rottura naturali, mai sopra il campo.
 * Restituisce false quando non è il momento: troppo presto nella visita,
 * troppo vicino al precedente, o non è il turno di questo passaggio.
 */
export async function interstitial(name, every = 1) {
  const n = (seen.get(name) || 0) + 1;
  seen.set(name, n);
  if (every > 1 && n % every !== 0) return false;
  const now = Date.now();
  if (now - sessionStart < AD_CONFIG.warmupMs) return false;
  if (now - lastInterstitial < AD_CONFIG.minGapMs) return false;
  lastInterstitial = now;
  try { await impl.interstitial(name); } catch { /* il gioco continua */ }
  return true;
}

/**
 * Rewarded: l'utente lo chiede, sapendo cosa riceve.
 * → true solo se l'annuncio è stato visto per intero.
 * Il rewarded non subisce il limite di frequenza: lo sceglie chi gioca.
 */
export async function rewarded(name) {
  try { return await impl.rewarded(name); } catch { return false; }
}

/**
 * Pubblicità "a scelta" che deve comunque dare qualcosa anche se l'annuncio
 * non c'è (rete assente, blocco annunci, nessun annuncio disponibile):
 * per esempio la risposta dopo "Mi arrendo". Aspetta la fine dell'annuncio
 * se c'è, e prosegue in ogni caso.
 */
export async function breakThen(name) {
  try {
    if (impl.breakThen) await impl.breakThen(name);
    else await impl.rewarded(name);
  } catch { /* si prosegue comunque */ }
}

export function timeUntilNextInterstitial() {
  return Math.max(0, AD_CONFIG.minGapMs - (Date.now() - lastInterstitial));
}

/* ------------------------------------------------------------------ */
/* riquadri display                                                    */
/* ------------------------------------------------------------------ */

function fillSlot(box) {
  const slot = AD_CONFIG.slots[box.dataset.slot];
  if (!slot || !live) return;
  delete box.dataset.pending;
  box.textContent = '';
  const ins = document.createElement('ins');
  ins.className = 'adsbygoogle';
  ins.style.display = 'block';
  ins.dataset.adClient = AD_CONFIG.publisherId;
  ins.dataset.adSlot = slot;
  ins.dataset.adFormat = 'auto';
  ins.dataset.fullWidthResponsive = 'true';
  box.appendChild(ins);
  try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch { /* ignora */ }
}

/**
 * Riquadro pubblicitario con spazio riservato: la pagina non salta quando
 * l'annuncio arriva. In sviluppo mostra un segnaposto; in produzione, se
 * l'unità non è configurata, non mostra niente.
 */
export function adSlot(name) {
  const configured = Boolean(AD_CONFIG.slots[name]);
  const dev = !isLive();
  if (!configured && !dev) return null;
  const box = el('aside', `adslot adslot--${name}`);
  box.dataset.slot = name;
  box.dataset.pending = '1';
  box.setAttribute('aria-label', t('ads.label'));
  const tag = el('span', 'adslot__tag label', t('ads.label'));
  box.appendChild(tag);
  if (live) fillSlot(box);
  return box;
}
