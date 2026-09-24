/* Una pagina vera per ogni modalità. Il gioco vive dentro l’app (indirizzi
   con #), che i motori di ricerca non considerano pagine: queste sono le porte
   d’ingresso che chi cerca "indovina il calciatore" può trovare. Il testo
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
  Settanta a oggi, con i trasferimenti aggiornati.</p>
  <h2 class="display">Come si arriva alla risposta</h2>
  <p>Una carriera si legge dal basso. Le squadre giovanili dicono quasi sempre il paese
  e spesso la regione: chi è cresciuto in un vivaio italiano difficilmente è nato
  altrove. Poi si guarda il primo club da professionista e l’anno: un debutto nel 2009
  in Serie B racconta una generazione precisa.</p>
  <p>Il numero di presenze in nazionale è l’indizio più sottovalutato. Sopra le cinquanta
  si tratta quasi sempre di un giocatore che si conosce; a zero, di uno che ha girato
  molto senza mai arrivare in alto. Anche i trofei aiutano: una Champions vinta restringe
  il campo a una rosa di venticinque nomi per quell’anno.</p>
  <p>Quando si sbaglia, l’indizio più utile è quello delle squadre in comune: se il
  giocatore che hai scritto ha giocato in due degli stessi club, sei vicinissimo — cerca
  un compagno di squadra di quegli anni. E se il gioco dice “nato prima”, ricordati che
  stai cercando un giocatore più vecchio, non necessariamente più famoso.</p>
  <p>Ultimo consiglio: non spendere tutte e cinque le vite su giocatori dello stesso
  campionato. Ogni tentativo vale un indizio, e un nome preso da un altro paese può
  chiudere il cerchio più in fretta di uno preso a caso dalla Serie A.</p>`,
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
  lunga diventa la catena.</p>
  <h2 class="display">Come si tiene viva una catena</h2>
  <p>La tentazione è partire dai campioni, ma i campioni hanno poche squadre: un
  giocatore che ha passato dodici anni nello stesso club chiude la catena subito. I nomi
  che allungano sono quelli di chi ha girato — gli attaccanti che hanno cambiato quattro
  squadre in sei anni, i portieri di riserva, chi è sceso di categoria e poi è risalito.</p>
  <p>La seconda regola è pensare alle squadre grandi come a degli snodi. Da una big
  passano centinaia di giocatori in vent’anni: se ci arrivi, hai sempre una via d’uscita.
  Le squadre piccole, al contrario, sono vicoli: bellissime da giocare quando vuoi
  mettere in difficoltà l’avversario, pericolose se tocca a te subito dopo.</p>
  <p>In partita con gli amici conviene anche ragionare al contrario: prima di dire una
  squadra, chiediti quanti giocatori sapresti tirare fuori da lì. Se la risposta è “uno”,
  quella squadra è un’arma; se è “nessuno”, stai per perdere tu.</p>
  <p>I quaranta secondi sembrano tanti finché non tocca a te. Quando il tempo stringe,
  la scorciatoia più affidabile è il campionato che conosci meglio e la stagione che hai
  visto di più: la memoria funziona per immagini, non per elenchi.</p>`,
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
  segue poco il calcio sia per gli esperti.</p>
  <h2 class="display">Dalla parte del gruppo, e dalla parte dell’impostore</h2>
  <p>Se conosci il giocatore, la parola che dici deve essere abbastanza precisa da farti
  riconoscere dai compagni e abbastanza larga da non regalare la risposta a chi non la
  sa. “Sinistro” va bene, “Fiorentina” no: chi bluffa ripeterebbe il club per tutta la
  partita. Le parole migliori sono quelle che descrivono un dettaglio: un ruolo strano,
  un trasferimento che ha fatto discutere, una finale.</p>
  <p>Se sei l’impostore, la prima regola è non parlare per primo quando puoi evitarlo.
  La seconda è agganciarsi a quello che hanno detto gli altri senza aggiungere niente di
  nuovo: se due dicono “veloce” e “ala”, dire “contropiede” è credibile e non ti espone.
  La terza è la più difficile: al momento del voto, non difenderti troppo. Chi è innocente
  si arrabbia, chi bluffa spiega.</p>
  <p>Per il gruppo, il segnale più affidabile non è la parola sbagliata: è il ritardo.
  Chi conosce il giocatore risponde in fretta, chi improvvisa cerca una parola che vada
  bene per chiunque. Quando avete un sospetto, provate a chiedere un dettaglio che solo
  chi ha la scheda può sapere.</p>
  <h2 class="display">Da tre a dieci, con un telefono solo</h2>
  <p>Non serve niente oltre al telefono: si passa di mano, ognuno scopre il proprio ruolo
  da solo e lo richiude. Il gioco tiene il conto dei turni, mescola l’ordine di chi parla
  e propone il voto quando il gruppo è pronto.</p>
  <p>L’impostore non riceve il nome del giocatore ma un indizio vago — il ruolo, o il
  paese — così ha qualcosa su cui costruire il bluff senza sapere di chi si parla. È la
  differenza fra un gioco di fortuna e un gioco di conversazione.</p>
  <p>Funziona bene a cena, in viaggio, negli spogliatoi: una partita dura pochi minuti e
  se ne incatenano dieci senza accorgersene. Se il gruppo è grande conviene giocare due
  impostori, così il dubbio resta fino alla fine.</p>`,
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
  Due carriere non sono mai uguali, anche partendo dalle stesse scelte.</p>
  <h2 class="display">Come si costruisce una carriera lunga</h2>
  <p>I primi due anni decidono più di quanto sembri. Un ragazzo che gioca venti partite
  in una squadra media cresce più di uno che ne gioca tre in una grande: i minuti valgono
  più del nome sulla maglia, e l’allenamento da solo non basta a colmare la differenza.</p>
  <p>Gli infortuni sono la variabile che rovina le carriere. Rientrare in campo appena
  possibile fa perdere meno partite subito e molte di più dopo: il fisico si ricorda. Se
  il gioco propone di forzare il rientro prima di una partita importante, chiediti quante
  ne restano nella stagione.</p>
  <p>Con l’età cambia quello che conviene allenare. Fino ai ventitré anni si guadagna
  soprattutto in tecnica e velocità; dopo i ventotto la velocità scende comunque, e i
  punti messi in posizione, calma e colpo di testa valgono molto di più. Cambiare ruolo
  al momento giusto — dall’ala al terzino, dalla punta al trequartista — allunga la
  carriera di tre o quattro stagioni.</p>
  <p>Fuori dal campo contano il rapporto con l’allenatore e quello con lo spogliatoio.
  Chiedere la cessione ogni anno porta soldi e nessun trofeo; restare troppo dove non si
  gioca brucia gli anni migliori. La nazionale arriva a chi ha continuità, non a chi ha
  il contratto più ricco.</p>`,
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
  offerte da altri club completano la carriera.</p>
  <h2 class="display">Le scelte che cambiano una stagione</h2>
  <p>La prima è lo stile di gioco: dodici opzioni, dalla difesa bassa al pressing
  ultra-offensivo, e ognuna chiede una rosa diversa. Il pressing alto vuole gambe e
  fiato, il possesso vuole centrocampisti che sappiano ricevere in mezzo, il contropiede
  vuole velocità davanti. Cambiare stile ogni settimana costa: la squadra ci mette
  qualche giornata a farlo suo, e nel frattempo rende meno.</p>
  <p>La seconda è la gestione del calendario. Con le coppe si gioca ogni tre giorni: chi
  manda in campo sempre gli stessi undici arriva a marzo con mezza rosa scarica e la
  parte finale del campionato la perde in infermeria. La condizione fisica si legge sulla
  barra di ogni giocatore e non torna a cento da sola.</p>
  <p>La terza è il mercato. Il budget si porta avanti di stagione in stagione, quindi
  non spendere tutto a luglio è una strategia legittima: a gennaio i prezzi di chi ha il
  contratto in scadenza crollano. Prima di comprare un titolare, però, guarda il monte
  ingaggi: uno stipendio pesante blocca la rosa per anni, e la società non lo alza a
  metà stagione.</p>
  <p>La quarta sono gli imprevisti. Oltre quattrocento situazioni — spogliatoio, stampa,
  dirigenza, infortuni, vivaio, tifosi — e nessuna ha una risposta sempre giusta: la
  stessa scelta funziona con un professionista e fa esplodere un ribelle. Le conseguenze
  arrivano anche settimane dopo, quindi conviene ricordarsi cosa si è promesso.</p>`,
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
  annuncio, sempre per scelta tua.</p>
  <h2 class="display">Come ricordarsi una rosa intera</h2>
  <p>Il modo più efficace non è andare a caso ma per reparti: prima i due portieri, poi
  la difesa da destra a sinistra, il centrocampo, gli attaccanti. Quasi tutti si bloccano
  a metà perché saltano da un ruolo all’altro; seguire il campo aiuta la memoria a
  chiudere i buchi.</p>
  <p>Poi ci sono le categorie che sfuggono sempre: il terzo portiere, i ragazzi del
  vivaio saliti a gennaio, chi è arrivato in prestito a stagione in corso e chi è partito
  a metà anno. Quando ti mancano tre nomi, quasi sempre sono lì.</p>
  <p>Un’altra scorciatoia è ripensare a una partita precisa di quella stagione: una
  finale, un derby, una notte europea. Ricostruire l’undici iniziale di quella sera
  sblocca più nomi di qualsiasi sforzo a freddo.</p>
  <h2 class="display">Le rose e le stagioni</h2>
  <p>Il catalogo copre quasi duemila rose: campionati europei e stagioni diverse, dalle
  squadre che tutti conoscono a quelle che si ricordano solo gli appassionati. Ogni rosa
  contiene i giocatori che hanno fatto parte della prima squadra in quella stagione,
  compresi quelli arrivati o partiti a gennaio.</p>
  <p>La ricerca accetta il nome con cui il giocatore è conosciuto e perdona gli accenti:
  scrivere “Ibrahimovic” funziona come “Ibrahimović”. I nomi doppi si possono scrivere
  anche solo con il cognome, se non è ambiguo.</p>
  <p>Il punteggio cresce con la percentuale di rosa completata e con la difficoltà della
  squadra: ricordarsi venti giocatori di un club di metà classifica vale più che
  ricordarne venti di una squadra che ha vinto tutto, perché di quella si parla ogni
  giorno.</p>`,
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
  Il record resta salvato e il risultato si condivide con un messaggio pronto.</p>
  <h2 class="display">Battere il portiere</h2>
  <p>Il portiere di NOVANTA non tira a caso: legge la forza del tiro e si muove di
  conseguenza. Un tiro potentissimo al centro è più efficace di quanto si creda, perché
  quasi nessuno resta fermo; ma ripetuto due volte di fila diventa prevedibile.</p>
  <p>La regola pratica è alternare lato e altezza, non solo lato. Un rasoterra all’angolo
  e un tiro a mezza altezza dalla stessa parte sono due tiri diversi per chi para. La
  potenza massima toglie precisione: se cerchi il sette, conviene scendere di un gradino.</p>
  <p>Nelle serie lunghe conta la testa: dopo un errore la tentazione è cambiare tutto,
  ed è lì che si sbaglia di nuovo. Meglio tornare al tiro che ti riesce meglio e cambiare
  solo l’altezza.</p>
  <h2 class="display">Com’è fatto</h2>
  <p>Il tiro non è una moneta truccata. Ogni rigore mette insieme tre cose: l’angolo che
  scegli, la forza con cui calci e la lettura del portiere, che ha un tempo di reazione e
  una direzione preferita che cambia partita dopo partita. Più aumenti la potenza, più
  cresce il rischio di uscire di poco: è lo stesso compromesso che hanno i giocatori veri.</p>
  <p>Il punteggio tiene conto della serie: ogni gol di fila vale più del precedente, e un
  errore azzera il moltiplicatore ma non la partita. È il modo più semplice per rendere
  interessante il decimo rigore quanto il primo.</p>
  <p>Se ti piace il lato tattico, in <a href="/allenatore-calcio">Allenatore</a> i rigori
  si tirano dentro una partita vera: scegli tu chi va sul dischetto, e la scelta pesa
  davvero perché ogni giocatore ha freddezza e tiro diversi.</p>`,
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
  di mano a ogni rilancio.</p>
  <h2 class="display">Come si vince un’asta</h2>
  <p>Il primo errore è spendere presto. I prezzi dei primi giri sono sempre più alti:
  tutti hanno il budget pieno e nessuno vuole restare senza il nome grosso. Se aspetti,
  gli stessi giocatori passano per meno.</p>
  <p>Il secondo è comprare il ruolo sbagliato. I portieri e i difensori si trovano fino
  alla fine, gli attaccanti no: se resti con pochi soldi e un buco davanti, la rosa non
  si salva. Tieni sempre da parte una cifra per l’ultimo attaccante.</p>
  <p>Il terzo è non guardare gli avversari. Se un rivale ha già tre punte, non rilancerà
  sulla quarta: è il momento di prendere la tua a poco. E quando qualcuno resta con pochi
  crediti, i giocatori che chiama vanno lasciati salire di uno: costringerlo a spendere
  tutto vale più di strappargli il giocatore.</p>
  <h2 class="display">Gli avversari</h2>
  <p>I rivali non rilanciano a caso: ognuno ha un budget, una lista di ruoli da coprire e
  un’idea di quanto vale ogni giocatore. Quando un ruolo gli manca, alzano; quando ce
  l’hanno già coperto, si fermano anche su un nome grosso. È il motivo per cui la stessa
  asta, giocata due volte, non finisce mai allo stesso modo.</p>
  <p>I prezzi di partenza vengono dal valore reale dei giocatori, non da una tabella
  inventata: un ventenne in crescita costa più di quanto renda oggi, un trentaquattrenne
  costa una frazione anche se è ancora forte. Chi conosce il mercato vero parte avvantaggiato.</p>
  <p>Si può giocare da soli contro il computer o in due sullo stesso dispositivo,
  passandosi il telefono a ogni chiamata. Le regole dell’asta a chiamata sono quelle del
  fantacalcio classico: chi chiama apre, si rilancia finché qualcuno smette.</p>`,
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
  ogni catena è diversa.</p>
  <h2 class="display">Come si indovina più spesso</h2>
  <p>Quando il confronto è fra due giocatori di epoche diverse, conta la lunghezza della
  carriera più del talento: chi ha giocato quindici anni ha numeri più alti di un fenomeno
  fermato dagli infortuni. Per le presenze, ricordati che i campionati a venti squadre
  danno trentotto partite l’anno, quelli a diciotto solo trentaquattro.</p>
  <p>Per i gol, il ruolo pesa più del nome: un buon centravanti di metà classifica segna
  più di un grandissimo centrocampista. Per i valori di mercato, l’età è quasi tutto: un
  ventunenne promettente vale più di un trentaduenne più forte.</p>
  <p>Il gioco non propone mai coppie ambigue: se due numeri sono vicini, la domanda non
  compare. Quindi, quando sei indeciso, la differenza è più grande di quanto pensi —
  scegli con decisione invece di cercare il trucco.</p>
  <h2 class="display">Da dove vengono i numeri</h2>
  <p>Presenze, gol e trofei arrivano dalle carriere raccolte dalle enciclopedie e
  ricontrollate con regole automatiche: un giocatore entra nel catalogo solo se i suoi
  numeri sono coerenti fra la scheda e le stagioni. Per questo non troverai mai un
  confronto costruito su un dato monco.</p>
  <p>Il confronto viene generato in anticipo e scartato se la differenza fra i due numeri
  è troppo piccola: sotto una certa soglia la risposta dipenderebbe dalla fonte, non dalla
  memoria di chi gioca. Fra migliaia di coppie possibili restano solo quelle con una
  risposta indiscutibile.</p>
  <p>Le categorie sono quattro: presenze in carriera, gol, valore di mercato e anno di
  nascita. Ognuna premia un tipo di conoscenza diverso, e la serie continua finché non
  sbagli: il record è personale e resta nel tuo browser.</p>`,
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
  confronto onesto: stesse domande, stesso giorno.</p>
  <h2 class="display">Cinque domande, una al giorno</h2>
  <p>Le domande sono le stesse per tutti e cambiano a mezzanotte: non si gioca due volte
  lo stesso giorno, ed è questo che rende il confronto con gli amici onesto. La serie di
  giorni consecutivi si interrompe se salti una giornata, quindi conviene giocare presto.</p>
  <p>Il risultato si condivide come una griglia di quadretti: chi lo riceve vede come è
  andata senza sapere le risposte, esattamente come nei giochi di parole giornalieri.
  È fatto apposta per non rovinare la sfida a chi deve ancora giocare.</p>
  <p>Le cinque domande pescano da tutte le altre modalità: una rosa da ricordare, una
  carriera da riconoscere, un confronto di numeri. Giocare le altre modalità durante la
  settimana è il modo più semplice per migliorare qui.</p>
  <h2 class="display">Come nascono le domande</h2>
  <p>Ogni giorno il gioco estrae cinque domande da cataloghi diversi: le rose delle
  squadre, le carriere dei giocatori, i confronti fra numeri. L’estrazione parte da un
  seme costruito sulla data, in modo che il quiz sia identico per tutti quelli che giocano
  nello stesso giorno, ovunque si trovino.</p>
  <p>Le domande ambigue vengono scartate prima di arrivare a te: se due numeri sono
  troppo vicini, o se un dato dipende da come lo si conta, la domanda non compare. È il
  motivo per cui nel Novantesimo non vedi mai due risposte che potrebbero essere giuste
  entrambe.</p>
  <p>La difficoltà è volutamente media: cinque domande che un appassionato risolve in un
  paio di minuti, non un esame. Chi vuole la sfida dura la trova nelle altre modalità,
  dove si può scegliere il livello.</p>`,
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
