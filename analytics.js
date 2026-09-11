/* Google Analytics 4, con il consenso davanti.

   Il punto delicato: GA4 usa cookie, quindi in Europa non può partire prima
   che l'utente abbia detto di sì. Qui la modalità consenso parte da "negato"
   su tutto: Google riceve un segnale senza cookie e senza identificatori,
   e passa a raccolta piena solo quando il banner viene accettato.

   Non è un modulo ES: lo caricano anche le pagine statiche, che non usano
   import. Per questo sta fuori da src/. */
(function () {
  /* In sviluppo non si misura niente: le partite di collaudo sporcherebbero
     i numeri veri, e sono tante. */
  if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') return;

  var ID = 'G-HFCC29N242';
  var KEY = 'novanta:consent';

  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  window.gtag = gtag;

  function accettato() {
    try { return localStorage.getItem(KEY) === 'all'; } catch (e) { return false; }
  }

  gtag('consent', 'default', {
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    analytics_storage: 'denied',
    /* mezzo secondo di attesa: se il consenso c'è già, il primo colpo parte
       subito completo invece di partire monco e correggersi dopo */
    wait_for_update: 500,
  });

  function concedi() {
    gtag('consent', 'update', {
      ad_storage: 'granted',
      ad_user_data: 'granted',
      ad_personalization: 'granted',
      analytics_storage: 'granted',
    });
  }

  /* il banner chiama questa quando l'utente accetta */
  window.novantaConsensoConcesso = concedi;

  if (accettato()) concedi();

  gtag('js', new Date());
  gtag('config', ID);

  var s = document.createElement('script');
  s.async = true;
  s.src = 'https://www.googletagmanager.com/gtag/js?id=' + ID;
  document.head.appendChild(s);
}());
