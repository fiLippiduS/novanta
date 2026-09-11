# Portare NOVANTA online

Guida completa: dal Mac a GitHub, da GitHub a Cloudflare Pages, e infine il tuo
dominio. Tutti i comandi vanno dati nella cartella del progetto, quindi la prima
riga di ogni blocco ti ci porta.

Serve una cosa sola prima di cominciare: un account GitHub. Se non ce l'hai, si
crea in due minuti su <https://github.com/signup>.

---

## 1. Dire a git chi sei

Si fa una volta sola su questo Mac. Metti il tuo nome e l'email dell'account
GitHub.

```bash
git config --global user.name "Filippo"
```

```bash
git config --global user.email "morbidellifilippo211@gmail.com"
```

---

## 2. Creare il repository locale

```bash
cd /Users/filippidus_/Desktop/footballgame && git init -b main
```

Questo trasforma la cartella in un repository. Il file `.gitignore` è già nel
progetto e tiene fuori i file di sistema del Mac.

Ora il primo salvataggio:

```bash
cd /Users/filippidus_/Desktop/footballgame && git add . && git commit -m "NOVANTA: prima versione"
```

Se ti risponde che non sa chi sei, hai saltato il punto 1.

---

## 3. Creare il repository su GitHub

Vai su <https://github.com/new> e compila così:

| Campo | Cosa mettere |
|---|---|
| Repository name | `novanta` |
| Description | facoltativa |
| Public / Private | va bene entrambi, Cloudflare legge anche i privati |
| Add a README file | **lascia deselezionato** |
| Add .gitignore | **None** |
| Choose a license | **None** |

Le ultime tre voci vanno lasciate vuote perché quei file li abbiamo già: se li
crea anche GitHub, il primo invio va in conflitto.

Premi *Create repository*. La pagina che si apre mostra un indirizzo tipo
`https://github.com/tuonome/novanta.git`. Serve al passo dopo.

---

## 4. Mandare il codice su GitHub

Sostituisci `tuonome` con il tuo nome utente GitHub:

```bash
cd /Users/filippidus_/Desktop/footballgame && git remote add origin https://github.com/tuonome/novanta.git && git push -u origin main
```

Al primo invio GitHub chiede di autenticarti. Si apre il browser: accetta e
torna al terminale. Se invece ti chiede utente e password nel terminale, la
password normale non funziona più: serve un token. Si crea su
<https://github.com/settings/tokens> con *Generate new token (classic)*,
spuntando solo `repo`, e si incolla al posto della password.

Ricarica la pagina del repository: i file ci sono.

---

## 5. Cloudflare Pages

1. Entra su <https://dash.cloudflare.com> e apri **Compute (Workers & Pages)**
   nel menù a sinistra.
2. **Create application**, scheda **Pages**, poi **Connect to Git**.
3. Autorizza Cloudflare ad accedere a GitHub. Puoi dargli accesso a tutti i
   repository o solo a `novanta`: la seconda è più prudente.
4. Scegli `novanta` e premi **Begin setup**.
5. Compila la configurazione così:

| Campo | Valore |
|---|---|
| Project name | `novanta` |
| Production branch | `main` |
| Framework preset | **None** |
| Build command | **lascia vuoto** |
| Build output directory | `/` |

Il comando di build resta vuoto perché non c'è niente da compilare: il gioco è
già fatto di file che il browser capisce così come sono.

6. **Save and Deploy**. Dopo una ventina di secondi il sito è online su un
   indirizzo tipo `novanta-x1y.pages.dev`. Aprilo e prova a giocare.

Il file `_headers`, che è già nel progetto, viene letto in automatico: applica
le regole di cache e le intestazioni di sicurezza senza che tu faccia nulla.

---

## 6. Collegare il tuo dominio

Nel progetto Pages appena creato, scheda **Custom domains**, poi **Set up a
custom domain**.

Scrivi il dominio. Hai due possibilità:

- **il dominio nudo**, per esempio `novanta.it`;
- **un sottodominio**, per esempio `gioca.novanta.it`.

Se il dominio è già sul tuo account Cloudflare, il record DNS viene creato da
solo: basta confermare. Il certificato HTTPS arriva da solo in pochi minuti,
a volte un quarto d'ora.

Consiglio: aggiungi anche `www`, così chi lo scrive per abitudine non trova una
pagina bianca. Si fa allo stesso modo, con **Set up a custom domain** una
seconda volta scrivendo `www.tuodominio.it`.

Quando la scheda mostra **Active** accanto al dominio, il gioco è online sul tuo
indirizzo.

---

## 7. Aggiornare il gioco da qui in avanti

Ogni volta che cambi qualcosa, tre comandi e il sito si aggiorna da solo:

```bash
cd /Users/filippidus_/Desktop/footballgame && git add . && git commit -m "descrivi qui la modifica"
```

```bash
cd /Users/filippidus_/Desktop/footballgame && git push
```

Cloudflare se ne accorge e ripubblica in una ventina di secondi. Nella scheda
**Deployments** del progetto vedi lo storico, e da lì puoi tornare a una
versione precedente con **Rollback** se qualcosa va storto.

---

## 8. Prima di andare online: le sostituzioni da fare

Nel progetto ci sono cinque punti scritti con un indirizzo di esempio. Vanno
cambiati tutti con il dominio vero, altrimenti l'anteprima dei link e la mappa
del sito puntano nel vuoto.

| File | Cosa cambiare |
| --- | --- |
| `index.html` | gli indirizzi `https://novanta.game/` in canonical, Open Graph e Twitter |
| `sitemap.xml` | tutti gli indirizzi elencati |
| `robots.txt` | la riga `Sitemap:` |
| `come-si-gioca.html`, `dati.html` | il canonical in cima |
| `privacy.html` | l'indirizzo email dei contatti, che deve essere uno che leggi |

La cartella `tools/` serve solo a generare le immagini di anteprima e non va
pubblicata: `robots.txt` la esclude già dai motori di ricerca.

---

## 9. Dopo il dominio: la pubblicità

L'ordine conta. AdSense verifica il dominio che gli dichiari, quindi va fatto
solo quando il gioco risponde sul dominio vero, non sull'indirizzo `pages.dev`.

1. Iscriviti su <https://adsense.google.com> e dichiara il tuo dominio.
2. Aspetta l'approvazione. Serve che il sito sia raggiungibile, con contenuto
   originale, una privacy policy, i termini di servizio e un contatto valido.
   Le pagine `privacy.html`, `terms.html`, `come-si-gioca.html` e `dati.html`
   sono già nel progetto e già collegate dal piede della schermata principale.
   Servono a te e servono a chi deve approvare: un gioco è quasi tutto
   interfaccia, e senza testo le revisioni finiscono spesso con un rifiuto per
   "contenuto insufficiente".
3. Chiedi l'abilitazione a **H5 Games Ads**: è la variante per i giochi web ed è
   l'unica che dà interstitial e rewarded video.
4. Apri `ads.txt`, incolla il tuo codice editore nella riga d'esempio e togli il
   cancelletto. Senza questo file gran parte degli acquirenti non fa offerte sul
   tuo inventario, e AdSense ti segnala il sito come non protetto.
5. Nel pannello AdSense apri **Privacy e messaggi** e crea il messaggio di
   consenso per il traffico europeo. È la piattaforma certificata IAB TCF che
   Google pretende dal 2024: senza, in Europa gli annunci non partono. Non c'è
   niente da scrivere nel codice, `src/consent/google-cmp.js` la carica da solo
   appena esiste un codice editore, e il banner fatto in casa si fa da parte.
6. Apri `src/ads/config.js` e scrivi il tuo ID publisher al posto della stringa
   vuota. Da quel momento l'adattatore carica l'SDK vero al posto della
   simulazione.
7. Salva, `git add`, `git commit`, `git push`. Fine.

### Dove compaiono gli annunci, e perché lì

La regola che ho seguito è una sola: la pubblicità sta dove l'utente si sta già
fermando da solo, e mai dove sta prendendo una decisione o riavviando di slancio.

- **Interstitial**, mai più di uno ogni novanta secondi: al cambio squadra nella
  Rosa, al riavvio dei Rigori e di Più o Meno, al passaggio di stagione in
  Carriera, prima della partita dell'Asta. Quasi tutti scattano una volta ogni
  due o tre passaggi, non ogni volta.
- **Rewarded**, sempre e solo chiesti dall'utente: tempo extra nella Rosa, una
  seconda chance ai Rigori, la catena che riparte in Più o Meno.
- **Mai** durante una partita, sopra il campo, o fra la sfida quotidiana e la
  modalità successiva.

### Statistiche di traffico

In fondo a `index.html` c'è lo spazio per Cloudflare Web Analytics, già scritto
e commentato. Non usa cookie e non profila nessuno, quindi può stare fuori dal
consenso. Il token si prende dal pannello Cloudflare, alla voce Web Analytics.

---

## Se qualcosa non va

**Il push viene rifiutato con "rejected".** Su GitHub è stato creato un file che
qui non c'è, di solito il README. Si risolve così:

```bash
cd /Users/filippidus_/Desktop/footballgame && git pull --rebase origin main && git push
```

**Il sito si vede ma resta vecchio dopo un aggiornamento.** È la cache del tuo
browser, non di Cloudflare. Ricarica tenendo premuto Shift.

**Una schermata resta bianca.** Apri la console del browser (tasto destro,
*Ispeziona*, scheda *Console*) e guarda l'errore. Nove volte su dieci è un file
non trovato per una maiuscola sbagliata: il Mac non distingue maiuscole e
minuscole nei nomi dei file, i server di Cloudflare sì.

**Il dominio resta su "Pending".** Vuol dire che i nameserver del dominio non
puntano ancora a Cloudflare. Si sistema nella sezione DNS del dominio, non nel
progetto Pages.

---

## In alternativa, senza GitHub

Se preferisci pubblicare direttamente dal Mac, senza repository:

```bash
cd /Users/filippidus_/Desktop/footballgame && npx wrangler pages deploy . --project-name novanta
```

La prima volta apre il browser per collegare l'account Cloudflare. Funziona
bene, ma perdi lo storico delle versioni e la pubblicazione automatica: ogni
aggiornamento va lanciato a mano.
