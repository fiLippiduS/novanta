/* ALLENATORE — la carriera in panchina.
   Rose vere, una partita alla volta con le scelte che contano, la classifica
   che si muove giornata per giornata, una società che giudica e un mercato.
   La logica sta in src/manager/: qui ci sono solo le schermate. */

import { t, lang } from '../core/i18n.js';
import * as audio from '../core/audio.js';
import { go } from '../core/router.js';
import { el, topbar, crest, sheet } from '../ui/components.js';
import { stagger } from '../ui/motion.js';
import { countryName, flagEmoji, ensureFlagFont } from '../ui/flags.js';
import { STYLES, STYLE_IDS, FORMATIONS, FORMATION_IDS, MENTALITY_IDS, playerAffinity } from '../manager/tactics.js';
import { DEPT, ageOf, valueOf, potentialRange } from '../manager/players.js';
import { slotScore, available } from '../manager/lineup.js';
import { zones, matchdayDate } from '../manager/league.js';
import {
  MANAGER_VERSION, newCareer, leagueOf, squadOf, table, nextFixture, startUserMatch, applyMatch, simulateRest,
  closeMatchday, refreshUserLineup, endSeason, beginNextSeason, jobOffers, takeJob, currentStrength, objectiveFor, isDerby,
} from '../manager/career.js';
import { planWeek, resolve, oddsFor } from '../manager/events.js';
import { adviseMoment, decide, restoreMatch, serializeMatch, tick } from '../manager/match.js';
import { dueCup, userTie, startCupMatch, closeCupRound, currentTies, groupTable, roundKey } from '../manager/cups.js';
import {
  button, chip, clubBadge, meter, ovrBadge, roleTag, playerRow, sparkline, attrBars, formLetters, euro, countryLabel, pitchSvg, fitnessBar, moraleIcon, statusTags, phaseChip,
} from './allenatore/ui.js';
import { mountLive } from './allenatore/live.js';
import { renderMarket } from './allenatore/market.js';
import { incomingOffers, renewalTerms, renew, release, setListed, windowOpen } from '../manager/market.js';

const SAVE_KEY = 'novanta:manager';
const META_KEY = 'novanta:manager-meta';

let cache = null;
async function loadData() {
  const l = lang();
  if (cache && cache.lang === l) return cache;
  const get = (f) => fetch(`data/manager/${f}`).then((r) => r.json());
  const leagues = await get('leagues.json');
  const squadsList = await Promise.all(leagues.leagues.map((lg) => get(`squads-${lg.id}.json`)));
  const [events, text] = await Promise.all([
    get('events.json'),
    fetch(`data/manager/text.${l}.json`).then((r) => (r.ok ? r.json() : null)).catch(() => null),
  ]);
  const fallback = text ? null : await get('text.en.json');
  const squads = {};
  leagues.leagues.forEach((lg, i) => { squads[lg.id] = squadsList[i].squads; });
  cache = { lang: l, data: { leagues, squads }, events: events.events, text: text || fallback };
  return cache;
}

export function managerMeta() {
  try { return JSON.parse(localStorage.getItem(META_KEY) || 'null'); } catch { return null; }
}

export async function mount(host) {
  ensureFlagFont();
  const shell = el('div', 'shell manager');
  const bar = topbar({ title: t('allenatore.title'), onExit: () => go('hub') });
  const stage = el('div', 'mgr__stage');
  shell.append(bar.el, stage);
  host.appendChild(shell);
  stage.appendChild(el('p', 'dim center', t('common.loading')));

  const { data, events, text } = await loadData();
  let career = loadCareer();
  let view = career ? homeView() : 'intro';
  let draft = null;
  let live = null;          // la partita in corso, se c'è
  let liveTeardown = null;
  let report = null;
  let selectedSlot = null;
  let tableMd = null;

  function loadCareer() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      const c = JSON.parse(raw);
      return c && c.v === MANAGER_VERSION ? c : null;
    } catch { return null; }
  }

  function persist() {
    if (!career) return;
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(career));
      const row = table(career, data).find((r) => r.id === career.club);
      localStorage.setItem(META_KEY, JSON.stringify({ club: career.clubs[career.club].name, season: career.season, pos: row?.pos || null, trophies: career.coach.trophies.length }));
    } catch (e) {
      console.error(e);
      sheet({ title: t('allenatore.saveFailTitle'), body: el('p', 'dim', t('allenatore.saveFail')), actions: [{ label: t('common.close'), variant: 'btn--go', onClick: (c) => c() }] });
    }
  }

  function homeView() {
    if (!career) return 'intro';
    if (career.live) return 'match';
    if (career.cupReport) return 'cupReport';
    if (career.phase === 'sacked') return 'offers';
    if (career.phase === 'summer') return 'season';
    return 'hub';
  }

  const tx = (id) => text[id] || {};
  const fill = (s, vars = {}) => String(s || '').replace(/\{(\w+)\}/g, (m, k) => (vars[k] !== undefined ? vars[k] : m));
  const clubName = (id) => career.clubs[id]?.name || data.leagues.clubs[id]?.name || id;
  const league = () => leagueOf(data, career.league);

  /* ---------------------------------------------------------------- */
  /* navigazione                                                      */
  /* ---------------------------------------------------------------- */

  const TABS = ['hub', 'squad', 'tactics', 'market', 'table', 'fixtures', 'coach'];

  function render(opts = {}) {
    const keepTop = opts.keepScroll ? window.scrollY : 0;
    if (liveTeardown && view !== 'match') { liveTeardown(); liveTeardown = null; }
    stage.innerHTML = '';
    bar.setTitle(career ? career.clubs[career.club].name : t('allenatore.title'));
    const views = {
      intro: renderIntro, create: renderCreate, hub: renderHub, squad: renderSquad, tactics: renderTactics,
      table: renderTable, fixtures: renderFixtures, coach: renderCoach, match: renderMatch, report: renderReport,
      season: renderSeason, offers: renderOffers,
      cupReport: renderCupReport,
      market: () => { stage.appendChild(statusStrip()); renderMarket(stage, { career, data, persist, rerender: () => render({ keepScroll: true }), clubName }); },
    };
    (views[view] || renderHub)();
    if (career && TABS.includes(view)) stage.appendChild(tabBar());
    window.scrollTo({ top: keepTop, behavior: 'instant' });
  }

  function goView(v) { view = v; audio.sfx.tick(); render(); }

  function tabBar() {
    const nav = el('nav', 'mtabs');
    for (const id of TABS) {
      const b = el('button', `mtabs__b ${view === id ? 'is-on' : ''}`);
      b.type = 'button';
      b.append(el('span', 'mtabs__i', { hub: '◉', squad: '☰', tactics: '▦', market: '€', table: '≡', fixtures: '▤', coach: '★' }[id]), el('span', 'mtabs__l label', t(`allenatore.tabs.${id}`)));
      b.addEventListener('click', () => goView(id));
      nav.appendChild(b);
    }
    return nav;
  }

  /** la fascia fissa in cima: posizione, punti, obiettivo, fiducia */
  function statusStrip() {
    const rows = table(career, data);
    const me = rows.find((r) => r.id === career.club);
    const strip = el('div', 'mstrip card');
    const club = career.clubs[career.club];
    const left = el('div', 'mstrip__club');
    left.append(crest(club.colors, 30), el('div', 'mstrip__txt'));
    left.lastChild.append(el('strong', 'mstrip__name', club.name), el('span', 'label', `${league().name} · ${career.season}/${String(career.season + 1).slice(2)}`));
    const nums = el('div', 'mstrip__nums');
    const pos = el('div', 'mstrip__n');
    pos.append(el('strong', 'display num', me && me.p ? `${me.pos}°` : '—'), el('span', 'label', t('allenatore.position')));
    const pts = el('div', 'mstrip__n');
    pts.append(el('strong', 'display num', String(me ? me.pts : 0)), el('span', 'label', t('allenatore.points')));
    const obj = el('div', 'mstrip__n');
    obj.append(el('strong', 'display num', `${career.board.objective.target}°`), el('span', 'label', t('allenatore.goal')));
    nums.append(pos, pts, obj);
    const meters = el('div', 'mstrip__meters');
    meters.append(
      meter(t('allenatore.trust'), career.board.trust, { tone: career.board.trust < 30 ? 'flare' : career.board.trust < 50 ? 'amber' : 'lime' }),
      meter(t('allenatore.fans'), career.board.fans, { tone: 'sky' }),
    );
    strip.append(left, nums, meters);
    if (career.board.ultimatum) {
      const u = career.board.ultimatum;
      strip.appendChild(el('p', 'mstrip__alert', t('allenatore.ultimatumLine', { left: u.left, need: u.need, points: u.points })));
    }
    return strip;
  }

  /* ---------------------------------------------------------------- */
  /* 1. ingresso e creazione                                          */
  /* ---------------------------------------------------------------- */

  function renderIntro() {
    const box = el('div', 'mgr__intro card halftone misreg card--print anim-rise');
    box.append(el('h3', 'display t-xxl', t('allenatore.title')), el('p', 'mgr__lead', t('allenatore.lead')), el('p', 'dim', t('allenatore.introText')));
    const feats = el('ul', 'mgr__feats');
    for (const k of ['squads', 'match', 'table', 'events', 'players']) feats.appendChild(el('li', '', t(`allenatore.features.${k}`)));
    box.appendChild(feats);
    const fresh = button(t('allenatore.new'), 'btn--go btn--lg btn--block', () => {
      draft = { step: 0, name: '', nation: null, style: null, league: null, club: null };
      goView('create');
    });
    box.appendChild(fresh);
    stage.appendChild(box);
  }

  const STEPS = ['name', 'nation', 'style', 'league', 'club'];

  function renderCreate() {
    const step = STEPS[draft.step];
    const box = el('div', 'mgr__create card halftone misreg card--print');
    const top = el('div', 'mgr__topline');
    const back = el('button', 'mgr__back label', `← ${t('common.back')}`);
    back.type = 'button';
    back.addEventListener('click', () => { if (draft.step === 0) { view = career ? homeView() : 'intro'; } else draft.step--; render(); });
    const pips = el('div', 'pips');
    STEPS.forEach((_, i) => pips.appendChild(el('i', `pip ${i < draft.step ? 'pip--full' : ''} ${i === draft.step ? 'pip--now' : ''}`)));
    top.append(back, pips);
    box.appendChild(top);
    const next = () => { draft.step++; audio.sfx.tick(); render(); };

    if (step === 'name') {
      box.append(el('h3', 'display t-xl', t('allenatore.create.name')), el('p', 'dim', t('allenatore.create.nameText')));
      const form = el('form', 'mgr__form');
      const input = el('input', 'squad__input');
      input.type = 'text'; input.maxLength = 28; input.value = draft.name; input.placeholder = t('allenatore.create.namePh');
      input.autocomplete = 'off';
      const ok = button(t('allenatore.create.next'), 'btn--go btn--block');
      ok.type = 'submit';
      form.append(input, ok);
      form.addEventListener('submit', (e) => { e.preventDefault(); const v = input.value.trim(); if (v.length < 2) { input.focus(); return; } draft.name = v; next(); });
      box.appendChild(form);
      setTimeout(() => input.focus(), 50);
    }

    if (step === 'nation') {
      box.append(el('h3', 'display t-xl', t('allenatore.create.nation')));
      const codes = [...new Set(Object.values(data.squads).flatMap((s) => Object.values(s).flatMap((rows) => rows.map((r) => r[2]))).filter(Boolean))];
      const named = codes.map((c) => [c, countryName(c)]).sort((a, b) => a[1].localeCompare(b[1]));
      const search = el('input', 'squad__input mgr__natsearch');
      search.placeholder = t('allenatore.create.nationPh');
      const grid = el('div', 'natgrid');
      const draw = () => {
        grid.innerHTML = '';
        const q = search.value.trim().toLowerCase();
        const top = ['IT', 'GB-ENG', 'ES', 'DE', 'FR', 'PT', 'BR', 'AR', 'NL'];
        const list = q ? named.filter(([, n]) => n.toLowerCase().includes(q)) : [...top.map((c) => [c, countryName(c)]), ...named.filter(([c]) => !top.includes(c))].slice(0, 30);
        for (const [code, name] of list.slice(0, 40)) {
          const b = el('button', 'natcell', `${flagEmoji(code)} ${name}`);
          b.type = 'button';
          b.addEventListener('click', () => { draft.nation = code; next(); });
          grid.appendChild(b);
        }
      };
      search.addEventListener('input', draw);
      draw();
      box.append(search, grid);
    }

    if (step === 'style') {
      box.append(el('h3', 'display t-xl', t('allenatore.create.style')), el('p', 'dim', t('allenatore.create.styleText')));
      const grid = el('div', 'mstyles');
      for (const id of STYLE_IDS) grid.appendChild(styleCard(id, draft.style === id, () => { draft.style = id; next(); }));
      box.appendChild(grid);
      stagger(grid.children, 'anim-rise', 30);
    }

    if (step === 'league') {
      box.append(el('h3', 'display t-xl', t('allenatore.create.league')));
      const grid = el('div', 'mleagues');
      for (const lg of data.leagues.leagues) {
        const b = el('button', 'optcard mleague');
        b.type = 'button';
        const clubs = lg.clubs.map((id) => data.leagues.clubs[id]);
        b.append(
          el('strong', 'optcard__t display', `${flagEmoji(lg.code)} ${lg.name}`),
          el('span', 'optcard__d', t(lg.level === 1 ? 'allenatore.create.top' : 'allenatore.create.second', { n: lg.teams })),
          el('span', 'optcard__k label', clubs.sort((a, c) => c.strength - a.strength).slice(0, 3).map((c) => c.name).join(' · ')),
        );
        b.addEventListener('click', () => { draft.league = lg.id; next(); });
        grid.appendChild(b);
      }
      box.appendChild(grid);
      stagger(grid.children, 'anim-rise', 30);
    }

    if (step === 'club') {
      const lg = leagueOf(data, draft.league);
      box.append(el('h3', 'display t-xl', t('allenatore.create.club')), el('p', 'dim', t('allenatore.create.clubText')));
      const list = el('div', 'mclubs');
      const clubs = lg.clubs.map((id) => data.leagues.clubs[id]).sort((a, b) => b.strength - a.strength);
      clubs.forEach((c, i) => {
        const b = el('button', 'mclubpick');
        b.type = 'button';
        const obj = objectiveFor(lg, i + 1);
        const stars = Math.max(1, Math.min(5, Math.round((c.strength - 58) / 6)));
        b.append(
          clubBadge(c, { size: 30, sub: t(`allenatore.objectivesShort.${obj.id}`) }),
          el('span', 'mclubpick__stars', '★'.repeat(stars) + '☆'.repeat(5 - stars)),
          el('span', 'mclubpick__str display num', String(Math.round(c.strength))),
        );
        b.addEventListener('click', () => confirmClub(c, lg, obj));
        list.appendChild(b);
      });
      box.appendChild(list);
    }
    stage.appendChild(box);
  }

  function styleCard(id, on, onClick) {
    const st = STYLES[id];
    const b = el('button', `optcard mstyle ${on ? 'is-on' : ''}`);
    b.type = 'button';
    const bars = el('div', 'mstyle__bars');
    const scale = (v, lo, hi) => Math.round(((v - lo) / (hi - lo)) * 100);
    for (const [k, v] of [['possession', scale(st.possession, 0.7, 1.15)], ['press', scale(st.press, 0.5, 1.5)], ['risk', scale(st.line, 0.5, 1.35)], ['fatigue', scale(st.fatigue, 0.75, 1.35)]]) {
      const r = el('span', 'mstyle__bar');
      const i = el('i'); i.style.width = `${Math.max(6, Math.min(100, v))}%`;
      r.append(el('span', 'label', t(`allenatore.styleBars.${k}`)), el('span', 'mstyle__track'));
      r.lastChild.appendChild(i);
      bars.appendChild(r);
    }
    b.append(el('strong', 'optcard__t display', t(`allenatore.styles.${id}.name`)), el('span', 'optcard__d', t(`allenatore.styles.${id}.desc`)), bars);
    if (onClick) b.addEventListener('click', onClick);
    return b;
  }

  function confirmClub(c, lg, obj) {
    const body = el('div', 'stack');
    const squad = data.squads[lg.id][c.id];
    const best = [...squad].sort((a, b) => b[4] - a[4]).slice(0, 5).map((r) => `${r[0]} ${r[4]}`).join(' · ');
    body.append(
      clubBadge(c, { size: 44, sub: `${flagEmoji(lg.code)} ${lg.name}${c.ground ? ` · ${c.ground}` : ''}` }),
      el('p', '', t('allenatore.create.confirm', { objective: t(`allenatore.objectives.${obj.id}`), target: obj.target, players: squad.filter((r) => !r[9].includes('o')).length })),
      el('p', 'dim', `${t('allenatore.create.stars')}: ${best}`),
    );
    sheet({
      title: t('allenatore.create.sign'),
      body,
      actions: [
        { label: t('common.cancel'), onClick: (close) => close() },
        { label: t('allenatore.create.signBtn'), variant: 'btn--go', onClick: (close) => { close(); startCareer(c.id); } },
      ],
    });
  }

  function startCareer(clubId) {
    const seed = (Date.now() ^ Math.floor(Math.random() * 1e9)) >>> 0;
    career = newCareer(data, { seed, name: draft.name, nation: draft.nation, style: draft.style, clubId });
    planWeek(career, data, events);
    persist();
    audio.sfx.win?.();
    view = 'hub';
    render();
  }

  /* ---------------------------------------------------------------- */
  /* 2. la panchina: prossima partita, decisioni, classifica           */
  /* ---------------------------------------------------------------- */

  /* i turni di coppa in cui l'utente non c'è più si giocano da soli */
  function runSilentCups() {
    let cup;
    let changed = false;
    let guard = 0;
    while ((cup = dueCup(career)) && cup.silent && guard++ < 20) { closeCupRound(career, data, cup.id); changed = true; }
    if (changed) persist();
  }

  function cupName(cup) {
    return cup.id === 'national' ? cup.name : t(`allenatore.zones.${cup.comp}`);
  }

  function renderHub() {
    runSilentCups();
    stage.appendChild(statusStrip());
    const cupDue = dueCup(career);

    if (career.phase === 'seasonEnd' && !cupDue) {
      const end = el('div', 'mcard card anim-rise');
      end.append(el('h3', 'display t-xl', t('allenatore.seasonOver')), el('p', 'dim', t('allenatore.seasonOverText')));
      end.appendChild(button(t('allenatore.seeVerdict'), 'btn--go btn--lg btn--block', () => {
        endSeason(career, data);
        persist();
        goView(career.phase === 'sacked' ? 'offers' : 'season');
      }));
      stage.appendChild(end);
      stage.appendChild(compactTable());
      return;
    }

    const nf = nextFixture(career);
    if (cupDue) stage.appendChild(fixtureCard({ cup: cupDue, tie: userTie(career, cupDue) }));
    else if (nf) stage.appendChild(fixtureCard(nf));
    const q = career.queue || [];
    if (q.length) {
      const wrap = el('section', 'mdecisions');
      wrap.appendChild(el('h3', 'mhead display', t('allenatore.toDecide', { n: q.length })));
      q.forEach((item) => wrap.appendChild(eventCard(item)));
      stage.appendChild(wrap);
    }
    stage.appendChild(compactTable());
    if (career.lastReport) stage.appendChild(lastRoundCard(career.lastReport));
    stage.appendChild(inboxCard());
  }

  function fixtureCard(nf) {
    if (nf.cup) {
      const home = nf.tie.h === career.club;
      nf = { ...nf, home, opponent: home ? nf.tie.a : nf.tie.h, md: career.md - 1 };
    }
    const opp = career.clubs[nf.opponent] || data.leagues.clubs[nf.opponent];
    const card = el('div', `mfixture card anim-rise ${nf.cup ? 'mfixture--cup' : ''}`);
    const rows = table(career, data);
    const oppRow = rows.find((r) => r.id === nf.opponent);
    const meRow = rows.find((r) => r.id === career.club);
    const date = matchdayDate(career.season, nf.md, career.fixtures.length);
    const head = el('div', 'mfixture__head');
    const final = nf.cup && roundKey(nf.cup) === 'final';
    const where = final ? chip(t('allenatore.cup.neutral'), 'amber') : chip(t(nf.home ? 'allenatore.home' : 'allenatore.away'), nf.home ? 'lime' : 'sky');
    head.append(el('span', 'label', nf.cup ? `${cupName(nf.cup)} · ${t(`allenatore.cupRounds.${roundKey(nf.cup)}`)}` : `${t('allenatore.matchday', { n: nf.md + 1 })} · ${date.toLocaleDateString(lang(), { day: 'numeric', month: 'short' })}`), where);
    const vs = el('div', 'mfixture__vs');
    const mine = career.clubs[career.club];
    const side = (club, row) => {
      const b = el('div', 'mfixture__side');
      b.append(crest(club.colors, 48), el('strong', 'mfixture__name', club.name), el('span', 'label', row && row.p ? `${row.pos}° · ${row.pts} ${t('allenatore.pts')}` : '—'));
      if (row && row.form.length) b.appendChild(formLetters(row.form));
      return b;
    };
    vs.append(nf.home ? side(mine, meRow) : side(opp, oppRow), el('span', 'mfixture__x display', 'VS'), nf.home ? side(opp, oppRow) : side(mine, meRow));
    card.append(head, vs);
    const tags = el('div', 'mfixture__tags');
    if (isDerbyNow(nf)) tags.appendChild(chip(t('allenatore.derby'), 'flare'));
    if (opp.style) tags.appendChild(chip(`${t('allenatore.theirStyle')}: ${t(`allenatore.styles.${opp.style}.name`)}`, 'dim'));
    tags.appendChild(chip(`${t('allenatore.strength')} ${Math.round(currentStrength(career, career.club))} – ${Math.round(career.clubs[nf.opponent] ? currentStrength(career, nf.opponent) : opp.strength)}`, 'dim'));
    if (career.flags.coachBan) tags.appendChild(chip(t('allenatore.coachBanned'), 'warn'));
    if (windowOpen(career)) {
      const n = (career.offersIn || []).length;
      const m = el('button', 'mchip mchip--lime mchip--btn', n ? t('allenatore.market.openOffers', { n }) : t('allenatore.market.open'));
      m.type = 'button';
      m.addEventListener('click', () => goView('market'));
      tags.appendChild(m);
    }
    card.appendChild(tags);
    const unavailable = squadOf(career, career.club).filter((p) => p.injury || p.suspended);
    if (unavailable.length) card.appendChild(el('p', 'mfixture__out dim', `${t('allenatore.unavailable')}: ${unavailable.map((p) => `${p.name.split(' ').pop()}${p.injury ? ' ✚' : ' ▮'}`).join(', ')}`));
    const actions = el('div', 'mfixture__actions');
    const blocked = (career.queue || []).length > 0;
    actions.append(
      button(t('allenatore.lineup'), 'btn--ghost', () => goView('tactics')),
      button(t('allenatore.quickSim'), 'btn--ghost', () => { if (!blocked) quickMatch(nf.cup || null); }),
    );
    const play = button(blocked ? t('allenatore.decideFirst') : t('allenatore.play'), `btn--go btn--lg ${blocked ? 'is-blocked' : ''}`, () => {
      if (blocked) { stage.querySelector('.mdecisions')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
      startLive(nf.cup || null);
    });
    actions.appendChild(play);
    card.appendChild(actions);
    return card;
  }

  function isDerbyNow(nf) {
    return isDerby(career, career.club, nf.opponent);
  }

  /* un imprevisto da decidere, con l'esito che resta sulla carta dopo la scelta */
  function eventCard(item) {
    const ev = events.find((e) => e.id === item.id);
    const txt = tx(item.id);
    const subject = item.player ? career.players[item.player] : null;
    const card = el('article', `mevent card mevent--${ev.cat}`);
    card.dataset.key = item.key;
    const head = el('div', 'mevent__head');
    head.append(chip(t(`allenatore.cats.${ev.cat}`), catTone(ev.cat)));
    if (subject) head.appendChild(playerMini(subject));
    card.append(head, el('h4', 'mevent__t', fill(txt.t, item.vars)), el('p', 'mevent__d', fill(txt.d, item.vars)));
    const opts = el('div', 'mevent__opts');
    ev.o.forEach((opt, i) => {
      const label = fill(txt.o?.[i]?.l, item.vars);
      const b = el('button', 'mevent__opt');
      b.type = 'button';
      b.appendChild(el('span', 'mevent__l', label));
      const odds = oddsFor(career, opt, subject);
      if (odds !== null) b.appendChild(el('span', `mevent__risk label ${odds >= 0.6 ? 'is-safe' : odds <= 0.4 ? 'is-risky' : ''}`, t(odds >= 0.6 ? 'allenatore.risk.low' : odds <= 0.4 ? 'allenatore.risk.high' : 'allenatore.risk.mid')));
      b.addEventListener('click', () => {
        const res = resolve(career, data, events, item.key, i);
        refreshUserLineup(career);
        persist();
        audio.sfx.tick();
        showOutcome(card, ev, txt, res, item);
      });
      opts.appendChild(b);
    });
    card.appendChild(opts);
    return card;
  }

  function showOutcome(card, ev, txt, res, item) {
    card.classList.add('is-done');
    const opts = card.querySelector('.mevent__opts');
    const out = el('div', `mevent__out ${res.outcome ? `is-${res.outcome}` : ''}`);
    const o = txt.o?.[res.option] || {};
    const line = res.outcome === 'bad' ? (o.rb || o.r) : o.r;
    out.appendChild(el('p', '', fill(line, item.vars)));
    const chips = el('div', 'mevent__chips');
    for (const c of res.changes) chips.appendChild(changeChip(c));
    if (chips.children.length) out.appendChild(chips);
    const ok = button(t('allenatore.understood'), 'btn--ghost btn--block', () => render({ keepScroll: true }));
    out.appendChild(ok);
    opts.replaceWith(out);
    out.animate([{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 260, easing: 'cubic-bezier(0.16,0.84,0.28,1)' });
    void ev;
  }

  function changeChip(c) {
    const pos = typeof c.value === 'number' ? c.value > 0 : true;
    const sign = typeof c.value === 'number' && c.value > 0 ? '+' : '';
    const name = c.player && career.players[c.player] ? career.players[c.player].name.split(' ').pop() : c.name || '';
    const good = { injury: false, suspended: false, coachBan: false, sold: true, loanOut: true, noRenew: true };
    const tone = c.kind in good ? (good[c.kind] ? 'sky' : 'bad') : pos ? 'lime' : 'bad';
    const val = c.kind === 'budget' || c.kind === 'sold' ? euro(Math.abs(c.value)) : typeof c.value === 'number' ? `${sign}${c.value}` : '';
    const label = t(`allenatore.change.${c.kind}`, { name, value: val, role: c.kind === 'newRole' ? t(`allenatore.roles.${c.value}`) : '' });
    return chip(label, tone);
  }

  function catTone(cat) {
    return { board: 'amber', press: 'sky', dressing: 'lime', player: 'lime', medical: 'bad', fans: 'flare', market: 'sky', youth: 'lime', rival: 'flare', private: 'amber', finance: 'amber', staff: 'sky', style: 'lime', national: 'sky' }[cat] || 'dim';
  }

  function playerMini(p) {
    const b = el('button', 'mpmini');
    b.type = 'button';
    b.append(roleTag(p.role), el('span', 'mpmini__n', p.name), ovrBadge(p.ovr));
    b.addEventListener('click', () => playerSheet(p.id));
    return b;
  }

  function compactTable() {
    const rows = table(career, data);
    const lg = league();
    const z = zones(lg);
    const card = el('section', 'mtable card');
    const head = el('div', 'mtable__head');
    head.append(el('h3', 'mhead display', t('allenatore.standings')), button(t('allenatore.fullTable'), 'btn--ghost mtable__more', () => goView('table')));
    card.appendChild(head);
    const me = rows.findIndex((r) => r.id === career.club);
    const pick = new Set([0, 1, 2, me - 1, me, me + 1, rows.length - 1].filter((i) => i >= 0 && i < rows.length));
    let lastI = -1;
    for (const i of [...pick].sort((a, b) => a - b)) {
      if (lastI >= 0 && i > lastI + 1) card.appendChild(el('div', 'mtable__gap', '···'));
      card.appendChild(tableRow(rows[i], z));
      lastI = i;
    }
    return card;
  }

  function tableRow(r, z, movement = 0) {
    const row = el('div', `mtrow ${r.id === career.club ? 'is-me' : ''} ${z[r.pos] && r.p > 0 ? `z-${z[r.pos]}` : ''}`);
    const club = career.clubs[r.id];
    const mv = el('span', `mtrow__mv ${movement > 0 ? 'is-up' : movement < 0 ? 'is-down' : ''}`, movement > 0 ? `▲${movement}` : movement < 0 ? `▼${-movement}` : '');
    row.append(
      el('span', 'mtrow__pos num', String(r.pos)), mv, crest(club.colors, 16), el('span', 'mtrow__name', club.name),
      el('span', 'mtrow__n num', String(r.p)), el('span', 'mtrow__n num dim-sm', `${r.gd > 0 ? '+' : ''}${r.gd}`), el('strong', 'mtrow__pts num', String(r.pts)),
    );
    return row;
  }

  function lastRoundCard(rep) {
    const card = el('section', 'mcard card');
    card.appendChild(el('h3', 'mhead display', t('allenatore.lastRound', { n: rep.md + 1 })));
    const round = career.fixtures[rep.md] || [];
    const list = el('div', 'mresults');
    for (const f of round) {
      if (!f.res) continue;
      const r = el('div', `mres ${f.h === career.club || f.a === career.club ? 'is-me' : ''}`);
      r.append(el('span', 'mres__h', clubName(f.h)), el('strong', 'mres__s num', `${f.res[0]}–${f.res[1]}`), el('span', 'mres__a', clubName(f.a)));
      list.appendChild(r);
    }
    card.appendChild(list);
    return card;
  }

  function inboxCard() {
    const card = el('section', 'mcard card');
    card.appendChild(el('h3', 'mhead display', t('allenatore.inbox')));
    const items = [...(career.log || []).slice(0, 4).map((l) => ({ type: 'log', l })), ...career.inbox.slice(0, 3).map((m) => ({ type: 'msg', m }))];
    if (!items.length) card.appendChild(el('p', 'dim', t('allenatore.inboxEmpty')));
    for (const it of items) {
      if (it.type === 'msg') {
        const m = it.m;
        card.appendChild(el('p', 'minbox__i', t(`allenatore.msg.${m.key}`, { ...m.vars, objective: m.vars.objective ? t(`allenatore.objectives.${m.vars.objective}`) : '', budget: m.vars.budget != null ? euro(m.vars.budget) : '' })));
      } else {
        const txt = tx(it.l.id);
        card.appendChild(el('p', 'minbox__i dim', `${t('allenatore.matchday', { n: it.l.md + 1 })} · ${fill(txt.t, it.l.vars)}`));
      }
    }
    return card;
  }

  /* ---------------------------------------------------------------- */
  /* 3. rosa e scheda del giocatore                                    */
  /* ---------------------------------------------------------------- */

  function renderSquad() {
    stage.appendChild(statusStrip());
    const players = squadOf(career, career.club);
    const lastEvo = new Map((career.lastReport?.evolution || []).map((e) => [e.id, e.delta]));
    for (const dept of ['POR', 'DIF', 'CEN', 'ATT']) {
      const group = players.filter((p) => DEPT[p.role] === dept && !p.loanOut).sort((a, b) => b.ovr - a.ovr);
      if (!group.length) continue;
      const sec = el('section', 'msquad card');
      sec.appendChild(el('h3', 'mhead display', `${t(`allenatore.depts.${dept}`)} · ${group.length}`));
      for (const p of group) sec.appendChild(playerRow(p, career.season, { onClick: () => playerSheet(p.id), delta: lastEvo.get(p.id) || 0 }));
      stage.appendChild(sec);
    }
    const away = players.filter((p) => p.loanOut).sort((a, b) => b.ovr - a.ovr);
    if (away.length) {
      const sec = el('section', 'msquad card');
      sec.append(el('h3', 'mhead display', `${t('allenatore.loanedOut')} · ${away.length}`), el('p', 'dim', t('allenatore.loanedOutText')));
      for (const p of away) sec.appendChild(playerRow(p, career.season, { onClick: () => playerSheet(p.id) }));
      stage.appendChild(sec);
    }
    const wage = players.reduce((n, p) => n + p.wage, 0);
    stage.appendChild(el('p', 'dim center', t('allenatore.squadMoney', { n: players.length, wages: euro(wage), budget: euro(career.clubs[career.club].budget) })));
  }

  function playerSheet(id) {
    const p = career.players[id];
    if (!p) return;
    const body = el('div', 'mpsheet');
    const age = ageOf(p, career.season);
    const head = el('div', 'mpsheet__head');
    const who = el('div', 'mpsheet__who');
    who.append(el('strong', 'display t-lg', p.name), el('span', 'label', `${flagEmoji(p.nation)} ${countryName(p.nation)} · ${age} ${t('allenatore.years')} · ${t(`allenatore.roles.${p.role}`)}${p.number ? ` · #${p.number}` : ''}`));
    head.append(who, ovrBadge(p.ovr));
    body.appendChild(head);
    const tags = el('div', 'mpsheet__tags');
    tags.append(chip(t(`allenatore.personality.${p.personality}`), 'dim'), statusTags(p));
    if (p.id === career.tactics.captainId) tags.appendChild(chip(t('allenatore.captain'), 'amber'));
    if (p.academy) tags.appendChild(chip(t('allenatore.academy'), 'lime'));
    body.appendChild(tags);
    const vitals = el('div', 'mpsheet__vitals');
    vitals.append(
      meter(t('allenatore.fitness'), p.fitness, { tone: p.fitness < 60 ? 'flare' : 'lime' }),
      meter(t('allenatore.morale'), p.morale, { tone: p.morale < 45 ? 'flare' : 'sky' }),
      meter(t('allenatore.form'), (p.form + 10) * 5, { tone: p.form < -3 ? 'flare' : 'amber' }),
      meter(t('allenatore.affinity'), playerAffinity(p, career.tactics.style), { tone: 'lime' }),
    );
    body.appendChild(vitals);
    const staff = career.flags.staff || 50;
    const own = p.club === career.club;
    const range = potentialRange(p, career.season, { own, staff });
    const potLine = el('div', 'mpsheet__tags');
    potLine.append(phaseChip(p, career.season), chip(range.lo === range.hi ? t('allenatore.potShort', { value: range.lo }) : t('allenatore.potRange', { lo: range.lo, hi: range.hi }), 'amber'));
    body.appendChild(potLine);
    body.appendChild(attrBars(p));
    const hist = (p.history || []).filter((h) => h.s >= career.season - 3).map((h) => h.ovr);
    if (hist.length >= 2) {
      const sp = el('div', 'mpsheet__spark');
      sp.append(el('span', 'label', t('allenatore.ovrTrend')), sparkline([...hist, p.ovr]));
      body.appendChild(sp);
    }
    const st = p.stats;
    const avg = st.apps ? (st.ratingSum / st.apps).toFixed(2) : '—';
    const keys = p.role === 'POR' ? ['apps', 'cleanSheets', 'saves', 'conceded', 'penSaved'] : p.role === 'DC' || p.role === 'TZ' ? ['apps', 'goals', 'assists', 'tackles', 'interceptions', 'aerials'] : p.role === 'MED' || p.role === 'CC' ? ['apps', 'goals', 'assists', 'recoveries', 'tackles', 'keyPasses'] : ['apps', 'goals', 'assists', 'shots', 'keyPasses'];
    const grid = el('div', 'mpsheet__stats');
    for (const k of [...keys, 'avg']) {
      const b = el('div', 'mstat');
      b.append(el('strong', 'display num', k === 'avg' ? avg : String(st[k] || 0)), el('span', 'label', t(`allenatore.stats.${k}`)));
      grid.appendChild(b);
    }
    body.appendChild(grid);
    body.appendChild(el('p', 'dim', t('allenatore.contractLine', { until: p.contract, wage: euro(p.wage), value: euro(valueOf(p, career.season)) })));
    const actions = [];
    if (p.club === career.club && !p.loanIn) {
      const listed = (p.flags || []).includes('listed');
      const terms = renewalTerms(career, p);
      const deal = el('div', 'mpsheet__deal');
      deal.append(
        button(t('allenatore.contract.renew', { years: terms.years, wage: euro(terms.wage) }), 'btn--ghost btn--block', () => {
          const res = renew(career, p.id);
          persist();
          dealOut.textContent = t(`allenatore.contract.${res.status}`, { years: terms.years, wage: euro(terms.wage) });
        }),
        button(t(listed ? 'allenatore.contract.unlist' : 'allenatore.contract.list'), 'btn--ghost btn--block', () => {
          setListed(career, p.id, !listed);
          persist();
          dealOut.textContent = t(listed ? 'allenatore.contract.unlisted' : 'allenatore.contract.listed');
        }),
        button(t('allenatore.contract.release'), 'btn--ghost btn--block', () => {
          const cost = Math.round(Math.max(0, p.contract - career.season) * p.wage * 0.5 * 10) / 10;
          sheet({
            title: t('allenatore.contract.releaseTitle', { name: p.name }),
            body: el('p', 'dim', t('allenatore.contract.releaseText', { cost: euro(cost) })),
            actions: [
              { label: t('common.cancel'), onClick: (c) => c() },
              { label: t('allenatore.contract.releaseYes'), variant: 'btn--go', onClick: (c) => {
                const res = release(career, p.id);
                c();
                if (res.status === 'released') { refreshUserLineup(career); persist(); document.querySelectorAll('.sheet').forEach((x) => x.remove()); render({ keepScroll: true }); }
                else dealOut.textContent = t(`allenatore.market.status.${res.status}`);
              } },
            ],
          });
        }),
      );
      const dealOut = el('p', 'mmarket__out');
      body.append(deal, dealOut);
    }
    if (!p.loanOut) {
      actions.push({ label: t('allenatore.makeCaptain'), onClick: (close) => { career.tactics.captainId = p.id; persist(); close(); render({ keepScroll: true }); } });
      actions.push({ label: t('allenatore.makePenalty'), onClick: (close) => { career.tactics.penaltyId = p.id; persist(); close(); render({ keepScroll: true }); } });
    }
    actions.push({ label: t('common.close'), variant: 'btn--go', onClick: (close) => close() });
    sheet({ title: null, body, actions });
  }

  /* ---------------------------------------------------------------- */
  /* 4. tattica e formazione                                           */
  /* ---------------------------------------------------------------- */

  function renderTactics() {
    const tac = career.tactics;
    refreshUserLineup(career);
    const card = el('section', 'mtactics card');
    card.appendChild(el('h3', 'mhead display', t('allenatore.tactics')));

    const formRow = el('div', 'mseg');
    for (const f of FORMATION_IDS) {
      const b = el('button', `mseg__b ${tac.formation === f ? 'is-on' : ''}`, f);
      b.type = 'button';
      b.addEventListener('click', () => { tac.formation = f; tac.lineup = []; persist(); render({ keepScroll: true }); });
      formRow.appendChild(b);
    }
    card.append(el('span', 'label', t('allenatore.formation')), formRow);

    const menRow = el('div', 'mseg');
    for (const m of MENTALITY_IDS) {
      const b = el('button', `mseg__b ${tac.mentality === m ? 'is-on' : ''}`, t(`allenatore.mentality.${m}`));
      b.type = 'button';
      b.addEventListener('click', () => { tac.mentality = m; persist(); render({ keepScroll: true }); });
      menRow.appendChild(b);
    }
    card.append(el('span', 'label', t('allenatore.mentalityLabel')), menRow);

    const styleBtn = button(`${t('allenatore.styleLabel')}: ${t(`allenatore.styles.${tac.style}.name`)}`, 'btn--ghost btn--block', () => pickStyle());
    const fam = career.clubs[career.club].familiarity[tac.style] || 0;
    card.append(styleBtn, meter(t('allenatore.familiarity'), fam, { tone: 'lime' }));

    const auto = el('label', 'mtoggle');
    const cb = el('input');
    cb.type = 'checkbox'; cb.checked = tac.auto;
    cb.addEventListener('change', () => { tac.auto = cb.checked; if (tac.auto) tac.lineup = []; refreshUserLineup(career); persist(); render({ keepScroll: true }); });
    auto.append(cb, el('span', '', t('allenatore.autoLineup')));
    card.appendChild(auto);
    stage.appendChild(card);

    stage.appendChild(pitchEditor());
    stage.appendChild(benchList());
  }

  function pickStyle() {
    const grid = el('div', 'mstyles');
    const body = el('div', 'stack');
    body.append(el('p', 'dim', t('allenatore.styleChangeText')), grid);
    let s;
    for (const id of STYLE_IDS) {
      grid.appendChild(styleCard(id, career.tactics.style === id, () => {
        career.tactics.style = id;
        if (career.tactics.auto) career.tactics.lineup = [];
        refreshUserLineup(career);
        persist();
        s.close();
        render({ keepScroll: true });
      }));
    }
    s = sheet({ title: t('allenatore.styleLabel'), body, actions: [{ label: t('common.close'), onClick: (c) => c() }] });
  }

  function pitchEditor() {
    const tac = career.tactics;
    const slots = FORMATIONS[tac.formation];
    const wrap = el('div', 'mpitch-wrap');
    const pitch = el('div', 'mpitch');
    pitch.innerHTML = pitchSvg();
    slots.forEach((s, i) => {
      const p = career.players[tac.lineup[i]];
      const b = el('button', `mspot mspot--${s.role} ${selectedSlot === i ? 'is-sel' : ''}`);
      b.type = 'button';
      b.style.left = `${s.x}%`;
      b.style.top = `${100 - s.y}%`;
      if (p) {
        const fit = Math.round(slotScore(p, s.role) / Math.max(1, p.ovr) * 100);
        b.append(el('span', `mspot__ovr display num ${fit < 90 ? 'is-off' : ''}`, String(p.ovr)), el('span', 'mspot__n', p.name.split(' ').pop()), el('span', 'mspot__r label', t(`allenatore.rolesShort.${s.role}`)));
        const fb = el('i', `mspot__fit ${p.fitness < 60 ? 'is-low' : p.fitness < 80 ? 'is-mid' : ''}`);
        fb.style.width = `${p.fitness}%`;
        b.appendChild(fb);
      } else {
        b.append(el('span', 'mspot__ovr display', '?'), el('span', 'mspot__r label', t(`allenatore.rolesShort.${s.role}`)));
      }
      b.addEventListener('click', () => slotPicker(i));
      pitch.appendChild(b);
    });
    wrap.appendChild(pitch);
    return wrap;
  }

  function slotPicker(i) {
    const tac = career.tactics;
    const role = FORMATIONS[tac.formation][i].role;
    const players = squadOf(career, career.club).filter((p) => !p.loanOut);
    const body = el('div', 'mpicker');
    const scored = players.map((p) => ({ p, s: slotScore(p, role, tac.style) })).sort((a, b) => (available(b.p) - available(a.p)) || b.s - a.s);
    for (const { p, s } of scored) {
      const inLineup = tac.lineup.indexOf(p.id);
      const right = el('span', 'mpicker__right');
      right.append(el('span', 'label', `${t('allenatore.fit')} ${Math.round((s / Math.max(1, p.ovr)) * 100)}%`), fitnessBar(p));
      const row = playerRow(p, career.season, {
        right,
        onClick: () => {
          if (!available(p)) return;
          const cur = tac.lineup[i];
          if (inLineup >= 0) tac.lineup[inLineup] = cur;
          tac.lineup[i] = p.id;
          tac.bench = tac.bench.filter((id) => id !== p.id);
          if (inLineup < 0 && cur && !tac.bench.includes(cur)) tac.bench.unshift(cur);
          tac.auto = false;
          refreshUserLineup(career);
          persist();
          picker.close();
          render({ keepScroll: true });
        },
      });
      if (!available(p)) row.classList.add('is-off');
      if (inLineup === i) row.classList.add('is-sel');
      body.appendChild(row);
    }
    const picker = sheet({ title: t('allenatore.pickFor', { role: t(`allenatore.roles.${role}`) }), body, actions: [{ label: t('common.close'), onClick: (c) => c() }] });
  }

  function benchList() {
    const tac = career.tactics;
    const card = el('section', 'msquad card');
    card.appendChild(el('h3', 'mhead display', t('allenatore.bench')));
    for (const id of tac.bench) {
      const p = career.players[id];
      if (p) card.appendChild(playerRow(p, career.season, { onClick: () => playerSheet(p.id) }));
    }
    const out = squadOf(career, career.club).filter((p) => !p.loanOut && !tac.lineup.includes(p.id) && !tac.bench.includes(p.id));
    if (out.length) {
      card.appendChild(el('h4', 'label mtactics__out', t('allenatore.notCalled', { n: out.length })));
      for (const p of out) card.appendChild(playerRow(p, career.season, { onClick: () => playerSheet(p.id) }));
    }
    return card;
  }

  /* ---------------------------------------------------------------- */
  /* 5. classifica, calendario, carriera                              */
  /* ---------------------------------------------------------------- */

  function renderTable() {
    stage.appendChild(statusStrip());
    const played = career.fixtures.findIndex((round) => round.some((f) => !f.res));
    const lastPlayed = played < 0 ? career.fixtures.length : played;
    const md = tableMd ?? lastPlayed;
    const rows = table(career, data, md);
    const prev = md > 0 ? table(career, data, md - 1) : rows;
    const prevPos = new Map(prev.map((r) => [r.id, r.pos]));
    const lg = league();
    const z = zones(lg);
    const card = el('section', 'mtable mtable--full card');
    const head = el('div', 'mtable__head');
    const nav = el('div', 'mtable__nav');
    const back = button('‹', 'btn--ghost', () => { tableMd = Math.max(1, md - 1); render({ keepScroll: true }); });
    const fwd = button('›', 'btn--ghost', () => { tableMd = Math.min(lastPlayed, md + 1); render({ keepScroll: true }); });
    back.disabled = md <= 1; fwd.disabled = md >= lastPlayed;
    nav.append(back, el('span', 'label', md ? t('allenatore.afterMatchday', { n: md }) : t('allenatore.preseason')), fwd);
    head.append(el('h3', 'mhead display', lg.name), nav);
    card.appendChild(head);
    const cols = el('div', 'mtrow mtrow--cols label');
    cols.append(el('span', 'mtrow__pos', '#'), el('span', 'mtrow__mv'), el('span'), el('span', 'mtrow__name', t('allenatore.club')), el('span', 'mtrow__n', t('allenatore.playedShort')), el('span', 'mtrow__n', t('allenatore.gdShort')), el('span', 'mtrow__pts', t('allenatore.ptsShort')));
    card.appendChild(cols);
    rows.forEach((r) => card.appendChild(tableRow(r, z, (prevPos.get(r.id) || r.pos) - r.pos)));
    const legend = el('div', 'mlegend');
    for (const k of [...new Set(Object.values(z))]) legend.appendChild(el('span', `mlegend__i z-${k}`, t(`allenatore.zones.${k}`)));
    card.appendChild(legend);
    if (lg.level === 2) card.appendChild(el('p', 'dim mlegend__note', t('allenatore.noRelegationNote')));
    stage.appendChild(card);

    const round = career.fixtures[md - 1];
    if (round) {
      const res = el('section', 'mcard card');
      res.appendChild(el('h3', 'mhead display', t('allenatore.matchday', { n: md })));
      const list = el('div', 'mresults');
      for (const f of round) {
        const r = el('div', `mres ${f.h === career.club || f.a === career.club ? 'is-me' : ''}`);
        r.append(el('span', 'mres__h', clubName(f.h)), el('strong', 'mres__s num', f.res ? `${f.res[0]}–${f.res[1]}` : '–'), el('span', 'mres__a', clubName(f.a)));
        list.appendChild(r);
      }
      res.appendChild(list);
      stage.appendChild(res);
    }
    stage.appendChild(scorersCard());
  }

  function scorersCard() {
    const all = Object.values(career.players).filter((p) => p.club && career.clubs[p.club]);
    const card = el('section', 'mcard card');
    card.appendChild(el('h3', 'mhead display', t('allenatore.topScorers')));
    for (const p of all.sort((a, b) => b.stats.goals - a.stats.goals || b.stats.assists - a.stats.assists).slice(0, 10)) {
      if (!p.stats.goals) break;
      const r = el('div', `mres ${p.club === career.club ? 'is-me' : ''}`);
      r.append(el('span', 'mres__h', p.name), el('span', 'mres__a dim', clubName(p.club)), el('strong', 'mres__s num', String(p.stats.goals)));
      card.appendChild(r);
    }
    return card;
  }

  function renderFixtures() {
    stage.appendChild(statusStrip());
    const card = el('section', 'mcard card');
    card.appendChild(el('h3', 'mhead display', t('allenatore.calendar')));
    career.fixtures.forEach((round, md) => {
      const f = round.find((x) => x.h === career.club || x.a === career.club);
      if (!f) return;
      const home = f.h === career.club;
      const opp = home ? f.a : f.h;
      const row = el('div', `mfix ${md === career.md ? 'is-next' : ''}`);
      let res = '';
      let tone = '';
      if (f.res) {
        const gf = home ? f.res[0] : f.res[1];
        const ga = home ? f.res[1] : f.res[0];
        res = `${gf}–${ga}`;
        tone = gf > ga ? 'W' : gf < ga ? 'L' : 'D';
      }
      const date = matchdayDate(career.season, md, career.fixtures.length);
      row.append(
        el('span', 'mfix__md label', String(md + 1)),
        el('span', 'mfix__date label', date.toLocaleDateString(lang(), { day: 'numeric', month: 'short' })),
        el('span', `mfix__ha label ${home ? 'is-home' : ''}`, t(home ? 'allenatore.homeShort' : 'allenatore.awayShort')),
        crest(career.clubs[opp].colors, 16),
        el('span', 'mfix__opp', career.clubs[opp].name),
        el('strong', `mfix__res num ${tone ? `mform__i--${tone}` : ''}`, res || '·'),
      );
      card.appendChild(row);
    });
    stage.appendChild(card);
    const cups = cupsCard();
    if (cups) stage.appendChild(cups);
    requestAnimationFrame(() => card.querySelector('.is-next')?.scrollIntoView({ block: 'center' }));
  }

  function renderCoach() {
    const c = career.coach;
    const card = el('section', 'mcoach card halftone misreg card--print');
    card.append(el('span', 'label', t('allenatore.coachLabel')), el('h3', 'display t-xl', c.name), el('p', 'dim', `${countryLabel(c.nation)} · ${t('allenatore.seasonsDone', { n: c.seasons })}`));
    card.appendChild(meter(t('allenatore.reputation'), c.reputation, { tone: 'amber' }));
    const rec = c.record;
    const grid = el('div', 'mpsheet__stats');
    for (const [k, v] of [['played', rec.p], ['won', rec.w], ['drawn', rec.d], ['lost', rec.l], ['trophies', c.trophies.length], ['sacked', c.sacked]]) {
      const b = el('div', 'mstat');
      b.append(el('strong', 'display num', String(v)), el('span', 'label', t(`allenatore.coachStats.${k}`)));
      grid.appendChild(b);
    }
    card.appendChild(grid);
    stage.appendChild(card);
    if (c.trophies.length) {
      const tro = el('section', 'mcard card');
      tro.appendChild(el('h3', 'mhead display', t('allenatore.trophies')));
      for (const tr of c.trophies) tro.appendChild(el('p', 'mtrophy', `🏆 ${t(`allenatore.trophyNames.${tr.type}`, { league: (tr.type === 'cup' ? leagueOf(data, tr.league)?.cup : leagueOf(data, tr.league)?.name) || '' })} · ${clubName(tr.club)} · ${tr.season}/${String(tr.season + 1).slice(2)}`));
      stage.appendChild(tro);
    }
    if (c.history.length) {
      const hist = el('section', 'mcard card');
      hist.appendChild(el('h3', 'mhead display', t('allenatore.history')));
      for (const h of [...c.history].reverse()) {
        const r = el('div', `mhist ${h.met ? 'is-met' : 'is-miss'}`);
        r.append(el('span', 'label', `${h.season}/${String(h.season + 1).slice(2)}`), el('strong', '', h.clubName), el('span', 'dim', `${leagueOf(data, h.league)?.name} · ${h.pos}° (${t('allenatore.goal')} ${h.target}°)`), el('span', 'label', t(`allenatore.verdicts.${h.verdict}`)));
        hist.appendChild(r);
      }
      stage.appendChild(hist);
    }
    const danger = el('div', 'mcard card');
    danger.appendChild(button(t('allenatore.restart'), 'btn--ghost btn--block', () => {
      sheet({
        title: t('allenatore.restartTitle'),
        body: el('p', 'dim', t('allenatore.restartText')),
        actions: [
          { label: t('common.cancel'), onClick: (cl) => cl() },
          { label: t('allenatore.restartYes'), variant: 'btn--go', onClick: (cl) => { cl(); localStorage.removeItem(SAVE_KEY); localStorage.removeItem(META_KEY); career = null; draft = { step: 0, name: '', nation: null, style: null, league: null, club: null }; goView('create'); } },
        ],
      });
    }));
    stage.appendChild(danger);
  }

  /* ---------------------------------------------------------------- */
  /* 6. la partita                                                     */
  /* ---------------------------------------------------------------- */

  function startLive(cup = null) {
    refreshUserLineup(career);
    const match = cup ? startCupMatch(career, data, cup.id) : startUserMatch(career);
    career.live = serializeMatch(match);
    career.liveCup = cup ? cup.id : null;
    live = match;
    persist();
    goView('match');
  }

  function quickMatch(cup = null) {
    refreshUserLineup(career);
    const nf = nextFixture(career);
    const match = cup ? startCupMatch(career, data, cup.id) : startUserMatch(career);
    match.autoUser = true;
    let guard = 0;
    while (!match.finished && guard++ < 600) {
      if (match.pending) { const adv = adviseMoment(match, 4, 0.45 + (career.flags.staff || 50) / 200); decide(match, adv ? adv.pick : match.pending.options[0].id); continue; }
      tick(match);
    }
    if (cup) finishCup(match, cup.id);
    else finishMatch(match, nf.fixture);
  }

  function renderMatch() {
    const nf = nextFixture(career);
    const cupId = career.liveCup;
    if (!live && career.live) live = restoreMatch(career.live, (id) => career.players[id]);
    if (!live || (!nf && !cupId)) { career.live = null; career.liveCup = null; view = 'hub'; render(); return; }
    liveTeardown = mountLive(stage, {
      match: live,
      career,
      data,
      clubName,
      onSave: (m) => { career.live = serializeMatch(m); persist(); },
      onFinish: (m) => { if (cupId) finishCup(m, cupId); else finishMatch(m, nf.fixture); },
    });
  }

  function finishMatch(match, fixture) {
    applyMatch(career, match, fixture);
    simulateRest(career);
    report = closeMatchday(career, data);
    report.offers = incomingOffers(career, data).length;
    career.live = null;
    career.liveCup = null;
    live = null;
    runSilentCups();
    if (career.phase === 'season') planWeek(career, data, events);
    persist();
    goView('report');
  }

  function finishCup(match, cupId) {
    career.cupReport = closeCupRound(career, data, cupId, match);
    career.live = null;
    career.liveCup = null;
    live = null;
    runSilentCups();
    persist();
    goView('cupReport');
  }

  function renderCupReport() {
    const rep = career.cupReport;
    if (!rep) { goView('hub'); return; }
    const cup = career.cups[rep.cupId];
    const mine = rep.results.find((r) => r.h === career.club || r.a === career.club);
    if (mine) {
      const gf = mine.h === career.club ? mine.res[0] : mine.res[1];
      const ga = mine.h === career.club ? mine.res[1] : mine.res[0];
      const tone = rep.trophy || rep.advanced || gf > ga ? 'is-win' : rep.eliminated || gf < ga ? 'is-loss' : 'is-draw';
      const head = el('section', `mreport__head card ${tone}`);
      head.append(
        el('span', 'label', `${cupName(cup)} · ${t(`allenatore.cupRounds.${rep.round}`)}`),
        el('strong', 'display t-xxl num', `${mine.res[0]}–${mine.res[1]}${mine.pens ? ` (${mine.pens[0]}–${mine.pens[1]} ${t('allenatore.cup.pensShort')})` : ''}`),
        el('span', 'mreport__teams', `${clubName(mine.h)} · ${clubName(mine.a)}`),
      );
      if (rep.trophy) head.appendChild(el('span', 'display t-xl mreport__good', `🏆 ${t('allenatore.cup.trophy', { name: cupName(cup) })}`));
      else if (rep.eliminated) head.appendChild(el('span', 'display t-lg', t('allenatore.cup.eliminated')));
      else if (rep.advanced) head.appendChild(el('span', 'display t-lg mreport__good', t('allenatore.cup.advanced')));
      stage.appendChild(head);
    }
    if (cup.type === 'groups' && rep.round.startsWith('g')) {
      const g = cup.groups.find((x) => x.teams.includes(career.club));
      if (g) stage.appendChild(groupCard(cup, g));
    }
    const list = el('section', 'mcard card');
    list.appendChild(el('h3', 'mhead display', t('allenatore.cup.otherResults')));
    const res = el('div', 'mresults');
    for (const r of rep.results) {
      const row = el('div', `mres ${r.h === career.club || r.a === career.club ? 'is-me' : ''}`);
      row.append(el('span', 'mres__h', clubName(r.h)), el('strong', 'mres__s num', `${r.res[0]}–${r.res[1]}${r.pens ? '*' : ''}`), el('span', 'mres__a', clubName(r.a)));
      res.appendChild(row);
    }
    list.appendChild(res);
    stage.appendChild(list);
    stage.appendChild(button(t('allenatore.continue'), 'btn--go btn--lg btn--block', () => { career.cupReport = null; persist(); goView('hub'); }));
  }

  function groupCard(cup, g) {
    const card = el('section', 'mtable card');
    card.appendChild(el('h3', 'mhead display', t('allenatore.cup.group', { g: g.id })));
    groupTable(g).forEach((r, i) => {
      const club = career.clubs[r.id] || data.leagues.clubs[r.id];
      const row = el('div', `mtrow ${r.id === career.club ? 'is-me' : ''} ${i < 2 && r.p > 0 ? 'z-up' : ''}`);
      row.append(el('span', 'mtrow__pos num', String(i + 1)), el('span', 'mtrow__mv'), crest(club.colors || [], 16), el('span', 'mtrow__name', club.name), el('span', 'mtrow__n num', String(r.p)), el('span', 'mtrow__n num', `${r.gf - r.ga > 0 ? '+' : ''}${r.gf - r.ga}`), el('strong', 'mtrow__pts num', String(r.pts)));
      card.appendChild(row);
    });
    void cup;
    return card;
  }

  function cupsCard() {
    const cups = Object.values(career.cups || {});
    if (!cups.length) return null;
    const card = el('section', 'mcard card');
    card.appendChild(el('h3', 'mhead display', t('allenatore.cup.title')));
    for (const cup of cups) {
      const alive = cup.alive.includes(career.club);
      const status = cup.winner ? (cup.winner === career.club ? t('allenatore.cup.won') : t('allenatore.cup.winner', { club: clubName(cup.winner) })) : alive ? t('allenatore.cup.alive', { round: t(`allenatore.cupRounds.${roundKey(cup) || 'final'}`) }) : t('allenatore.cup.out');
      const row = el('div', 'mcup');
      row.append(el('strong', '', cupName(cup)), chip(status, cup.winner === career.club ? 'amber' : alive ? 'lime' : 'dim'));
      card.appendChild(row);
      if (cup.type === 'groups') {
        const g = cup.groups.find((x) => x.teams.includes(career.club));
        if (g && cup.round <= 6) card.appendChild(groupCard(cup, g));
      }
      const ties = cup.round < cup.rounds.length ? currentTies(cup).filter((f) => !f.res && (f.h === career.club || f.a === career.club)) : [];
      for (const f of ties) card.appendChild(el('p', 'dim', `${t(`allenatore.cupRounds.${roundKey(cup)}`)} · ${clubName(f.h)} – ${clubName(f.a)} · ${t('allenatore.cup.afterMd', { n: cup.schedule[cup.round] + 1 })}`));
    }
    return card;
  }

  /* ---------------------------------------------------------------- */
  /* 7. resoconto della giornata, fine stagione, offerte               */
  /* ---------------------------------------------------------------- */

  function renderReport() {
    const rep = report || career.lastReport;
    if (!rep) { goView('hub'); return; }
    const res = rep.result;
    if (res) {
      const head = el('section', `mreport__head card ${res.gf > res.ga ? 'is-win' : res.gf < res.ga ? 'is-loss' : 'is-draw'}`);
      head.append(
        el('span', 'label', t('allenatore.matchday', { n: rep.md + 1 })),
        el('strong', 'display t-xxl num', res.home ? `${res.gf}–${res.ga}` : `${res.ga}–${res.gf}`),
        el('span', 'mreport__teams', res.home ? `${clubName(career.club)} · ${clubName(res.opponent)}` : `${clubName(res.opponent)} · ${clubName(career.club)}`),
        el('span', 'display t-lg', t(res.gf > res.ga ? 'allenatore.win' : res.gf < res.ga ? 'allenatore.loss' : 'allenatore.draw')),
      );
      stage.appendChild(head);
    }
    const b = rep.board;
    if (b) {
      const card = el('section', 'mcard card');
      card.append(meter(t('allenatore.trust'), b.trust, { tone: b.trust < 30 ? 'flare' : 'lime', delta: b.delta }), meter(t('allenatore.fans'), b.fans, { tone: 'sky' }));
      if (b.ultimatum === 'given') card.appendChild(el('p', 'mstrip__alert', t('allenatore.ultimatumGiven')));
      if (b.ultimatum === 'passed') card.appendChild(el('p', 'mreport__good', t('allenatore.ultimatumPassed')));
      if (b.sacked) card.appendChild(el('p', 'mstrip__alert', t('allenatore.sackedLine')));
      stage.appendChild(card);
    }
    const lg = league();
    const z = zones(lg);
    const before = new Map(rep.before.map((id, i) => [id, i + 1]));
    const tcard = el('section', 'mtable mtable--full card');
    tcard.appendChild(el('h3', 'mhead display', t('allenatore.standings')));
    const rows = table(career, data, rep.md + 1);
    rows.forEach((r) => tcard.appendChild(tableRow(r, z, rep.md > 0 ? (before.get(r.id) || r.pos) - r.pos : 0)));
    stage.appendChild(tcard);
    stagger(tcard.querySelectorAll('.mtrow'), 'anim-rise', 18);

    if (rep.evolution && rep.evolution.length) {
      const evo = el('section', 'mcard card');
      evo.append(el('h3', 'mhead display', t('allenatore.growth')), el('p', 'dim', t('allenatore.growthText')));
      for (const e of rep.evolution.slice(0, 10)) {
        const p = career.players[e.id];
        if (p) evo.appendChild(playerRow(p, career.season, { onClick: () => playerSheet(p.id), delta: e.delta, right: el('span', `mevo num ${e.delta > 0 ? 'is-up' : 'is-down'}`, `${e.delta > 0 ? '+' : ''}${e.delta}`) }));
      }
      stage.appendChild(evo);
    }
    if (rep.injuries.length) {
      const inj = el('section', 'mcard card');
      inj.appendChild(el('h3', 'mhead display', t('allenatore.injuries')));
      for (const x of rep.injuries) { const p = career.players[x.id]; if (p) inj.appendChild(el('p', '', t('allenatore.injuryLine', { name: p.name, weeks: x.weeks }))); }
      stage.appendChild(inj);
    }
    /* il mercato della giornata: colpi degli altri, trattative saltate, bonus pagati */
    if (rep.transfers?.length || rep.bonuses?.length || rep.talksExpired) {
      const mk = el('section', 'mcard card');
      mk.appendChild(el('h3', 'mhead display', t('allenatore.news.title')));
      if (rep.talksExpired) mk.appendChild(el('p', 'mmarket__out is-bad', t('allenatore.talks.reason.windowClosed')));
      for (const b of rep.bonuses || []) mk.appendChild(el('p', 'minbox__i', t('allenatore.bonusPaid', { name: b.name, fee: euro(b.fee) })));
      for (const n of (rep.transfers || []).slice(0, 8)) mk.appendChild(el('p', 'minbox__i', t('allenatore.news.line', { to: n.toName, name: `${n.name} (${n.ovr})`, from: n.fromName, fee: euro(n.fee) })));
      stage.appendChild(mk);
    }
    const next = button(t('allenatore.continue'), 'btn--go btn--lg btn--block', () => { report = null; goView(homeView()); });
    stage.appendChild(next);
  }

  function renderSeason() {
    const s = career.lastSeason;
    if (!s) { goView('hub'); return; }
    const head = el('section', `mreport__head card ${['met', 'triumph'].includes(s.verdict) ? 'is-win' : s.verdict === 'sacked' ? 'is-loss' : 'is-draw'}`);
    head.append(el('span', 'label', `${t('allenatore.seasonLabel')} ${s.season}/${String(s.season + 1).slice(2)}`), el('strong', 'display t-xxl num', `${s.pos}°`), el('span', 'display t-lg', t(`allenatore.verdicts.${s.verdict}`)), el('p', 'dim', t(`allenatore.verdictText.${s.verdict}`, { target: s.objective.target, objective: t(`allenatore.objectives.${s.objective.id}`) })));
    stage.appendChild(head);
    if (s.trophies.length) {
      const tro = el('section', 'mcard card');
      for (const tr of s.trophies) tro.appendChild(el('p', 'mtrophy display t-lg', `🏆 ${t(`allenatore.trophyNames.${tr.type}`, { league: (tr.type === 'cup' ? leagueOf(data, tr.league)?.cup : leagueOf(data, tr.league)?.name) || '' })}`));
      stage.appendChild(tro);
    }
    const moves = el('section', 'mcard card');
    moves.appendChild(el('h3', 'mhead display', t('allenatore.movesTitle')));
    if (s.moves.up.length) moves.appendChild(el('p', '', `▲ ${s.moves.up.map(clubName).join(', ')}`));
    if (s.moves.down.length) moves.appendChild(el('p', '', `▼ ${s.moves.down.map(clubName).join(', ')}`));
    for (const pl of s.playoffs) moves.appendChild(el('p', 'dim', `${pl.names[0]} – ${pl.names[1]} · ${pl.agg[0]}–${pl.agg[1]} → ${clubName(pl.winner)}`));
    stage.appendChild(moves);
    const squad = el('section', 'mcard card');
    squad.appendChild(el('h3', 'mhead display', t('allenatore.summerTitle')));
    if (s.retired.length) squad.appendChild(el('p', '', t('allenatore.retiredLine', { names: s.retired.map((x) => `${x.name} (${x.age})`).join(', ') })));
    if (s.left.length) squad.appendChild(el('p', '', t('allenatore.leftLine', { names: s.left.map((x) => x.name).join(', ') })));
    if (s.returned?.length) squad.appendChild(el('p', '', t('allenatore.returnedLine', { names: s.returned.map((x) => x.name).join(', ') })));
    if (s.loanAgain?.length) squad.appendChild(el('p', '', t('allenatore.loanAgainLine', { names: s.loanAgain.map((x) => x.name).join(', ') })));
    const youth = s.youth.map((id) => career.players[id]).filter(Boolean);
    if (youth.length) {
      squad.appendChild(el('p', '', t('allenatore.youthLine', { n: youth.length })));
      for (const p of youth) squad.appendChild(playerRow(p, career.season + 1, { onClick: () => playerSheet(p.id) }));
    }
    stage.appendChild(squad);
    const go2 = button(t(career.phase === 'sacked' ? 'allenatore.seeOffers' : 'allenatore.nextSeason'), 'btn--go btn--lg btn--block', () => {
      if (career.phase === 'sacked') { goView('offers'); return; }
      beginNextSeason(career, data);
      planWeek(career, data, events);
      persist();
      goView('hub');
    });
    stage.appendChild(go2);
  }

  function renderOffers() {
    const card = el('section', 'mreport__head card is-loss');
    card.append(el('strong', 'display t-xl', t('allenatore.sackedTitle')), el('p', 'dim', t('allenatore.sackedText', { club: clubName(career.club) })));
    stage.appendChild(card);
    career.offers = career.offers || jobOffers(career, data);
    const list = el('section', 'mcard card');
    list.appendChild(el('h3', 'mhead display', t('allenatore.offers')));
    for (const o of career.offers) {
      const lg = leagueOf(data, o.league);
      const b = el('button', 'mclubpick');
      b.type = 'button';
      b.append(clubBadge(o, { size: 32, sub: `${flagEmoji(lg.code)} ${lg.name}` }), el('span', 'mclubpick__str display num', String(Math.round(o.strength))));
      b.addEventListener('click', () => {
        takeJob(career, data, o.club);
        career.offers = null;
        planWeek(career, data, events);
        persist();
        goView('hub');
      });
      list.appendChild(b);
    }
    stage.appendChild(list);
  }

  render();
  return () => { if (liveTeardown) liveTeardown(); };
}
