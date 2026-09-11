/* Le sagome dei trofei.
   Disegnate a mano in SVG, nella stessa lingua del resto del gioco:
   nessuna coppa reale, solo la forma che tutti riconoscono. */

const SHAPES = {
  campionato: `<path d="M14 6h20v5c6 0 8 3 8 7 0 6-5 10-9 11-1 4-4 7-7 8v5h6c2 0 4 2 4 4v3H12v-3c0-2 2-4 4-4h6v-5c-3-1-6-4-7-8-4-1-9-5-9-11 0-4 2-7 8-7V6z"
        fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"/>
     <path d="M6 18c0 4 3 7 6 8M42 18c0 4-3 7-6 8" fill="none" stroke="currentColor" stroke-width="1.6"/>`,
  coppa: `<path d="M12 8h24v14c0 7-5 12-12 12S12 29 12 22V8z" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"/>
     <path d="M24 34v7M16 41h16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>
     <path d="M12 12H7v6c0 4 2 6 5 7M36 12h5v6c0 4-2 6-5 7" fill="none" stroke="currentColor" stroke-width="1.8"/>`,
  supercoppa: `<circle cx="24" cy="18" r="11" fill="none" stroke="currentColor" stroke-width="2.4"/>
     <path d="M24 11l2.2 4.6 5 .7-3.6 3.5.8 5-4.4-2.4-4.4 2.4.8-5-3.6-3.5 5-.7z" fill="currentColor"/>
     <path d="M18 28l-3 13 9-5 9 5-3-13" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/>`,
  continentale: `<path d="M24 5c8 0 14 6 14 13 0 9-8 14-14 22-6-8-14-13-14-22C10 11 16 5 24 5z"
        fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"/>
     <circle cx="24" cy="18" r="6" fill="none" stroke="currentColor" stroke-width="2"/>
     <path d="M24 12v12M18 18h12" stroke="currentColor" stroke-width="1.4"/>`,
  promozione: `<path d="M24 6l12 14h-7v12h-10V20h-7z" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"/>
     <path d="M12 38h24" stroke="currentColor" stroke-width="2.8" stroke-linecap="round"/>`,
  nazionale: `<circle cx="24" cy="22" r="15" fill="none" stroke="currentColor" stroke-width="2.4"/>
     <path d="M24 7v30M9 22h30M13 12c6 4 16 4 22 0M13 32c6-4 16-4 22 0" fill="none" stroke="currentColor" stroke-width="1.5"/>`,
};

export const TROPHY_TYPES = Object.keys(SHAPES);

/** un trofeo come SVG, nel colore che gli passi */
export function trophySvg(type, size = 48) {
  const shape = SHAPES[type] || SHAPES.coppa;
  return `<svg viewBox="0 0 48 48" width="${size}" height="${size}" aria-hidden="true"
    class="trophy trophy--${type}">${shape}</svg>`;
}

/* Ogni trofeo ha il suo colore: la bacheca si legge a colpo d'occhio. */
export const TROPHY_COLOR = {
  campionato: 'var(--lime)',
  coppa: 'var(--sky)',
  supercoppa: 'var(--amber)',
  continentale: 'var(--flare)',
  promozione: 'var(--chalk-2)',
  nazionale: 'var(--amber)',
};
