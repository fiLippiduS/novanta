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
import { adviseMoment, decide, restoreMatch, serializeMatch, tick, playerRatings } from '../manager/match.js';
import { matchTimeline } from '../manager/timeline.js';
import { trophySvg, TROPHY_COLOR } from '../career/trophies.js';
import { dueCup, userTie, startCupMatch, closeCupRound, currentTies, groupTable, roundKey } from '../manager/cups.js';
import {
  button, chip, clubBadge, meter, ovrBadge, roleTag, playerRow, sparkline, attrBars, formLetters, euro, countryLabel, pitchSvg, fitnessBar, moraleIcon, statusTags, phaseChip,
  richText, newsLine, timelineCard, resultRow, timelineRow, tapButton,
} from './allenatore/ui.js';
import { mountLive } from './allenatore/live.js';
import { renderMarket } from './allenatore/market.js';
import { incomingOffers, renewalTerms, renew, release, setListed, windowOpen, listOf } from '../manager/market.js';

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
  /* la freccia torna alla schermata di prima dentro l'Allenatore; alla home solo dalla panchina */
  const bar = topbar({ title: t('allenatore.title'), onExit: () => goBack() });
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
    if (view !== 'sim') stopSim();
    stage.innerHTML = '';
    bar.setTitle(career ? career.clubs[career.club].name : t('allenatore.title'));
    const views = {
      intro: renderIntro, create: renderCreate, hub: renderHub, squad: renderSquad, tactics: renderTactics,
      table: renderTable, fixtures: renderFixtures, coach: renderCoach, match: renderMatch, report: renderReport,
      season: renderSeason, offers: renderOffers,
      cupReport: renderCupReport,
      sim: renderSim,
      market: () => { stage.appendChild(statusStrip()); renderMarket(stage, { career, data, persist, rerender: () => render({ keepScroll: true }), clubName }); },
    };
    (views[view] || renderHub)();
    if (career && TABS.includes(view)) stage.appendChild(tabBar());
    window.scrollTo({ top: keepTop, behavior: 'instant' });
  }

  /* la cronologia delle schermate, per la freccia indietro */
  const history = [];
  const TRANSIENT = new Set(['report', 'cupReport', 'match', 'sim']);
  function goView(v) {
    if (v !== view && !TRANSIENT.has(view) && view !== 'create') history.push(view);
    if (history.length > 30) history.shift();
    view = v; audio.sfx.tick(); render();
  }
  function goBack() {
    /* le schermate di passaggio (resoconti, simulazione) portano alla panchina */
    if (view === 'sim') { stopSim(); sim = null; }
    if (view === 'create' && draft) { if (draft.step > 0) { draft.step--; render(); return; } view = career ? homeView() : 'intro'; render(); return; }
    if (!career || view === 'intro' || view === 'offers') { go('hub'); return; }
    if (view === 'match') { go('hub'); return; }
    if (TRANSIENT.has(view) && view !== 'match') {
      if (view === 'report') report = null;
      if (view === 'cupReport') { career.cupReport = null; persist(); }
      history.length = 0; view = homeView(); render(); return;
    }
    let prev = history.pop();
    while (prev && (prev === view || TRANSIENT.has(prev))) prev = history.pop();
    if (prev) { view = prev; audio.sfx.tick(); render(); return; }
    if (view !== 'hub' && view !== homeView()) { view = homeView(); render(); return; }
    go('hub');
  }

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
    const comp = nf.cup ? compOf(nf.cup.id) : null;
    const card = el('div', `mfixture card anim-rise ${nf.cup ? 'mfixture--cup' : ''} ${comp ? `comp comp--${comp}` : ''}`.trim());
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
      button(`» ${t('allenatore.sim.button')}`, 'btn--ghost mfixture__sim', () => simPicker()),
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
    const good = { injury: false, suspended: false, coachBan: false, sold: true, loanOut: true, noRenew: true, clubCut: true };
    const tone = c.kind in good ? (good[c.kind] ? 'sky' : 'bad') : pos ? 'lime' : 'bad';
    const val = c.kind === 'budget' || c.kind === 'sold' || c.kind === 'clubCut' ? euro(Math.abs(c.value)) : typeof c.value === 'number' ? `${sign}${c.value}` : '';
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
    for (const f of round) if (f.res) list.appendChild(resultRow(f, clubName, career.club));
    card.appendChild(list);
    return card;
  }

  /* un'offerta arrivata per un nostro giocatore, con nomi e cifra in evidenza */
  function offerNews(o) {
    return richText(o.kind === 'loan' ? 'allenatore.market.newLoanOffer' : 'allenatore.market.newOffer', { player: o.player, club: o.club, fee: euro(o.fee) }, ['player', 'club', 'fee']);
  }

  function inboxCard() {
    const card = el('section', 'mcard card');
    card.appendChild(el('h3', 'mhead display', t('allenatore.inbox')));
    const items = [...(career.log || []).slice(0, 4).map((l) => ({ type: 'log', l })), ...career.inbox.slice(0, 3).map((m) => ({ type: 'msg', m }))];
    if (!items.length) card.appendChild(el('p', 'dim', t('allenatore.inboxEmpty')));
    for (const it of items) {
      if (it.type === 'msg') {
        const m = it.m;
        if (m.type === 'market') { card.appendChild(marketMsg(m)); continue; }
        card.appendChild(el('p', 'minbox__i', t(`allenatore.msg.${m.key}`, { ...m.vars, objective: m.vars.objective ? t(`allenatore.objectives.${m.vars.objective}`) : '', budget: m.vars.budget != null ? euro(m.vars.budget) : '' })));
      } else {
        const txt = tx(it.l.id);
        card.appendChild(el('p', 'minbox__i dim', `${t('allenatore.matchday', { n: it.l.md + 1 })} · ${fill(txt.t, it.l.vars)}`));
      }
    }
    return card;
  }

  /** il messaggio di una cessione o di un prestito: chi, dove, quanto e come si dividono i soldi */
  function marketMsg(m) {
    const v = { ...m.vars };
    for (const k of ['fee', 'toBudget', 'toClub']) if (typeof v[k] === 'number') v[k] = euro(v[k]);
    return richText(`allenatore.msg.${m.key}`, v, ['player', 'club', 'fee', 'toBudget'], 'minbox__i minbox__i--market');
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

  function playerSheet(id, note = '') {
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
    body.appendChild(el('p', 'dim', t('allenatore.contractLine', { until: p.contract, wage: euro(p.wage), value: euro(valueOf(p, career.season, { league: career.league })) })));
    const actions = [];
    if (p.club === career.club && !p.loanIn) {
      const list = listOf(p);
      const terms = renewalTerms(career, p);
      const deal = el('div', 'mpsheet__deal');
      if (p.loanOut && p.loanTo) deal.appendChild(el('p', 'dim', t('allenatore.contract.onLoanAt', { club: p.loanToName || clubName(p.loanTo), share: Math.round((p.loanWageShare || 0) * 100) })));
      /* le liste: in vendita o in prestito; con il mercato aperto le offerte arrivano subito */
      const listBtn = (mode) => button(
        list === mode ? t('allenatore.contract.unlistBtn') : t(`allenatore.contract.list${mode === 'loan' ? 'Loan' : 'Transfer'}`),
        `btn--ghost btn--block ${list === mode ? 'is-on' : ''}`,
        () => {
          const made = setListed(career, data, p.id, list === mode ? null : mode);
          persist();
          const now = listOf(p);
          dealOut.textContent = !now ? t('allenatore.contract.unlisted')
            : !windowOpen(career) ? t('allenatore.contract.listedClosed')
              : t(now === 'loan' ? 'allenatore.contract.listedLoan' : 'allenatore.contract.listedTransfer', { n: made.length });
          document.querySelectorAll('.sheet').forEach((x) => x.remove());
          render({ keepScroll: true });
          playerSheet(p.id, dealOut.textContent);
        },
      );
      const listRow = el('div', 'mpsheet__lists');
      if (!p.loanOut) listRow.append(listBtn('transfer'), listBtn('loan'));
      deal.append(
        button(t('allenatore.contract.renew', { years: terms.years, wage: euro(terms.wage) }), 'btn--ghost btn--block', () => {
          const res = renew(career, p.id);
          persist();
          dealOut.textContent = t(`allenatore.contract.${res.status}`, { years: terms.years, wage: euro(terms.wage) });
        }),
        listRow,
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
      const dealOut = el('p', 'mmarket__out', note || '');
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

  const BENCH_MAX = 9;

  function benchList() {
    const tac = career.tactics;
    const card = el('section', 'msquad card');
    const head = el('div', 'mtable__head');
    head.append(el('h3', 'mhead display', `${t('allenatore.bench')} · ${tac.bench.length}/${BENCH_MAX}`), button(t('allenatore.callAuto'), 'btn--ghost mtable__more', () => {
      tac.benchAuto = true;
      tac.bench = [];
      refreshUserLineup(career);
      persist();
      render({ keepScroll: true });
    }));
    card.appendChild(head);
    /* le convocazioni: chi è in panchina si può escludere, chi è in tribuna si convoca */
    const callBtn = (p, called) => {
      const b = tapButton(t(called ? 'allenatore.drop' : 'allenatore.callUp'), `btn--ghost mcall ${called ? '' : 'is-in'}`, () => {
        tac.benchAuto = false;
        if (called) tac.bench = tac.bench.filter((id) => id !== p.id);
        else if (tac.bench.length < BENCH_MAX) tac.bench.push(p.id);
        else { callOut.textContent = t('allenatore.benchFull', { n: BENCH_MAX }); return; }
        persist();
        render({ keepScroll: true });
      });
      if (!called && !available(p)) b.classList.add('is-off');
      return b;
    };
    const callRow = (p, called) => {
      const row = playerRow(p, career.season, { onClick: () => playerSheet(p.id), right: callBtn(p, called) });
      row.classList.add('mprow--call');
      return row;
    };
    for (const id of tac.bench) {
      const p = career.players[id];
      if (p) card.appendChild(callRow(p, true));
    }
    const out = squadOf(career, career.club).filter((p) => !p.loanOut && !tac.lineup.includes(p.id) && !tac.bench.includes(p.id));
    const callOut = el('p', 'mmarket__out');
    if (out.length) {
      card.appendChild(el('h4', 'label mtactics__out', t('allenatore.notCalled', { n: out.length })));
      for (const p of out) card.appendChild(callRow(p, false));
    }
    card.appendChild(callOut);
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
      for (const f of round) list.appendChild(resultRow(f, clubName, career.club));
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
    const calHead = el('div', 'mtable__head');
    calHead.appendChild(el('h3', 'mhead display', t('allenatore.calendar')));
    if (career.phase === 'season' && nextFixture(career)) calHead.appendChild(button(`» ${t('allenatore.sim.button')}`, 'btn--ghost mtable__more', () => simPicker()));
    card.appendChild(calHead);
    /* le partite di coppa stanno nel calendario come le altre: una riga, il
       colore della competizione, la data che viene dopo quella giornata */
    const cupRows = {};
    for (const cup of Object.values(career.cups || {})) {
      const comp = cup.id === 'national' ? 'cup' : cup.comp;
      cup.schedule.forEach((afterMd, round) => {
        if (round >= cup.rounds.length) return;
        const label = `${cupName(cup)} · ${t(`allenatore.cupRounds.${cup.rounds[round]}`)}`;
        const tie = cupTieOf(cup, round);
        if (!tie && round > cup.round) { (cupRows[afterMd] = cupRows[afterMd] || []).push({ comp, label, unknown: true }); return; }
        if (!tie) return;
        const home = tie.h === career.club;
        (cupRows[afterMd] = cupRows[afterMd] || []).push({ comp, label, home, opp: home ? tie.a : tie.h, res: tie.res, pens: tie.pens });
      });
    }
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
      /* una giornata futura: si può simulare fino a lì */
      if (!f.res && md >= career.md && career.phase === 'season') {
        row.classList.add('is-future');
        row.setAttribute('role', 'button');
        row.tabIndex = 0;
        row.addEventListener('click', () => confirmSim(md));
      }
      card.appendChild(row);
      for (const c of cupRows[md] || []) card.appendChild(cupFixRow(c, md));
    });
    stage.appendChild(card);
    const cups = cupsCard();
    if (cups) stage.appendChild(cups);
    requestAnimationFrame(() => card.querySelector('.is-next')?.scrollIntoView({ block: 'center' }));
  }

  /* la partita dell'utente in un turno di coppa, se c'è (anche già giocata) */
  function cupTieOf(cup, round) {
    if (cup.type === 'groups' && round < 6) {
      const g = cup.groups.find((x) => x.teams.includes(career.club));
      return g ? g.fixtures[round].find((f) => f.h === career.club || f.a === career.club) : null;
    }
    if (round === cup.round) return userTie(career, cup);
    const past = cup.history?.[cup.type === 'groups' ? round - 6 : round];
    if (past) return past.find((f) => f.h === career.club || f.a === career.club) || null;
    return null;
  }

  function cupFixRow(c, md) {
    const row = el('div', `mfix mfix--cup comp comp--${c.comp}`);
    const date = matchdayDate(career.season, Math.min(md + 0.5, career.fixtures.length - 1), career.fixtures.length);
    let res = '';
    let tone = '';
    if (c.res) {
      const gf = c.home ? c.res[0] : c.res[1];
      const ga = c.home ? c.res[1] : c.res[0];
      res = `${gf}–${ga}`;
      tone = gf > ga ? 'W' : gf < ga ? 'L' : 'D';
    }
    row.append(
      el('span', 'mfix__md label', '★'),
      el('span', 'mfix__date label', date.toLocaleDateString(lang(), { day: 'numeric', month: 'short' })),
      el('span', `mfix__ha label ${c.home ? 'is-home' : ''}`, c.unknown ? '' : t(c.home ? 'allenatore.homeShort' : 'allenatore.awayShort')),
      c.unknown ? el('span', '') : crest((career.clubs[c.opp] || data.leagues.clubs[c.opp])?.colors || [], 16),
      el('span', 'mfix__opp', c.unknown ? t('allenatore.cup.toDraw') : clubName(c.opp)),
      el('strong', `mfix__res num ${tone ? `mform__i--${tone}` : ''}`, res || '·'),
    );
    row.appendChild(el('span', 'mfix__comp label', c.label));
    return row;
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
  /* 5b. simulazione fino a una data                                   */
  /* ---------------------------------------------------------------- */

  const SIM_SPEEDS = [{ id: 1, ms: 1100 }, { id: 2, ms: 550 }, { id: 4, ms: 200 }];
  let sim = null;

  function stopSim() {
    if (sim?.timer) { clearTimeout(sim.timer); sim.timer = null; }
  }

  function mdLabel(md) {
    const date = matchdayDate(career.season, md, career.fixtures.length);
    return date.toLocaleDateString(lang(), { day: 'numeric', month: 'short' });
  }

  /** l'elenco delle giornate che restano: si sceglie dove fermarsi */
  function simPicker() {
    const body = el('div', 'msimpick');
    body.appendChild(el('p', 'dim', t('allenatore.sim.pickText')));
    const list = el('div', 'msimpick__list');
    career.fixtures.forEach((round, md) => {
      if (md < career.md) return;
      const f = round.find((x) => x.h === career.club || x.a === career.club);
      if (!f) return;
      const home = f.h === career.club;
      const b = el('button', 'msimpick__i');
      b.type = 'button';
      b.append(el('span', 'label', `${md + 1}`), el('span', 'label', mdLabel(md)), el('span', '', `${t(home ? 'allenatore.homeShort' : 'allenatore.awayShort')} · ${clubName(home ? f.a : f.h)}`));
      b.addEventListener('click', () => { picker.close(); startSim(md); });
      list.appendChild(b);
    });
    body.appendChild(list);
    const picker = sheet({ title: t('allenatore.sim.pickTitle'), body, actions: [{ label: t('common.close'), onClick: (c) => c() }] });
  }

  function confirmSim(md) {
    sheet({
      title: t('allenatore.sim.pickTitle'),
      body: el('p', 'dim', `${t('allenatore.sim.to', { date: mdLabel(md), n: md + 1 })}. ${t('allenatore.sim.pickText')}`),
      actions: [
        { label: t('common.cancel'), onClick: (c) => c() },
        { label: t('allenatore.sim.start'), variant: 'btn--go', onClick: (c) => { c(); startSim(md); } },
      ],
    });
  }

  function startSim(target) {
    stopSim();
    let who = 'vice';
    try { who = localStorage.getItem('novanta:manager-simdecide') || 'vice'; } catch { /* niente */ }
    sim = {
      target, from: career.md, state: 'run', reason: null, feed: [], moved: new Map(), auto: [],
      speed: Number(localStorage.getItem('novanta:manager-simspeed') || 2), who,
    };
    goView('sim');
    schedule(250);
  }

  function schedule(ms) {
    stopSim();
    if (!sim || sim.state !== 'run') return;
    sim.timer = setTimeout(() => { sim.timer = null; simStep(); }, ms ?? (SIM_SPEEDS.find((x) => x.id === sim.speed) || SIM_SPEEDS[1]).ms);
  }

  function simFinish(reason) {
    sim.state = 'done';
    sim.reason = reason;
    stopSim();
    persist();
    if (view === 'sim') render({ keepScroll: true });
  }

  /** un passo: una partita di coppa o una giornata di campionato, con tutto quello che porta */
  function simStep() {
    if (!sim || sim.state !== 'run' || view !== 'sim') return;
    runSilentCups();
    if (career.phase === 'sacked' || career.board?.sacked) return simFinish('sacked');
    if (career.phase !== 'season') return simFinish('seasonEnd');
    if (career.md > sim.target) return simFinish('reached');
    /* una decisione da prendere: la simulazione aspetta, oppure decide il vice (e la cronaca lo racconta) */
    if ((career.queue || []).length) {
      if (sim.who === 'me') { sim.state = 'decide'; render({ keepScroll: true }); return; }
      viceDecides();
    }
    const before = new Map(table(career, data).map((r) => [r.id, r.pos]));
    const cup = dueCup(career);
    if (cup) {
      const match = autoRun(startCupMatch(career, data, cup.id));
      const head = matchHeader(match);
      const rep = closeCupRound(career, data, cup.id, match);
      runSilentCups();
      persist();
      const mine = rep.results.find((r) => r.h === career.club || r.a === career.club);
      sim.feed.unshift({ label: `${cupName(cup)} · ${t(`allenatore.cupRounds.${rep.round}`)}`, mine: mine ? { h: mine.h, a: mine.a, res: mine.res, pens: mine.pens, timeline: head.timeline } : null, cupNote: rep.trophy ? 'trophy' : rep.eliminated ? 'out' : rep.advanced ? 'through' : null, items: sim.auto.splice(0) });
    } else {
      const nf = nextFixture(career);
      if (!nf) return simFinish('seasonEnd');
      const md = career.md;
      const match = autoRun(startUserMatch(career));
      const rep = closeLeagueRound(match, nf.fixture);
      runSilentCups();
      if (career.phase === 'season') planWeek(career, data, events);
      persist();
      const f = nf.fixture;
      const items = [];
      for (const x of rep.injuries || []) { const p = career.players[x.id]; if (p) items.push({ k: 'injury', name: p.name, weeks: x.weeks }); }
      for (const e of (rep.evolution || []).slice(0, 3)) { const p = career.players[e.id]; if (p) items.push({ k: 'evo', name: p.name, delta: e.delta, ovr: e.ovr }); }
      for (const o of rep.offersNew || []) items.push({ k: 'offer', o });
      for (const n of (rep.transfers || []).slice(0, 5)) items.push({ k: 'news', n });
      for (const b of rep.bonuses || []) items.push({ k: 'bonus', name: b.name, fee: b.fee });
      if (rep.talksExpired) items.push({ k: 'talks' });
      if (rep.board?.ultimatum === 'given') items.push({ k: 'board', key: 'ultimatumGiven' });
      if (rep.board?.ultimatum === 'passed') items.push({ k: 'board', key: 'ultimatumPassed' });
      if (rep.board?.sacked) items.push({ k: 'board', key: 'sackedLine' });
      items.unshift(...sim.auto.splice(0));
      if (sim.who === 'me') for (const q of career.queue || []) items.push({ k: 'decision', title: fill(tx(q.id).t, q.vars) });
      sim.feed.unshift({ label: `${t('allenatore.matchday', { n: md + 1 })} · ${mdLabel(md)}`, md, mine: { h: f.h, a: f.a, res: f.res, timeline: rep.timeline }, items });
    }
    sim.feed = sim.feed.slice(0, 60);
    sim.moved = new Map(table(career, data).map((r) => [r.id, (before.get(r.id) || r.pos) - r.pos]));
    audio.sfx.tick();
    render({ keepScroll: true });
    schedule();
  }

  /** il vice sceglie l'opzione più sicura secondo lo staff; l'esito finisce nella cronaca */
  function viceDecides() {
    for (const item of [...(career.queue || [])]) {
      const ev = events.find((e) => e.id === item.id);
      if (!ev) continue;
      const subject = item.player ? career.players[item.player] : null;
      let best = 0; let bestScore = -1;
      ev.o.forEach((opt, i) => { const o = oddsFor(career, opt, subject); const sc = o === null ? 0.6 : o; if (sc > bestScore + 1e-9) { best = i; bestScore = sc; } });
      const res = resolve(career, data, events, item.key, best);
      const txt = tx(item.id);
      const o = txt.o?.[res.option] || {};
      sim.auto.push({ k: 'auto', title: fill(txt.t, item.vars), choice: fill(o.l, item.vars), result: fill(res.outcome === 'bad' ? (o.rb || o.r) : o.r, item.vars), outcome: res.outcome });
    }
    refreshUserLineup(career);
  }

  function renderSim() {
    if (!sim) { view = homeView(); render(); return; }
    stage.appendChild(statusStrip());
    const total = career.fixtures.length;
    const done = Math.max(0, Math.min(career.md, sim.target + 1) - sim.from);
    const span = Math.max(1, sim.target + 1 - sim.from);
    const head = el('section', 'mcard card msim__head');
    head.append(
      el('span', 'label', t('allenatore.sim.to', { date: mdLabel(Math.min(sim.target, total - 1)), n: sim.target + 1 })),
      el('strong', 'display t-lg', career.md < total ? t('allenatore.sim.progress', { n: Math.min(career.md + 1, total), total }) : t('allenatore.seasonOver')),
    );
    const bar = el('div', 'mmeter__track msim__bar');
    const fillEl = el('i', 'mmeter__fill mmeter__fill--lime');
    fillEl.style.width = `${Math.round((done / span) * 100)}%`;
    bar.appendChild(fillEl);
    head.appendChild(bar);
    const controls = el('div', 'msim__controls');
    if (sim.state === 'run' || sim.state === 'paused') {
      const seg = el('div', 'mseg mseg--tight');
      for (const sp of SIM_SPEEDS) {
        const b = el('button', `mseg__b ${sim.speed === sp.id ? 'is-on' : ''}`, `${sp.id}×`);
        b.type = 'button';
        b.addEventListener('click', () => { sim.speed = sp.id; try { localStorage.setItem('novanta:manager-simspeed', String(sp.id)); } catch { /* niente */ } render({ keepScroll: true }); if (sim.state === 'run') schedule(); });
        seg.appendChild(b);
      }
      controls.appendChild(seg);
      controls.appendChild(sim.state === 'run'
        ? button(`⏸ ${t('allenatore.sim.pause')}`, 'btn--ghost', () => { sim.state = 'paused'; stopSim(); render({ keepScroll: true }); })
        : button(`▶ ${t('allenatore.sim.resume')}`, 'btn--go', () => { sim.state = 'run'; render({ keepScroll: true }); schedule(150); }));
    }
    if (sim.state !== 'done') controls.appendChild(button(`⏹ ${t('allenatore.sim.stop')}`, 'btn--ghost', () => simFinish('stopped')));
    if (sim.state !== 'done') {
      /* chi decide gli imprevisti durante la simulazione */
      const who = el('div', 'mseg mseg--tight');
      who.appendChild(el('span', 'label mtalk__seglabel', t('allenatore.sim.whoLabel')));
      for (const w of ['vice', 'me']) {
        const b = el('button', `mseg__b ${sim.who === w ? 'is-on' : ''}`, t(`allenatore.sim.who.${w}`));
        b.type = 'button';
        b.addEventListener('click', () => {
          sim.who = w;
          try { localStorage.setItem('novanta:manager-simdecide', w); } catch { /* niente */ }
          if (w === 'vice' && sim.state === 'decide') { viceDecides(); persist(); sim.state = 'run'; render({ keepScroll: true }); schedule(200); return; }
          render({ keepScroll: true });
        });
        who.appendChild(b);
      }
      head.appendChild(who);
    }
    head.appendChild(controls);
    stage.appendChild(head);

    /* ferma per una decisione: le carte da scegliere, poi si riparte */
    if (sim.state === 'decide') {
      const q = career.queue || [];
      const wrap = el('section', 'mdecisions');
      wrap.appendChild(el('h3', 'mhead display', q.length ? t('allenatore.sim.decide') : t('allenatore.sim.decided')));
      q.forEach((item) => wrap.appendChild(eventCard(item)));
      if (!q.length) wrap.appendChild(button(`▶ ${t('allenatore.sim.resume')}`, 'btn--go btn--lg btn--block', () => { sim.state = 'run'; render({ keepScroll: true }); schedule(200); }));
      stage.appendChild(wrap);
    }

    if (sim.state === 'done') {
      const end = el('section', `mcard card msim__end ${sim.reason === 'sacked' ? 'is-bad' : ''}`);
      end.append(el('strong', 'display t-lg', t(`allenatore.sim.end.${sim.reason || 'reached'}`)), el('p', 'dim', t('allenatore.sim.endText', { n: Math.max(0, career.md - sim.from) })));
      end.appendChild(button(t(sim.reason === 'sacked' ? 'allenatore.seeOffers' : 'allenatore.sim.back'), 'btn--go btn--lg btn--block', () => { const s0 = sim; sim = null; history.length = 0; view = s0.reason === 'sacked' ? 'offers' : homeView(); render(); }));
      stage.appendChild(end);
    }

    /* la classifica che si muove giornata dopo giornata */
    const rows = table(career, data);
    const z = zones(league());
    const tcard = el('section', 'mtable mtable--full card msim__table');
    tcard.appendChild(el('h3', 'mhead display', t('allenatore.standings')));
    rows.forEach((r) => {
      const mv = sim.moved.get(r.id) || 0;
      const row = tableRow(r, z, mv);
      if (mv) row.classList.add(mv > 0 ? 'flash-up' : 'flash-down');
      tcard.appendChild(row);
    });

    /* la cronaca: una giornata per blocco, la più recente in cima */
    /* l'ultima giornata sta sopra la classifica, le precedenti nella cronaca */
    const now = el('section', 'mcard card msim__now');
    now.appendChild(el('h3', 'mhead display', t('allenatore.sim.now')));
    if (!sim.feed.length) now.appendChild(el('p', 'dim', t('allenatore.sim.starting')));
    else now.appendChild(feedBlock(sim.feed[0], true));
    stage.appendChild(now);
    const feed = el('section', 'mcard card msim__feed');
    feed.appendChild(el('h3', 'mhead display', t('allenatore.sim.feed')));
    if (sim.feed.length <= 1) feed.appendChild(el('p', 'dim', t('allenatore.sim.feedEmpty')));
    sim.feed.slice(1).forEach((blk) => feed.appendChild(feedBlock(blk, false)));

    /* i risultati dell'ultima giornata giocata */
    const lastMd = [...sim.feed].find((b) => b.md != null)?.md;
    const grid = el('div', 'msim__grid');
    const side = el('div', 'msim__side');
    if (lastMd != null) side.appendChild(lastRoundCard({ md: lastMd }));
    side.appendChild(feed);
    grid.append(tcard, side);
    stage.appendChild(grid);
  }

  function feedBlock(blk, fresh) {
    const box = el('article', `msim__blk ${fresh ? 'is-new' : ''}`);
    box.appendChild(el('span', 'label msim__lbl', blk.label));
    /* prima della partita: le decisioni della settimana prese dal vice */
    for (const it of blk.items.filter((x) => x.k === 'auto')) {
      const d = el('div', `msim__auto ${it.outcome ? `is-${it.outcome}` : ''}`);
      d.append(el('strong', 'msim__dec', `★ ${it.title}`), el('span', 'label', `${t('allenatore.sim.viceChose')}: ${it.choice}`), el('span', 'minbox__i', it.result));
      box.appendChild(d);
    }
    if (blk.mine) {
      const m = blk.mine;
      const home = m.h === career.club;
      const gf = m.res ? (home ? m.res[0] : m.res[1]) : 0;
      const ga = m.res ? (home ? m.res[1] : m.res[0]) : 0;
      const tone = gf > ga || (m.pens && (home ? m.pens[0] > m.pens[1] : m.pens[1] > m.pens[0])) ? 'W' : gf < ga || m.pens ? 'L' : 'D';
      const line = el('div', `msim__res is-${tone}`);
      line.append(el('span', `mres__h ${m.h === career.club ? 'mhl' : ''}`, clubName(m.h)), el('strong', 'num', m.res ? `${m.res[0]}–${m.res[1]}${m.pens ? ` (${m.pens[0]}–${m.pens[1]})` : ''}` : '–'), el('span', `mres__a ${m.a === career.club ? 'mhl' : ''}`, clubName(m.a)));
      box.appendChild(line);
      const tl = (m.timeline || []).filter((x) => x.type !== 'sub' && x.type !== 'halftime');
      if (tl.length) {
        const list = el('ol', 'mtl__list mtl__list--mini');
        for (const x of tl) list.appendChild(timelineRow(x, [clubName(m.h), clubName(m.a)]));
        box.appendChild(list);
      }
      if (blk.cupNote) box.appendChild(el('p', `minbox__i ${blk.cupNote === 'out' ? 'is-bad' : 'mreport__good'}`, t(`allenatore.sim.cup.${blk.cupNote}`)));
    }
    for (const it of blk.items) {
      if (it.k === 'news') box.appendChild(newsLine(it.n));
      else if (it.k === 'offer') box.appendChild(offerNews(it.o));
      else if (it.k === 'injury') box.appendChild(richText(it.weeks === 1 ? 'allenatore.injuryLine1' : 'allenatore.injuryLine', { name: it.name, weeks: it.weeks }, ['name'], 'minbox__i is-bad'));
      else if (it.k === 'evo') box.appendChild(richText(it.delta > 0 ? 'allenatore.sim.evoUp' : 'allenatore.sim.evoDown', { name: it.name, delta: `${it.delta > 0 ? '+' : ''}${it.delta}`, ovr: it.ovr }, ['name', 'delta']));
      else if (it.k === 'bonus') box.appendChild(el('p', 'minbox__i', t('allenatore.bonusPaid', { name: it.name, fee: euro(it.fee) })));
      else if (it.k === 'talks') box.appendChild(el('p', 'minbox__i is-bad', t('allenatore.talks.reason.windowClosed')));
      else if (it.k === 'board') box.appendChild(el('p', 'minbox__i mstrip__alert', t(`allenatore.${it.key}`)));
      else if (it.k === 'decision') box.appendChild(el('p', 'minbox__i msim__dec', `★ ${it.title}`));

    }
    return box;
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

  /* la partita senza schermo: in panchina decide il vice, con il suo buon senso */
  function autoRun(match) {
    match.autoUser = true;
    let guard = 0;
    while (!match.finished && guard++ < 600) {
      if (match.pending) { const adv = adviseMoment(match, 4, 0.45 + (career.flags.staff || 50) / 200); decide(match, adv ? adv.pick : match.pending.options[0].id); continue; }
      tick(match);
    }
    return match;
  }

  function quickMatch(cup = null) {
    refreshUserLineup(career);
    const nf = nextFixture(career);
    const match = autoRun(cup ? startCupMatch(career, data, cup.id) : startUserMatch(career));
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
      comp: compOf(cupId),
      onSave: (m) => { career.live = serializeMatch(m); persist(); },
      onFinish: (m) => { if (cupId) finishCup(m, cupId); else finishMatch(m, nf.fixture); },
    });
  }

  /* il resoconto tiene il tabellino della partita: gol, cartellini, infortuni, con il minuto */
  function matchHeader(match) {
    const ratings = playerRatings(match);
    const mine = match.sides.find((x) => x.key === match.user);
    const best = Object.entries(ratings).filter(([id]) => mine?.byId.has(id)).sort((a, b) => b[1] - a[1])[0];
    return {
      timeline: matchTimeline(match),
      teams: match.sides.map((x) => x.team.name),
      best: best ? { name: mine.byId.get(best[0]).name, rating: best[1] } : null,
    };
  }

  /** gioca la giornata (partita già finita) e chiude: il cuore comune di partita, simulazione rapida e simulazione lunga */
  function closeLeagueRound(match, fixture) {
    const head = matchHeader(match);
    applyMatch(career, match, fixture);
    simulateRest(career);
    const rep = closeMatchday(career, data);
    Object.assign(rep, head);
    rep.offersNew = incomingOffers(career, data).map((o) => ({ player: career.players[o.player]?.name || '', club: o.clubName, fee: o.fee, kind: o.kind }));
    rep.offers = (career.offersIn || []).length;
    return rep;
  }

  function finishMatch(match, fixture) {
    report = closeLeagueRound(match, fixture);
    career.live = null;
    career.liveCup = null;
    live = null;
    runSilentCups();
    if (career.phase === 'season') planWeek(career, data, events);
    persist();
    goView('report');
  }

  function finishCup(match, cupId) {
    const head = matchHeader(match);
    career.cupReport = Object.assign(closeCupRound(career, data, cupId, match), head);
    career.live = null;
    career.liveCup = null;
    live = null;
    runSilentCups();
    persist();
    goView('cupReport');
  }

  /* la competizione di una coppa: serve per il colore della partita */
  function compOf(cupId) {
    if (!cupId) return null;
    const cup = career.cups?.[cupId];
    if (!cup) return null;
    return cup.id === 'national' ? 'cup' : cup.comp;
  }

  function renderCupReport() {
    const rep = career.cupReport;
    if (!rep) { goView('hub'); return; }
    const cup = career.cups[rep.cupId];
    const comp = compOf(rep.cupId);
    const mine = rep.results.find((r) => r.h === career.club || r.a === career.club);
    if (mine) {
      const gf = mine.h === career.club ? mine.res[0] : mine.res[1];
      const ga = mine.h === career.club ? mine.res[1] : mine.res[0];
      const tone = rep.trophy || rep.advanced || gf > ga ? 'is-win' : rep.eliminated || gf < ga ? 'is-loss' : 'is-draw';
      const head = el('section', `mreport__head card ${tone} ${comp ? `comp comp--${comp}` : ''}`.trim());
      head.append(
        el('span', 'label', `${cupName(cup)} · ${t(`allenatore.cupRounds.${rep.round}`)}`),
        el('strong', 'display t-xxl num', `${mine.res[0]}–${mine.res[1]}${mine.pens ? ` (${mine.pens[0]}–${mine.pens[1]} ${t('allenatore.cup.pensShort')})` : ''}`),
        el('span', 'mreport__teams', `${clubName(mine.h)} · ${clubName(mine.a)}`),
      );
      if (rep.trophy) {
        head.appendChild(el('span', 'display t-xl mreport__good', t('allenatore.cup.trophy', { name: cupName(cup) })));
        if (!rep.shown) { rep.shown = true; persist(); showTrophyMoment([{ type: rep.trophy.type, league: career.league }]); audio.sfx.win?.(); }
      }
      else if (rep.eliminated) head.appendChild(el('span', 'display t-lg', t('allenatore.cup.eliminated')));
      else if (rep.advanced) head.appendChild(el('span', 'display t-lg mreport__good', t('allenatore.cup.advanced')));
      if (rep.best) head.appendChild(el('span', 'label', t('allenatore.tl.best', { name: rep.best.name, rating: rep.best.rating.toFixed(1) })));
      stage.appendChild(head);
      if (rep.timeline) stage.appendChild(timelineCard(rep.timeline, { home: rep.teams?.[0], away: rep.teams?.[1] }));
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
  /* 7. trofei                                                         */
  /* ---------------------------------------------------------------- */

  /* i trofei dell'Allenatore con le sagome della carriera: la bacheca è una sola */
  const TROPHY_SHAPE = { league: 'campionato', league2: 'campionato', promotion: 'promozione', cup: 'coppa', ucl: 'ucl', uel: 'uel', uecl: 'uecl' };

  function trophyName(tr) {
    return t(`allenatore.trophyNames.${tr.type}`, { league: (tr.type === 'cup' ? leagueOf(data, tr.league)?.cup : leagueOf(data, tr.league)?.name) || '' });
  }

  function trophyBadge(tr) {
    const shape = TROPHY_SHAPE[tr.type] || 'coppa';
    const b = el('div', 'tbadge');
    b.style.color = TROPHY_COLOR[shape] || 'var(--lime)';
    b.innerHTML = trophySvg(shape, 44);
    b.appendChild(el('span', 'tbadge__n label', trophyName(tr)));
    return b;
  }

  /** la sagoma del trofeo più importante a tutto schermo, per un attimo */
  function showTrophyMoment(trophies) {
    const order = ['ucl', 'league', 'uel', 'uecl', 'cup', 'league2', 'promotion'];
    const best = [...trophies].sort((a, b) => order.indexOf(a.type) - order.indexOf(b.type))[0];
    if (!best) return;
    const shape = TROPHY_SHAPE[best.type] || 'coppa';
    const overlay = el('div', 'trophy-moment');
    const inner = el('div', 'trophy-moment__inner');
    inner.style.color = TROPHY_COLOR[shape] || 'var(--lime)';
    inner.innerHTML = trophySvg(shape, 180);
    inner.append(el('p', 'trophy-moment__name display', trophyName(best)), el('span', 'label', career.clubs[career.club]?.name || ''));
    overlay.appendChild(inner);
    (document.getElementById('overlay-root') || document.body).appendChild(overlay);
    const close = () => { overlay.classList.add('is-out'); setTimeout(() => overlay.remove(), 300); };
    overlay.addEventListener('click', close);
    setTimeout(close, 2400);
  }

  /* ---------------------------------------------------------------- */
  /* 7b. resoconto della giornata, fine stagione, offerte              */
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
      if (rep.best) head.appendChild(el('span', 'label', t('allenatore.tl.best', { name: rep.best.name, rating: rep.best.rating.toFixed(1) })));
      stage.appendChild(head);
      if (rep.timeline) stage.appendChild(timelineCard(rep.timeline, { home: rep.teams?.[0], away: rep.teams?.[1] }));
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
    stage.appendChild(lastRoundCard(rep));
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
      for (const x of rep.injuries) { const p = career.players[x.id]; if (p) inj.appendChild(el('p', '', t(x.weeks === 1 ? 'allenatore.injuryLine1' : 'allenatore.injuryLine', { name: p.name, weeks: x.weeks }))); }
      stage.appendChild(inj);
    }
    /* il mercato della giornata: colpi degli altri, trattative saltate, bonus pagati */
    if (rep.transfers?.length || rep.bonuses?.length || rep.talksExpired || rep.offersNew?.length) {
      const mk = el('section', 'mcard card');
      mk.appendChild(el('h3', 'mhead display', t('allenatore.news.title')));
      if (rep.talksExpired) mk.appendChild(el('p', 'mmarket__out is-bad', t('allenatore.talks.reason.windowClosed')));
      for (const o of rep.offersNew || []) mk.appendChild(offerNews(o));
      for (const b of rep.bonuses || []) mk.appendChild(el('p', 'minbox__i', t('allenatore.bonusPaid', { name: b.name, fee: euro(b.fee) })));
      for (const n of (rep.transfers || []).slice(0, 8)) mk.appendChild(newsLine(n));
      if (rep.offersNew?.length) mk.appendChild(button(t('allenatore.market.goOffers'), 'btn--ghost btn--block', () => goView('market')));
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
      const tro = el('section', 'mcard card mtrophies');
      tro.appendChild(el('h3', 'mhead display', t('allenatore.seasonTrophies')));
      const row = el('div', 'tbadges');
      for (const tr of s.trophies) row.appendChild(trophyBadge(tr));
      tro.appendChild(row);
      stage.appendChild(tro);
      stagger(row.children, 'anim-snap', 140);
      /* il trofeo più importante a tutto schermo, come in carriera */
      if (!s.shown) { s.shown = true; showTrophyMoment(s.trophies); audio.sfx.win?.(); }
    }

    /* il bilancio: partite, punti, marcatori, giudizio della società */
    const rec = s.record || { p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0 };
    const bil = el('section', 'mcard card');
    bil.appendChild(el('h3', 'mhead display', t('allenatore.seasonRecord')));
    const grid = el('div', 'mpsheet__stats');
    for (const [k, v] of [['played', rec.p], ['won', rec.w], ['drawn', rec.d], ['lost', rec.l], ['ppg', (s.ppg ?? 0).toFixed(2)], ['scored', rec.gf], ['conceded', rec.ga]]) {
      const b = el('div', 'mstat');
      b.append(el('strong', 'display num', String(v)), el('span', 'label', t(`allenatore.coachStats.${k}`)));
      grid.appendChild(b);
    }
    bil.appendChild(grid);
    const happy = el('p', `mseason__board ${s.boardHappy ? 'is-good' : 'is-bad'}`, t(s.boardHappy ? 'allenatore.boardHappy' : 'allenatore.boardUnhappy', { target: s.objective.target, pos: s.pos }));
    bil.appendChild(happy);
    stage.appendChild(bil);

    const sc = s.scorers;
    if (sc && (sc.league.length || sc.europe.length || sc.cup.length)) {
      const card = el('section', 'mcard card');
      card.appendChild(el('h3', 'mhead display', t('allenatore.topScorers')));
      const block = (key, list) => {
        if (!list.length) return;
        card.appendChild(el('h4', 'label mseason__sub', key));
        for (const x of list) {
          const r = el('div', `mres ${x.club === career.club ? 'is-me' : ''}`);
          r.append(el('span', 'mres__h', x.name), el('span', 'mres__a dim', clubName(x.club)), el('strong', 'mres__s num', String(x.g)));
          card.appendChild(r);
        }
      };
      block(league().name, sc.league);
      const euro = career.cups?.europe;
      if (euro) block(t(`allenatore.zones.${euro.comp}`), sc.europe);
      const nat = career.cups?.national;
      if (nat) block(nat.name, sc.cup);
      stage.appendChild(card);
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
    if (s.retiredAround?.length) squad.appendChild(el('p', 'dim', t('allenatore.retiredAround', { names: s.retiredAround.map((x) => `${x.name} (${x.club}, ${x.age})`).join(', ') })));
    if (s.left.length) squad.appendChild(el('p', '', t('allenatore.leftLine', { names: s.left.map((x) => x.name).join(', ') })));
    if (s.returned?.length) squad.appendChild(el('p', '', t('allenatore.returnedLine', { names: s.returned.map((x) => x.name).join(', ') })));
    if (s.loanAgain?.length) squad.appendChild(el('p', '', t('allenatore.loanAgainLine', { names: s.loanAgain.map((x) => x.name).join(', ') })));
    const youth = s.youth.map((id) => career.players[id]).filter(Boolean);
    if (youth.length) {
      squad.appendChild(el('p', '', t('allenatore.youthLine', { n: youth.length })));
      for (const p of youth) squad.appendChild(playerRow(p, career.season + 1, { onClick: () => playerSheet(p.id) }));
    }
    stage.appendChild(squad);
    /* le chiamate di altri club: non arrivano ogni anno */
    if (s.jobOffers?.length && career.phase !== 'sacked') {
      const box = el('section', 'mcard card');
      box.append(el('h3', 'mhead display', t('allenatore.jobCallsTitle')), el('p', 'dim', t('allenatore.jobCallsText')));
      for (const o of s.jobOffers) {
        const lg = leagueOf(data, o.league);
        const b = el('button', 'mclubpick');
        b.type = 'button';
        b.append(clubBadge(o, { size: 32, sub: `${flagEmoji(lg.code)} ${lg.name}` }), el('span', 'mclubpick__str display num', String(Math.round(o.strength))));
        b.addEventListener('click', () => sheet({
          title: t('allenatore.jobCallTitle', { club: o.name }),
          body: el('p', 'dim', t('allenatore.jobCallText', { club: o.name, league: lg.name })),
          actions: [
            { label: t('allenatore.jobStay'), onClick: (c) => c() },
            { label: t('allenatore.jobAccept'), variant: 'btn--go', onClick: (c) => {
              c();
              takeJob(career, data, o.club);
              planWeek(career, data, events);
              persist();
              history.length = 0;
              goView('hub');
            } },
          ],
        }));
        box.appendChild(b);
      }
      stage.appendChild(box);
    }
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
  return () => { stopSim(); if (liveTeardown) liveTeardown(); };
}
