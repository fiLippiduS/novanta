/* Il testo delle pagine. Scritto per chi gioca, non per un motore di ricerca:
   se una frase non serve a nessuno, qui non ci va. */

export const UPDATED = { it: '24 settembre 2026', iso: '2026-09-24' };
const MAIL = '<a href="mailto:ciao@instascope.app">ciao@instascope.app</a>';

export const NAV = [
  ['come-si-gioca', 'Come si gioca'],
  ['guide', 'Le guide'],
  ['ruoli-calcio', 'I ruoli'],
  ['moduli-calcio', 'I moduli'],
  ['calciomercato-come-funziona', 'Il mercato'],
  ['coppe-europee-come-funzionano', 'Le coppe'],
  ['asta-fantacalcio-strategia', 'L’asta'],
  ['glossario-calcio', 'Glossario'],
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
  ['Come si installa sul telefono?', 'Non serve uno store. Su iPhone apri il sito in Safari, tocca il tasto di condivisione e scegli “Aggiungi alla schermata Home”; su Android, dal menu del browser, “Installa app”. Da lì NOVANTA si apre a tutto schermo come un’app normale.'],
  ['Perché una squadra o una stagione non c’è?', 'Perché i dati di quella rosa non sono abbastanza completi o coerenti da poter essere usati senza rischiare di farti una domanda sbagliata. Quando la fonte migliora, la squadra entra.'],
  ['Come si cambia lingua?', 'Dal menu in cima alla schermata principale. La scelta resta salvata nel browser e vale anche per le situazioni delle due carriere, che sono tradotte per intero.'],
  ['Le carriere si salvano?', 'Sì, Carriera e Allenatore si salvano automaticamente nel browser dopo ogni giornata, e si riprendono da dove le hai lasciate. Sono due salvataggi separati: puoi averle in corso tutte e due.'],
  ['Posso giocare senza pubblicità?', 'Gli annunci non compaiono mai durante una partita né nei primi minuti di una visita. Quelli con premio — un suggerimento, tempo in più, un’altra possibilità — si guardano solo se lo scegli tu.'],
  ['Il gioco è adatto ai bambini?', 'Sì: non c’è chat, non ci sono contenuti violenti e non si può spendere denaro. Le uniche parole che si scambiano sono quelle fra amici che giocano nella stessa stanza.'],
  ['Posso suggerire una modalità nuova?', `Scrivici a ${MAIL}: le idee che arrivano dalle partite vere sono quasi sempre migliori delle nostre.`],
  ['Perché il gioco si chiama NOVANTA?', 'Per i novanta minuti di una partita, e per il decennio che ha insegnato a molti di noi a guardare il calcio. Il nome è anche la promessa di una partita che dura poco: nessuna modalità, a parte le carriere, chiede più di qualche minuto.'],
];

export const PAGES = [
  {
    slug: 'guide',
    title: 'Le guide di NOVANTA',
    description: 'Ruoli, moduli, calciomercato, coppe europee, asta del fantacalcio e un glossario: le guide per capire il calcio con cui sono fatti i giochi di NOVANTA.',
    lead: 'Sei guide scritte per chi guarda le partite e vuole capire meglio quello che vede. Si leggono in dieci minuti l’una e non servono conoscenze tecniche.',
    priority: '0.7',
    body: `
  <h2 class="display">Il campo</h2>
  <p><a href="/ruoli-calcio"><strong>I ruoli e i numeri di maglia</strong></a> — Che cosa fa
  davvero un terzino, un mediano, un trequartista o un falso nove, perché il numero sulla
  maglia non dice quasi più niente e cosa cambia da un paese all’altro.</p>
  <p><a href="/moduli-calcio"><strong>I moduli spiegati uno per uno</strong></a> — 4-3-3,
  4-2-3-1, 4-4-2, 3-5-2, 3-4-3 e il rombo: quali giocatori chiedono, dove lasciano scoperto
  il campo e come si sceglie quello giusto per la propria rosa.</p>

  <h2 class="display">I soldi e le regole</h2>
  <p><a href="/calciomercato-come-funziona"><strong>Come funziona davvero il
  calciomercato</strong></a> — Cartellino e ingaggio, clausole, prestiti con diritto o con
  obbligo, parametro zero, bonus, percentuali sulla rivendita e commissioni dei procuratori.</p>
  <p><a href="/coppe-europee-come-funzionano"><strong>Champions, Europa League e
  Conference</strong></a> — Chi si qualifica, com’è cambiato il formato dal 2024, cosa
  comporta giocare ogni tre giorni e quanto pesa l’Europa sul bilancio di un club.</p>
  <p><a href="/asta-fantacalcio-strategia"><strong>L’asta del fantacalcio</strong></a> —
  Le regole dell’asta a chiamata, quanto spendere per reparto, quando rilanciare e gli
  errori che si ripetono ogni anno.</p>

  <h2 class="display">Le parole</h2>
  <p><a href="/glossario-calcio"><strong>Glossario del calcio</strong></a> — Quaranta
  parole spiegate: fuorigioco, gegenpressing, expected goals, baricentro, clean sheet,
  parametro zero, ammortamento e tutte quelle che si sentono in telecronaca.</p>

  <h2 class="display">Come sono scritte</h2>
  <p>Ogni guida parte da quello che si vede in televisione e arriva a spiegare perché
  succede: non ci sono formule, non ci sono schemi da memorizzare e non serve aver giocato
  a calcio. Quando compare una parola tecnica viene spiegata la prima volta che la si
  incontra, e se ha una voce nel <a href="/glossario-calcio">glossario</a> la trovi
  collegata.</p>
  <p>Sono scritte per chi guarda il calcio da appassionato: chi discute di moduli al bar,
  chi fa l’asta del fantacalcio a settembre, chi vuole capire perché il suo club ha venduto
  un giocatore a gennaio. Le aggiorniamo quando cambiano le regole — la fase a girone unico
  delle coppe europee, per esempio, è arrivata nel 2024 e ha cambiato mezzo calendario.</p>
  <p>Se una cosa non è chiara o manca, scrivilo: le guide nascono dalle domande che ci
  arrivano, e la prossima può partire dalla tua. L’indirizzo è nella pagina
  <a href="/contatti">Contatti</a>.</p>

  <h2 class="display">E poi c’è da giocare</h2>
  <p>Le guide raccontano il calcio con cui sono fatti i giochi: le rose vere di
  <a href="/quiz-rosa-squadra">La Rosa</a>, le carriere di
  <a href="/indovina-il-calciatore">Chi è?</a>, il mercato a trattative di
  <a href="/allenatore-calcio">Allenatore</a>. Le regole di tutte le modalità stanno in
  <a href="/come-si-gioca">Come si gioca</a>.</p>`,
  },
  {
    slug: 'coppe-europee-come-funzionano',
    title: 'Champions, Europa League e Conference: come funzionano',
    description: 'Chi si qualifica alle coppe europee, come sono cambiati i gironi, cosa succede a chi arriva terzo e quanto valgono davvero i premi. Guida alle tre competizioni UEFA.',
    lead: 'Tre competizioni, un solo albero: chi entra in Champions, chi scende in Europa League, chi finisce in Conference e che cosa cambia davvero fra loro.',
    priority: '0.7',
    body: `
  <h2 class="display">Chi si qualifica</h2>
  <p>I posti europei si assegnano con la classifica di campionato, e quanti ne ha ogni
  paese dipende dal <strong>ranking UEFA</strong>, cioè da come sono andate le sue squadre
  nelle stagioni precedenti. I campionati più forti hanno quattro posti diretti in
  Champions League, poi uno o due in Europa League e uno in Conference League; scendendo
  nel ranking i posti calano e compaiono i turni preliminari, quelli che si giocano ad
  agosto prima che inizi la fase principale.</p>
  <p>Ai posti da campionato si aggiunge la coppa nazionale: chi la vince entra in Europa
  League. Se ha già un posto in Champions, il posto passa alla squadra meglio piazzata in
  campionato fra quelle rimaste fuori. È il motivo per cui certi anni il sesto posto vale
  l’Europa e altri no.</p>

  <h2 class="display">Che cosa è cambiato nel formato</h2>
  <p>Fino al 2024 le tre coppe avevano trentadue squadre divise in otto gironi da quattro,
  andata e ritorno, con le prime due qualificate agli ottavi. Dal 2024 la fase a gironi è
  stata sostituita da un <strong>girone unico</strong>: trentasei squadre in un’unica
  classifica, ognuna gioca otto partite contro otto avversarie diverse. Le prime otto
  passano direttamente agli ottavi, dalla nona alla ventiquattresima si giocano uno
  spareggio, le ultime escono.</p>
  <p>Il resto del tabellone è rimasto quello di sempre: ottavi, quarti e semifinali con
  andata e ritorno, finale in gara secca in campo neutro. La regola del gol in trasferta,
  che per sessant’anni ha deciso i pareggi, è stata abolita nel 2021: oggi se dopo due
  partite il punteggio totale è pari si giocano i supplementari e poi i rigori.</p>

  <h2 class="display">Le tre competizioni</h2>
  <p><strong>Champions League</strong> — La più ricca e la più difficile: ci sono le
  campionesse nazionali e le migliori dei campionati più forti. Vincerla vale una stagione
  intera, e il solo fatto di qualificarsi cambia i conti di un club.</p>
  <p><strong>Europa League</strong> — Il secondo livello, con squadre che in campionato
  stanno appena sotto le prime. Chi la vince entra in Champions l’anno dopo, ed è la
  scorciatoia che negli ultimi anni diverse squadre hanno preso davvero.</p>
  <p><strong>Conference League</strong> — Nata nel 2021 per dare l’Europa anche ai
  campionati più piccoli. Meno ricca, ma è una coppa vera: si gioca il giovedì, porta
  punti al ranking del paese e per molti club è la prima finale continentale della storia.</p>

  <h2 class="display">Che cosa comporta giocare in Europa</h2>
  <p>Chi va in Europa gioca una partita in più ogni settimana, spesso il giovedì con il
  campionato la domenica. Serve una rosa lunga: le squadre che affrontano la coppa con
  tredici o quattordici giocatori affidabili arrivano a febbraio senza benzina, e in
  campionato lo si vede. Per questo gli allenatori ruotano, e per questo una rosa costruita
  per due competizioni costa molto più di una costruita per una sola.</p>
  <p>Dall’altra parte ci sono i soldi: partecipazione, premi per ogni vittoria, quote
  legate al ranking e agli incassi televisivi. Per un club medio una buona stagione europea
  vale quanto la cessione di un titolare, e cambia il budget di mercato dell’anno dopo.</p>

  <h2 class="display">Nel gioco</h2>
  <p>In <a href="/allenatore-calcio">Allenatore</a> le coppe europee si giocano come le
  partite di campionato, con il colore della competizione sul tabellone: blu per la
  Champions, arancione per l’Europa League, verde per la Conference. Ti qualifichi con la
  classifica dell’anno prima, il calendario alterna coppa e campionato, e la fatica dei
  giocatori è quella vera: chi gioca ogni tre giorni arriva scarico. Alla fine della
  stagione trovi anche il capocannoniere della coppa, oltre a quello del campionato.</p>`,
  },
  {
    slug: 'asta-fantacalcio-strategia',
    title: 'Asta del fantacalcio: regole e strategia',
    description: 'Come funziona l’asta a chiamata, quanto spendere per ogni reparto, quando rilanciare e quando lasciar perdere. Guida pratica per non restare senza attaccanti.',
    lead: 'L’asta si vince nei primi venti minuti, quando tutti hanno soldi e nessuno ha ancora paura. Ecco le regole e i conti da fare prima di alzare la mano.',
    priority: '0.7',
    body: `
  <h2 class="display">Come funziona l’asta a chiamata</h2>
  <p>Ogni partecipante ha un budget uguale (nel fantacalcio classico cinquecento crediti)
  e deve riempire una rosa completa: tre portieri, otto difensori, otto centrocampisti,
  sei attaccanti. A turno si <strong>chiama</strong> un giocatore, si parte da un credito
  e si rilancia finché tutti si fermano tranne uno. Chi non completa un reparto resta con
  il buco: nessuno regala giocatori a fine asta.</p>
  <p>La variante più diffusa è il <em>rilancio libero</em>: si può alzare di uno o di
  dieci, e il ritmo lo decide chi ha coraggio. In alcune leghe si gioca a tempo, con pochi
  secondi per rispondere: lì vince chi ha deciso prima quanto vale ogni nome.</p>

  <h2 class="display">Il conto da fare prima</h2>
  <p>Cinquecento crediti e venticinque giocatori fanno venti crediti a testa, ma non si
  distribuiscono in parti uguali. Una divisione che funziona quasi sempre:</p>
  <ul>
    <li><strong>portieri 8-10%</strong>: un titolare affidabile e due riserve da un credito;</li>
    <li><strong>difensori 12-15%</strong>: uno o due che segnano, gli altri presi a poco;</li>
    <li><strong>centrocampisti 30-35%</strong>: qui stanno i giocatori che fanno assist e
    tirano i rigori, ed è il reparto dove si vince il campionato;</li>
    <li><strong>attaccanti 45-50%</strong>: i gol costano, e chi risparmia davanti lo paga
    tutto l’anno.</li>
  </ul>
  <p>La regola pratica è tenere sempre da parte, fino alla fine, i crediti per l’ultimo
  attaccante. Chi arriva agli ultimi giri con trenta crediti e una casella vuota davanti
  prende quello che avanza, e quello che avanza non segna.</p>

  <h2 class="display">Quando rilanciare</h2>
  <p>Il prezzo di un giocatore non è il suo valore: è quanto sono disposti a pagare gli
  altri. Nei primi giri tutti hanno il budget pieno e i prezzi si gonfiano; se aspetti, gli
  stessi nomi passano per meno. Ma non esagerare con la pazienza: quando restano pochi
  titolari veri, i prezzi risalgono perché chi è rimasto scoperto deve comprare per forza.</p>
  <p>Guarda le rose degli avversari, non solo la tua. Chi ha già tre punte non rilancerà
  sulla quarta: è il momento di prendere la tua a poco. E quando qualcuno resta con pochi
  crediti, i giocatori che chiama vanno fatti salire di uno o due: costringerlo a spendere
  tutto vale più che strappargli il nome.</p>

  <h2 class="display">Gli errori che si ripetono ogni anno</h2>
  <p>Comprare il fuoriclasse a qualunque cifra e poi riempire la rosa con giocatori da un
  credito: una squadra con un campione e ventiquattro riserve fa meno punti di una squadra
  di undici titolari normali. Innamorarsi della propria squadra del cuore e pagare i suoi
  giocatori il doppio. Prendere il portiere per primo, quando i portieri sono l’unico
  reparto che si trova sempre. E, il più comune di tutti, rilanciare su un nome che non
  serve solo per far spendere un avversario: quasi sempre resta in mano a chi ha rilanciato.</p>

  <h2 class="display">Provare senza rischiare</h2>
  <p>L’<a href="/asta-calcio">Asta di NOVANTA</a> serve proprio a questo: si gioca contro
  avversari che hanno un budget, una lista di ruoli da coprire e un’idea del valore di ogni
  giocatore, quindi i prezzi si muovono come in una lega vera. Si può giocare da soli o in
  due sullo stesso telefono, e in dieci minuti si capisce se la propria strategia regge.
  Se poi vuoi capire perché certi giocatori costano tanto, in
  <a href="/calciomercato-come-funziona">Come funziona il calciomercato</a> c’è come
  nascono i valori.</p>`,
  },
  {
    slug: 'calciomercato-come-funziona',
    title: 'Come funziona davvero il calciomercato',
    description: 'Cartellino, ingaggio, clausola rescissoria, prestito con diritto o obbligo, parametro zero, commissioni, bonus: le parole del calciomercato spiegate con i numeri che contano.',
    lead: 'Quando si legge “trenta milioni più bonus” si stanno guardando almeno quattro cifre diverse. Ecco quali sono e chi le incassa.',
    priority: '0.7',
    body: `
  <h2 class="display">Due cifre, non una</h2>
  <p>Un trasferimento ha sempre due prezzi. Il primo è il <strong>cartellino</strong>:
  quanto il club che compra paga al club che vende per liberare il giocatore dal
  contratto. Il secondo è l’<strong>ingaggio</strong>: quanto il giocatore guadagna
  ogni anno, e lo paga il club nuovo per tutta la durata del contratto. Un giocatore
  che costa poco di cartellino ma tanto di ingaggio può pesare più di uno pagato
  molto e con uno stipendio normale.</p>
  <p>Da questo nasce una regola che vale in tutte le società: il cartellino si può
  spalmare su più bilanci (l’ammortamento: trenta milioni su cinque anni valgono sei
  milioni l’anno), l’ingaggio no. Per questo i contratti lunghi convengono a chi compra,
  e per questo un rinnovo che allunga la scadenza vale, per il club, quasi quanto una
  cessione.</p>

  <h2 class="display">Il contratto e la scadenza</h2>
  <p>Finché un giocatore ha il contratto in corso, il suo club decide. Ma più la
  scadenza si avvicina, meno vale il cartellino: a un anno dalla fine il prezzo crolla,
  perché chi compra sa che fra dodici mesi lo prenderebbe gratis. A scadenza il
  giocatore è un <strong>parametro zero</strong>: firma con chi vuole e il club di
  provenienza non incassa niente. Le società più attente trattano il rinnovo due anni
  prima proprio per non arrivare a quel punto.</p>

  <h2 class="display">La clausola rescissoria</h2>
  <p>È una cifra scritta nel contratto: chi la paga porta via il giocatore e il club
  non può opporsi. In Spagna è obbligatoria per legge ed è il motivo per cui certi
  trasferimenti si chiudono in poche ore; altrove si usa per blindare i giovani. Le
  clausole sono quasi sempre molto più alte del valore di mercato: servono a scoraggiare,
  non a vendere.</p>

  <h2 class="display">Il prestito</h2>
  <p>Il giocatore cambia squadra per un periodo, di solito una stagione, ma il cartellino
  resta al club di partenza. Le varianti che contano sono tre:</p>
  <ul>
    <li><strong>prestito secco</strong>: finita la stagione torna a casa;</li>
    <li><strong>con diritto di riscatto</strong>: chi lo ha preso può comprarlo a una
    cifra fissata prima, se vuole;</li>
    <li><strong>con obbligo di riscatto</strong>: lo deve comprare, spesso al verificarsi
    di una condizione (un numero di presenze, la salvezza, la qualificazione).</li>
  </ul>
  <p>Nel prestito si tratta anche l’ingaggio: raramente lo paga tutto chi riceve il
  giocatore, quasi sempre le due società se lo dividono. Per un ragazzo il prestito è
  lo strumento con cui si cresce: giocare venticinque partite in una squadra più piccola
  vale più di dieci minuti a partita in una grande.</p>

  <h2 class="display">Bonus e percentuali</h2>
  <p>“Venti milioni più cinque di bonus” significa che cinque milioni si pagano solo se
  succede qualcosa: un numero di presenze, i gol, la qualificazione a una coppa. Sono
  soldi veri ma non certi, e infatti chi vende li conta per metà. Esiste anche la
  <strong>percentuale sulla futura rivendita</strong>: il club che vende si tiene una
  fetta (di solito fra il 10 e il 20 per cento) di quanto incasserà il club che compra
  quando rivenderà il giocatore. È il modo in cui le società piccole guadagnano due
  volte dallo stesso ragazzo.</p>

  <h2 class="display">Chi lavora alla trattativa</h2>
  <p>Un affare non si chiude fra due presidenti al telefono. Ci sono il direttore
  sportivo, che tratta il cartellino con l’altro club, e il <strong>procuratore</strong>,
  che tratta l’ingaggio e le condizioni per conto del giocatore e prende una commissione
  (di norma una percentuale dell’operazione). Sono due trattative separate: si può
  trovare l’accordo con il club e non con il giocatore, e viceversa. Alla fine arrivano
  le <strong>visite mediche</strong>, che non sono una formalità: un problema fisico può
  far saltare tutto o far rinegoziare il prezzo il giorno prima della firma.</p>

  <h2 class="display">Le finestre</h2>
  <p>Non si compra quando si vuole. In Europa ci sono due finestre: quella lunga
  d’estate e quella breve di gennaio, che serve a riparare. Nell’ultimo giorno si chiude
  più di quanto si immagini, perché chi vende sa che chi compra non ha più tempo per
  cercare alternative. Fuori dalle finestre si può tesserare solo chi è svincolato.</p>

  <h2 class="display">Come si legge un valore di mercato</h2>
  <p>I valori che si leggono sui siti specializzati non sono prezzi: sono stime di
  quanto un giocatore dovrebbe costare, costruite su età, rendimento, ruolo, contratto e
  campionato. Un ventenne in crescita vale più di quanto renda oggi, perché si paga
  anche quello che diventerà; un trentaquattrenne vale una frazione, anche se è ancora
  fortissimo. Il prezzo vero, poi, dipende da quanto quel giocatore serve a chi vende:
  un titolare inamovibile costa il doppio di una riserva dello stesso livello.</p>

  <h2 class="display">Dove si prova</h2>
  <p>Il mercato di <a href="/allenatore-calcio">Allenatore</a> funziona con queste regole:
  si tratta prima con il club (che ha una pazienza e un prezzo sotto il quale non scende,
  e a volte si vede arrivare una rivale), poi con il giocatore e il suo procuratore
  (ingaggio, anni, ruolo promesso, commissione) e infine si passa dalle visite mediche.
  Le clausole spagnole si possono pagare, i prestiti si fanno con la divisione
  dell’ingaggio, e mettere un giocatore in lista non fa arrivare offerte all’istante:
  i club ci mettono qualche giorno, e per uno scarso non arriva niente.</p>`,
  },
  {
    slug: 'glossario-calcio',
    title: 'Glossario del calcio: le parole spiegate',
    description: 'Dal fuorigioco al gegenpressing, dal parametro zero agli expected goals: quaranta parole del calcio spiegate in italiano, senza giri.',
    lead: 'Le parole che si sentono in telecronaca e si leggono nei giornali, spiegate una per una. In ordine di argomento, non alfabetico: così si capiscono meglio.',
    priority: '0.7',
    body: `
  <h2 class="display">Le regole</h2>
  <p><strong>Fuorigioco</strong> — Un attaccante è in fuorigioco se, nel momento in cui
  un compagno gli passa la palla, si trova più vicino alla linea di porta avversaria
  sia del pallone sia del penultimo difensore (di solito l’ultimo di movimento, perché
  il portiere conta come uno dei due). Non è punibile se riceve da una rimessa laterale,
  da un rinvio dal fondo o da un calcio d’angolo.</p>
  <p><strong>Vantaggio</strong> — L’arbitro può non fischiare un fallo se fermare il
  gioco danneggerebbe la squadra che l’ha subito.</p>
  <p><strong>Doppia ammonizione</strong> — Due gialli nella stessa partita valgono un
  rosso, e la squalifica è di una giornata; un rosso diretto ne costa di più.</p>
  <p><strong>VAR</strong> — L’assistenza video. Interviene solo su quattro cose: gol,
  rigori, espulsioni dirette e scambi di persona.</p>

  <h2 class="display">In campo</h2>
  <p><strong>Pressing</strong> — Andare a prendere l’avversario che ha la palla invece
  di aspettarlo. <strong>Pressing alto</strong> se si fa nella metà campo avversaria.</p>
  <p><strong>Gegenpressing</strong> — Riconquistare subito il pallone appena lo si è
  perso, nei primi secondi, quando l’avversario è ancora sbilanciato in avanti.</p>
  <p><strong>Linea difensiva alta</strong> — Tenere i difensori lontani dalla propria
  porta per accorciare il campo. Rende la squadra compatta e la espone alla palla in
  profondità.</p>
  <p><strong>Baricentro</strong> — La posizione media della squadra in campo. Alto se si
  gioca avanti, basso se si difende vicino alla propria area.</p>
  <p><strong>Ripartenza (o contropiede)</strong> — Attaccare subito dopo aver recuperato
  palla, mentre l’avversario è ancora fuori posizione.</p>
  <p><strong>Palla inattiva</strong> — Calci d’angolo, punizioni e rimesse lunghe. Vale
  circa un gol su quattro nel calcio professionistico: le squadre ci lavorano più di
  quanto si creda.</p>
  <p><strong>Marcatura a uomo e a zona</strong> — Seguire un avversario ovunque vada,
  oppure difendere uno spazio e prendere chi ci entra.</p>
  <p><strong>Falso nove</strong> — Un centravanti che si abbassa a centrocampo per
  trascinarsi dietro il difensore e lasciare spazio a chi arriva.</p>
  <p><strong>Mediano</strong>, <strong>mezzala</strong>, <strong>quinto</strong> — I ruoli
  del centrocampo e delle fasce: li trovi spiegati in
  <a href="/ruoli-calcio">I ruoli e i numeri di maglia</a>.</p>

  <h2 class="display">I numeri</h2>
  <p><strong>Expected goals (xG)</strong> — Il valore di un’occasione: quanti gol,
  in media, nascono da un tiro fatto in quella posizione e in quella situazione. Un tiro
  da fuori area vale spesso 0,03; un rigore circa 0,78. Servono a capire se una squadra
  ha creato tanto o è stata solo fortunata.</p>
  <p><strong>Tiri in porta</strong> — I tiri che entrerebbero senza l’intervento del
  portiere o di un difensore sulla linea.</p>
  <p><strong>Possesso palla</strong> — La percentuale di tempo con il pallone tra i piedi.
  Da sola non dice chi ha giocato meglio: molte squadre vincono con il 35 per cento.</p>
  <p><strong>Duelli e contrasti</strong> — Gli uno contro uno vinti, a terra e in aria.</p>
  <p><strong>Clean sheet</strong> — La porta inviolata: una partita senza gol subiti.</p>
  <p><strong>Assist</strong> — L’ultimo passaggio prima del gol.</p>

  <h2 class="display">Squadre e competizioni</h2>
  <p><strong>Differenza reti</strong> — Gol fatti meno gol subiti. Serve a separare due
  squadre a pari punti, in molti campionati prima degli scontri diretti.</p>
  <p><strong>Scontri diretti</strong> — I risultati fra le squadre a pari punti. In Italia
  contano prima della differenza reti, in Inghilterra e Spagna no (in Inghilterra vale la
  differenza reti, in Spagna gli scontri diretti).</p>
  <p><strong>Play-off e play-out</strong> — Spareggi di fine stagione per salire di
  categoria o per non scendere.</p>
  <p><strong>Derby</strong> — La partita fra due squadre della stessa città o della stessa
  zona. Vale tre punti come le altre e pesa il doppio.</p>
  <p><strong>Vivaio (o settore giovanile)</strong> — Le squadre giovanili di un club.
  Un giocatore <em>cresciuto nel vivaio</em> conta anche nelle liste che molte
  competizioni impongono.</p>

  <h2 class="display">Mercato e contratti</h2>
  <p><strong>Cartellino</strong> — Quanto un club paga a un altro club per prendere un
  giocatore sotto contratto. <strong>Ingaggio</strong> — Quanto guadagna il giocatore.</p>
  <p><strong>Parametro zero</strong> — Giocatore con il contratto scaduto: si prende
  senza pagare niente al club di prima.</p>
  <p><strong>Clausola rescissoria</strong> — La cifra che, se pagata, permette di
  prendere il giocatore anche se il club non vuole venderlo.</p>
  <p><strong>Prestito con diritto o con obbligo di riscatto</strong> — Chi riceve il
  giocatore può, oppure deve, comprarlo a fine prestito.</p>
  <p><strong>Ammortamento</strong> — Il costo del cartellino spalmato sugli anni di
  contratto, che è il modo in cui pesa sul bilancio.</p>
  <p><strong>Procuratore</strong> — Chi cura gli interessi del giocatore e tratta
  l’ingaggio; prende una commissione sull’operazione.</p>
  <p>Il quadro completo, con i numeri, è in
  <a href="/calciomercato-come-funziona">Come funziona davvero il calciomercato</a>.</p>

  <h2 class="display">Parole che si sentono in telecronaca</h2>
  <p><strong>Cucchiaio</strong> — Il pallonetto morbido sul portiere, di solito su rigore.
  <strong>Tunnel</strong> — Far passare la palla fra le gambe dell’avversario.
  <strong>Sombrero</strong> — Scavalcare l’avversario con un tocco alto.
  <strong>Catenaccio</strong> — Difendere bassi e in tanti, colpendo in ripartenza.
  <strong>Melina</strong> — Far girare la palla per far passare il tempo.
  <strong>Tiki-taka</strong> — Il possesso fatto di passaggi corti e continui.</p>`,
  },
  {
    slug: 'ruoli-calcio',
    title: 'I ruoli nel calcio e i numeri di maglia',
    description: 'Che cosa fa davvero un terzino, un mediano, un trequartista o un falso nove, e perché il numero sulla maglia non dice quasi più niente. Guida ai ruoli del calcio moderno.',
    lead: 'Undici giocatori, otto ruoli e una quantità di nomi che cambiano da paese a paese. Qui c’è cosa fa ognuno, in campo, quando la palla ce l’ha la sua squadra e quando ce l’hanno gli altri.',
    priority: '0.7',
    body: `
  <h2 class="display">Il portiere</h2>
  <p>È l’unico che può usare le mani, e da vent’anni è anche il primo che imposta.
  Un portiere moderno viene giudicato su tre cose diverse fra loro: le parate, le
  uscite (alte, sui cross, e basse, sui palloni filtranti) e i piedi. Le squadre
  che vogliono far uscire il pallone da dietro gli chiedono di ricevere spalle
  alla porta e di saltare la prima linea di pressing con un passaggio: è il motivo
  per cui oggi un portiere che para benissimo ma sbaglia l’appoggio corto fatica a
  trovare posto in certe squadre.</p>

  <h2 class="display">I difensori</h2>
  <p><strong>Il difensore centrale</strong> gioca al centro della linea. Nei sistemi
  a quattro sono due e si dividono i compiti: uno marca la punta, l’altro copre lo
  spazio alle sue spalle. In una difesa a tre il centrale di destra e quello di
  sinistra escono spesso sul portatore, mentre quello in mezzo resta a proteggere.
  Le doti che contano sono il tempo dell’anticipo, il colpo di testa, la velocità
  quando la squadra difende alta e — di nuovo — il piede, perché è da lì che parte
  la costruzione.</p>
  <p><strong>Il terzino</strong> parte largo, difende sulla fascia e attacca la
  stessa fascia quando la squadra ha il pallone. Negli ultimi anni ne sono nate due
  varianti: il terzino che si accentra a centrocampo per dare una linea di passaggio
  in più, e il terzino che resta bassissimo per formare una difesa a tre in fase di
  costruzione. Il <em>quinto</em> è la stessa idea portata all’estremo: nei sistemi
  a tre difensori corre tutta la fascia, dal fondo campo alla bandierina avversaria,
  ed è il ruolo che chiede più fiato di tutti.</p>

  <h2 class="display">I centrocampisti</h2>
  <p><strong>Il mediano</strong> gioca davanti alla difesa. Il suo lavoro si vede
  poco: chiude la linea di passaggio verso il trequartista avversario, scala per
  coprire il terzino salito, recupera il secondo pallone dopo un contrasto. Se la
  squadra imposta da dietro è anche il primo regista, quello che riceve dal centrale
  e gira il gioco da una parte all’altra.</p>
  <p><strong>La mezzala</strong> è il centrocampista che copre più campo in verticale:
  rientra a dare una mano in difesa e arriva in area a chiudere l’azione. Le mezzale
  che segnano otto o dieci gol a stagione sono fra i giocatori più cercati sul mercato,
  perché arrivare in area partendo da lontano è la cosa più difficile da marcare.</p>
  <p><strong>Il trequartista</strong> gioca fra il centrocampo e la difesa avversaria,
  nello spazio che i difensori non vogliono lasciare e i centrocampisti non riescono a
  coprire. È il ruolo più cambiato dagli anni Novanta a oggi: quando le squadre hanno
  iniziato a pressare a uomo su tutto il campo, il trequartista fermo è sparito, e al
  suo posto sono arrivati giocatori che partono larghi e si accentrano.</p>

  <h2 class="display">Gli attaccanti</h2>
  <p><strong>L’ala</strong> parte larga e punta l’uomo. Se gioca sul piede opposto
  (il destro a sinistra, il mancino a destra) rientra verso il centro per calciare;
  se gioca sul suo piede, va sul fondo e mette il cross. Sono due mestieri diversi e
  vanno letti come tali: al primo si chiedono gol, al secondo assist.</p>
  <p><strong>La punta</strong> è chi finisce l’azione. C’è il centravanti d’area, che
  vive di posizione e colpo di testa; la punta che attacca lo spazio alle spalle della
  difesa; il centravanti che viene incontro, riceve e fa salire la squadra. Il
  <em>falso nove</em> non è un ruolo ma un movimento: un attaccante che lascia l’area
  e si abbassa a centrocampo, così il difensore che lo marca deve scegliere se
  seguirlo — e lasciare un buco — o mollarlo.</p>

  <h2 class="display">I numeri di maglia</h2>
  <p>Per decenni il numero indicava il posto in campo: 1 portiere, 2 e 3 terzini, 4 e 5
  al centro, 6 mediano, 7 e 11 ali, 8 mezzala, 9 centravanti, 10 fantasista. Dal 1993
  in Italia i numeri sono personali e si portano per tutta la stagione: da lì in poi la
  corrispondenza si è sciolta, e oggi un 10 può giocare largo a sinistra e un 5 può
  essere un mediano.</p>
  <p>Restano però le abitudini nazionali, ed è utile conoscerle quando si legge una
  formazione straniera: in Spagna e in Sudamerica il 5 è quasi sempre il mediano
  davanti alla difesa, in Inghilterra è un centrale; in Olanda il 4 e il 3 sono i due
  centrali; il 6 in Brasile è il terzino sinistro, in Europa il centrocampista
  davanti alla difesa.</p>

  <h2 class="display">Perché serve saperlo, qui</h2>
  <p>In <a href="/allenatore-calcio">Allenatore</a> ogni giocatore ha un ruolo preciso e
  rende meno se lo metti fuori posto: un’ala adattata a terzino difende peggio di un
  terzino vero, e un mediano schierato da trequartista tocca meno palloni. In
  <a href="/quiz-rosa-squadra">La Rosa</a> i ruoli servono a ricordarsi chi manca: quando
  ti blocchi, conta i difensori che hai già scritto. E in
  <a href="/asta-calcio">Asta</a> il ruolo è quello che decide il prezzo: i portieri
  costano poco, le punte che segnano costano sempre troppo.</p>`,
  },
  {
    slug: 'moduli-calcio',
    title: 'I moduli del calcio spiegati uno per uno',
    description: '4-3-3, 4-2-3-1, 3-5-2, 4-4-2: cosa cambia davvero fra un modulo e l’altro, quali giocatori servono e dove ognuno lascia scoperto il campo.',
    lead: 'Un modulo non è una formazione: è il modo in cui undici giocatori si dividono il campo. Ecco i più usati, cosa chiedono alla rosa e dove si rompono.',
    priority: '0.7',
    body: `
  <h2 class="display">Prima una premessa</h2>
  <p>I numeri di un modulo descrivono la squadra ferma, e una squadra ferma non esiste
  mai. La stessa formazione può difendere a 4-4-2 e attaccare a 3-2-5, perché i terzini
  salgono e un mediano scende fra i centrali. Per questo, quando si guarda una partita,
  contano più due domande che il nome del sistema: quanti giocatori ci sono fra le due
  linee avversarie, e chi copre lo spazio che si apre quando la squadra attacca.</p>

  <h2 class="display">4-3-3</h2>
  <p>Quattro difensori, tre centrocampisti, tre attaccanti. È il sistema che occupa
  meglio il campo in larghezza: le due ali tengono i terzini avversari inchiodati, il
  centravanti fissa i centrali, le mezzale attaccano gli spazi che si aprono in mezzo.
  Chiede un mediano di livello — resta solo davanti alla difesa quando le mezzale salgono —
  e ali che difendano, altrimenti i terzini restano uno contro uno per novanta minuti.
  È il modulo che ha vinto di più negli ultimi vent’anni, ed è anche il più esigente:
  senza qualità in mezzo diventa una squadra lunga e spezzata in due.</p>

  <h2 class="display">4-2-3-1</h2>
  <p>La variante più diffusa del calcio europeo. I due mediani si coprono a vicenda:
  uno può uscire in pressione perché l’altro resta. Davanti, tre giocatori offensivi
  dietro un centravanti, con il trequartista centrale che lavora sul mediano avversario.
  È solido per natura e semplice da insegnare, ma dipende tutto dal centravanti: se non
  tiene palla, la squadra non riesce a salire e i tre dietro di lui restano tagliati fuori.</p>

  <h2 class="display">4-4-2</h2>
  <p>Il sistema più vecchio ancora in uso, e non per nostalgia: due linee da quattro
  coprono il campo in modo ordinato e non lasciano corridoi facili. Due punte vicine si
  aiutano e mettono in difficoltà una difesa a due centrali. Il prezzo lo paga il
  centrocampo, dove in due si perde il confronto contro chi ne schiera tre: per questo
  le squadre che lo usano difendono più basse e cercano di vincere le seconde palle
  invece del possesso.</p>

  <h2 class="display">3-5-2 e 5-3-2</h2>
  <p>Sono lo stesso sistema visto in due momenti diversi: con la palla i due esterni
  salgono e diventa 3-5-2, senza palla scendono e diventa 5-3-2. Tre centrali coprono
  l’area e permettono di uscire sul portatore senza restare scoperti; i due esterni
  fanno tutta la fascia. È il modulo che chiede il fisico migliore della rosa: se i
  quinti non reggono i novanta minuti, la squadra si schiaccia e passa la partita
  nella propria metà campo.</p>

  <h2 class="display">3-4-3</h2>
  <p>Tre dietro, due mediani, due esterni e tre davanti. Copre il campo in larghezza
  come pochi altri e permette di attaccare con sette uomini, ma lascia solo due
  centrocampisti centrali: contro chi ne ha tre bisogna vincere i duelli o accettare
  di essere superati in mezzo. Funziona benissimo con una squadra che pressa alta,
  malissimo con una che difende bassa.</p>

  <h2 class="display">4-3-1-2 e il rombo</h2>
  <p>Il rombo a centrocampo (mediano, due mezzali, trequartista) riempie il centro del
  campo e mette il trequartista in una zona che le difese fanno fatica a coprire. In
  cambio rinuncia alle ali, e quindi alla larghezza: i terzini devono salire sempre,
  ed è la loro corsa a decidere se il sistema funziona. Contro squadre che attaccano
  sulle fasce diventa fragile.</p>

  <h2 class="display">Come si sceglie</h2>
  <p>Un modulo si sceglie a partire dai giocatori che hai, non al contrario. Tre domande
  bastano quasi sempre: hai due centrali veloci che difendono lo spazio, o due forti
  nell’area? Hai ali capaci di saltare l’uomo? Hai un mediano che regge il campo da solo?
  Chi ha un mediano dominante può permettersi tre attaccanti; chi non ce l’ha farà meglio
  con due mediani e un trequartista.</p>
  <p>La seconda regola è che il modulo si cambia anche a partita in corso. Si passa a due
  punte quando serve un gol e la squadra avversaria difende bassa; si passa a cinque
  dietro quando si è avanti e l’avversario spinge sulle fasce; si accetta di perdere il
  centrocampo quando la partita è diventata una serie di lanci e di duelli aerei.</p>

  <h2 class="display">Provarli</h2>
  <p>In <a href="/allenatore-calcio">Allenatore</a> ci sono nove moduli e dodici stili di
  gioco, e l’effetto si sente davvero nel motore della partita: il possesso, le occasioni
  create e concesse, la fatica dei giocatori cambiano insieme alla scelta. La familiarità
  con lo stile cresce allenandolo, quindi cambiare sistema ogni settimana costa: la
  squadra ci mette qualche giornata a capirlo.</p>`,
  },
  {
    slug: 'come-si-gioca',
    title: 'Come si gioca',
    description: 'Le regole delle dieci modalità di NOVANTA: La Rosa, Rigori, Asta, Più o Meno, Carriera, Allenatore, Chi è?, Catena, Impostore e Il Novantesimo.',
    lead: 'Dieci modalità, da soli o in compagnia. Nessuna dura più di qualche minuto, a parte Carriera e Allenatore.',
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

  <h2 class="display"><a href="/allenatore-calcio">Allenatore</a></h2>
  <p>Scegli un club vero di dieci campionati, con la rosa di oggi, e uno dei dodici
  stili di gioco. Prepari formazione e tattica, giochi le partite minuto per minuto
  e decidi nei momenti che cambiano un risultato; dopo ogni giornata la classifica
  si aggiorna. Sul mercato tratti con il club, con il giocatore e il suo procuratore,
  e le visite mediche possono far saltare tutto. I giovani crescono se giocano, i
  veterani calano, e centinaia di decisioni su spogliatoio, stampa e società hanno
  conseguenze. Se i risultati non arrivano, la dirigenza ti esonera.</p>

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

  <h2 class="display">Com’è fatto il gioco</h2>
  <p>NOVANTA è un sito, non un’app da scaricare: si apre nel browser e funziona allo
  stesso modo sul telefono, sul tablet e sul computer. Chi vuole può aggiungerlo alla
  schermata Home e da lì si apre a tutto schermo, senza barra del browser; dopo la prima
  visita molte parti restano disponibili anche se la rete cade a metà partita.</p>
  <p>Dietro le quinte ci sono due cose: i cataloghi e il motore. I cataloghi sono le
  carriere dei giocatori, le rose delle stagioni, le convocazioni ai tornei; vengono da
  Wikipedia, che è pubblica e verificabile, e passano da una serie di controlli automatici
  che scartano quello che non torna. Il motore è quello che trasforma i dati in partite:
  le domande del quiz, le aste, la simulazione minuto per minuto delle due carriere.</p>
  <p>Tutto quello che il gioco calcola è ripetibile: a parità di partenza, la stessa
  partita dà lo stesso risultato. Non è un dettaglio da programmatori — è la ragione per
  cui una carriera salvata si può riprendere mesi dopo e ritrovare esattamente il mondo
  che avevi lasciato.</p>

  <h2 class="display">Cosa non facciamo</h2>
  <ul>
    <li><strong>Niente account.</strong> Non chiediamo email, non mandiamo newsletter e
    non abbiamo un database di utenti: i tuoi record vivono nel tuo browser.</li>
    <li><strong>Niente pagamenti.</strong> Non ci sono acquisti dentro il gioco, monete
    da comprare, abbonamenti o contenuti chiusi dietro un prezzo.</li>
    <li><strong>Niente classifiche mondiali.</strong> Ci interessa la sfida fra amici,
    non una graduatoria globale che spinge a giocare per forza.</li>
    <li><strong>Niente foto e niente marchi.</strong> Usiamo i nomi, che sono fatti, e
    colori disegnati da noi.</li>
  </ul>

  <h2 class="display">Indipendenti</h2>
  <p>NOVANTA non è affiliato a nessun club, lega, federazione o sponsor. Il progetto si
  sostiene con la pubblicità, che compare fra una partita e l’altra, e con chi decide di
  offrirci un caffè. Nessun inserzionista decide cosa finisce nel gioco: se una squadra
  manca è perché mancano i dati, non perché qualcuno ha pagato.</p>

  <h2 class="display">Le lingue</h2>
  <p>Il gioco è tradotto in italiano, inglese, spagnolo, francese, tedesco e portoghese,
  comprese le centinaia di situazioni che si incontrano nelle due carriere. Le pagine di
  testo, per ora, sono in italiano: le traduciamo man mano.</p>

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
