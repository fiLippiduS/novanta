/* CARRIERA — dai sedici anni alla fine.
   Ogni anno l'allenamento e le scelte, quello che capita non lo scegli, e a
   fine stagione i numeri del tuo ruolo dicono com'è andata davvero. */

import { t, lang } from '../core/i18n.js';
import * as store from '../core/storage.js';
import * as audio from '../core/audio.js';
import { go } from '../core/router.js';
import { el, topbar, crest } from '../ui/components.js';
import { createCommentary } from '../ui/commentary.js';
import { stagger, replay, waveFrom, quake } from '../ui/motion.js';
import * as ads from '../ads/adapter.js';
import { STYLES, IDOLS, attrsOf, overall } from '../career/model.js';
import { NATIONS, FIRST_SEASON_END } from '../career/nations.js';
import { clubDemand } from '../career/season.js';
import {
  CAREER_VERSION, newCareer, signFor, beginSeason, chooseFocus, chooseOption, readyToPlay,
  finishSeason, openMarket, retire, fillText, retirementAge,
} from '../career/runner.js';
import { trophySvg, TROPHY_COLOR, TROPHY_ORDER } from '../career/trophies.js';
import { shareText, copyOrShare } from '../ui/share.js';
import { countryName, flagEmoji, nationTag, ensureFlagFont } from '../ui/flags.js';
import { normalize } from '../core/match.js';

const rand = Math.random;
let cache = null;

async function loadData() {
  const l = lang();
  if (cache && cache.lang === l) return cache;
  const [clubs, events, text] = await Promise.all([
    fetch('data/clubs.json').then((r) => r.json()),
    fetch('data/career/events.json').then((r) => r.json()),
    fetch(`data/career/text.${l}.json`).then((r) => (r.ok ? r.json() : null)).catch(() => null),
  ]);
  const fallback = text ? null : await fetch('data/career/text.en.json').then((r) => r.json());
  cache = { lang: l, clubs: clubs.clubs, events: events.events, text: text || fallback };
  return cache;
}

/* quali numeri contano per ciascun ruolo, nell'ordine in cui si mostrano:
   gol e assist per tutti tranne il portiere, poi i numeri chiave del ruolo */
const ROLE_STATS = {
  POR: ['apps', 'clean', 'conceded', 'penSaved'],
  DC: ['apps', 'goals', 'assists', 'tackles', 'aerials', 'clean'],
  TZ: ['apps', 'goals', 'assists', 'keyPasses', 'tackles', 'clean'],
  MED: ['apps', 'goals', 'assists', 'recoveries', 'tackles', 'keyPasses'],
  MEZ: ['apps', 'goals', 'assists', 'keyPasses', 'dribbles'],
  ALA: ['apps', 'goals', 'assists', 'dribbles', 'keyPasses'],
  PUN: ['apps', 'goals', 'assists', 'aerials'],
};

export async function mount(host) {
  ensureFlagFont();
  const data = await loadData();
  const { clubs, events, text } = data;

  const shell = el('div', 'shell carriera');
  const bar = topbar({ title: t('carriera.title'), onExit: () => go('hub') });
  const stage = el('div', 'car__stage');
  const comm = createCommentary();
  shell.append(bar.el, stage, comm.el);
  host.appendChild(shell);

  /* ---------------- stato ---------------- */

  let save = store.get('career');
  let oldSave = false;
  if (save && save.v !== CAREER_VERSION) { oldSave = true; save = null; }
  let draft = null;
  let view = save && save.player && !save.player.retired ? (save.club ? 'season' : 'pickclub') : 'intro';

  /* la carriera si salva intera: l'unione profonda del salvataggio lascerebbe
     in giro chiavi della stagione prima (doti cambiate, statistiche) */
  const persist = () => { store.save({ career: null }); store.save({ career: save }); };
  const tx = (id) => text[id] || {};
  const fill = (s, extra) => fillText(s, save, { nation: countryName(save.player.nation), ...extra });

  /* ---------------- pezzi riutilizzabili ---------------- */

  function clubChip(club, size = 34) {
    const c = el('div', 'clubchip');
    const box = el('div', 'clubchip__txt');
    box.append(
      el('strong', 'clubchip__name', club.name),
      el('span', 'clubchip__sub label', `${flagEmoji(club.code)} ${countryName(club.code)} · ${t('carriera.tier')[club.tier - 1]}`),
    );
    c.append(crest(club.colors, size), box);
    return c;
  }

  function statBox(label, value, tone) {
    const b = el('div', `cstat ${tone ? `cstat--${tone}` : ''}`.trim());
    b.append(el('span', 'label', label), el('strong', 'cstat__v display num', String(value)));
    return b;
  }

  function meter(label, value, color, delta = null) {
    const m = el('div', 'meter');
    const head = el('div', 'meter__head');
    const num = el('span', 'num', String(Math.round(value)));
    if (delta) {
      const d = el('span', `meter__delta ${delta > 0 ? 'is-up' : 'is-down'}`, `${delta > 0 ? '+' : ''}${delta}`);
      num.appendChild(d);
    }
    head.append(el('span', 'label', label), num);
    const track = el('div', 'meter__track');
    const fillBar = el('i', 'meter__fill');
    fillBar.style.width = `${Math.max(2, Math.min(100, value))}%`;
    fillBar.style.background = color;
    track.appendChild(fillBar);
    m.append(head, track);
    return m;
  }

  function trophyBadge(type, n = 1) {
    const b = el('span', 'tbadge');
    b.style.color = TROPHY_COLOR[type] || 'var(--chalk)';
    b.innerHTML = trophySvg(type, 38);
    b.appendChild(el('span', 'tbadge__n label', t(`carriera.trophyNames.${type}`)));
    if (n > 1) b.appendChild(el('span', 'tbadge__x display num', `×${n}`));
    return b;
  }

  /* ---------------- 1. ingresso ---------------- */

  function renderIntro() {
    const box = el('div', 'car__intro card halftone misreg card--print anim-rise');
    box.append(
      el('h3', 'display t-xxl', t('carriera.title')),
      el('p', 'car__lead', t('carriera.intro')),
      el('p', 'dim', t('carriera.introText')),
    );
    if (oldSave) box.appendChild(el('p', 'car__note', t('carriera.oldSave')));

    if (save && save.player && !save.player.retired) {
      const p = save.player;
      const resume = el('button', 'btn btn--go btn--lg btn--block', `${t('carriera.continue')} · ${p.name} (${p.age})`);
      resume.type = 'button';
      resume.addEventListener('click', () => { view = save.club ? 'season' : 'pickclub'; render(); });
      box.appendChild(resume);
    } else if (save && save.player && save.player.retired) {
      const see = el('button', 'btn btn--ghost btn--block', t('carriera.lastCareer', { name: save.player.name }));
      see.type = 'button';
      see.addEventListener('click', () => { view = 'end'; render(); });
      box.appendChild(see);
    }

    const fresh = el('button', `btn ${save && !save.player.retired ? 'btn--ghost' : 'btn--go btn--lg'} btn--block`,
      save && !save.player.retired ? t('carriera.restart') : t('carriera.new'));
    fresh.type = 'button';
    fresh.addEventListener('click', () => {
      draft = { name: '', role: null, style: null, idol: null, number: null, nation: null, step: 0 };
      view = 'create';
      audio.sfx.tick();
      render();
    });
    box.appendChild(fresh);
    stage.appendChild(box);
  }

  /* ---------------- 2. chi sei ---------------- */

  const STEPS = ['name', 'role', 'style', 'idol', 'number', 'nation'];

  function renderCreate() {
    const step = STEPS[draft.step];
    const box = el('div', 'car__create card halftone misreg card--print');

    const pips = el('div', 'pips');
    STEPS.forEach((_, i) => {
      const p = el('i', 'pip');
      if (i < draft.step) p.classList.add('pip--full');
      if (i === draft.step) p.classList.add('pip--now');
      pips.appendChild(p);
    });
    const back = el('button', 'car__back label', `← ${t('common.back')}`);
    back.type = 'button';
    back.addEventListener('click', () => {
      if (draft.step === 0) { view = 'intro'; render(); return; }
      draft.step -= 1;
      render();
    });
    const topline = el('div', 'car__topline');
    topline.append(back, pips);
    box.appendChild(topline);

    const next = () => {
      draft.step += 1;
      audio.sfx.tick();
      if (draft.step >= STEPS.length) startCareer();
      else render();
    };

    if (step === 'name') {
      box.append(el('h3', 'display t-xl', t('carriera.yourName')));
      const form = el('form', 'car__nameform');
      const input = el('input', 'squad__input');
      input.type = 'text';
      input.maxLength = 28;
      input.placeholder = t('carriera.namePlaceholder');
      input.value = draft.name;
      input.autocomplete = 'off';
      const ok = el('button', 'btn btn--go btn--block', t('carriera.begin'));
      ok.type = 'submit';
      form.append(input, ok);
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const v = input.value.trim();
        if (v.length < 2) { replay(input, 'anim-shake'); return; }
        draft.name = v;
        next();
      });
      box.appendChild(form);
      setTimeout(() => input.focus(), 60);
    }

    if (step === 'role') {
      box.append(el('h3', 'display t-xl', t('carriera.chooseRole')), el('p', 'dim', t('carriera.chooseRoleText')));
      box.appendChild(pitch433((role) => { draft.role = role; draft.style = null; draft.idol = null; next(); }));
    }

    if (step === 'style') {
      box.append(el('h3', 'display t-xl', t('carriera.chooseStyle', { role: t(`carriera.roles.${draft.role}`).toLowerCase() })));
      const grid = el('div', 'optgrid optgrid--wide');
      STYLES[draft.role].forEach((s) => {
        const b = el('button', 'optcard optcard--tall');
        b.type = 'button';
        b.append(el('strong', 'optcard__t display', t(`carriera.styles.${s}`)), el('span', 'optcard__d', t(`carriera.styleHint.${s}`)));
        b.addEventListener('click', () => { draft.style = s; next(); });
        grid.appendChild(b);
      });
      box.appendChild(grid);
      stagger(grid.children, 'anim-rise', 45);
    }

    if (step === 'idol') {
      box.append(el('h3', 'display t-xl', t('carriera.chooseIdol')), el('p', 'dim', t('carriera.chooseIdolText')));
      const grid = el('div', 'optgrid optgrid--wide');
      IDOLS[draft.role].forEach((idol) => {
        const b = el('button', 'optcard optcard--idol');
        b.type = 'button';
        b.append(
          el('strong', 'optcard__t display', idol.name),
          el('span', 'optcard__d', t(`carriera.idolHint.${idol.id}`)),
          el('span', 'optcard__k label', `+5 ${t(`carriera.attrs.${idol.attr}`)}`),
        );
        b.addEventListener('click', () => { draft.idol = idol.id; next(); });
        grid.appendChild(b);
      });
      box.appendChild(grid);
      stagger(grid.children, 'anim-rise', 45);
    }

    if (step === 'number') {
      box.append(el('h3', 'display t-xl', t('carriera.chooseNumber')), el('p', 'dim', t('carriera.chooseNumberText')));
      const form = el('form', 'car__numform');
      const input = el('input', 'numinput display num');
      input.type = 'text';
      input.inputMode = 'numeric';
      input.maxLength = 2;
      input.placeholder = draft.role === 'POR' ? '1' : draft.role === 'PUN' ? '9' : '10';
      input.autocomplete = 'off';
      input.setAttribute('aria-label', t('carriera.chooseNumber'));
      input.addEventListener('input', () => { input.value = input.value.replace(/\D/g, '').slice(0, 2); });
      const ok = el('button', 'btn btn--go btn--block', t('carriera.begin'));
      ok.type = 'submit';
      form.append(input, ok);
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const n = parseInt(input.value, 10);
        if (!Number.isFinite(n) || n < 1 || n > 99) { replay(input, 'anim-shake'); return; }
        draft.number = n;
        next();
      });
      box.appendChild(form);
      setTimeout(() => input.focus(), 60);
    }

    if (step === 'nation') {
      box.append(el('h3', 'display t-xl', t('carriera.chooseNation')), el('p', 'dim', t('carriera.chooseNationText')));
      const search = el('input', 'squad__input car__natsearch');
      search.type = 'search';
      search.placeholder = t('carriera.nationSearch');
      search.autocomplete = 'off';
      const grid = el('div', 'natgrid');
      const sorted = [...NATIONS].sort((a, b) => countryName(a.code).localeCompare(countryName(b.code), lang()));
      const paint = () => {
        const q = normalize(search.value);
        grid.textContent = '';
        sorted.filter((n) => !q || normalize(countryName(n.code)).includes(q)).forEach((n) => {
          const b = el('button', `natcell${n.tier === 1 ? ' natcell--top' : ''}`);
          b.type = 'button';
          b.append(el('span', 'flag', flagEmoji(n.code) || ''), el('span', '', countryName(n.code)));
          if (n.tier === 1) b.title = t('carriera.topNation');
          b.addEventListener('click', () => { draft.nation = n.code; next(); });
          grid.appendChild(b);
        });
      };
      search.addEventListener('input', paint);
      paint();
      box.append(search, grid, el('p', 'car__note label', t('carriera.nationNote')));
    }

    stage.appendChild(box);
    replay(box, 'anim-rise');
  }

  /* Il 4-3-3 schierato, centrato: si sceglie toccando la posizione. */
  const FORMATION = [
    { role: 'POR', x: 50, y: 87 },
    { role: 'TZ', x: 15, y: 72 }, { role: 'DC', x: 38, y: 77 },
    { role: 'DC', x: 62, y: 77 }, { role: 'TZ', x: 85, y: 72 },
    { role: 'MEZ', x: 26, y: 50 }, { role: 'MED', x: 50, y: 58 }, { role: 'MEZ', x: 74, y: 50 },
    { role: 'ALA', x: 17, y: 24 }, { role: 'PUN', x: 50, y: 16 }, { role: 'ALA', x: 83, y: 24 },
  ];

  function pitch433(onPick) {
    const holder = el('div', 'pitch-wrap');
    const wrap = el('div', 'pitch');
    wrap.innerHTML = `<svg class="pitch__lines" viewBox="0 0 100 150" preserveAspectRatio="none" aria-hidden="true">
      <rect x="1" y="1" width="98" height="148" fill="none" stroke="rgba(237,232,218,0.16)" stroke-width="0.6"/>
      <line x1="1" y1="75" x2="99" y2="75" stroke="rgba(237,232,218,0.16)" stroke-width="0.6"/>
      <circle cx="50" cy="75" r="14" fill="none" stroke="rgba(237,232,218,0.16)" stroke-width="0.6"/>
      <rect x="24" y="1" width="52" height="20" fill="none" stroke="rgba(237,232,218,0.14)" stroke-width="0.6"/>
      <rect x="24" y="129" width="52" height="20" fill="none" stroke="rgba(237,232,218,0.14)" stroke-width="0.6"/>
      <rect x="38" y="1" width="24" height="8" fill="none" stroke="rgba(237,232,218,0.12)" stroke-width="0.5"/>
      <rect x="38" y="141" width="24" height="8" fill="none" stroke="rgba(237,232,218,0.12)" stroke-width="0.5"/>
    </svg>`;
    FORMATION.forEach((pos, i) => {
      const b = el('button', `spot spot--${pos.role}`);
      b.type = 'button';
      b.style.left = `${pos.x}%`;
      b.style.top = `${pos.y}%`;
      b.append(el('span', 'spot__dot'), el('span', 'spot__k label', t(`carriera.rolesShort.${pos.role}`)));
      b.title = t(`carriera.roles.${pos.role}`);
      b.setAttribute('aria-label', t(`carriera.roles.${pos.role}`));
      b.style.setProperty('--i', i);
      b.addEventListener('click', () => { audio.sfx.hit(); onPick(pos.role); });
      wrap.appendChild(b);
    });
    holder.appendChild(wrap);
    return holder;
  }

  /* ---------------- 3. la prima squadra ---------------- */

  function startCareer() {
    save = newCareer(rand, draft, clubs);
    oldSave = false;
    view = 'pickclub';
    persist();
    render();
  }

  function renderPickClub() {
    const box = el('div', 'car__pick');
    box.append(el('h3', 'display t-xl', t('carriera.chooseClub')), el('p', 'dim', t('carriera.chooseClubText')));
    const list = el('div', 'offers');
    save.offersList.forEach((c) => {
      const b = el('button', 'offer');
      b.type = 'button';
      b.style.setProperty('--team-a', c.colors[0]);
      b.append(clubChip(c, 42), el('span', 'offer__go', '→'));
      b.addEventListener('click', () => {
        signFor(save, c);
        audio.sfx.goal();
        startSeason();
      });
      list.appendChild(b);
    });
    box.appendChild(list);
    stage.appendChild(box);
    stagger(list.children, 'anim-rise', 70);
  }

  /* ---------------- 4. la stagione ---------------- */

  function startSeason() {
    beginSeason(save, rand, events);
    view = 'season';
    audio.sfx.whistle();
    persist();
    render();
  }

  /* il turno che sta per cominciare: due stagioni */
  function seasonLabel(p) {
    const end = FIRST_SEASON_END + p.seasons.length;
    return `${end - 1}–${String(end + 1).slice(2)}`;
  }

  function playerHead() {
    const p = save.player;
    const club = save.club;
    const head = el('div', 'car__head card halftone misreg card--print');
    head.style.setProperty('--misreg-color', club.colors[0]);

    const idn = el('div', 'car__id');
    const who = el('div', 'car__who');
    const idol = IDOLS[p.role].find((i) => i.id === p.idol);
    who.append(
      el('strong', 'car__name display t-lg', p.name),
      el('span', 'car__role label', `${t(`carriera.roles.${p.role}`)} · ${t(`carriera.styles.${p.style}`)}`),
    );
    const nat = nationTag(p.nation);
    nat.classList.add('car__nat');
    who.appendChild(nat);
    idn.append(el('span', 'car__num display num', String(p.number)), who);
    head.append(idn, clubChip(club, 38));
    if (club.loan) head.appendChild(el('p', 'label car__loan', t('carriera.onLoan')));

    const line = el('div', 'car__line');
    line.append(
      statBox(t('carriera.turn'), seasonLabel(p)),
      statBox(t('carriera.age'), p.age),
      statBox(t('carriera.overall'), overall(p), 'good'),
      statBox(t('carriera.demand'), clubDemand(club.tier)),
    );
    head.appendChild(line);

    const meters = el('div', 'meters');
    meters.append(
      meter(t('carriera.morale'), p.morale, 'var(--lime)'),
      meter(t('carriera.fitness'), p.fitness, 'var(--sky)'),
      meter(t('carriera.fame'), p.reputation, 'var(--amber)'),
      meter(t('carriera.trust'), p.trust, 'var(--flare)'),
    );
    head.appendChild(meters);

    const attrs = el('div', 'attrs');
    attrsOf(p.role).forEach((a) => {
      const m = meter(t(`carriera.attrs.${a}`), p.attrs[a], a === p.training.attr ? 'var(--lime)' : 'var(--chalk-2)');
      if (a === p.training.attr) m.classList.add('meter--focus');
      attrs.appendChild(m);
    });
    head.appendChild(attrs);

    if (p.training.attr) {
      head.appendChild(el('p', 'car__training label', t('carriera.trainingLevel', { attr: t(`carriera.attrs.${p.training.attr}`), n: p.training.level })));
    }
    if (p.perks.length) {
      const perks = el('div', 'perks');
      p.perks.forEach((k) => perks.appendChild(el('span', 'perk', t(`carriera.perks.${k}`))));
      head.appendChild(perks);
    }
    if (idol) head.appendChild(el('p', 'car__idol label', `${t('carriera.idol')}: ${idol.name}`));
    if (p.national.called && !p.national.retired) {
      head.appendChild(el('p', 'car__natline label', t('carriera.natLine', { nation: countryName(p.nation), caps: p.national.caps, goals: p.national.goals })));
    }
    return head;
  }

  function renderSeason() {
    const p = save.player;
    if (!save.pending) { startSeason(); return; }
    stage.appendChild(playerHead());

    const dec = el('div', 'car__dec');
    dec.appendChild(el('h3', 'display t-lg', t('carriera.decisions')));

    /* l'allenamento: sempre, e sempre sulle doti del ruolo */
    const focus = save.pending.focus;
    const fcard = el('div', 'qcard card halftone misreg card--print qcard--focus');
    fcard.dataset.anchor = 'focus';
    fcard.append(el('h4', 'qcard__prompt display t-lg', t('carriera.focusTitle')), el('p', 'dim', t('carriera.focusText')));
    const fopts = el('div', 'options');
    focus.options.forEach((a) => {
      const b = el('button', 'option');
      b.type = 'button';
      const label = a === 'rest' ? t('carriera.rest') : t(`carriera.attrs.${a}`);
      const sub = a === 'rest' ? t('carriera.restHint')
        : a === p.training.attr ? t('carriera.keepTraining', { n: Math.min(5, p.training.level + 1) }) : t('carriera.newTraining');
      b.append(el('span', 'option__label', label), el('span', 'option__sub', sub));
      if (focus.chosen === a) b.classList.add('option--right');
      if (focus.chosen) b.disabled = true;
      b.addEventListener('click', () => {
        const top = fcard.getBoundingClientRect().top;
        chooseFocus(save, a);
        audio.sfx.hit();
        waveFrom(b, 'var(--lime)');
        persist();
        render({ anchor: 'focus', top });
      });
      fopts.appendChild(b);
    });
    fcard.appendChild(fopts);
    dec.appendChild(fcard);

    save.pending.decisions.forEach((slot, idx) => {
      const ev = events.find((e) => e.id === slot.id);
      const words = tx(slot.id);
      if (!ev || !words.t) return;
      const c = el('div', 'qcard card halftone misreg card--print');
      c.dataset.anchor = `dec-${idx}`;
      if (ev.group === 'national') c.classList.add('qcard--national');
      if (ev.group === 'role') c.classList.add('qcard--role');
      c.append(el('span', 'qcard__kind label', t(`carriera.kind.${ev.group || 'life'}`)), el('h4', 'qcard__prompt display t-lg', fill(words.t)), el('p', 'dim', fill(words.d)));
      const opts = el('div', 'options');
      ev.o.forEach((o, i) => {
        const b = el('button', 'option');
        b.type = 'button';
        b.append(el('span', 'option__label', fill(words.o[i].l)));
        if (slot.chosen === i) b.classList.add('option--right');
        if (slot.chosen !== null) b.disabled = true;
        b.addEventListener('click', () => {
          const top = c.getBoundingClientRect().top;
          const res = chooseOption(save, events, idx, i, rand);
          audio.sfx[res && res.outcome === 'lose' ? 'miss' : 'hit']();
          persist();
          render({ anchor: `dec-${idx}`, top });
        });
        opts.appendChild(b);
      });
      c.appendChild(opts);
      if (slot.chosen !== null) {
        const o = words.o[slot.chosen];
        const outcome = slot.outcome === 'win' ? o.rw : slot.outcome === 'lose' ? o.rl : o.r;
        c.appendChild(el('p', `qcard__note ${slot.outcome === 'lose' ? 'qcard__note--bad' : ''}`, fill(outcome)));
      }
      dec.appendChild(c);
    });

    const play = el('button', 'btn btn--go btn--lg btn--block', t('carriera.playSeason'));
    play.type = 'button';
    const left = (focus.chosen ? 0 : 1) + save.pending.decisions.filter((d) => d.chosen === null).length;
    play.disabled = left > 0;
    play.textContent = left > 0 ? t('carriera.choicesLeft', { n: left }) : t('carriera.playSeason');
    play.addEventListener('click', runSeason);
    dec.appendChild(play);
    stage.appendChild(dec);
  }

  /* ---------------- 5. com'è andata ---------------- */

  function runSeason() {
    if (!readyToPlay(save)) return;
    finishSeason(save, rand, events);
    view = 'result';
    persist();
    render();
  }

  function highlightLine(h) {
    switch (h.id) {
      case 'perk': return t('carriera.hl.perk', { perk: t(`carriera.perks.${h.perk}`) });
      case 'missedTournament': return t('carriera.hl.missedTournament', { tour: t(`carriera.trophyNames.${h.tour}`) });
      default: return t(`carriera.hl.${h.id}`, { n: h.n });
    }
  }

  function seasonCard(record, isLast) {
    const p = save.player;
    const card = el('div', 'car__report card halftone misreg card--print');
    card.style.setProperty('--misreg-color', record.club.colors[0]);
    const h = el('div', 'car__reporthead');
    h.append(
      el('span', 'label', `${t('carriera.season')} ${record.year - 1}/${String(record.year).slice(2)} · ${record.age} ${t('carriera.years')}`),
      el('strong', 'display t-xl', record.club.name),
      el('span', 'label car__division', `${t('carriera.position')}: ${record.position}º · ${t(record.division === 2 ? 'carriera.secondDivision' : 'carriera.firstDivision')}`),
    );
    card.appendChild(h);

    const grid = el('div', 'car__grid');
    ROLE_STATS[p.role].forEach((k) => grid.appendChild(statBox(t(`carriera.stats.${k}`), record.stats[k], k === 'goals' || k === 'clean' ? 'good' : null)));
    grid.appendChild(statBox(t('carriera.rating'), record.stats.apps > 0 ? record.rating.toFixed(2) : '—'));
    card.appendChild(grid);

    if (record.cont || record.cwc) {
      const comps = el('p', 'car__comps label');
      const names = [];
      if (record.cont) names.push(t(`carriera.trophyNames.${record.cont}`));
      if (record.cwc) names.push(t('carriera.trophyNames.mondiale_club'));
      comps.textContent = `${t('carriera.playedIn')}: ${names.join(' · ')}`;
      card.appendChild(comps);
    }

    if (record.injury) {
      card.appendChild(el('p', 'car__out', t(`carriera.injury.${record.injury.severity}`, { n: record.injury.weeks })));
    }

    if (record.national.caps || record.national.tournaments.length) {
      const nat = el('div', 'car__natbox');
      nat.appendChild(el('p', 'label', `${flagEmoji(p.nation)} ${countryName(p.nation)}`));
      nat.appendChild(el('p', '', t('carriera.natSeason', { caps: record.national.caps, goals: record.national.goals })));
      record.national.tournaments.forEach((tour) => {
        const key = !tour.played ? 'carriera.tourMissed' : tour.won ? 'carriera.tourWon' : 'carriera.tourLost';
        nat.appendChild(el('p', tour.won ? 'good' : 'dim', t(key, { tour: t(`carriera.trophyNames.${tour.id}`) })));
      });
      card.appendChild(nat);
    }

    if (record.trophies.length) {
      const won = el('div', 'car__won');
      won.appendChild(el('p', 'label', t('carriera.won')));
      const row = el('div', 'tbadges');
      [...record.trophies].sort((x, y) => TROPHY_ORDER.indexOf(x) - TROPHY_ORDER.indexOf(y)).forEach((tr) => row.appendChild(trophyBadge(tr)));
      won.appendChild(row);
      card.appendChild(won);
    }

    /* crescita: doti e traguardi */
    const growth = el('div', 'car__growth');
    const diff = record.overallAfter - record.overall;
    growth.appendChild(el('p', 'label', t('carriera.growth', { ovr: record.overallAfter, diff: diff >= 0 ? `+${diff}` : diff })));
    const deltas = el('div', 'deltas');
    Object.entries(record.changes).forEach(([a, d]) => {
      if (!d) return;
      deltas.appendChild(el('span', `delta ${d > 0 ? 'is-up' : 'is-down'}`, `${d > 0 ? '+' : ''}${d} ${t(`carriera.attrs.${a}`)}`));
    });
    growth.appendChild(deltas);
    card.appendChild(growth);

    const hl = el('ul', 'car__hl');
    /* l'infortunio ha già la sua riga sopra */
    const moments = record.highlights.filter((x) => !x.id.startsWith('injury_'));
    moments.forEach((x) => hl.appendChild(el('li', '', highlightLine(x))));
    const nextCup = isLast && save.club.cont;
    if (nextCup) hl.appendChild(el('li', 'good', t('carriera.nextCont', { cup: t(`carriera.trophyNames.${save.club.cont}`) })));
    if (moments.length || nextCup) card.appendChild(hl);
    return card;
  }

  function incidentsBox(incidents) {
    const box = el('div', 'car__incidents');
    box.appendChild(el('h3', 'display t-lg', t('carriera.whatHappened')));
    incidents.forEach((id) => {
      const words = tx(id);
      if (!words.t) return;
      const c = el('div', 'incident card halftone');
      c.append(el('strong', 'incident__t display', fill(words.t)), el('p', 'dim', fill(words.d)));
      box.appendChild(c);
    });
    return box;
  }

  function renderResult() {
    const p = save.player;
    /* un turno sono due stagioni; i salvataggi di prima ne avevano una */
    const seasons = save.lastResult.seasons
      || [{ record: save.lastResult.record, incidents: save.lastResult.incidents }];

    seasons.forEach(({ record, incidents }, i) => {
      if (incidents.length) {
        const box = incidentsBox(incidents);
        stage.appendChild(box);
        stagger(box.querySelectorAll('.incident'), 'anim-rise', 90);
      }
      const card = seasonCard(record, i === seasons.length - 1);
      stage.appendChild(card);
      replay(card, 'anim-rise');
      if (record.trophies.length) stagger(card.querySelectorAll('.tbadge'), 'anim-snap', 120);
    });

    const allTrophies = seasons.flatMap((x) => x.record.trophies);
    if (allTrophies.length) {
      audio.sfx.record();
      quake(1.2);
      /* la sagoma del trofeo più importante a tutto schermo, per un attimo */
      showTrophyMoment(allTrophies);
    }

    stage.appendChild(cabinet());

    const nextBtn = el('button', 'btn btn--go btn--lg btn--block', t('carriera.nextSeason'));
    nextBtn.type = 'button';
    nextBtn.addEventListener('click', async () => {
      nextBtn.disabled = true;
      await ads.interstitial('carriera-stagione', 3);
      const list = openMarket(save, rand, clubs);
      if (!list) { view = 'end'; persist(); render(); return; }
      view = 'market';
      persist();
      render();
    });
    stage.appendChild(nextBtn);

    if (p.age >= 33 && !p.flags.includes('lastSeason')) {
      const quit = el('button', 'btn btn--ghost btn--block', t('carriera.retire'));
      quit.type = 'button';
      quit.addEventListener('click', () => { retire(save); view = 'end'; persist(); render(); });
      stage.appendChild(quit);
    }
    if (p.flags.includes('lastSeason') || p.age > retirementAge(p.role)) {
      stage.appendChild(el('p', 'car__note label', t('carriera.finalSeasonNote')));
    }
  }

  function showTrophyMoment(trophies) {
    const best = [...trophies].sort((a, b) => TROPHY_ORDER.indexOf(a) - TROPHY_ORDER.indexOf(b))[0];
    const overlay = el('div', 'trophy-moment');
    const inner = el('div', 'trophy-moment__inner');
    inner.style.color = TROPHY_COLOR[best] || 'var(--lime)';
    inner.innerHTML = trophySvg(best, 180);
    inner.appendChild(el('p', 'trophy-moment__name display', t(`carriera.trophyNames.${best}`)));
    overlay.appendChild(inner);
    document.getElementById('overlay-root').appendChild(overlay);
    const close = () => { overlay.classList.add('is-out'); setTimeout(() => overlay.remove(), 300); };
    overlay.addEventListener('click', close);
    setTimeout(close, 2200);
  }

  function cabinet() {
    const box = el('div', 'car__cabinet');
    box.appendChild(el('h3', 'display t-lg', t('carriera.cabinet')));
    const all = save.player.totals.trophies;
    if (!all.length) { box.appendChild(el('p', 'dim', t('carriera.empty'))); return box; }
    const counts = all.reduce((m, x) => { m[x] = (m[x] || 0) + 1; return m; }, {});
    const row = el('div', 'tbadges');
    Object.entries(counts).sort((a, b) => TROPHY_ORDER.indexOf(a[0]) - TROPHY_ORDER.indexOf(b[0]))
      .forEach(([type, n]) => row.appendChild(trophyBadge(type, n)));
    box.appendChild(row);
    return box;
  }

  /* ---------------- 6. il mercato ---------------- */

  function renderMarket() {
    const p = save.player;
    const box = el('div', 'car__pick');
    box.append(el('h3', 'display t-xl', t('carriera.market')), el('p', 'dim', t('carriera.marketText')));
    const list = el('div', 'offers');

    const stay = el('button', 'offer offer--stay');
    stay.type = 'button';
    stay.append(clubChip(save.club, 42), el('span', 'offer__go', '→'));
    stay.appendChild(el('span', 'offer__tag label', t('carriera.stay')));
    stay.addEventListener('click', () => { save.offersList = null; startSeason(); });
    list.appendChild(stay);

    (save.offersList || []).forEach((o) => {
      const b = el('button', 'offer');
      b.type = 'button';
      b.style.setProperty('--team-a', o.club.colors[0]);
      b.append(clubChip(o.club, 42), el('span', 'offer__go', '→'));
      if (o.tag) b.appendChild(el('span', 'offer__tag label', t(`carriera.offerTag.${o.tag}`)));
      b.addEventListener('click', () => {
        signFor(save, o.club, { loan: o.loan });
        audio.sfx.goal();
        startSeason();
      });
      list.appendChild(b);
    });
    box.appendChild(list);
    if (p.age >= 33) {
      const quit = el('button', 'btn btn--ghost btn--block', t('carriera.retire'));
      quit.type = 'button';
      quit.addEventListener('click', () => { retire(save); view = 'end'; persist(); render(); });
      box.appendChild(quit);
    }
    stage.appendChild(box);
    stagger(list.children, 'anim-rise', 70);
  }

  /* ---------------- 7. la fine ---------------- */

  function renderEnd() {
    const p = save.player;
    const T = p.totals;
    const box = el('div', 'car__end card halftone misreg card--print anim-rise');
    const clubsPlayed = [...new Map(p.seasons.map((s) => [s.club.id, s.club])).values()];
    box.append(
      el('p', 'label', t('carriera.retired')),
      el('h3', 'display t-xxl', p.name),
      el('p', 'car__lead', t('carriera.endText', { age: p.age, seasons: p.seasons.length, clubs: clubsPlayed.length })),
    );
    const grid = el('div', 'car__grid');
    ROLE_STATS[p.role].forEach((k) => grid.appendChild(statBox(t(`carriera.stats.${k}`), T[k] || 0, k === 'goals' || k === 'clean' ? 'good' : null)));
    grid.appendChild(statBox(t('carriera.rating'), T.apps > 0 ? T.rating.toFixed(2) : '—'));
    if (p.national.caps) grid.appendChild(statBox(t('carriera.caps'), p.national.caps, 'sky'));
    box.appendChild(grid);

    const path = el('div', 'car__path');
    clubsPlayed.forEach((c) => {
      const chip = el('span', 'pathchip');
      chip.append(crest(c.colors, 16), el('span', '', c.name));
      path.appendChild(chip);
    });
    box.appendChild(path);
    stage.appendChild(box);
    stage.appendChild(cabinet());

    const shareBtn = el('button', 'btn btn--ghost btn--block', t('common.share'));
    shareBtn.type = 'button';
    shareBtn.addEventListener('click', async () => {
      const main = ROLE_STATS[p.role].slice(0, 3).map((k) => `${T[k] || 0} ${t(`carriera.stats.${k}`).toLowerCase()}`).join(' · ');
      const res = await copyOrShare(shareText({
        mode: t('carriera.title'),
        grid: T.trophies.length ? '🏆'.repeat(Math.min(T.trophies.length, 12)) : '',
        rows: [`${p.name} · ${t(`carriera.roles.${p.role}`)} · ${flagEmoji(p.nation)}`, main, t('carriera.shareTrophies', { n: T.trophies.length })],
      }));
      if (res !== 'copied' && res !== 'shared') return;
      const was = shareBtn.textContent;
      shareBtn.textContent = t('common.copied');
      setTimeout(() => { shareBtn.textContent = was; }, 1600);
    });
    stage.appendChild(shareBtn);

    const again = el('button', 'btn btn--go btn--lg btn--block', t('carriera.new'));
    again.type = 'button';
    again.addEventListener('click', () => {
      draft = { name: '', role: null, style: null, idol: null, number: null, nation: null, step: 0 };
      view = 'create';
      render();
    });
    stage.appendChild(again);
  }

  /* ---------------- disegno ---------------- */

  /* Cambiando schermata si riparte dall'alto. Dentro la stessa schermata (una
     scelta, l'allenamento) la carta toccata resta esattamente dov'era: il
     resto della pagina si ridisegna senza far saltare la vista. */
  function render({ anchor = null, top = 0 } = {}) {
    stage.textContent = '';
    if (!anchor) window.scrollTo(0, 0);
    if (view !== 'intro' && view !== 'create' && !save) view = 'intro';
    if (view === 'pickclub' && (!save.offersList || save.club)) view = save.club ? 'season' : 'intro';
    if (view === 'result' && !save.lastResult) view = 'season';
    if (view === 'market' && !save.offersList) view = save.player.retired ? 'end' : 'season';
    if (view === 'season' && save && save.player.retired) view = 'end';

    if (view === 'intro') renderIntro();
    else if (view === 'create') renderCreate();
    else if (view === 'pickclub') renderPickClub();
    else if (view === 'season') renderSeason();
    else if (view === 'result') renderResult();
    else if (view === 'market') renderMarket();
    else renderEnd();

    if (anchor) {
      const node = stage.querySelector(`[data-anchor="${anchor}"]`);
      if (node) window.scrollBy(0, node.getBoundingClientRect().top - top);
    }
  }

  render();

  return () => {
    comm.destroy();
    document.querySelectorAll('.sheet, .trophy-moment').forEach((x) => x.remove());
  };
}
