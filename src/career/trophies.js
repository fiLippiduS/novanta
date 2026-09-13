/* Le sagome dei trofei.
   Disegnate a mano in SVG, nella stessa lingua del resto del gioco:
   nessuna coppa reale riprodotta, solo la forma che tutti riconoscono. */

const S = 'fill="none" stroke="currentColor" stroke-linejoin="round" stroke-linecap="round"';

const SHAPES = {
  campionato: `<path d="M14 6h20v5c6 0 8 3 8 7 0 6-5 10-9 11-1 4-4 7-7 8v5h6c2 0 4 2 4 4v3H12v-3c0-2 2-4 4-4h6v-5c-3-1-6-4-7-8-4-1-9-5-9-11 0-4 2-7 8-7V6z" ${S} stroke-width="2.4"/>`,
  coppa: `<path d="M12 8h24v14c0 7-5 12-12 12S12 29 12 22V8z" ${S} stroke-width="2.4"/>
     <path d="M24 34v7M16 41h16" ${S} stroke-width="2.4"/>
     <path d="M12 12H7v6c0 4 2 6 5 7M36 12h5v6c0 4-2 6-5 7" ${S} stroke-width="1.8"/>`,
  supercoppa: `<circle cx="24" cy="18" r="11" ${S} stroke-width="2.4"/>
     <path d="M24 11l2.2 4.6 5 .7-3.6 3.5.8 5-4.4-2.4-4.4 2.4.8-5-3.6-3.5 5-.7z" fill="currentColor"/>
     <path d="M18 28l-3 13 9-5 9 5-3-13" ${S} stroke-width="2.2"/>`,
  promozione: `<path d="M24 6l12 14h-7v12h-10V20h-7z" ${S} stroke-width="2.4"/><path d="M12 38h24" ${S} stroke-width="2.8"/>`,
  /* la coppa dalle grandi orecchie */
  ucl: `<path d="M16 7h16v11c0 6-4 10-8 10s-8-4-8-10V7z" ${S} stroke-width="2.4"/>
     <path d="M16 9C6 8 5 22 16 22M32 9c10-1 11 13 0 13" ${S} stroke-width="2.4"/>
     <path d="M24 28v7M17 42h14l-2-7H19z" ${S} stroke-width="2.2"/>`,
  uel: `<path d="M17 5h14l-2 18c-1 4-3 6-5 6s-4-2-5-6L17 5z" ${S} stroke-width="2.4"/>
     <path d="M20 13h8M19 19h10" ${S} stroke-width="1.4"/>
     <path d="M24 29v6M18 42h12l-1-7H19z" ${S} stroke-width="2.2"/>`,
  uecl: `<path d="M19 6h10l3 15c0 5-4 8-8 8s-8-3-8-8l3-15z" ${S} stroke-width="2.4"/>
     <path d="M24 29v6M17 42h14l-2-7H19z" ${S} stroke-width="2.2"/>`,
  libertadores: `<path d="M15 10h18v8c0 6-4 10-9 10s-9-4-9-10v-8z" ${S} stroke-width="2.4"/>
     <circle cx="24" cy="6" r="3" ${S} stroke-width="2"/>
     <path d="M24 28v6M15 42h18l-2-8H17z" ${S} stroke-width="2.2"/>`,
  mondiale_club: `<path d="M24 5l2.6 5.4 6 .9-4.3 4.2 1 6-5.3-2.8-5.3 2.8 1-6-4.3-4.2 6-.9z" ${S} stroke-width="2"/>
     <circle cx="24" cy="30" r="7" ${S} stroke-width="2.2"/><path d="M15 43h18" ${S} stroke-width="2.6"/>`,
  /* nazionale */
  mondiale: `<circle cx="24" cy="12" r="8" ${S} stroke-width="2.2"/>
     <path d="M17 18c-2 6 2 10 4 14h6c2-4 6-8 4-14" ${S} stroke-width="2.2"/>
     <path d="M19 32h10l2 10H17z" ${S} stroke-width="2.2"/>`,
  europeo: `<path d="M18 5h12v4c0 3-2 5-2 8v9c0 3 3 4 3 7v2H17v-2c0-3 3-4 3-7v-9c0-3-2-5-2-8V5z" ${S} stroke-width="2.3"/>
     <path d="M14 42h20" ${S} stroke-width="2.6"/>`,
  copa_america: `<path d="M13 9h22l-3 14c-1 5-4 8-8 8s-7-3-8-8L13 9z" ${S} stroke-width="2.4"/>
     <path d="M11 9h26" ${S} stroke-width="2"/><path d="M24 31v5M16 42h16l-2-6H18z" ${S} stroke-width="2.2"/>`,
  nations_league: `<path d="M20 5h8l4 26H16z" ${S} stroke-width="2.4"/><path d="M18 17h12" ${S} stroke-width="1.4"/>
     <path d="M14 42h20l-2-11H16z" ${S} stroke-width="2.2"/>`,
  /* premi individuali */
  pallone_oro: `<circle cx="24" cy="20" r="13" ${S} stroke-width="2.4"/>
     <path d="M24 13l6 4-2 7h-8l-2-7z" ${S} stroke-width="1.8"/>
     <path d="M24 13V7M30 17l6-2M28 24l4 6M20 24l-4 6M18 17l-6-2" ${S} stroke-width="1.4"/>
     <path d="M17 40h14l-2-6H19z" ${S} stroke-width="2.2"/>`,
  scarpa_oro: `<path d="M8 30c0-6 3-15 8-17l5 3c2 4 5 6 10 7 6 1 9 3 9 7v3H8z" ${S} stroke-width="2.4"/>
     <path d="M13 38h26M12 33h28" ${S} stroke-width="2"/><path d="M21 19l3-2M24 22l3-2" ${S} stroke-width="1.4"/>`,
  capocannoniere: `<circle cx="20" cy="26" r="10" ${S} stroke-width="2.4"/>
     <path d="M20 21l5 3-2 5h-6l-2-5z" ${S} stroke-width="1.6"/>
     <path d="M31 8l8 8M35 6l6 6M28 12l7 7" ${S} stroke-width="2"/>`,
  golden_boy: `<circle cx="24" cy="13" r="6" ${S} stroke-width="2.2"/>
     <path d="M14 42c0-10 4-16 10-16s10 6 10 16" ${S} stroke-width="2.4"/>
     <path d="M36 6l1.2 2.5 2.8.4-2 2 .5 2.8-2.5-1.3-2.5 1.3.5-2.8-2-2 2.8-.4z" fill="currentColor"/>`,
  miglior_portiere: `<path d="M16 42V24l-3-9c-1-3 3-4 4-1l2 6V9c0-3 4-3 4 0v10V7c0-3 4-3 4 0v12V9c0-3 4-3 4 0v12l2-3c2-3 5-1 4 2l-5 11v11z" ${S} stroke-width="2.2"/>`,
};

/* le coppe continentali di altre confederazioni usano le sagome più vicine */
const ALIAS = { sudamericana: 'uel', concacaf: 'uecl', afc: 'uecl', caf: 'uecl', caf_conf: 'uel' };

export const TROPHY_TYPES = [...Object.keys(SHAPES), ...Object.keys(ALIAS)];

export function trophySvg(type, size = 48) {
  const shape = SHAPES[type] || SHAPES[ALIAS[type]] || SHAPES.coppa;
  return `<svg viewBox="0 0 48 48" width="${size}" height="${size}" aria-hidden="true" class="trophy trophy--${type}">${shape}</svg>`;
}

/* ogni trofeo ha il suo colore: la bacheca si legge a colpo d'occhio */
export const TROPHY_COLOR = {
  campionato: 'var(--lime)', coppa: 'var(--sky)', supercoppa: 'var(--amber)', promozione: 'var(--chalk-2)',
  ucl: '#9FB7FF', uel: '#FF9A3C', uecl: '#5FE3A1', libertadores: '#F2C94C', sudamericana: '#6FCF97',
  concacaf: '#9FB7FF', afc: '#9FB7FF', caf: '#F2C94C', caf_conf: '#6FCF97', mondiale_club: '#E8B84A',
  mondiale: '#E8B84A', europeo: '#C9CDD4', copa_america: '#F2C94C', nations_league: '#9FB7FF',
  pallone_oro: '#F5C542', scarpa_oro: '#F5C542', capocannoniere: 'var(--flare)', golden_boy: '#F5C542',
  miglior_portiere: 'var(--amber)',
};

/* l'ordine con cui la bacheca li mostra: prima i più grandi */
export const TROPHY_ORDER = [
  'pallone_oro', 'mondiale', 'ucl', 'europeo', 'copa_america', 'libertadores', 'mondiale_club', 'campionato',
  'uel', 'uecl', 'sudamericana', 'concacaf', 'afc', 'caf', 'caf_conf', 'nations_league', 'coppa', 'supercoppa',
  'scarpa_oro', 'capocannoniere', 'golden_boy', 'miglior_portiere', 'promozione',
];
