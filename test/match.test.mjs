import { readFileSync } from 'node:fs';
import { buildIndex, matchGuess, matchExact, hasLongerCandidate, surnameOf, editDistance }
  from '../src/core/match.js';

const squads = JSON.parse(readFileSync(new URL('../data/squads.json', import.meta.url), 'utf8')).squads;
const byId = Object.fromEntries(squads.map(s => [s.id, s]));
const idx = (id) => { const s = byId[id]; return buildIndex(s.players, s.aliases); };

let pass = 0, fail = 0;
function check(desc, got, want) {
  const ok = got === want;
  ok ? pass++ : fail++;
  if (!ok) console.log(`  FALLITO  ${desc}\n           atteso "${want}", ottenuto "${got}"`);
}

function hit(id, guess, expected, found = new Set()) {
  const i = idx(id);
  const r = matchGuess(i, guess, found);
  check(`${id} · "${guess}"`, r.status === 'hit' ? r.entry.name : r.status, expected);
}

console.log('— cognome semplice, maiuscole, accenti —');
hit('dortmund-2013', 'reus', 'Marco Reus');
hit('dortmund-2013', 'HUMMELS', 'Mats Hummels');
hit('dortmund-2013', 'gotze', 'Mario Götze');
hit('dortmund-2013', 'Götze', 'Mario Götze');
hit('dortmund-2013', 'gundogan', 'İlkay Gündoğan');
hit('dortmund-2013', 'subotic', 'Neven Subotić');
hit('dortmund-2013', 'blaszczykowski', 'Jakub Błaszczykowski');

console.log('— alias e soprannomi —');
hit('dortmund-2013', 'lewa', 'Robert Lewandowski');
hit('dortmund-2013', 'kuba', 'Jakub Błaszczykowski');
hit('argentina-2022', 'dibu', 'Emiliano Martínez');
hit('roma-2001', 'batigol', 'Gabriel Batistuta');
hit('italia-2006', 'gigi buffon', 'Gianluigi Buffon');
hit('napoli-2023', 'kvara', 'Khvicha Kvaratskhelia');

console.log('— particelle nel cognome —');
hit('liverpool-2019', 'van dijk', 'Virgil van Dijk');
hit('liverpool-2019', 'vandijk', 'Virgil van Dijk');
hit('city-2023', 'de bruyne', 'Kevin De Bruyne');
hit('city-2023', 'kdb', 'Kevin De Bruyne');
hit('united-2008', 'van der sar', 'Edwin van der Sar');
hit('argentina-2022', 'di maria', 'Ángel Di María');
hit('argentina-2022', 'mac allister', 'Alexis Mac Allister');
hit('argentina-2022', 'macallister', 'Alexis Mac Allister');

console.log('— errori di battitura perdonati —');
hit('italia-2006', 'buffonn', 'Gianluigi Buffon');
hit('italia-2006', 'cannavarro', 'Fabio Cannavaro');
hit('barcelona-2015', 'iniiesta', 'Andrés Iniesta');
hit('liverpool-2019', 'alexander arnold', 'Trent Alexander-Arnold');

console.log('— nome e cognome invertiti —');
hit('milan-2007', 'maldini paolo', 'Paolo Maldini');

console.log('— omonimi risolti in ordine —');
{
  const i = idx('argentina-2022');
  const found = new Set();
  const a = matchGuess(i, 'martinez', found); found.add(a.entry.id);
  const b = matchGuess(i, 'martinez', found); found.add(b.entry.id);
  const c = matchGuess(i, 'martinez', found); found.add(c.entry.id);
  const d = matchGuess(i, 'martinez', found);
  check('tre Martínez, uno alla volta', [a,b,c].map(r=>r.entry.name).join(' | '),
    'Emiliano Martínez | Lisandro Martínez | Lautaro Martínez');
  check('quarto tentativo = doppione', d.status, 'duplicate');
}

console.log('— tentativi sbagliati —');
hit('dortmund-2013', 'messi', 'miss');
hit('dortmund-2013', 'totti', 'miss');
hit('dortmund-2013', 'ronaldo', 'miss');

console.log('— la guardia sul prefisso —');
{
  // caso costruito: un cognome che è il prefisso di un altro
  const i = buildIndex(['Marco Rossi', 'Luca Rossignoli']);
  const found = new Set();
  const exact = matchExact(i, 'rossi', found);
  check('"rossi" corrisponde a Rossi', exact.name, 'Marco Rossi');
  check('ma non si accetta da solo, c\'è Rossignoli',
    String(hasLongerCandidate(i, 'rossi', found, exact.id)), 'true');
  check('con invio invece sì', matchGuess(i, 'rossi', found).entry.name, 'Marco Rossi');
  const f2 = new Set([i.entries.find(e => e.name === 'Luca Rossignoli').id]);
  check('trovato Rossignoli, "rossi" si sblocca',
    String(hasLongerCandidate(i, 'rossi', f2, matchExact(i, 'rossi', f2).id)), 'false');
}

console.log('— nessun falso positivo fra rose diverse —');
{
  let leaks = 0;
  for (const s of squads) {
    const i = buildIndex(s.players, s.aliases);
    for (const other of squads) {
      if (other.id === s.id) continue;
      for (const p of other.players) {
        if (s.players.includes(p)) continue;
        const r = matchGuess(i, p, new Set());
        if (r.status === 'hit') {
          // varianti ortografiche dello stesso nome (Tiago / Thiago): volute
          const b = surnameOf(p);
          const variant = r.entry.keys.some((k) =>
            k === b
            || (Math.abs(k.length - b.length) === 1 && editDistance(k, b, 1) === 1));
          if (!variant) { leaks++; console.log(`    "${p}" → ${r.entry.name} (${s.name})`); }
        }
      }
    }
  }
  check('nessun accostamento assurdo fra squadre', String(leaks), '0');
}

console.log(`\n${pass} passati, ${fail} falliti`);
process.exit(fail ? 1 : 0);
