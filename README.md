# NOVANTA

Un gioco di calcio per il web. Nove modalità, nessun bundler, nessuna dipendenza.

- **La Rosa** — novanta secondi per nominare più giocatori possibili di una rosa:
  quasi duemila fra club stagione per stagione e nazionali a Mondiali, Europei e
  Copa América, estratte a caso. A tempo scaduto i mancati restano nella griglia.
- **Rigori** — un tiro alla volta, una vita sola, un portiere che impara da te.
  Palo e traversa hanno il loro suono e la palla rimbalza davvero sul legno.
- **Asta** — venti crediti per un quintetto, pescati a caso fra campioni, comprimari
  e giocatori di mezzo su un catalogo di oltre quattromilaseicento giocatori. Contro
  l'avversario del computer o in due sullo stesso telefono, ognuno col suo nome.
- **Più o Meno** — due giocatori, un dato, chi ne ha di più? Duemila giocatori e
  ventidue parametri; al primo errore la catena si spezza.
- **Carriera** — dai sedici anni al ritiro, con il ruolo che decide doti e numeri,
  l'allenamento, tre scelte ogni stagione, coppe europee guadagnate in classifica,
  nazionale e grandi tornei per chi viene dalle dieci nazionali più forti.
- **Chi è?** — la scheda di una carriera vera senza il nome, cinque vite, la ricerca
  che suggerisce mentre scrivi.
- **Catena** — squadra, giocatore, squadra: quaranta secondi a mossa, da soli o
  fino a dieci passandosi il telefono.
- **Impostore** — da tre a dieci persone, un telefono, un calciatore che tutti
  conoscono tranne uno.
- **Il Novantesimo** — cinque round, la stessa sfida per tutti nel mondo, generata dalla data.

Interfaccia in italiano, inglese, spagnolo, francese, tedesco e portoghese
(anche gli eventi della Carriera). Le pagine di testo sono in italiano. Tutti i
progressi restano nel browser dell'utente.

## Far partire il gioco

```bash
python3 serve.py
```

Poi apri <http://localhost:8080>. Il server di sviluppo vieta la cache: senza
bundler, un modulo memorizzato dal browser significa collaudare la versione di ieri.

Non serve installare niente. Il gioco è HTML, CSS e moduli ES nativi.

## Collaudo

```bash
for t in test/*.test.mjs; do node "$t" || break; done
```

- `match.test.mjs` — il riconoscimento dei nomi: accenti, alias, refusi, omonimi.
- `daily.test.mjs` — la sfida quotidiana è identica per tutti e mai ambigua, per 365 giorni.
- `arcade.test.mjs` — il tiro parte sempre, il portiere è difficile ma corretto,
  e la difficoltà cresce davvero.
- `duel.test.mjs` — nessuna domanda ambigua su trentaseimila confronti, e tutti i
  parametri escono.
- `asta.test.mjs` — nessuna rosa resta incompleta, i crediti tornano sempre, chi compra
  meglio vince più spesso, e in uno stesso ruolo possono uscire due forti,
  due deboli o uno e uno.
- `carriera.test.mjs` — mille carriere simulate: numeri coerenti col ruolo e con gli
  eventi, coppe solo se conquistate, infortuni che tolgono partite, tre scelte fino
  all'ultima stagione, e trecento carriere con le stesse scelte tutte diverse.
- `rosa.test.mjs` — ogni rosa del catalogo esiste, è giocabile e ogni nome si trova.
- `i18n.test.mjs` — le sei lingue hanno le stesse chiavi e gli stessi segnaposto,
  e ogni chiave usata nel codice esiste.

Scorciatoie di sviluppo, tutte attive solo su localhost:

| Indirizzo | Cosa fa |
|---|---|
| `#/squad?team=milan-2007&secs=10` | round de La Rosa da dieci secondi su una rosa scelta |
| `#/asta?bid=400` | rilancio accorciato, per arrivare in fondo all'asta in fretta |
| `#/asta?skip=1` | assegna le rose e salta al tabellino, per collaudare la partita |

## Rigenerare i dati

I cataloghi vengono da Wikipedia (licenza CC BY-SA 4.0), letta con la sua API
pubblica. Le risposte restano in `tools/wiki/cache/`, che non si pubblica.

```bash
node tools/wiki/candidates.mjs && node tools/wiki/rank.mjs
node tools/wiki/players.mjs 6000 && node tools/wiki/clubs.mjs && node tools/wiki/build.mjs
node tools/wiki/squads.mjs && node tools/wiki/seasons.mjs && node tools/wiki/rosa.mjs
node tools/wiki/auction.mjs && node tools/wiki/duel.mjs
node tools/career/build-events.mjs && node tools/pages/build.mjs
```

## Struttura

```
index.html            guscio della pagina
serve.py              server di sviluppo senza cache
src/core/             router, stato, memoria, lingue, seme del giorno, riconoscimento nomi
src/scenes/           una scena per modalità, più l'ingresso
src/rounds/           i round della sfida quotidiana
src/arcade/           portiere, rigorista, tiro, rete, disegno, esito
src/auction/          regole dell'asta, cervello del bot, simulazione della partita
src/career/           giocatore, stagione, eventi, nazioni, filo della carriera, trofei
src/players/          catalogo Wikipedia, scheda del giocatore, nomi di ruoli e coppe
src/duel/             parametri del confronto e regola dello scarto
src/ui/               componenti, bandiere, ricerca, partecipanti, condivisione
src/ads/              adattatore pubblicitario (stub in sviluppo, AdSense in produzione)
src/consent/          consenso: banner di sviluppo e piattaforma certificata di Google
sw.js                 service worker: installabile sulla Home, regge se cade la rete
*.html                pagine di testo, generate da tools/pages/
ads.txt               chi può vendere la pubblicità del sito
sitemap.xml           mappa per i motori di ricerca, generata insieme alle pagine
tools/wiki/           dai dati di Wikipedia ai cataloghi del gioco
tools/career/         eventi della Carriera nelle sei lingue
tools/pages/          testo e impaginazione delle pagine statiche
data/players/         5.442 carriere: indice leggero e schede a pezzi
data/rosa/            1.941 rose: indice e pezzi da cento
data/auction.json     4.646 giocatori con ruolo e voto
data/duel.json        2.031 giocatori con i dati del confronto
data/career/          eventi della Carriera (logica e testi per lingua)
data/clubs.json       243 club da 66 paesi, con fascia, codice e livello del campionato
data/squads.json      32 rose curate a mano, per Il Novantesimo
i18n/                 sei lingue
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
| "Mi arrendo" in Chi è? | pausa breve | L'utente chiede la risposta: un annuncio se c'è, poi la risposta in ogni caso. |
| Giocatore successivo in Chi è? | interstitial, una volta su quattro | Fra una scheda e l'altra. |
| Fine stagione in Carriera | interstitial, una volta su tre | Fra il resoconto e il mercato. |
| Nuovo round di Impostore o nuova Catena | interstitial, una volta su tre | A gruppo fermo, fra una partita e l'altra. |
| In fondo all'ingresso | display | Un solo riquadro, sotto le modalità, con lo spazio riservato. |

Nei primi due minuti di una visita non compare nessun interstitial.

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
https://instascope.app
```

Non è un dettaglio estetico. È il motivo per cui un gioco come questo si
diffonde senza comprare pubblicità, ed è la ragione per cui la griglia non
rivela mai le risposte a chi deve ancora giocare.

Il codice sta tutto in `src/ui/share.js`, e tutte le modalità lo usano nello
stesso modo.

## Contenuti e diritti

Nessuna fotografia, nessuno stemma, nessuna maglia. Le squadre sono rappresentate
da fasce di colore astratte, i giocatori solo dal nome. I dati vengono da Wikipedia
e passano per controlli automatici. Il vincolo è diventato lo stile: è la ragione per cui il gioco
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

Si comincia a sedici anni scegliendo chi si è: nome, ruolo toccando il 4-3-3,
stile, idolo d'infanzia fra cinque per ruolo, numero e nazione con bandiera.
Ogni ruolo ha le sue sei doti: un portiere lavora su riflessi, presa, uscite e
rinvio, e a fine anno conta porte inviolate e rigori parati, non gol.

Ogni stagione: l'allenamento su una dote (più anni di fila, più cresce), tre
decisioni fra ruolo, vita e nazionale, da zero a due imprevisti, la stagione
simulata e il mercato. Gli eventi lasciano segni misurabili (doti, fiducia
dell'allenatore, minuti, rischio d'infortunio) e quello che raccontano compare nei
numeri: se un evento parla di dieci partite a secco, il resoconto non dirà zero
presenze. Le coppe europee si giocano solo con la classifica dell'anno prima, un
infortunio di due mesi toglie due mesi di partite, il ritiro arriva con l'età.

Il motore sta in `src/career/` senza DOM; la scena e i test usano lo stesso filo
(`runner.js`), così quello che si collauda è quello che si gioca.

## Più o Meno

Due giocatori, un dato in mezzo, e una domanda sola: chi ne ha di più? Chi vince
resta in campo e affronta il prossimo.

Centoundici giocatori hanno i totali di tutte le competizioni scritti a mano
(`tools/wiki/duel-manual.json`); gli altri arrivano da Wikipedia con i numeri che
l'infobox certifica: presenze e gol in campionato, presenze e gol in nazionale,
club, prestiti, anni da professionista, altezza, trofei. Le chiavi sono separate:
un gol in campionato non si confronta mai con un gol in carriera, e un totale con
un dato mancante non viene usato.

Il gioco non chiede mai quanto vale un dato: propone una coppia solo quando lo
scarto supera una soglia sia in percentuale sia in valore assoluto. Trentaseimila
confronti simulati lo verificano a ogni esecuzione dei test.
