/* Il testo delle pagine. Scritto per chi gioca, non per un motore di ricerca:
   se una frase non serve a nessuno, qui non ci va. */

export const UPDATED = { it: '13 settembre 2026', iso: '2026-09-13' };
const MAIL = '<a href="mailto:ciao@instascope.app">ciao@instascope.app</a>';

export const NAV = [
  ['come-si-gioca', 'Come si gioca'],
  ['faq', 'Domande frequenti'],
  ['chi-siamo', 'Chi siamo'],
  ['dati', 'I dati'],
  ['contatti', 'Contatti'],
  ['privacy', 'Privacy'],
  ['cookie', 'Cookie'],
  ['terms', 'Termini'],
];

const FAQ = [
  ['NOVANTA è gratis?', 'Sì, tutte le modalità sono gratuite e non esistono acquisti dentro il gioco. Il sito si sostiene con la pubblicità, che compare solo fra una partita e l’altra o quando scegli tu di guardare un annuncio per avere un aiuto.'],
  ['Devo registrarmi?', 'No. Non ci sono account, email o password. Record, serie di giorni e preferenze restano salvati nel tuo browser.'],
  ['Perché ho perso i miei record?', 'I record vivono nella memoria del browser. Se cancelli i dati del sito, usi la navigazione privata o cambi dispositivo, si riparte da zero.'],
  ['Si può giocare dal telefono?', 'Sì, il gioco è pensato prima di tutto per il telefono. Dal browser puoi anche aggiungerlo alla schermata Home: si apre a tutto schermo come un’app.'],
  ['Si può giocare in compagnia?', 'Sì. Catena e Impostore si giocano da due a dieci persone con un solo telefono che passa di mano, e l’Asta ha una modalità in due sullo stesso dispositivo.'],
  ['Da dove vengono i dati dei giocatori?', 'Le carriere, le rose delle stagioni e le convocazioni ai tornei vengono da Wikipedia, elaborate e controllate con regole automatiche. I dettagli sono nella pagina <a href="/dati">I dati</a>.'],
  ['Ho trovato un dato sbagliato: cosa faccio?', `Scrivici a ${MAIL} indicando il giocatore e il dato. Correggiamo la fonte, e la correzione vale per tutti.`],
  ['Chi è? accetta i soprannomi?', 'La ricerca suggerisce i giocatori mentre scrivi: basta scegliere quello giusto dall’elenco. Il nome mostrato è quello con cui il giocatore è conosciuto su Wikipedia.'],
  ['Perché in Più o Meno non ci sono pareggi?', 'Il gioco propone una coppia solo quando la differenza fra i due numeri è abbastanza larga da non dipendere dalla fonte. Una domanda ambigua non compare mai.'],
  ['In che lingue è disponibile?', 'Italiano, inglese, spagnolo, francese, tedesco e portoghese. La lingua si cambia dal menu in fondo alla schermata principale.'],
  ['Il gioco funziona senza connessione?', 'Dopo la prima visita molte parti restano disponibili anche se la rete cade a metà partita, ma per caricare nuove rose e nuove carriere serve la connessione.'],
  ['NOVANTA è collegato a club o federazioni?', 'No. NOVANTA è un progetto indipendente, non usa stemmi, foto o marchi ufficiali e non è affiliato a nessun club, lega o federazione.'],
];

export const PAGES = [
  {
    slug: 'come-si-gioca',
    title: 'Come si gioca',
    description: 'Le regole delle nove modalità di NOVANTA: La Rosa, Rigori, Asta, Più o Meno, Carriera, Chi è?, Catena, Impostore e Il Novantesimo.',
    lead: 'Nove modalità, da soli o in compagnia. Nessuna dura più di qualche minuto, a parte la Carriera.',
    priority: '0.8',
    body: `
  <h2 class="display"><a href="/quiz-rosa-squadra">La Rosa</a></h2>
  <p>Ti diamo una squadra e una stagione: un club in un anno preciso oppure una
  nazionale a un Mondiale, a un Europeo o a una Copa América. Hai novanta secondi
  per scrivere più giocatori possibili di quella rosa. Basta il cognome, gli accenti
  non contano e qualche refuso viene perdonato.</p>
  <p>Le rose sono quasi duemila e vengono estratte a caso, così la stessa squadra
  torna in stagioni diverse. Quando il tempo finisce, i nomi che ti sono sfuggiti
  compaiono nella griglia e restano lì finché non decidi di vedere il risultato.</p>

  <h2 class="display"><a href="/gioco-rigori">Rigori</a></h2>
  <p>Un tiro alla volta contro un portiere che impara da te. Il primo tocco ferma
  la mira, il secondo la potenza, il terzo dà l’effetto. Palo e traversa si sentono
  e si vedono: la palla rimbalza sul legno e torna in campo. Sbagli una volta e la
  serie finisce.</p>

  <h2 class="display"><a href="/asta-calcio">Asta</a></h2>
  <p>Venti crediti per comprare cinque giocatori: un portiere, due difensori, un
  centrocampista e un attaccante. I giocatori passano uno alla volta, pescati a
  caso fra campioni e comprimari: in un ruolo possono capitare due fuoriclasse da
  contendersi o due riserve, e spendere tutto sul primo nome si paga. Poi le due squadre si affrontano in una partita simulata.</p>
  <p>Si gioca contro l’avversario del computer oppure in due sullo stesso telefono,
  ognuno con il proprio nome, passandosi il dispositivo a ogni rilancio.</p>

  <h2 class="display"><a href="/piu-o-meno-calcio">Più o Meno</a></h2>
  <p>Due giocatori e un dato: gol, presenze in campionato, presenze in nazionale,
  trofei, prestiti, anni da professionista, altezza e altro. Tocchi quello che ne
  ha di più. Chi vince resta e affronta il prossimo; al primo errore la catena si
  spezza.</p>

  <h2 class="display"><a href="/carriera-calciatore">Carriera</a></h2>
  <p>Crei il tuo giocatore: nome, ruolo sul campo, stile, idolo d’infanzia, numero
  di maglia e nazionalità. Si comincia a sedici anni in una squadra piccola.</p>
  <p>Si avanza di due stagioni alla volta. Ogni volta scegli su quale dote lavorare
  (più anni sulla stessa, più cresce) e prendi tre decisioni legate al tuo ruolo, alla tua vita fuori dal campo e, se
  arriva la chiamata, alla nazionale. Le statistiche rispettano il ruolo: un portiere
  conta porte inviolate e rigori parati, un difensore contrasti e duelli aerei, un
  attaccante gol e assist. Le coppe europee si giocano solo se la classifica
  dell’anno prima le ha conquistate, gli infortuni tolgono davvero partite, e la
  carriera finisce quando il fisico lo dice. Due carriere non sono mai uguali.</p>

  <h2 class="display"><a href="/indovina-il-calciatore">Chi è?</a></h2>
  <p>Vedi la scheda di un calciatore vero, come quella di Wikipedia, ma senza il
  nome: ruolo, altezza, squadre giovanili e da professionista con presenze e gol,
  nazionale e palmarès in ordine di tempo. Scrivi nella barra di ricerca, scegli
  dall’elenco e hai cinque vite. Ogni tentativo sbagliato ti dice se il giocatore
  che hai scelto ha la stessa nazionalità, lo stesso ruolo, se è nato prima o dopo
  e quali squadre ha in comune. Puoi anche arrenderti e vedere la risposta.</p>

  <h2 class="display"><a href="/catena-calciatori">Catena</a></h2>
  <p>Parte una squadra: scrivi un giocatore che ci ha giocato almeno una partita.
  Poi scrivi un’altra squadra di quel giocatore, poi un altro giocatore di quella
  squadra, e così via. Nessun nome e nessuna squadra si ripetono, e ogni mossa ha
  quaranta secondi. Da soli si cerca il record; da due a dieci giocatori ci si
  passa il telefono e chi resta senza risposta è eliminato.</p>

  <h2 class="display"><a href="/impostore-calcio">Impostore</a></h2>
  <p>Da tre a dieci persone, un solo telefono. A turno ognuno scopre il proprio
  ruolo: tutti vedono lo stesso calciatore, tranne l’impostore, che riceve solo un
  indizio vago. Poi, in un ordine estratto a caso, ognuno dice una parola sul
  giocatore. Si può passare o andare al voto: se il gruppo espelle un innocente la
  partita continua, se espelle l’impostore vincono gli altri.</p>

  <h2 class="display"><a href="/quiz-calcio-giornaliero">Il Novantesimo</a></h2>
  <p>Cinque domande, le stesse per tutti, che cambiano ogni giorno a mezzanotte.
  Si gioca una volta al giorno e il risultato si condivide come una griglia di
  quadretti, senza rovinare la sfida a chi deve ancora giocarla.</p>

  <h2 class="display">Punteggi e annunci</h2>
  <p>Ogni modalità tiene il suo record nel tuo browser. Gli annunci non compaiono
  mai durante una partita: solo fra una partita e l’altra, e mai nei primi minuti
  di una visita. Alcuni aiuti (un suggerimento, trenta secondi in più, un’altra
  chance) si ottengono guardando un annuncio, sempre per scelta tua.</p>`,
  },
  {
    slug: 'faq',
    title: 'Domande frequenti',
    description: 'Risposte alle domande più comuni su NOVANTA: costi, account, record, dati dei giocatori, lingue e gioco in compagnia.',
    lead: 'Le domande che ci arrivano più spesso, con le risposte brevi.',
    priority: '0.6',
    jsonld: {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: FAQ.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a.replace(/<[^>]+>/g, '') } })),
    },
    body: FAQ.map(([q, a]) => `  <details>\n    <summary>${q}</summary>\n    <p>${a}</p>\n  </details>`).join('\n'),
  },
  {
    slug: 'chi-siamo',
    title: 'Chi siamo',
    description: 'NOVANTA è un gioco di calcio indipendente, gratuito e senza account, fatto da appassionati per chi ricorda i giocatori, le rose e le stagioni.',
    lead: 'Un gioco piccolo, fatto con cura, per chi il calcio se lo ricorda.',
    priority: '0.5',
    body: `
  <h2 class="display">Perché esiste</h2>
  <p>NOVANTA nasce da una domanda che fra amici torna sempre: “ti ricordi chi
  giocava in quella squadra?”. Volevamo un posto dove quella domanda diventasse
  una sfida di pochi minuti, da fare da soli sul divano o in compagnia passandosi
  il telefono, senza scaricare niente e senza creare un account.</p>

  <h2 class="display">Come lavoriamo</h2>
  <ul>
    <li><strong>Dati controllati.</strong> Le carriere e le rose vengono da fonti
    pubbliche e passano per controlli automatici prima di entrare nel gioco. Quando
    un dato non è certo, preferiamo toglierlo che mostrarlo sbagliato.</li>
    <li><strong>Domande oneste.</strong> Nessuna modalità ti chiede qualcosa che
    dipende da un dettaglio discutibile.</li>
    <li><strong>Pubblicità misurata.</strong> Mai durante una partita, mai appena
    arrivi, e gli annunci con premio li scegli tu.</li>
    <li><strong>Niente dati personali.</strong> I tuoi record restano nel tuo
    browser. Non sappiamo chi sei e non ci serve saperlo.</li>
  </ul>

  <h2 class="display">Indipendenti</h2>
  <p>NOVANTA non è affiliato a nessun club, lega, federazione o sponsor. Non usiamo
  stemmi, maglie ufficiali, fotografie o marchi registrati: solo i nomi, che sono
  fatti, e colori disegnati da noi.</p>

  <h2 class="display">Scrivici</h2>
  <p>Idee per nuove modalità, squadre che mancano, dati da correggere: ${MAIL}.</p>`,
  },
  {
    slug: 'contatti',
    title: 'Contatti',
    description: 'Come contattare NOVANTA per segnalare un errore nei dati, proporre una modalità o chiedere informazioni su privacy e pubblicità.',
    lead: 'Leggiamo tutto quello che arriva.',
    priority: '0.5',
    body: `
  <h2 class="display">Email</h2>
  <p>Scrivi a ${MAIL}. Rispondiamo di solito entro qualche giorno lavorativo.</p>

  <h2 class="display">Per aiutarci a rispondere prima</h2>
  <ul>
    <li><strong>Un dato sbagliato:</strong> indica la modalità, il giocatore o la
    squadra, il dato che vedi e quello corretto, se possibile con una fonte.</li>
    <li><strong>Un problema tecnico:</strong> indica il dispositivo, il browser e
    cosa stavi facendo quando è successo.</li>
    <li><strong>Privacy e dati personali:</strong> scrivi “Privacy” nell’oggetto.
    Trovi i dettagli nell’<a href="/privacy">informativa privacy</a>.</li>
    <li><strong>Pubblicità e collaborazioni:</strong> scrivi “Collaborazioni”
    nell’oggetto.</li>
  </ul>

  <h2 class="display">Cosa non ti chiederemo mai</h2>
  <p>Password, dati di pagamento o documenti. Se ricevi un messaggio che si
  presenta come NOVANTA e te li chiede, non è nostro.</p>`,
  },
  {
    slug: 'dati',
    title: 'I dati',
    h1: 'Da dove vengono i dati',
    description: 'Da dove vengono le carriere, le rose e le statistiche di NOVANTA, come vengono controllate e come segnalare un errore.',
    lead: 'Una pagina che quasi nessun gioco scrive, e che invece serve.',
    priority: '0.6',
    body: `
  <h2 class="display">La fonte: Wikipedia</h2>
  <p>Le carriere dei calciatori (squadre, anni, presenze e gol in campionato,
  nazionale, altezza, ruolo, palmarès), le rose delle stagioni dei club e le
  convocazioni ai Mondiali, agli Europei e alla Copa América vengono dalle pagine
  di <a href="https://en.wikipedia.org" rel="noopener">Wikipedia</a>, lette
  attraverso la sua interfaccia pubblica. I testi di Wikipedia sono disponibili con
  licenza <a href="https://creativecommons.org/licenses/by-sa/4.0/deed.it" rel="noopener">Creative
  Commons Attribuzione – Condividi allo stesso modo 4.0</a>; ringraziamo le
  migliaia di volontari che li scrivono. Nella modalità Chi è? ogni scheda porta
  al link della pagina originale.</p>

  <h2 class="display">I controlli</h2>
  <ul>
    <li>Un giocatore entra nel catalogo solo se la sua pagina ha una scheda
    completa e leggibile; anni impossibili o numeri incoerenti la escludono.</li>
    <li>Quando un totale non è riportato (per esempio i gol in nazionale), il gioco
    non lo inventa: quel dato semplicemente non viene usato.</li>
    <li>Le rose con meno di diciotto giocatori o con nomi ripetuti vengono scartate.</li>
    <li>I dati si aggiornano periodicamente: per i giocatori in attività i numeri
    sono quelli dell’ultimo aggiornamento, non quelli di stasera.</li>
  </ul>

  <h2 class="display">Più o Meno e lo scarto</h2>
  <p>Una manciata di unità di differenza fra una fonte e l’altra è normale: dipende
  da quali coppe si contano e da quali amichevoli. Per questo il gioco non ti chiede
  mai quanto vale un dato, ma solo quale dei due è più alto, e propone una coppia
  soltanto quando la distanza è abbastanza larga da non dipendere dalla fonte. I
  numeri di campionato presi da Wikipedia non vengono mai confrontati con i totali
  di tutte le competizioni.</p>

  <h2 class="display">La Carriera è un gioco</h2>
  <p>Le squadre della Carriera sono reali, ma le stagioni, i trofei e gli eventi
  sono simulati: non descrivono fatti accaduti.</p>

  <h2 class="display">Nomi, colori e stemmi</h2>
  <p>Usiamo i nomi dei giocatori e delle squadre, che sono fatti, e colori sociali
  resi con forme nostre. Non usiamo stemmi, fotografie, maglie ufficiali né marchi
  registrati. NOVANTA non è affiliato a nessun club, lega o federazione.</p>

  <h2 class="display">Hai trovato un errore?</h2>
  <p>Scrivici a ${MAIL}: correggiamo il dato e la correzione vale per tutti quelli
  che giocano dopo di te.</p>`,
  },
  {
    slug: 'privacy',
    title: 'Informativa privacy',
    description: 'Come NOVANTA tratta i dati: nessun account, record salvati nel browser, pubblicità e statistiche Google solo con il tuo consenso.',
    lead: `Ultimo aggiornamento: ${UPDATED.it}.`,
    changefreq: 'yearly',
    priority: '0.4',
    body: `
  <h2 class="display">Chi è il titolare</h2>
  <p>Il sito instascope.app e il gioco NOVANTA sono gestiti da chi lo pubblica,
  raggiungibile all’indirizzo ${MAIL} per qualsiasi richiesta sui dati.</p>

  <h2 class="display">Cosa salviamo sul tuo dispositivo</h2>
  <p>Record, serie di giorni, la carriera in corso, i nomi dei partecipanti delle
  partite in compagnia e le preferenze di lingua e audio restano nella memoria
  locale del tuo browser. Non lasciano il tuo dispositivo e non arrivano a noi. Se
  cancelli i dati del sito, spariscono.</p>

  <h2 class="display">Account</h2>
  <p>Non ci sono account. Non chiediamo email, nome o password. I nomi che scrivi
  nelle modalità in compagnia servono solo sul tuo telefono.</p>

  <h2 class="display">Pubblicità</h2>
  <p>Il gioco è gratuito perché mostra pubblicità di Google (AdSense). Se
  acconsenti, Google e i suoi partner possono usare cookie e identificatori per
  selezionare e misurare gli annunci. Il consenso viene raccolto da una
  piattaforma certificata IAB TCF fornita da Google, che mostra anche l’elenco
  completo dei partner. Se rifiuti, puoi vedere annunci non personalizzati, che
  usano solo informazioni di contesto. Come Google usa i dati è spiegato in
  <a href="https://policies.google.com/technologies/partner-sites" rel="noopener">questa pagina di Google</a>.</p>

  <h2 class="display">Statistiche di traffico</h2>
  <p>Usiamo Google Analytics per sapere quante partite partono e quali modalità
  vengono giocate. Finché non accetti, lo strumento parte in modalità di consenso
  negato: nessun cookie di analisi viene salvato e arrivano solo segnali aggregati.
  Se accetti, Analytics usa un cookie per riconoscere le visite dello stesso browser.</p>

  <h2 class="display">Base giuridica e durata</h2>
  <p>Cookie pubblicitari e di analisi si usano solo con il tuo consenso, che puoi
  revocare quando vuoi. I dati salvati nel browser restano finché non li cancelli.
  I dettagli su ogni cookie sono nella pagina <a href="/cookie">Cookie</a>.</p>

  <h2 class="display">I tuoi diritti</h2>
  <p>Puoi chiedere accesso, rettifica, cancellazione, limitazione o opposizione al
  trattamento scrivendo a ${MAIL}, e hai diritto di reclamo al Garante per la
  protezione dei dati personali. Poiché non conosciamo la tua identità, spesso il
  modo più rapido è cancellare i dati del sito dal tuo browser.</p>

  <h2 class="display">Bambini</h2>
  <p>Il gioco non è rivolto a minori di tredici anni e non raccoglie consapevolmente
  dati che li riguardino.</p>

  <h2 class="display">Modifiche</h2>
  <p>Se questa informativa cambia, la data in alto viene aggiornata.</p>`,
  },
  {
    slug: 'cookie',
    title: 'Cookie',
    h1: 'Cookie e memoria locale',
    description: 'Quali cookie e dati di memoria locale usa NOVANTA, a cosa servono, quanto durano e come cambiare il consenso.',
    lead: `Ultimo aggiornamento: ${UPDATED.it}.`,
    changefreq: 'yearly',
    priority: '0.4',
    body: `
  <h2 class="display">In breve</h2>
  <p>Il gioco funziona senza cookie. Quelli di Google per pubblicità e statistiche
  vengono usati solo se accetti nel banner del consenso.</p>

  <h2 class="display">Tecnici, sempre attivi</h2>
  <table>
    <tr><th>Nome</th><th>Tipo</th><th>A cosa serve</th><th>Durata</th></tr>
    <tr><td>novanta:v1</td><td>memoria locale</td><td>record, carriera, lingua, audio, nomi dei partecipanti</td><td>finché non la cancelli</td></tr>
    <tr><td>novanta:consent</td><td>memoria locale</td><td>ricordare la tua scelta sul consenso</td><td>finché non la cancelli</td></tr>
  </table>

  <h2 class="display">Statistiche, solo con consenso</h2>
  <table>
    <tr><th>Nome</th><th>Fornitore</th><th>A cosa serve</th><th>Durata</th></tr>
    <tr><td>_ga, _ga_*</td><td>Google Analytics</td><td>distinguere le visite in forma statistica</td><td>fino a 2 anni</td></tr>
  </table>

  <h2 class="display">Pubblicità, solo con consenso</h2>
  <p>Google AdSense e i partner certificati IAB possono impostare cookie come
  <em>__gads</em>, <em>__gpi</em>, <em>IDE</em> e <em>NID</em> per mostrare e
  misurare gli annunci e limitarne la ripetizione. L’elenco aggiornato dei partner e
  le loro finalità sono visibili nel pannello del consenso.</p>

  <h2 class="display">Cambiare idea</h2>
  <p>Puoi riaprire il pannello del consenso dal banner oppure cancellare i dati del
  sito dalle impostazioni del browser: al prossimo accesso la scelta ti verrà
  chiesta di nuovo. Puoi anche bloccare i cookie di terze parti dal browser; il
  gioco continuerà a funzionare.</p>`,
  },
  {
    slug: 'terms',
    title: 'Termini di servizio',
    description: 'Le condizioni d’uso di NOVANTA: gioco gratuito, contenuti, uso corretto, pubblicità e limitazioni di responsabilità.',
    lead: `Ultimo aggiornamento: ${UPDATED.it}.`,
    changefreq: 'yearly',
    priority: '0.3',
    body: `
  <h2 class="display">Il gioco</h2>
  <p>NOVANTA è un gioco gratuito. Lo offriamo così com’è, senza garanzie di
  funzionamento ininterrotto o privo di errori. Possiamo aggiungere, cambiare o
  togliere modalità in qualsiasi momento.</p>

  <h2 class="display">Contenuti e dati</h2>
  <p>I dati sui calciatori provengono da Wikipedia (licenza CC BY-SA 4.0) e da
  fonti pubbliche, con i limiti descritti nella pagina <a href="/dati">I dati</a>.
  Le stagioni della Carriera sono simulate e non descrivono fatti reali. Non usiamo
  fotografie, stemmi, maglie o altri marchi di club, leghe o federazioni, e il
  gioco non è affiliato ad alcuna squadra o competizione.</p>

  <h2 class="display">Uso corretto</h2>
  <p>Puoi giocare quanto vuoi. Non puoi automatizzare il gioco, alterarne il
  funzionamento, interferire con la pubblicità o rivendere i contenuti.</p>

  <h2 class="display">Pubblicità</h2>
  <p>Il gioco mostra annunci di terze parti. Non siamo responsabili dei prodotti o
  dei siti pubblicizzati.</p>

  <h2 class="display">Responsabilità</h2>
  <p>Nei limiti consentiti dalla legge, non rispondiamo di danni derivanti dall’uso
  del sito o dall’impossibilità di usarlo, compresa la perdita dei record salvati
  nel browser.</p>

  <h2 class="display">Modifiche</h2>
  <p>Possiamo cambiare questi termini. La versione valida è quella pubblicata su
  questa pagina, con la data in alto.</p>`,
  },
];
