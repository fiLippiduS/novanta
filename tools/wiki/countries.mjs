/* Nomi inglesi delle nazionali -> codice paese.
   I nomi ufficiali arrivano da Intl.DisplayNames, così non ne scrivo a mano
   nemmeno uno: a mano restano solo i casi che lo standard ISO non conosce
   (le quattro nazioni britanniche e le nazioni che non esistono più). */

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const en = new Intl.DisplayNames(['en'], { type: 'region' });

const DEPRECATED = new Set(['FX', 'HV', 'DY', 'CS', 'YU', 'SU', 'DD', 'ZR', 'BU', 'TP', 'NH', 'RH', 'AN', 'NT', 'YD', 'VD', 'CT', 'JT', 'MI', 'PC', 'PU', 'PZ', 'WK', 'QU', 'EU', 'UN', 'EZ', 'QO', 'XA', 'XB', 'ZZ']);
const byName = new Map();
for (const a of LETTERS) {
  for (const b of LETTERS) {
    const code = a + b;
    let name;
    try { name = en.of(code); } catch { continue; }
    if (!name || name === code || /Unknown/.test(name)) continue;
    /* codici ritirati che il browser conosce ancora con il nome del paese di
       oggi: "France" deve essere FR e non FX, "Serbia" RS e non CS */
    if (DEPRECATED.has(code)) continue;
    byName.set(name.toLowerCase(), code);
  }
}

/* come Wikipedia chiama le nazionali, quando non coincide con lo standard */
const ALIASES = {
  england: 'GB-ENG', scotland: 'GB-SCT', wales: 'GB-WLS', 'northern ireland': 'GB-NIR',
  'republic of ireland': 'IE', ireland: 'IE', 'united states': 'US', usa: 'US',
  'south korea': 'KR', 'korea republic': 'KR', 'north korea': 'KP', 'korea dpr': 'KP',
  'ivory coast': 'CI', "côte d'ivoire": 'CI', 'dr congo': 'CD', 'democratic republic of the congo': 'CD',
  'congo dr': 'CD', zaire: 'ZR', congo: 'CG', 'republic of the congo': 'CG',
  'czech republic': 'CZ', czechia: 'CZ', czechoslovakia: 'CS', 'soviet union': 'SU', ussr: 'SU',
  yugoslavia: 'YU', 'fr yugoslavia': 'YU', 'serbia and montenegro': 'CSXX', 'east germany': 'DD',
  'west germany': 'DE', germany: 'DE', 'bosnia and herzegovina': 'BA', 'north macedonia': 'MK',
  macedonia: 'MK', 'cape verde': 'CV', 'cabo verde': 'CV', curaçao: 'CW', curacao: 'CW',
  'trinidad and tobago': 'TT', 'united arab emirates': 'AE', uae: 'AE', russia: 'RU', 'cis': 'SU',
  iran: 'IR', syria: 'SY', 'hong kong': 'HK', macau: 'MO', 'chinese taipei': 'TW', taiwan: 'TW',
  palestine: 'PS', kosovo: 'XK', turkey: 'TR', türkiye: 'TR', 'the gambia': 'GM', gambia: 'GM',
  'guinea-bissau': 'GW', 'equatorial guinea': 'GQ', 'saint kitts and nevis': 'KN', 'st. kitts and nevis': 'KN',
  'antigua and barbuda': 'AG', 'dutch east indies': 'ID', 'new caledonia': 'NC', tahiti: 'PF',
  'são tomé and príncipe': 'ST', eswatini: 'SZ', swaziland: 'SZ', burma: 'MM', myanmar: 'MM',
  'east timor': 'TL', 'timor-leste': 'TL', 'faroe islands': 'FO', 'saar': 'DE', vietnam: 'VN',
  laos: 'LA', brunei: 'BN', moldova: 'MD', bolivia: 'BO', venezuela: 'VE', tanzania: 'TZ',
  'united kingdom': 'GB', 'great britain': 'GB', 'china pr': 'CN', china: 'CN',
  /* squadre regionali e rappresentative: la nazionalità resta quella del paese */
  'basque country': 'ES', catalonia: 'ES', galicia: 'ES', andalusia: 'ES', scottish: 'GB-SCT', italy: 'IT',
};

export function countryCode(name) {
  if (!name) return null;
  const n = String(name).toLowerCase()
    .replace(/\s+national\s+(football\s+)?[bc]\s+team.*$/, '')
    .replace(/\s+[bc]\s+national\s+(football\s+)?team.*$/, '')
    .replace(/\s+national\s+youth\s+(football\s+)?team.*$/, '')
    .replace(/\s+(autonomous|regional)\s+football\s+team.*$/, '')
    .replace(/\s+(lega pro|serie b|league)\s+(representative teams|xi).*$/, '')
    .replace(/\s+national\s+(association\s+)?(football|soccer)\s+team.*$/, '')
    .replace(/\s+(men's\s+)?national\s+under-?\d+.*$/, '')
    .replace(/\s+(olympic|amateur).*$/, '')
    .replace(/\s+U-?\d{2}$/i, '')
    .replace(/\s+B$/, '')
    .trim();
  return ALIASES[n] || byName.get(n) || null;
}

export const isCountry = (name) => Boolean(countryCode(name));

/* nazioni storiche: niente codice ISO attuale, nome scritto a mano */
export const HISTORIC = {
  CS: { it: 'Cecoslovacchia', en: 'Czechoslovakia', fr: 'Tchécoslovaquie', es: 'Checoslovaquia', de: 'Tschechoslowakei', pt: 'Checoslováquia' },
  SU: { it: 'Unione Sovietica', en: 'Soviet Union', fr: 'Union soviétique', es: 'Unión Soviética', de: 'Sowjetunion', pt: 'União Soviética' },
  YU: { it: 'Jugoslavia', en: 'Yugoslavia', fr: 'Yougoslavie', es: 'Yugoslavia', de: 'Jugoslawien', pt: 'Iugoslávia' },
  DD: { it: 'Germania Est', en: 'East Germany', fr: 'Allemagne de l’Est', es: 'Alemania Oriental', de: 'DDR', pt: 'Alemanha Oriental' },
  ZR: { it: 'Zaire', en: 'Zaire', fr: 'Zaïre', es: 'Zaire', de: 'Zaire', pt: 'Zaire' },
  CSXX: { it: 'Serbia e Montenegro', en: 'Serbia and Montenegro', fr: 'Serbie-et-Monténégro', es: 'Serbia y Montenegro', de: 'Serbien und Montenegro', pt: 'Sérvia e Montenegro' },
  'GB-ENG': { it: 'Inghilterra', en: 'England', fr: 'Angleterre', es: 'Inglaterra', de: 'England', pt: 'Inglaterra' },
  'GB-SCT': { it: 'Scozia', en: 'Scotland', fr: 'Écosse', es: 'Escocia', de: 'Schottland', pt: 'Escócia' },
  'GB-WLS': { it: 'Galles', en: 'Wales', fr: 'Pays de Galles', es: 'Gales', de: 'Wales', pt: 'País de Gales' },
  'GB-NIR': { it: 'Irlanda del Nord', en: 'Northern Ireland', fr: 'Irlande du Nord', es: 'Irlanda del Norte', de: 'Nordirland', pt: 'Irlanda do Norte' },
};
