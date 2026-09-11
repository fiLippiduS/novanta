/* Il gioco parla solo con questo modulo.
   Sotto può esserci lo stub o l'SDK vero: la logica di gioco non cambia
   e non deve mai bloccarsi se la pubblicità non parte. */

import { isLive } from './config.js';
import { stubAds } from './stub.js';
import { hasConsent } from '../consent/cmp.js';

let impl = stubAds;
let started = false;
let lastInterstitial = 0;
const MIN_GAP_MS = 90_000;   // mai due interstitial ravvicinati
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
      return;
    } catch (e) {
      console.warn('[ads] SDK non disponibile, resto in simulazione', e);
    }
  }
  await impl.init();
}

/**
 * Interstitial: solo ai punti di rottura naturali, mai sopra il campo.
 * Restituisce false se è troppo presto rispetto all'ultimo.
 */
export async function interstitial(name, every = 1) {
  const n = (seen.get(name) || 0) + 1;
  seen.set(name, n);
  if (every > 1 && n % every !== 0) return false;
  const now = Date.now();
  if (now - lastInterstitial < MIN_GAP_MS) return false;
  lastInterstitial = now;
  try { await impl.interstitial(name); } catch { /* il gioco continua */ }
  return true;
}

/**
 * Rewarded: l'utente lo chiede, sapendo cosa riceve.
 * → true solo se l'annuncio è stato visto per intero.
 */
export async function rewarded(name) {
  try { return await impl.rewarded(name); } catch { return false; }
}

export function timeUntilNextInterstitial() {
  return Math.max(0, MIN_GAP_MS - (Date.now() - lastInterstitial));
}
