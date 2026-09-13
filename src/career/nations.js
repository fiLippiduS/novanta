/* CARRIERA — da dove vieni, e quanto conta.
   La forza della nazionale decide se una carriera può incontrare la maglia
   azzurra (o verdeoro, o albiceleste): solo le dieci più forti hanno la
   storia della nazionale, e nemmeno in tutte le carriere. */

/* tier 1: le dieci più forti. Confederazione per i tornei continentali. */
export const NATIONS = [
  { code: 'AR', tier: 1, confed: 'CONMEBOL' }, { code: 'FR', tier: 1, confed: 'UEFA' },
  { code: 'ES', tier: 1, confed: 'UEFA' }, { code: 'GB-ENG', tier: 1, confed: 'UEFA' },
  { code: 'BR', tier: 1, confed: 'CONMEBOL' }, { code: 'PT', tier: 1, confed: 'UEFA' },
  { code: 'NL', tier: 1, confed: 'UEFA' }, { code: 'BE', tier: 1, confed: 'UEFA' },
  { code: 'IT', tier: 1, confed: 'UEFA' }, { code: 'DE', tier: 1, confed: 'UEFA' },

  { code: 'HR', tier: 2, confed: 'UEFA' }, { code: 'MA', tier: 2, confed: 'CAF' },
  { code: 'UY', tier: 2, confed: 'CONMEBOL' }, { code: 'CO', tier: 2, confed: 'CONMEBOL' },
  { code: 'US', tier: 2, confed: 'CONCACAF' }, { code: 'MX', tier: 2, confed: 'CONCACAF' },
  { code: 'JP', tier: 2, confed: 'AFC' }, { code: 'SN', tier: 2, confed: 'CAF' },
  { code: 'CH', tier: 2, confed: 'UEFA' }, { code: 'DK', tier: 2, confed: 'UEFA' },
  { code: 'AT', tier: 2, confed: 'UEFA' }, { code: 'KR', tier: 2, confed: 'AFC' },
  { code: 'IR', tier: 2, confed: 'AFC' }, { code: 'AU', tier: 2, confed: 'AFC' },
  { code: 'TR', tier: 2, confed: 'UEFA' }, { code: 'EC', tier: 2, confed: 'CONMEBOL' },
  { code: 'UA', tier: 2, confed: 'UEFA' }, { code: 'SE', tier: 2, confed: 'UEFA' },
  { code: 'PL', tier: 2, confed: 'UEFA' }, { code: 'RS', tier: 2, confed: 'UEFA' },
  { code: 'NG', tier: 2, confed: 'CAF' }, { code: 'EG', tier: 2, confed: 'CAF' },
  { code: 'DZ', tier: 2, confed: 'CAF' }, { code: 'CI', tier: 2, confed: 'CAF' },
  { code: 'GB-WLS', tier: 2, confed: 'UEFA' }, { code: 'GB-SCT', tier: 2, confed: 'UEFA' },
  { code: 'CZ', tier: 2, confed: 'UEFA' }, { code: 'NO', tier: 2, confed: 'UEFA' },
  { code: 'HU', tier: 2, confed: 'UEFA' }, { code: 'CL', tier: 2, confed: 'CONMEBOL' },
  { code: 'PE', tier: 2, confed: 'CONMEBOL' }, { code: 'PY', tier: 2, confed: 'CONMEBOL' },
  { code: 'CM', tier: 2, confed: 'CAF' }, { code: 'GH', tier: 2, confed: 'CAF' },
  { code: 'TN', tier: 2, confed: 'CAF' }, { code: 'CA', tier: 2, confed: 'CONCACAF' },
  { code: 'GR', tier: 2, confed: 'UEFA' }, { code: 'SK', tier: 2, confed: 'UEFA' },
  { code: 'IE', tier: 2, confed: 'UEFA' }, { code: 'RO', tier: 2, confed: 'UEFA' },

  { code: 'SA', tier: 3, confed: 'AFC' }, { code: 'QA', tier: 3, confed: 'AFC' },
  { code: 'SI', tier: 3, confed: 'UEFA' }, { code: 'GE', tier: 3, confed: 'UEFA' },
  { code: 'AL', tier: 3, confed: 'UEFA' }, { code: 'BA', tier: 3, confed: 'UEFA' },
  { code: 'FI', tier: 3, confed: 'UEFA' }, { code: 'IS', tier: 3, confed: 'UEFA' },
  { code: 'ME', tier: 3, confed: 'UEFA' }, { code: 'MK', tier: 3, confed: 'UEFA' },
  { code: 'GB-NIR', tier: 3, confed: 'UEFA' }, { code: 'BG', tier: 3, confed: 'UEFA' },
  { code: 'IL', tier: 3, confed: 'UEFA' }, { code: 'XK', tier: 3, confed: 'UEFA' },
  { code: 'VE', tier: 3, confed: 'CONMEBOL' }, { code: 'BO', tier: 3, confed: 'CONMEBOL' },
  { code: 'CR', tier: 3, confed: 'CONCACAF' }, { code: 'PA', tier: 3, confed: 'CONCACAF' },
  { code: 'JM', tier: 3, confed: 'CONCACAF' }, { code: 'HN', tier: 3, confed: 'CONCACAF' },
  { code: 'ML', tier: 3, confed: 'CAF' }, { code: 'ZA', tier: 3, confed: 'CAF' },
  { code: 'CD', tier: 3, confed: 'CAF' }, { code: 'BF', tier: 3, confed: 'CAF' },
  { code: 'CV', tier: 3, confed: 'CAF' }, { code: 'GA', tier: 3, confed: 'CAF' },
  { code: 'CN', tier: 3, confed: 'AFC' }, { code: 'UZ', tier: 3, confed: 'AFC' },
  { code: 'IQ', tier: 3, confed: 'AFC' }, { code: 'NZ', tier: 3, confed: 'OFC' },
];

export const NATION = new Map(NATIONS.map((n) => [n.code, n]));

/* La prima stagione è il 2026-27: l'anno di chiusura decide i tornei. */
export const FIRST_SEASON_END = 2027;

/** i tornei della nazionale che si giocano nell'estate di quell'anno */
export function tournamentsIn(year, confed) {
  const out = [];
  if (year >= 2030 && (year - 2030) % 4 === 0) out.push('mondiale');
  if (confed === 'UEFA' && year >= 2028 && (year - 2028) % 4 === 0) out.push('europeo');
  if (confed === 'CONMEBOL' && year >= 2028 && (year - 2028) % 4 === 0) out.push('copa_america');
  if (confed === 'UEFA' && year >= 2027 && (year - 2027) % 2 === 0) out.push('nations_league');
  return out;
}
