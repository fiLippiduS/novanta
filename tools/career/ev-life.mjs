/* Eventi della vita e del momento della carriera, per età.
   Giovani 16-20 · pieno della carriera 21-29 · veterani 30-33 · fine 34+. */

export default [
  /* ======================= GIOVANI ======================= */
  {
    id: 'y_school', kind: 'decision', group: 'life', w: 6, when: { ageMax: 18 },
    o: [
      { fx: { best: 1, reputation: -2, morale: -3, flag: 'diploma' } },
      { fx: { reputation: 4, morale: 5 } },
      { fx: { phys: 1, fitness: -6, morale: 2 } },
    ],
    it: { t: 'La scuola o il campo', d: 'Gli esami cadono nella settimana della finale giovanile. Non puoi essere in tutti e due i posti.', o: [
      { l: 'Vai agli esami', r: 'Passi. L’allenatore incassa senza dire niente, ma a casa sono orgogliosi.' },
      { l: 'Giochi la finale', r: 'Segni il gol del titolo. Il preside ti guarda male per un anno intero.' },
      { l: 'Provi a fare entrambe', r: 'Notte in bianco, esame passato, finale giocata da sonnambulo. Reggi, ma lo paghi.' },
    ] },
    en: { t: 'School or the pitch', d: 'Exams fall in the week of the youth final. You can’t be in both places.', o: [
      { l: 'Sit the exams', r: 'You pass. The coach says nothing, but your family is proud.' },
      { l: 'Play the final', r: 'You score the winner. The headmaster glares at you for a year.' },
      { l: 'Try to do both', r: 'No sleep, exam passed, final played half asleep. You manage, and you pay for it.' },
    ] },
  },
  {
    id: 'y_agent', kind: 'decision', group: 'life', w: 6, when: { ageMax: 20 },
    o: [
      { fx: { reputation: 5, morale: -2, flag: 'bigAgent' } },
      { fx: { morale: 5, flag: 'loyal', trust: 3 } },
      { fx: { best: 1, reputation: -2 } },
    ],
    it: { t: 'Il primo procuratore', d: 'Due uomini ti offrono di curarti la carriera. Uno ha una macchina che costa quanto lo stadio.', o: [
      { l: 'Quello con la macchina', r: 'Ti porta ovunque e parla con tutti. Di te, però, parla come di un prodotto.' },
      { l: 'Quello di paese', r: 'Conosce tuo padre da trent’anni. Non ti venderà mai al miglior offerente.' },
      { l: 'Nessuno dei due', r: 'Ti gestisci da solo. Ci metti più tempo, ma quello che firmi l’hai letto.' },
    ] },
    en: { t: 'Your first agent', d: 'Two men offer to manage your career. One drives a car worth as much as the stadium.', o: [
      { l: 'The one with the car', r: 'He takes you everywhere and talks to everyone. About you, like a product.' },
      { l: 'The local man', r: 'He’s known your father for thirty years. He’ll never sell you to the highest bidder.' },
      { l: 'Neither', r: 'You manage yourself. It takes longer, but you’ve read what you sign.' },
    ] },
  },
  {
    id: 'y_contract', kind: 'decision', group: 'life', w: 5, when: { ageMin: 17, ageMax: 20 },
    o: [
      { fx: { trust: 8, flag: 'loyal', morale: 3 } },
      { fx: { flag: 'wantsOut', reputation: 2 } },
    ],
    it: { t: 'Il primo contratto da professionista', d: 'Il {club} ti offre cinque anni. Il procuratore suggerisce un contratto corto.', o: [
      { l: 'Firmi per cinque anni', r: 'Il club ti considera un investimento e ti fa giocare.' },
      { l: 'Due anni e poi si vede', r: 'Resti libero di andare. Il club lo sa, e ti tratta di conseguenza.' },
    ] },
    en: { t: 'Your first pro contract', d: '{club} offer you five years. Your agent suggests a short deal.', o: [
      { l: 'Sign for five years', r: 'The club sees you as an investment and plays you.' },
      { l: 'Two years, then we’ll see', r: 'You stay free to leave. The club knows, and treats you accordingly.' },
    ] },
  },
  {
    id: 'y_u17', kind: 'decision', group: 'life', w: 4, when: { ageMax: 17 },
    o: [
      { fx: { reputation: 3, fitness: -2, morale: 4, best: 1 } },
      { fx: { trust: 5 } },
    ],
    it: { t: 'La chiamata dell’Under 17', d: 'La nazionale giovanile ti convoca per un torneo di due settimane, in piena stagione.', o: [
      { l: 'Parti', r: 'Giochi contro i migliori della tua età. Torni stanco e più sicuro.' },
      { l: 'Resti con il club', r: 'L’allenatore ti fa esordire in coppa. Un’occasione ne scaccia un’altra.' },
    ] },
    en: { t: 'The U17 call-up', d: 'The youth national team calls you up for a two-week tournament mid-season.', o: [
      { l: 'Go', r: 'You play against the best of your age. You come back tired and more confident.' },
      { l: 'Stay with the club', r: 'The coach gives you a cup debut. One opportunity chases another.' },
    ] },
  },
  {
    id: 'y_idol', kind: 'decision', group: 'life', w: 7, when: { ageMax: 20, idol: true },
    o: [
      { fx: { idolAttr: 3, morale: 8 } },
      { fx: { morale: 5, reputation: 3 } },
    ],
    it: { t: 'Incontri {idol}', d: 'A una serata di beneficenza ti ritrovi accanto a {idol}. Hai trenta secondi.', o: [
      { l: 'Gli chiedi un consiglio tecnico', r: 'Ti spiega il dettaglio che lo ha reso unico. Te lo porterai dietro per sempre.' },
      { l: 'Gli chiedi una foto', r: 'La foto fa il giro del paese. Tua madre la incornicia.' },
    ] },
    en: { t: 'You meet {idol}', d: 'At a charity evening you find yourself next to {idol}. You have thirty seconds.', o: [
      { l: 'Ask for technical advice', r: 'He explains the detail that made him unique. You’ll carry it forever.' },
      { l: 'Ask for a photo', r: 'The photo goes round the whole country. Your mother frames it.' },
    ] },
  },
  {
    id: 'y_homesick', kind: 'decision', group: 'life', w: 6, when: { ageMax: 20, abroad: true },
    o: [
      { fx: { morale: 6, trust: -2 } },
      { fx: { morale: -4, best: 1, trust: 3 } },
    ],
    it: { t: 'Nostalgia', d: 'Lontano da casa, a {club}, la sera non passa mai.', o: [
      { l: 'Torni a casa ogni pausa', r: 'Il sorriso torna. L’allenatore nota qualche allenamento saltato per i voli.' },
      { l: 'Stringi i denti', r: 'Ti chiudi nel lavoro. Diventi più forte, un po’ più solo.' },
    ] },
    en: { t: 'Homesick', d: 'Far from home, at {club}, the evenings never end.', o: [
      { l: 'Go home every break', r: 'The smile returns. The coach notices a few sessions missed for flights.' },
      { l: 'Grit your teeth', r: 'You bury yourself in work. You get stronger, and a bit lonelier.' },
    ] },
  },
  {
    id: 'y_party', kind: 'decision', group: 'life', w: 5, when: { ageMax: 21 },
    o: [
      { fx: { p: 0.5, base: { morale: 4 }, win: {}, lose: { trust: -6, fitness: -4 } } },
      { fx: { trust: 2, fitness: 2 } },
    ],
    it: { t: 'La festa del sabato', d: 'I compagni organizzano una festa. La partita è domenica alle tre.', o: [
      { l: 'Ci vai', rw: 'Due ore, un’aranciata, a letto a mezzanotte. Nessuno se ne accorge.', rl: 'Una foto finisce sui social alle quattro del mattino. L’allenatore la vede prima di te.' },
      { l: 'Resti a casa', r: 'Domenica sei il più lucido in campo.' },
    ] },
    en: { t: 'The Saturday party', d: 'Team-mates throw a party. The game is Sunday at three.', o: [
      { l: 'Go', rw: 'Two hours, a soft drink, in bed by midnight. Nobody notices.', rl: 'A photo hits social media at four in the morning. The coach sees it before you do.' },
      { l: 'Stay home', r: 'On Sunday you’re the sharpest player on the pitch.' },
    ] },
  },
  {
    id: 'y_growth', kind: 'incident', w: 4, when: { ageMax: 17 },
    fx: { fitness: -4, mods: { injuryRisk: 0.02 }, phys: 1 },
    it: { t: 'Lo scatto di crescita', d: 'Otto centimetri in un anno. Le ginocchia fanno male e la coordinazione va ritrovata.' },
    en: { t: 'Growth spurt', d: 'Eight centimetres in a year. Your knees ache and your coordination needs finding again.' },
  },
  {
    id: 'y_shaved', kind: 'incident', w: 3, when: { ageMax: 20, notRoles: ['POR'], seasonMin: 1 },
    fx: { morale: 3 },
    it: { t: 'Il rito', d: 'Dopo il primo allenamento con la prima squadra i veterani ti rasano la testa. È il loro modo di dire benvenuto.' },
    en: { t: 'The ritual', d: 'After your first session with the first team the veterans shave your head. It’s their way of saying welcome.' },
  },
  {
    id: 'y_friend', kind: 'decision', group: 'life', w: 4, when: { ageMax: 19 },
    o: [
      { fx: { morale: 3, trust: -2 } },
      { fx: { best: 2, morale: -2, flag: 'cold' } },
    ],
    it: { t: 'Il tuo migliore amico', d: 'Siete cresciuti insieme. Adesso vi giocate lo stesso posto in prima squadra.', o: [
      { l: 'Lo aiuti', r: 'Vi allenate insieme, vi spingete a vicenda. Il posto resta aperto.' },
      { l: 'Lo schiacci', r: 'Vinci ogni duello. L’amicizia non sopravvive alla stagione.' },
    ] },
    en: { t: 'Your best friend', d: 'You grew up together. Now you’re fighting for the same first-team place.', o: [
      { l: 'Help him', r: 'You train together and push each other. The place stays open.' },
      { l: 'Crush him', r: 'You win every duel. The friendship doesn’t survive the season.' },
    ] },
  },
  {
    id: 'y_diet', kind: 'decision', group: 'life', w: 5, when: { ageMax: 21 },
    o: [
      { fx: { fitness: 6, flag: 'carefulBody', morale: -2 } },
      { fx: { morale: 3, fitness: -3 } },
    ],
    it: { t: 'Il nutrizionista', d: 'Niente zuccheri, niente fritti, pesate ogni lunedì.', o: [
      { l: 'Segui il piano', r: 'Il corpo cambia in due mesi. La pizza del venerdì ti manca.' },
      { l: 'Mangi come sempre', r: 'Sei felice. Il lunedì la bilancia un po’ meno.' },
    ] },
    en: { t: 'The nutritionist', d: 'No sugar, no fried food, weigh-in every Monday.', o: [
      { l: 'Follow the plan', r: 'Your body changes in two months. You miss Friday pizza.' },
      { l: 'Eat as usual', r: 'You’re happy. Monday’s scales a bit less.' },
    ] },
  },
  {
    id: 'y_languages', kind: 'decision', group: 'life', w: 4, when: { ageMax: 22 },
    o: [
      { fx: { flag: 'polyglot', morale: 1, reputation: 1 } },
      { fx: { best: 1 } },
    ],
    it: { t: 'Lezioni di lingua', d: 'Il club offre corsi serali di inglese e spagnolo.', o: [
      { l: 'Ti iscrivi', r: 'Due lingue in due anni. Un giorno ti serviranno in un altro spogliatoio.' },
      { l: 'Solo pallone', r: 'Le sere le passi a guardare partite.' },
    ] },
    en: { t: 'Language lessons', d: 'The club offers evening English and Spanish classes.', o: [
      { l: 'Enrol', r: 'Two languages in two years. One day you’ll need them in another dressing room.' },
      { l: 'Football only', r: 'You spend the evenings watching games.' },
    ] },
  },
  {
    id: 'y_trial', kind: 'decision', group: 'life', w: 5, when: { ageMax: 19, tierMin: 4, repMin: 6 },
    o: [
      { fx: { p: 0.4, base: {}, win: { flag: 'bigTrialWon', reputation: 6, morale: 5 }, lose: { morale: -6 } } },
      { fx: { trust: 5 } },
    ],
    it: { t: 'Il provino', d: 'Una grande squadra ti invita per una settimana di prova. Il tuo club te lo sconsiglia.', o: [
      { l: 'Vai', rw: 'Segnano il tuo nome in rosso sul taccuino. A giugno ti chiameranno.', rl: 'Ti tremano le gambe per sette giorni. Torni a casa con una maglia regalata e basta.' },
      { l: 'Resti', r: 'Il club apprezza la fedeltà e ti promette spazio.' },
    ] },
    en: { t: 'The trial', d: 'A big club invites you for a week’s trial. Your club advises against it.', o: [
      { l: 'Go', rw: 'They write your name in red in their notebook. In June they’ll call.', rl: 'Your legs shake for seven days. You go home with a free shirt and nothing else.' },
      { l: 'Stay', r: 'The club values your loyalty and promises you playing time.' },
    ] },
  },
  {
    id: 'y_loan', kind: 'decision', group: 'life', w: 5, when: { ageMax: 21, trustMax: 45, seasonMin: 1 },
    o: [
      { fx: { flag: 'wantsLoan', morale: 2 } },
      { fx: { p: 0.5, base: { trust: 3 }, win: { mods: { minutes: 0.1 } }, lose: { morale: -4 } } },
    ],
    it: { t: 'In prestito per crescere', d: 'L’allenatore è sincero: quest’anno giocheresti poco. Propone un prestito a fine stagione.', o: [
      { l: 'Accetti l’idea', r: 'A giugno arriverà una squadra dove giocare ogni domenica.' },
      { l: 'Ti giochi il posto', rw: 'Ti alleni come un pazzo e a gennaio sei titolare.', rl: 'Resti in fondo alle gerarchie tutto l’anno.' },
    ] },
    en: { t: 'A loan to grow', d: 'The coach is honest: this year you’d play little. He suggests a loan at the end of the season.', o: [
      { l: 'Accept the idea', r: 'In June a club will come where you play every Sunday.' },
      { l: 'Fight for your place', rw: 'You train like a madman and start by January.', rl: 'You stay at the bottom of the pecking order all year.' },
    ] },
  },
  {
    id: 'y_knee', kind: 'incident', w: 3, when: { ageMax: 20 },
    fx: { fitness: -5, mods: { injuryRisk: 0.03 } },
    it: { t: 'Lo spavento al ginocchio', d: 'Una torsione in allenamento, la risonanza, tre giorni di attesa. Niente legamenti, ma la paura resta.' },
    en: { t: 'The knee scare', d: 'A twist in training, an MRI, three days of waiting. No ligament damage, but the fear stays.' },
  },
  {
    id: 'y_haters', kind: 'incident', w: 3, when: { ageMax: 21, repMin: 12 },
    fx: { morale: -5 },
    it: { t: 'I commenti', d: 'Dopo una partita storta leggi i commenti sotto la tua foto. Non avresti dovuto.' },
    en: { t: 'The comments', d: 'After a bad game you read the comments under your photo. You shouldn’t have.' },
  },
  {
    id: 'y_nerves', kind: 'decision', group: 'life', w: 4, when: { ageMax: 18, seasonMin: 1 },
    o: [
      { fx: { flag: 'psychologist', morale: 4, mods: { form: 0.02 } } },
      { fx: { p: 0.5, base: {}, win: { morale: 5 }, lose: { morale: -5, mods: { form: -0.02 } } } },
    ],
    it: { t: 'Il nodo allo stomaco', d: 'Prima delle partite importanti non riesci a mangiare.', o: [
      { l: 'Parli con la psicologa del club', r: 'Impari a respirare e a mettere in fila i pensieri. Il nodo si scioglie.' },
      { l: 'Te la cavi da solo', rw: 'Passa com’è venuto. Forse era solo l’età.', rl: 'Il nodo diventa blocco. Giochi due partite da fantasma.' },
    ] },
    en: { t: 'The knot in your stomach', d: 'Before big games you can’t eat.', o: [
      { l: 'Talk to the club psychologist', r: 'You learn to breathe and put your thoughts in order. The knot loosens.' },
      { l: 'Handle it alone', rw: 'It goes the way it came. Maybe it was just age.', rl: 'The knot becomes a block. You play two games like a ghost.' },
    ] },
  },
  {
    id: 'y_diploma', kind: 'decision', group: 'life', w: 3, when: { ageMax: 19, notFlags: ['diploma'] },
    o: [
      { fx: { morale: 2, fitness: -2, flag: 'diploma' } },
      { fx: { best: 1, morale: -1 } },
    ],
    it: { t: 'Il diploma serale', d: 'Ti manca un anno. La scuola serale finisce alle dieci.', o: [
      { l: 'Lo prendi', r: 'Stanco, ma con il diploma in tasca. Un piano B non guasta.' },
      { l: 'Lasci perdere', r: 'Il calcio è il tuo piano A, B e C.' },
    ] },
    en: { t: 'Night-school diploma', d: 'You have one year left. Night school ends at ten.', o: [
      { l: 'Get it', r: 'Tired, but with the diploma in your pocket. A plan B never hurts.' },
      { l: 'Drop it', r: 'Football is your plan A, B and C.' },
    ] },
  },

  /* ======================= PIENO DELLA CARRIERA ======================= */
  {
    id: 'p_renewal', kind: 'decision', group: 'life', w: 5, when: { ageMin: 21, ageMax: 29 },
    o: [
      { fx: { flag: 'loyal', unflag: 'wantsOut', trust: 6 } },
      { fx: { flag: 'wantsOut', unflag: 'loyal', reputation: 2 } },
    ],
    it: { t: 'Il rinnovo', d: 'Il {club} ti offre il rinnovo con una clausola di fedeltà.', o: [
      { l: 'Firmi', r: 'Diventi uno dei pilastri del progetto.' },
      { l: 'Aspetti le offerte', r: 'Il mercato si accorge che sei disponibile.' },
    ] },
    en: { t: 'The renewal', d: '{club} offer a new deal with a loyalty clause.', o: [
      { l: 'Sign', r: 'You become one of the pillars of the project.' },
      { l: 'Wait for offers', r: 'The market notices you’re available.' },
    ] },
  },
  {
    id: 'p_rival_offer', kind: 'decision', group: 'life', w: 4, when: { ageMin: 22, repMin: 40 },
    o: [
      { fx: { flag: 'wantsOut', reputation: 3, morale: 2, trust: -5 } },
      { fx: { trust: 8, morale: 3, flag: 'loyal' } },
    ],
    it: { t: 'L’offerta dei rivali', d: 'La squadra rivale storica ti offre il doppio dello stipendio. La notizia esce sui giornali.', o: [
      { l: 'Ci pensi seriamente', r: 'La curva espone uno striscione contro di te. Le offerte, però, aumentano.' },
      { l: 'Rifiuti in pubblico', r: 'Baci la maglia dopo il gol successivo. I tifosi non se lo scorderanno.' },
    ] },
    en: { t: 'The rivals’ offer', d: 'Your club’s historic rivals offer double your salary. The news is in the papers.', o: [
      { l: 'Seriously consider it', r: 'The fans unfurl a banner against you. The offers, though, increase.' },
      { l: 'Refuse publicly', r: 'You kiss the badge after your next goal. The fans won’t forget it.' },
    ] },
  },
  {
    id: 'p_captain', kind: 'decision', group: 'life', w: 4, when: { ageMin: 25, repMin: 35, notFlags: ['captain'] },
    o: [
      { fx: { flag: 'captain', trust: 5, morale: 3 } },
      { fx: { morale: 1 } },
    ],
    it: { t: 'La fascia di capitano', d: 'Lo spogliatoio vota. Il tuo nome esce più di tutti.', o: [
      { l: 'La accetti', r: 'Da capitano parli per tutti. Anche quando le cose vanno male.' },
      { l: 'Preferisci giocare e basta', r: 'La fascia va a un altro. Il tuo peso nello spogliatoio resta.' },
    ] },
    en: { t: 'The captain’s armband', d: 'The dressing room votes. Your name comes up more than any other.', o: [
      { l: 'Accept', r: 'As captain you speak for everyone. Even when things go badly.' },
      { l: 'You’d rather just play', r: 'The armband goes to someone else. Your weight in the dressing room remains.' },
    ] },
  },
  {
    id: 'p_coach_clash', kind: 'decision', group: 'life', w: 5, when: { ageMin: 21 },
    o: [
      { fx: { p: 0.3, base: { reputation: 2, mods: { minApps: 1 } }, win: { trustSet: 60, morale: 4 }, lose: { trust: -10, morale: -3 } } },
      { fx: { trust: 5, best: 1, mods: { minApps: 1 } } },
    ],
    it: { t: 'Fuori per un errore', d: 'Un tuo errore costa la partita. L’allenatore ti lascia fuori per tre turni e lo dice in conferenza stampa.', o: [
      { l: 'Rispondi in pubblico', rw: 'Lo spogliatoio si schiera con te. A marzo l’allenatore viene esonerato.', rl: 'Il club si schiera con l’allenatore. Per te comincia un lungo inverno.' },
      { l: 'Lavori in silenzio', r: 'Torni in campo al quarto turno. Più forte e senza polemiche.' },
    ] },
    en: { t: 'Dropped for a mistake', d: 'Your mistake costs the game. The coach drops you for three matches and says so at the press conference.', o: [
      { l: 'Answer publicly', rw: 'The dressing room sides with you. In March the coach is sacked.', rl: 'The club sides with the coach. A long winter begins for you.' },
      { l: 'Work in silence', r: 'You’re back in the side after three games. Stronger and without a row.' },
    ] },
  },
  {
    id: 'p_wedding', kind: 'decision', group: 'life', w: 3, when: { ageMin: 23, notFlags: ['married'] },
    o: [
      { fx: { morale: 2, trust: 2, flag: 'married' } },
      { fx: { morale: 8, fitness: -3, flag: 'married' } },
    ],
    it: { t: 'Il matrimonio', d: 'La data è fissata a metà stagione. Il viaggio di nozze è un problema.', o: [
      { l: 'Rimandi il viaggio all’estate', r: 'Sposato il sabato, in campo il mercoledì.' },
      { l: 'Parti nella pausa invernale', r: 'Dieci giorni di sole. Torni felice e con due chili in più.' },
    ] },
    en: { t: 'The wedding', d: 'The date is set mid-season. The honeymoon is a problem.', o: [
      { l: 'Postpone the trip to summer', r: 'Married on Saturday, on the pitch on Wednesday.' },
      { l: 'Go in the winter break', r: 'Ten days of sun. You come back happy and two kilos heavier.' },
    ] },
  },
  {
    id: 'p_baby', kind: 'incident', w: 3, when: { ageMin: 24, flags: ['married'], notFlags: ['parent'] },
    fx: { morale: 8, fitness: -2, flag: 'parent' },
    it: { t: 'È nato tuo figlio', d: 'Dormi tre ore a notte e non sei mai stato così felice. Entri in campo la domenica dopo con il nome di tuo figlio scritto sul polso.' },
    en: { t: 'Your child is born', d: 'You sleep three hours a night and have never been happier. The next Sunday you walk out with your child’s name written on your wrist.' },
  },
  {
    id: 'p_foundation', kind: 'decision', group: 'life', w: 3, when: { ageMin: 22, repMin: 30 },
    o: [
      { fx: { reputation: 4, morale: 4, fitness: -2, flag: 'charity' } },
      { fx: { morale: 2 } },
    ],
    it: { t: 'Una fondazione', d: 'Nel quartiere dove sei cresciuto il campetto sta per chiudere.', o: [
      { l: 'Crei una fondazione', r: 'Il campetto riapre con il tuo nome sul cancello. Le giornate diventano più piene.' },
      { l: 'Fai una donazione privata', r: 'Nessuno lo sa. Tu sì.' },
    ] },
    en: { t: 'A foundation', d: 'In the neighbourhood where you grew up, the local pitch is about to close.', o: [
      { l: 'Start a foundation', r: 'The pitch reopens with your name on the gate. Your days get fuller.' },
      { l: 'Make a private donation', r: 'Nobody knows. You do.' },
    ] },
  },
  {
    id: 'p_boots', kind: 'decision', group: 'life', w: 3, when: { ageMin: 22, repMin: 45 },
    o: [
      { fx: { p: 0.85, base: { reputation: 4, morale: 3 }, win: {}, lose: { mods: { form: -0.02 } } } },
      { fx: { morale: 1 } },
    ],
    it: { t: 'Le scarpe con il tuo nome', d: 'Un marchio sportivo vuole disegnare una scarpa col tuo nome sopra.', o: [
      { l: 'Accetti', rw: 'Le vedi ai piedi dei ragazzini sul campetto. Non c’è niente di più bello.', rl: 'Il nuovo modello ti fa venire le vesciche per un mese.' },
      { l: 'Resti con le tue vecchie', r: 'Squadra che vince non si cambia. Nemmeno le scarpe.' },
    ] },
    en: { t: 'Boots with your name', d: 'A sportswear brand wants to design a boot with your name on it.', o: [
      { l: 'Accept', rw: 'You see them on kids’ feet at the local pitch. Nothing better.', rl: 'The new model gives you blisters for a month.' },
      { l: 'Keep your old ones', r: 'Never change a winning team. Or boots.' },
    ] },
  },
  {
    id: 'p_ballon_hype', kind: 'decision', group: 'life', w: 4, when: { ageMin: 23, repMin: 70 },
    o: [
      { fx: { p: 0.7, base: { reputation: 3 }, win: { mods: { form: 0.02 }, morale: 3 }, lose: { morale: -6 } } },
      { fx: { best: 1, trust: 2 } },
    ],
    it: { t: 'Si parla di Pallone d’Oro', d: 'I giornali ti mettono nella lista dei favoriti. Ti chiedono cosa ne pensi.', o: [
      { l: 'Dici che lo vuoi', rw: 'La pressione ti esalta. Giochi la stagione migliore della tua vita.', rl: 'Ogni partita diventa un esame. La pressione ti schiaccia.' },
      { l: 'Parli solo di squadra', r: 'Abbassi i riflettori e alzi il livello in allenamento.' },
    ] },
    en: { t: 'Ballon d’Or talk', d: 'The papers put you among the favourites. They ask what you think.', o: [
      { l: 'Say you want it', rw: 'The pressure fires you up. You play the best season of your life.', rl: 'Every game becomes an exam. The pressure crushes you.' },
      { l: 'Talk only about the team', r: 'You lower the spotlight and raise your level in training.' },
    ] },
  },
  {
    id: 'p_saga', kind: 'decision', group: 'life', w: 4, when: { ageMin: 22, repMin: 50, flags: ['wantsOut'] },
    o: [
      { fx: { trust: -12, flag: 'forceMove' } },
      { fx: { trust: 5, morale: -3, unflag: 'wantsOut' } },
    ],
    it: { t: 'Il tormentone di mercato', d: 'Da tre mesi ogni giornale ti vende a una squadra diversa. Il presidente non ti lascia partire.', o: [
      { l: 'Forzi la cessione', r: 'Salti un allenamento. Il messaggio è chiaro a tutti, e costa caro.' },
      { l: 'Resti e giochi', r: 'Chiudi la porta al mercato. Il pubblico apprezza, tu un po’ meno.' },
    ] },
    en: { t: 'The transfer saga', d: 'For three months every paper has sold you to a different club. The president won’t let you go.', o: [
      { l: 'Force the move', r: 'You skip a training session. The message is clear to everyone, and it costs.' },
      { l: 'Stay and play', r: 'You shut the door on the market. The fans appreciate it, you a bit less.' },
    ] },
  },
  {
    id: 'p_injection', kind: 'decision', group: 'life', w: 4, when: { ageMin: 21 },
    o: [
      { fx: { p: 0.5, base: { trust: 4, mods: { minApps: 1 } }, win: { trust: 2, reputation: 2 }, lose: { forcedInjury: { severity: 'medium', weeks: 8 } } } },
      { fx: { fitness: 4, trust: -3 } },
    ],
    it: { t: 'Giochi con l’infiltrazione?', d: 'Una contrattura alla vigilia della partita più importante dell’anno. Il medico può farti un’infiltrazione.', o: [
      { l: 'Giochi', rw: 'Novanta minuti senza sentire nulla. Vincete.', rl: 'Al ventesimo senti lo strappo. Starai fuori circa due mesi.' },
      { l: 'Ti fermi', r: 'Guardi la partita dalla tribuna. Il muscolo guarisce, l’allenatore ci resta male.' },
    ] },
    en: { t: 'Play with an injection?', d: 'A muscle strain on the eve of the biggest game of the year. The doctor can give you an injection.', o: [
      { l: 'Play', rw: 'Ninety minutes without feeling a thing. You win.', rl: 'In the twentieth minute you feel it tear. You’ll be out for about two months.' },
      { l: 'Rest', r: 'You watch from the stands. The muscle heals, the coach is disappointed.' },
    ] },
  },
  {
    id: 'p_revolution', kind: 'decision', group: 'life', w: 4, when: { ageMin: 21 },
    o: [
      { fx: { best: 2, trust: 4, mods: { form: -0.02 } } },
      { fx: { trust: -6, morale: 2 } },
    ],
    it: { t: 'La rivoluzione tattica', d: 'Arriva un allenatore giovane con idee radicali: allenamenti con i droni, video ogni giorno.', o: [
      { l: 'Ti butti', r: 'Ci vuole tempo a capire. Poi scopri cose di te che non sapevi.' },
      { l: 'Resisti', r: 'Il vecchio metodo funzionava. L’allenatore prende nota di chi rema contro.' },
    ] },
    en: { t: 'The tactical revolution', d: 'A young coach arrives with radical ideas: drone training, video every day.', o: [
      { l: 'Dive in', r: 'It takes time to understand. Then you discover things about yourself you didn’t know.' },
      { l: 'Resist', r: 'The old way worked. The coach notes who is pulling the other way.' },
    ] },
  },
  {
    id: 'p_fight', kind: 'incident', w: 3, when: { ageMin: 20 },
    fx: { trust: -5, morale: -4 },
    it: { t: 'La rissa in allenamento', d: 'Un’entrata di troppo in partitella, due spinte, uno schiaffo. Multa per tutti e due e la foto sui giornali.' },
    en: { t: 'The training-ground fight', d: 'One tackle too many in a practice game, two shoves, a slap. Fines for both and the photo in the papers.' },
  },
  {
    id: 'p_chant', kind: 'incident', w: 3, when: { repMin: 35 },
    fx: { morale: 6, reputation: 2 },
    it: { t: 'Il tuo coro', d: 'La curva ti dedica un coro. Lo senti partire mentre ti riscaldi e ti viene la pelle d’oca.' },
    en: { t: 'Your chant', d: 'The fans dedicate a chant to you. You hear it start while you warm up and get goosebumps.' },
  },
  {
    id: 'p_mentor', kind: 'decision', group: 'life', w: 3, when: { ageMin: 27, notFlags: ['mentor'] },
    o: [
      { fx: { flag: 'mentor', morale: 3, trust: 2 } },
      { fx: { best: 1 } },
    ],
    it: { t: 'Il ragazzo della primavera', d: 'Un sedicenne ti segue ovunque in allenamento e ti fa mille domande.', o: [
      { l: 'Lo prendi sotto la tua ala', r: 'Gli insegni i dettagli che nessuno insegna. Ti fa sentire utile.' },
      { l: 'Pensi a te', r: 'Hai i tuoi obiettivi. Il ragazzo trova un altro maestro.' },
    ] },
    en: { t: 'The youth-team kid', d: 'A sixteen-year-old follows you everywhere in training asking a thousand questions.', o: [
      { l: 'Take him under your wing', r: 'You teach him the details nobody teaches. It makes you feel useful.' },
      { l: 'Focus on yourself', r: 'You have your own goals. The kid finds another teacher.' },
    ] },
  },
  {
    id: 'p_media', kind: 'decision', group: 'life', w: 3, when: { ageMin: 22, repMin: 40 },
    o: [
      { fx: { reputation: 3, flag: 'mediaPro' } },
      { fx: { morale: 1 } },
    ],
    it: { t: 'Il corso di comunicazione', d: 'L’ufficio stampa ti propone un corso per le interviste.', o: [
      { l: 'Lo fai', r: 'Le tue interviste diventano citazioni. I giornalisti ti cercano.' },
      { l: 'Parli come ti viene', r: 'Autentico, a volte troppo.' },
    ] },
    en: { t: 'Media training', d: 'The press office suggests a course for interviews.', o: [
      { l: 'Do it', r: 'Your interviews become quotes. Journalists seek you out.' },
      { l: 'Speak as it comes', r: 'Authentic, sometimes too much.' },
    ] },
  },
  {
    id: 'p_ritual', kind: 'decision', group: 'life', w: 3, when: { ageMin: 21 },
    o: [
      { fx: { morale: 4, mods: { form: 0.02 } } },
      { fx: { trust: 1 } },
    ],
    it: { t: 'Il rituale', d: 'Hai vinto tre partite di fila con gli stessi calzini. Il magazziniere li vuole lavare.', o: [
      { l: 'Non si lavano', r: 'Stessi calzini, stesso ordine negli spogliatoi, stesso piede in campo. Funziona, finché funziona.' },
      { l: 'Superstizioni? No', r: 'Calzini puliti. Si vince con le gambe.' },
    ] },
    en: { t: 'The ritual', d: 'You’ve won three games in a row wearing the same socks. The kit man wants to wash them.', o: [
      { l: 'They don’t get washed', r: 'Same socks, same order in the dressing room, same foot onto the pitch. It works, until it doesn’t.' },
      { l: 'Superstition? No', r: 'Clean socks. You win with your legs.' },
    ] },
  },
  {
    id: 'p_hot', kind: 'incident', w: 3, when: { ageMin: 21, repMin: 20 },
    fx: { morale: 6, reputation: 3, mods: { form: 0.03, minApps: 6 } },
    it: { t: 'Il periodo magico', d: 'Sei partite di fila tra i migliori in campo. Tutto quello che tocchi funziona.' },
    en: { t: 'The purple patch', d: 'Six games in a row among the best on the pitch. Everything you touch works.' },
  },
  {
    id: 'p_anxiety', kind: 'decision', group: 'life', w: 4, when: { ageMin: 21, moraleMax: 55 },
    o: [
      { fx: { flag: 'psychologist', morale: 6, mods: { form: 0.02 } } },
      { fx: { p: 0.5, base: {}, win: { morale: 2 }, lose: { morale: -10, mods: { form: -0.05 } } } },
    ],
    it: { t: 'La pressione', d: 'Non dormi, il cuore accelera senza motivo. Nessuno in squadra se ne è accorto.', o: [
      { l: 'Chiedi aiuto', r: 'Parlarne è la parata più difficile. Dopo un mese respiri di nuovo.' },
      { l: 'Lo tieni per te', rw: 'Passa con le vacanze.', rl: 'Esplode a febbraio. La seconda metà di stagione è un muro.' },
    ] },
    en: { t: 'The pressure', d: 'You can’t sleep, your heart races for no reason. Nobody at the club has noticed.', o: [
      { l: 'Ask for help', r: 'Talking about it is the hardest save. After a month you breathe again.' },
      { l: 'Keep it to yourself', rw: 'It passes with the holidays.', rl: 'It explodes in February. The second half of the season is a wall.' },
    ] },
  },
  {
    id: 'p_tv', kind: 'decision', group: 'life', w: 3, when: { ageMin: 25, repMin: 50 },
    o: [
      { fx: { reputation: 4, fitness: -2, trust: -3 } },
      { fx: { trust: 2 } },
    ],
    it: { t: 'Ospite in tv', d: 'Un programma sportivo ti vuole ospite fisso il lunedì sera.', o: [
      { l: 'Accetti', r: 'Il pubblico ti adora. L’allenatore meno, quando il martedì arrivi stanco.' },
      { l: 'Rifiuti', r: 'Il lunedì è per il recupero.' },
    ] },
    en: { t: 'TV guest', d: 'A sports show wants you as a regular Monday-night guest.', o: [
      { l: 'Accept', r: 'Viewers love you. The coach less so, when you arrive tired on Tuesday.' },
      { l: 'Decline', r: 'Monday is for recovery.' },
    ] },
  },
  {
    id: 'p_derby', kind: 'incident', w: 3, when: { ageMin: 20 },
    fx: { morale: 5, reputation: 3, trust: 3, mods: { minApps: 1 } },
    it: { t: 'Il derby', d: 'Decisivo nel derby. In città per una settimana ti offrono il caffè in ogni bar.' },
    en: { t: 'The derby', d: 'Decisive in the derby. For a week every café in town offers you a coffee.' },
  },
  {
    id: 'p_fake_news', kind: 'incident', w: 3, when: { ageMin: 21, repMin: 25 },
    fx: { trust: -3, morale: -3 },
    it: { t: 'La notizia falsa', d: 'Un sito scrive che hai litigato con l’allenatore e vuoi andare via. Non è vero, ma la smentita arriva tardi.' },
    en: { t: 'Fake news', d: 'A website claims you fell out with the coach and want to leave. It’s false, but the denial comes late.' },
  },

  /* ======================= VETERANI ======================= */
  {
    id: 'v_exotic', kind: 'decision', group: 'life', w: 5, when: { ageMin: 30, repMin: 45 },
    o: [
      { fx: { flag: 'wantsExotic', morale: 2 } },
      { fx: { trust: 3, morale: 2 } },
    ],
    it: { t: 'L’ultimo grande contratto', d: 'Un club del Golfo e uno americano ti offrono cifre mai viste.', o: [
      { l: 'Ascolti le offerte', r: 'Sole, soldi e meno pressione. A fine stagione arriverà una proposta concreta.' },
      { l: 'Vuoi restare ad alto livello', r: 'Finché le gambe reggono, resti dove si gioca per vincere.' },
    ] },
    en: { t: 'The last big contract', d: 'A Gulf club and an American club offer unprecedented sums.', o: [
      { l: 'Listen to the offers', r: 'Sun, money and less pressure. At the end of the season a concrete offer will come.' },
      { l: 'Stay at the top level', r: 'While your legs hold, you stay where teams play to win.' },
    ] },
  },
  {
    id: 'v_rotation', kind: 'decision', group: 'life', w: 5, when: { ageMin: 30, tierMax: 3 },
    o: [
      { fx: { mods: { minutes: -0.15 }, fitness: 6, morale: -2 } },
      { fx: { p: 0.5, base: { mods: { injuryRisk: 0.04 }, trust: 2 }, win: { morale: 4 }, lose: { morale: -4 } } },
    ],
    it: { t: 'Il turnover', d: 'L’allenatore ti propone di giocare una partita sì e una no.', o: [
      { l: 'Accetti', r: 'Giochi meno ma meglio. Il corpo ringrazia.' },
      { l: 'Vuoi giocarle tutte', rw: 'Dimostri di esserci ancora. Nessuno parla più di età.', rl: 'A novembre sei in riserva. L’allenatore aveva ragione.' },
    ] },
    en: { t: 'Rotation', d: 'The coach suggests you play every other game.', o: [
      { l: 'Accept', r: 'You play less but better. Your body is grateful.' },
      { l: 'You want to play them all', rw: 'You prove you’re still there. Nobody mentions age any more.', rl: 'By November you’re running on empty. The coach was right.' },
    ] },
  },
  {
    id: 'v_badges', kind: 'decision', group: 'life', w: 4, when: { ageMin: 30, notFlags: ['badges'] },
    o: [
      { fx: { flag: 'badges', fitness: -2, morale: 2 } },
      { fx: { fitness: 1 } },
    ],
    it: { t: 'Il patentino da allenatore', d: 'La federazione apre un corso per giocatori in attività.', o: [
      { l: 'Ti iscrivi', r: 'Le lezioni del lunedì ti fanno vedere le partite con occhi nuovi.' },
      { l: 'Più avanti', r: 'Adesso c’è ancora da giocare.' },
    ] },
    en: { t: 'The coaching badge', d: 'The federation opens a course for active players.', o: [
      { l: 'Enrol', r: 'Monday lessons make you watch games with new eyes.' },
      { l: 'Later', r: 'There’s still playing to do.' },
    ] },
  },
  {
    id: 'v_physio', kind: 'decision', group: 'life', w: 5, when: { ageMin: 30 },
    o: [
      { fx: { fitness: 8, flag: 'carefulBody', morale: -1 } },
      { fx: { morale: 2, mods: { injuryRisk: 0.02 } } },
    ],
    it: { t: 'Il fisioterapista privato', d: 'Molti veterani si pagano un fisioterapista personale e la crioterapia a casa.', o: [
      { l: 'Lo assumi', r: 'Due ore al giorno di cura del corpo. Ti senti di nuovo venticinquenne, quasi.' },
      { l: 'Ti fidi dello staff', r: 'Hai sempre fatto così e ti è andata bene.' },
    ] },
    en: { t: 'The private physio', d: 'Many veterans pay for a personal physio and cryotherapy at home.', o: [
      { l: 'Hire one', r: 'Two hours a day of body care. You feel twenty-five again, almost.' },
      { l: 'Trust the staff', r: 'You’ve always done it this way and it went fine.' },
    ] },
  },
  {
    id: 'v_revolt', kind: 'decision', group: 'life', w: 3, when: { ageMin: 30 },
    o: [
      { fx: { trust: 6, reputation: 2, flag: 'leader' } },
      { fx: { trust: -2 } },
    ],
    it: { t: 'Lo spogliatoio in rivolta', d: 'Stipendi in ritardo, risultati pessimi. I giovani vogliono scioperare.', o: [
      { l: 'Metti pace', r: 'Parli con la società e con i ragazzi. Si torna a giocare.' },
      { l: 'Non ti immischi', r: 'Resta tutto in sospeso, e qualcuno ti accusa di pensare solo a te.' },
    ] },
    en: { t: 'A dressing-room revolt', d: 'Late wages, terrible results. The young players want to strike.', o: [
      { l: 'Make peace', r: 'You talk to the board and the lads. Everyone goes back to playing.' },
      { l: 'Stay out of it', r: 'Everything stays unresolved, and someone accuses you of only thinking about yourself.' },
    ] },
  },
  {
    id: 'v_testimonial', kind: 'incident', w: 4, when: { ageMin: 32, flags: ['loyal'] },
    fx: { morale: 8, reputation: 3 },
    it: { t: 'La partita d’addio anticipata', d: 'Il club ti organizza una serata celebrativa per i tuoi anni in maglia. Lo stadio è pieno.' },
    en: { t: 'A celebration night', d: 'The club organises an evening to celebrate your years in the shirt. The stadium is full.' },
  },
  {
    id: 'v_replacement', kind: 'incident', w: 4, when: { ageMin: 31 },
    fx: { morale: -4, trust: -3 },
    it: { t: 'Il tuo erede', d: 'Il club presenta un ventenne nel tuo ruolo. In conferenza lo chiamano «il futuro».' },
    en: { t: 'Your heir', d: 'The club unveils a twenty-year-old in your position. At the press conference they call him “the future”.' },
  },
  {
    id: 'v_finished', kind: 'incident', w: 3, when: { ageMin: 32 },
    fx: { morale: -5, mods: { form: 0.02 } },
    it: { t: '«È finito»', d: 'Un giornale titola che sei sul viale del tramonto. Ritagli l’articolo: servirà come carburante.' },
    en: { t: '“He’s finished”', d: 'A newspaper headline says you’re in decline. You cut out the article: it’ll be fuel.' },
  },
  {
    id: 'v_business', kind: 'decision', group: 'life', w: 3, when: { ageMin: 30 },
    o: [
      { fx: { morale: 3, fitness: -2, flag: 'business' } },
      { fx: { fitness: 1 } },
    ],
    it: { t: 'Un ristorante', d: 'Un amico ti propone di aprire un ristorante insieme.', o: [
      { l: 'Ci stai', r: 'Il locale va bene. Qualche sera fai tardi più del dovuto.' },
      { l: 'Dopo il ritiro', r: 'Adesso la testa deve restare sul campo.' },
    ] },
    en: { t: 'A restaurant', d: 'A friend suggests opening a restaurant together.', o: [
      { l: 'You’re in', r: 'It does well. Some nights you stay out later than you should.' },
      { l: 'After retirement', r: 'For now your head stays on the pitch.' },
    ] },
  },
  {
    id: 'v_family_home', kind: 'decision', group: 'life', w: 4, when: { ageMin: 30, abroad: true },
    o: [
      { fx: { flag: 'wantsHome', morale: 3 } },
      { fx: { morale: -3, trust: 2 } },
    ],
    it: { t: 'La famiglia vuole tornare', d: 'I figli crescono lontano dai nonni. A casa ti chiedono quando rientrerai.', o: [
      { l: 'Cerchi una squadra in patria', r: 'A fine stagione il procuratore ascolterà solo offerte dal tuo paese.' },
      { l: 'Rimanete', r: 'La famiglia accetta, ma il discorso tornerà.' },
    ] },
    en: { t: 'Your family wants to go home', d: 'The kids are growing up far from their grandparents. Back home they ask when you’ll return.', o: [
      { l: 'Look for a club at home', r: 'At the end of the season your agent will only listen to offers from your country.' },
      { l: 'Stay', r: 'The family accepts, but the subject will come back.' },
    ] },
  },
  {
    id: 'v_last_push', kind: 'decision', group: 'life', w: 3, when: { ageMin: 31, tierMax: 2, natCalled: true },
    o: [
      { fx: { nat: { retired: true }, fitness: 5, mods: { form: 0.03 } } },
      { fx: { fitness: -4 } },
    ],
    it: { t: 'Un ultimo trofeo con il club', d: 'Per dare tutto al club ti suggeriscono di lasciare la nazionale.', o: [
      { l: 'Lasci la nazionale', r: 'Estate di riposo. Arrivi a maggio con le gambe fresche.' },
      { l: 'Tieni tutto', r: 'Club e nazionale. Il calendario non perdona.' },
    ] },
    en: { t: 'One last trophy with the club', d: 'To give everything to the club, they suggest you quit the national team.', o: [
      { l: 'Quit the national team', r: 'A summer of rest. You reach May with fresh legs.' },
      { l: 'Keep both', r: 'Club and country. The calendar shows no mercy.' },
    ] },
  },
  {
    id: 'v_armband_pass', kind: 'decision', group: 'life', w: 3, when: { ageMin: 32, flags: ['captain'] },
    o: [
      { fx: { unflag: 'captain', morale: 2, trust: 2 } },
      { fx: { trust: -2, morale: 1 } },
    ],
    it: { t: 'Passare la fascia', d: 'Il giovane leader della squadra è pronto per diventare capitano.', o: [
      { l: 'Gliela passi tu', r: 'Gliela metti al braccio davanti a tutti. Un gesto che lo spogliatoio ricorderà.' },
      { l: 'La tieni fino alla fine', r: 'Te la sei guadagnata. Qualcuno però mormora.' },
    ] },
    en: { t: 'Passing on the armband', d: 'The team’s young leader is ready to be captain.', o: [
      { l: 'Hand it over yourself', r: 'You put it on his arm in front of everyone. A gesture the dressing room will remember.' },
      { l: 'Keep it to the end', r: 'You earned it. Some people grumble, though.' },
    ] },
  },

  /* ======================= FINE CARRIERA ======================= */
  {
    id: 'e_one_more_year', kind: 'decision', group: 'life', w: 7, when: { ageMin: 34, notFlags: ['lastSeason'] },
    o: [
      { fx: { morale: 3, mods: { minutes: -0.1 } } },
      { fx: { flag: 'wantsLower', morale: 2 } },
      { fx: { flag: 'lastSeason', morale: 6 } },
    ],
    it: { t: 'Un anno ancora', d: 'Il {club} ti offre un anno di contratto, con uno stipendio più basso e un ruolo da chioccia.', o: [
      { l: 'Firmi per un anno', r: 'Giochi meno, insegni di più. È ancora calcio.' },
      { l: 'Cerchi una categoria più bassa', r: 'Vuoi giocare ogni domenica. A giugno il procuratore guarderà più in basso.' },
      { l: 'Annunci l’ultima stagione', r: 'Lo dici in conferenza stampa. Ogni partita, da adesso, è un addio.' },
    ] },
    en: { t: 'One more year', d: '{club} offer you a one-year deal, lower wages and a mentoring role.', o: [
      { l: 'Sign for a year', r: 'You play less and teach more. It’s still football.' },
      { l: 'Look for a lower division', r: 'You want to play every Sunday. In June your agent will look further down.' },
      { l: 'Announce your final season', r: 'You say it at the press conference. From now, every game is a goodbye.' },
    ] },
  },
  {
    id: 'e_farewell_tour', kind: 'incident', w: 6, when: { ageMin: 34, flags: ['lastSeason'] },
    fx: { morale: 10, reputation: 3, mods: { minApps: 3 } },
    it: { t: 'Gli applausi degli avversari', d: 'In ogni stadio, anche quelli nemici, al tuo ingresso parte un applauso.' },
    en: { t: 'Applause from rival fans', d: 'In every stadium, even hostile ones, applause starts as you come on.' },
  },
  {
    id: 'e_player_coach', kind: 'decision', group: 'life', w: 4, when: { ageMin: 35, flags: ['badges'] },
    o: [
      { fx: { flag: 'playerCoach', mods: { minutes: -0.2 }, morale: 4 } },
      { fx: { morale: 1 } },
    ],
    it: { t: 'Giocatore e vice allenatore', d: 'L’allenatore ti chiede di fargli da vice, continuando a giocare quando serve.', o: [
      { l: 'Accetti', r: 'Metà del tempo in campo, metà a bordo campo. Stai già preparando il dopo.' },
      { l: 'Solo giocatore', r: 'Finché si gioca, si gioca.' },
    ] },
    en: { t: 'Player and assistant coach', d: 'The coach asks you to be his assistant while still playing when needed.', o: [
      { l: 'Accept', r: 'Half the time on the pitch, half on the touchline. You’re already preparing for afterwards.' },
      { l: 'Player only', r: 'While there’s playing, you play.' },
    ] },
  },
  {
    id: 'e_body_stop', kind: 'incident', w: 4, when: { ageMin: 35 },
    fx: { fitness: -8, mods: { injuryRisk: 0.06 } },
    it: { t: 'Il corpo chiede il conto', d: 'Il tendine d’Achille fa male ogni mattina. Il medico parla di usura, non di infortunio.' },
    en: { t: 'The body sends the bill', d: 'Your Achilles hurts every morning. The doctor talks about wear, not injury.' },
  },
  {
    id: 'e_hometown', kind: 'decision', group: 'life', w: 4, when: { ageMin: 34 },
    o: [
      { fx: { flag: 'wantsHome', morale: 6 } },
      { fx: { morale: 1 } },
    ],
    it: { t: 'La squadra della tua città', d: 'Il club dove hai iniziato da bambino ti scrive: vorrebbero chiudere la tua carriera insieme.', o: [
      { l: 'Ci pensi davvero', r: 'A fine stagione arriverà la loro offerta.' },
      { l: 'Ringrazi, ma no', r: 'Il cerchio lo chiuderai in un altro modo.' },
    ] },
    en: { t: 'Your hometown club', d: 'The club where you started as a boy writes: they’d like to close your career together.', o: [
      { l: 'Seriously consider it', r: 'At the end of the season their offer will arrive.' },
      { l: 'Thanks, but no', r: 'You’ll close the circle another way.' },
    ] },
  },
  {
    id: 'e_documentary', kind: 'decision', group: 'life', w: 3, when: { ageMin: 34, repMin: 50 },
    o: [
      { fx: { reputation: 4, morale: 3, fitness: -2 } },
      { fx: { morale: 1 } },
    ],
    it: { t: 'Il documentario', d: 'Una piattaforma vuole girare un documentario sulla tua ultima stagione.', o: [
      { l: 'Accetti le telecamere', r: 'Ti seguono ovunque. Il trailer commuove mezzo paese.' },
      { l: 'Niente telecamere', r: 'L’ultima stagione la vuoi vivere senza raccontarla.' },
    ] },
    en: { t: 'The documentary', d: 'A streaming platform wants to film a documentary about your last season.', o: [
      { l: 'Accept the cameras', r: 'They follow you everywhere. The trailer moves half the country.' },
      { l: 'No cameras', r: 'You want to live your last season without narrating it.' },
    ] },
  },
  {
    id: 'e_last_derby', kind: 'incident', w: 4, when: { ageMin: 35 },
    fx: { morale: 8, mods: { minApps: 1 } },
    it: { t: 'L’ultimo derby', d: 'Al cambio, al settantesimo, si alzano in piedi anche i tifosi avversari.' },
    en: { t: 'The last derby', d: 'When you’re subbed off in the seventieth minute, even the rival fans stand.' },
  },
  {
    id: 'e_academy_job', kind: 'decision', group: 'life', w: 3, when: { ageMin: 35 },
    o: [
      { fx: { flag: 'academyJob', morale: 3 } },
      { fx: { morale: 1 } },
    ],
    it: { t: 'Un posto nel settore giovanile', d: 'Il club ti propone di guidare l’Under 17 quando smetterai.', o: [
      { l: 'Accetti per il futuro', r: 'Sai già cosa farai il giorno dopo l’ultima partita.' },
      { l: 'Non vuoi pensarci ora', r: 'Il futuro può aspettare ancora un po’.' },
    ] },
    en: { t: 'A youth-academy job', d: 'The club offers you the U17 team when you stop.', o: [
      { l: 'Accept for the future', r: 'You already know what you’ll do the day after your last game.' },
      { l: 'Not now', r: 'The future can wait a little longer.' },
    ] },
  },
  {
    id: 'e_record', kind: 'decision', group: 'life', w: 3, when: { ageMin: 34, repMin: 40 },
    o: [
      { fx: { mods: { injuryRisk: 0.05, minutes: 0.05 }, morale: 2 } },
      { fx: { fitness: 5 } },
    ],
    it: { t: 'Il record di presenze', d: 'Ti mancano poche partite per il record di presenze del club.', o: [
      { l: 'Le vuoi tutte', r: 'Giochi anche stanco. Il record diventa un’ossessione.' },
      { l: 'Gestisci i minuti', r: 'Se arriverà, arriverà senza forzare.' },
    ] },
    en: { t: 'The appearance record', d: 'You’re a few games away from the club appearance record.', o: [
      { l: 'You want them all', r: 'You play even when tired. The record becomes an obsession.' },
      { l: 'Manage your minutes', r: 'If it comes, it comes without forcing it.' },
    ] },
  },
  {
    id: 'e_tv_career', kind: 'decision', group: 'life', w: 3, when: { ageMin: 35, repMin: 50 },
    o: [
      { fx: { flag: 'tvJob', morale: 2 } },
      { fx: { morale: 1 } },
    ],
    it: { t: 'Commentatore', d: 'Una televisione ti offre un contratto da commentatore per quando avrai smesso.', o: [
      { l: 'Firmi', r: 'Il microfono ti aspetta. Intanto studi le partite con un occhio nuovo.' },
      { l: 'Preferisci il campo', r: 'Il tuo futuro è in panchina, non in studio.' },
    ] },
    en: { t: 'Pundit', d: 'A TV channel offers you a commentator contract for when you retire.', o: [
      { l: 'Sign', r: 'The microphone awaits. Meanwhile you study games with a new eye.' },
      { l: 'Prefer the pitch', r: 'Your future is in the dugout, not the studio.' },
    ] },
  },
  {
    id: 'e_letter', kind: 'decision', group: 'life', w: 3, when: { ageMin: 36 },
    o: [
      { fx: { morale: 5, reputation: 2 } },
      { fx: { morale: 2 } },
    ],
    it: { t: 'Una lettera ai tifosi', d: 'Senti il bisogno di ringraziare chi ti ha seguito per vent’anni.', o: [
      { l: 'La scrivi e la pubblichi', r: 'Migliaia di risposte. Qualcuno ti manda la foto del primo autografo.' },
      { l: 'Li ringrazi in campo', r: 'Un giro di campo a fine partita vale più di mille parole.' },
    ] },
    en: { t: 'A letter to the fans', d: 'You feel the need to thank the people who followed you for twenty years.', o: [
      { l: 'Write and publish it', r: 'Thousands of replies. Someone sends a photo of your first autograph.' },
      { l: 'Thank them on the pitch', r: 'A lap of honour after the game is worth a thousand words.' },
    ] },
  },
];
