/* Un solo posto da toccare dopo l'approvazione AdSense. */

export const AD_CONFIG = {
  // 'ca-pub-XXXXXXXXXXXXXXXX' — lasciare vuoto finché AdSense non approva il sito.
  publisherId: '',
  // suggerimento di frequenza degli interstitial: mai più di uno ogni 90 secondi
  frequencyHint: '90s',
  // il gioco resta giocabile anche se lo script degli annunci non carica
  timeoutMs: 4000,
};

export function isLive() {
  return Boolean(AD_CONFIG.publisherId) && location.protocol.startsWith('http');
}
