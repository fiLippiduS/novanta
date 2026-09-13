/* Nomi di ruoli e competizioni nelle lingue del gioco.
   Le competizioni con un nome proprio (Serie A, Premier League, Bundesliga)
   restano come sono in tutte le lingue: si traducono solo quelle generiche. */

import { lang } from '../core/i18n.js';

const POSITIONS = {
  goalkeeper:            { it: 'Portiere', en: 'Goalkeeper', fr: 'Gardien de but', es: 'Portero', de: 'Torwart', pt: 'Goleiro' },
  defender:              { it: 'Difensore', en: 'Defender', fr: 'Défenseur', es: 'Defensa', de: 'Verteidiger', pt: 'Defensor' },
  'centre-back':         { it: 'Difensore centrale', en: 'Centre-back', fr: 'Défenseur central', es: 'Defensa central', de: 'Innenverteidiger', pt: 'Zagueiro' },
  'center-back':         { it: 'Difensore centrale', en: 'Centre-back', fr: 'Défenseur central', es: 'Defensa central', de: 'Innenverteidiger', pt: 'Zagueiro' },
  'full-back':           { it: 'Terzino', en: 'Full-back', fr: 'Arrière latéral', es: 'Lateral', de: 'Außenverteidiger', pt: 'Lateral' },
  'right-back':          { it: 'Terzino destro', en: 'Right-back', fr: 'Arrière droit', es: 'Lateral derecho', de: 'Rechter Verteidiger', pt: 'Lateral direito' },
  'left-back':           { it: 'Terzino sinistro', en: 'Left-back', fr: 'Arrière gauche', es: 'Lateral izquierdo', de: 'Linker Verteidiger', pt: 'Lateral esquerdo' },
  'wing-back':           { it: 'Esterno', en: 'Wing-back', fr: 'Piston', es: 'Carrilero', de: 'Flügelverteidiger', pt: 'Ala' },
  sweeper:               { it: 'Libero', en: 'Sweeper', fr: 'Libéro', es: 'Líbero', de: 'Libero', pt: 'Líbero' },
  midfielder:            { it: 'Centrocampista', en: 'Midfielder', fr: 'Milieu de terrain', es: 'Centrocampista', de: 'Mittelfeldspieler', pt: 'Meio-campista' },
  'defensive midfielder':{ it: 'Mediano', en: 'Defensive midfielder', fr: 'Milieu défensif', es: 'Mediocentro defensivo', de: 'Defensiver Mittelfeldspieler', pt: 'Volante' },
  'central midfielder':  { it: 'Centrocampista centrale', en: 'Central midfielder', fr: 'Milieu central', es: 'Mediocentro', de: 'Zentraler Mittelfeldspieler', pt: 'Meio-campista central' },
  'attacking midfielder':{ it: 'Trequartista', en: 'Attacking midfielder', fr: 'Milieu offensif', es: 'Mediapunta', de: 'Offensiver Mittelfeldspieler', pt: 'Meia-atacante' },
  'wide midfielder':     { it: 'Esterno di centrocampo', en: 'Wide midfielder', fr: 'Milieu excentré', es: 'Interior', de: 'Außenbahnspieler', pt: 'Meia aberto' },
  winger:                { it: 'Ala', en: 'Winger', fr: 'Ailier', es: 'Extremo', de: 'Flügelspieler', pt: 'Ponta' },
  'left winger':         { it: 'Ala sinistra', en: 'Left winger', fr: 'Ailier gauche', es: 'Extremo izquierdo', de: 'Linksaußen', pt: 'Ponta esquerda' },
  'right winger':        { it: 'Ala destra', en: 'Right winger', fr: 'Ailier droit', es: 'Extremo derecho', de: 'Rechtsaußen', pt: 'Ponta direita' },
  forward:               { it: 'Attaccante', en: 'Forward', fr: 'Attaquant', es: 'Delantero', de: 'Stürmer', pt: 'Atacante' },
  striker:               { it: 'Attaccante', en: 'Striker', fr: 'Avant-centre', es: 'Delantero centro', de: 'Mittelstürmer', pt: 'Centroavante' },
  'centre-forward':      { it: 'Centravanti', en: 'Centre-forward', fr: 'Avant-centre', es: 'Delantero centro', de: 'Mittelstürmer', pt: 'Centroavante' },
  'second striker':      { it: 'Seconda punta', en: 'Second striker', fr: 'Second attaquant', es: 'Segundo delantero', de: 'Hängende Spitze', pt: 'Segundo atacante' },
  'inside forward':      { it: 'Mezzala', en: 'Inside forward', fr: 'Inter', es: 'Interior', de: 'Halbstürmer', pt: 'Meia-atacante' },
  'wing half':           { it: 'Mediano laterale', en: 'Wing half', fr: 'Demi', es: 'Medio ala', de: 'Außenläufer', pt: 'Médio-ala' },
  'half-back':           { it: 'Mediano', en: 'Half-back', fr: 'Demi', es: 'Medio', de: 'Läufer', pt: 'Médio' },
};

const ROLES = {
  POR: { it: 'Portiere', en: 'Goalkeeper', fr: 'Gardien', es: 'Portero', de: 'Torwart', pt: 'Goleiro' },
  DIF: { it: 'Difensore', en: 'Defender', fr: 'Défenseur', es: 'Defensa', de: 'Verteidiger', pt: 'Defensor' },
  CEN: { it: 'Centrocampista', en: 'Midfielder', fr: 'Milieu', es: 'Centrocampista', de: 'Mittelfeld', pt: 'Meio-campista' },
  ATT: { it: 'Attaccante', en: 'Forward', fr: 'Attaquant', es: 'Delantero', de: 'Stürmer', pt: 'Atacante' },
};

const ROLE_SHORT = {
  POR: { it: 'POR', en: 'GK', fr: 'GB', es: 'POR', de: 'TW', pt: 'GOL' },
  DIF: { it: 'DIF', en: 'DEF', fr: 'DÉF', es: 'DEF', de: 'ABW', pt: 'DEF' },
  CEN: { it: 'CEN', en: 'MID', fr: 'MIL', es: 'MED', de: 'MIT', pt: 'MEI' },
  ATT: { it: 'ATT', en: 'FWD', fr: 'ATT', es: 'DEL', de: 'STU', pt: 'ATA' },
};

const COMPS = {
  'FIFA World Cup': { it: 'Mondiali', en: 'FIFA World Cup', fr: 'Coupe du monde', es: 'Copa Mundial', de: 'Weltmeisterschaft', pt: 'Copa do Mundo' },
  'UEFA European Championship': { it: 'Europei', en: 'European Championship', fr: "Championnat d'Europe", es: 'Eurocopa', de: 'Europameisterschaft', pt: 'Eurocopa' },
  'UEFA Euro': { it: 'Europei', en: 'European Championship', fr: "Championnat d'Europe", es: 'Eurocopa', de: 'Europameisterschaft', pt: 'Eurocopa' },
  'European Championship': { it: 'Europei', en: 'European Championship', fr: "Championnat d'Europe", es: 'Eurocopa', de: 'Europameisterschaft', pt: 'Eurocopa' },
  'FIFA Confederations Cup': { it: 'Confederations Cup', en: 'Confederations Cup', fr: 'Coupe des confédérations', es: 'Copa Confederaciones', de: 'Konföderationen-Pokal', pt: 'Copa das Confederações' },
  'UEFA Nations League': { it: 'Nations League', en: 'Nations League', fr: 'Ligue des nations', es: 'Liga de Naciones', de: 'Nations League', pt: 'Liga das Nações' },
  'Africa Cup of Nations': { it: "Coppa d'Africa", en: 'Africa Cup of Nations', fr: "Coupe d'Afrique des nations", es: 'Copa Africana de Naciones', de: 'Afrika-Cup', pt: 'Taça das Nações Africanas' },
  'AFC Asian Cup': { it: "Coppa d'Asia", en: 'Asian Cup', fr: "Coupe d'Asie", es: 'Copa Asiática', de: 'Asienmeisterschaft', pt: 'Copa da Ásia' },
  'CONCACAF Gold Cup': { it: 'Gold Cup', en: 'Gold Cup', fr: "Gold Cup", es: 'Copa Oro', de: 'Gold Cup', pt: 'Copa Ouro' },
  'Summer Olympics': { it: 'Olimpiadi', en: 'Olympic Games', fr: 'Jeux olympiques', es: 'Juegos Olímpicos', de: 'Olympische Spiele', pt: 'Jogos Olímpicos' },
  'Olympic Games': { it: 'Olimpiadi', en: 'Olympic Games', fr: 'Jeux olympiques', es: 'Juegos Olímpicos', de: 'Olympische Spiele', pt: 'Jogos Olímpicos' },
  'Football at the Summer Olympics': { it: 'Olimpiadi', en: 'Olympic Games', fr: 'Jeux olympiques', es: 'Juegos Olímpicos', de: 'Olympische Spiele', pt: 'Jogos Olímpicos' },
  'Olympic': { it: 'Olimpiadi', en: 'Olympic Games', fr: 'Jeux olympiques', es: 'Juegos Olímpicos', de: 'Olympische Spiele', pt: 'Jogos Olímpicos' },
  'FIFA U-20 World Cup': { it: 'Mondiali Under-20', en: 'U-20 World Cup', fr: 'Coupe du monde U-20', es: 'Mundial Sub-20', de: 'U-20-Weltmeisterschaft', pt: 'Mundial Sub-20' },
  'FIFA World Youth Championship': { it: 'Mondiali Under-20', en: 'U-20 World Cup', fr: 'Coupe du monde U-20', es: 'Mundial Sub-20', de: 'U-20-Weltmeisterschaft', pt: 'Mundial Sub-20' },
  'FIFA U-17 World Cup': { it: 'Mondiali Under-17', en: 'U-17 World Cup', fr: 'Coupe du monde U-17', es: 'Mundial Sub-17', de: 'U-17-Weltmeisterschaft', pt: 'Mundial Sub-17' },
  'UEFA European Under-21 Championship': { it: 'Europei Under-21', en: 'European Under-21 Championship', fr: 'Euro Espoirs', es: 'Europeo Sub-21', de: 'U-21-Europameisterschaft', pt: 'Europeu Sub-21' },
  'UEFA European Under-19 Championship': { it: 'Europei Under-19', en: 'European Under-19 Championship', fr: 'Euro U-19', es: 'Europeo Sub-19', de: 'U-19-Europameisterschaft', pt: 'Europeu Sub-19' },
  'UEFA European Under-17 Championship': { it: 'Europei Under-17', en: 'European Under-17 Championship', fr: 'Euro U-17', es: 'Europeo Sub-17', de: 'U-17-Europameisterschaft', pt: 'Europeu Sub-17' },
  'UEFA Champions League': { it: 'Champions League', en: 'Champions League', fr: 'Ligue des champions', es: 'Liga de Campeones', de: 'Champions League', pt: 'Liga dos Campeões' },
  'European Cup': { it: 'Coppa dei Campioni', en: 'European Cup', fr: 'Coupe des clubs champions', es: 'Copa de Europa', de: 'Europapokal der Landesmeister', pt: 'Taça dos Clubes Campeões' },
  'UEFA Europa League': { it: 'Europa League', en: 'Europa League', fr: 'Ligue Europa', es: 'Liga Europa', de: 'Europa League', pt: 'Liga Europa' },
  'UEFA Cup': { it: 'Coppa UEFA', en: 'UEFA Cup', fr: 'Coupe UEFA', es: 'Copa de la UEFA', de: 'UEFA-Pokal', pt: 'Taça UEFA' },
  'UEFA Europa Conference League': { it: 'Conference League', en: 'Conference League', fr: 'Ligue Europa Conférence', es: 'Liga Conferencia', de: 'Conference League', pt: 'Liga Conferência' },
  'UEFA Conference League': { it: 'Conference League', en: 'Conference League', fr: 'Ligue Europa Conférence', es: 'Liga Conferencia', de: 'Conference League', pt: 'Liga Conferência' },
  "UEFA Cup Winners' Cup": { it: 'Coppa delle Coppe', en: "Cup Winners' Cup", fr: 'Coupe des coupes', es: 'Recopa de Europa', de: 'Europapokal der Pokalsieger', pt: 'Taça das Taças' },
  'European Cup Winners\' Cup': { it: 'Coppa delle Coppe', en: "Cup Winners' Cup", fr: 'Coupe des coupes', es: 'Recopa de Europa', de: 'Europapokal der Pokalsieger', pt: 'Taça das Taças' },
  'UEFA Super Cup': { it: 'Supercoppa UEFA', en: 'UEFA Super Cup', fr: "Supercoupe de l'UEFA", es: 'Supercopa de Europa', de: 'UEFA Super Cup', pt: 'Supertaça Europeia' },
  'European Super Cup': { it: 'Supercoppa UEFA', en: 'UEFA Super Cup', fr: "Supercoupe de l'UEFA", es: 'Supercopa de Europa', de: 'UEFA Super Cup', pt: 'Supertaça Europeia' },
  'FIFA Club World Cup': { it: 'Mondiale per club', en: 'Club World Cup', fr: 'Coupe du monde des clubs', es: 'Mundial de Clubes', de: 'Klub-Weltmeisterschaft', pt: 'Mundial de Clubes' },
  'Intercontinental Cup': { it: 'Coppa Intercontinentale', en: 'Intercontinental Cup', fr: 'Coupe intercontinentale', es: 'Copa Intercontinental', de: 'Weltpokal', pt: 'Taça Intercontinental' },
  'FIFA Intercontinental Cup': { it: 'Coppa Intercontinentale', en: 'Intercontinental Cup', fr: 'Coupe intercontinentale', es: 'Copa Intercontinental', de: 'Weltpokal', pt: 'Taça Intercontinental' },
  'FA Cup': { it: 'FA Cup', en: 'FA Cup', fr: 'FA Cup', es: 'FA Cup', de: 'FA Cup', pt: 'FA Cup' },
  "Ballon d'Or": { it: "Pallone d'Oro", en: "Ballon d'Or", fr: "Ballon d'or", es: 'Balón de Oro', de: 'Ballon d’Or', pt: 'Bola de Ouro' },
  'European Golden Shoe': { it: "Scarpa d'Oro", en: 'European Golden Shoe', fr: "Soulier d'or", es: 'Bota de Oro', de: 'Goldener Schuh', pt: 'Bota de Ouro' },
  'FIFA World Player of the Year': { it: 'FIFA World Player', en: 'FIFA World Player of the Year', fr: 'Meilleur joueur FIFA', es: 'Jugador Mundial de la FIFA', de: 'FIFA-Weltfußballer', pt: 'Melhor Jogador do Mundo FIFA' },
  'Golden Boy': { it: 'Golden Boy', en: 'Golden Boy', fr: 'Golden Boy', es: 'Golden Boy', de: 'Golden Boy', pt: 'Golden Boy' },
};

export function positionName(position, role, l = lang()) {
  const key = String(position || '').toLowerCase().trim();
  if (POSITIONS[key]) return POSITIONS[key][l] || POSITIONS[key].en;
  return roleName(role, l);
}

export function roleName(role, l = lang()) {
  return (ROLES[role] && (ROLES[role][l] || ROLES[role].en)) || '';
}

export function roleShort(role, l = lang()) {
  return (ROLE_SHORT[role] && (ROLE_SHORT[role][l] || ROLE_SHORT[role].en)) || role;
}

export function compName(comp, l = lang()) {
  const c = COMPS[comp];
  if (c) return c[l] || c.en;
  /* "European Cup/UEFA Champions League": le due metà si traducono da sole */
  if (comp.includes('/')) {
    return comp.split('/').map((part) => {
      const x = COMPS[part.trim()];
      return x ? (x[l] || x.en) : part.trim();
    }).join(' / ');
  }
  return comp;
}

/* le competizioni più importanti vanno in cima al palmarès a parità d'anno */
export const MAJOR = new Set(['FIFA World Cup', 'UEFA European Championship', 'Copa América', 'UEFA Champions League', 'European Cup', "Ballon d'Or"]);
