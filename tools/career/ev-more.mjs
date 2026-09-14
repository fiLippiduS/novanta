/* Secondo blocco di eventi: situazioni nuove per ogni ruolo, per ogni età e
   per i contesti che il primo blocco non toccava (coppe europee, estero,
   retrocessioni, grandi squadre, provincia). Stesse regole: le doti toccate
   sono solo quelle del ruolo, e quello che il testo racconta sta nei numeri. */

const R = (roles, extra = {}) => ({ roles, ...extra });

export default [
  /* ======================= PORTIERE ======================= */
  {
    id: 'x_gk_video', kind: 'decision', group: 'role', w: 5, when: R(['POR'], { ageMin: 18 }),
    o: [
      { fx: { attrs: { positioning: 3 }, fitness: -2 } },
      { fx: { attrs: { handling: 2 }, morale: 2 } },
    ],
    it: { t: 'I gol subiti al video', d: 'Il match analyst ti monta tutti i gol presi nell’ultimo anno, uno dopo l’altro. Quaranta minuti.', o: [
      { l: 'Li riguardi tutti, più volte', r: 'Scopri che su un tiro su tre eri mezzo passo fuori posizione. Non succederà più.' },
      { l: 'Guardi solo le parate', r: 'Ti serve fiducia, non processi. Torni in campo con le mani calde.' },
    ] },
    en: { t: 'Every goal on video', d: 'The match analyst cuts together every goal you conceded last year, one after another. Forty minutes.', o: [
      { l: 'Watch them all, again and again', r: 'You find that on one shot in three you were half a step out of position. Not any more.' },
      { l: 'Watch only the saves', r: 'You need confidence, not a trial. You go back out with warm hands.' },
    ] },
  },
  {
    id: 'x_gk_gloves', kind: 'decision', group: 'role', w: 3, when: R(['POR'], { ageMin: 20, repMin: 25 }),
    o: [
      { fx: { reputation: 3, mods: { form: -0.01 }, attrs: { handling: -1 } } },
      { fx: { attrs: { handling: 2 } } },
    ],
    it: { t: 'I guanti nuovi dello sponsor', d: 'Lo sponsor tecnico vuole che tu usi il nuovo modello, più leggero e più fotogenico. Il tuo vecchio paio lo conosci a memoria.', o: [
      { l: 'Metti quelli nuovi', r: 'In foto sono bellissimi. Sotto la pioggia il pallone scivola un po’ di più.' },
      { l: 'Tieni i tuoi', r: 'Lo sponsor storce il naso. La presa resta quella di sempre.' },
    ] },
    en: { t: 'The sponsor’s new gloves', d: 'Your kit sponsor wants you in the new model, lighter and more photogenic. You know your old pair by heart.', o: [
      { l: 'Wear the new ones', r: 'They look great in photos. In the rain the ball slips a little more.' },
      { l: 'Keep your own', r: 'The sponsor frowns. Your grip stays what it always was.' },
    ] },
  },
  {
    id: 'x_gk_long_throw', kind: 'decision', group: 'role', w: 4, when: R(['POR'], { ageMin: 19 }),
    o: [
      { fx: { attrs: { distribution: 3 }, mods: { assists: 1.5 } } },
      { fx: { attrs: { composure: 2 }, trust: 3 } },
    ],
    it: { t: 'Il contropiede parte da te', d: 'La squadra ha attaccanti velocissimi. L’allenatore ti chiede di rilanciare subito con le mani, prima che gli altri si sistemino.', o: [
      { l: 'Rilanci in un secondo', r: 'Due o tre ripartenze a partita nascono dalle tue mani. Qualcuna finisce in gol.' },
      { l: 'Prima fai respirare la squadra', r: 'Rallenti, fai salire i compagni. Meno occasioni, meno rischi.' },
    ] },
    en: { t: 'The counter starts with you', d: 'The team has very fast forwards. The coach asks you to throw it out immediately, before the opposition resets.', o: [
      { l: 'Release it in a second', r: 'Two or three breaks a game start from your hands. Some end in goals.' },
      { l: 'Let the team breathe first', r: 'You slow it down and let team-mates push up. Fewer chances, fewer risks.' },
    ] },
  },
  {
    id: 'x_gk_penalty_taker', kind: 'decision', group: 'role', w: 2, when: R(['POR'], { ageMin: 24, repMin: 40 }),
    o: [
      { fx: { p: 0.35, base: { reputation: 2 }, win: { reputation: 5, morale: 6 }, lose: { morale: -6, trust: -4 } } },
      { fx: { trust: 2 } },
    ],
    it: { t: 'Il portiere sul dischetto', d: 'Ultimo minuto di una partita già vinta, rigore per voi. I compagni ti fanno segno di andare a batterlo.', o: [
      { l: 'Vai', rw: 'Palla da una parte, portiere dall’altra. Esulti correndo verso la tua porta vuota.', rl: 'Tiro alto sopra la traversa. Lo stadio ride, l’allenatore no.' },
      { l: 'Resti tra i pali', r: 'Il tuo lavoro è dall’altra parte del campo. Batte il solito rigorista.' },
    ] },
    en: { t: 'The keeper on the spot', d: 'Last minute of a game already won, penalty to you. Team-mates wave you forward to take it.', o: [
      { l: 'Go', rw: 'Ball one way, keeper the other. You celebrate running back to your empty goal.', rl: 'Over the bar. The stadium laughs, the coach doesn’t.' },
      { l: 'Stay in goal', r: 'Your job is at the other end. The usual taker steps up.' },
    ] },
  },
  {
    id: 'x_gk_back_injury', kind: 'decision', group: 'role', w: 3, when: R(['POR'], { ageMin: 31 }),
    o: [
      { fx: { flag: 'carefulBody', fitness: 6, attrs: { aerial: -1 } } },
      { fx: { p: 0.6, base: { attrs: { aerial: 1 } }, win: { trust: 3 }, lose: { forcedInjury: { severity: 'medium', weeks: 7 } } } },
    ],
    it: { t: 'La schiena', d: 'Ogni uscita alta ti lascia una fitta nella zona lombare. Il fisioterapista propone di limitare i tuffi in allenamento.', o: [
      { l: 'Alleni meno i tuffi', r: 'Proteggi la schiena. Sulle palle alte sei un filo meno esplosivo.' },
      { l: 'Continui come sempre', rw: 'La fitta passa da sola. Esci ancora su tutte le palle alte.', rl: 'A novembre la schiena si blocca. Due mesi di stop.' },
    ] },
    en: { t: 'The back', d: 'Every high claim leaves a twinge in your lower back. The physio suggests limiting diving in training.', o: [
      { l: 'Dive less in training', r: 'You protect your back. On high balls you’re a touch less explosive.' },
      { l: 'Carry on as usual', rw: 'The twinge fades on its own. You keep claiming every cross.', rl: 'In November your back locks. Two months out.' },
    ] },
  },
  {
    id: 'x_gk_keeper_coach', kind: 'decision', group: 'role', w: 4, when: R(['POR'], { ageMin: 17, ageMax: 26 }),
    o: [
      { fx: { attrs: { reflexes: 3 }, fitness: -3 } },
      { fx: { attrs: { aerial: 2, positioning: 1 } } },
    ],
    it: { t: 'Il preparatore nuovo', d: 'Arriva un preparatore dei portieri con metodi opposti al precedente: tanta reattività, pochissime uscite.', o: [
      { l: 'Ti affidi a lui', r: 'Settimane di palline da tennis e riflessi. Il colpo di reni diventa un’arma.' },
      { l: 'Chiedi di lavorare anche sulle uscite', r: 'Trovate un compromesso. Esci meglio e ti piazzi meglio.' },
    ] },
    en: { t: 'The new keeper coach', d: 'A new goalkeeping coach arrives with methods opposite to the last one: lots of reaction work, hardly any claiming.', o: [
      { l: 'Trust him', r: 'Weeks of tennis balls and reflexes. Your spring becomes a weapon.' },
      { l: 'Ask to work on claiming too', r: 'You find a compromise. Better claiming, better positioning.' },
    ] },
  },

  /* ======================= DIFENSORE CENTRALE ======================= */
  {
    id: 'x_dc_captain_voice', kind: 'decision', group: 'role', w: 4, when: R(['DC'], { ageMin: 23 }),
    o: [
      { fx: { attrs: { positioning: 2 }, trust: 5, morale: -2 } },
      { fx: { attrs: { marking: 2 }, morale: 2 } },
    ],
    it: { t: 'La linea che non sale', d: 'La difesa resta sempre troppo bassa e gli avversari tirano da fuori indisturbati. Qualcuno deve alzare la voce.', o: [
      { l: 'La guidi tu, urlando', r: 'I compagni ti odiano per una settimana. Poi la linea sale da sola.' },
      { l: 'Pensi al tuo uomo', r: 'Il tuo attaccante non tocca palla. Il resto non dipende da te.' },
    ] },
    en: { t: 'The line that won’t step up', d: 'The back line always sits too deep and opponents shoot from distance unchallenged. Someone has to raise their voice.', o: [
      { l: 'Lead it, shouting', r: 'Team-mates hate you for a week. Then the line steps up on its own.' },
      { l: 'Focus on your man', r: 'Your striker doesn’t touch the ball. The rest isn’t up to you.' },
    ] },
  },
  {
    id: 'x_dc_left_foot', kind: 'decision', group: 'role', w: 3, when: R(['DC'], { ageMax: 25 }),
    o: [
      { fx: { attrs: { passing: 3 }, mods: { form: -0.01 } } },
      { fx: { attrs: { tackling: 2 } } },
    ],
    it: { t: 'Il centrale di sinistra', d: 'Serve un centrale mancino e tu sei destro. L’allenatore ti chiede di imparare a impostare col sinistro.', o: [
      { l: 'Ci lavori tutti i giorni', r: 'Qualche pallone perso all’inizio. A primavera apri il gioco con entrambi i piedi.' },
      { l: 'Resti sul centro-destra', r: 'Il tuo posto lo conosci. Continui a vincere contrasti.' },
    ] },
    en: { t: 'The left-sided centre-back', d: 'The team needs a left-sided centre-back and you’re right-footed. The coach asks you to learn to build with your left.', o: [
      { l: 'Work on it every day', r: 'A few balls lost at first. By spring you open play with both feet.' },
      { l: 'Stay on the right side', r: 'You know your spot. You keep winning tackles.' },
    ] },
  },
  {
    id: 'x_dc_striker_emergency', kind: 'decision', group: 'role', w: 2, when: R(['DC'], { ageMin: 21 }),
    o: [
      { fx: { p: 0.5, base: { attrs: { heading: 2 } }, win: { mods: { minGoals: 1, minApps: 1 }, reputation: 4, morale: 5 }, lose: { morale: -2 } } },
      { fx: { trust: -2, attrs: { marking: 1 } } },
    ],
    it: { t: 'Centravanti per venti minuti', d: 'Sotto di un gol, nessun attaccante in panchina. L’allenatore ti manda in avanti per le palle alte.', o: [
      { l: 'Vai a prenderle tutte', rw: 'Al novantesimo spizzi in rete di testa. Il tuo primo gol da attaccante.', rl: 'Vinci tutti i duelli, ma il pallone non entra.' },
      { l: 'Proponi un centrocampista', r: 'Preferisci tenere la difesa in ordine. L’allenatore sbuffa.' },
    ] },
    en: { t: 'Centre-forward for twenty minutes', d: 'A goal down, no strikers on the bench. The coach sends you up front for the high balls.', o: [
      { l: 'Go and win them all', rw: 'In the ninetieth minute you head it in. Your first goal as a striker.', rl: 'You win every duel, but the ball won’t go in.' },
      { l: 'Suggest a midfielder', r: 'You’d rather keep the defence organised. The coach sighs.' },
    ] },
  },
  {
    id: 'x_dc_duel_king', kind: 'decision', group: 'role', w: 4, when: R(['DC'], { ageMin: 18 }),
    o: [
      { fx: { attrs: { strength: 3 }, fitness: -2 } },
      { fx: { attrs: { positioning: 2 }, fitness: 2 } },
    ],
    it: { t: 'Anticipo o fisico', d: 'Contro attaccanti grossi soffri. Il vice allenatore dice che o diventi più forte, o arrivi prima sul pallone.', o: [
      { l: 'Palestra e duelli', r: 'Mesi di contatto in allenamento. Ora sono gli attaccanti a rimbalzare.' },
      { l: 'Lavori sull’anticipo', r: 'Studi i movimenti e ti muovi un attimo prima. Il contatto non serve più.' },
    ] },
    en: { t: 'Anticipation or strength', d: 'You struggle against big strikers. The assistant coach says: get stronger, or get to the ball first.', o: [
      { l: 'Gym and duels', r: 'Months of contact in training. Now the strikers bounce off you.' },
      { l: 'Work on anticipation', r: 'You study movement and move a moment earlier. Contact becomes unnecessary.' },
    ] },
  },
  {
    id: 'x_dc_own_goal', kind: 'incident', w: 3, when: R(['DC'], { ageMin: 18 }),
    fx: { morale: -6, attrs: { positioning: 1 }, mods: { minApps: 1 } },
    it: { t: 'L’autogol', d: 'Un cross innocuo, un intervento goffo, la palla nella tua porta. La squadra perde di un gol. Nessuno te lo rinfaccia, ma tu non dormi.' },
    en: { t: 'The own goal', d: 'A harmless cross, a clumsy touch, the ball in your own net. The team loses by a goal. Nobody blames you, but you can’t sleep.' },
  },
  {
    id: 'x_dc_back_three', kind: 'decision', group: 'role', w: 4, when: R(['DC'], { ageMin: 20 }),
    o: [
      { fx: { attrs: { passing: 2, positioning: 1 }, trust: 3 } },
      { fx: { attrs: { marking: 2 }, trust: -2 } },
    ],
    it: { t: 'Il braccetto', d: 'Si passa alla difesa a tre. A te tocca il ruolo di braccetto: difendere e accompagnare l’azione sulla fascia.', o: [
      { l: 'Accetti e ti spingi avanti', r: 'Ogni tanto arrivi fino al cross. Il gioco passa anche da te.' },
      { l: 'Chiedi il centro', r: 'Vuoi il ruolo di centrale puro. L’allenatore ti accontenta, controvoglia.' },
    ] },
    en: { t: 'Wide centre-back', d: 'The team switches to a back three. You get the wide role: defend and support the attack down the flank.', o: [
      { l: 'Accept and push forward', r: 'Now and then you get as far as the cross. Play goes through you too.' },
      { l: 'Ask for the middle', r: 'You want the pure central role. The coach agrees, reluctantly.' },
    ] },
  },

  /* ======================= TERZINO ======================= */
  {
    id: 'x_tz_winger_duel', kind: 'decision', group: 'role', w: 4, when: R(['TZ'], { ageMin: 19 }),
    o: [
      { fx: { attrs: { marking: 2, tackling: 1 }, trust: 3 } },
      { fx: { attrs: { pace: 2 }, mods: { assists: 1.15 } } },
    ],
    it: { t: 'Il miglior esterno del campionato', d: 'Domenica affronti l’ala più forte del campionato. L’allenatore ti chiede come vuoi giocarla.', o: [
      { l: 'Lo annulli, e basta', r: 'Novanta minuti incollato a lui. Non spingi mai, ma lui non tocca palla.' },
      { l: 'Lo costringi a difendere', r: 'Attacchi tu, così lui deve rincorrerti. Rischi, ma ci guadagni in cross.' },
    ] },
    en: { t: 'The league’s best winger', d: 'On Sunday you face the best winger in the league. The coach asks how you want to play it.', o: [
      { l: 'Shut him down, full stop', r: 'Ninety minutes glued to him. You never push on, but he never gets the ball.' },
      { l: 'Make him defend', r: 'You attack, so he has to chase you. Risky, but you get more crosses in.' },
    ] },
  },
  {
    id: 'x_tz_wingback', kind: 'decision', group: 'role', w: 4, when: R(['TZ'], { ageMin: 20 }),
    o: [
      { fx: { attrs: { stamina: 2, crossing: 1 }, fitness: -3, mods: { assists: 1.2 } } },
      { fx: { attrs: { marking: 2 }, fitness: 2 } },
    ],
    it: { t: 'Quinto di centrocampo', d: 'Col nuovo modulo il terzino diventa quinto: tutta la fascia per te, avanti e indietro.', o: [
      { l: 'Ti prendi tutta la fascia', r: 'Più cross, più corsa, più fatica. A fine partita sei svuotato ma decisivo.' },
      { l: 'Chiedi di restare a quattro', r: 'Nella difesa a quattro ti senti a casa. Più attento, meno stanco.' },
    ] },
    en: { t: 'Wing-back', d: 'With the new system the full-back becomes a wing-back: the whole flank is yours, up and down.', o: [
      { l: 'Own the whole flank', r: 'More crosses, more running, more fatigue. At full time you’re empty but decisive.' },
      { l: 'Ask to stay in a back four', r: 'In a back four you feel at home. Sharper, less tired.' },
    ] },
  },
  {
    id: 'x_tz_freekick_cross', kind: 'decision', group: 'role', w: 3, when: R(['TZ'], { ageMin: 21 }),
    o: [
      { fx: { attrs: { crossing: 3 }, mods: { assists: 1.2 } } },
      { fx: { attrs: { dribbling: 2 } } },
    ],
    it: { t: 'I calci piazzati', d: 'Il battitore dei corner si è infortunato. Il tuo cross è il più preciso della squadra.', o: [
      { l: 'Te li prendi tu', r: 'Corner e punizioni laterali sono tuoi. I colpitori di testa ringraziano.' },
      { l: 'Preferisci giocare palla a terra', r: 'Lasci i piazzati agli altri e lavori sull’uno contro uno.' },
    ] },
    en: { t: 'Set pieces', d: 'The corner taker is injured. Your cross is the most accurate in the squad.', o: [
      { l: 'Take them yourself', r: 'Corners and wide free kicks are yours. The headers are grateful.' },
      { l: 'Prefer the ball on the ground', r: 'You leave set pieces to others and work on one-on-ones.' },
    ] },
  },
  {
    id: 'x_tz_hamstring', kind: 'incident', w: 3, when: R(['TZ'], { ageMin: 24 }),
    fx: { forcedInjury: { severity: 'minor', weeks: 4 }, fitness: -4, attrs: { pace: -1 } },
    it: { t: 'Lo strappo in allungo', d: 'Uno scatto per recuperare un contropiede e senti il flessore tirare. Un mese di stop e un po’ di spunto in meno.' },
    en: { t: 'The strain in the sprint', d: 'A sprint to stop a counter and you feel your hamstring go. A month out and a little less burst.' },
  },
  {
    id: 'x_tz_young_rival', kind: 'decision', group: 'role', w: 4, when: R(['TZ'], { ageMin: 27 }),
    o: [
      { fx: { attrs: { marking: 2 }, trust: 4, morale: 2 } },
      { fx: { p: 0.5, base: { attrs: { pace: 1 } }, win: { trust: 6 }, lose: { mods: { minutes: -0.15 }, morale: -4 } } },
    ],
    it: { t: 'Il ragazzo che corre il doppio', d: 'Dal settore giovanile sale un terzino di diciannove anni che non si stanca mai. Il tuo posto non è più sicuro.', o: [
      { l: 'Punti sull’esperienza', r: 'Non corri più di lui, ma leggi prima le azioni. L’allenatore non rinuncia a te.' },
      { l: 'Lo sfidi sulla corsa', rw: 'Tieni il suo ritmo per tutto l’anno. Il posto resta tuo.', rl: 'Lui ha vent’anni meno. Da gennaio parte titolare.' },
    ] },
    en: { t: 'The kid who runs twice as much', d: 'A nineteen-year-old full-back who never tires comes up from the academy. Your place isn’t safe any more.', o: [
      { l: 'Rely on experience', r: 'You don’t outrun him, but you read play earlier. The coach won’t drop you.' },
      { l: 'Race him', rw: 'You match his pace all year. The place stays yours.', rl: 'He’s a decade younger. From January he starts.' },
    ] },
  },

  /* ======================= MEDIANO ======================= */
  {
    id: 'x_med_tactical_fouls', kind: 'decision', group: 'role', w: 4, when: R(['MED'], { ageMin: 19 }),
    o: [
      { fx: { attrs: { tackling: 2 }, trust: 3, reputation: -1 } },
      { fx: { attrs: { positioning: 2 } } },
    ],
    it: { t: 'Il fallo tattico', d: 'La squadra subisce troppe ripartenze. Il vice ti spiega quando conviene fermare l’azione con un fallo.', o: [
      { l: 'Impari a spezzare il gioco', r: 'Qualche giallo in più, qualche contropiede in meno. L’allenatore approva.' },
      { l: 'Preferisci arrivare prima', r: 'Ti piazzi meglio e le ripartenze non partono proprio.' },
    ] },
    en: { t: 'The tactical foul', d: 'The team concedes too many counters. The assistant explains when it pays to stop play with a foul.', o: [
      { l: 'Learn to break up play', r: 'A few more yellows, a few fewer counters. The coach approves.' },
      { l: 'Prefer to get there first', r: 'You position yourself better and the counters never start.' },
    ] },
  },
  {
    id: 'x_med_distance_shots', kind: 'decision', group: 'role', w: 3, when: R(['MED'], { ageMin: 20 }),
    o: [
      { fx: { p: 0.45, base: { attrs: { passing: 1 } }, win: { mods: { minGoals: 1, minApps: 1, goals: 1.3 }, reputation: 3 }, lose: { trust: -3 } } },
      { fx: { attrs: { vision: 2 } } },
    ],
    it: { t: 'Il tiro dalla distanza', d: 'Gli avversari ti lasciano sempre libero al limite: pensano che tu non tiri mai.', o: [
      { l: 'Provi a sorprenderli', rw: 'Alla terza occasione la metti all’incrocio. Da quel giorno qualcuno ti viene incontro.', rl: 'Tre tiri in curva. L’allenatore ti chiede di tornare a passarla.' },
      { l: 'Sfrutti lo spazio per servire', r: 'Libero al limite vedi tutto il campo. I compagni ricevono meglio.' },
    ] },
    en: { t: 'The long-range shot', d: 'Opponents always leave you free at the edge of the box: they think you never shoot.', o: [
      { l: 'Try to surprise them', rw: 'On the third chance you put it in the top corner. Since then someone always closes you down.', rl: 'Three shots into the stands. The coach asks you to go back to passing.' },
      { l: 'Use the space to pass', r: 'Free at the edge you see the whole pitch. Team-mates get better service.' },
    ] },
  },
  {
    id: 'x_med_double_pivot', kind: 'decision', group: 'role', w: 4, when: R(['MED'], { ageMin: 21 }),
    o: [
      { fx: { attrs: { stamina: 2, tackling: 1 }, fitness: -2 } },
      { fx: { attrs: { passing: 2, vision: 1 } } },
    ],
    it: { t: 'La coppia di mediani', d: 'Ti affiancano un centrocampista tecnico. Uno dei due deve correre per tutti e due.', o: [
      { l: 'Corri tu', r: 'Lui gioca, tu recuperi. La squadra trova equilibrio, le tue gambe un po’ meno.' },
      { l: 'Vi dividete i compiti', r: 'Imparate a scambiarvi i ruoli. Tocchi più palloni e sbagli meno.' },
    ] },
    en: { t: 'The double pivot', d: 'They pair you with a technical midfielder. One of you has to do the running for both.', o: [
      { l: 'You do the running', r: 'He plays, you recover. The team finds balance, your legs a bit less.' },
      { l: 'Share the jobs', r: 'You learn to swap roles. You touch more balls and make fewer mistakes.' },
    ] },
  },
  {
    id: 'x_med_ban_appeal', kind: 'incident', w: 3, when: R(['MED'], { ageMin: 20 }),
    fx: { morale: -4, trust: -2, mods: { minApps: 1 } },
    it: { t: 'Il rosso per doppia ammonizione', d: 'Due gialli in dieci minuti, il secondo per una trattenuta a centrocampo. La squadra resiste in dieci, tu guardi dal tunnel.' },
    en: { t: 'Sent off for two yellows', d: 'Two bookings in ten minutes, the second for a shirt pull in midfield. The team holds on with ten, you watch from the tunnel.' },
  },
  {
    id: 'x_med_libero_role', kind: 'decision', group: 'role', w: 3, when: R(['MED'], { ageMin: 29 }),
    o: [
      { fx: { attrs: { positioning: 3 }, fitness: 4 } },
      { fx: { attrs: { stamina: 1 }, trust: 2, fitness: -2 } },
    ],
    it: { t: 'Un passo indietro', d: 'L’allenatore ti propone di abbassarti tra i centrali quando la squadra imposta. Meno chilometri, più responsabilità.', o: [
      { l: 'Scendi tra i centrali', r: 'Da lì vedi tutto e corri la metà. La carriera si allunga.' },
      { l: 'Resti in mezzo al campo', r: 'Il tuo posto è dove si recupera palla. Ancora per un po’.' },
    ] },
    en: { t: 'A step back', d: 'The coach suggests dropping between the centre-backs when the team builds play. Fewer kilometres, more responsibility.', o: [
      { l: 'Drop between the centre-backs', r: 'From there you see everything and run half as much. Your career lengthens.' },
      { l: 'Stay in midfield', r: 'Your place is where the ball is won. For a while longer.' },
    ] },
  },

  /* ======================= MEZZALA ======================= */
  {
    id: 'x_mez_trequartista', kind: 'decision', group: 'role', w: 4, when: R(['MEZ'], { ageMin: 20 }),
    o: [
      { fx: { attrs: { vision: 2, shooting: 1 }, mods: { goals: 1.15, assists: 1.15 }, trust: -2 } },
      { fx: { attrs: { tackling: 2 }, trust: 3 } },
    ],
    it: { t: 'Dietro le punte', d: 'In amichevole giochi da trequartista e fai la differenza. Ma lì sei poco utile quando la palla ce l’hanno gli altri.', o: [
      { l: 'Chiedi di giocare lì', r: 'Più gol e più assist. Quando c’è da difendere, qualcuno brontola.' },
      { l: 'Torni mezzala', r: 'Il lavoro sporco resta tuo. L’allenatore si fida.' },
    ] },
    en: { t: 'Behind the strikers', d: 'In a friendly you play as a number ten and make the difference. But there you’re little use when the other team has the ball.', o: [
      { l: 'Ask to play there', r: 'More goals and assists. When it’s time to defend, someone grumbles.' },
      { l: 'Go back to central midfield', r: 'The dirty work stays yours. The coach trusts you.' },
    ] },
  },
  {
    id: 'x_mez_box_to_box', kind: 'decision', group: 'role', w: 4, when: R(['MEZ'], { ageMin: 18 }),
    o: [
      { fx: { attrs: { stamina: 3 }, fitness: -2 } },
      { fx: { attrs: { passing: 2 } } },
    ],
    it: { t: 'Il test del GPS', d: 'I dati del GPS dicono che corri meno degli altri centrocampisti. Il preparatore ti propone un programma di corsa.', o: [
      { l: 'Lo segui alla lettera', r: 'Un’estate di ripetute. Adesso sei tu in cima alla classifica dei chilometri.' },
      { l: 'Rispondi facendo correre la palla', r: 'Giochi a due tocchi e la palla viaggia per te. I dati restano quelli, il gioco migliora.' },
    ] },
    en: { t: 'The GPS test', d: 'GPS data says you run less than the other midfielders. The fitness coach offers a running programme.', o: [
      { l: 'Follow it to the letter', r: 'A summer of intervals. Now you top the distance chart.' },
      { l: 'Answer by moving the ball', r: 'You play two-touch and the ball runs for you. The data stays the same, the play improves.' },
    ] },
  },
  {
    id: 'x_mez_dribble_school', kind: 'decision', group: 'role', w: 3, when: R(['MEZ'], { ageMax: 24 }),
    o: [
      { fx: { attrs: { dribbling: 3 }, mods: { form: -0.01 } } },
      { fx: { attrs: { vision: 2 } } },
    ],
    it: { t: 'Il futsal d’inverno', d: 'Un amico ti invita in una squadra di calcio a cinque durante la sosta. Spazi stretti, pallone sempre addosso.', o: [
      { l: 'Ci vai', r: 'Torni con un controllo orientato che nessuno ti aveva insegnato.' },
      { l: 'Ti riposi', r: 'Guardi partite e studi le linee di passaggio.' },
    ] },
    en: { t: 'Winter futsal', d: 'A friend invites you to a five-a-side team during the break. Tight spaces, the ball always at your feet.', o: [
      { l: 'Go', r: 'You come back with a first touch nobody had taught you.' },
      { l: 'Rest', r: 'You watch games and study passing lanes.' },
    ] },
  },
  {
    id: 'x_mez_last_minute', kind: 'incident', w: 3, when: R(['MEZ'], { ageMin: 19 }),
    fx: { morale: 7, reputation: 3, mods: { minGoals: 1, minApps: 1 } },
    it: { t: 'Il gol al novantesimo', d: 'Inserimento sul secondo palo, pallone che arriva, piattone. Una partita che sembrava persa diventa tua.' },
    en: { t: 'The ninetieth-minute goal', d: 'A late run to the far post, the ball arrives, a side-foot finish. A game that looked lost becomes yours.' },
  },
  {
    id: 'x_mez_captain_kid', kind: 'decision', group: 'role', w: 3, when: R(['MEZ'], { ageMin: 28 }),
    o: [
      { fx: { attrs: { vision: 2 }, flag: 'mentor', morale: 3 } },
      { fx: { attrs: { shooting: 1 }, reputation: 2 } },
    ],
    it: { t: 'Il regista del futuro', d: 'La società ha comprato un centrocampista di diciotto anni con il tuo stesso ruolo e ti chiede di fargli da guida.', o: [
      { l: 'Lo prendi sotto la tua ala', r: 'Gli insegni i tempi. Vederlo crescere ti fa vedere il campo in modo diverso.' },
      { l: 'Pensi alla tua stagione', r: 'Hai ancora molto da dare. Il ragazzo imparerà guardando.' },
    ] },
    en: { t: 'The playmaker of the future', d: 'The club has bought an eighteen-year-old midfielder in your role and asks you to guide him.', o: [
      { l: 'Take him under your wing', r: 'You teach him timing. Watching him grow changes how you see the pitch.' },
      { l: 'Focus on your season', r: 'You still have a lot to give. The kid will learn by watching.' },
    ] },
  },

  /* ======================= ALA ======================= */
  {
    id: 'x_ala_right_left', kind: 'decision', group: 'role', w: 4, when: R(['ALA'], { ageMin: 19 }),
    o: [
      { fx: { attrs: { finishing: 2 }, mods: { goals: 1.15 } } },
      { fx: { attrs: { crossing: 2 }, mods: { assists: 1.15 } } },
    ],
    it: { t: 'Gol o assist', d: 'L’allenatore ti dice che puoi fare venti gol o venti assist, ma non entrambi. Devi decidere che giocatore essere.', o: [
      { l: 'Punti alla porta', r: 'Ogni azione finisce con un tuo tiro. I gol arrivano.' },
      { l: 'Punti al compagno', r: 'Arrivi sul fondo e metti palloni puliti. Il centravanti ringrazia.' },
    ] },
    en: { t: 'Goals or assists', d: 'The coach says you can get twenty goals or twenty assists, but not both. You have to decide what player to be.', o: [
      { l: 'Aim for goal', r: 'Every move ends with your shot. The goals come.' },
      { l: 'Aim for the team-mate', r: 'You reach the byline and deliver clean balls. The striker is grateful.' },
    ] },
  },
  {
    id: 'x_ala_press_winger', kind: 'decision', group: 'role', w: 4, when: R(['ALA'], { ageMin: 20 }),
    o: [
      { fx: { attrs: { pace: 1 }, trust: 5, fitness: -3, mods: { goals: 0.9 } } },
      { fx: { attrs: { technique: 2 }, trust: -3 } },
    ],
    it: { t: 'Il pressing sul terzino', d: 'Il nuovo allenatore vuole che l’ala sia il primo difensore: pressing sul terzino avversario ogni volta che imposta.', o: [
      { l: 'Diventi il primo difensore', r: 'L’allenatore ti adora. Arrivi in area con meno lucidità.' },
      { l: 'Risparmi le energie per attaccare', r: 'Quando hai palla sei devastante. Quando non ce l’hai, ti richiamano.' },
    ] },
    en: { t: 'Pressing the full-back', d: 'The new coach wants the winger to be the first defender: press the opposing full-back every time they build.', o: [
      { l: 'Become the first defender', r: 'The coach loves you. You reach the box less fresh.' },
      { l: 'Save energy for attacking', r: 'With the ball you’re devastating. Without it, they shout at you.' },
    ] },
  },
  {
    id: 'x_ala_speed_record', kind: 'incident', w: 2, when: R(['ALA'], { ageMax: 26 }),
    fx: { reputation: 4, morale: 4 },
    it: { t: 'Il più veloce del campionato', d: 'I dati della lega ti incoronano il giocatore più veloce della stagione. I terzini avversari ne tengono conto.' },
    en: { t: 'Fastest in the league', d: 'League data crowns you the fastest player of the season. Opposing full-backs take note.' },
  },
  {
    id: 'x_ala_diving', kind: 'decision', group: 'role', w: 3, when: R(['ALA'], { ageMin: 19 }),
    o: [
      { fx: { reputation: -3, morale: -2, attrs: { dribbling: 1 } } },
      { fx: { attrs: { technique: 1 }, trust: 2 } },
    ],
    it: { t: 'La simulazione', d: 'Un tuo tuffo in area porta a un rigore. Al VAR si vede tutto. La stampa ti accusa, la tua curva ti difende.', o: [
      { l: 'Non ammetti niente', r: 'La polemica dura settimane. Gli arbitri adesso ti guardano con sospetto.' },
      { l: 'Chiedi scusa pubblicamente', r: 'Una frase semplice in conferenza stampa. Il caso si chiude in un giorno.' },
    ] },
    en: { t: 'The dive', d: 'A dive of yours in the box wins a penalty. VAR shows everything. The press accuses you, your fans defend you.', o: [
      { l: 'Admit nothing', r: 'The row lasts weeks. Referees now watch you with suspicion.' },
      { l: 'Apologise publicly', r: 'A simple sentence at the press conference. The matter closes in a day.' },
    ] },
  },
  {
    id: 'x_ala_fullback_conversion', kind: 'decision', group: 'role', w: 3, when: R(['ALA'], { ageMin: 29 }),
    o: [
      { fx: { attrs: { vision: 2, crossing: 1 }, trust: 4, fitness: 3 } },
      { fx: { attrs: { finishing: 1 }, reputation: 1 } },
    ],
    it: { t: 'Qualche metro più indietro', d: 'Lo scatto non è più quello. L’allenatore ti vede bene come esterno a tutta fascia, dove conta più il piede che le gambe.', o: [
      { l: 'Ci provi', r: 'Il cross è ancora il tuo. Giochi con più tempo e più campo davanti.' },
      { l: 'Resti là davanti', r: 'Finché riesci a saltare l’uomo, resti dove fai male.' },
    ] },
    en: { t: 'A few metres deeper', d: 'The burst isn’t what it was. The coach sees you as a wing-back, where the foot matters more than the legs.', o: [
      { l: 'Give it a go', r: 'The cross is still yours. You play with more time and more pitch ahead.' },
      { l: 'Stay up front', r: 'As long as you can beat your man, you stay where you hurt teams.' },
    ] },
  },

  /* ======================= PUNTA ======================= */
  {
    id: 'x_pun_partner', kind: 'decision', group: 'role', w: 4, when: R(['PUN'], { ageMin: 20 }),
    o: [
      { fx: { attrs: { finishing: 2 }, mods: { goals: 1.15 } } },
      { fx: { attrs: { technique: 2 }, mods: { assists: 1.3 } } },
    ],
    it: { t: 'Il nuovo compagno di reparto', d: 'Arriva un attaccante che segna tanto. Si gioca con due punte e bisogna capire chi fa la prima e chi la seconda.', o: [
      { l: 'La prima punta sei tu', r: 'Stai in area e lui lavora per te. I palloni buoni arrivano.' },
      { l: 'Ti allarghi e lo servi', r: 'Diventi la spalla. Meno gol tuoi, più gol della squadra.' },
    ] },
    en: { t: 'The new strike partner', d: 'A prolific striker arrives. The team plays two up front and you have to work out who leads the line.', o: [
      { l: 'You lead the line', r: 'You stay in the box and he works for you. The good balls arrive.' },
      { l: 'Drift wide and feed him', r: 'You become the foil. Fewer goals for you, more for the team.' },
    ] },
  },
  {
    id: 'x_pun_headers', kind: 'decision', group: 'role', w: 4, when: R(['PUN'], { ageMin: 18 }),
    o: [
      { fx: { attrs: { heading: 3 }, fitness: -2 } },
      { fx: { attrs: { pace: 2 } } },
    ],
    it: { t: 'Il colpo di testa', d: 'Il vice allenatore ha notato che di testa chiudi gli occhi. Propone un mese di sessioni con la macchina spara-palloni.', o: [
      { l: 'Un mese di testate', r: 'Mal di collo per settimane. Poi il pallone lo guardi fino all’impatto.' },
      { l: 'Punti sui piedi e sulla velocità', r: 'I cross li lasci agli altri. Tu attacchi la profondità.' },
    ] },
    en: { t: 'The header', d: 'The assistant coach noticed you close your eyes when heading. He proposes a month with the ball machine.', o: [
      { l: 'A month of headers', r: 'A sore neck for weeks. Then you watch the ball all the way onto your head.' },
      { l: 'Rely on feet and speed', r: 'You leave crosses to others. You attack the space in behind.' },
    ] },
  },
  {
    id: 'x_pun_hat_trick_ball', kind: 'incident', w: 2, when: R(['PUN'], { ageMin: 19 }),
    fx: { morale: 8, reputation: 4, mods: { minGoals: 3, minApps: 1 } },
    it: { t: 'Il pallone della tripletta', d: 'Tre gol in un tempo. L’arbitro ti consegna il pallone a fine partita e lo firmano tutti i compagni.' },
    en: { t: 'The hat-trick ball', d: 'Three goals in one half. The referee hands you the match ball and every team-mate signs it.' },
  },
  {
    id: 'x_pun_offside_trap', kind: 'decision', group: 'role', w: 3, when: R(['PUN'], { ageMin: 21 }),
    o: [
      { fx: { attrs: { positioning: 3 } } },
      { fx: { attrs: { strength: 2 }, mods: { assists: 1.1 } } },
    ],
    it: { t: 'Sempre in fuorigioco', d: 'Nell’ultimo mese ti hanno fischiato quindici fuorigioco. L’allenatore ti mostra i video: parti sempre un attimo prima.', o: [
      { l: 'Lavori sui tempi della partenza', r: 'Ti alleni guardando la linea e non il pallone. I gol annullati diminuiscono.' },
      { l: 'Giochi più spalle alla porta', r: 'Invece di scattare, vieni incontro. Fai salire la squadra.' },
    ] },
    en: { t: 'Always offside', d: 'In the last month you’ve been flagged offside fifteen times. The coach shows you the videos: you always go a moment early.', o: [
      { l: 'Work on the timing of your runs', r: 'You train watching the line, not the ball. Fewer goals ruled out.' },
      { l: 'Play more with your back to goal', r: 'Instead of running in behind, you come short. The team pushes up.' },
    ] },
  },
  {
    id: 'x_pun_goal_celebration', kind: 'decision', group: 'role', w: 2, when: R(['PUN'], { ageMin: 20, repMin: 20 }),
    o: [
      { fx: { reputation: 3, morale: 3 } },
      { fx: { morale: 1, trust: 1 } },
    ],
    it: { t: 'L’esultanza', d: 'I tifosi ti chiedono sui social di inventare un’esultanza tutta tua.', o: [
      { l: 'Ne inventi una', r: 'Dopo il primo gol la fanno tutti i bambini della città.' },
      { l: 'Corri dai compagni, come sempre', r: 'Il gol è di tutti. I tifosi apprezzano lo stesso.' },
    ] },
    en: { t: 'The celebration', d: 'Fans ask you online to come up with a celebration of your own.', o: [
      { l: 'Invent one', r: 'After your first goal every kid in town copies it.' },
      { l: 'Run to your team-mates, as always', r: 'The goal belongs to everyone. The fans like that too.' },
    ] },
  },

  /* ======================= GIOVANI ======================= */
  {
    id: 'x_y_first_team_training', kind: 'decision', group: 'life', w: 5, when: { ageMax: 18 },
    o: [
      { fx: { best: 2, fitness: -3, trust: 4 } },
      { fx: { weakest: 2, morale: 2 } },
    ],
    it: { t: 'Allenamento con la prima squadra', d: 'Ti chiamano ad allenarti con i grandi due volte a settimana. Si va a un’altra velocità.', o: [
      { l: 'Ti butti dentro al massimo', r: 'Esci distrutto, ma l’allenatore ti ha visto. Il tuo punto forte migliora.' },
      { l: 'Lavori sui tuoi difetti', r: 'Chiedi consigli ai veterani su quello che ti manca. Colmi il divario piano piano.' },
    ] },
    en: { t: 'Training with the first team', d: 'You’re called up to train with the senior squad twice a week. It’s another speed altogether.', o: [
      { l: 'Throw yourself in', r: 'You leave exhausted, but the coach noticed. Your strength improves.' },
      { l: 'Work on your weaknesses', r: 'You ask the veterans about what you lack. The gap closes slowly.' },
    ] },
  },
  {
    id: 'x_y_scholarship', kind: 'decision', group: 'life', w: 3, when: { ageMax: 18 },
    o: [
      { fx: { flag: 'diploma', morale: 2, fitness: -2 } },
      { fx: { best: 1, trust: 2 } },
    ],
    it: { t: 'La borsa di studio americana', d: 'Un’università americana ti offre una borsa di studio: calcio e laurea insieme. Il tuo club preferisce che resti.', o: [
      { l: 'Resti, ma ti iscrivi online', r: 'Studi di sera con i libri sul pullman delle trasferte. Un piano B in tasca.' },
      { l: 'Solo pallone', r: 'Il club apprezza. Tutte le energie vanno sul campo.' },
    ] },
    en: { t: 'The American scholarship', d: 'An American university offers you a scholarship: football and a degree. Your club would rather you stayed.', o: [
      { l: 'Stay, but enrol online', r: 'You study at night with books on the team bus. A plan B in your pocket.' },
      { l: 'Football only', r: 'The club appreciates it. All your energy goes onto the pitch.' },
    ] },
  },
  {
    id: 'x_y_parents', kind: 'decision', group: 'life', w: 4, when: { ageMax: 19 },
    o: [
      { fx: { morale: 4, trust: -2 } },
      { fx: { morale: -2, trust: 3, best: 1 } },
    ],
    it: { t: 'Il papà in tribuna', d: 'Tuo padre urla indicazioni dalla tribuna a ogni partita, contraddicendo l’allenatore. I compagni ci scherzano sopra.', o: [
      { l: 'Lo lasci fare', r: 'È il tuo primo tifoso. L’allenatore un po’ meno contento.' },
      { l: 'Gli chiedi di stare zitto', r: 'Una discussione in macchina, poi capisce. In campo ascolti solo l’allenatore.' },
    ] },
    en: { t: 'Dad in the stands', d: 'Your father shouts instructions from the stands every game, contradicting the coach. Team-mates joke about it.', o: [
      { l: 'Let him be', r: 'He’s your biggest fan. The coach is a little less happy.' },
      { l: 'Ask him to stay quiet', r: 'An argument in the car, then he understands. On the pitch you only listen to the coach.' },
    ] },
  },
  {
    id: 'x_y_social_star', kind: 'decision', group: 'life', w: 3, when: { ageMax: 21, repMin: 5 },
    o: [
      { fx: { reputation: 4, fitness: -3, trust: -2 } },
      { fx: { trust: 2, best: 1 } },
    ],
    it: { t: 'Centomila follower', d: 'Un tuo video di allenamento fa il giro del mondo. Le agenzie ti propongono contenuti sponsorizzati.', o: [
      { l: 'Cavalchi l’onda', r: 'Diventi un volto noto prima di diventare un giocatore noto. Le ore di sonno calano.' },
      { l: 'Spegni il telefono', r: 'Il video resta un bel ricordo. La testa resta sul pallone.' },
    ] },
    en: { t: 'A hundred thousand followers', d: 'A training video of yours goes round the world. Agencies offer you sponsored content.', o: [
      { l: 'Ride the wave', r: 'You become a famous face before a famous player. Sleep hours drop.' },
      { l: 'Switch the phone off', r: 'The video stays a nice memory. Your head stays on the ball.' },
    ] },
  },
  {
    id: 'x_y_growth_plate', kind: 'incident', w: 2, when: { ageMax: 18 },
    fx: { forcedInjury: { severity: 'minor', weeks: 3 }, fitness: -3 },
    it: { t: 'La pubalgia da crescita', d: 'Il corpo cresce più in fretta dei muscoli. Tre settimane di stop e un programma di stretching per tutto l’anno.' },
    en: { t: 'Growing pains', d: 'Your body grows faster than your muscles. Three weeks out and a stretching programme for the whole year.' },
  },
  {
    id: 'x_y_foreign_academy', kind: 'decision', group: 'life', w: 3, when: { ageMax: 19, tierMin: 3 },
    o: [
      { fx: { flag: 'wantsOut', morale: 3, best: 1 } },
      { fx: { flag: 'loyal', trust: 5 } },
    ],
    it: { t: 'L’offerta dall’estero', d: 'Un club straniero di prima fascia offre al tuo procuratore un posto nella sua squadra giovanile. Il tuo club ti promette spazio.', o: [
      { l: 'Vuoi andare', r: 'A fine stagione il procuratore cercherà la squadra giusta. Il club lo sa.' },
      { l: 'Resti a crescere qui', r: 'L’allenatore apprezza e ti tiene d’occhio. Il posto te lo guadagni in casa.' },
    ] },
    en: { t: 'The offer from abroad', d: 'A top foreign club offers your agent a place in its youth side. Your club promises you playing time.', o: [
      { l: 'You want to go', r: 'At the end of the season your agent will look for the right club. The club knows.' },
      { l: 'Stay and grow here', r: 'The coach appreciates it and keeps an eye on you. You earn your place at home.' },
    ] },
  },
  {
    id: 'x_y_youth_cup', kind: 'decision', group: 'life', w: 3, when: { ageMax: 19 },
    o: [
      { fx: { p: 0.5, base: { best: 1 }, win: { reputation: 5, morale: 6 }, lose: { morale: -3 } } },
      { fx: { trust: 4 } },
    ],
    it: { t: 'La Youth League', d: 'La squadra giovanile gioca il torneo europeo di categoria. Ti chiedono di scendere dalla prima squadra per la fase finale.', o: [
      { l: 'Vai a giocartela', rw: 'Sei il migliore del torneo. Gli osservatori prendono appunti.', rl: 'Fuori ai quarti. Una bella esperienza, nient’altro.' },
      { l: 'Resti con i grandi', r: 'L’allenatore apprezza la scelta. Ti fa esordire in una partita di coppa.' },
    ] },
    en: { t: 'The Youth League', d: 'The youth team plays the European age-group tournament. They ask you to drop down from the first team for the finals.', o: [
      { l: 'Go and play it', rw: 'You’re the player of the tournament. Scouts take notes.', rl: 'Out in the quarter-finals. A nice experience, nothing more.' },
      { l: 'Stay with the seniors', r: 'The coach appreciates the choice. He gives you a cup debut.' },
    ] },
  },

  /* ======================= NEL PIENO DELLA CARRIERA ======================= */
  {
    id: 'x_p_europe_night', kind: 'decision', group: 'life', w: 5, when: { ageMin: 20, cont: true },
    o: [
      { fx: { p: 0.5, base: { fitness: -2 }, win: { reputation: 5, morale: 5, mods: { form: 0.03 } }, lose: { morale: -4 } } },
      { fx: { fitness: 4, trust: 2 } },
    ],
    it: { t: 'Le notti europee', d: 'Coppa europea e campionato ogni tre giorni. L’allenatore ti lascia scegliere se giocarle tutte o dosarti.', o: [
      { l: 'Le vuoi giocare tutte', rw: 'Nelle notti di coppa sei trasformato. In Europa cominciano a conoscerti.', rl: 'A febbraio le gambe non girano più. Paghi in campionato.' },
      { l: 'Accetti il turnover', r: 'Arrivi fresco alle partite che contano. L’allenatore apprezza.' },
    ] },
    en: { t: 'European nights', d: 'European football and the league every three days. The coach lets you choose whether to play them all or manage yourself.', o: [
      { l: 'You want to play them all', rw: 'On cup nights you’re transformed. Europe starts to know your name.', rl: 'By February your legs have gone. You pay for it in the league.' },
      { l: 'Accept rotation', r: 'You arrive fresh for the games that matter. The coach appreciates it.' },
    ] },
  },
  {
    id: 'x_p_abroad_language', kind: 'decision', group: 'life', w: 5, when: { ageMin: 19, abroad: true },
    o: [
      { fx: { trust: 5, morale: 2, flag: 'polyglot' } },
      { fx: { morale: -2, trust: -3 } },
    ],
    it: { t: 'La lingua del nuovo paese', d: 'A {club} parlano tutti una lingua che non conosci. Lo spogliatoio si divide in gruppetti.', o: [
      { l: 'Lezioni ogni mattina', r: 'Dopo tre mesi fai le interviste senza traduttore. I compagni ti adottano.' },
      { l: 'Ti affidi all’interprete', r: 'In campo ti capisci a gesti. Fuori resti un po’ isolato.' },
    ] },
    en: { t: 'The new country’s language', d: 'At {club} everyone speaks a language you don’t know. The dressing room splits into little groups.', o: [
      { l: 'Lessons every morning', r: 'After three months you give interviews without a translator. Team-mates adopt you.' },
      { l: 'Rely on the interpreter', r: 'On the pitch you communicate with gestures. Off it you stay a little isolated.' },
    ] },
  },
  {
    id: 'x_p_relegation_fight', kind: 'decision', group: 'life', w: 5, when: { ageMin: 20, tierMin: 4 },
    o: [
      { fx: { flag: 'loyal', trust: 6, morale: -2 } },
      { fx: { flag: 'wantsOut', morale: 2 } },
    ],
    it: { t: 'La lotta per non retrocedere', d: '{club} è in fondo alla classifica a gennaio. Una squadra più forte chiede di te al tuo procuratore.', o: [
      { l: 'Resti a lottare', r: 'Diventi il simbolo della salvezza, comunque vada. Tifosi e allenatore non lo dimenticano.' },
      { l: 'Chiedi di essere ceduto in estate', r: 'Il club accetta di ascoltare offerte a fine stagione. I tifosi no.' },
    ] },
    en: { t: 'The relegation fight', d: '{club} are bottom of the table in January. A stronger team asks your agent about you.', o: [
      { l: 'Stay and fight', r: 'You become the symbol of survival, whatever happens. Fans and coach won’t forget.' },
      { l: 'Ask to be sold in the summer', r: 'The club agrees to hear offers at the end of the season. The fans don’t.' },
    ] },
  },
  {
    id: 'x_p_big_club_bench', kind: 'decision', group: 'life', w: 5, when: { ageMin: 21, tierMax: 2, trustMax: 50 },
    o: [
      { fx: { p: 0.45, base: { best: 1 }, win: { trustSet: 60, morale: 5 }, lose: { morale: -5, mods: { minutes: -0.1 } } } },
      { fx: { flag: 'wantsLoan', morale: 2 } },
      { fx: { flag: 'wantsOut', trust: -3 } },
    ],
    it: { t: 'Panchina in una grande', d: 'A {club} ci sono tre nazionali nel tuo ruolo. Giochi le coppe minori e gli ultimi minuti.', o: [
      { l: 'Resti e ti giochi il posto', rw: 'Due partite perfette quando conta e l’allenatore ti promuove titolare.', rl: 'I tre davanti non mollano. Guardi le partite grandi dalla panchina.' },
      { l: 'Chiedi un prestito', r: 'A fine stagione si cerca una squadra dove giocare, poi si torna.' },
      { l: 'Chiedi la cessione', r: 'Il procuratore apre il mercato. Il club storce il naso.' },
    ] },
    en: { t: 'Benched at a big club', d: 'At {club} there are three internationals in your position. You play the minor cups and the last few minutes.', o: [
      { l: 'Stay and fight for it', rw: 'Two perfect games when it matters and the coach makes you a starter.', rl: 'The three ahead don’t budge. You watch the big games from the bench.' },
      { l: 'Ask for a loan', r: 'At the end of the season you’ll look for a team to play for, then come back.' },
      { l: 'Ask to be sold', r: 'Your agent opens the market. The club isn’t pleased.' },
    ] },
  },
  {
    id: 'x_p_new_coach_system', kind: 'decision', group: 'life', w: 5, when: { ageMin: 20 },
    o: [
      { fx: { trust: 6, weakest: 2, morale: -1 } },
      { fx: { best: 2, trust: -5 } },
    ],
    it: { t: 'L’allenatore delle idee fisse', d: 'Il nuovo tecnico ti chiede compiti che non hai mai fatto, e ti avverte: chi non si adatta non gioca.', o: [
      { l: 'Ti adatti', r: 'Mesi scomodi, ma migliori proprio dove eri più debole. E giochi.' },
      { l: 'Resti il giocatore che sei', r: 'Continui a fare quello che ti riesce meglio. L’allenatore ti guarda storto.' },
    ] },
    en: { t: 'The coach with fixed ideas', d: 'The new manager asks you for tasks you’ve never done and warns: whoever doesn’t adapt doesn’t play.', o: [
      { l: 'Adapt', r: 'Uncomfortable months, but you improve exactly where you were weakest. And you play.' },
      { l: 'Stay the player you are', r: 'You keep doing what you do best. The coach glares at you.' },
    ] },
  },
  {
    id: 'x_p_fan_protest', kind: 'decision', group: 'life', w: 4, when: { ageMin: 22 },
    o: [
      { fx: { reputation: 3, trust: -3, morale: 2 } },
      { fx: { trust: 3, reputation: -1 } },
    ],
    it: { t: 'La contestazione', d: 'Dopo quattro sconfitte i tifosi aspettano la squadra fuori dal centro sportivo. Vogliono parlare con qualcuno.', o: [
      { l: 'Scendi a parlare con loro', r: 'Ascolti, prometti impegno. I tifosi ti rispettano, la società non gradisce l’iniziativa.' },
      { l: 'Lasci parlare la società', r: 'Resti fuori dalla polemica. Qualcuno sugli spalti lo nota.' },
    ] },
    en: { t: 'The protest', d: 'After four defeats fans wait for the team outside the training ground. They want to talk to someone.', o: [
      { l: 'Go out and talk to them', r: 'You listen and promise effort. The fans respect you, the club dislikes the initiative.' },
      { l: 'Let the club speak', r: 'You stay out of it. Some people in the stands notice.' },
    ] },
  },
  {
    id: 'x_p_contract_bonus', kind: 'decision', group: 'life', w: 4, when: { ageMin: 22, seasonMin: 2 },
    o: [
      { fx: { mods: { minutes: 0.05, form: 0.02 }, fitness: -3, morale: 3 } },
      { fx: { fitness: 3, trust: 1 } },
    ],
    it: { t: 'Il bonus presenze', d: 'Il nuovo contratto prevede un bonus se giochi almeno trenta partite. Il medico ti consiglia di saltarne qualcuna.', o: [
      { l: 'Punti al bonus', r: 'Giochi anche con qualche acciacco. Il conto in banca sorride, il fisico meno.' },
      { l: 'Ascolti il medico', r: 'Il bonus forse non arriva. Il corpo ringrazia.' },
    ] },
    en: { t: 'The appearance bonus', d: 'Your new contract includes a bonus if you play at least thirty games. The doctor advises skipping a few.', o: [
      { l: 'Go for the bonus', r: 'You play through a few knocks. The bank balance smiles, the body less so.' },
      { l: 'Listen to the doctor', r: 'The bonus may not come. Your body is grateful.' },
    ] },
  },
  {
    id: 'x_p_after_trophy', kind: 'decision', group: 'life', w: 5, when: { ageMin: 20, lastTrophy: true },
    o: [
      { fx: { morale: 4, fitness: -4, reputation: 2 } },
      { fx: { best: 1, trust: 3 } },
    ],
    it: { t: 'Dopo la festa', d: 'Il trofeo è ancora in bacheca e la città non ha smesso di festeggiare. Il ritiro estivo è tra una settimana.', o: [
      { l: 'Ti godi l’estate fino in fondo', r: 'Feste, viaggi, interviste. Torni in ritiro felice e con qualche chilo in più.' },
      { l: 'Riparti subito ad allenarti', r: 'La fame resta intatta. L’allenatore ti porta ad esempio.' },
    ] },
    en: { t: 'After the party', d: 'The trophy is still in the cabinet and the city hasn’t stopped celebrating. Pre-season starts in a week.', o: [
      { l: 'Enjoy the summer to the full', r: 'Parties, trips, interviews. You return happy and a few kilos heavier.' },
      { l: 'Start training straight away', r: 'The hunger stays intact. The coach holds you up as an example.' },
    ] },
  },
  {
    id: 'x_p_after_relegation', kind: 'decision', group: 'life', w: 6, when: { ageMin: 20, lastRelegated: true },
    o: [
      { fx: { flag: 'loyal', trust: 8, morale: -3 } },
      { fx: { flag: 'forceMove', morale: 2, reputation: -1 } },
    ],
    it: { t: 'Dopo la retrocessione', d: 'La squadra è scesa di categoria. Il presidente ti chiama: vuole ricostruire attorno a te.', o: [
      { l: 'Resti per riportarla su', r: 'Una categoria in meno, ma sei il leader. L’allenatore ti affida la squadra.' },
      { l: 'Chiedi di andare via', r: 'Non vuoi perdere un anno. A fine stagione il procuratore troverà una squadra.' },
    ] },
    en: { t: 'After relegation', d: 'The team has gone down. The president calls you: he wants to rebuild around you.', o: [
      { l: 'Stay to bring them back up', r: 'One division lower, but you’re the leader. The coach hands you the team.' },
      { l: 'Ask to leave', r: 'You don’t want to lose a year. At the end of the season your agent will find a club.' },
    ] },
  },
  {
    id: 'x_p_after_injury', kind: 'decision', group: 'life', w: 6, when: { ageMin: 19, lastInjured: true },
    o: [
      { fx: { flag: 'carefulBody', fitness: 8, mods: { injuryRisk: -0.04 } } },
      { fx: { best: 1, fitness: -2, mods: { injuryRisk: 0.03 } } },
    ],
    it: { t: 'Il rientro dall’infortunio', d: 'Sei tornato disponibile, ma il fisioterapista vorrebbe un mese di lavoro graduale prima di rischiarti novanta minuti.', o: [
      { l: 'Segui il programma graduale', r: 'Qualche partita saltata, ma il muscolo torna come prima. Anzi meglio.' },
      { l: 'Vuoi rientrare subito', r: 'L’allenatore ti butta dentro. Sei decisivo, e un po’ più esposto.' },
    ] },
    en: { t: 'Coming back from injury', d: 'You’re available again, but the physio wants a month of gradual work before risking you for ninety minutes.', o: [
      { l: 'Follow the gradual plan', r: 'A few games missed, but the muscle comes back as before. Better, even.' },
      { l: 'Come back right away', r: 'The coach throws you in. You’re decisive, and a little more exposed.' },
    ] },
  },
  {
    id: 'x_p_teammate_depression', kind: 'decision', group: 'life', w: 3, when: { ageMin: 22 },
    o: [
      { fx: { morale: 2, trust: 2, fitness: -1, flag: 'leader' } },
      { fx: { morale: -1 } },
    ],
    it: { t: 'Il compagno che non ride più', d: 'Un compagno di squadra salta gli allenamenti e non risponde ai messaggi. Nessuno sa cosa gli succede.', o: [
      { l: 'Vai a trovarlo a casa', r: 'Parlate tutta la sera. Chiede aiuto. Lo spogliatoio si stringe intorno a voi.' },
      { l: 'Avvisi lo staff', r: 'Se ne occupano i professionisti. Tu resti un po’ in disparte.' },
    ] },
    en: { t: 'The team-mate who no longer laughs', d: 'A team-mate misses training and doesn’t answer messages. Nobody knows what’s wrong.', o: [
      { l: 'Go to see him at home', r: 'You talk all evening. He asks for help. The dressing room pulls together around you.' },
      { l: 'Tell the staff', r: 'The professionals handle it. You stay a little on the sidelines.' },
    ] },
  },
  {
    id: 'x_p_charity_match', kind: 'decision', group: 'life', w: 3, when: { ageMin: 22, repMin: 30 },
    o: [
      { fx: { reputation: 4, fitness: -2, morale: 3 } },
      { fx: { fitness: 3 } },
    ],
    it: { t: 'La partita di beneficenza', d: 'Nella pausa estiva ti invitano a una partita tra vecchie glorie e stelle di oggi per raccogliere fondi.', o: [
      { l: 'Ci vai', r: 'Giochi accanto a campioni che guardavi da bambino. Le foto finiscono ovunque.' },
      { l: 'Ti riposi', r: 'Mandi una maglia autografata all’asta. Le vacanze restano vacanze.' },
    ] },
    en: { t: 'The charity match', d: 'In the summer break you’re invited to a match between legends and today’s stars to raise money.', o: [
      { l: 'Go', r: 'You play alongside heroes you watched as a kid. The photos end up everywhere.' },
      { l: 'Rest', r: 'You send a signed shirt for the auction. Holidays stay holidays.' },
    ] },
  },
  {
    id: 'x_p_agent_switch', kind: 'decision', group: 'life', w: 4, when: { ageMin: 22 },
    o: [
      { fx: { flag: 'wantsOut', reputation: 2 } },
      { fx: { flag: 'loyal', trust: 3 } },
    ],
    it: { t: 'Il superprocuratore', d: 'Il procuratore più potente del calcio ti chiama. Promette un club più grande entro un anno.', o: [
      { l: 'Firmi con lui', r: 'Il tuo nome comincia a girare sui giornali. A fine stagione arriveranno offerte.' },
      { l: 'Resti con chi ti conosce', r: 'Non ti serve un salto in fretta. Il club apprezza la tranquillità.' },
    ] },
    en: { t: 'The super-agent', d: 'Football’s most powerful agent calls you. He promises a bigger club within a year.', o: [
      { l: 'Sign with him', r: 'Your name starts appearing in the papers. Offers will come at the end of the season.' },
      { l: 'Stay with who knows you', r: 'You don’t need a rushed jump. The club appreciates the calm.' },
    ] },
  },
  {
    id: 'x_p_derby_week', kind: 'decision', group: 'life', w: 4, when: { ageMin: 20, tierMax: 4 },
    o: [
      { fx: { p: 0.5, base: { mods: { minApps: 1 } }, win: { reputation: 4, morale: 6 }, lose: { morale: -6, reputation: -2 } } },
      { fx: { morale: 1, trust: 2, mods: { minApps: 1 } } },
    ],
    it: { t: 'La settimana del derby', d: 'In città non si parla d’altro. Un giornalista ti chiede di mandare un messaggio ai rivali.', o: [
      { l: 'Lo mandi, forte e chiaro', rw: 'Vincete e la frase diventa un coro. La tua curva ti adotta.', rl: 'Perdete. La frase ti rimbalza addosso per mesi.' },
      { l: 'Parli solo di rispetto', r: 'Il derby lo giochi in campo. Nessuno ha niente da rinfacciarti.' },
    ] },
    en: { t: 'Derby week', d: 'The city talks about nothing else. A journalist asks you to send a message to the rivals.', o: [
      { l: 'Send it, loud and clear', rw: 'You win and the line becomes a chant. Your end adopts you.', rl: 'You lose. The line comes back at you for months.' },
      { l: 'Talk only about respect', r: 'You play the derby on the pitch. Nobody can throw anything back at you.' },
    ] },
  },
  {
    id: 'x_p_sleep_coach', kind: 'decision', group: 'life', w: 3, when: { ageMin: 21 },
    o: [
      { fx: { fitness: 6, mods: { injuryRisk: -0.02 } } },
      { fx: { morale: 2 } },
    ],
    it: { t: 'Il coach del sonno', d: 'Il club ingaggia un esperto del sonno. Niente telefono dopo le dieci, stanza fresca, orari fissi.', o: [
      { l: 'Segui le regole', r: 'Ti svegli riposato come non succedeva da anni. Recuperi prima tra una partita e l’altra.' },
      { l: 'Le serate sono sacre', r: 'Qualche serie tv fino a tardi non ha mai ucciso nessuno.' },
    ] },
    en: { t: 'The sleep coach', d: 'The club hires a sleep expert. No phone after ten, cool room, fixed hours.', o: [
      { l: 'Follow the rules', r: 'You wake up rested like you haven’t in years. You recover faster between games.' },
      { l: 'Evenings are sacred', r: 'A few late TV series never killed anyone.' },
    ] },
  },
  {
    id: 'x_p_home_club_rival', kind: 'decision', group: 'life', w: 3, when: { ageMin: 24, repMin: 35 },
    o: [
      { fx: { flag: 'wantsOut', reputation: -2, morale: 2 } },
      { fx: { flag: 'loyal', reputation: 3 } },
    ],
    it: { t: 'Il passaggio che fa discutere', d: 'La squadra più odiata dai tuoi tifosi ti vuole a tutti i costi. Paga il doppio e gioca la Champions.', o: [
      { l: 'Ci pensi davvero', r: 'I tifosi bruciano la tua maglia. A fine stagione il mercato si apre.' },
      { l: 'Rifiuti pubblicamente', r: 'Diventi un simbolo. Nessuno ti potrà mai dire niente.' },
    ] },
    en: { t: 'The controversial move', d: 'The team your fans hate most wants you at any price. They pay double and play in the Champions League.', o: [
      { l: 'Seriously consider it', r: 'Fans burn your shirt. At the end of the season the market opens.' },
      { l: 'Refuse publicly', r: 'You become a symbol. Nobody can ever say anything to you.' },
    ] },
  },
  {
    id: 'x_p_fitness_app', kind: 'decision', group: 'life', w: 3, when: { ageMin: 20 },
    o: [
      { fx: { phys: 1, fitness: -2 } },
      { fx: { best: 1 } },
    ],
    it: { t: 'Il programma estivo', d: 'Durante le vacanze il club manda un programma personale da seguire con un’app. Nessuno controlla davvero.', o: [
      { l: 'Lo segui ogni giorno', r: 'Torni in ritiro già in forma. Lo sprint e la resistenza ringraziano.' },
      { l: 'Ti alleni a modo tuo', r: 'Palla, campetto, amici. Il tuo punto di forza resta affilato.' },
    ] },
    en: { t: 'The summer programme', d: 'During the holidays the club sends a personal programme to follow with an app. Nobody really checks.', o: [
      { l: 'Follow it every day', r: 'You return to pre-season already fit. Sprint and stamina are grateful.' },
      { l: 'Train your own way', r: 'Ball, local pitch, friends. Your main strength stays sharp.' },
    ] },
  },
  {
    id: 'x_p_media_ban', kind: 'decision', group: 'life', w: 3, when: { ageMin: 21, repMin: 25 },
    o: [
      { fx: { trust: 4, reputation: -2 } },
      { fx: { reputation: 3, trust: -3 } },
    ],
    it: { t: 'Il silenzio stampa', d: 'Dopo un arbitraggio discusso la società impone il silenzio stampa. Un canale ti offre un’intervista esclusiva.', o: [
      { l: 'Rispetti il silenzio', r: 'La società apprezza. I giornalisti ti cercano un po’ meno.' },
      { l: 'Parli lo stesso', r: 'L’intervista fa rumore. In società qualcuno non la prende bene.' },
    ] },
    en: { t: 'The media blackout', d: 'After a controversial refereeing decision the club imposes a media blackout. A channel offers you an exclusive interview.', o: [
      { l: 'Respect the blackout', r: 'The club appreciates it. Journalists seek you out a little less.' },
      { l: 'Speak anyway', r: 'The interview makes noise. Someone at the club doesn’t take it well.' },
    ] },
  },

  /* ======================= VETERANI ======================= */
  {
    id: 'x_v_last_contract_length', kind: 'decision', group: 'life', w: 5, when: { ageMin: 31 },
    o: [
      { fx: { flag: 'loyal', morale: 3, trust: 2 } },
      { fx: { morale: 1, flag: 'wantsExotic' } },
      { fx: { flag: 'wantsLower', fitness: 3 } },
    ],
    it: { t: 'Gli ultimi anni', d: 'Il procuratore ti chiede come vuoi passare gli anni che restano: nella tua squadra, lontano con un grande contratto, o dove giochi sempre.', o: [
      { l: 'Nella mia squadra', r: 'Lo spogliatoio e i tifosi sono casa. Il club lo sa.' },
      { l: 'Un grande contratto lontano', r: 'A fine stagione il procuratore ascolterà le offerte più ricche.' },
      { l: 'Dove gioco tutte le domeniche', r: 'Anche una categoria più giù, pur di giocare.' },
    ] },
    en: { t: 'The last years', d: 'Your agent asks how you want to spend the years left: at your club, far away on a big contract, or wherever you play every week.', o: [
      { l: 'At my club', r: 'The dressing room and fans are home. The club knows.' },
      { l: 'A big contract far away', r: 'At the end of the season your agent will hear the richest offers.' },
      { l: 'Wherever I play every Sunday', r: 'Even a division lower, as long as you play.' },
    ] },
  },
  {
    id: 'x_v_diet_change', kind: 'decision', group: 'life', w: 4, when: { ageMin: 29 },
    o: [
      { fx: { fitness: 6, phys: 1, morale: -2 } },
      { fx: { morale: 3, fitness: -2 } },
    ],
    it: { t: 'La dieta del campione', d: 'Un compagno di trentotto anni ancora titolare ti racconta la sua dieta: niente zuccheri, niente alcol, dieci ore di sonno.', o: [
      { l: 'La copi in tutto', r: 'Tre chili in meno e le gambe di cinque anni fa. Le cene con gli amici un po’ tristi.' },
      { l: 'Troppo, per te', r: 'Ti godi la vita. Il fisico fa il suo corso.' },
    ] },
    en: { t: 'The champion’s diet', d: 'A thirty-eight-year-old team-mate who still starts tells you his diet: no sugar, no alcohol, ten hours of sleep.', o: [
      { l: 'Copy it completely', r: 'Three kilos lighter and the legs of five years ago. Dinners with friends a bit sad.' },
      { l: 'Too much for you', r: 'You enjoy life. Your body takes its course.' },
    ] },
  },
  {
    id: 'x_v_bench_leader', kind: 'decision', group: 'life', w: 4, when: { ageMin: 32, trustMax: 55 },
    o: [
      { fx: { flag: 'leader', morale: 3, mods: { minutes: -0.05 } } },
      { fx: { p: 0.4, base: { fitness: -2 }, win: { trustSet: 58 }, lose: { morale: -5 } } },
    ],
    it: { t: 'Il leader dalla panchina', d: 'Giochi meno di prima. L’allenatore ti chiede di essere la voce dello spogliatoio anche quando non entri.', o: [
      { l: 'Accetti il nuovo ruolo', r: 'Parli ai giovani prima delle partite. Quando entri, sai già cosa fare.' },
      { l: 'Vuoi ancora il posto', rw: 'Due partite da titolare giocate come a venticinque anni. Il posto torna tuo.', rl: 'I giovani vanno più veloci. Il tuo sfogo non cambia le gerarchie.' },
    ] },
    en: { t: 'Leading from the bench', d: 'You play less than before. The coach asks you to be the voice of the dressing room even when you don’t come on.', o: [
      { l: 'Accept the new role', r: 'You talk to the youngsters before games. When you come on, you already know what to do.' },
      { l: 'You still want the place', rw: 'Two starts played like a twenty-five-year-old. The place is yours again.', rl: 'The youngsters are quicker. Your outburst doesn’t change the pecking order.' },
    ] },
  },
  {
    id: 'x_v_farewell_national', kind: 'decision', group: 'national', w: 5, when: { ageMin: 32, natCalled: true },
    o: [
      { fx: { nat: { retired: true }, fitness: 6, trust: 3 } },
      { fx: { nat: { standing: 2 }, fitness: -3 } },
    ],
    it: { t: 'L’ultima convocazione?', d: 'Il ct ti chiama per sapere se vuoi esserci anche nel prossimo ciclo. Hai {caps} presenze.', o: [
      { l: 'Lasci spazio ai giovani', r: 'Un saluto sobrio. Il club ritrova un giocatore che non viaggia più per il mondo.' },
      { l: 'Ci sei finché ti vogliono', r: 'La maglia della nazionale non si rifiuta. Il calendario si fa pesante.' },
    ] },
    en: { t: 'The last call-up?', d: 'The national coach calls to ask if you want to be part of the next cycle too. You have {caps} caps.', o: [
      { l: 'Make way for the young', r: 'A low-key farewell. Your club gets back a player who no longer flies round the world.' },
      { l: 'You’re there as long as they want you', r: 'You don’t turn down the national shirt. The calendar gets heavy.' },
    ] },
  },
  {
    id: 'x_v_injury_scare', kind: 'incident', w: 3, when: { ageMin: 33 },
    fx: { fitness: -6, phys: -1, forcedInjury: { severity: 'minor', weeks: 3 } },
    it: { t: 'Il polpaccio', d: 'Il polpaccio cede in un allungo banale. Tre settimane fuori, e la sensazione che il corpo ti stia mandando un messaggio.' },
    en: { t: 'The calf', d: 'Your calf goes in a routine sprint. Three weeks out, and the feeling your body is sending you a message.' },
  },
  {
    id: 'x_v_mentor_award', kind: 'incident', w: 2, when: { ageMin: 32, flags: ['mentor'] },
    fx: { morale: 6, reputation: 3 },
    it: { t: 'Il ragazzo che hai aiutato', d: 'Il giovane a cui hai fatto da guida esordisce in nazionale e in intervista dice che deve tutto a te.' },
    en: { t: 'The kid you helped', d: 'The youngster you mentored makes his international debut and says in an interview he owes it all to you.' },
  },
  {
    id: 'x_v_press_retire_question', kind: 'decision', group: 'life', w: 4, when: { ageMin: 34, notFlags: ['lastSeason'] },
    o: [
      { fx: { morale: 3, trust: 1 } },
      { fx: { flag: 'lastSeason', morale: 5, reputation: 3 } },
    ],
    it: { t: '«Quando smetti?»', d: 'A ogni conferenza stampa la stessa domanda. Oggi te la fa anche il presidente, a cena.', o: [
      { l: 'Finché le gambe reggono', r: 'Nessuna data. Ogni partita va giocata come se fosse normale.' },
      { l: 'Annunci il ritiro a fine turno', r: 'Lo dici davanti a tutti. Da ora ogni stadio ti saluta.' },
    ] },
    en: { t: '“When are you stopping?”', d: 'At every press conference the same question. Today even the president asks at dinner.', o: [
      { l: 'While my legs hold up', r: 'No date. Every game gets played as if it were normal.' },
      { l: 'Announce your retirement', r: 'You say it in front of everyone. From now on every stadium says goodbye.' },
    ] },
  },

  /* ======================= NAZIONALE ======================= */
  {
    id: 'x_n_club_vs_country', kind: 'decision', group: 'national', w: 5, when: { natCalled: true, ageMin: 20 },
    o: [
      { fx: { nat: { standing: 4 }, fitness: -3, trust: -2 } },
      { fx: { nat: { standing: -3 }, fitness: 3, trust: 3 } },
    ],
    it: { t: 'Il club contro la nazionale', d: 'Hai un fastidio muscolare. Il club vorrebbe tenerti a riposo durante la sosta, il ct ti vuole comunque in ritiro.', o: [
      { l: 'Rispondi alla nazionale', r: 'Il ct apprezza. Torni al club un po’ acciaccato.' },
      { l: 'Resti a curarti', r: 'Il club ringrazia. In nazionale qualcuno prende il tuo posto per una sosta.' },
    ] },
    en: { t: 'Club versus country', d: 'You have a muscle niggle. Your club wants to rest you over the break, the national coach wants you in camp anyway.', o: [
      { l: 'Answer your country', r: 'The coach appreciates it. You return to your club a little battered.' },
      { l: 'Stay and recover', r: 'The club is grateful. Someone takes your national place for one break.' },
    ] },
  },
  {
    id: 'x_n_new_coach', kind: 'decision', group: 'national', w: 5, when: { natCalled: true },
    o: [
      { fx: { nat: { standing: 3 }, weakest: 1 } },
      { fx: { nat: { standing: -2 }, best: 1 } },
    ],
    it: { t: 'Il nuovo ct', d: 'Cambia il commissario tecnico di {nation}. Nel primo raduno spiega un gioco che non assomiglia a quello del tuo club.', o: [
      { l: 'Studi il suo sistema', r: 'Sei tra i primi a capirlo. Il ct ti indica ai compagni come esempio.' },
      { l: 'Porti il tuo calcio', r: 'In campo fai quello che sai. Il ct prende nota, non sempre bene.' },
    ] },
    en: { t: 'The new national coach', d: 'The {nation} coach changes. At the first camp he explains a style nothing like your club’s.', o: [
      { l: 'Study his system', r: 'You’re among the first to get it. He points you out to team-mates as an example.' },
      { l: 'Bring your own football', r: 'On the pitch you do what you know. The coach takes note, not always kindly.' },
    ] },
  },
  {
    id: 'x_n_qualifier', kind: 'decision', group: 'national', w: 5, when: { natCalled: true, natCapsMin: 3 },
    o: [
      { fx: { p: 0.55, base: { mods: { minCaps: 2 } }, win: { nat: { standing: 5 }, reputation: 4 }, lose: { nat: { standing: -2 }, morale: -4 } } },
      { fx: { nat: { standing: 1 }, mods: { minCaps: 1 } } },
    ],
    it: { t: 'La partita di qualificazione', d: 'Trasferta difficile, serve un punto per qualificarsi. Il ct ti chiede se te la senti di giocare dall’inizio.', o: [
      { l: 'Giochi dall’inizio', rw: 'Partita perfetta, qualificazione in tasca. I giornali ti mettono in copertina.', rl: 'Soffri tutta la partita. Il pareggio arriva lo stesso, ma non grazie a te.' },
      { l: 'Entri a partita in corso', r: 'Venti minuti di ordine e gestione. Il ct apprezza l’umiltà.' },
    ] },
    en: { t: 'The qualifier', d: 'A tough away game, a point needed to qualify. The coach asks if you feel up to starting.', o: [
      { l: 'Start', rw: 'A perfect game, qualification secured. The papers put you on the cover.', rl: 'You struggle all game. The draw comes anyway, but not thanks to you.' },
      { l: 'Come on as a sub', r: 'Twenty minutes of order and control. The coach appreciates the humility.' },
    ] },
  },
  {
    id: 'x_n_debut_goal', kind: 'incident', w: 3, when: { natCalled: true, natCapsMax: 0 },
    fx: { morale: 7, reputation: 4, nat: { standing: 4 }, mods: { minCaps: 1 } },
    it: { t: 'La prima volta con la nazionale', d: 'Entri all’ottantesimo in amichevole e tocchi i primi palloni con la maglia di {nation}. Sugli spalti c’è tutta la tua famiglia.' },
    en: { t: 'First time with the national team', d: 'You come on in the eightieth minute of a friendly and touch your first balls in the {nation} shirt. Your whole family is in the stands.' },
  },
  {
    id: 'x_n_captain_armband_day', kind: 'incident', w: 2, when: { natCalled: true, natCapsMin: 40 },
    fx: { morale: 5, reputation: 3, nat: { standing: 2 }, mods: { minCaps: 1 } },
    it: { t: 'La fascia per una sera', d: 'Il capitano è squalificato. Il ct ti dà la fascia per l’amichevole: {caps} presenze e l’inno cantato davanti a tutti.' },
    en: { t: 'The armband for a night', d: 'The captain is suspended. The coach gives you the armband for the friendly: {caps} caps and the anthem sung in front of everyone.' },
  },

  /* ======================= IMPREVISTI DI CLUB ======================= */
  {
    id: 'x_i_derby_goal_banned', kind: 'incident', w: 3, when: { ageMin: 18 },
    fx: { morale: -3, trust: 2 },
    it: { t: 'Il campo squalificato', d: 'Per i cori di una parte della curva, la squadra gioca due partite in casa a porte chiuse. Uno stadio vuoto fa un rumore strano.' },
    en: { t: 'The stadium closure', d: 'Because of chants from part of the stands, the team plays two home games behind closed doors. An empty stadium makes a strange noise.' },
  },
  {
    id: 'x_i_coach_praise', kind: 'incident', w: 3, when: { ageMin: 19, trustMin: 55 },
    fx: { morale: 5, trust: 4 },
    it: { t: 'La frase dell’allenatore', d: 'In conferenza stampa l’allenatore dice che sei il giocatore di cui non potrebbe fare a meno. La frase finisce in prima pagina.' },
    en: { t: 'The coach’s words', d: 'At the press conference the coach says you’re the player he couldn’t do without. The line makes the front page.' },
  },
  {
    id: 'x_i_youth_tournament_mvp', kind: 'incident', w: 2, when: { ageMax: 20 },
    fx: { reputation: 4, morale: 4 },
    it: { t: 'Miglior giovane del torneo', d: 'In un torneo estivo con squadre di mezza Europa ti premiano come miglior giovane. Il procuratore riceve tre telefonate.' },
    en: { t: 'Best young player of the tournament', d: 'At a summer tournament with teams from half of Europe you win best young player. Your agent gets three calls.' },
  },
  {
    id: 'x_i_contract_dispute', kind: 'incident', w: 2, when: { ageMin: 23, repMin: 35 },
    fx: { morale: -4, flag: 'wantsOut' },
    it: { t: 'Il rinnovo che non arriva', d: 'La società rimanda il rinnovo da mesi. Il tuo procuratore perde la pazienza e comincia a guardarsi intorno.' },
    en: { t: 'The renewal that never comes', d: 'The club has put off your renewal for months. Your agent loses patience and starts looking around.' },
  },
  {
    id: 'x_i_club_crisis', kind: 'incident', w: 2, when: { ageMin: 19, tierMin: 3 },
    fx: { morale: -3, mods: { team: -2 } },
    it: { t: 'La crisi societaria', d: 'Il presidente è indagato, gli sponsor scappano, a gennaio partono i due giocatori migliori. La squadra si indebolisce.' },
    en: { t: 'The club crisis', d: 'The president is under investigation, sponsors flee, and in January the two best players leave. The team gets weaker.' },
  },
  {
    id: 'x_i_signing_star', kind: 'incident', w: 2, when: { ageMin: 19, tierMax: 3 },
    fx: { morale: 3, mods: { team: 2 } },
    it: { t: 'Il colpo di mercato', d: 'La società compra un campione a fine carriera. Porta esperienza, gol e una fila di giornalisti agli allenamenti.' },
    en: { t: 'The marquee signing', d: 'The club signs a star at the end of his career. He brings experience, goals and a queue of journalists to training.' },
  },
  {
    id: 'x_i_team_bonding', kind: 'incident', w: 3, when: { ageMin: 18 },
    fx: { morale: 4, trust: 2 },
    it: { t: 'La cena di squadra', d: 'Una cena organizzata dai senatori, telefoni in un cestino all’ingresso. Da quella sera lo spogliatoio è un’altra cosa.' },
    en: { t: 'The team dinner', d: 'A dinner organised by the senior players, phones in a basket at the door. From that evening the dressing room is different.' },
  },
  {
    id: 'x_i_wrong_boots', kind: 'incident', w: 2, when: { ageMin: 18 },
    fx: { morale: -2, fitness: -2 },
    it: { t: 'Il campo ghiacciato', d: 'Trasferta al nord, campo gelato, tacchetti sbagliati. Scivoli per novanta minuti e il giorno dopo ti fa male tutto.' },
    en: { t: 'The frozen pitch', d: 'An away game up north, frozen pitch, wrong studs. You slip for ninety minutes and ache everywhere the next day.' },
  },
  {
    id: 'x_i_national_rumour', kind: 'incident', w: 2, when: { natArc: true, natCalled: false, ageMin: 19 },
    fx: { morale: 3, reputation: 2 },
    it: { t: 'Gli osservatori della nazionale', d: 'Il vice del ct è in tribuna per vederti. Non ti chiama nessuno, ma i giornali ne parlano per una settimana.' },
    en: { t: 'National team scouts', d: 'The national assistant coach is in the stands to watch you. Nobody calls, but the papers talk about it for a week.' },
  },
  {
    id: 'x_i_goal_of_month', kind: 'incident', w: 2, when: { ageMin: 18, notRoles: ['POR'] },
    fx: { reputation: 3, morale: 4, mods: { minGoals: 1, minApps: 1 } },
    it: { t: 'Il gol del mese', d: 'Un tiro al volo da posizione impossibile. La lega lo sceglie come gol del mese e lo mostrano in tutte le trasmissioni.' },
    en: { t: 'Goal of the month', d: 'A volley from an impossible angle. The league picks it as goal of the month and every show airs it.' },
  },
  {
    id: 'x_i_clean_sheet_run', kind: 'incident', w: 3, when: { roles: ['POR', 'DC'], ageMin: 19 },
    fx: { reputation: 3, morale: 4, mods: { minApps: 6, minClean: 5 } },
    it: { t: 'Cinque partite senza subire', d: 'Cinque partite di fila con la porta inviolata. I giornali parlano di muro e mettono la vostra difesa in copertina.' },
    en: { t: 'Five games without conceding', d: 'Five clean sheets in a row. The papers talk about a wall and put your defence on the cover.' },
  },
];
