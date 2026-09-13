/* Eventi legati al ruolo. Le doti toccate sono solo quelle del ruolo:
   POR reflexes handling positioning aerial distribution composure
   DC  marking tackling heading positioning strength passing
   TZ  pace stamina tackling crossing marking dribbling
   MED tackling passing positioning stamina vision strength
   MEZ passing stamina vision shooting dribbling tackling
   ALA pace dribbling crossing finishing technique vision
   PUN finishing positioning heading strength technique pace */

const R = (roles, extra = {}) => ({ roles, ...extra });

export default [
  /* ======================= PORTIERE ======================= */
  {
    id: 'gk_notebook', kind: 'decision', group: 'role', w: 6, when: R(['POR'], { ageMin: 17 }),
    o: [
      { fx: { attrs: { composure: 2 }, fitness: -2, mods: { form: 0.02 } } },
      { fx: { attrs: { reflexes: 2 }, morale: 2 } },
    ],
    it: { t: 'Il quaderno dei rigoristi', d: 'Il preparatore dei portieri ti passa un file con i rigori degli ultimi tre anni di tutti gli attaccanti del campionato.', o: [
      { l: 'Lo studi ogni sera', r: 'A marzo sai dove tira mezzo campionato. Dormi meno, ma sul dischetto non tremi.' },
      { l: 'Ti fidi dell’istinto', r: 'Lasci il quaderno nell’armadietto. Lavori sui riflessi e ti tieni la testa leggera.' },
    ] },
    en: { t: 'The penalty notebook', d: 'The goalkeeping coach hands you a file with every penalty taken by every striker in the league over three years.', o: [
      { l: 'Study it every night', r: 'By March you know where half the league shoots. Less sleep, but you don’t shake on the spot.' },
      { l: 'Trust your instinct', r: 'The notebook stays in the locker. You work on reflexes and keep your head light.' },
    ] },
  },
  {
    id: 'gk_sweeper', kind: 'decision', group: 'role', w: 5, when: R(['POR'], { ageMin: 19 }),
    o: [
      { fx: { attrs: { distribution: 3 }, trust: 6, mods: { form: -0.02 } } },
      { fx: { attrs: { reflexes: 1, positioning: 1 }, trust: -8 } },
    ],
    it: { t: 'Portiere di movimento', d: 'Il nuovo allenatore vuole un portiere che giochi con i piedi, esca fino a trenta metri e imposti l’azione.', o: [
      { l: 'Accetti la sfida', r: 'I primi mesi qualche retropassaggio ti fa sudare freddo. Poi i compagni cominciano a cercarti.' },
      { l: 'Resti sulla linea', r: 'Continui a parare come sai. L’allenatore annota il rifiuto e ti guarda diverso.' },
    ] },
    en: { t: 'Sweeper-keeper', d: 'The new coach wants a keeper who plays with his feet, sweeps up to thirty metres out and starts attacks.', o: [
      { l: 'Take the challenge', r: 'For a few months back-passes make you sweat. Then team-mates start looking for you.' },
      { l: 'Stay on your line', r: 'You keep saving the way you know. The coach notes the refusal and looks at you differently.' },
    ] },
  },
  {
    id: 'gk_howler', kind: 'incident', w: 4, when: R(['POR'], { ageMin: 17 }),
    fx: { morale: -8, reputation: -2, attrs: { composure: 1 }, mods: { minApps: 1, minConceded: 1 } },
    it: { t: 'La papera in diretta', d: 'Un tiro centrale ti scivola sotto il corpo. Il video gira per una settimana. Da quel giorno ti alleni sulla presa con una rabbia nuova.' },
    en: { t: 'The live howler', d: 'A tame shot slips under your body. The clip circulates for a week. From that day you train your handling with a new anger.' },
  },
  {
    id: 'gk_second', kind: 'decision', group: 'role', w: 6, when: R(['POR'], { ageMax: 23, tierMax: 3 }),
    o: [
      { fx: { attrs: { composure: 3, positioning: 2 }, mods: { minutes: -0.15 }, morale: -3 } },
      { fx: { flag: 'wantsLoan', morale: 2 } },
      { fx: { p: 0.5, base: { attrs: { reflexes: 2 }, trust: 4 }, win: { mods: { minutes: 0.2 }, morale: 4 }, lose: { trust: 0, morale: -4 } } },
    ],
    it: { t: 'Il numero due', d: 'Davanti a te c’è un portiere di trentaquattro anni che non sbaglia mai. L’allenatore dice che il tuo momento arriverà.', o: [
      { l: 'Aspetti e impari', r: 'Lo guardi allenarsi ogni mattina. Giochi poco, ma capisci perché non sbaglia mai.' },
      { l: 'Chiedi il prestito', r: 'Il direttore sportivo annuisce: a fine stagione ci sarà una squadra dove giocherai.' },
      { l: 'Gli fai la guerra in allenamento', rw: 'Ogni partitella la pari tutta. A novembre l’allenatore cambia idea.', rl: 'Il veterano non sbaglia nemmeno sotto pressione. Tu intanto ti sei fatto nemico lo spogliatoio.' },
    ] },
    en: { t: 'Number two', d: 'Ahead of you is a thirty-four-year-old keeper who never makes a mistake. The coach says your time will come.', o: [
      { l: 'Wait and learn', r: 'You watch him train every morning. You play little, but you understand why he never errs.' },
      { l: 'Ask for a loan', r: 'The director nods: at the end of the season there will be a club where you play.' },
      { l: 'Go to war in training', rw: 'You save everything in every practice match. In November the coach changes his mind.', rl: 'The veteran doesn’t crack under pressure. Meanwhile you’ve made enemies in the dressing room.' },
    ] },
  },
  {
    id: 'gk_crosses', kind: 'decision', group: 'role', w: 5, when: R(['POR'], { ageMin: 18 }),
    o: [
      { fx: { attrs: { aerial: 3 }, fitness: -3 } },
      { fx: { attrs: { composure: 2, positioning: 1 }, trust: 3 } },
    ],
    it: { t: 'Gol da calcio d’angolo', d: 'La squadra ha preso cinque gol sui cross in un mese. Tutti guardano te.', o: [
      { l: 'Sessioni extra sulle uscite', r: 'Ore a saltare in mezzo a sei compagni che ti spingono. Le spalle fanno male, le mani prendono il pallone.' },
      { l: 'Organizzi la difesa a voce', r: 'Diventi quello che urla. Le marcature si sistemano e l’allenatore apprezza.' },
    ] },
    en: { t: 'Goals from corners', d: 'The team conceded five goals from crosses in a month. Everyone is looking at you.', o: [
      { l: 'Extra sessions on claiming', r: 'Hours jumping among six team-mates shoving you. Shoulders ache, hands find the ball.' },
      { l: 'Organise the defence by voice', r: 'You become the one who shouts. The marking sorts itself out and the coach approves.' },
    ] },
  },
  {
    id: 'gk_kicking', kind: 'decision', group: 'role', w: 4, when: R(['POR'], { ageMin: 20 }),
    o: [
      { fx: { attrs: { distribution: 3 } } },
      { fx: { attrs: { reflexes: 2 } } },
    ],
    it: { t: 'Lo specialista del rinvio', d: 'Un ex giocatore di football americano offre sedute private sui calci lunghi.', o: [
      { l: 'Ci vai', r: 'Il tuo rinvio arriva sulla trequarti avversaria. Gli attaccanti ti ringraziano.' },
      { l: 'Resti sui riflessi', r: 'Preferisci le sedute a un metro dalla macchina lanciapalle.' },
    ] },
    en: { t: 'The kicking specialist', d: 'A former American football punter offers private sessions on long kicks.', o: [
      { l: 'Go', r: 'Your goal kicks now reach the opposition’s final third. The strikers thank you.' },
      { l: 'Stick to reflexes', r: 'You prefer sessions a metre from the ball machine.' },
    ] },
  },
  {
    id: 'gk_armband', kind: 'decision', group: 'role', w: 4, when: R(['POR'], { ageMin: 26, repMin: 45, notFlags: ['captain'] }),
    o: [
      { fx: { flag: 'captain', trust: 5, morale: 3, attrs: { composure: 2 } } },
      { fx: { morale: 1 } },
    ],
    it: { t: 'La fascia', d: 'Il capitano va via a gennaio. I compagni votano: vogliono te.', o: [
      { l: 'La prendi', r: 'Un portiere capitano parla con l’arbitro da lontano. Impari a farti sentire.' },
      { l: 'La lasci a un difensore', r: 'Preferisci pensare ai pali. Nessuno te lo rimprovera.' },
    ] },
    en: { t: 'The armband', d: 'The captain leaves in January. The players vote: they want you.', o: [
      { l: 'Take it', r: 'A captain in goal talks to the referee from far away. You learn to make yourself heard.' },
      { l: 'Leave it to a defender', r: 'You’d rather think about your posts. Nobody holds it against you.' },
    ] },
  },
  {
    id: 'gk_rival_signing', kind: 'decision', group: 'role', w: 5, when: R(['POR'], { ageMin: 21, tierMax: 2 }),
    o: [
      { fx: { p: 0.55, base: { attrs: { reflexes: 2 }, trust: -3 }, win: { mods: { minutes: 0.1 }, morale: 4 }, lose: { mods: { minutes: -0.25 }, morale: -6 } } },
      { fx: { flag: 'wantsOut', morale: -2 } },
      { fx: { mods: { minutes: -0.12 }, morale: -2, fitness: 4 } },
    ],
    it: { t: 'Arriva un nazionale', d: 'Il club compra un portiere titolare della sua nazionale. Ufficialmente, «per la concorrenza».', o: [
      { l: 'Ti prendi il posto sul campo', rw: 'Parate decisive nelle prime tre partite. Il nuovo arrivato si accomoda in panchina.', rl: 'Lui parte meglio, tu prendi un gol evitabile. La panchina diventa la tua casa.' },
      { l: 'Chiedi di essere ceduto', r: 'Il procuratore comincia a telefonare. Il club non la prende bene.' },
      { l: 'Accetti l’alternanza', r: 'Coppe a te, campionato a lui. Giochi meno, arrivi alle partite fresco.' },
    ] },
    en: { t: 'An international arrives', d: 'The club buys a keeper who starts for his national team. Officially, “for competition”.', o: [
      { l: 'Win the place on the pitch', rw: 'Decisive saves in the first three games. The new arrival sits on the bench.', rl: 'He starts better, you concede a soft goal. The bench becomes your home.' },
      { l: 'Ask to be sold', r: 'Your agent starts making calls. The club doesn’t take it well.' },
      { l: 'Accept rotation', r: 'Cups for you, league for him. You play less and arrive fresh.' },
    ] },
  },
  {
    id: 'gk_eyes', kind: 'incident', w: 3, when: R(['POR'], { ageMin: 24 }),
    fx: { attrs: { reflexes: 2 }, mods: { form: -0.02 } },
    it: { t: 'La visita oculistica', d: 'Il medico scopre un leggero difetto alla vista. Con le lenti a contatto le prime settimane sono strane, poi il pallone arriva più nitido di prima.' },
    en: { t: 'The eye test', d: 'The doctor finds a slight defect in your sight. With contact lenses the first weeks feel odd, then the ball arrives sharper than ever.' },
  },
  {
    id: 'gk_shootout', kind: 'decision', group: 'role', w: 4, when: R(['POR'], { cont: true }),
    o: [
      { fx: { attrs: { composure: 2 }, mods: { form: 0.02, minApps: 1 } } },
      { fx: { p: 0.5, base: { attrs: { composure: 1 }, mods: { minApps: 1 } }, win: { reputation: 3, morale: 5 }, lose: { reputation: -3, morale: -3 } } },
    ],
    it: { t: 'Serata di coppa ai rigori', d: 'Quarti di finale, si va ai rigori. Hai un minuto prima del primo tiro.', o: [
      { l: 'Ripassi dove tirano', r: 'Ti ricordi tre rigoristi su cinque. Ne pari uno, ti guardano tutti in un altro modo.' },
      { l: 'Provochi i rigoristi', rw: 'Balli sulla linea, sorridi. Due sbagliano. Il video delle tue smorfie diventa famoso.', rl: 'Il primo ti spiazza e ti fa l’occhiolino. Il pubblico avversario non smette di ridere.' },
    ] },
    en: { t: 'Cup night on penalties', d: 'Quarter-final, it goes to penalties. You have one minute before the first kick.', o: [
      { l: 'Review where they shoot', r: 'You remember three takers out of five. You save one and they all look at you differently.' },
      { l: 'Wind up the takers', rw: 'You dance on the line and smile. Two of them miss. The clip of your faces goes viral.', rl: 'The first one sends you the wrong way and winks. The away fans can’t stop laughing.' },
    ] },
  },
  {
    id: 'gk_mentor', kind: 'decision', group: 'role', w: 4, when: R(['POR'], { ageMin: 32 }),
    o: [
      { fx: { flag: 'mentor', morale: 4, trust: 2, mods: { minutes: -0.05 } } },
      { fx: { attrs: { composure: 1 }, trust: -2 } },
    ],
    it: { t: 'Il ragazzo nuovo', d: 'Dalla primavera sale un portiere di diciotto anni. Tutti dicono che prenderà il tuo posto.', o: [
      { l: 'Gli insegni tutto', r: 'Gli spieghi come si legge un tiratore dalla rincorsa. Qualche partita la lascerai a lui, ed è giusto così.' },
      { l: 'Tieni per te i segreti', r: 'Il posto è ancora tuo. Lo spogliatoio però nota la freddezza.' },
    ] },
    en: { t: 'The new kid', d: 'An eighteen-year-old keeper comes up from the youth team. Everyone says he’ll take your place.', o: [
      { l: 'Teach him everything', r: 'You show him how to read a taker from his run-up. You’ll leave him a few games, and that’s fair.' },
      { l: 'Keep your secrets', r: 'The place is still yours. The dressing room notices the coldness.' },
    ] },
  },
  {
    id: 'gk_ageing_reflexes', kind: 'decision', group: 'role', w: 5, when: R(['POR'], { ageMin: 33 }),
    o: [
      { fx: { attrs: { positioning: 3, reflexes: -1 } } },
      { fx: { attrs: { reflexes: 2 }, fitness: -5, mods: { injuryRisk: 0.03 } } },
    ],
    it: { t: 'Un decimo di secondo', d: 'I dati del preparatore sono chiari: i tuoi riflessi sono più lenti di un decimo rispetto a tre anni fa.', o: [
      { l: 'Pari con la testa', r: 'Ti piazzi mezzo metro prima. Le parate spettacolari diminuiscono, i gol subiti no.' },
      { l: 'Raddoppi il lavoro sui riflessi', r: 'Il decimo lo recuperi. La schiena, però, comincia a lamentarsi.' },
    ] },
    en: { t: 'A tenth of a second', d: 'The coach’s data is clear: your reflexes are a tenth slower than three years ago.', o: [
      { l: 'Save with your head', r: 'You position yourself half a metre earlier. Fewer spectacular saves, but no more goals conceded.' },
      { l: 'Double the reflex work', r: 'You win the tenth back. Your back, however, starts to complain.' },
    ] },
  },

  /* ======================= DIFENSORE CENTRALE ======================= */
  {
    id: 'dc_markstar', kind: 'decision', group: 'role', w: 6, when: R(['DC'], { ageMin: 18 }),
    o: [
      { fx: { p: 0.55, base: { attrs: { marking: 2 }, mods: { minApps: 1 } }, win: { reputation: 5, morale: 4 }, lose: { morale: -5, reputation: -2 } } },
      { fx: { attrs: { positioning: 2 }, trust: 2, mods: { minApps: 1 } } },
    ],
    it: { t: 'Il capocannoniere', d: 'Domenica arriva il capocannoniere del campionato. L’allenatore ti chiede come vuoi fermarlo.', o: [
      { l: 'A uomo, ovunque vada', rw: 'Non tocca palla per novanta minuti. A fine partita ti chiede la maglia.', rl: 'Ti porta fuori area e un compagno segna nello spazio che hai lasciato.' },
      { l: 'A zona, con i compagni', r: 'Lo accompagnate a turno. Segna solo su rigore, e l’allenatore è contento lo stesso.' },
    ] },
    en: { t: 'The top scorer', d: 'On Sunday the league’s top scorer comes to town. The coach asks how you want to stop him.', o: [
      { l: 'Man-to-man, wherever he goes', rw: 'He doesn’t touch the ball for ninety minutes. At full time he asks for your shirt.', rl: 'He drags you out of the box and a team-mate scores in the space you left.' },
      { l: 'Zonal, with the others', r: 'You pass him around. He scores only from a penalty, and the coach is happy anyway.' },
    ] },
  },
  {
    id: 'dc_buildup', kind: 'decision', group: 'role', w: 5, when: R(['DC'], { ageMin: 19 }),
    o: [
      { fx: { attrs: { passing: 3 }, mods: { form: -0.02 }, trust: 3 } },
      { fx: { attrs: { marking: 1 }, trust: -5 } },
    ],
    it: { t: 'Si esce palla al piede', d: 'Il nuovo tecnico non vuole lanci lunghi: il difensore centrale deve impostare.', o: [
      { l: 'Ti ci metti', r: 'Due palle perse pericolose a settembre, poi il passaggio in verticale diventa il tuo marchio.' },
      { l: 'Il difensore difende', r: 'Continui a spazzare. Non sbagli, ma nel sistema nuovo c’è sempre meno posto per te.' },
    ] },
    en: { t: 'Playing out from the back', d: 'The new manager bans long balls: the centre-back has to build play.', o: [
      { l: 'Commit to it', r: 'Two dangerous turnovers in September, then the forward pass becomes your trademark.' },
      { l: 'A defender defends', r: 'You keep clearing it. No mistakes, but there’s less and less room for you in the new system.' },
    ] },
  },
  {
    id: 'dc_setpieces', kind: 'decision', group: 'role', w: 5, when: R(['DC'], { ageMin: 17 }),
    o: [
      { fx: { attrs: { heading: 3 }, fitness: -2, mods: { goals: 1.2 } } },
      { fx: { attrs: { positioning: 2 } } },
    ],
    it: { t: 'Il tecnico delle palle inattive', d: 'Il club assume un allenatore solo per corner e punizioni. Cerca un difensore che attacchi il primo palo.', o: [
      { l: 'Ti proponi', r: 'Stacchi di testa dopo ogni allenamento. Qualche gol arriverà.' },
      { l: 'Resti a coprire', r: 'Qualcuno deve stare dietro: tu impari a leggere i contropiedi.' },
    ] },
    en: { t: 'The set-piece coach', d: 'The club hires a coach just for corners and free kicks. He wants a defender to attack the near post.', o: [
      { l: 'Volunteer', r: 'Headers after every session. A few goals will come.' },
      { l: 'Stay back and cover', r: 'Someone has to stay back: you learn to read counter-attacks.' },
    ] },
  },
  {
    id: 'dc_redcard', kind: 'incident', w: 4, when: R(['DC'], { ageMin: 18 }),
    fx: { trust: -6, morale: -5, mods: { minutes: -0.05, minApps: 1 } },
    it: { t: 'Rosso nel derby', d: 'Ultimo uomo, fallo da dietro al minuto venti. Tre giornate di squalifica e una settimana di prime pagine.' },
    en: { t: 'Red card in the derby', d: 'Last man, a foul from behind in the twentieth minute. A three-match ban and a week of front pages.' },
  },
  {
    id: 'dc_partner', kind: 'decision', group: 'role', w: 4, when: R(['DC'], { ageMin: 20, tierMax: 3 }),
    o: [
      { fx: { flag: 'leader', attrs: { positioning: 2 }, trust: 3 } },
      { fx: { attrs: { marking: 2 }, morale: 2 } },
    ],
    it: { t: 'Il nuovo compagno di reparto', d: 'Arriva accanto a te un centrale esperto. Qualcuno deve comandare la linea.', o: [
      { l: 'Comandi tu', r: 'Chiami il fuorigioco, alzi la linea. Lui ti lascia fare e ti copre le spalle.' },
      { l: 'Lasci fare a lui', r: 'Ascolti e marchi. Impari più in sei mesi che in tre anni.' },
    ] },
    en: { t: 'The new partner', d: 'An experienced centre-back arrives next to you. Someone has to command the line.', o: [
      { l: 'You command it', r: 'You call offside and push the line up. He lets you and covers your back.' },
      { l: 'Let him do it', r: 'You listen and mark. You learn more in six months than in three years.' },
    ] },
  },
  {
    id: 'dc_gym', kind: 'decision', group: 'role', w: 5, when: R(['DC'], { ageMin: 18 }),
    o: [
      { fx: { attrs: { strength: 3 }, fitness: -3, mods: { injuryRisk: 0.02 } } },
      { fx: { fitness: 5, flag: 'carefulBody' } },
    ],
    it: { t: 'Palestra o mobilità', d: 'Il preparatore atletico ti mette davanti due programmi estivi.', o: [
      { l: 'Pesi, tanti', r: 'Metti su quattro chili di muscoli. Nei contrasti non ti sposta nessuno.' },
      { l: 'Mobilità e prevenzione', r: 'Yoga, elastici, sonno. Il corpo ringrazia e ti ringrazierà per anni.' },
    ] },
    en: { t: 'Gym or mobility', d: 'The fitness coach offers two summer programmes.', o: [
      { l: 'Weights, lots of them', r: 'You add four kilos of muscle. Nobody moves you in duels.' },
      { l: 'Mobility and prevention', r: 'Yoga, bands, sleep. Your body thanks you and will for years.' },
    ] },
  },
  {
    id: 'dc_fullback', kind: 'decision', group: 'role', w: 4, when: R(['DC'], { ageMin: 19 }),
    o: [
      { fx: { trust: 6, mods: { minutes: 0.08 }, morale: -2, attrs: { tackling: 1 } } },
      { fx: { trust: -6 } },
    ],
    it: { t: 'Emergenza sulla fascia', d: 'Tre terzini infortunati. L’allenatore ti chiede di giocare a destra per due mesi.', o: [
      { l: 'Ti adatti', r: 'Soffri contro le ali veloci, ma giochi sempre. L’allenatore non se lo scorda.' },
      { l: 'Rifiuti', r: 'Resti centrale in panchina. La cosa non passa inosservata.' },
    ] },
    en: { t: 'Full-back emergency', d: 'Three full-backs injured. The coach asks you to play right-back for two months.', o: [
      { l: 'Adapt', r: 'You suffer against quick wingers, but you play every game. The coach won’t forget.' },
      { l: 'Refuse', r: 'You stay a centre-back, on the bench. It doesn’t go unnoticed.' },
    ] },
  },
  {
    id: 'dc_armband', kind: 'decision', group: 'role', w: 4, when: R(['DC'], { ageMin: 27, repMin: 45, notFlags: ['captain'] }),
    o: [
      { fx: { flag: 'captain', trust: 6, morale: 4 } },
      { fx: { morale: 1 } },
    ],
    it: { t: 'Capitano', d: 'L’allenatore ti chiama nel suo ufficio con la fascia in mano.', o: [
      { l: 'Accetti', r: 'Da oggi le conferenze stampa difficili tocca farle a te.' },
      { l: 'Non ti senti pronto', r: 'La fascia va a un altro. Tu continui a guidare la difesa senza titoli.' },
    ] },
    en: { t: 'Captain', d: 'The coach calls you into his office with the armband in his hand.', o: [
      { l: 'Accept', r: 'From today, the hard press conferences are yours.' },
      { l: 'You don’t feel ready', r: 'The armband goes to someone else. You keep leading the defence without a title.' },
    ] },
  },
  {
    id: 'dc_slower', kind: 'decision', group: 'role', w: 5, when: R(['DC'], { ageMin: 31 }),
    o: [
      { fx: { attrs: { positioning: 3 } } },
      { fx: { attrs: { passing: 2, marking: 1 } } },
    ],
    it: { t: 'Gli attaccanti corrono di più', d: 'Nello scatto sui trenta metri ormai perdi con tutti.', o: [
      { l: 'Difendi più basso', r: 'Anticipi la giocata invece di inseguirla. Esperienza al posto delle gambe.' },
      { l: 'Chiedi la difesa a tre', r: 'Al centro dei tre non devi correre: devi pensare e passare.' },
    ] },
    en: { t: 'Strikers run faster', d: 'Over thirty metres you now lose to everyone.', o: [
      { l: 'Defend deeper', r: 'You read the play instead of chasing it. Experience instead of legs.' },
      { l: 'Ask for a back three', r: 'In the middle of three you don’t need to run: you need to think and pass.' },
    ] },
  },
  {
    id: 'dc_viral_tackle', kind: 'incident', w: 3, when: R(['DC'], { ageMin: 18 }),
    fx: { reputation: 4, morale: 3, mods: { minApps: 1 } },
    it: { t: 'Il salvataggio sulla linea', d: 'Una scivolata a porta vuota al novantesimo. Il video fa il giro del mondo con la musica epica sotto.' },
    en: { t: 'The goal-line clearance', d: 'A sliding clearance on the line in the ninetieth minute. The clip goes around the world with epic music.' },
  },

  /* ======================= TERZINO ======================= */
  {
    id: 'tz_overlap', kind: 'decision', group: 'role', w: 6, when: R(['TZ'], { ageMin: 18 }),
    o: [
      { fx: { attrs: { crossing: 2, stamina: 2 }, fitness: -3, mods: { assists: 1.15 } } },
      { fx: { attrs: { marking: 2 }, trust: 3 } },
    ],
    it: { t: 'Sovrapposizioni', d: 'L’allenatore vuole che tu arrivi sul fondo in ogni azione.', o: [
      { l: 'Su e giù per novanta minuti', r: 'Cross su cross. A fine partita non senti le gambe, ma la squadra crea di più.' },
      { l: 'Resti coperto', r: 'Qualcuno deve guardare le spalle. Sulla tua fascia non passa nessuno.' },
    ] },
    en: { t: 'Overlaps', d: 'The coach wants you on the byline in every attack.', o: [
      { l: 'Up and down for ninety minutes', r: 'Cross after cross. You can’t feel your legs at full time, but the team creates more.' },
      { l: 'Stay back', r: 'Someone has to watch the back. Nobody gets past on your side.' },
    ] },
  },
  {
    id: 'tz_otherside', kind: 'decision', group: 'role', w: 4, when: R(['TZ'], { ageMin: 19 }),
    o: [
      { fx: { p: 0.5, base: { attrs: { dribbling: 2 } }, win: { morale: 4, trust: 3 }, lose: { trust: -4 } } },
      { fx: { morale: -1 } },
    ],
    it: { t: 'Sulla fascia sbagliata', d: 'Serve un terzino sull’altra fascia. Dovresti giocare con il piede debole verso il fondo.', o: [
      { l: 'Ci provi', rw: 'Rientri sul piede forte e trovi spazi che nessuno si aspetta.', rl: 'Ogni cross finisce sul primo difensore. Torni a destra a febbraio.' },
      { l: 'Preferisci la tua fascia', r: 'Il posto lo prende un altro. Tu aspetti il tuo turno.' },
    ] },
    en: { t: 'The wrong flank', d: 'A full-back is needed on the other side. You’d have to go to the byline on your weak foot.', o: [
      { l: 'Give it a go', rw: 'You cut onto your strong foot and find spaces nobody expects.', rl: 'Every cross hits the first defender. You’re back on your side by February.' },
      { l: 'Prefer your own flank', r: 'Someone else takes the place. You wait your turn.' },
    ] },
  },
  {
    id: 'tz_winger', kind: 'decision', group: 'role', w: 4, when: R(['TZ'], { ageMax: 22 }),
    o: [
      { fx: { attrs: { dribbling: 3, crossing: 1, marking: -1 }, mods: { goals: 1.3 } } },
      { fx: { attrs: { tackling: 2 } } },
    ],
    it: { t: 'Un esperimento offensivo', d: 'In un’amichevole giochi da ala e fai due assist. L’allenatore vuole riprovarci.', o: [
      { l: 'Ci stai', r: 'Più dribbling, più tiri. Quando torni terzino, attacchi come un’ala.' },
      { l: 'Sei un terzino', r: 'Lo ringrazi e torni a lavorare sui contrasti.' },
    ] },
    en: { t: 'An attacking experiment', d: 'In a friendly you play as a winger and make two assists. The coach wants to try it again.', o: [
      { l: 'You’re in', r: 'More dribbling, more shots. When you go back to full-back, you attack like a winger.' },
      { l: 'You’re a full-back', r: 'You thank him and go back to working on tackles.' },
    ] },
  },
  {
    id: 'tz_altitude', kind: 'decision', group: 'role', w: 4, when: R(['TZ'], { ageMin: 17 }),
    o: [
      { fx: { attrs: { stamina: 3 }, fitness: -2 } },
      { fx: { morale: 2 } },
    ],
    it: { t: 'Il ritiro in altura', d: 'Il club organizza due settimane a duemila metri per chi vuole.', o: [
      { l: 'Ci vai', r: 'I primi giorni ti manca il fiato. A settembre corri più di tutti.' },
      { l: 'Vai al mare', r: 'Torni riposato e sereno. Il fiato è quello di sempre.' },
    ] },
    en: { t: 'Altitude camp', d: 'The club organises two weeks at two thousand metres for anyone who wants.', o: [
      { l: 'Go', r: 'You’re breathless for the first days. In September you outrun everyone.' },
      { l: 'Go to the beach', r: 'You come back rested and calm. Your stamina is what it was.' },
    ] },
  },
  {
    id: 'tz_crosscoach', kind: 'decision', group: 'role', w: 4, when: R(['TZ'], { ageMin: 20 }),
    o: [
      { fx: { attrs: { crossing: 3 } } },
      { fx: { attrs: { pace: 2 }, fitness: -2 } },
    ],
    it: { t: 'Cento cross al giorno', d: 'L’allenatore in seconda ti propone un lavoro specifico sul cross dopo gli allenamenti.', o: [
      { l: 'Cento cross al giorno', r: 'A dicembre il pallone arriva sempre sulla testa giusta.' },
      { l: 'Meglio gli scatti', r: 'Preferisci arrivare prima sul fondo che mettere il pallone meglio.' },
    ] },
    en: { t: 'A hundred crosses a day', d: 'The assistant coach suggests specific crossing work after training.', o: [
      { l: 'A hundred a day', r: 'By December the ball always finds the right head.' },
      { l: 'Sprints are better', r: 'You’d rather reach the byline first than deliver the ball better.' },
    ] },
  },
  {
    id: 'tz_nightmare', kind: 'incident', w: 3, when: R(['TZ'], { ageMin: 18 }),
    fx: { morale: -6, reputation: -3, attrs: { marking: 1 }, mods: { minApps: 1 } },
    it: { t: 'La serata storta', d: 'Un’ala di diciannove anni ti salta sei volte in un tempo, in diretta nazionale. Riguardi il video fino all’alba.' },
    en: { t: 'The bad night', d: 'A nineteen-year-old winger beats you six times in one half on national TV. You rewatch it until dawn.' },
  },
  {
    id: 'tz_inverted', kind: 'decision', group: 'role', w: 4, when: R(['TZ'], { ageMin: 23, tierMax: 3 }),
    o: [
      { fx: { attrs: { tackling: 2, stamina: 1 }, trust: 5 } },
      { fx: { attrs: { crossing: 2 } } },
    ],
    it: { t: 'Il terzino che entra dentro', d: 'L’allenatore vuole che in possesso tu venga a giocare in mezzo al campo, accanto al mediano.', o: [
      { l: 'Impari il nuovo ruolo', r: 'Vedi il campo da un’altra prospettiva. Il tecnico ti considera indispensabile.' },
      { l: 'Resti largo', r: 'Il gioco classico sulla fascia resta il tuo: cross e sovrapposizioni.' },
    ] },
    en: { t: 'The inverted full-back', d: 'The coach wants you to move into midfield next to the holding player when in possession.', o: [
      { l: 'Learn the new role', r: 'You see the pitch from another angle. The coach considers you indispensable.' },
      { l: 'Stay wide', r: 'The classic game on the flank stays yours: crosses and overlaps.' },
    ] },
  },
  {
    id: 'tz_losing_pace', kind: 'decision', group: 'role', w: 5, when: R(['TZ'], { ageMin: 30 }),
    o: [
      { fx: { attrs: { marking: 2, pace: -1 } } },
      { fx: { attrs: { pace: 2 }, fitness: -4, mods: { injuryRisk: 0.03 } } },
    ],
    it: { t: 'Lo scatto non è più quello', d: 'Le ali giovani ti arrivano davanti di mezzo passo.', o: [
      { l: 'Difendi di posizione', r: 'Le accompagni verso l’esterno e le chiudi prima. Corri meno, sbagli meno.' },
      { l: 'Allenatore dello sprint', r: 'Recuperi qualcosa. I muscoli, a trent’anni passati, protestano.' },
    ] },
    en: { t: 'The sprint isn’t what it was', d: 'Young wingers get half a step ahead of you.', o: [
      { l: 'Defend positionally', r: 'You show them wide and close them down earlier. Less running, fewer mistakes.' },
      { l: 'Hire a sprint coach', r: 'You win something back. Past thirty, the muscles protest.' },
    ] },
  },
  {
    id: 'tz_chant', kind: 'incident', w: 3, when: R(['TZ'], { ageMin: 20, repMin: 20 }),
    fx: { reputation: 3, morale: 4 },
    it: { t: 'Il coro della curva', d: 'I tifosi inventano un coro sulle tue discese sulla fascia. Lo cantano anche quando perdi palla.' },
    en: { t: 'The terrace chant', d: 'The fans invent a chant about your runs down the flank. They sing it even when you lose the ball.' },
  },

  /* ======================= MEDIANO ======================= */
  {
    id: 'med_screen', kind: 'decision', group: 'role', w: 6, when: R(['MED'], { ageMin: 18 }),
    o: [
      { fx: { attrs: { positioning: 3 }, trust: 4, mods: { goals: 0.6 } } },
      { fx: { p: 0.5, base: { attrs: { vision: 2 } }, win: { mods: { assists: 1.2 } }, lose: { trust: -5 } } },
    ],
    it: { t: 'Non superare la metà campo', d: 'L’allenatore disegna una linea sulla lavagna: il tuo lavoro finisce lì.', o: [
      { l: 'Diventi la diga', r: 'Recuperi palloni e li dai al più vicino. I difensori ti adorano.' },
      { l: 'Ogni tanto ti inserisci', rw: 'Un paio di inserimenti al momento giusto e l’allenatore chiude un occhio.', rl: 'Un contropiede nasce dal buco che hai lasciato. La lavagna torna fuori.' },
    ] },
    en: { t: 'Don’t cross halfway', d: 'The coach draws a line on the board: your job ends there.', o: [
      { l: 'Become the shield', r: 'You win the ball and give it to the nearest man. The defenders love you.' },
      { l: 'Push up now and then', rw: 'A couple of well-timed runs and the coach turns a blind eye.', rl: 'A counter-attack comes through the gap you left. The board comes out again.' },
    ] },
  },
  {
    id: 'med_diagonals', kind: 'decision', group: 'role', w: 5, when: R(['MED'], { ageMin: 19 }),
    o: [
      { fx: { attrs: { passing: 3, vision: 1 } } },
      { fx: { attrs: { positioning: 2 }, trust: 2 } },
    ],
    it: { t: 'Il cambio di gioco', d: 'Guardi le partite dei grandi registi e noti il lancio da trenta metri sulla fascia opposta.', o: [
      { l: 'Lo provi mille volte', r: 'In primavera il pallone attraversa il campo e arriva sul piede giusto.' },
      { l: 'Resti semplice', r: 'Due tocchi, sempre corto. Non perdi mai palla e l’allenatore lo sa.' },
    ] },
    en: { t: 'The switch of play', d: 'You watch the great playmakers and notice the thirty-metre ball to the far flank.', o: [
      { l: 'Try it a thousand times', r: 'By spring the ball crosses the pitch and lands on the right foot.' },
      { l: 'Keep it simple', r: 'Two touches, always short. You never lose the ball and the coach knows it.' },
    ] },
  },
  {
    id: 'med_suspension', kind: 'incident', w: 4, when: R(['MED'], { ageMin: 18 }),
    fx: { trust: -4, mods: { minutes: -0.04, minApps: 5 }, morale: -3 },
    it: { t: 'Il quinto giallo', d: 'Diffidato, entri in ritardo al novantesimo di una partita già vinta. Salti lo scontro diretto.' },
    en: { t: 'The fifth yellow', d: 'One booking from a ban, you go in late in the ninetieth minute of a game already won. You miss the big match.' },
  },
  {
    id: 'med_enforcer', kind: 'decision', group: 'role', w: 4, when: R(['MED'], { ageMin: 20 }),
    o: [
      { fx: { p: 0.5, base: { attrs: { tackling: 2 }, mods: { minApps: 1 } }, win: { reputation: 3 }, lose: { trust: -6, morale: -4 } } },
      { fx: { attrs: { positioning: 2 }, mods: { minApps: 1 } } },
    ],
    it: { t: 'Il loro numero dieci', d: 'Il fantasista avversario vi ha fatto due gol all’andata. Nello spogliatoio qualcuno dice di «fargli sentire il primo contrasto».', o: [
      { l: 'Entri duro al primo pallone', rw: 'Giallo, ma lui sparisce dalla partita. Vincete.', rl: 'Rosso diretto al decimo minuto. Perdete e l’allenatore non ti parla per una settimana.' },
      { l: 'Lo marchi pulito', r: 'Gli togli le linee di passaggio invece delle caviglie. Tocca pochi palloni.' },
    ] },
    en: { t: 'Their number ten', d: 'Their playmaker scored twice against you last time. In the dressing room someone says to “let him feel the first tackle”.', o: [
      { l: 'Go in hard on the first ball', rw: 'A yellow, but he vanishes from the game. You win.', rl: 'Straight red in the tenth minute. You lose and the coach doesn’t speak to you for a week.' },
      { l: 'Mark him cleanly', r: 'You take away his passing lanes rather than his ankles. He barely touches the ball.' },
    ] },
  },
  {
    id: 'med_regista', kind: 'decision', group: 'role', w: 4, when: R(['MED'], { ageMin: 22, styles: ['diga'] }),
    o: [
      { fx: { attrs: { vision: 3, passing: 2, tackling: -1 } } },
      { fx: { attrs: { tackling: 2, strength: 1 } } },
    ],
    it: { t: 'Da diga a regista', d: 'Il nuovo allenatore vede in te un regista arretrato. Tu hai sempre fatto l’incontrista.', o: [
      { l: 'Cambi pelle', r: 'Meno contrasti, più palloni giocati. Scopri di vedere il campo meglio di quanto pensassi.' },
      { l: 'Resti te stesso', r: 'Lo scudo davanti alla difesa resta il tuo lavoro.' },
    ] },
    en: { t: 'From shield to playmaker', d: 'The new coach sees a deep-lying playmaker in you. You’ve always been the destroyer.', o: [
      { l: 'Change skin', r: 'Fewer tackles, more passes. You discover you see the pitch better than you thought.' },
      { l: 'Stay yourself', r: 'The shield in front of the defence remains your job.' },
    ] },
  },
  {
    id: 'med_engine', kind: 'decision', group: 'role', w: 5, when: R(['MED'], { ageMin: 17 }),
    o: [
      { fx: { attrs: { stamina: 3 }, fitness: -4, mods: { injuryRisk: 0.03 } } },
      { fx: { fitness: 5, flag: 'carefulBody' } },
    ],
    it: { t: 'Doppio allenamento', d: 'Il mediano è quello che corre di più. Il preparatore ti propone il doppio carico.', o: [
      { l: 'Doppio carico', r: 'Dodici chilometri a partita. Ogni tanto il corpo manda un segnale.' },
      { l: 'Recupero e prevenzione', r: 'Crioterapia, sonno, dieta. Corri come prima, ma senza rischi.' },
    ] },
    en: { t: 'Double sessions', d: 'The holding midfielder runs the most. The fitness coach offers double loads.', o: [
      { l: 'Double load', r: 'Twelve kilometres a game. Now and then your body sends a warning.' },
      { l: 'Recovery and prevention', r: 'Cryotherapy, sleep, diet. You run as before, without the risk.' },
    ] },
  },
  {
    id: 'med_armband', kind: 'decision', group: 'role', w: 4, when: R(['MED'], { ageMin: 26, repMin: 40, notFlags: ['captain'] }),
    o: [
      { fx: { flag: 'captain', trust: 6, morale: 3 } },
      { fx: { morale: 1 } },
    ],
    it: { t: 'Il cuore della squadra', d: 'Nello spogliatoio parlano tutti con te prima di parlare con l’allenatore. La fascia sembra una formalità.', o: [
      { l: 'La indossi', r: 'Diventi ufficialmente quello che eri già.' },
      { l: 'Non ti serve una fascia', r: 'Guidi lo stesso, senza titolo e senza pressioni.' },
    ] },
    en: { t: 'The heart of the team', d: 'In the dressing room everyone talks to you before they talk to the coach. The armband seems a formality.', o: [
      { l: 'Wear it', r: 'You officially become what you already were.' },
      { l: 'You don’t need an armband', r: 'You lead anyway, without the title or the pressure.' },
    ] },
  },
  {
    id: 'med_heavy_legs', kind: 'decision', group: 'role', w: 5, when: R(['MED'], { ageMin: 32 }),
    o: [
      { fx: { mods: { minutes: -0.12 }, fitness: 6, attrs: { positioning: 2 } } },
      { fx: { mods: { injuryRisk: 0.05 }, trust: 3 } },
    ],
    it: { t: 'Le gambe pesanti', d: 'Dopo tre partite in otto giorni fatichi ad alzarti dal letto.', o: [
      { l: 'Accetti il turnover', r: 'Giochi le partite che contano, riposi le altre. La testa lavora per le gambe.' },
      { l: 'Le giochi tutte', r: 'L’allenatore apprezza. Il fisico tiene, per ora.' },
    ] },
    en: { t: 'Heavy legs', d: 'After three games in eight days you struggle to get out of bed.', o: [
      { l: 'Accept rotation', r: 'You play the games that matter and rest the others. Your head works for your legs.' },
      { l: 'Play them all', r: 'The coach appreciates it. Your body holds, for now.' },
    ] },
  },
  {
    id: 'med_pundit', kind: 'incident', w: 3, when: R(['MED'], { ageMin: 19 }),
    fx: { morale: -4, attrs: { tackling: 1 } },
    it: { t: '«Un giocatore limitato»', d: 'Un opinionista ti definisce così in prima serata. Ti stampi la frase e la attacchi nell’armadietto.' },
    en: { t: '“A limited player”', d: 'A pundit calls you that in prime time. You print the quote and stick it in your locker.' },
  },

  /* ======================= MEZZALA ======================= */
  {
    id: 'mez_runs', kind: 'decision', group: 'role', w: 6, when: R(['MEZ'], { ageMin: 18 }),
    o: [
      { fx: { attrs: { shooting: 2, stamina: 1 }, fitness: -2, mods: { goals: 1.25 } } },
      { fx: { attrs: { passing: 2 }, mods: { assists: 1.15 } } },
    ],
    it: { t: 'Inserimenti', d: 'Dai video l’allenatore nota che arrivi in area sempre un secondo tardi.', o: [
      { l: 'Lavori sui tempi di inserimento', r: 'Imparata la corsa giusta, il pallone comincia ad arrivarti a dieci metri dalla porta.' },
      { l: 'Resti a legare il gioco', r: 'Sei l’ultimo passaggio, non l’ultimo tocco.' },
    ] },
    en: { t: 'Late runs', d: 'On video the coach notices you always arrive in the box a second late.', o: [
      { l: 'Work on your timing', r: 'Once you learn the run, the ball starts reaching you ten metres from goal.' },
      { l: 'Keep linking play', r: 'You are the last pass, not the last touch.' },
    ] },
  },
  {
    id: 'mez_freekicks', kind: 'decision', group: 'role', w: 4, when: R(['MEZ'], { ageMin: 19 }),
    o: [
      { fx: { p: 0.5, base: { attrs: { shooting: 2 } }, win: { reputation: 3, morale: 3, mods: { minApps: 1, minGoals: 1 } }, lose: { trust: -3, mods: { minApps: 1 } } } },
      { fx: { morale: -1, attrs: { passing: 1 } } },
    ],
    it: { t: 'Le punizioni', d: 'Il rigorista titolare se ne va. Le punizioni dal limite sono libere.', o: [
      { l: 'Te le prendi', rw: 'La prima finisce all’incrocio. Il pallone, da quel giorno, è tuo.', rl: 'Tre in curva. Il capitano ti toglie il pallone dalle mani.' },
      { l: 'Le lasci agli altri', r: 'Ti concentri sul resto della partita.' },
    ] },
    en: { t: 'Free kicks', d: 'The usual taker leaves. Free kicks around the box are up for grabs.', o: [
      { l: 'Take them', rw: 'The first one goes in the top corner. From that day the ball is yours.', rl: 'Three into the stands. The captain takes the ball out of your hands.' },
      { l: 'Leave them to others', r: 'You focus on the rest of the game.' },
    ] },
  },
  {
    id: 'mez_street', kind: 'decision', group: 'role', w: 4, when: R(['MEZ'], { ageMin: 17 }),
    o: [
      { fx: { attrs: { dribbling: 3 }, fitness: -1 } },
      { fx: { attrs: { vision: 2 }, trust: 2 } },
    ],
    it: { t: 'Il campetto sotto casa', d: 'D’estate gli amici giocano ogni sera sul cemento, cinque contro cinque.', o: [
      { l: 'Giochi con loro', r: 'Sul cemento il pallone va tenuto stretto. Torni con un dribbling nuovo.' },
      { l: 'Studi tattica', r: 'Guardi partite intere e disegni i movimenti. Capisci dove si apre lo spazio.' },
    ] },
    en: { t: 'The street pitch', d: 'In summer your friends play five-a-side on concrete every evening.', o: [
      { l: 'Play with them', r: 'On concrete you keep the ball close. You come back with a new trick.' },
      { l: 'Study tactics', r: 'You watch whole games and draw the movements. You understand where space opens.' },
    ] },
  },
  {
    id: 'mez_press', kind: 'decision', group: 'role', w: 5, when: R(['MEZ'], { ageMin: 21 }),
    o: [
      { fx: { attrs: { stamina: 3, tackling: 2 }, mods: { goals: 0.9 } } },
      { fx: { attrs: { vision: 2 }, trust: -3 } },
    ],
    it: { t: 'Il pressing a tutto campo', d: 'Il nuovo allenatore chiede alle mezzali di aggredire il portatore fino all’area avversaria.', o: [
      { l: 'Diventi un motorino', r: 'Corri come mai, rubi palloni altissimi. In porta tiri meno.' },
      { l: 'Difendi la tua libertà', r: 'Resti il creativo. L’allenatore sbuffa ogni volta che non rientri.' },
    ] },
    en: { t: 'All-out pressing', d: 'The new coach wants his central midfielders to press the ball carrier up to the opposition box.', o: [
      { l: 'Become an engine', r: 'You run like never before and win the ball high. You shoot less.' },
      { l: 'Defend your freedom', r: 'You stay the creative one. The coach huffs every time you don’t track back.' },
    ] },
  },
  {
    id: 'mez_number10', kind: 'decision', group: 'role', w: 3, when: R(['MEZ'], { ageMin: 22, repMin: 30, notFlags: ['wore10'] }),
    o: [
      { fx: { reputation: 4, morale: 3, mods: { form: 0.03 }, flag: 'wore10' } },
      { fx: { morale: 2, trust: 1 } },
    ],
    it: { t: 'La dieci è libera', d: 'Il fantasista storico si ritira. Il magazziniere ti chiede se vuoi il suo numero.', o: [
      { l: 'La prendi', r: 'Pesa, quel numero sulle spalle. Ti fa giocare a testa alta.' },
      { l: 'Resti con il tuo', r: 'Il numero con cui sei arrivato ti porta fortuna.' },
    ] },
    en: { t: 'The ten is free', d: 'The club’s historic playmaker retires. The kit man asks if you want his number.', o: [
      { l: 'Take it', r: 'That number is heavy on your back. It makes you play with your head up.' },
      { l: 'Keep your own', r: 'The number you arrived with brings you luck.' },
    ] },
  },
  {
    id: 'mez_screamer', kind: 'incident', w: 3, when: R(['MEZ'], { ageMin: 18 }),
    fx: { reputation: 5, morale: 4, mods: { minApps: 1, minGoals: 1 } },
    it: { t: 'Il gol da trenta metri', d: 'Un tiro al volo da fuori area finisce sotto la traversa. La lega lo candida a gol dell’anno.' },
    en: { t: 'The thirty-yard goal', d: 'A volley from outside the box flies in under the bar. The league shortlists it for goal of the year.' },
  },
  {
    id: 'mez_rival', kind: 'decision', group: 'role', w: 4, when: R(['MEZ'], { ageMin: 20 }),
    o: [
      { fx: { p: 0.5, base: { trust: -3, morale: 2 }, win: { mods: { minutes: 0.1 } }, lose: { mods: { minutes: -0.1 } } } },
      { fx: { trust: 3, morale: -1 } },
    ],
    it: { t: 'Il rivale in squadra', d: 'Un compagno che gioca nel tuo ruolo ti prende in giro nella chat del gruppo.', o: [
      { l: 'Rispondi in partitella', rw: 'Lo sovrasti per un mese. Il posto da titolare diventa tuo.', rl: 'La tensione diventa rissa. L’allenatore sceglie lui, che almeno non litiga.' },
      { l: 'Ne parli con l’allenatore', r: 'Lui apprezza la maturità. Il compagno continua a ridere, ma sottovoce.' },
    ] },
    en: { t: 'The rival in the squad', d: 'A team-mate who plays your position mocks you in the group chat.', o: [
      { l: 'Answer in training games', rw: 'You dominate him for a month. The starting place becomes yours.', rl: 'The tension turns into a scuffle. The coach picks him, at least he doesn’t fight.' },
      { l: 'Talk to the coach', r: 'He appreciates the maturity. The team-mate keeps laughing, but quietly.' },
    ] },
  },
  {
    id: 'mez_tempo', kind: 'decision', group: 'role', w: 4, when: R(['MEZ'], { ageMin: 25 }),
    o: [
      { fx: { attrs: { vision: 2, passing: 2 } } },
      { fx: { attrs: { stamina: 2 }, fitness: -2 } },
    ],
    it: { t: 'Il ritmo della partita', d: 'Un vecchio allenatore ti dice che i grandi centrocampisti non corrono di più: decidono quando correre.', o: [
      { l: 'Impari a rallentare', r: 'Un tocco in più quando serve, uno in meno quando si può. La squadra respira con te.' },
      { l: 'Continui a correre', r: 'Il tuo calcio è intensità. Ti basta arrivare prima degli altri.' },
    ] },
    en: { t: 'The tempo of the game', d: 'An old coach tells you great midfielders don’t run more: they decide when to run.', o: [
      { l: 'Learn to slow down', r: 'One touch more when needed, one less when possible. The team breathes with you.' },
      { l: 'Keep running', r: 'Your football is intensity. You just need to get there before the others.' },
    ] },
  },
  {
    id: 'mez_deeper', kind: 'decision', group: 'role', w: 5, when: R(['MEZ'], { ageMin: 31 }),
    o: [
      { fx: { attrs: { passing: 3, vision: 2, stamina: -1 } } },
      { fx: { attrs: { stamina: 1 }, mods: { injuryRisk: 0.04 } } },
    ],
    it: { t: 'Qualche metro più indietro', d: 'L’allenatore ti propone di arretrare davanti alla difesa per allungare la carriera.', o: [
      { l: 'Diventi regista', r: 'Meno corsa, più testa. Il campo ti sembra più grande.' },
      { l: 'Resti mezzala', r: 'Ancora box to box, finché il fisico regge.' },
    ] },
    en: { t: 'A few metres deeper', d: 'The coach suggests dropping in front of the defence to prolong your career.', o: [
      { l: 'Become the playmaker', r: 'Less running, more thinking. The pitch looks bigger to you.' },
      { l: 'Stay a box-to-box midfielder', r: 'Still up and down, as long as your body holds.' },
    ] },
  },

  /* ======================= ALA ======================= */
  {
    id: 'ala_1v1', kind: 'decision', group: 'role', w: 6, when: R(['ALA'], { ageMin: 17 }),
    o: [
      { fx: { p: 0.5, base: { attrs: { dribbling: 3 } }, win: { mods: { assists: 1.15 } }, lose: { trust: -4 } } },
      { fx: { attrs: { vision: 2 }, trust: 3 } },
    ],
    it: { t: 'Puntalo sempre', d: '«Quando hai la palla, punta il terzino. Sempre», ti dice l’allenatore delle giovanili.', o: [
      { l: 'Lo punti sempre', rw: 'Salti l’uomo e metti palloni d’oro in mezzo.', rl: 'Perdi trenta palloni a partita. L’allenatore della prima squadra non è d’accordo con quello delle giovanili.' },
      { l: 'Scegli quando', r: 'Dribbling quando serve, passaggio quando conviene. Giochi più spesso.' },
    ] },
    en: { t: 'Take him on, always', d: '“When you have the ball, go at the full-back. Always,” says the youth coach.', o: [
      { l: 'Always take him on', rw: 'You beat your man and deliver golden balls into the box.', rl: 'You lose thirty balls a game. The first-team coach disagrees with the youth coach.' },
      { l: 'Pick your moments', r: 'Dribble when needed, pass when better. You play more often.' },
    ] },
  },
  {
    id: 'ala_weakfoot', kind: 'decision', group: 'role', w: 5, when: R(['ALA'], { ageMin: 18 }),
    o: [
      { fx: { attrs: { technique: 3 }, mods: { form: -0.02 } } },
      { fx: { attrs: { finishing: 2 } } },
    ],
    it: { t: 'Il piede debole', d: 'Tutti sanno che rientri sul destro. I terzini ormai ti aspettano lì.', o: [
      { l: 'Un anno sul sinistro', r: 'Mesi goffi, poi i terzini non sanno più da che parte chiuderti.' },
      { l: 'Diventi imprendibile sul destro', r: 'Lo sanno tutti dove vai. Nessuno riesce a fermarti lo stesso.' },
    ] },
    en: { t: 'The weaker foot', d: 'Everyone knows you cut onto your strong foot. Full-backs wait for you there.', o: [
      { l: 'A year on the other foot', r: 'Clumsy months, then full-backs no longer know which way to show you.' },
      { l: 'Perfect the strong foot', r: 'Everyone knows where you’re going. Nobody can stop you anyway.' },
    ] },
  },
  {
    id: 'ala_cutinside', kind: 'decision', group: 'role', w: 5, when: R(['ALA'], { ageMin: 20 }),
    o: [
      { fx: { attrs: { finishing: 3, crossing: -1 }, mods: { goals: 1.25 } } },
      { fx: { attrs: { crossing: 3 }, mods: { assists: 1.2 } } },
    ],
    it: { t: 'A piede invertito', d: 'L’allenatore vuole spostarti sull’altra fascia, per rientrare e calciare.', o: [
      { l: 'Rientri e tiri', r: 'Il tiro a giro sul secondo palo diventa la tua firma.' },
      { l: 'Resti sul fondo', r: 'Cross dal fondo, come le ali di una volta. Gli attaccanti ringraziano.' },
    ] },
    en: { t: 'Inverted winger', d: 'The coach wants to switch you to the other flank so you can cut in and shoot.', o: [
      { l: 'Cut in and shoot', r: 'The curler into the far corner becomes your signature.' },
      { l: 'Stay on the byline', r: 'Crosses from the byline, like the old wingers. The strikers are grateful.' },
    ] },
  },
  {
    id: 'ala_sprint', kind: 'decision', group: 'role', w: 4, when: R(['ALA'], { ageMin: 17 }),
    o: [
      { fx: { attrs: { pace: 3 }, fitness: -2, mods: { injuryRisk: 0.02 } } },
      { fx: { morale: 2 } },
    ],
    it: { t: 'L’allenatore dell’atletica', d: 'Un ex velocista olimpico offre di lavorare sulla tua partenza.', o: [
      { l: 'Lavori con lui', r: 'Guadagni un metro nei primi cinque. I muscoli, per ora, reggono.' },
      { l: 'Grazie, non ora', r: 'Preferisci un’estate tranquilla.' },
    ] },
    en: { t: 'The track coach', d: 'A former Olympic sprinter offers to work on your acceleration.', o: [
      { l: 'Work with him', r: 'You gain a metre in the first five. Your muscles hold, for now.' },
      { l: 'Thanks, not now', r: 'You’d rather have a quiet summer.' },
    ] },
  },
  {
    id: 'ala_showboat', kind: 'decision', group: 'role', w: 4, when: R(['ALA'], { ageMin: 19 }),
    o: [
      { fx: { reputation: 4, trust: -5, attrs: { technique: 1 }, mods: { minApps: 1 } } },
      { fx: { trust: 3, mods: { minApps: 1 } } },
    ],
    it: { t: 'Quattro a zero', d: 'Novantesimo, vinci quattro a zero. Hai la palla sulla trequarti e la curva ti chiede qualcosa di speciale.', o: [
      { l: 'Rabona e sombrero', r: 'Lo stadio impazzisce. Il terzino avversario no, e nemmeno il tuo allenatore.' },
      { l: 'Palla al compagno', r: 'Niente spettacolo. L’allenatore ti dà una pacca sulla spalla.' },
    ] },
    en: { t: 'Four-nil', d: 'Ninetieth minute, four-nil up. You have the ball and the fans want something special.', o: [
      { l: 'Rabona and a flick', r: 'The stadium goes wild. Their full-back doesn’t, and neither does your coach.' },
      { l: 'Pass to a team-mate', r: 'No show. The coach pats you on the shoulder.' },
    ] },
  },
  {
    id: 'ala_hamstring', kind: 'incident', w: 4, when: R(['ALA'], { ageMin: 21 }),
    fx: { fitness: -6, mods: { injuryRisk: 0.05 } },
    it: { t: 'Il flessore', d: 'Uno scatto a freddo nel riscaldamento e senti tirare dietro la coscia. Niente di rotto, ma il muscolo resterà delicato.' },
    en: { t: 'The hamstring', d: 'A cold sprint in the warm-up and you feel a pull behind your thigh. Nothing torn, but the muscle stays fragile.' },
  },
  {
    id: 'ala_nickname', kind: 'incident', w: 3, when: R(['ALA'], { repMin: 25 }),
    fx: { reputation: 3, morale: 3 },
    it: { t: 'Il soprannome', d: 'Un telecronista ti chiama «il fulmine» e il nome resta. Da allora ti precede in ogni stadio.' },
    en: { t: 'The nickname', d: 'A commentator calls you “the lightning” and it sticks. Since then it arrives at every stadium before you.' },
  },
  {
    id: 'ala_trackback', kind: 'decision', group: 'role', w: 4, when: R(['ALA'], { ageMin: 21, tierMax: 3 }),
    o: [
      { fx: { trust: 6, mods: { goals: 0.85 }, fitness: -3 } },
      { fx: { trust: -6, attrs: { finishing: 1 } } },
    ],
    it: { t: 'Rientrare a difendere', d: 'Contro le grandi l’allenatore vuole che tu diventi un quinto di centrocampo.', o: [
      { l: 'Rientri sempre', r: 'Corri il doppio, segni meno, ma non esci mai dal campo.' },
      { l: 'Resti alto', r: 'Aspetti il contropiede. Quando non arriva, l’allenatore ti guarda storto.' },
    ] },
    en: { t: 'Tracking back', d: 'Against big teams the coach wants you to become a wing-back.', o: [
      { l: 'Always track back', r: 'You run twice as much and score less, but you’re never subbed off.' },
      { l: 'Stay high', r: 'You wait for the counter. When it doesn’t come, the coach glares at you.' },
    ] },
  },
  {
    id: 'ala_socials', kind: 'decision', group: 'role', w: 4, when: R(['ALA'], { ageMin: 18 }),
    o: [
      { fx: { reputation: 5, morale: 3, mods: { form: -0.03 } } },
      { fx: { trust: 2 } },
    ],
    it: { t: 'Il contratto con il marchio', d: 'Un marchio di abbigliamento ti offre soldi per video di trick ogni settimana.', o: [
      { l: 'Firmi', r: 'Milioni di visualizzazioni. Qualche allenamento lo salti per le riprese.' },
      { l: 'Rifiuti', r: 'Resti concentrato. L’allenatore non lo dice, ma se ne accorge.' },
    ] },
    en: { t: 'The brand deal', d: 'A clothing brand offers money for weekly trick videos.', o: [
      { l: 'Sign', r: 'Millions of views. You skip a few sessions for filming.' },
      { l: 'Refuse', r: 'You stay focused. The coach doesn’t say it, but he notices.' },
    ] },
  },
  {
    id: 'ala_central', kind: 'decision', group: 'role', w: 5, when: R(['ALA'], { ageMin: 30 }),
    o: [
      { fx: { attrs: { vision: 3, technique: 2, pace: -1 } } },
      { fx: { attrs: { pace: 1 }, mods: { injuryRisk: 0.05 } } },
    ],
    it: { t: 'Dietro le punte', d: 'Lo scatto è sceso. Il tecnico ti vede trequartista.', o: [
      { l: 'Ti accentri', r: 'Meno metri, più idee. Il pallone passa sempre da te.' },
      { l: 'Resti sulla fascia', r: 'Ancora scatti sulla linea, finché le gambe ci stanno.' },
    ] },
    en: { t: 'Behind the strikers', d: 'Your acceleration has dropped. The coach sees you as a number ten.', o: [
      { l: 'Move central', r: 'Fewer metres, more ideas. The ball always goes through you.' },
      { l: 'Stay on the wing', r: 'More sprints down the line, while your legs allow.' },
    ] },
  },

  /* ======================= PRIMA PUNTA ======================= */
  {
    id: 'pun_shots', kind: 'decision', group: 'role', w: 6, when: R(['PUN'], { ageMin: 17 }),
    o: [
      { fx: { attrs: { finishing: 3 }, fitness: -2 } },
      { fx: { attrs: { positioning: 3 } } },
    ],
    it: { t: 'Duecento tiri', d: 'Il vecchio centravanti del club, ora allenatore, ti propone la sua ricetta.', o: [
      { l: 'Duecento tiri al giorno', r: 'Destro, sinistro, al volo. Il piede diventa freddo davanti al portiere.' },
      { l: 'Il movimento senza palla', r: 'Impari a sparire dalla vista dei difensori e ricomparire sul secondo palo.' },
    ] },
    en: { t: 'Two hundred shots', d: 'The club’s old centre-forward, now a coach, offers you his recipe.', o: [
      { l: 'Two hundred shots a day', r: 'Right, left, volleys. Your foot goes cold in front of the keeper.' },
      { l: 'Movement off the ball', r: 'You learn to vanish from defenders’ sight and reappear at the far post.' },
    ] },
  },
  {
    id: 'pun_penalties', kind: 'decision', group: 'role', w: 5, when: R(['PUN'], { ageMin: 19 }),
    o: [
      { fx: { p: 0.7, base: { mods: { minApps: 1 } }, win: { mods: { goals: 1.12, minGoals: 1 }, reputation: 2 }, lose: { morale: -6, trust: -3 } } },
      { fx: { morale: -1 } },
    ],
    it: { t: 'Il rigore', d: 'Il rigorista è squalificato. Al novantesimo, sullo zero a zero, l’arbitro indica il dischetto.', o: [
      { l: 'Prendi il pallone', rw: 'Portiere da una parte, pallone dall’altra. I rigori ora sono tuoi.', rl: 'Palo pieno. Il silenzio dello stadio te lo porterai dietro per settimane.' },
      { l: 'Lo lasci al capitano', r: 'Nessun rischio, nessuna gloria.' },
    ] },
    en: { t: 'The penalty', d: 'The regular taker is suspended. Ninetieth minute, nil-nil, the referee points to the spot.', o: [
      { l: 'Take the ball', rw: 'Keeper one way, ball the other. Penalties are yours now.', rl: 'Off the post. You’ll carry the stadium’s silence for weeks.' },
      { l: 'Leave it to the captain', r: 'No risk, no glory.' },
    ] },
  },
  {
    id: 'pun_target', kind: 'decision', group: 'role', w: 4, when: R(['PUN'], { ageMin: 19, notStyles: ['torre'] }),
    o: [
      { fx: { attrs: { heading: 3, strength: 2, pace: -1 }, mods: { goals: 1.05 } } },
      { fx: { attrs: { technique: 2 }, trust: -4 } },
    ],
    it: { t: 'Il centravanti di riferimento', d: 'La squadra gioca lungo. L’allenatore vuole che tu faccia a sportellate e tenga palla spalle alla porta.', o: [
      { l: 'Ti fai boa', r: 'Palestra e colpi di testa. Diventi il riferimento che la squadra cercava.' },
      { l: 'Il tuo calcio è un altro', r: 'Resti tecnico e mobile. L’allenatore cerca una torre sul mercato.' },
    ] },
    en: { t: 'The target man', d: 'The team plays long balls. The coach wants you to battle and hold the ball with your back to goal.', o: [
      { l: 'Become the target', r: 'Gym and headers. You become the reference point the team needed.' },
      { l: 'Your football is different', r: 'You stay technical and mobile. The coach looks for a big man on the market.' },
    ] },
  },
  {
    id: 'pun_drought', kind: 'incident', w: 4, when: R(['PUN'], { ageMin: 18 }),
    fx: { morale: -8, mods: { form: -0.03, minApps: 10 } },
    it: { t: 'Dieci partite senza gol', d: 'Ogni tiro trova un palo, un portiere o un difensore. Più ci pensi, più il pallone pesa.' },
    en: { t: 'Ten games without a goal', d: 'Every shot hits a post, a keeper or a defender. The more you think, the heavier the ball gets.' },
  },
  {
    id: 'pun_supersub', kind: 'decision', group: 'role', w: 4, when: R(['PUN'], { ageMin: 18, tierMax: 3 }),
    o: [
      { fx: { mods: { minutes: -0.18, goals: 1.3 }, morale: -3 } },
      { fx: { p: 0.45, base: { trust: -5 }, win: { mods: { minutes: 0.12 } }, lose: { morale: -5 } } },
    ],
    it: { t: 'L’uomo della panchina', d: 'L’allenatore ti dice che sei perfetto per gli ultimi venti minuti, quando le difese sono stanche.', o: [
      { l: 'Diventi il dodicesimo', r: 'Entri e segni. Giochi poco, ma quando giochi pesi.' },
      { l: 'Pretendi di partire titolare', rw: 'Due doppiette da titolare e la discussione finisce.', rl: 'L’allenatore non cambia idea e ti tiene fuori per ripicca.' },
    ] },
    en: { t: 'The super-sub', d: 'The coach says you’re perfect for the last twenty minutes, when defences are tired.', o: [
      { l: 'Become the twelfth man', r: 'You come on and score. You play little, but you matter.' },
      { l: 'Demand to start', rw: 'Two braces as a starter and the argument ends.', rl: 'The coach doesn’t budge and leaves you out out of spite.' },
    ] },
  },
  {
    id: 'pun_star_arrives', kind: 'decision', group: 'role', w: 5, when: R(['PUN'], { ageMin: 21, tierMax: 2 }),
    o: [
      { fx: { p: 0.45, base: { attrs: { finishing: 2 } }, win: { reputation: 4 }, lose: { mods: { minutes: -0.25 }, morale: -6 } } },
      { fx: { flag: 'wantsOut' } },
      { fx: { attrs: { technique: 2 }, mods: { assists: 1.3, goals: 0.85 } } },
    ],
    it: { t: 'Il nuovo bomber', d: 'Il club spende una fortuna per un centravanti famoso. Nel tuo ruolo.', o: [
      { l: 'Te la giochi', rw: 'Segni più di lui nel girone d’andata. Giocate insieme.', rl: 'Lui parte titolare e non si ferma. Tu guardi dalla panchina.' },
      { l: 'Chiedi la cessione', r: 'Il procuratore apre le trattative.' },
      { l: 'Giochi con lui', r: 'Ti allarghi, gli fai spazio, gli servi assist. Un’altra carriera dentro la tua.' },
    ] },
    en: { t: 'The new striker', d: 'The club spends a fortune on a famous centre-forward. In your position.', o: [
      { l: 'Fight for it', rw: 'You outscore him in the first half of the season. You play together.', rl: 'He starts and doesn’t stop. You watch from the bench.' },
      { l: 'Ask for a transfer', r: 'Your agent opens talks.' },
      { l: 'Play alongside him', r: 'You drift wide, make room for him, feed him assists. Another career inside yours.' },
    ] },
  },
  {
    id: 'pun_presser', kind: 'decision', group: 'role', w: 4, when: R(['PUN'], { ageMin: 20, repMin: 30 }),
    o: [
      { fx: { morale: 3, mods: { form: 0.03 } } },
      { fx: { reputation: 3, trust: -4, morale: 2 } },
    ],
    it: { t: '«Sopravvalutato»', d: 'In conferenza stampa un giornalista ti chiede se sei sopravvalutato.', o: [
      { l: 'Rispondi sul campo', r: 'Sorridi e te ne vai. La domenica dopo segni e non esulti.' },
      { l: 'Rispondi a tono', r: 'La frase finisce su tutti i siti. Il club ti chiede di moderare i toni.' },
    ] },
    en: { t: '“Overrated”', d: 'At a press conference a journalist asks if you’re overrated.', o: [
      { l: 'Answer on the pitch', r: 'You smile and leave. Next Sunday you score and don’t celebrate.' },
      { l: 'Answer back', r: 'The quote is on every website. The club asks you to tone it down.' },
    ] },
  },
  {
    id: 'pun_gym', kind: 'decision', group: 'role', w: 4, when: R(['PUN'], { ageMin: 18 }),
    o: [
      { fx: { attrs: { strength: 3, pace: -1 }, fitness: -1 } },
      { fx: { attrs: { pace: 2 } } },
    ],
    it: { t: 'Più muscoli o più leggerezza', d: 'Il nutrizionista ti chiede che attaccante vuoi essere tra due anni.', o: [
      { l: 'Più muscoli', r: 'Tieni lontano i difensori con un braccio. Nello scatto perdi qualcosa.' },
      { l: 'Più leggero', r: 'Tre chili in meno, un passo in più sul primo metro.' },
    ] },
    en: { t: 'More muscle or lighter', d: 'The nutritionist asks what kind of striker you want to be in two years.', o: [
      { l: 'More muscle', r: 'You hold defenders off with one arm. You lose something in the sprint.' },
      { l: 'Lighter', r: 'Three kilos less, a step quicker over the first metre.' },
    ] },
  },
  {
    id: 'pun_bicycle', kind: 'incident', w: 3, when: R(['PUN'], { ageMin: 19 }),
    fx: { reputation: 5, morale: 4, mods: { minApps: 1, minGoals: 1 } },
    it: { t: 'La rovesciata', d: 'Cross alto, sei spalle alla porta, ti butti. Il gol finisce nella sigla della trasmissione della domenica.' },
    en: { t: 'The bicycle kick', d: 'A high cross, your back to goal, you throw yourself. The goal ends up in the Sunday show’s opening titles.' },
  },
  {
    id: 'pun_false9', kind: 'decision', group: 'role', w: 4, when: R(['PUN'], { ageMin: 22, notStyles: ['falsonueve'] }),
    o: [
      { fx: { attrs: { technique: 2, positioning: 1 }, mods: { assists: 1.3, goals: 0.85 } } },
      { fx: { attrs: { finishing: 2 } } },
    ],
    it: { t: 'Falso nove', d: 'Il nuovo allenatore vuole un centravanti che venga incontro e lasci spazio agli inserimenti.', o: [
      { l: 'Vieni incontro', r: 'Tocchi più palloni che mai. Segnano gli altri, ma nascono da te.' },
      { l: 'Resti in area', r: 'L’area è casa tua. Da lì non ti sposta nessun sistema.' },
    ] },
    en: { t: 'False nine', d: 'The new coach wants a striker who drops deep and leaves space for runners.', o: [
      { l: 'Drop deep', r: 'You touch more balls than ever. Others score, but it starts with you.' },
      { l: 'Stay in the box', r: 'The box is home. No system moves you out of it.' },
    ] },
  },
  {
    id: 'pun_poacher_late', kind: 'decision', group: 'role', w: 5, when: R(['PUN'], { ageMin: 31 }),
    o: [
      { fx: { attrs: { positioning: 3, finishing: 1, pace: -2 } } },
      { fx: { attrs: { pace: 1 }, mods: { injuryRisk: 0.04 }, trust: 3 } },
    ],
    it: { t: 'L’area di rigore', d: 'Il pressing dei centravanti moderni ti costa fatica. L’allenatore ti lascia scegliere.', o: [
      { l: 'Vivi nell’area', r: 'Non pressi più nessuno. Ma in area arrivi sempre prima tu.' },
      { l: 'Continui a pressare', r: 'La squadra apprezza il sacrificio. Il fisico un po’ meno.' },
    ] },
    en: { t: 'The penalty box', d: 'Modern pressing costs you energy. The coach lets you choose.', o: [
      { l: 'Live in the box', r: 'You don’t press anyone any more. But in the box you always get there first.' },
      { l: 'Keep pressing', r: 'The team appreciates the sacrifice. Your body a bit less.' },
    ] },
  },
];
