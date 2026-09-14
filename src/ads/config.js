/* Un solo posto da toccare dopo l'approvazione AdSense. */

export const AD_CONFIG = {
  // 'ca-pub-XXXXXXXXXXXXXXXX' — lasciare vuoto finché AdSense non approva il sito.
  publisherId: 'ca-pub-9665914988223658',
  // true solo per provare gli annunci di prova di Google prima del lancio
  testMode: false,
  // suggerimento di frequenza per gli interstitial di H5 Games Ads
  frequencyHint: '90s',
  // il gioco resta giocabile anche se lo script degli annunci non carica
  timeoutMs: 4000,

  /* Regole di equilibrio, scritte qui perché sono una scelta e non un dettaglio:
     - i primi due minuti di una visita sono del gioco, mai di un annuncio;
     - fra due interstitial passano almeno novanta secondi;
     - un annuncio non compare mai a partita in corso, solo fra una e l'altra. */
  warmupMs: 120_000,
  minGapMs: 90_000,

  /* Unità display create nel pannello AdSense (Annunci > Per unità annuncio).
     Finché sono vuote, in produzione non compare nessun riquadro vuoto. */
  slots: {
    hub: '',      // in fondo alla schermata principale, sotto le modalità
    page: '',     // nelle pagine di testo: regole, FAQ, dati
  },
};

export function isLive() {
  /* in sviluppo restano gli annunci simulati: niente traffico finto su AdSense */
  const local = ['localhost', '127.0.0.1'].includes(location.hostname);
  return Boolean(AD_CONFIG.publisherId) && location.protocol.startsWith('http') && !local;
}
