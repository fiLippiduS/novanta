/* ALLENATORE — come si chiamano i ragazzi che nascono nel gioco.
   Nomi e cognomi veri del paese del giocatore (da tools/manager/names.mjs),
   pescati con il loro peso reale e mai uguali a uno già in gioco: due
   Tommaso Caprini nella stessa rosa non si possono vedere. */

import BANK from './names.data.js';

/* se di un paese non sappiamo abbastanza nomi, si pesca da chi gli somiglia */
const NEAR = {
  'GB-WLS': ['GB-ENG'], 'GB-SCT': ['GB-ENG'], 'GB-NIR': ['IE', 'GB-ENG'], IE: ['GB-ENG'],
  AT: ['DE', 'CH'], CH: ['DE', 'FR', 'IT'], LU: ['FR', 'BE'], LI: ['AT', 'DE'], BE: ['NL', 'FR'],
  SM: ['IT'], MT: ['IT'], MC: ['FR'], AD: ['ES'], PT: ['BR'], CV: ['PT'], GW: ['PT'], AO: ['PT'], MZ: ['PT'],
  UY: ['AR'], PY: ['AR'], CL: ['AR'], BO: ['AR'], PE: ['CO'], EC: ['CO'], VE: ['CO'], MX: ['ES'], CR: ['ES'],
  PA: ['CO'], DO: ['ES'], CU: ['ES'], GQ: ['ES'], HT: ['FR'], GP: ['FR'], MQ: ['FR'], GF: ['FR'],
  TG: ['GH', 'BJ'], BJ: ['NG'], NE: ['ML'], TD: ['CM'], CF: ['CM'], GA: ['CM'], CG: ['CD'], KM: ['FR'],
  MR: ['SN'], GM: ['SN'], GN: ['SN'], SL: ['GH'], LR: ['GH'], BI: ['CD'], RW: ['CD'], UG: ['KE'], TZ: ['KE'],
  ZM: ['ZW'], ZW: ['ZA'], NA: ['ZA'], MW: ['ZA'], MG: ['FR'], SR: ['NL'], CW: ['NL'], AW: ['NL'],
  JM: ['GB-ENG'], TT: ['GB-ENG'], BB: ['GB-ENG'], GY: ['GB-ENG'], KN: ['GB-ENG'], LC: ['GB-ENG'], BM: ['GB-ENG'],
  CA: ['US'], AU: ['GB-ENG'], NZ: ['GB-ENG'], PH: ['ES'], SG: ['GB-ENG'], ID: ['NL'],
  XK: ['AL'], ME: ['RS'], BA: ['RS'], MK: ['RS'], SI: ['HR'], SK: ['CZ'], BY: ['UA'], MD: ['RO'],
  EE: ['FI'], LV: ['LT'], LT: ['PL'], IS: ['NO'], FO: ['DK'], AM: ['GE'], AZ: ['TR'], KZ: ['RU'], UZ: ['RU'],
  CY: ['GR'], IL: ['GR'], LB: ['MA'], SY: ['MA'], IQ: ['MA'], JO: ['MA'], SA: ['MA'], AE: ['MA'], QA: ['MA'],
  LY: ['TN'], EG: ['MA'], AF: ['IR'], BD: ['IN'], TH: ['JP'], CN: ['KR'], KR: ['JP'],
};
const BIG = ['FR', 'ES', 'IT', 'DE', 'GB-ENG', 'BR', 'AR', 'NL', 'PT'];

function poolFor(kind, nation) {
  const box = BANK[kind];
  const tries = [nation, ...(NEAR[nation] || []), ...BIG];
  for (const code of tries) if (box[code]?.length) return box[code];
  return box[BIG[0]];
}

/* le voci sono "Nome" oppure ["Nome", quante volte compare]: si pesca col peso */
function weighted(list, rand) {
  let total = 0;
  for (const x of list) total += Array.isArray(x) ? x[1] : 1;
  let r = rand() * total;
  for (const x of list) {
    r -= Array.isArray(x) ? x[1] : 1;
    if (r <= 0) return Array.isArray(x) ? x[0] : x;
  }
  const last = list[list.length - 1];
  return Array.isArray(last) ? last[0] : last;
}

/**
 * Un nome nuovo per un ragazzo di quel paese. `taken` dice se un nome è già
 * in uso: si prova finché non ne esce uno libero, e alla fine si aggiunge
 * l'iniziale del secondo nome invece di arrendersi a un doppione.
 */
export function pickName(rand, nation, taken = () => false) {
  const firsts = poolFor('first', nation);
  const lasts = poolFor('last', nation);
  for (let i = 0; i < 40; i++) {
    const name = `${weighted(firsts, rand)} ${weighted(lasts, rand)}`;
    if (!taken(name)) return name;
  }
  for (let i = 0; i < 40; i++) {
    const f = weighted(firsts, rand);
    const name = `${f} ${weighted(lasts, rand)} ${weighted(lasts, rand)}`;
    if (!taken(name)) return name;
  }
  return `${weighted(firsts, rand)} ${weighted(lasts, rand)}`;
}

/** le nazioni di cui conosciamo abbastanza nomi (per i test e per i controlli) */
export const KNOWN_NATIONS = Object.keys(BANK.last);
