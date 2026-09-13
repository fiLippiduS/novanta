/* Bandiere e nomi dei paesi in tutte le lingue del gioco.
   I nomi arrivano da Intl.DisplayNames, già tradotti dal browser.
   Le bandiere sono emoji: su Windows le emoji delle bandiere non esistono,
   e lì carichiamo un font che le disegna (Twemoji Country Flags). */

import { lang } from '../core/i18n.js';

/* nazioni che lo standard ISO non conosce, o non conosce più */
const SPECIAL = {
  CS: { flag: null, it: 'Cecoslovacchia', en: 'Czechoslovakia', fr: 'Tchécoslovaquie', es: 'Checoslovaquia', de: 'Tschechoslowakei', pt: 'Checoslováquia' },
  SU: { flag: null, it: 'Unione Sovietica', en: 'Soviet Union', fr: 'Union soviétique', es: 'Unión Soviética', de: 'Sowjetunion', pt: 'União Soviética' },
  YU: { flag: null, it: 'Jugoslavia', en: 'Yugoslavia', fr: 'Yougoslavie', es: 'Yugoslavia', de: 'Jugoslawien', pt: 'Iugoslávia' },
  DD: { flag: null, it: 'Germania Est', en: 'East Germany', fr: 'Allemagne de l’Est', es: 'Alemania Oriental', de: 'DDR', pt: 'Alemanha Oriental' },
  ZR: { flag: null, it: 'Zaire', en: 'Zaire', fr: 'Zaïre', es: 'Zaire', de: 'Zaire', pt: 'Zaire' },
  CSXX: { flag: null, it: 'Serbia e Montenegro', en: 'Serbia and Montenegro', fr: 'Serbie-et-Monténégro', es: 'Serbia y Montenegro', de: 'Serbien und Montenegro', pt: 'Sérvia e Montenegro' },
  'GB-ENG': { flag: '🏴\u{E0067}\u{E0062}\u{E0065}\u{E006E}\u{E0067}\u{E007F}', it: 'Inghilterra', en: 'England', fr: 'Angleterre', es: 'Inglaterra', de: 'England', pt: 'Inglaterra' },
  'GB-SCT': { flag: '🏴\u{E0067}\u{E0062}\u{E0073}\u{E0063}\u{E0074}\u{E007F}', it: 'Scozia', en: 'Scotland', fr: 'Écosse', es: 'Escocia', de: 'Schottland', pt: 'Escócia' },
  'GB-WLS': { flag: '🏴\u{E0067}\u{E0062}\u{E0077}\u{E006C}\u{E0073}\u{E007F}', it: 'Galles', en: 'Wales', fr: 'Pays de Galles', es: 'Gales', de: 'Wales', pt: 'País de Gales' },
  'DE-W': { flag: '🇩🇪', it: 'Germania Ovest', en: 'West Germany', fr: 'Allemagne de l’Ouest', es: 'Alemania Occidental', de: 'BR Deutschland', pt: 'Alemanha Ocidental' },
  'GB-NIR': { flag: null, it: 'Irlanda del Nord', en: 'Northern Ireland', fr: 'Irlande du Nord', es: 'Irlanda del Norte', de: 'Nordirland', pt: 'Irlanda do Norte' },
};

const namers = new Map();

export function countryName(code, l = lang()) {
  if (!code) return '';
  if (SPECIAL[code]) return SPECIAL[code][l] || SPECIAL[code].en;
  try {
    if (!namers.has(l)) namers.set(l, new Intl.DisplayNames([l], { type: 'region' }));
    return namers.get(l).of(code) || code;
  } catch { return code; }
}

export function flagEmoji(code) {
  if (!code) return '';
  if (SPECIAL[code]) return SPECIAL[code].flag || '';
  if (!/^[A-Z]{2}$/.test(code)) return '';
  return String.fromCodePoint(...[...code].map((c) => 0x1F1E6 + c.charCodeAt(0) - 65));
}

/* Windows non disegna le bandiere: lo scopriamo misurando un'emoji
   sulla tela, e solo in quel caso scarichiamo il font che le sostituisce. */
let checked = false;
export function ensureFlagFont() {
  if (checked) return;
  checked = true;
  try {
    const c = document.createElement('canvas');
    c.width = c.height = 16;
    const x = c.getContext('2d', { willReadFrequently: true });
    x.textBaseline = 'top';
    x.font = '16px sans-serif';
    x.fillText('🇮🇹', 0, 0);
    const d = x.getImageData(0, 0, 16, 16).data;
    let colored = false;
    for (let i = 0; i < d.length; i += 4) {
      if (d[i + 3] && (Math.abs(d[i] - d[i + 1]) > 40 || Math.abs(d[i + 1] - d[i + 2]) > 40)) { colored = true; break; }
    }
    if (colored) return;
    const style = document.createElement('style');
    style.textContent = `@font-face{font-family:"Twemoji Country Flags";unicode-range:U+1F1E6-1F1FF,U+1F3F4,U+E0062-E0063,U+E0065,U+E0067,U+E006C,U+E006E,U+E0073-E0074,U+E0077,U+E007F;src:url("https://cdn.jsdelivr.net/npm/country-flag-emoji-polyfill@0.1/dist/TwemojiCountryFlags.woff2") format("woff2");font-display:swap}`;
    document.head.appendChild(style);
    document.documentElement.classList.add('flags-polyfill');
  } catch { /* nessuna tela: resta il codice del paese */ }
}

/** bandiera + nome, pronta da inserire */
export function nationTag(code, { short = false } = {}) {
  const span = document.createElement('span');
  span.className = 'nation';
  const f = flagEmoji(code);
  if (f) {
    const flag = document.createElement('span');
    flag.className = 'flag';
    flag.setAttribute('aria-hidden', 'true');
    flag.textContent = f;
    span.appendChild(flag);
  } else if (code) {
    const flag = document.createElement('span');
    flag.className = 'flag flag--code';
    flag.textContent = code.replace(/^GB-/, '').slice(0, 3);
    span.appendChild(flag);
  }
  if (!short) span.appendChild(document.createTextNode(countryName(code)));
  return span;
}
