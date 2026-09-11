/* La sfida quotidiana deve essere identica per tutti e corretta nei contenuti. */

import { readFileSync } from 'node:fs';
import { buildDay } from '../src/rounds/builders.js';
import { rngFor } from '../src/core/rng.js';

const squads = JSON.parse(readFileSync(new URL('../data/squads.json', import.meta.url), 'utf8')).squads;
const byPlayer = new Map();
for (const s of squads) for (const p of s.players) {
  if (!byPlayer.has(p)) byPlayer.set(p, new Set());
  byPlayer.get(p).add(s.id);
}

let pass = 0, fail = 0;
const check = (d, ok, extra = '') => { ok ? pass++ : (fail++, console.log(`  FALLITO  ${d} ${extra}`)); };

console.log('— stessa data, stessa sfida —');
{
  const a = JSON.stringify(buildDay(rngFor('daily', '2026-09-10'), squads));
  const b = JSON.stringify(buildDay(rngFor('daily', '2026-09-10'), squads));
  const c = JSON.stringify(buildDay(rngFor('daily', '2026-09-11'), squads));
  check('due generazioni dello stesso giorno coincidono', a === b);
  check('un giorno diverso dà una sfida diversa', a !== c);
}

console.log('— ogni giorno per un anno è ben formato —');
{
  let problemi = 0;
  const tipi = new Map();
  for (let i = 0; i < 365; i++) {
    const d = new Date(Date.UTC(2026, 0, 1 + i)).toISOString().slice(0, 10);
    const rounds = buildDay(rngFor('daily', d), squads);
    if (rounds.length !== 5) { problemi++; continue; }
    for (const r of rounds) {
      tipi.set(r.type, (tipi.get(r.type) || 0) + 1);
      const giuste = r.options.filter((o) => o.correct).length;
      if (giuste !== 1) { problemi++; console.log(`   ${d} ${r.type}: ${giuste} risposte giuste`); }
      if (r.options.length < 2) problemi++;

      if (r.type === 'intruder') {
        const dentro = r.reveal.team.players;
        const intruso = r.options.find((o) => o.correct).label;
        if (dentro.includes(intruso)) { problemi++; console.log(`   ${d}: l'intruso era in rosa`); }
        for (const o of r.options) {
          if (!o.correct && !dentro.includes(o.label)) {
            problemi++; console.log(`   ${d}: ${o.label} non è del ${r.reveal.team.name}`);
          }
        }
      }

      if (r.type === 'teammates') {
        const [a, b] = r.pair;
        const insieme = [...(byPlayer.get(a) || [])].some((id) => byPlayer.get(b)?.has(id));
        const rispostaSi = r.options.find((o) => o.correct).label === 'daily.yes';
        if (insieme !== rispostaSi) {
          problemi++; console.log(`   ${d}: "${a}" + "${b}" → risposta incoerente`);
        }
        if (a === b) { problemi++; console.log(`   ${d}: stesso giocatore due volte`); }
      }

      if (r.type === 'whichTeam' || r.type === 'drip') {
        const team = r.reveal.team;
        for (const c of r.clues) {
          if (!team.players.includes(c)) {
            problemi++; console.log(`   ${d}: indizio "${c}" non è del ${team.name}`);
          }
          // nessuna opzione sbagliata deve contenere un indizio
          for (const o of r.options) {
            if (o.correct) continue;
            const s2 = squads.find((x) => `${x.name} ${x.season}` === o.label);
            if (s2 && s2.players.includes(c)) {
              problemi++;
              console.log(`   ${d}: "${c}" gioca anche nel ${s2.name} ${s2.season}, opzione ambigua`);
            }
          }
        }
      }
    }
  }
  check('365 giorni senza un round malformato', problemi === 0, `(${problemi} problemi)`);
  console.log('   tipi usati:', [...tipi].map(([k, v]) => `${k} ${v}`).join(' · '));
}

console.log('— le opzioni non si ripetono —');
{
  let dup = 0;
  for (let i = 0; i < 200; i++) {
    const d = new Date(Date.UTC(2026, 0, 1 + i)).toISOString().slice(0, 10);
    for (const r of buildDay(rngFor('daily', d), squads)) {
      const etichette = r.options.map((o) => o.label);
      if (new Set(etichette).size !== etichette.length) {
        dup++; console.log(`   ${d} ${r.type}: opzioni doppie`);
      }
      if (r.clues && new Set(r.clues).size !== r.clues.length) {
        dup++; console.log(`   ${d} ${r.type}: indizi doppi`);
      }
    }
  }
  check('nessuna opzione o indizio ripetuto', dup === 0, `(${dup})`);
}

console.log(`\n${pass} passati, ${fail} falliti`);
process.exit(fail ? 1 : 0);
