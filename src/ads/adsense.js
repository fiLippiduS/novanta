/* Google AdSense H5 Games Ads.
   Formati sbloccati: interstitial e rewarded, che il display normale non ha.
   NOTA: prima di andare in produzione verificare lo snippet corrente sulla
   documentazione AdSense, perché cambia. */

import { AD_CONFIG } from './config.js';

let loaded = false;

function loadScript() {
  if (loaded) return Promise.resolve();
  loaded = true;
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.async = true;
    s.crossOrigin = 'anonymous';
    s.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js'
      + `?client=${AD_CONFIG.publisherId}`;
    s.dataset.adFrequencyHint = AD_CONFIG.frequencyHint;
    s.onload = resolve;
    s.onerror = () => reject(new Error('adsbygoogle non caricato'));
    document.head.appendChild(s);
  });
}

function api() {
  window.adsbygoogle = window.adsbygoogle || [];
  const push = (o) => window.adsbygoogle.push(o);
  return {
    adConfig: push,
    adBreak: push,
  };
}

export const adsenseAds = {
  async init() {
    await loadScript();
    api().adConfig({
      preloadAdBreaks: 'on',
      sound: 'on',
      onReady: () => console.info('[ads] pronto'),
    });
  },

  /** pausa fra due momenti di gioco: mai durante un input */
  interstitial(name) {
    return new Promise((resolve) => {
      let settled = false;
      const finish = () => { if (!settled) { settled = true; resolve(true); } };
      setTimeout(finish, AD_CONFIG.timeoutMs);
      api().adBreak({
        type: 'next',
        name,
        beforeAd: () => {},
        afterAd: finish,
        adBreakDone: finish,
      });
    });
  },

  /** sempre volontario, con il valore dichiarato prima del click */
  rewarded(name) {
    return new Promise((resolve) => {
      let earned = false;
      let settled = false;
      const finish = () => { if (!settled) { settled = true; resolve(earned); } };
      setTimeout(finish, AD_CONFIG.timeoutMs * 6);
      api().adBreak({
        type: 'reward',
        name,
        beforeReward: (showAdFn) => showAdFn(),
        adViewed: () => { earned = true; },
        adDismissed: () => { earned = false; },
        afterAd: finish,
        adBreakDone: finish,
      });
    });
  },

  ready() { return true; },
};
