/* Il catalogo dei giocatori, condiviso da Chi è?, Catena e Impostore.
   L'indice è leggero e arriva subito; le carriere complete stanno in
   file più piccoli e si caricano solo quando servono. */

let indexPromise = null;
const shardPromises = new Map();
const SHARD = 400;

export function loadIndex() {
  if (!indexPromise) {
    indexPromise = fetch('data/players/index.json')
      .then((r) => r.json())
      .then((raw) => {
        const clubs = raw.clubs.map(([name, ...colors], id) => ({ id, name, colors }));
        const players = raw.players.map(([id, label, birthYear, nation, role, fame, clubIds, complete, deathYear]) => ({
          id, label, birthYear, nation, role, fame,
          clubs: clubIds, complete: Boolean(complete), deathYear: deathYear || null,
          weight: fame,
        }));
        const clubPlayers = new Map();
        players.forEach((p) => p.clubs.forEach((c) => {
          if (!clubPlayers.has(c)) clubPlayers.set(c, []);
          clubPlayers.get(c).push(p.id);
        }));
        return { clubs, players, clubPlayers, generated: raw.generated };
      });
  }
  return indexPromise;
}

export async function loadCareer(id) {
  const k = Math.floor(id / SHARD);
  if (!shardPromises.has(k)) {
    /* la versione dell'indice nell'indirizzo: dopo un aggiornamento dei dati
       nessuna cache può servire un pezzo vecchio accanto a un indice nuovo */
    const { generated } = await loadIndex();
    shardPromises.set(k, fetch(`data/players/careers-${k}.json?v=${generated}`).then((r) => r.json()));
  }
  const shard = await shardPromises.get(k);
  const c = shard[id];
  if (!c) return null;
  return {
    title: c.t,
    height: c.h || null,
    position: c.pos,
    youth: c.y.map(([from, to, club]) => ({ from, to, club })),
    clubs: c.c.map(([from, to, club, loan, caps, goals]) => ({
      from, to, club, loan: Boolean(loan), caps: caps < 0 ? null : caps, goals: goals < 0 ? null : goals,
    })),
    national: c.n.map(([from, to, nation, suffix, caps, goals]) => ({
      from, to, nation, suffix, caps: caps < 0 ? null : caps, goals: goals < 0 ? null : goals,
    })),
    honours: c.hon.map(([kind, group, comp, label, year, result]) => ({
      kind: { c: 'club', n: 'national', i: 'individual' }[kind] || 'club',
      group, comp, label, year,
      result: { w: 'winner', r: 'runnerup', t: 'third', s: 'semifinal' }[result] || 'winner',
    })),
  };
}

export function wikiUrl(title) {
  return `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}`;
}

/** anni come nelle schede: 2016–2019, 2019–, 2020 */
export function yearsLabel(from, to) {
  if (!from) return '';
  if (!to) return `${from}–`;
  if (to === from) return String(from);
  return `${from}–${to}`;
}
