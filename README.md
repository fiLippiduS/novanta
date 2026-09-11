# NOVANTA

Un gioco di calcio per il web. Sei modalità, nessun bundler, nessuna dipendenza.

- **La Rosa** — novanta secondi per nominare più giocatori possibili di una squadra.
- **Rigori** — un tiro alla volta, una vita sola, un portiere che impara da te.
- **Più o Meno** — due giocatori veri, un dato in mezzo, e una domanda sola:
  chi ha fatto di più? Si sbaglia una volta e la catena si spezza.
- **Asta** — venti crediti contro un bot che sa di calcio: costruisci il quintetto
  e giocati la partita, quaranta minuti che scorrono con gol, ammonizioni ed espulsioni.
  Se finisce pari, si va ai rigori e si vedono tirare uno per uno.
- **Carriera** — da sedicenne in una squadra di provincia fino al ritiro: una scelta
  all'anno, gli imprevisti che capitano, e una bacheca che si riempie o resta vuota.
- **Il Novantesimo** — cinque round, la stessa sfida per tutti nel mondo, generata dalla data.

Interfaccia in italiano e inglese. Tutti i progressi restano nel browser dell'utente.

## Far partire il gioco

```bash
python3 serve.py
```

Poi apri <http://localhost:8080>. Il server di sviluppo vieta la cache: senza
bundler, un modulo memorizzato dal browser significa collaudare la versione di ieri.

Non serve installare niente. Il gioco è HTML, CSS e moduli ES nativi.

## Collaudo

```bash
for t in match daily arcade duel asta carriera; do node test/$t.test.mjs || break; done
```

- `match.test.mjs` — il riconoscimento dei nomi: accenti, alias, refusi, omonimi.
- `daily.test.mjs` — la sfida quotidiana è identica per tutti e mai ambigua, per 365 giorni.
- `arcade.test.mjs` — il tiro parte sempre, il portiere è difficile ma corretto,
  e la difficoltà cresce davvero.
- `duel.test.mjs` — nessuna domanda ambigua su trentaseimila confronti, e i quindici
  parametri escono tutti.
- `asta.test.mjs` — nessuna rosa resta incompleta, i crediti tornano sempre, e chi compra
  meglio vince più spesso.
- `carriera.test.mjs` — mille carriere simulate: nessun numero assurdo, il ruolo conta,
  la squadra conta, e da giovani si cresce.

Scorciatoie di sviluppo, tutte attive solo su localhost:

| Indirizzo | Cosa fa |
|---|---|
| `#/squad?team=milan-1994&secs=10` | round de La Rosa da dieci secondi su una squadra scelta |
| `#/asta?bid=400` | rilancio accorciato, per arrivare in fondo all'asta in fretta |
| `#/asta?skip=1` | assegna le rose e salta al tabellino, per collaudare la partita |

## Struttura

```
index.html            guscio della pagina
serve.py              server di sviluppo senza cache
src/core/             router, stato, memoria, seme del giorno, riconoscimento nomi
src/scenes/           hub, squad, arcade, daily
src/rounds/           i round della sfida quotidiana
src/arcade/           portiere, rigorista, tiro, rete, disegno, esito
src/auction/          regole dell'asta, cervello del bot, simulazione della partita
src/career/           giocatore, stagione, eventi, sagome dei trofei
src/duel/             parametri del confronto e regola dello scarto
src/ui/               movimento, componenti, contatore, telecronaca
src/ads/              adattatore pubblicitario (stub in sviluppo, AdSense in produzione)
src/consent/          consenso: banner di sviluppo e piattaforma certificata di Google
src/ui/share.js       il risultato da mandare a un amico, uguale in tutte le modalità
sw.js                 service worker: installabile sulla Home, regge se cade la rete
manifest.webmanifest  nome, icone e colori quando il gioco vive fuori dal browser
come-si-gioca.html    le regole delle sei modalità
dati.html             da dove vengono giocatori e statistiche
404.html              pagina di errore
ads.txt               chi può vendere la pubblicità del sito
sitemap.xml           mappa per i motori di ricerca
tools/                generatore delle immagini di anteprima, non si pubblica
data/squads.json      32 rose curate a mano, 743 giocatori
data/auction.json     114 giocatori con ruolo e voto, per l'asta
data/clubs.json       243 club da 66 paesi, con fascia e colori
data/duel.json        111 giocatori veri con quindici dati di carriera
data/events.json      47 fra scelte e imprevisti, in due lingue
i18n/                 italiano e inglese
styles/               token di design e fogli per scena
test/                 collaudo senza browser
_headers              cache e sicurezza per Cloudflare Pages
```

## Pubblicità

Il gioco parla solo con `src/ads/adapter.js`. Sotto può esserci lo stub di
sviluppo o l'SDK vero, e la logica di gioco non cambia mai.

Per andare in produzione:

1. Ottieni l'approvazione AdSense per il dominio. Servono contenuto originale
   online, una privacy policy e i termini di servizio: `privacy.html` e
   `terms.html` sono già pronti.
2. Attiva **H5 Games Ads** sull'account AdSense. È la variante per i giochi web,
   ed è l'unica che dà interstitial e rewarded video.
3. Scrivi il tuo ID publisher in `src/ads/config.js`. Da quel momento
   l'adattatore carica l'SDK vero al posto dello stub.
4. Verifica lo snippet corrente sulla documentazione AdSense: cambia nel tempo.
5. Crea il messaggio di consenso dal pannello AdSense, alla voce Privacy e
   messaggi: è la piattaforma certificata IAB TCF che Google pretende per il
   traffico europeo. `src/consent/google-cmp.js` la carica da sola appena c'è un
   ID publisher, e il banner di sviluppo si fa da parte.
6. Incolla il codice editore in `ads.txt` e togli il cancelletto dalla riga
   d'esempio. Senza quel file gran parte degli acquirenti non fa offerte.

Dove compaiono gli annunci, e perché lì:

| Punto | Formato | Motivo |
|---|---|---|
| Fine partita ai Rigori | rewarded | Il momento in cui l'utente *vuole* vedere un annuncio: gli ridà la partita. |
| Scaduto il tempo de La Rosa | rewarded | Trenta secondi in più quando la voglia di riprovare è massima. |
| Ultimo terzo de La Rosa | rewarded | Le iniziali di un giocatore che manca, chieste dall'utente. |
| Catena spezzata in Più o Meno | rewarded | Riprendere da dove si era arrivati, dopo una catena lunga. |
| Prima dell'Asta | rewarded | Il taccuino dell'osservatore: fin dove si spinge il bot. Un vantaggio di informazione, non di risorse: il bilanciamento resta intatto. |
| Fra asta e partita | interstitial | Rottura naturale, il momento in cui l'utente si aspetta una pausa. |
| Cambio squadra o riavvio | interstitial | Rottura naturale, mai durante un input. |

Un interstitial non parte mai due volte entro novanta secondi, e nella maggior
parte dei punti compare una volta ogni due o tre passaggi, non tutte. La regola
che ho seguito: la pubblicità sta dove l'utente si sta già fermando da solo, e
mai dove sta prendendo una decisione o riavviando di slancio. Il rewarded invece
lo chiede lui, e per questo non dà fastidio mai.

Il gioco continua comunque se la pubblicità non carica.

## Il risultato da condividere

Ogni partita finisce con un bottone che copia il risultato in una griglia di
quadretti: il nome della modalità, la riga di simboli, i numeri, il link. Sul
telefono si apre il foglio di condivisione del sistema, sul computer finisce
negli appunti.

```
NOVANTA · RIGORI
⚽⚽⚽🧤
3 gol segnati · record 7
https://novanta.game
```

Non è un dettaglio estetico. È il motivo per cui un gioco come questo si
diffonde senza comprare pubblicità, ed è la ragione per cui la griglia non
rivela mai le risposte a chi deve ancora giocare.

Il codice sta tutto in `src/ui/share.js`, e le sei modalità lo usano nello
stesso modo.

## Contenuti e diritti

Nessuna fotografia, nessuno stemma, nessuna maglia. Le squadre sono rappresentate
da fasce di colore astratte, i giocatori solo dal nome. I dati sono fatti pubblici
verificati a mano. Il vincolo è diventato lo stile: è la ragione per cui il gioco
non somiglia agli altri.


## L'Asta, e come diventerà online

Il motore in `src/auction/` non tocca il DOM: sa solo di lotti, crediti e regole.
Chi rilancia è deciso da `bot.js`, che valuta il giocatore, conta i posti che gli
restano e non si fa portare via l'ultimo attaccante per un credito.

I lotti sono esattamente due per ogni posto da riempire. È questo, e non un
controllo a posteriori, a garantire che nessuno arrivi in fondo con una casella
vuota: quando un partecipante ha già chiuso un ruolo l'altro se lo aggiudica al
prezzo minimo, ma l'assegnazione si vede lo stesso, con la carta e il cronometro
come tutte le altre.

Il tetto di offerta segue due vincoli e vale il più stretto: deve restare almeno
un credito per ogni posto libero, e non si può intaccare la riserva degli altri
posti. Con venti crediti e cinque ruoli si parte da un tetto di dodici, non di
venti: spendere forte su un giocatore si paga davvero sugli altri quattro, ed è
lì che l'asta diventa una scelta invece di una corsa. Il tetto è sempre scritto
sulla carta, così non ci si trova il pulsante spento senza capire perché.

La partita non è un risultato estratto in blocco: i quaranta minuti scorrono uno
per uno e gli avvenimenti compaiono quando l'orologio li raggiunge. Un'espulsione
al dodicesimo indebolisce davvero la squadra per il resto della gara, perché la
forza viene ricalcolata a ogni cambio di uomini in campo.

Per giocare contro una persona vera tramite link di invito servirebbe un server:
anche una connessione diretta fra due browser ha bisogno di qualcuno che li metta
in contatto. La strada più leggera è un relay su Cloudflare Workers con Durable
Objects, un centinaio di righe. Il lavoro sul client sarebbe minimo, perché
basterebbe sostituire chi decide i rilanci: il resto del motore resta identico.

Una modalità solo online al lancio però è una stanza vuota, perché senza utenti
non si trova un avversario. Il bot serve anche a questo.

## Pubblicare su Cloudflare

La guida passo per passo, da qui a GitHub al tuo dominio, sta in
[DEPLOY.md](DEPLOY.md). Qui il riassunto.

Il gioco è fatto di file statici, quindi Cloudflare Pages lo serve senza alcuna
configurazione e senza costi. Se il dominio è già su Cloudflare, collegarlo è
questione di minuti.

Il file `_headers` è già nel progetto: Pages lo legge da solo e applica le
intestazioni di cache e di sicurezza.

**Con l'interfaccia web.** Su Cloudflare, sezione *Workers & Pages*, si crea un
progetto Pages. Se il codice sta su GitHub si collega il repository e ogni push
pubblica da solo; altrimenti si trascina la cartella del progetto nella schermata
di caricamento diretto. Cartella di output: la radice. Comando di build: nessuno.

**Da terminale**, se preferisci:

```bash
npx wrangler pages deploy . --project-name novanta
```

**Il dominio.** Nel progetto Pages, scheda *Custom domains*, si aggiunge il
dominio o un sottodominio. Se il dominio è già sul tuo account, il record DNS
viene creato in automatico e il certificato arriva in pochi minuti.

**Prima di collegare AdSense** serve che il sito sia raggiungibile sul dominio
vero, non sull'indirizzo `pages.dev`: Google verifica il dominio che gli dichiari.

Lo stesso account servirà anche per l'asta online, il giorno che la si vuole:
il relay fra i due browser sta su Workers con Durable Objects, sotto lo stesso
dominio, senza infrastruttura in più.

## La Carriera

Si comincia a sedici anni scegliendo chi si è: nome, ruolo fra i sette di un 4-3-3,
stile, numero e nazione. Lo stile non è un'etichetta: un rapace d'area e un falso
nueve hanno curve di crescita diverse e producono numeri diversi.

Tre squadre di bassa classifica ti vogliono. Da lì in poi ogni anno sono tre
decisioni, da zero a due imprevisti che non scegli, una stagione simulata e il
mercato. La bacheca si riempie di sagome: campionato, coppa, supercoppa, coppa
continentale, promozione, titolo con la nazionale. Vincere la propria divisione
con una squadra di provincia è una promozione, non uno scudetto, e viene contata
come tale.

I numeri sono tarati su mille carriere simulate. Un rapace di primo livello chiude
intorno ai trecento gol; un difensore centrale sotto i cinquanta; un portiere
arriva a più di duecento porte inviolate. Dieci anni in una grande valgono circa
quattro volte i trofei di dieci anni in provincia.


## Più o Meno

Due giocatori veri, un dato in mezzo, e una domanda sola: chi ha fatto di più?
Chi vince resta in campo e affronta il prossimo, così la catena scorre e non si
ferma finché non si sbaglia.

I quindici parametri girano a caso: gol, assist, presenze, trofei, presenze e gol
in nazionale, Champions, campionati, Palloni d'Oro, cartellini rossi, altezza,
numero di club, Mondiali giocati, gol nella miglior stagione e porte inviolate.

I numeri in `data/duel.json` sono totali di carriera largamente citati e
arrotondati, curati a mano. Il gioco però non chiede mai quanto vale un dato:
chiede solo quale dei due è maggiore, e propone una coppia soltanto quando lo
scarto supera una soglia sia in percentuale sia in valore assoluto. È questo a
rendere il confronto solido anche con cifre approssimate: ottocentosettanta gol
contro settecentosessanta è una domanda buona, novecento contro ottocentosettanta
non viene mai posta. Trentaseimila confronti simulati lo verificano a ogni
esecuzione dei test.
