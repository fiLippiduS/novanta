/* Nazionale (solo nelle carriere con la storia della nazionale) e imprevisti
   generali, validi per tutti i ruoli. */

export default [
  /* ======================= NAZIONALE ======================= */
  {
    id: 'n_callup', kind: 'decision', group: 'national', forced: true, w: 10, when: { natArc: true, eligible: true },
    o: [
      { fx: { nat: { called: true, standing: 3 }, morale: 8, reputation: 5 } },
      { fx: { nat: { called: true, standing: 1 }, morale: 5, reputation: 3, trust: 2 } },
    ],
    it: { t: 'La prima convocazione', d: 'Il telefono squilla alle otto del mattino: il commissario tecnico della nazionale ({nation}) ti ha inserito nella lista.', o: [
      { l: 'Rispondi con entusiasmo in pubblico', r: 'Il post con la maglia della nazionale diventa il più visto della tua vita.' },
      { l: 'Ringrazi a bassa voce e lavori', r: 'Arrivi in ritiro in silenzio. I senatori apprezzano.' },
    ] },
    en: { t: 'The first call-up', d: 'The phone rings at eight in the morning: the {nation} head coach has put you in the squad.', o: [
      { l: 'Celebrate publicly', r: 'The post in the national shirt becomes the most viewed of your life.' },
      { l: 'Thank him quietly and work', r: 'You arrive at the camp in silence. The senior players appreciate it.' },
    ] },
  },
  {
    id: 'n_debut', kind: 'decision', group: 'national', w: 6, when: { natCalled: true, natCapsMax: 14 },
    o: [
      { fx: { p: 0.5, base: { mods: { minCaps: 1 } }, win: { nat: { standing: 4 }, reputation: 3 }, lose: { nat: { standing: -2 }, morale: -3 } } },
      { fx: { nat: { standing: 1 }, mods: { minCaps: 1 } } },
    ],
    it: { t: 'La prima da titolare in nazionale', d: 'Stadio pieno, inno, e stavolta parti dall’inizio. L’allenatore ti dice: «Gioca come nel tuo club».', o: [
      { l: 'Osi, come sai fare', rw: 'La tua giocata migliore apre il gol. Il commissario tecnico ti abbraccia al cambio.', rl: 'Due palloni persi nei primi dieci minuti. Esci all’intervallo.' },
      { l: 'Giochi semplice', r: 'Nessun errore, nessuna copertina. La porta resta aperta.' },
    ] },
    en: { t: 'First international start', d: 'Packed stadium, anthem, and this time you start. The coach says: “Play like you do for your club.”', o: [
      { l: 'Be bold, as you are', rw: 'Your best move sets up the goal. The coach hugs you when you come off.', rl: 'Two balls lost in the first ten minutes. You’re off at half-time.' },
      { l: 'Keep it simple', r: 'No mistakes, no headlines. The door stays open.' },
    ] },
  },
  {
    id: 'n_system', kind: 'decision', group: 'national', w: 5, when: { natCalled: true },
    o: [
      { fx: { nat: { standing: 4 }, mods: { form: -0.01 } } },
      { fx: { nat: { standing: -6 }, morale: 2 } },
    ],
    it: { t: 'Fuori ruolo in nazionale', d: 'Il commissario tecnico ti schiera in una posizione che nel club non hai mai fatto.', o: [
      { l: 'Ti adatti', r: 'Non brilli, ma il ct capisce che può contare su di te.' },
      { l: 'Lo fai notare', r: 'Lo dici ai giornalisti. Alla convocazione successiva il tuo nome manca.' },
    ] },
    en: { t: 'Out of position for your country', d: 'The national coach plays you in a position you’ve never played for your club.', o: [
      { l: 'Adapt', r: 'You don’t shine, but the coach knows he can count on you.' },
      { l: 'Point it out', r: 'You tell journalists. At the next call-up your name is missing.' },
    ] },
  },
  {
    id: 'n_captain', kind: 'decision', group: 'national', w: 5, when: { natCalled: true, ageMin: 26, repMin: 60, natCapsMin: 25, natCaptain: false },
    o: [
      { fx: { nat: { captain: true, standing: 5 }, reputation: 5, morale: 5 } },
      { fx: { nat: { standing: 2 }, morale: 1 } },
    ],
    it: { t: 'Capitano della nazionale · {nation}', d: 'Il capitano storico lascia la nazionale. Il ct vuole darti la fascia.', o: [
      { l: 'Accetti', r: 'Canti l’inno davanti a tutti, con la fascia al braccio. Un altro peso, un altro onore.' },
      { l: 'Proponi un compagno', r: 'Il ct apprezza l’umiltà e ti nomina vice.' },
    ] },
    en: { t: '{nation} captain', d: 'The long-time captain retires from international football. The coach wants to give you the armband.', o: [
      { l: 'Accept', r: 'You sing the anthem in front of everyone, armband on. Another weight, another honour.' },
      { l: 'Suggest a team-mate', r: 'The coach values your humility and makes you vice-captain.' },
    ] },
  },
  {
    id: 'n_prep', kind: 'decision', group: 'national', w: 6, when: { natCalled: true, tournamentYear: true },
    o: [
      { fx: { fitness: -3, nat: { standing: 3 } } },
      { fx: { fitness: 5 } },
    ],
    it: { t: 'L’estate del grande torneo', d: 'A fine stagione c’è il grande torneo con la nazionale. Il club vorrebbe gestirti.', o: [
      { l: 'Ti alleni anche nei giorni liberi', r: 'Arrivi al ritiro in forma perfetta, un po’ stanco.' },
      { l: 'Ti fai gestire dal club', r: 'Qualche partita saltata, gambe fresche per l’estate.' },
    ] },
    en: { t: 'The summer of the big tournament', d: 'After the season comes the big tournament with the national team. Your club would like to manage your load.', o: [
      { l: 'Train on days off too', r: 'You arrive at the camp in perfect shape, a little tired.' },
      { l: 'Let the club manage you', r: 'A few games missed, fresh legs for the summer.' },
    ] },
  },
  {
    id: 'n_friendlies', kind: 'decision', group: 'national', w: 4, when: { natCalled: true, ageMin: 22 },
    o: [
      { fx: { trust: 5, nat: { standing: -4 } } },
      { fx: { nat: { standing: 3 }, fitness: -3 } },
    ],
    it: { t: 'Le amichevoli', d: 'Il club ti chiede di saltare le amichevoli di marzo per riposare.', o: [
      { l: 'Le salti', r: 'Il club ringrazia. Il ct un po’ meno.' },
      { l: 'Rispondi presente', r: 'Due voli intercontinentali in una settimana. Il ct lo annota.' },
    ] },
    en: { t: 'The friendlies', d: 'Your club asks you to skip the March friendlies to rest.', o: [
      { l: 'Skip them', r: 'The club is grateful. The national coach less so.' },
      { l: 'Report for duty', r: 'Two intercontinental flights in a week. The coach notices.' },
    ] },
  },
  {
    id: 'n_provocation', kind: 'decision', group: 'national', w: 3, when: { natCalled: true, repMin: 40 },
    o: [
      { fx: { p: 0.5, base: { reputation: 3, nat: { standing: 1 } }, win: {}, lose: { morale: -3 } } },
      { fx: { nat: { standing: 2 } } },
    ],
    it: { t: 'La provocazione', d: 'La stella della nazionale avversaria dice che la vostra squadra «non fa paura a nessuno».', o: [
      { l: 'Rispondi', rw: 'Vincete e la tua risposta diventa uno slogan.', rl: 'Perdete, e la tua frase ti torna indietro per settimane.' },
      { l: 'Ignori', r: 'Parlerà il campo. Il ct apprezza la calma.' },
    ] },
    en: { t: 'The provocation', d: 'The opposing national team’s star says your side “scares nobody”.', o: [
      { l: 'Respond', rw: 'You win and your reply becomes a slogan.', rl: 'You lose, and your words come back to haunt you for weeks.' },
      { l: 'Ignore it', r: 'The pitch will talk. The coach likes your calm.' },
    ] },
  },
  {
    id: 'n_anthem', kind: 'incident', w: 3, when: { natCalled: true },
    fx: { reputation: 3, morale: 4, mods: { minCaps: 1 } },
    it: { t: 'L’inno', d: 'Le telecamere ti inquadrano mentre canti l’inno a occhi chiusi. L’immagine diventa la copertina della partita.' },
    en: { t: 'The anthem', d: 'The cameras catch you singing the anthem with your eyes closed. The image becomes the cover of the game.' },
  },
  {
    id: 'n_dropped', kind: 'incident', w: 3, when: { natCalled: true, natCaptain: false },
    fx: { morale: -8, nat: { standing: -2 } },
    it: { t: 'Escluso dalla lista', d: 'Leggi la lista dei convocati alla televisione. Il tuo nome non c’è, e nessuno ti ha chiamato.' },
    en: { t: 'Left out of the squad', d: 'You read the squad list on TV. Your name isn’t there, and nobody called you.' },
  },
  {
    id: 'n_retire', kind: 'decision', group: 'national', w: 5, when: { natCalled: true, ageMin: 31 },
    o: [
      { fx: { nat: { retired: true }, fitness: 6, trust: 3 } },
      { fx: { nat: { standing: 2 }, fitness: -3 } },
    ],
    it: { t: 'Lasciare la nazionale', d: 'Hai {caps} presenze in nazionale ({nation}). Il fisico chiede di scegliere.', o: [
      { l: 'Annunci l’addio', r: 'Una lettera ai tifosi e un’ultima partita. Il club ritrova un giocatore fresco.' },
      { l: 'Continui', r: 'Finché il ct ti chiama, rispondi.' },
    ] },
    en: { t: 'Retiring from international football', d: 'You have {caps} caps for {nation}. Your body is asking you to choose.', o: [
      { l: 'Announce your farewell', r: 'A letter to the fans and one last game. Your club gets a fresher player back.' },
      { l: 'Carry on', r: 'While the coach calls, you answer.' },
    ] },
  },
  {
    id: 'n_shootout', kind: 'decision', group: 'national', w: 5, when: { natCalled: true, tournamentYear: true, notRoles: ['POR'] },
    o: [
      { fx: { p: 0.72, base: { mods: { natPlayed: true, minCaps: 3 } }, win: { nat: { standing: 5 }, reputation: 5, morale: 4 }, lose: { morale: -10, reputation: -3 } } },
      { fx: { nat: { standing: -1 }, mods: { natPlayed: true, minCaps: 3 } } },
    ],
    it: { t: 'Rigori al torneo', d: 'Nella fase finale del torneo si va ai rigori. Il ct chiede chi se la sente.', o: [
      { l: 'Alzi la mano', rw: 'Segni il tuo. Il paese intero conosce il tuo nome.', rl: 'Lo sbagli. La foto della tua testa tra le mani finisce su tutte le prime pagine.' },
      { l: 'Lasci ad altri', r: 'Guardi dal cerchio di centrocampo, abbracciato ai compagni.' },
    ] },
    en: { t: 'Penalties at the tournament', d: 'In the knockout stage it goes to penalties. The coach asks who wants to take one.', o: [
      { l: 'Raise your hand', rw: 'You score yours. The whole country knows your name.', rl: 'You miss. The photo of your head in your hands is on every front page.' },
      { l: 'Leave it to others', r: 'You watch from the centre circle, arm in arm with team-mates.' },
    ] },
  },
  {
    id: 'n_gk_shootout', kind: 'decision', group: 'national', w: 5, when: { natCalled: true, tournamentYear: true, roles: ['POR'] },
    o: [
      { fx: { attrs: { composure: 2 }, nat: { standing: 3 }, mods: { natPlayed: true, minCaps: 3 } } },
      { fx: { p: 0.45, base: { mods: { natPlayed: true, minCaps: 3 } }, win: { reputation: 6, nat: { standing: 5 } }, lose: { morale: -4 } } },
    ],
    it: { t: 'I rigori del torneo', d: 'Supplementari finiti. Sei tu davanti a cinque rigoristi della nazionale avversaria.', o: [
      { l: 'Studi i loro precedenti', r: 'Ne leggi due. Il resto tocca al destino, ma ti sei preparato.' },
      { l: 'Balli sulla linea', rw: 'Due errori avversari. Le tue smorfie diventano leggenda.', rl: 'Non ne sbagliano uno. La danza sembra solo ridicola.' },
    ] },
    en: { t: 'Tournament penalties', d: 'Extra time is over. It’s you against five of the opposing nation’s takers.', o: [
      { l: 'Study their history', r: 'You read two of them. The rest is fate, but you prepared.' },
      { l: 'Dance on the line', rw: 'Two misses. Your faces become legend.', rl: 'They score them all. The dancing just looks silly.' },
    ] },
  },
  {
    id: 'n_new_gen', kind: 'decision', group: 'national', w: 4, when: { natCalled: true, ageMin: 30 },
    o: [
      { fx: { nat: { standing: 2 }, morale: 2 } },
      { fx: { p: 0.5, base: { fitness: -3 }, win: { nat: { standing: 4 } }, lose: { nat: { standing: -4 } } } },
    ],
    it: { t: 'La nuova generazione', d: 'Tre ventenni spingono per il tuo posto in nazionale.', o: [
      { l: 'Li guidi', r: 'Diventi il senatore del gruppo. Il ct ti vuole per l’esperienza.' },
      { l: 'Te la giochi', rw: 'Ti riprendi il posto a suon di prestazioni.', rl: 'I ragazzi vanno più forte. Il ct ne prende atto.' },
    ] },
    en: { t: 'The new generation', d: 'Three twenty-year-olds are pushing for your place in the national team.', o: [
      { l: 'Lead them', r: 'You become the group’s senior figure. The coach wants you for your experience.' },
      { l: 'Fight for it', rw: 'You win your place back with performances.', rl: 'The kids are quicker. The coach takes note.' },
    ] },
  },
  {
    id: 'n_blame', kind: 'incident', w: 3, when: { natCalled: true },
    fx: { morale: -6, nat: { standing: -2 }, mods: { minCaps: 1 } },
    it: { t: 'Il capro espiatorio', d: 'Una sconfitta pesante e i tifosi se la prendono con te. Il ct ti difende, a metà.' },
    en: { t: 'The scapegoat', d: 'A heavy defeat and the fans blame you. The coach defends you, half-heartedly.' },
  },
  {
    id: 'n_milestone', kind: 'incident', w: 4, when: { natCalled: true, natCapsMin: 50 },
    fx: { reputation: 4, morale: 5 },
    it: { t: 'Cinquanta presenze e oltre', d: 'La federazione ti consegna una maglia celebrativa prima della partita. Lo stadio applaude.' },
    en: { t: 'Fifty caps and counting', d: 'The federation presents you with a commemorative shirt before the game. The stadium applauds.' },
  },

  /* ======================= IMPREVISTI GENERALI ======================= */
  {
    id: 'i_car', kind: 'incident', w: 2, when: { ageMin: 18 },
    fx: { fitness: -5, morale: -3 },
    it: { t: 'Il tamponamento', d: 'Un’auto ti tampona in tangenziale. Colpo di frusta e dieci giorni di collare.' },
    en: { t: 'The rear-end crash', d: 'A car hits you from behind on the ring road. Whiplash and ten days in a neck brace.' },
  },
  {
    id: 'i_flu', kind: 'incident', w: 3, when: {},
    fx: { fitness: -4, mods: { form: -0.02 } },
    it: { t: 'L’influenza di dicembre', d: 'Febbre a trentanove per una settimana. Metà squadra la prende dopo di te.' },
    en: { t: 'December flu', d: 'A thirty-nine-degree fever for a week. Half the squad catches it after you.' },
  },
  {
    id: 'i_sacked', kind: 'incident', w: 4, when: { seasonMin: 1 },
    fx: { trustSet: 45, morale: -1 },
    it: { t: 'Cambio in panchina', d: 'L’allenatore viene esonerato. Con il nuovo si riparte da zero, per tutti.' },
    en: { t: 'Change of manager', d: 'The coach is sacked. With the new one, everyone starts from zero.' },
  },
  {
    id: 'i_takeover', kind: 'incident', w: 3, when: { tierMin: 3 },
    fx: { mods: { team: 1.5 }, morale: 3 },
    it: { t: 'Il nuovo proprietario', d: 'Un fondo straniero compra il club e porta tre rinforzi a gennaio. La squadra è più forte.' },
    en: { t: 'The new owner', d: 'A foreign fund buys the club and brings in three signings in January. The team is stronger.' },
  },
  {
    id: 'i_wages', kind: 'incident', w: 3, when: { tierMin: 3 },
    fx: { morale: -6, flag: 'wantsOut' },
    it: { t: 'Stipendi in ritardo', d: 'Da tre mesi il club non paga. Il procuratore dice che a fine stagione conviene guardarsi intorno.' },
    en: { t: 'Late wages', d: 'The club hasn’t paid for three months. Your agent says it’s time to look around at the end of the season.' },
  },
  {
    id: 'i_potm', kind: 'incident', w: 3, when: { repMin: 25, ageMin: 19 },
    fx: { reputation: 3, morale: 4, mods: { minApps: 4 } },
    it: { t: 'Giocatore del mese', d: 'La lega ti premia come miglior giocatore del mese. Il trofeo finisce sulla mensola di tua madre.' },
    en: { t: 'Player of the month', d: 'The league names you player of the month. The trophy ends up on your mother’s shelf.' },
  },
  {
    id: 'i_bad_company', kind: 'incident', w: 2, when: { ageMax: 24 },
    fx: { fitness: -3, trust: -2 },
    it: { t: 'Cattive compagnie', d: 'Un compagno ti trascina in serate che finiscono troppo tardi. Te ne accorgi quando le gambe non girano.' },
    en: { t: 'Bad company', d: 'A team-mate drags you into nights that end too late. You notice when your legs don’t turn.' },
  },
  {
    id: 'i_family', kind: 'incident', w: 2, when: { ageMin: 20 },
    fx: { morale: -6, trust: 2 },
    it: { t: 'Una brutta notizia da casa', d: 'Un familiare sta male. Il club ti lascia partire senza fare domande, e questo non lo dimenticherai.' },
    en: { t: 'Bad news from home', d: 'A family member is ill. The club lets you go without asking questions, and you won’t forget it.' },
  },
  {
    id: 'i_var', kind: 'incident', w: 2, when: { notRoles: ['POR'] },
    fx: { morale: -3, reputation: 1, mods: { minApps: 1 } },
    it: { t: 'La moviola', d: 'Un tuo gol annullato al VAR per un centimetro. Se ne parla per giorni.' },
    en: { t: 'The VAR call', d: 'A goal of yours is ruled out by VAR by a centimetre. It’s debated for days.' },
  },
  {
    id: 'i_heat', kind: 'incident', w: 2, when: {},
    fx: { fitness: -3 },
    it: { t: 'Il ritiro sotto il sole', d: 'Il ritiro estivo è in una località a quaranta gradi. Due settimane di fatica senza pallone.' },
    en: { t: 'Pre-season in the heat', d: 'Pre-season camp is somewhere forty degrees hot. Two weeks of toil without a ball.' },
  },
  {
    id: 'i_kit', kind: 'incident', w: 2, when: { repMin: 30 },
    fx: { reputation: 2, morale: 2 },
    it: { t: 'La nuova maglia', d: 'Il club ti sceglie per presentare la nuova maglia. Il tuo nome è il più venduto.' },
    en: { t: 'The new shirt', d: 'The club picks you to launch the new shirt. Your name is the best-seller.' },
  },
  {
    id: 'i_meme', kind: 'incident', w: 2, when: { repMin: 20 },
    fx: { reputation: 2 },
    it: { t: 'Il meme', d: 'Una tua espressione dopo un gol sbagliato diventa un meme mondiale. Ridi anche tu.' },
    en: { t: 'The meme', d: 'Your face after a miss becomes a worldwide meme. You laugh too.' },
  },
  {
    id: 'i_dog', kind: 'incident', w: 2, when: { ageMin: 20 },
    fx: { morale: 4 },
    it: { t: 'Un cane', d: 'Adotti un cane. Le passeggiate prima di dormire ti svuotano la testa meglio di qualsiasi seduta.' },
    en: { t: 'A dog', d: 'You adopt a dog. Walks before bed clear your head better than any session.' },
  },
  {
    id: 'i_travel', kind: 'incident', w: 2, when: { cont: true },
    fx: { fitness: -2, morale: -2, mods: { minApps: 1 } },
    it: { t: 'La trasferta infinita', d: 'Volo cancellato, dodici ore in aeroporto prima della partita di coppa. Si gioca lo stesso.' },
    en: { t: 'The endless away trip', d: 'Flight cancelled, twelve hours at the airport before the cup game. You play anyway.' },
  },
  {
    id: 'i_teammate_hurt', kind: 'incident', w: 2, when: {},
    fx: { morale: -4, trust: -2 },
    it: { t: 'Il contrasto sbagliato', d: 'In allenamento, un tuo intervento fa male a un compagno. Starà fuori un mese. Lui ti perdona, tu meno.' },
    en: { t: 'The wrong tackle', d: 'In training one of your tackles injures a team-mate. He’s out for a month. He forgives you, you less so.' },
  },
  {
    id: 'i_new_stadium', kind: 'incident', w: 2, when: { tierMax: 3 },
    fx: { morale: 3 },
    it: { t: 'Lo stadio nuovo', d: 'Si inaugura il nuovo stadio. La prima partita nella nuova casa ha un sapore diverso.' },
    en: { t: 'The new stadium', d: 'The new stadium opens. The first game in the new home tastes different.' },
  },
];
