/* Una pagina vera per ogni modalità. Il gioco vive dentro l'app (indirizzi
   con #), che i motori di ricerca non considerano pagine: queste sono le porte
   d'ingresso che chi cerca "indovina il calciatore" può trovare. Il testo
   spiega davvero il gioco; il pulsante porta dritto alla partita. */

const SITE = 'https://instascope.app';

function jsonld(page) {
  const game = {
    '@type': 'WebApplication',
    name: `${page.name} — NOVANTA`,
    url: `${SITE}/${page.slug}`,
    description: page.description,
    applicationCategory: 'GameApplication',
    genre: 'Quiz di calcio',
    operatingSystem: 'Web',
    inLanguage: ['it', 'en', 'es', 'fr', 'de', 'pt'],
    isAccessibleForFree: true,
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR' },
  };
  const faq = {
    '@type': 'FAQPage',
    mainEntity: page.faq.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })),
  };
  return { '@context': 'https://schema.org', '@graph': [game, faq] };
}

const faqHtml = (faq) => `
  <h2 class="display">Domande</h2>
${faq.map(([q, a]) => `  <details>\n    <summary>${q}</summary>\n    <p>${a}</p>\n  </details>`).join('\n')}`;

const RAW = [
  {
    slug: 'indovina-il-calciatore', route: 'chi', name: 'Chi è?',
    title: 'Indovina il calciatore dalla carriera',
    description: 'Quiz di calcio gratuito: indovina il calciatore guardando solo la sua carriera, squadre, presenze, gol e trofei. Cinque tentativi, oltre diecimila giocatori.',
    lead: 'Una carriera vera, riga per riga, senza il nome. Hai cinque tentativi per capire di chi si tratta.',
    body: `
  <h2 class="display">Come si gioca</h2>
  <p>Ti mostriamo la scheda di un calciatore esistente, come quella delle
  enciclopedie: ruolo, nazionalità, altezza, squadre giovanili, tutte le squadre
  da professionista con anni, presenze e gol in campionato, la nazionale e il
  palmarès in ordine di tempo. Manca solo il nome.</p>
  <p>Scrivi nella barra di ricerca: mentre digiti compaiono i giocatori che
  corrispondono, scegli quello che pensi sia giusto. Hai cinque vite.</p>

  <h2 class="display">Gli indizi dopo ogni errore</h2>
  <ul>
    <li>se il giocatore che hai scelto ha la <strong>stessa nazionalità</strong>;</li>
    <li>se gioca nello <strong>stesso ruolo</strong>;</li>
    <li>se è <strong>nato prima o dopo</strong>;</li>
    <li>quante e quali <strong>squadre hanno in comune</strong>, evidenziate nella scheda.</li>
  </ul>
  <p>Quando restano due vite compare anche l’anno di nascita. Se proprio non lo
  sai, puoi arrenderti e vedere la risposta, con il link alla voce completa.</p>

  <h2 class="display">Quattro livelli</h2>
  <p>Facile propone i campioni che conoscono tutti, Media e Difficile scendono
  verso giocatori meno celebri, Esperto usa l’intero catalogo di oltre diecimila
  calciatori: dalla Serie A alla Premier League, dalla Liga alla MLS, dagli anni
  Settanta a oggi, con i trasferimenti aggiornati.</p>`,
    faq: [
      ['Quanti calciatori ci sono?', 'Oltre diecimila, dai fuoriclasse ai giocatori di campionati meno seguiti, con le carriere tratte da Wikipedia.'],
      ['Le squadre sono aggiornate?', 'Sì, le carriere vengono aggiornate periodicamente con i trasferimenti più recenti.'],
      ['Si può giocare dal telefono?', 'Sì, il gioco è pensato prima di tutto per il telefono e non serve scaricare niente.'],
    ],
  },
  {
    slug: 'catena-calciatori', route: 'catena', name: 'Catena',
    title: 'Catena dei calciatori: squadra, giocatore, squadra',
    description: 'Gioco di calcio da soli o in gruppo: collega squadre e giocatori che ci hanno giocato, senza ripetere nessuno, con quaranta secondi a mossa. Fino a dieci giocatori su un telefono.',
    lead: 'Parte una squadra. Tu scrivi un giocatore che ci ha giocato, poi un’altra sua squadra, e la catena va avanti.',
    body: `
  <h2 class="display">Come si gioca</h2>
  <p>Compare una squadra con il suo nome e i suoi colori. Devi scrivere un
  calciatore che ci abbia giocato anche una sola partita. Se è giusto, il
  giocatore entra al centro e ora serve un’altra squadra della sua carriera. Poi
  un altro giocatore di quella squadra, e così via.</p>
  <ul>
    <li><strong>Quaranta secondi</strong> per ogni mossa, e una risposta sbagliata ne toglie cinque;</li>
    <li>nessuna squadra e nessun giocatore possono <strong>ripetersi</strong>;</li>
    <li>se una squadra o un giocatore non hanno più collegamenti possibili, la catena si chiude.</li>
  </ul>

  <h2 class="display">Da soli o in compagnia</h2>
  <p>Da soli si cerca il record di anelli. In gruppo si gioca da due a dieci
  persone con un solo telefono: si scrivono i nomi, il gioco dice di chi è il
  turno e chi viene dopo, e il telefono passa di mano. Chi resta senza risposta
  allo scadere del tempo è eliminato, e vince l’ultimo rimasto.</p>

  <h2 class="display">Un catalogo enorme</h2>
  <p>Oltre diecimila calciatori e più di diecimila squadre: dalle grandi europee
  alle serie minori, dal Sudamerica all’Arabia Saudita. Più calcio conosci, più
  lunga diventa la catena.</p>`,
    faq: [
      ['Serve un’app o un account?', 'No, si gioca dal browser del telefono o del computer, gratis e senza registrazione.'],
      ['Quante persone possono giocare insieme?', 'Da due a dieci, passandosi lo stesso telefono.'],
      ['Vale anche una sola presenza?', 'Sì, basta che il giocatore abbia giocato almeno una partita con quella squadra.'],
    ],
  },
  {
    slug: 'impostore-calcio', route: 'impostore', name: 'Impostore',
    title: 'Impostore: il gioco di gruppo sul calcio',
    description: 'Gioco di società a tema calcio per tre a dieci persone con un solo telefono: tutti conoscono il calciatore segreto tranne l’impostore. Una parola a testa, poi si vota.',
    lead: 'Tutti vedono lo stesso calciatore, tranne uno. Una parola a testa, e poi si vota chi sta bluffando.',
    body: `
  <h2 class="display">Come si gioca</h2>
  <ol>
    <li>Scrivete i nomi, da tre a dieci persone.</li>
    <li>Il telefono passa di mano: ognuno scopre in segreto il proprio ruolo.
    Gli innocenti vedono il nome del calciatore, l’impostore riceve solo un
    indizio vago in rosso, come “anni ’90” o “difesa”.</li>
    <li>In un ordine estratto a caso, ognuno dice una sola parola sul
    calciatore. Chi non vuole esporsi può passare.</li>
    <li>Quando siete pronti, votate chi espellere.</li>
  </ol>

  <h2 class="display">Chi vince</h2>
  <p>Se il gruppo espelle l’impostore, vincono gli innocenti. Se espelle un
  innocente, il gioco lo annuncia e si continua a parlare con chi resta. Se
  rimangono in due, vince l’impostore. A ogni nuovo round cambiano calciatore,
  impostore e ordine dei turni, e una classifica tiene i punti della serata.</p>

  <h2 class="display">Perché funziona</h2>
  <p>Gli innocenti devono farsi riconoscere senza rivelare troppo, l’impostore
  deve capire il giocatore dalle parole degli altri e confondersi tra loro. Con
  la scelta tra soli calciatori famosi o anche meno noti, va bene sia per chi
  segue poco il calcio sia per gli esperti.</p>`,
    faq: [
      ['Quanti giocatori servono?', 'Almeno tre, fino a dieci, con un solo telefono.'],
      ['C’è un limite di tempo?', 'No, la discussione dura quanto volete; si vota quando il gruppo è pronto.'],
      ['È gratis?', 'Sì, completamente gratis e senza registrazione.'],
    ],
  },
  {
    slug: 'carriera-calciatore', route: 'carriera', name: 'Carriera',
    title: 'Carriera da calciatore: il gioco dai 16 anni al ritiro',
    description: 'Simulatore gratuito di carriera da calciatore: scegli ruolo, stile, idolo e nazione, allenati, prendi decisioni e vinci campionati, coppe europee e Pallone d’Oro. Ogni carriera è diversa.',
    lead: 'Sedici anni, una squadra piccola e vent’anni di calcio davanti. Ogni scelta cambia la tua storia.',
    body: `
  <h2 class="display">Crea il tuo giocatore</h2>
  <p>Scegli nome, ruolo toccando la posizione nel 4-3-3, stile di gioco, idolo
  d’infanzia, numero di maglia e nazionalità. Ogni ruolo ha le sue doti: un
  portiere allena riflessi, presa e uscite, un centravanti finalizzazione, colpo
  di testa e posizione.</p>

  <h2 class="display">Due stagioni per turno</h2>
  <p>A ogni turno scegli su quale dote lavorare e prendi tre decisioni tra
  centosettantotto situazioni diverse: allenatori, procuratori, infortuni,
  derby, offerte dall’estero, la nazionale. Poi si giocano due stagioni e si apre
  il mercato.</p>
  <ul>
    <li>Le <strong>statistiche seguono il ruolo</strong>: porte inviolate e rigori parati per il portiere, gol, assist e numeri chiave per gli altri.</li>
    <li>Le <strong>coppe europee</strong> si giocano solo se la classifica le ha conquistate.</li>
    <li>Gli <strong>infortuni</strong> tolgono davvero partite, e il ritiro arriva quando l’età lo impone.</li>
    <li>Chi viene da una delle dieci nazionali più forti può essere chiamato per Mondiali, Europei, Copa América e Nations League.</li>
  </ul>

  <h2 class="display">Una bacheca tutta tua</h2>
  <p>Campionati, coppe nazionali, Champions League, Europa League, Conference
  League, Mondiale per club, capocannoniere, Golden Boy, fino al Pallone d’Oro.
  Due carriere non sono mai uguali, anche partendo dalle stesse scelte.</p>`,
    faq: [
      ['La carriera si salva?', 'Sì, resta salvata nel browser e puoi riprenderla quando vuoi.'],
      ['Quanto dura una carriera?', 'Una dozzina di turni da due stagioni, di solito una ventina di minuti.'],
      ['Le squadre sono reali?', 'Le squadre sì; stagioni, trofei ed eventi sono simulati.'],
    ],
  },
  {
    slug: 'allenatore-calcio', route: 'allenatore', name: 'Allenatore',
    title: 'Allenatore di calcio: la carriera in panchina con le rose vere',
    description: 'Gioco manageriale di calcio gratuito: guida un club vero di dieci campionati, gioca le partite minuto per minuto, tratta sul mercato, fai crescere i giovani e tieni la panchina. Dal telefono, senza scaricare niente.',
    lead: 'Un club vero, una rosa vera, una stagione intera. La società ti giudica ogni settimana.',
    body: `
  <h2 class="display">Scegli la tua panchina</h2>
  <p>Centonovantotto club di Serie A, Serie B, Premier League, Championship,
  Liga, Segunda, Bundesliga, 2. Bundesliga, Ligue 1 e Ligue 2, con più di
  seimila giocatori delle rose di oggi, titolari e panchina. Scegli nome,
  nazionalità e uno dei dodici stili di gioco: tiki-taka, gegenpressing,
  contropiede, catenaccio e gli altri. La società ti dà un obiettivo
  proporzionato alla squadra.</p>

  <h2 class="display">Partite minuto per minuto</h2>
  <p>Ogni partita è simulata azione per azione, con modulo, mentalità, fatica,
  cartellini, infortuni, rigori e VAR. Nei momenti che cambiano un risultato,
  come un gol subito, un’espulsione o gli ultimi dieci minuti in vantaggio,
  tocca a te decidere: nessuna scelta è sempre giusta. Dopo ogni giornata la
  classifica si aggiorna con tutti i risultati.</p>

  <h2 class="display">Mercato a trattative</h2>
  <ul>
    <li>Il <strong>club</strong> chiede un prezzo, risponde ai rilanci e perde la pazienza; a volte si inserisce una rivale.</li>
    <li>Il <strong>giocatore e il procuratore</strong> discutono ingaggio, anni, ruolo promesso e commissione.</li>
    <li>Le <strong>visite mediche</strong> possono far saltare l’affare all’ultimo momento.</li>
    <li>Gli altri club comprano e vendono davvero, e le offerte per i tuoi giocatori si possono rilanciare.</li>
  </ul>

  <h2 class="display">Giocatori che crescono e invecchiano</h2>
  <p>Ogni giocatore ha un potenziale realistico: i giovani di talento possono
  diventare campioni se giocano, chi è al massimo resta lì, chi è avanti con
  gli anni cala. Gol, assist, porte inviolate, contrasti e recuperi spostano il
  voto, e così le tue decisioni su di loro.</p>

  <h2 class="display">Più di quattrocento decisioni</h2>
  <p>Spogliatoio, stampa, dirigenza, tifosi, infortuni, vivaio, derby e vita
  privata: centinaia di situazioni con conseguenze che arrivano anche settimane
  dopo. Coppe nazionali ed europee, promozioni, retrocessioni, esoneri e
  offerte da altri club completano la carriera.</p>`,
    faq: [
      ['Le rose sono reali?', 'Sì, i giocatori sono quelli delle rose attuali dei dieci campionati; partite, trasferimenti ed eventi sono simulati.'],
      ['Si può essere esonerati?', 'Sì: se i risultati sono lontani dall’obiettivo arriva un ultimatum e poi l’esonero, ma altri club possono offrirti una panchina.'],
      ['La carriera si salva?', 'Sì, resta salvata nel browser e riprende dalla giornata in cui l’hai lasciata.'],
    ],
  },
  {
    slug: 'quiz-rosa-squadra', route: 'squad', name: 'La Rosa',
    title: 'Quiz sulla rosa: nomina i giocatori della squadra',
    description: 'Quiz di calcio: hai novanta secondi per nominare più giocatori possibili della rosa di un club in una stagione o di una nazionale a Mondiali, Europei e Copa América. Quasi duemila rose.',
    lead: 'Una squadra, una stagione, novanta secondi. Quanti giocatori di quella rosa ti ricordi davvero?',
    body: `
  <h2 class="display">Come si gioca</h2>
  <p>Ti diamo una rosa: un club in una stagione precisa, come il Milan 2006/07,
  oppure una nazionale a un grande torneo, come l’Italia ai Mondiali 2006. Scrivi
  i nomi dei giocatori: basta il cognome, gli accenti non contano e i piccoli
  errori di battitura vengono perdonati.</p>
  <p>Quando il tempo finisce, i giocatori che non hai nominato compaiono nella
  griglia e restano visibili: puoi guardarli con calma prima di vedere il
  risultato.</p>

  <h2 class="display">Quasi duemila rose</h2>
  <p>Club di Serie A, Premier League, Liga, Bundesliga, Ligue 1 e altri
  campionati, stagione per stagione dagli anni Novanta a oggi, più le nazionali
  di Mondiali, Europei e Copa América. Le rose vengono estratte a caso, così la
  stessa squadra torna in anni diversi.</p>

  <h2 class="display">Aiuti</h2>
  <p>Nell’ultimo terzo della partita puoi chiedere le iniziali di un giocatore
  mancante, e a tempo scaduto trenta secondi in più: entrambi guardando un breve
  annuncio, sempre per scelta tua.</p>`,
    faq: [
      ['Devo scrivere nome e cognome?', 'No, basta il cognome o il nome con cui il giocatore è conosciuto.'],
      ['Quali squadre ci sono?', 'Quasi duemila rose di club e nazionali, estratte a caso a ogni partita.'],
      ['Il record si salva?', 'Sì, il miglior punteggio resta salvato nel browser.'],
    ],
  },
  {
    slug: 'gioco-rigori', route: 'arcade', name: 'Rigori',
    title: 'Gioco dei rigori online contro un portiere che impara',
    description: 'Gioco di rigori gratuito nel browser: mira, potenza ed effetto contro un portiere che studia i tuoi tiri. Palo e traversa, una vita sola, record da battere.',
    lead: 'Un tiro alla volta, una vita sola, e un portiere che impara dove tiri.',
    body: `
  <h2 class="display">Tre tocchi per tirare</h2>
  <ol>
    <li>il primo ferma la <strong>mira</strong>, che scorre da un palo all’altro;</li>
    <li>il secondo ferma la <strong>potenza</strong>, cioè l’altezza del tiro;</li>
    <li>il terzo dà l’<strong>effetto</strong>, per piegare il pallone lontano dal portiere.</li>
  </ol>

  <h2 class="display">Un portiere che non bara</h2>
  <p>Il portiere ricorda dove tiri più spesso e col passare dei rigori si
  sposta, finta, legge il tiro. Ma resta onesto: un tiro perfetto all’incrocio
  entra. Palo e traversa hanno il loro suono e il pallone rimbalza davvero sul
  legno. Al primo errore la serie finisce.</p>

  <h2 class="display">Da giocare in un minuto</h2>
  <p>Si gioca con un dito dal telefono o con la barra spaziatrice dal computer.
  Il record resta salvato e il risultato si condivide con un messaggio pronto.</p>`,
    faq: [
      ['Come si batte il portiere?', 'Cambia angolo, tira forte e usa l’effetto: il portiere impara dalle tue abitudini.'],
      ['Si gioca dal telefono?', 'Sì, con un tocco per ogni fase del tiro.'],
      ['È gratis?', 'Sì, senza registrazione e senza acquisti.'],
    ],
  },
  {
    slug: 'asta-calcio', route: 'asta', name: 'Asta',
    title: 'Asta di calcio: costruisci la squadra con 20 crediti',
    description: 'Gioco d’asta calcistica stile fantacalcio: venti crediti per comprare portiere, difensori, centrocampista e attaccante, poi la partita simulata. Contro il computer o in due sullo stesso telefono.',
    lead: 'Venti crediti, cinque ruoli, un avversario che non regala niente. Poi si gioca la partita.',
    body: `
  <h2 class="display">Come funziona l’asta</h2>
  <p>I giocatori passano uno alla volta, pescati a caso da un catalogo di quasi
  seimila calciatori di ogni epoca. Hai pochi secondi per rilanciare, e devi
  completare la squadra: un portiere, due difensori, un centrocampista e un
  attaccante.</p>
  <p>In un ruolo possono capitare due fuoriclasse da contendersi o due riserve
  su cui non vale la pena spendere: il tetto di offerta ti ricorda sempre quanto
  puoi spendere senza lasciare scoperti gli altri ruoli.</p>

  <h2 class="display">La partita</h2>
  <p>Finita l’asta, le due squadre si affrontano in una partita simulata minuto
  per minuto, con gol, ammonizioni ed espulsioni che pesano davvero. Se finisce
  pari si va ai rigori, tirati uno per uno fino al vincitore.</p>

  <h2 class="display">Contro il computer o in due</h2>
  <p>L’avversario del computer valuta i giocatori e non si lascia trascinare. In
  due si gioca sullo stesso telefono: si scrivono i nomi e il dispositivo passa
  di mano a ogni rilancio.</p>`,
    faq: [
      ['È come il fantacalcio?', 'L’idea dell’asta è simile, ma la partita si gioca subito, in pochi minuti.'],
      ['Si può giocare con un amico?', 'Sì, in due sullo stesso telefono, ognuno con il proprio nome.'],
      ['Quanti giocatori ci sono all’asta?', 'Quasi seimila, dai campioni ai comprimari.'],
    ],
  },
  {
    slug: 'piu-o-meno-calcio', route: 'duello', name: 'Più o Meno',
    title: 'Più o Meno: chi ha fatto più gol, presenze e trofei?',
    description: 'Quiz di calcio a catena: due calciatori e un dato, scegli chi ne ha di più. Gol, presenze, trofei, nazionale, prestiti e altezza, su oltre duemila giocatori.',
    lead: 'Due calciatori, un dato in mezzo, una domanda: chi ne ha di più?',
    body: `
  <h2 class="display">Come si gioca</h2>
  <p>Compaiono due giocatori e una statistica: gol in carriera, presenze in
  campionato, presenze in nazionale, trofei vinti, club in cui hanno giocato,
  prestiti, anni da professionista, altezza e altro ancora. Tocchi quello che ne
  ha di più. Chi vince resta in campo e sfida il prossimo; al primo errore la
  catena si spezza.</p>

  <h2 class="display">Domande sempre oneste</h2>
  <p>Il gioco propone una coppia solo quando la differenza tra i due numeri è
  abbastanza larga da non dipendere dalla fonte, e non confronta mai numeri di
  natura diversa, come i gol in campionato con quelli in tutte le competizioni.
  Niente pareggi, niente trabocchetti.</p>

  <h2 class="display">Oltre duemila giocatori</h2>
  <p>Leggende e giocatori di oggi, con ventidue tipi di dato che girano a caso:
  ogni catena è diversa.</p>`,
    faq: [
      ['Da dove vengono i numeri?', 'Da Wikipedia e da totali di carriera largamente documentati.'],
      ['Si può continuare dopo un errore?', 'Una volta per partita, guardando un breve annuncio.'],
      ['È gratis?', 'Sì, senza registrazione.'],
    ],
  },
  {
    slug: 'quiz-calcio-giornaliero', route: 'daily', name: 'Il Novantesimo',
    title: 'Quiz di calcio giornaliero: la sfida di ogni giorno',
    description: 'Il Novantesimo: cinque domande di calcio al giorno, le stesse per tutti, che cambiano a mezzanotte. Squadre, compagni di squadra e intrusi, con la serie di giorni da non perdere.',
    lead: 'Cinque domande di calcio, le stesse per tutti, una volta al giorno.',
    body: `
  <h2 class="display">Come si gioca</h2>
  <p>Ogni giorno a mezzanotte arrivano cinque round nuovi, identici per tutti:
  riconoscere una squadra da alcuni suoi giocatori, trovare l’intruso che non
  ha mai giocato con gli altri tre, dire se due calciatori sono mai stati
  compagni di squadra. Più indizi chiedi, meno punti prendi.</p>

  <h2 class="display">La serie di giorni</h2>
  <p>Si gioca una volta sola al giorno. Tornando ogni giorno allunghi la serie,
  e il risultato si condivide come una griglia di quadretti che non rivela le
  risposte a chi deve ancora giocare.</p>

  <h2 class="display">Perché giocarlo</h2>
  <p>Due minuti al giorno, una sfida uguale per te e per i tuoi amici, e un
  confronto onesto: stesse domande, stesso giorno.</p>`,
    faq: [
      ['Quando cambia la sfida?', 'Ogni giorno a mezzanotte.'],
      ['Posso rigiocarla?', 'No, una volta al giorno: è quello che la rende una sfida uguale per tutti.'],
      ['Come si condivide il risultato?', 'Con il pulsante Condividi, che crea una griglia senza spoiler.'],
    ],
  },
];

export const MODE_PAGES = RAW.map((m) => ({
  ...m,
  h1: m.title,
  play: { href: `/#/${m.route}`, label: `Gioca a ${m.name}` },
  priority: '0.8',
  changefreq: 'monthly',
  jsonld: jsonld(m),
  body: `${m.body}\n${faqHtml(m.faq)}`,
}));

export const MODE_NAV = RAW.map((m) => [m.slug, m.name]);
