/* Il seguito del tag Google, che nelle pagine è scritto in chiaro.

   Qui resta solo la parte che riguarda il consenso: il tag parte sempre da
   "negato" su tutto, e passa a raccolta piena solo quando l'utente accetta
   il banner. Questo file lo caricano anche le pagine statiche, che non usano
   moduli: per questo sta fuori da src/. */
(function () {
  var KEY = 'novanta:consent';

  function gtag() {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push(arguments);
  }

  function concedi() {
    gtag('consent', 'update', {
      ad_storage: 'granted',
      ad_user_data: 'granted',
      ad_personalization: 'granted',
      analytics_storage: 'granted',
    });
  }

  /* il banner del consenso chiama questa quando l'utente accetta */
  window.novantaConsensoConcesso = concedi;

  try {
    if (localStorage.getItem(KEY) === 'all') concedi();
  } catch (e) { /* niente memoria, niente consenso: si resta negati */ }
}());
