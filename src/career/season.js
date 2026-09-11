/* CARRIERA — una stagione.
   Quanto giochi dipende da quanto vali rispetto alla squadra che ti ha preso;
   quanto segni dipende dal ruolo, dallo stile e da quanto gioca la squadra. */

import { overall, STYLE_TRAITS, grow, clampAttrs } from './model.js';

export const MATCHES = 38;

/* Il livello che una squadra pretende da un titolare, fascia per fascia.
   È questo confronto a decidere se giochi o stai fuori. */
export function clubDemand(tier) {
  return 80 - (tier - 1) * 7;      // 80 · 73 · 66 · 59 · 52
}

export function teamPower(tier) {
  return 88 - (tier - 1) * 9;      // 88 · 79 · 70 · 61 · 52
}

/** quanta parte della stagione giochi: 0 = mai, 1 = sempre */
export function minutesShare(player, club) {
  const gap = overall(player) - clubDemand(club.tier);
  const young = player.age <= 18 ? -6 : player.age <= 20 ? -3 : 0;
  const raw = (gap + young + 11) / 22;
  /* Una squadra di provincia un ragazzino lo fa esordire comunque: qualche
     spezzone c'è sempre, ed è giusto che la prima stagione lasci un ricordo
     invece di una riga di zeri. */
  const floor = club.tier >= 4 ? 0.08 : 0;
  return Math.max(floor, Math.min(1, raw));
}

/* posizione in classifica: la forza della squadra più il tuo contributo,
   con lo spazio che il caso deve sempre avere nel calcio */
/**
 * La posizione è dentro il campionato della squadra, non in una classifica
 * mondiale: una squadra di provincia gioca in una divisione dove può stare
 * a metà, e in una piccola un solo giocatore forte pesa molto di più.
 */
export function leaguePosition(rand, player, club, share) {
  const expected = [2, 5, 9, 12, 10][club.tier - 1];
  const weight = 1 + (club.tier - 1) * 0.15;
  const mine = ((overall(player) - 60) / 9) * share * weight;
  const luck = (rand() + rand() + rand() - 1.5) * 5.2;
  return Math.max(1, Math.min(20, Math.round(expected - mine + luck)));
}

function poisson(rand, mean) {
  if (mean <= 0) return 0;
  const L = Math.exp(-mean);
  let k = 0, p = 1;
  do { k += 1; p *= rand(); } while (p > L && k < 90);
  return k - 1;
}

/**
 * Gioca una stagione intera.
 * club: { id, name, tier, colors, country, confed, inCont }
 */
export function playSeason(rand, player, club, opts = {}) {
  const trait = STYLE_TRAITS[player.style];
  const ovr = overall(player);
  const share = minutesShare(player, club);

  /* Infortuni: più si è fragili, vecchi e spremuti, più capitano.
     Si perdono partite, e le partite perse costano crescita. */
  const risk = 0.10 + (100 - player.fitness) / 260 + Math.max(0, player.age - 29) * 0.022
    + (opts.injuryRisk || 0);
  let weeksOut = 0;
  if (rand() < risk) weeksOut = 3 + Math.floor(rand() * (player.age > 30 ? 22 : 14));

  const available = Math.max(0, 1 - weeksOut / 40);
  const apps = Math.round(MATCHES * share * available);

  const pos = leaguePosition(rand, player, club, share);
  const power = teamPower(club.tier) + (20 - pos) * 0.5;

  // quanto segna la squadra nel suo insieme, per novanta minuti
  const teamGoals = 0.85 + (power - 52) * 0.030;
  const teamConceded = Math.max(0.45, 1.85 - (power - 52) * 0.026);

  const form = 0.72 + (player.morale / 100) * 0.34 + (ovr - 60) / 130;

  /* Coefficienti tarati su carriere vere: un rapace di primo livello chiude
     sopra i venti gol in una grande stagione, non sopra i trenta ogni anno. */
  const goals = poisson(rand, apps * teamGoals * trait.goal * 0.175 * form);
  const assists = poisson(rand, apps * teamGoals * trait.assist * 0.145 * form);

  const cleanPer = Math.exp(-teamConceded) * trait.clean * (0.85 + (ovr - 55) / 200);
  const clean = ['POR', 'DC', 'TZ'].includes(player.role)
    ? poisson(rand, apps * Math.min(0.62, cleanPer))
    : 0;

  /* Il voto: parte da una sufficienza e sale con quello che hai prodotto
     e con quanto vali. Non scende mai sotto il quattro e mezzo. */
  const per90 = apps > 0 ? (goals + assists * 0.7 + clean * 0.5) / apps : 0;
  const rating = Math.max(4.5, Math.min(9.4,
    5.55 + per90 * 1.7 + (ovr - 62) / 26 + (rand() - 0.5) * 0.34));

  /* Trofei. La posizione decide il campionato, il resto è coppa:
     una piccola può sempre alzare qualcosa, ed è il bello della carriera. */
  /* Vincere la propria divisione con una squadra di provincia è una
     promozione, non uno scudetto: sono due cose diverse e vanno contate
     diversamente, altrimenti dieci anni in fondo alla piramide valgono
     quanto dieci anni in una grande. */
  const trophies = [];
  const strong = Math.max(0.03, (power - 45) / 52);
  const top = club.tier <= 3;

  if (top && pos === 1) trophies.push('campionato');
  if (!top && pos <= 2) trophies.push('promozione');
  if (rand() < (top ? 0.03 + strong * 0.11 : 0.02)) trophies.push('coppa');
  if (top && pos === 1 && rand() < 0.30) trophies.push('supercoppa');
  if (top && club.inCont && rand() < 0.02 + strong * 0.09) trophies.push('continentale');

  /* La nazionale: ci si arriva per fama, e il torneo c'è un anno su due.
     Vincerlo è raro come nella realtà. */
  if (player.reputation >= 55 && (player.seasons.length % 2 === 1)
      && rand() < 0.035 + (player.reputation - 55) / 900) {
    trophies.push('nazionale');
  }

  const qualified = club.tier <= 3 && pos <= 4;

  const quality = Math.min(1, (rating - 5.2) / 2.6 + per90 * 0.5);
  grow(rand, player, { focus: opts.focus || trait.grow, minutesShare: share, quality });

  // fama: si costruisce con le stagioni giocate bene e con i trofei
  player.reputation += apps * 0.10 * (1 + per90 * 2)
    + trophies.length * 3.5 + (rating - 6.2) * 2.2;
  player.morale += (rating - 6.3) * 7 + trophies.length * 6 - weeksOut * 0.5;
  player.fitness += (weeksOut > 0 ? -6 : 2) - Math.max(0, player.age - 30) * 1.3;
  clampAttrs(player);

  const record = {
    season: player.seasons.length + 1,
    age: player.age,
    club: { id: club.id, name: club.name, tier: club.tier, colors: club.colors, country: club.country },
    apps, goals, assists, clean, rating: Math.round(rating * 100) / 100,
    position: pos, trophies, weeksOut,
    overall: ovr,
  };

  player.seasons.push(record);
  const T = player.totals;
  T.apps += apps; T.goals += goals; T.assists += assists; T.clean += clean;
  T.trophies.push(...trophies);
  T.rating = Math.round(
    (player.seasons.reduce((n, s) => n + s.rating * Math.max(1, s.apps), 0)
      / Math.max(1, player.seasons.reduce((n, s) => n + Math.max(1, s.apps), 0))) * 100) / 100;

  player.age += 1;
  return { record, qualified, share };
}
