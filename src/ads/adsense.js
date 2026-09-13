/* Google AdSense H5 Games Ads (Ad Placement API).
   Formati: interstitial fra una partita e l'altra, rewarded solo a richiesta.
   Durata, salto e frequenza reale li decide Google: noi scegliamo solo dove
   un annuncio può comparire, e ci assicuriamo che il gioco non resti mai
   fermo ad aspettarlo. Documentazione:
   https://developers.google.com/ad-placement/apis */

import { AD_CONFIG } from './config.js';
import * as audio from '../core/audio.js';

let loaded = false;

function loadScript() {
  if (loaded) return Promise.resolve();
  loaded = true;
  /* lo script può essere già nella pagina (serve anche per la verifica del sito) */
  if (document.querySelector('script[src*="adsbygoogle.js"]')) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.async = true;
    s.crossOrigin = 'anonymous';
    s.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js'
      + `?client=${AD_CONFIG.publisherId}`;
    s.dataset.adFrequencyHint = AD_CONFIG.frequencyHint;
    if (AD_CONFIG.testMode) s.dataset.adbreakTest = 'on';
    s.onload = resolve;
    s.onerror = () => reject(new Error('adsbygoogle non caricato'));
    document.head.appendChild(s);
  });
}

const push = (o) => { window.adsbygoogle = window.adsbygoogle || []; window.adsbygoogle.push(o); };

/* durante l'annuncio i suoni del gioco tacciono, poi tornano come erano */
function muteGame() { audio.setMuted(true); }
function restoreGame() { audio.setMuted(false); }

/**
 * Un'interruzione. Se Google non risponde entro il tempo previsto e nessun
 * annuncio è partito, si va avanti lo stesso; se l'annuncio è partito, si
 * aspetta che finisca (adBreakDone arriva sempre).
 */
function breakOf(type, name) {
  return new Promise((resolve) => {
    let settled = false;
    let showing = false;
    const finish = () => { if (settled) return; settled = true; restoreGame(); resolve(true); };
    setTimeout(() => { if (!showing) finish(); }, AD_CONFIG.timeoutMs);
    push({
      type,
      name,
      beforeAd: () => { showing = true; muteGame(); },
      afterAd: restoreGame,
      adBreakDone: finish,
    });
  });
}

export const adsenseAds = {
  async init() {
    await loadScript();
    push({
      preloadAdBreaks: 'on',
      sound: audio.isEnabled() ? 'on' : 'off',
      onReady: () => console.info('[ads] pronto'),
    });
  },

  /** pausa fra due momenti di gioco: mai durante un input */
  interstitial(name) {
    return breakOf('next', name);
  },

  /** "Mi arrendo": un annuncio se c'è, poi la risposta in ogni caso */
  breakThen(name) {
    return breakOf('next', name);
  },

  /** sempre volontario, con il premio dichiarato prima del tocco */
  rewarded(name) {
    return new Promise((resolve) => {
      let earned = false;
      let settled = false;
      let offered = false;
      const finish = () => { if (settled) return; settled = true; restoreGame(); resolve(earned); };
      setTimeout(() => { if (!offered) finish(); }, AD_CONFIG.timeoutMs);
      push({
        type: 'reward',
        name,
        beforeReward: (showAdFn) => { offered = true; showAdFn(); },
        beforeAd: muteGame,
        adViewed: () => { earned = true; },
        adDismissed: () => { earned = false; },
        afterAd: restoreGame,
        adBreakDone: finish,
      });
    });
  },

  ready() { return true; },
};
