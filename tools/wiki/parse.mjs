/* Lettura delle schede di Wikipedia (Infobox football biography).
   Qui si decide cosa è un dato affidabile e cosa no: meglio scartare una
   riga ambigua che mettere in gioco un numero sbagliato. */

/* ------------------------------------------------------------------ */
/* template e parametri                                                */
/* ------------------------------------------------------------------ */

/** il corpo del primo template il cui nome combacia, con le graffe bilanciate */
export function findTemplate(text, nameRe) {
  const re = new RegExp(`\\{\\{\\s*(${nameRe})\\s*[|\\n}]`, 'i');
  const m = re.exec(text);
  if (!m) return null;
  let depth = 0;
  for (let i = m.index; i < text.length - 1; i++) {
    if (text[i] === '{' && text[i + 1] === '{') { depth++; i++; continue; }
    if (text[i] === '}' && text[i + 1] === '}') {
      depth--; i++;
      if (depth === 0) return text.slice(m.index + 2, i - 1);
    }
  }
  return null;
}

/** divide i parametri al primo livello: le barre dentro link e template non contano */
export function splitParams(body) {
  const parts = [];
  let cur = '';
  let curly = 0; let square = 0;
  for (let i = 0; i < body.length; i++) {
    const two = body.slice(i, i + 2);
    if (two === '{{') { curly++; cur += two; i++; continue; }
    if (two === '}}') { curly--; cur += two; i++; continue; }
    if (two === '[[') { square++; cur += two; i++; continue; }
    if (two === ']]') { square--; cur += two; i++; continue; }
    if (body[i] === '|' && curly === 0 && square === 0) { parts.push(cur); cur = ''; continue; }
    cur += body[i];
  }
  parts.push(cur);
  const params = {};
  const positional = [];
  parts.slice(1).forEach((p) => {
    const eq = p.indexOf('=');
    const bracket = Math.min(...['[[', '{{'].map((b) => { const k = p.indexOf(b); return k < 0 ? Infinity : k; }));
    if (eq > 0 && eq < bracket) {
      params[p.slice(0, eq).trim().toLowerCase()] = p.slice(eq + 1).trim();
    } else {
      positional.push(p.trim());
    }
  });
  return { params, positional };
}

/* ------------------------------------------------------------------ */
/* pulizia del testo                                                   */
/* ------------------------------------------------------------------ */

/** divide al primo livello, senza rompere link e template annidati */
function topSplit(body) {
  const parts = [];
  let cur = '';
  let curly = 0; let square = 0;
  for (let i = 0; i < body.length; i++) {
    const two = body.slice(i, i + 2);
    if (two === '{{') { curly++; cur += two; i++; continue; }
    if (two === '}}') { curly--; cur += two; i++; continue; }
    if (two === '[[') { square++; cur += two; i++; continue; }
    if (two === ']]') { square--; cur += two; i++; continue; }
    if (body[i] === '|' && curly === 0 && square === 0) { parts.push(cur); cur = ''; continue; }
    cur += body[i];
  }
  parts.push(cur);
  return parts;
}

function stripBalanced(text, open, close, test) {
  let out = '';
  let i = 0;
  while (i < text.length) {
    if (text.startsWith(open, i)) {
      let depth = 0; let j = i;
      for (; j < text.length; j++) {
        if (text.startsWith(open, j)) { depth++; j += open.length - 1; continue; }
        if (text.startsWith(close, j)) { depth--; j += close.length - 1; if (depth === 0) break; }
      }
      const inner = text.slice(i + open.length, j - close.length + 1);
      const replaced = test(inner);
      out += replaced;
      i = j + 1;
      continue;
    }
    out += text[i];
    i++;
  }
  return out;
}

const DROP_TEMPLATES = /^(efn|refn|sfn|sfnp|r|ref|cite|citation|notetag|note|efn-ua|efn-lr|dagger|increase|decrease|steady|flagicon|flagcountry|fb|flag|nowrap end|small end|hidden|tooltip|abbr|clarify|citation needed|cn|as of|update|when|by whom|dubious|verify|failed verification|better source|lower|nbsp|spaced ndash|snd|·|•|dot|ubl end|plainlist end)\b/i;

export function clean(value) {
  if (value == null) return '';
  let v = String(value);
  v = v.replace(/<!--[\s\S]*?-->/g, '');
  v = v.replace(/<ref[^>]*\/>/gi, '');
  v = v.replace(/<ref[^>]*>[\s\S]*?<\/ref>/gi, '');
  v = v.replace(/<br\s*\/?>/gi, ' ');
  v = stripBalanced(v, '{{', '}}', (inner) => {
    const parts = topSplit(inner);
    const name = parts[0].trim();
    if (DROP_TEMPLATES.test(name)) return '';
    const args = parts.slice(1).map((a) => a.trim());
    const plain = args.filter((a) => !/^[a-z_ ]+=/i.test(a));
    /* elenchi: "{{hlist|[[Winger]]|[[forward]]}}" e "{{flatlist|* A * B}}" */
    if (/^(hlist|flatlist|plainlist|ubl|unbulleted list|bulleted list|cslist|endflatlist)$/i.test(name)) {
      return plain.join('\n').split(/\n+\s*\*\s*|\n+/).map((x) => x.replace(/^\*\s*/, '').trim()).filter(Boolean).join(', ');
    }
    if (/^(nowrap|small|big|nobr|sup|sub|lang|transl|ill|interlanguage link|resize|nobold|nowrap begin)$/i.test(name)) return plain.slice(-1)[0] || '';
    if (/^(ndash|snd|spaced ndash)$/i.test(name)) return '–';
    if (/^(sortname)$/i.test(name)) return `${args[0] || ''} ${args[1] || ''}`.trim();
    return '';
  });
  v = v.replace(/\[\[(?:[^\]|]*\|)?([^\]]*)\]\]/g, '$1');
  v = v.replace(/\[https?:\/\/[^\s\]]+\s*([^\]]*)\]/g, '$1');
  v = v.replace(/'''?/g, '');
  v = v.replace(/<[^>]+>/g, '');
  v = v.replace(/&nbsp;|&#160;/g, ' ');
  v = v.replace(/&ndash;/g, '–').replace(/&mdash;/g, '—').replace(/&amp;/g, '&');
  v = v.replace(/\s+/g, ' ').trim();
  return v;
}

/** il bersaglio del primo link: [[A.C. Milan|AC Milan]] -> A.C. Milan */
export function linkTarget(value) {
  const m = /\[\[([^\]|#]+)(?:#[^\]|]*)?(?:\|[^\]]*)?\]\]/.exec(value || '');
  return m ? m[1].trim().replace(/_/g, ' ') : null;
}

/* ------------------------------------------------------------------ */
/* numeri e date                                                       */
/* ------------------------------------------------------------------ */

export function parseInt0(value) {
  const c = clean(value).replace(/[()]/g, '').trim();
  if (!/^\d{1,4}$/.test(c)) return null;
  return Number(c);
}

/** "2017–2019" · "2019–" · "2020" · "1996–01" -> {from, to} (to null = in corso) */
export function parseYears(value) {
  const c = clean(value).replace(/\s/g, '').replace(/[-−—]/g, '–');
  let m = /^(\d{4})–(\d{4})$/.exec(c);
  if (m) return { from: +m[1], to: +m[2] };
  m = /^(\d{4})–(\d{2})$/.exec(c);
  if (m) return { from: +m[1], to: Math.floor(+m[1] / 100) * 100 + +m[2] };
  m = /^(\d{4})–$/.exec(c);
  if (m) return { from: +m[1], to: null };
  m = /^(\d{4})$/.exec(c);
  if (m) return { from: +m[1], to: +m[1] };
  return null;
}

export function parseHeight(value) {
  const raw = String(value || '');
  let m = /\{\{\s*(?:height|convert)\s*\|\s*(?:m\s*=\s*)?([12][.,]\d{1,2})\s*(?:\|\s*m\b|\}\}|\|)/i.exec(raw);
  if (m) return Math.round(parseFloat(m[1].replace(',', '.')) * 100);
  m = /\{\{\s*height\s*\|\s*cm\s*=\s*(\d{3})/i.exec(raw);
  if (m) return +m[1];
  m = /\{\{\s*convert\s*\|\s*(\d{3})\s*\|\s*cm/i.exec(raw);
  if (m) return +m[1];
  m = /\{\{\s*height\s*\|\s*ft\s*=\s*(\d)\s*\|\s*in\s*=\s*(\d{1,2}(?:\.\d)?)/i.exec(raw);
  if (m) return Math.round((+m[1] * 12 + +m[2]) * 2.54);
  const c = clean(raw);
  m = /([12][.,]\d{2})\s*m\b/.exec(c);
  if (m) return Math.round(parseFloat(m[1].replace(',', '.')) * 100);
  m = /(\d{3})\s*cm\b/.exec(c);
  if (m) return +m[1];
  m = /(\d)\s*ft\s*(\d{1,2})\s*in/.exec(c);
  if (m) return Math.round((+m[1] * 12 + +m[2]) * 2.54);
  return null;
}

export function parseBirthYear(value) {
  const raw = String(value || '');
  const m = /\{\{\s*(?:birth date(?: and age)?2?|bda|dob)\s*\|(?:[^}]*?\|)?\s*(1[89]\d{2}|20[01]\d)\s*\|/i.exec(raw);
  if (m) return +m[1];
  const c = clean(raw);
  const y = /\b(1[89]\d{2}|20[01]\d)\b/.exec(c);
  return y ? +y[1] : null;
}

export function parseDeathYear(value) {
  const raw = String(value || '');
  if (!raw.trim()) return null;
  const m = /\b(19\d{2}|20[0-2]\d)\b/.exec(raw);
  return m ? +m[1] : null;
}

/* ------------------------------------------------------------------ */
/* ruolo                                                               */
/* ------------------------------------------------------------------ */

export function roleOf(position) {
  const p = clean(position).toLowerCase();
  if (!p) return null;
  const first = p.split(/[,/;]| and | or /)[0];
  const pick = (s) => {
    if (/goalkeeper|keeper/.test(s)) return 'POR';
    if (/(centre|center|full|wing|left|right)[- ]?back|defender|sweeper|libero|stopper/.test(s)) return 'DIF';
    if (/midfield|playmaker|regista|mezzala|trequartista/.test(s)) return 'CEN';
    if (/forward|striker|winger|wide|attacker|centre-forward|second striker/.test(s)) return 'ATT';
    return null;
  };
  return pick(first) || pick(p);
}

/* ------------------------------------------------------------------ */
/* squadre della carriera                                              */
/* ------------------------------------------------------------------ */

function spells(params, yearsKey, clubsKey, capsKey, goalsKey) {
  const out = [];
  for (let i = 1; i <= 40; i++) {
    const club = params[`${clubsKey}${i}`];
    if (club === undefined) continue;
    const years = parseYears(params[`${yearsKey}${i}`]);
    const name = clean(club).replace(/^→\s*/, '').replace(/\((?:on )?loan\)/i, '').trim();
    if (!name) continue;
    out.push({
      years,
      link: linkTarget(club),
      name,
      loan: /→|\(loan\)|on loan/i.test(club),
      caps: capsKey ? parseInt0(params[`${capsKey}${i}`]) : null,
      goals: goalsKey ? parseInt0(params[`${goalsKey}${i}`]) : null,
    });
  }
  return out;
}

const YOUTH_NT = /\bU-?\d{2}\b|under-?\d{2}|olympic|youth|\bB\b|amateur|\bA'|universiade/i;

export function parseInfobox(text) {
  const body = findTemplate(text, 'Infobox football biography|Infobox footballer');
  if (!body) return null;
  const { params } = splitParams(body);

  const clubs = spells(params, 'years', 'clubs', 'caps', 'goals');
  const youth = spells(params, 'youthyears', 'youthclubs', null, null);
  const national = spells(params, 'nationalyears', 'nationalteam', 'nationalcaps', 'nationalgoals')
    .map((s) => ({ ...s, youth: YOUTH_NT.test(s.name) || YOUTH_NT.test(s.link || '') }));

  return {
    name: clean(params.name),
    fullname: clean(params.fullname),
    birthYear: parseBirthYear(params.birth_date),
    deathYear: parseDeathYear(params.death_date),
    birthPlace: clean(params.birth_place),
    height: parseHeight(params.height),
    position: clean(params.position),
    role: roleOf(params.position),
    currentClub: clean(params.currentclub),
    youth,
    clubs,
    national,
    medals: parseMedals(params.medaltemplates || ''),
  };
}

/* ------------------------------------------------------------------ */
/* palmarès                                                            */
/* ------------------------------------------------------------------ */

/* {{MedalGold|...}} e il più recente {{Medal|W|...}} / {{Medal|RU|...}} / {{Medal|SF|...}} */
function parseMedals(raw) {
  const out = [];
  let comp = null;
  const starts = /\{\{\s*Medal(Competition|Gold|Silver|Bronze|Sport|Country|Team)?\s*\|/gi;
  let m;
  while ((m = starts.exec(raw))) {
    const body = findTemplate(raw.slice(m.index), 'Medal(?:Competition|Gold|Silver|Bronze|Sport|Country|Team)?');
    if (body == null) continue;
    const { positional } = splitParams(body);
    const kind = (m[1] || '').toLowerCase();
    if (kind === 'competition') { comp = clean(positional[0] || ''); continue; }
    if (!comp) continue;
    let medal = null;
    let arg = positional[0] || '';
    if (kind === 'gold' || kind === 'silver' || kind === 'bronze') medal = kind;
    else if (!kind) {
      const code = (positional[0] || '').trim().toUpperCase();
      medal = { W: 'gold', '1ST': 'gold', GOLD: 'gold', RU: 'silver', '2ND': 'silver', SILVER: 'silver', SF: 'semi', '3RD': 'bronze', BRONZE: 'bronze', '3': 'bronze' }[code] || null;
      arg = positional[1] || '';
    }
    if (!medal) continue;
    const y = /\b(19\d{2}|20\d{2})\b/.exec(clean(arg));
    if (y) out.push({ comp, year: +y[1], medal });
  }
  return out;
}

function section(text, names) {
  const re = new RegExp(`^(==+)\\s*(?:${names})\\s*\\1\\s*$`, 'mi');
  const m = re.exec(text);
  if (!m) return null;
  const level = m[1].length;
  const rest = text.slice(m.index + m[0].length);
  const next = new RegExp(`^={2,${level}}[^=].*?={2,${level}}\\s*$`, 'm').exec(rest);
  return next ? rest.slice(0, next.index) : rest;
}

/** anni scritti dopo i due punti: 2011–12, 2012–13 o 2006 */
function yearsIn(text) {
  const out = [];
  const re = /\b((?:19|20)\d{2})(?:\s*[–\-/]\s*((?:19|20)?\d{2}))?\b/g;
  let m;
  while ((m = re.exec(text))) {
    const a = +m[1];
    let label = m[1];
    let end = a;
    if (m[2]) {
      const b = m[2].length === 2 ? Math.floor(a / 100) * 100 + +m[2] : +m[2];
      if (b === a + 1) { end = b; label = `${a}–${String(b).slice(2)}`; }
    }
    out.push({ label, end });
  }
  return out;
}

const RESULT_WORDS = [
  [/runners?[- ]up|finalists?|second place|silver medal|^silver$/i, 'runnerup'],
  [/third place|bronze medal|^bronze$/i, 'third'],
];

function resultOf(text, fallback) {
  for (const [re, r] of RESULT_WORDS) if (re.test(text)) return r;
  return fallback;
}

/**
 * Palmarès da giocatore. Le sezioni da allenatore si fermano qui:
 * una Champions vinta in panchina non va nella carriera del giocatore.
 * isCountry(nome) dice se un'intestazione è una nazionale.
 */
export function parseHonours(text, isCountry = () => false) {
  let body = section(text, 'Honours|Honors|Titles|Honours and achievements|Honors and awards|Honours and awards|Achievements');
  if (!body) return [];
  body = body.replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<ref[^>]*\/>/gi, '')
    .replace(/<ref[^>]*>[\s\S]*?<\/ref>/gi, '');

  const out = [];
  const seen = new Set();
  let group = null;
  let kind = 'club';

  for (const rawLine of body.split('\n')) {
    const line = rawLine.trim();
    if (!line || /^\[\[(File|Image):/i.test(line)) continue;

    if (!line.startsWith('*')) {
      /* le note attaccate all'intestazione ('''Barcelona'''{{efn|...}}) non devono
         impedire di riconoscerla: via tutti i template prima del confronto */
      const bare = stripBalanced(line, '{{', '}}', () => '').trim();
      const h = /^(={2,})\s*(.+?)\s*\1$/.exec(bare) || /^'''(.+?)'''\s*:?$/.exec(bare) || /^;\s*(.+)$/.exec(bare);
      if (!h) continue;
      const name = clean(h[2] !== undefined && h[1].startsWith('=') ? h[2] : h[1]);
      if (!name) continue;
      if (/manager|coach|managerial|as a trainer|head coach/i.test(name)) break;
      if (/^(player|as a player|playing career)$/i.test(name)) continue;
      if (/^clubs?$/i.test(name)) { kind = 'club'; group = null; continue; }
      if (/^(international|national team|country|international honours)$/i.test(name)) { kind = 'national'; group = null; continue; }
      if (/^(individual|personal|awards|individual awards|individual honours)$/i.test(name)) { kind = 'individual'; group = null; continue; }
      if (/^(orders|decorations|records|other|state|honorary|special awards|national orders|youth)/i.test(name)) { kind = 'skip'; group = null; continue; }
      group = name;
      const base = name.replace(/\s*(U-?\d{2}|under-?\d{2}|olympic( team)?|B|amateurs?)\s*$/i, '').trim();
      kind = isCountry(base) || /olympic|U-?\d{2}\b|under-?\d{2}/i.test(name) ? 'national' : 'club';
      continue;
    }

    if (kind === 'skip') continue;
    const item = clean(line.replace(/^\*+\s*/, ''));
    const colon = item.indexOf(': ');
    if (colon < 0) continue;
    let comp = item.slice(0, colon).replace(/\(\d+\)\s*$/, '').trim();
    const compResult = resultOf(comp, 'winner');
    /* "Champions" non si toglie: fa parte di "Trophée des Champions" */
    comp = comp.replace(/\s*(runners?[- ]up|runner up|finalists?|second place|third place|gold medal|silver medal|bronze medal)\s*$/i, '').trim();
    if (!comp || comp.length > 70) continue;

    /* "2002–03, 2006–07; runner-up: 2004–05" */
    for (const seg of item.slice(colon + 2).split(';')) {
      const segResult = /^\s*(runners?[- ]up|third place|finalists?|second place)\s*:?/i.test(seg) ? resultOf(seg, compResult) : compResult;
      for (const y of yearsIn(seg)) {
        const key = [group, comp, y.label, segResult].join('|');
        if (seen.has(key)) continue;
        seen.add(key);
        out.push({ group, kind, comp, label: y.label, year: y.end, result: segResult });
      }
    }
  }
  return out;
}
