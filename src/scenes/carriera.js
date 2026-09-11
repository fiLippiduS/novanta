/* CARRIERA — dai sedici anni alla fine.
   Una scelta all'anno, quello che capita non lo scegli, e a fine stagione
   i numeri restano lì a dire com'è andata davvero. */

import { t, lang } from '../core/i18n.js';
import * as store from '../core/storage.js';
import * as audio from '../core/audio.js';
import { go } from '../core/router.js';
import { el, topbar, crest, sheet } from '../ui/components.js';
import { createCommentary } from '../ui/commentary.js';
import { stagger, replay, waveFrom, floatGain, quake } from '../ui/motion.js';
import * as ads from '../ads/adapter.js';
import { ROLES, STYLES, ATTRS, createPlayer, overall } from '../career/model.js';
import { playSeason, minutesShare } from '../career/season.js';
import { pickDecisions, pickIncidents, applyEffects, offers } from '../career/events.js';
import { trophySvg, TROPHY_COLOR } from '../career/trophies.js';
import { shareText, copyOrShare } from '../ui/share.js';

const NATIONS = [
  'Italia', 'Brasile', 'Argentina', 'Francia', 'Spagna', 'Inghilterra', 'Germania',
  'Portogallo', 'Olanda', 'Croazia', 'Senegal', 'Nigeria', 'Marocco', 'Ghana',
  'Giappone', 'Corea del Sud', 'Australia', 'Messico', 'Stati Uniti', 'Uruguay',
  'Colombia', 'Cile', 'Norvegia', 'Svezia', 'Danimarca', 'Polonia', 'Serbia',
  'Turchia', 'Egitto', 'Algeria', 'Costa d’Avorio', 'Camerun',
];

const rand = Math.random;
let cache = null;

async function loadData() {
  if (cache) return cache;
  const [clubs, events] = await Promise.all([
    fetch('data/clubs.json', { cache: 'force-cache' }).then((r) => r.json()),
    fetch('data/events.json', { cache: 'force-cache' }).then((r) => r.json()),
  ]);
  cache = { clubs: clubs.clubs, events: events.events };
  return cache;
}

function pickFrom(arr, n) {
  const a = arr.slice();
  const out = [];
  while (out.length < n && a.length) out.push(a.splice(Math.floor(rand() * a.length), 1)[0]);
  return out;
}

export async function mount(host) {
  const { clubs, events } = await loadData();

  const shell = el('div', 'shell carriera');
  const bar = topbar({ title: t('carriera.title'), onExit: () => go('hub') });
  const stage = el('div', 'car__stage');
  const comm = createCommentary();
  shell.append(bar.el, stage, comm.el);
  host.appendChild(shell);

  /* ---------------- stato ---------------- */

  let save = store.get('career') || null;
  let draft = null;       // giocatore in creazione
  let view = save && save.player && !save.player.retired ? 'season' : 'intro';

  const L = () => lang();
  const txt = (ev) => ev[L()] || ev.it;

  function persist() {
    store.save({ career: save });
  }

  /* ---------------- pezzi riutilizzabili ---------------- */

  function clubChip(club, size = 34) {
    const c = el('div', 'clubchip');
    c.append(crest(club.colors, size), el('div', 'clubchip__txt'));
    const txtBox = c.lastChild;
    txtBox.append(
      el('strong', 'clubchip__name', club.name),
      el('span', 'clubchip__sub label', `${club.country} · ${t('carriera.tier')[club.tier - 1]}`),
    );
    return c;
  }

  function statBox(label, value, tone) {
    const b = el('div', `cstat ${tone ? `cstat--${tone}` : ''}`.trim());
    b.append(el('span', 'label', label), el('strong', 'cstat__v display num', String(value)));
    return b;
  }

  function meter(label, value, color) {
    const m = el('div', 'meter');
    const head = el('div', 'meter__head');
    head.append(el('span', 'label', label), el('span', 'num', String(Math.round(value))));
    const track = el('div', 'meter__track');
    const fill = el('i', 'meter__fill');
    fill.style.width = `${Math.max(2, Math.min(100, value))}%`;
    fill.style.background = color;
    track.appendChild(fill);
    m.append(head, track);
    return m;
  }

  function trophyBadge(type) {
    const b = el('span', 'tbadge');
    b.style.color = TROPHY_COLOR[type] || 'var(--chalk)';
    b.innerHTML = trophySvg(type, 34);
    b.appendChild(el('span', 'tbadge__n label', t(`carriera.trophyNames.${type}`)));
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

    if (save && save.player) {
      const p = save.player;
      const resume = el('button', 'btn btn--go btn--lg btn--block',
        `${t('carriera.continue')} · ${p.name} (${p.age})`);
      resume.type = 'button';
      resume.addEventListener('click', () => { view = p.retired ? 'end' : 'season'; render(); });
      box.appendChild(resume);
    }

    const fresh = el('button', `btn ${save ? 'btn--ghost' : 'btn--go btn--lg'} btn--block`,
      save ? t('carriera.restart') : t('carriera.new'));
    fresh.type = 'button';
    fresh.addEventListener('click', () => {
      draft = { name: '', role: null, style: null, number: null, nation: null, step: 0 };
      view = 'create';
      audio.sfx.tick();
      render();
    });
    box.appendChild(fresh);
    stage.appendChild(box);
  }

  /* ---------------- 2. chi sei ---------------- */

  function renderCreate() {
    const steps = ['name', 'role', 'style', 'number', 'nation'];
    const step = steps[draft.step];
    const box = el('div', 'car__create card halftone misreg card--print');

    const pips = el('div', 'pips');
    steps.forEach((_, i) => {
      const p = el('i', 'pip');
      if (i < draft.step) p.classList.add('pip--full');
      if (i === draft.step) p.classList.add('pip--now');
      pips.appendChild(p);
    });
    box.appendChild(pips);

    const next = () => {
      draft.step += 1;
      audio.sfx.tick();
      if (draft.step >= steps.length) startCareer();
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
      box.append(
        el('h3', 'display t-xl', t('carriera.chooseRole')),
        el('p', 'dim', t('carriera.chooseRoleText')),
      );
      box.appendChild(pitch433((role) => { draft.role = role; draft.style = null; next(); }));
    }

    if (step === 'style') {
      box.append(el('h3', 'display t-xl',
        t('carriera.chooseStyle', { role: t(`carriera.roles.${draft.role}`).toLowerCase() })));
      const grid = el('div', 'optgrid optgrid--wide');
      STYLES[draft.role].forEach((s) => {
        const b = el('button', 'optcard optcard--tall');
        b.type = 'button';
        b.append(
          el('strong', 'optcard__t display', t(`carriera.styles.${s}`)),
          el('span', 'optcard__d', t(`carriera.styleHint.${s}`)),
        );
        b.addEventListener('click', () => { draft.style = s; next(); });
        grid.appendChild(b);
      });
      box.appendChild(grid);
      stagger(grid.children, 'anim-rise', 45);
    }

    if (step === 'number') {
      box.append(
        el('h3', 'display t-xl', t('carriera.chooseNumber')),
        el('p', 'dim', t('carriera.chooseNumberText')),
      );
      const form = el('form', 'car__numform');
      const input = el('input', 'numinput display num');
      input.type = 'text';
      input.inputMode = 'numeric';
      input.maxLength = 2;
      input.placeholder = draft.role === 'POR' ? '1' : '10';
      input.autocomplete = 'off';
      input.setAttribute('aria-label', t('carriera.chooseNumber'));
      // solo cifre, e niente zero davanti
      input.addEventListener('input', () => {
        input.value = input.value.replace(/\D/g, '').slice(0, 2);
      });
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
      box.append(el('h3', 'display t-xl', t('carriera.chooseNation')));
      const grid = el('div', 'natgrid');
      NATIONS.forEach((n) => {
        const b = el('button', 'natcell', n);
        b.type = 'button';
        b.addEventListener('click', () => { draft.nation = n; next(); });
        grid.appendChild(b);
      });
      box.appendChild(grid);
    }

    stage.appendChild(box);
    replay(box, 'anim-rise');
  }

  /* Il 4-3-3 schierato: si sceglie il ruolo toccando la posizione, non una
     voce in un elenco. Le posizioni che portano allo stesso ruolo sono più
     d'una, come in una formazione vera. */
  const FORMATION = [
    { role: 'POR', x: 50, y: 90 },
    { role: 'TZ', x: 13, y: 72 }, { role: 'DC', x: 37, y: 77 },
    { role: 'DC', x: 63, y: 77 }, { role: 'TZ', x: 87, y: 72 },
    { role: 'MEZ', x: 24, y: 50 }, { role: 'MED', x: 50, y: 58 }, { role: 'MEZ', x: 76, y: 50 },
    { role: 'ALA', x: 15, y: 24 }, { role: 'PUN', x: 50, y: 16 }, { role: 'ALA', x: 85, y: 24 },
  ];

  function pitch433(onPick) {
    const wrap = el('div', 'pitch');
    wrap.innerHTML = `<svg class="pitch__lines" viewBox="0 0 100 150" preserveAspectRatio="none"
        aria-hidden="true">
      <rect x="1" y="1" width="98" height="148" fill="none"
        stroke="rgba(237,232,218,0.16)" stroke-width="0.6"/>
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
      b.append(
        el('span', 'spot__dot'),
        el('span', 'spot__k label', t(`carriera.rolesShort.${pos.role}`)),
      );
      b.title = t(`carriera.roles.${pos.role}`);
      b.setAttribute('aria-label', t(`carriera.roles.${pos.role}`));
      b.style.setProperty('--i', i);
      b.addEventListener('click', () => { audio.sfx.hit(); onPick(pos.role); });
      wrap.appendChild(b);
    });
    return wrap;
  }

  /* ---------------- 3. la prima squadra ---------------- */

  function startCareer() {
    const player = createPlayer(rand, draft);
    const small = clubs.filter((c) => c.tier >= 4);
    save = {
      player,
      club: null,
      seen: [],
      pending: null,
      offersList: pickFrom(small, 3),
      version: 1,
    };
    view = 'pickclub';
    persist();
    render();
  }

  function renderPickClub() {
    const box = el('div', 'car__pick');
    box.append(
      el('h3', 'display t-xl', t('carriera.chooseClub')),
      el('p', 'dim', t('carriera.chooseClubText')),
    );
    const list = el('div', 'offers');
    save.offersList.forEach((c) => {
      const b = el('button', 'offer');
      b.type = 'button';
      b.style.setProperty('--team-a', c.colors[0]);
      b.append(clubChip(c, 42));
      b.appendChild(el('span', 'offer__go', '→'));
      b.addEventListener('click', () => {
        save.club = { ...c, inCont: false };
        save.offersList = null;
        beginSeason();
      });
      list.appendChild(b);
    });
    box.appendChild(list);
    stage.appendChild(box);
    stagger(list.children, 'anim-rise', 70);
  }

  /* ---------------- 4. la stagione ---------------- */

  function beginSeason() {
    const p = save.player;
    save.pending = {
      decisions: pickDecisions(rand, events, p, save.club, save.seen, 3)
        .map((d) => ({ id: d.id, chosen: null })),
      focus: null,
      applied: [],
    };
    view = 'season';
    audio.sfx.whistle();
    persist();
    render();
  }

  function renderSeason() {
    const p = save.player;
    const club = save.club;
    const ovr = overall(p);

    /* --- testata: chi sei e dove sei --- */
    const head = el('div', 'car__head card halftone misreg card--print');
    head.style.setProperty('--misreg-color', club.colors[0]);
    const idn = el('div', 'car__id');
    idn.append(
      el('span', 'car__num display num', String(p.number)),
      el('div', 'car__who'),
    );
    idn.lastChild.append(
      el('strong', 'car__name display t-lg', p.name),
      el('span', 'car__role label',
        `${t(`carriera.roles.${p.role}`)} · ${t(`carriera.styles.${p.style}`)} · ${p.nation}`),
    );
    head.append(idn, clubChip(club, 38));

    const line = el('div', 'car__line');
    line.append(
      statBox(t('carriera.age'), p.age),
      statBox(t('carriera.overall'), ovr, 'good'),
      statBox(t('carriera.season'), p.seasons.length + 1),
    );
    head.appendChild(line);

    const meters = el('div', 'meters');
    meters.append(
      meter(t('carriera.morale'), p.morale, 'var(--lime)'),
      meter(t('carriera.fitness'), p.fitness, 'var(--sky)'),
      meter(t('carriera.fame'), p.reputation, 'var(--amber)'),
    );
    head.appendChild(meters);

    const attrs = el('div', 'attrs');
    ATTRS.forEach((a) => attrs.appendChild(meter(t(`carriera.${a}`), p.attrs[a], 'var(--chalk-2)')));
    head.appendChild(attrs);

    stage.appendChild(head);

    /* --- le scelte --- */
    const dec = el('div', 'car__dec');
    dec.appendChild(el('h3', 'display t-lg', t('carriera.decisions')));

    save.pending.decisions.forEach((slot) => {
      const ev = events.find((e) => e.id === slot.id);
      if (!ev) return;
      const c = el('div', 'qcard card halftone misreg card--print');
      c.append(
        el('h4', 'qcard__prompt display t-lg', txt(ev).title),
        el('p', 'dim', txt(ev).text),
      );

      const opts = el('div', 'options');
      ev.options.forEach((o, i) => {
        const b = el('button', 'option');
        b.type = 'button';
        b.append(el('span', 'option__label', o[L()].label));
        if (slot.chosen === i) b.classList.add('option--right');
        if (slot.chosen !== null) b.disabled = true;
        b.addEventListener('click', () => {
          slot.chosen = i;
          const focus = applyEffects(p, o.effects);
          if (focus) save.pending.focus = focus;
          if (!save.seen.includes(ev.id)) save.seen.push(ev.id);
          audio.sfx.hit();
          waveFrom(b, 'var(--lime)');
          const note = el('p', 'qcard__note dim', o[L()].outcome);
          c.appendChild(note);
          replay(note, 'anim-rise');
          [...opts.children].forEach((x) => { x.disabled = true; });
          b.classList.add('option--right');
          persist();
          updatePlayButton();
        });
        opts.appendChild(b);
      });
      c.appendChild(opts);
      if (slot.chosen !== null) {
        c.appendChild(el('p', 'qcard__note dim', ev.options[slot.chosen][L()].outcome));
      }
      dec.appendChild(c);
    });

    const play = el('button', 'btn btn--go btn--lg btn--block', t('carriera.playSeason'));
    play.type = 'button';
    play.addEventListener('click', runSeason);
    dec.appendChild(play);
    stage.appendChild(dec);

    function updatePlayButton() {
      const left = save.pending.decisions.filter((d) => d.chosen === null).length;
      play.disabled = left > 0;
      play.textContent = left > 0
        ? `${t('carriera.decisions')} — ${left}`
        : t('carriera.playSeason');
    }
    updatePlayButton();
    stagger(dec.querySelectorAll('.qcard'), 'anim-rise', 60);
  }

  /* ---------------- 5. come è andata ---------------- */

  function runSeason() {
    const p = save.player;
    const club = save.club;

    const incidents = pickIncidents(rand, events, p, club, save.seen);
    incidents.forEach((i) => {
      applyEffects(p, i.effects);
      if (!save.seen.includes(i.id)) save.seen.push(i.id);
    });

    const share = minutesShare(p, club);
    const out = playSeason(rand, p, club, {
      focus: save.pending.focus,
      injuryRisk: p.pendingRisk || 0,
    });
    p.pendingRisk = 0;
    club.inCont = out.qualified;
    if (out.record.trophies.includes('promozione') && club.tier > 1) club.tier -= 1;

    save.lastResult = { record: out.record, incidents: incidents.map((i) => i.id), share: out.share };
    save.pending = null;
    view = 'result';
    persist();
    render();
  }

  function renderResult() {
    const p = save.player;
    const { record, incidents } = save.lastResult;

    const card = el('div', 'car__report card halftone misreg card--print');
    card.style.setProperty('--misreg-color', record.club.colors[0]);
    const h = el('div', 'car__reporthead');
    h.append(
      el('span', 'label', `${t('carriera.season')} ${record.season} · ${record.age} ${t('carriera.age')}`),
      el('strong', 'display t-xl', record.club.name),
    );
    card.appendChild(h);

    const grid = el('div', 'car__grid');
    grid.append(
      statBox(t('carriera.apps'), record.apps),
      statBox(t('carriera.goals'), record.goals, record.goals > 0 ? 'good' : null),
      statBox(t('carriera.assists'), record.assists),
    );
    if (['POR', 'DC', 'TZ'].includes(p.role)) {
      grid.appendChild(statBox(t('carriera.clean'), record.clean, 'sky'));
    }
    grid.append(
      // senza partite giocate una media voto non vuol dire niente
      statBox(t('carriera.rating'), record.apps > 0 ? record.rating.toFixed(2) : '—'),
      statBox(t('carriera.position'), `${record.position}º`),
    );
    card.appendChild(grid);

    if (record.trophies.length) {
      const won = el('div', 'car__won');
      won.appendChild(el('p', 'label', t('carriera.won')));
      const row = el('div', 'tbadges');
      record.trophies.forEach((tr) => row.appendChild(trophyBadge(tr)));
      won.appendChild(row);
      card.appendChild(won);
      audio.sfx.record();
      quake(1.2);
    }

    if (record.weeksOut > 0) {
      card.appendChild(el('p', 'car__out label',
        `${t('carriera.fitness')} — ${record.weeksOut} ${L() === 'it' ? 'settimane fuori' : 'weeks out'}`));
    }

    stage.appendChild(card);
    replay(card, 'anim-rise');
    if (record.trophies.length) {
      stagger(card.querySelectorAll('.tbadge'), 'anim-snap', 120);
    }

    if (incidents.length) {
      const box = el('div', 'car__incidents');
      box.appendChild(el('h3', 'display t-lg', t('carriera.whatHappened')));
      incidents.forEach((id) => {
        const ev = events.find((e) => e.id === id);
        if (!ev) return;
        const c = el('div', 'incident card halftone');
        c.append(
          el('strong', 'incident__t display', txt(ev).title),
          el('p', 'dim', txt(ev).text),
        );
        box.appendChild(c);
      });
      stage.appendChild(box);
      stagger(box.querySelectorAll('.incident'), 'anim-rise', 90);
    }

    stage.appendChild(cabinet());

    const next = el('button', 'btn btn--go btn--lg btn--block', t('carriera.nextSeason'));
    next.type = 'button';
    next.addEventListener('click', async () => {
      next.disabled = true;
      await ads.interstitial('carriera-stagione', 3);
      openMarket();
    });
    stage.appendChild(next);

    if (p.age >= 33) {
      const quit = el('button', 'btn btn--ghost btn--block', t('carriera.retire'));
      quit.type = 'button';
      quit.addEventListener('click', () => { p.retired = true; view = 'end'; persist(); render(); });
      stage.appendChild(quit);
    }
  }

  function cabinet() {
    const box = el('div', 'car__cabinet');
    box.appendChild(el('h3', 'display t-lg', t('carriera.cabinet')));
    const all = save.player.totals.trophies;
    if (!all.length) {
      box.appendChild(el('p', 'dim', t('carriera.empty')));
      return box;
    }
    const counts = all.reduce((m, x) => { m[x] = (m[x] || 0) + 1; return m; }, {});
    const row = el('div', 'tbadges');
    Object.entries(counts).forEach(([type, n]) => {
      const b = trophyBadge(type);
      if (n > 1) b.appendChild(el('span', 'tbadge__x display num', `×${n}`));
      row.appendChild(b);
    });
    box.appendChild(row);
    return box;
  }

  /* ---------------- 6. il mercato ---------------- */

  function openMarket() {
    const p = save.player;
    if (p.age >= 39) { p.retired = true; view = 'end'; persist(); render(); return; }
    save.offersList = offers(rand, clubs, p, save.club, overall(p), save.lastResult.share);
    view = 'market';
    persist();
    render();
  }

  function renderMarket() {
    const box = el('div', 'car__pick');
    box.append(
      el('h3', 'display t-xl', t('carriera.market')),
      el('p', 'dim', t('carriera.marketText')),
    );

    const list = el('div', 'offers');

    const stay = el('button', 'offer offer--stay');
    stay.type = 'button';
    stay.append(clubChip(save.club, 42), el('span', 'offer__go', '→'));
    stay.appendChild(el('span', 'offer__tag label', t('carriera.stay')));
    stay.addEventListener('click', () => { save.offersList = null; beginSeason(); });
    list.appendChild(stay);

    (save.offersList || []).forEach((o) => {
      const b = el('button', 'offer');
      b.type = 'button';
      b.append(clubChip(o.club, 42), el('span', 'offer__go', '→'));
      if (o.loan) b.appendChild(el('span', 'offer__tag label', t('carriera.loan')));
      b.addEventListener('click', () => {
        save.club = { ...o.club, inCont: false };
        save.offersList = null;
        audio.sfx.goal();
        beginSeason();
      });
      list.appendChild(b);
    });

    box.appendChild(list);
    stage.appendChild(box);
    stagger(list.children, 'anim-rise', 70);
  }

  /* ---------------- 7. la fine ---------------- */

  function renderEnd() {
    const p = save.player;
    const T = p.totals;
    const box = el('div', 'car__end card halftone misreg card--print anim-rise');
    box.append(
      el('p', 'label', t('carriera.retired')),
      el('h3', 'display t-xxl', t('carriera.endTitle')),
      el('p', 'car__lead', t('carriera.endText', {
        name: p.name, age: p.age, apps: T.apps, goals: T.goals, assists: T.assists,
      })),
    );

    const grid = el('div', 'car__grid');
    grid.append(
      statBox(t('carriera.apps'), T.apps),
      statBox(t('carriera.goals'), T.goals, 'good'),
      statBox(t('carriera.assists'), T.assists),
      statBox(t('carriera.rating'), T.apps > 0 ? T.rating.toFixed(2) : '—'),
    );
    if (['POR', 'DC', 'TZ'].includes(p.role)) grid.appendChild(statBox(t('carriera.clean'), T.clean, 'sky'));
    box.appendChild(grid);
    stage.appendChild(box);

    stage.appendChild(cabinet());

    /* La carriera è lunga: il riassunto finale è la cosa che uno mostra. */
    const shareBtn = el('button', 'btn btn--ghost btn--block', t('common.share'));
    shareBtn.type = 'button';
    shareBtn.addEventListener('click', async () => {
      const text = shareText({
        mode: t('carriera.title'),
        grid: T.trophies.length ? '🏆'.repeat(Math.min(T.trophies.length, 12)) : '',
        rows: [
          `${p.name} · ${p.role} · ${t('carriera.retired').toLowerCase()} ${p.age}`,
          `${T.goals} ${t('carriera.goals').toLowerCase()} · ${T.assists} ${t('carriera.assists').toLowerCase()} · ${T.apps} ${t('carriera.apps').toLowerCase()}`,
          `${T.trophies.length} ${t('carriera.cabinet').toLowerCase()}`,
        ],
      });
      const res = await copyOrShare(text);
      if (res !== 'copied' && res !== 'shared') return;
      const was = shareBtn.textContent;
      shareBtn.textContent = t('common.copied');
      shareBtn.classList.add('btn--said');
      setTimeout(() => { shareBtn.textContent = was; shareBtn.classList.remove('btn--said'); }, 1600);
    });
    stage.appendChild(shareBtn);

    const again = el('button', 'btn btn--go btn--lg btn--block', t('carriera.new'));
    again.type = 'button';
    again.addEventListener('click', () => {
      draft = { name: '', role: null, style: null, number: null, nation: null, step: 0 };
      view = 'create';
      render();
    });
    stage.appendChild(again);
  }

  /* ---------------- disegno ---------------- */

  function render() {
    stage.textContent = '';
    window.scrollTo(0, 0);

    /* Una carriera ripresa può trovarsi a metà strada: senza queste due righe
       la schermata si apriva su uno stato che non esiste e restava a metà. */
    if (view === 'season' && (!save || !save.pending)) {
      if (save && save.club) { beginSeason(); return; }
      view = save && save.club ? 'season' : save ? 'pickclub' : 'intro';
    }
    if (view === 'result' && (!save || !save.lastResult)) view = save && save.club ? 'season' : 'intro';
    if (view === 'pickclub' && (!save || !save.offersList)) view = 'intro';
    if (view === 'market' && (!save || !save.offersList)) view = save && save.club ? 'season' : 'intro';

    if (view === 'intro') renderIntro();
    else if (view === 'create') renderCreate();
    else if (view === 'pickclub') renderPickClub();
    else if (view === 'season') renderSeason();
    else if (view === 'result') renderResult();
    else if (view === 'market') renderMarket();
    else renderEnd();
  }

  render();

  return () => {
    comm.destroy();
    document.querySelectorAll('.sheet').forEach((x) => x.remove());
  };
}
