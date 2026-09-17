/* ALLENATORE — la schermata del mercato: trattative in corso, offerte
   ricevute (con controproposta), ricerca in dieci campionati, notizie dagli
   altri club. La trattativa è una scheda in tre tempi: il club, il giocatore
   con il suo procuratore, le visite mediche. Ogni passo può andare bene o
   far saltare tutto, e il registro racconta com'è andata. */

import { t } from '../../core/i18n.js';
import * as audio from '../../core/audio.js';
import { el, sheet, crest } from '../../ui/components.js';
import { flagEmoji, countryName } from '../../ui/flags.js';
import { ROLES, ageOf, valueOf, careerPhase } from '../../manager/players.js';
import { squadOf } from '../../manager/career.js';
import {
  search, windowOpen, deadlineDay, acceptOffer, rejectOffer, counterIncoming, openTalks, bidClub, payClause,
  offerContract, medicalChoice, withdrawTalk, talkById, talksNow, talkPlayer, isOpenTalk, wageRoom, TALK_ROLES, LOAN_WAGE,
} from '../../manager/market.js';
import { button, chip, meter, ovrBadge, roleTag, attrBars, euro, phaseChip, potentialText } from './ui.js';

const AGES = [0, 21, 24, 28, 32];
const r1 = (x) => Math.round(x * 10) / 10;
const r2 = (x) => Math.round(x * 100) / 100;
const STAGE_TONE = { club: 'sky', player: 'sky', medicalIssue: 'amber', signed: 'lime', collapsed: 'flare' };
const PHASE_MARK = { talent: '✦', growing: '▲', peak: '●', declining: '▼' };

export function renderMarket(stage, { career, data, persist, rerender, clubName }) {
  const club = career.clubs[career.club];
  const f = career.marketFilters || (career.marketFilters = { role: '', ageMax: 0, affordable: true, league: '', query: '' });
  const open = windowOpen(career);
  const staff = career.flags.staff || 50;

  /* ---------------- conti ---------------- */
  const head = el('section', 'mcard card mmarket__head');
  head.append(el('h3', 'mhead display', t('allenatore.market.title')));
  const money = el('div', 'mmarket__money');
  const box = (label, value) => { const b = el('div', 'mstat'); b.append(el('strong', 'display num', value), el('span', 'label', label)); return b; };
  money.append(
    box(t('allenatore.market.budget'), euro(Math.max(0, club.budget))),
    box(t('allenatore.market.wageRoom'), euro(Math.max(0, wageRoom(career)))),
    box(t('allenatore.market.squadSize'), String(squadOf(career, career.club).filter((p) => !p.loanOut).length)),
  );
  head.appendChild(money);
  const half = Math.floor(career.fixtures.length / 2);
  const chips = el('div', 'mpsheet__tags');
  chips.appendChild(chip(open ? t('allenatore.market.open') : t('allenatore.market.closed', { md: career.md < half - 1 ? half : 1 }), open ? 'lime' : 'dim'));
  if (deadlineDay(career)) chips.appendChild(chip(`⏱ ${t('allenatore.talks.deadline')}`, 'amber'));
  head.appendChild(chips);
  stage.appendChild(head);

  /* ---------------- trattative della finestra ---------------- */
  const talks = talksNow(career).slice().sort((a, b) => Number(isOpenTalk(b)) - Number(isOpenTalk(a)));
  if (talks.length) {
    const sec = el('section', 'mcard card');
    sec.appendChild(el('h3', 'mhead display', t('allenatore.talks.title')));
    for (const tk of talks) {
      const row = el('button', 'mprow mtalk__row');
      row.type = 'button';
      const main = el('span', 'mprow__main');
      main.append(el('strong', 'mprow__name', tk.name), el('span', 'mprow__sub label', `${euro(tk.fee ?? tk.ask)} · ${clubName(tk.clubId)}`));
      row.append(roleTag(tk.role), main, chip(t(`allenatore.talks.stage.${tk.stage}`), STAGE_TONE[tk.stage]), ovrBadge(tk.ovr));
      row.addEventListener('click', () => talkSheet({ talkId: tk.id }));
      sec.appendChild(row);
    }
    stage.appendChild(sec);
  }

  /* ---------------- offerte ricevute ---------------- */
  const offers = (career.offersIn || []).filter((o) => career.players[o.player]);
  if (offers.length) {
    const sec = el('section', 'mcard card');
    sec.appendChild(el('h3', 'mhead display', t('allenatore.market.offersIn')));
    for (const o of offers) {
      const p = career.players[o.player];
      const row = el('div', 'moffer');
      const txt = el('div', 'moffer__txt');
      const stance = o.stance || 'open';
      const tags = el('div', 'mpsheet__tags');
      tags.append(chip(t(`allenatore.incoming.stance.${stance}`), stance === 'wants' ? 'amber' : stance === 'refuses' ? 'flare' : 'dim'), phaseChip(p, career.season));
      txt.append(
        el('strong', '', t('allenatore.market.offerLine', { club: o.clubName, player: p.name, fee: euro(o.fee) })),
        el('span', 'label', t('allenatore.market.valueLine', { value: euro(valueOf(p, career.season)), md: o.expires + 1 })),
        tags,
      );
      const out = el('p', 'mmarket__out');
      const acts = el('div', 'moffer__acts moffer__acts--3');
      const ask = r1(o.fee * 1.2);
      const done = (res, fallback) => {
        if (!res) return;
        if (res.status === 'sold') { audio.sfx.hit(); persist(); rerender(); return; }
        persist();
        const key = res.status === 'upset' && res.wantsOut ? 'upsetOut' : res.status;
        const incomingKeys = ['raised', 'walkedAway', 'playerRefuses', 'upset', 'upsetOut', 'rejected'];
        out.className = `mmarket__out ${res.status === 'raised' ? '' : 'is-bad'}`;
        out.textContent = incomingKeys.includes(key) ? t(`allenatore.incoming.result.${key}`, { club: res.club || o.clubName, fee: euro(res.fee || 0) }) : t(`allenatore.market.status.${key || fallback}`);
        if (['walkedAway', 'upset', 'upsetOut', 'rejected'].includes(key)) setTimeout(rerender, 1400);
        else if (res.status === 'raised') setTimeout(rerender, 900);
      };
      acts.append(
        button(t('allenatore.market.reject'), 'btn--ghost', () => done(rejectOffer(career, o.id), 'rejected')),
        button(t('allenatore.incoming.ask', { fee: euro(ask) }), 'btn--ghost', () => done(counterIncoming(career, data, o.id, ask))),
        button(t('allenatore.market.accept'), 'btn--go', () => done(acceptOffer(career, data, o.id))),
      );
      row.append(txt, acts, out);
      sec.appendChild(row);
    }
    stage.appendChild(sec);
  }

  /* ---------------- ricerca ---------------- */
  const sec = el('section', 'mcard card');
  sec.appendChild(el('h3', 'mhead display', t('allenatore.market.search')));
  const q = el('input', 'squad__input');
  q.placeholder = t('allenatore.market.searchPh');
  q.value = f.query;
  q.addEventListener('change', () => { f.query = q.value; rerender(); });
  sec.appendChild(q);
  const roles = el('div', 'mseg');
  for (const r of ['', ...ROLES]) {
    const b = el('button', `mseg__b ${f.role === r ? 'is-on' : ''}`, r ? t(`allenatore.rolesShort.${r}`) : t('allenatore.market.all'));
    b.type = 'button';
    b.addEventListener('click', () => { f.role = r; rerender(); });
    roles.appendChild(b);
  }
  sec.appendChild(roles);
  const ages = el('div', 'mseg');
  for (const a of AGES) {
    const b = el('button', `mseg__b ${f.ageMax === a ? 'is-on' : ''}`, a ? t('allenatore.market.under', { n: a }) : t('allenatore.market.anyAge'));
    b.type = 'button';
    b.addEventListener('click', () => { f.ageMax = a; rerender(); });
    ages.appendChild(b);
  }
  sec.appendChild(ages);
  const lg = el('select', 'mselect');
  const any = el('option', '', t('allenatore.market.allLeagues'));
  any.value = '';
  lg.appendChild(any);
  for (const l of data.leagues.leagues) { const o = el('option', '', `${flagEmoji(l.code)} ${l.name}`); o.value = l.id; o.selected = f.league === l.id; lg.appendChild(o); }
  lg.addEventListener('change', () => { f.league = lg.value; rerender(); });
  sec.appendChild(lg);
  const sorts = el('div', 'mseg');
  sorts.appendChild(el('span', 'label mtalk__seglabel', t('allenatore.talks.sort')));
  for (const [k, label] of [['ovr', 'sortOvr'], ['pot', 'sortPot']]) {
    const b = el('button', `mseg__b ${(f.sort || 'ovr') === k ? 'is-on' : ''}`, t(`allenatore.talks.${label}`));
    b.type = 'button';
    b.addEventListener('click', () => { f.sort = k; rerender(); });
    sorts.appendChild(b);
  }
  sec.appendChild(sorts);
  const tog = el('label', 'mtoggle');
  const cb = el('input');
  cb.type = 'checkbox'; cb.checked = f.affordable;
  cb.addEventListener('change', () => { f.affordable = cb.checked; rerender(); });
  tog.append(cb, el('span', '', t('allenatore.market.affordable')));
  sec.appendChild(tog);

  const results = search(career, data, {
    role: f.role || undefined, ageMax: f.ageMax || undefined, league: f.league || undefined, query: f.query, sort: f.sort || 'ovr',
    priceMax: f.affordable ? Math.max(0.5, club.budget) : undefined,
  }, 30);
  if (!results.length) sec.appendChild(el('p', 'dim', t('allenatore.market.none')));
  for (const r of results) {
    const p = r.player;
    const row = el('button', 'mprow mmarket__row');
    row.type = 'button';
    const main = el('span', 'mprow__main');
    main.append(
      el('strong', 'mprow__name', p.name),
      el('span', 'mprow__sub label', `${flagEmoji(p.nation)} ${ageOf(p, career.season)} · ${clubName(r.clubId)}`),
    );
    const ph = careerPhase(p, career.season);
    const potLine = el('span', 'mprow__sub label mmarket__pot');
    potLine.append(el('span', `mmarket__mark is-${ph}`, PHASE_MARK[ph]), document.createTextNode(` ${potentialText(p, career.season, { staff })}`));
    potLine.title = t(`allenatore.phase.${ph}`);
    main.appendChild(potLine);
    const right = el('span', 'mmarket__price');
    right.append(el('strong', 'num', euro(r.price)));
    if (r.talkStage) right.appendChild(el('span', `label mood--talk is-${r.talkStage}`, t(`allenatore.talks.stage.${r.talkStage}`)));
    else right.appendChild(el('span', `label mood--${r.mood}`, t(`allenatore.market.mood.${r.mood}`)));
    row.append(roleTag(p.role), main, right, ovrBadge(p.ovr));
    row.addEventListener('click', () => talkSheet({ candidate: r }));
    sec.appendChild(row);
  }
  stage.appendChild(sec);

  /* ---------------- gli altri club ---------------- */
  const news = (career.news || []).filter((n) => n.season === career.season).slice(0, 12);
  if (news.length) {
    const sec2 = el('section', 'mcard card');
    sec2.appendChild(el('h3', 'mhead display', t('allenatore.news.title')));
    for (const n of news) sec2.appendChild(el('p', 'minbox__i', t('allenatore.news.line', { to: n.toName, name: `${n.name} (${n.ovr})`, from: n.fromName, fee: euro(n.fee) })));
    stage.appendChild(sec2);
  }

  if ((career.transfers || []).length) {
    const log = el('section', 'mcard card');
    log.appendChild(el('h3', 'mhead display', t('allenatore.market.log')));
    for (const x of career.transfers.slice(0, 12)) {
      log.appendChild(el('p', 'minbox__i', t(x.dir === 'in' ? (x.kind === 'loan' ? 'allenatore.market.logLoan' : 'allenatore.market.logIn') : 'allenatore.market.logOut', { name: x.name, club: clubName(x.from || x.to), fee: euro(x.fee), season: `${x.season}/${String(x.season + 1).slice(2)}` })));
    }
    stage.appendChild(log);
  }

  /* ---------------- la trattativa ---------------- */
  function talkSheet({ candidate = null, talkId = null }) {
    const body = el('div', 'mpsheet mtalk');
    let id = talkId || candidate?.talk || null;
    let changed = false;
    /* le scelte in corso restano mentre si ridisegna */
    const draft = { fee: null, bonus: 0, wage: null, years: null, role: null };
    let status = '';

    const fmt = (vars = {}) => {
      const out = { ...vars };
      for (const k of ['fee', 'ask', 'wage', 'agent', 'bonus', 'room']) if (typeof out[k] === 'number') out[k] = euro(out[k]);
      if (out.role) out.role = t(`allenatore.talks.roles.${out.role}`);
      if (typeof out.years === 'number') out.years = out.years === 1 ? t('allenatore.talks.year1') : t('allenatore.talks.yearsN', { n: out.years });
      return out;
    };

    const act = (res) => {
      changed = true;
      persist();
      status = '';
      if (res?.status === 'noBudget' || res?.status === 'invalid') status = t(`allenatore.talks.status.${res.status}`);
      else if (res?.status === 'noWages') status = t('allenatore.talks.status.noWages', { room: euro(Math.max(0, res.room)) });
      else if (res?.status === 'signed') audio.sfx.hit();
      else if (res?.status === 'collapsed') audio.sfx.miss?.();
      else audio.sfx.tick();
      draw();
    };

    function draw() {
      body.innerHTML = '';
      const talk = id ? talkById(career, id) : null;
      const p = talk ? (talkPlayer(career, data, talk) || candidate?.player) : candidate.player;
      const clubId = talk ? talk.clubId : candidate.clubId;
      const info = career.clubs[clubId] || data.leagues.clubs[clubId];

      /* chi è */
      const top = el('div', 'mpsheet__head');
      const who = el('div', 'mpsheet__who');
      const name = p?.name || talk.name;
      who.append(el('strong', 'display t-lg', name));
      if (p) who.append(el('span', 'label', `${flagEmoji(p.nation)} ${countryName(p.nation)} · ${ageOf(p, career.season)} · ${t(`allenatore.roles.${p.role}`)}`));
      top.append(who, ovrBadge(p ? p.ovr : talk.ovr));
      const from = el('div', 'mclub');
      from.append(crest(info?.colors || [], 22), el('span', 'dim', t('allenatore.market.fromClub', { club: info?.name || clubId })));
      body.append(top, from);
      if (p) {
        const tags = el('div', 'mpsheet__tags');
        tags.append(phaseChip(p, career.season), chip(potentialText(p, career.season, { staff }), 'dim'), chip(`${t('allenatore.talks.value')} ${euro(valueOf(p, career.season))}`, 'dim'), chip(t('allenatore.talks.until', { year: p.contract }), 'dim'));
        body.appendChild(tags);
      }

      if (!talk) { drawIntro(p); return; }

      /* i tre tempi */
      const steps = el('ol', 'mtalk__steps');
      const stepState = (k) => {
        const order = { club: 0, player: 1, medicalIssue: 2 };
        if (talk.stage === 'signed') return 'done';
        const cur = talk.stage === 'collapsed' ? lastOpenStage(talk) : order[talk.stage];
        const idx = { club: 0, player: 1, medical: 2 }[k];
        if (idx < cur) return 'done';
        if (idx === cur) return talk.stage === 'collapsed' ? 'failed' : 'now';
        return 'next';
      };
      for (const k of ['club', 'player', 'medical']) steps.appendChild(el('li', `mtalk__step is-${stepState(k)}`, t(`allenatore.talks.steps.${k}`)));
      body.appendChild(steps);

      /* il registro */
      const log = el('div', 'mtalk__log');
      for (const m of talk.log.slice(-5)) {
        const line = el('p', `mtalk__msg mtalk__msg--${m.who}`);
        line.append(el('span', 'label', t(`allenatore.talks.who.${m.who}`)), el('span', '', t(`allenatore.talks.log.${m.key}`, fmt(m.vars))));
        log.appendChild(line);
      }
      body.appendChild(log);

      if (talk.stage === 'club') drawClub(talk);
      else if (talk.stage === 'player') drawPlayer(talk);
      else if (talk.stage === 'medicalIssue') drawMedical(talk);
      else if (talk.stage === 'signed') {
        const done = el('div', 'mtalk__end is-good');
        done.append(el('strong', 'display', t('allenatore.talks.signedTitle')), el('span', '', t(`allenatore.talks.log.${talk.kind === 'loan' ? 'signedLoan' : 'signed'}`, fmt({ fee: talk.fee, wage: talk.contract.wage, years: talk.contract.years }))));
        body.appendChild(done);
      } else {
        const fail = el('div', 'mtalk__end is-bad');
        fail.append(el('strong', 'display', t('allenatore.talks.collapsedTitle')), el('span', '', t(`allenatore.talks.reason.${talk.reason}`, { club: talk.rival?.name || lastClub(talk) })));
        body.appendChild(fail);
      }
      if (status) body.appendChild(el('p', 'mmarket__out is-bad', status));
    }

    function drawIntro(p) {
      const q = candidate;
      body.appendChild(attrBars(p));
      const terms = el('div', 'mpsheet__stats');
      const tb = (label, value) => { const b = el('div', 'mstat'); b.append(el('strong', 'display num', value), el('span', 'label', label)); return b; };
      terms.append(tb(t('allenatore.market.asking'), euro(q.price)), tb(t('allenatore.market.wage'), euro(q.wage)), tb(t('allenatore.market.contract'), String(p.contract)));
      body.append(terms, meter(t('allenatore.market.interest'), Math.round(q.interest * 100), { tone: q.mood === 'keen' ? 'lime' : q.mood === 'maybe' ? 'amber' : 'flare' }));
      const out = el('p', 'mmarket__out is-bad');
      if (!open) out.textContent = t('allenatore.talks.error.closed');
      const acts = el('div', 'mmarket__offers');
      const start = (kind) => {
        const res = openTalks(career, data, candidate, kind);
        if (res.error) { out.textContent = t(`allenatore.talks.error.${res.error}`); return; }
        id = res.talk.id;
        changed = true;
        persist();
        audio.sfx.tick();
        draw();
      };
      acts.append(
        button(t('allenatore.talks.start'), 'btn--go', () => start('buy')),
        button(t('allenatore.talks.startLoan', { fee: euro(q.loanFee) }), 'btn--ghost', () => start('loan')),
      );
      body.append(acts, out);
    }

    function patienceDots(n, max) {
      const box = el('span', 'mtalk__dots');
      for (let i = 0; i < max; i++) box.appendChild(el('i', i < n ? 'is-on' : ''));
      return box;
    }

    function stepper(label, value, onMinus, onPlus) {
      const row = el('div', 'mtalk__stepper');
      row.append(el('span', 'label', label), button('−', 'btn--ghost', onMinus), el('strong', 'display num', value), button('+', 'btn--ghost', onPlus));
      return row;
    }

    function drawClub(talk) {
      const panel = el('div', 'mtalk__panel');
      if (draft.fee == null) draft.fee = talk.round ? talk.ask : r1(Math.max(0.1, talk.ask * 0.85));
      const step = Math.max(0.1, r1(talk.startAsk * 0.05));
      const info = el('div', 'mtalk__info');
      const pat = el('span', 'mtalk__pat');
      pat.append(el('span', 'label', t('allenatore.talks.patience')), patienceDots(talk.patience, 5));
      info.append(el('span', '', `${t('allenatore.talks.ask')}: `), el('strong', 'num', euro(talk.ask)), pat);
      panel.appendChild(info);
      panel.appendChild(stepper(t('allenatore.talks.fee'), euro(draft.fee), () => { draft.fee = r1(Math.max(0.1, draft.fee - step)); draw(); }, () => { draft.fee = r1(draft.fee + step); draw(); }));
      if (talk.kind === 'buy') {
        const bonus = el('div', 'mseg mseg--tight');
        bonus.appendChild(el('span', 'label mtalk__seglabel', t('allenatore.talks.bonus')));
        for (const share of [0, 0.1, 0.25]) {
          const v = r1(draft.fee * share);
          const b = el('button', `mseg__b ${Math.abs((draft.bonusShare ?? 0) - share) < 0.001 ? 'is-on' : ''}`, share ? `+${euro(v)}` : t('allenatore.talks.bonusNone'));
          b.type = 'button';
          b.addEventListener('click', () => { draft.bonusShare = share; draw(); });
          bonus.appendChild(b);
        }
        panel.appendChild(bonus);
      }
      const acts = el('div', 'mmarket__offers');
      acts.appendChild(button(t('allenatore.talks.offer', { fee: euro(draft.fee) }), 'btn--go', () => act(bidClub(career, data, talk.id, { fee: draft.fee, bonus: r1(draft.fee * (draft.bonusShare || 0)) }))));
      acts.appendChild(button(t('allenatore.talks.withdraw'), 'btn--ghost', () => act(withdrawTalk(career, talk.id))));
      if (talk.clause) acts.appendChild(button(t('allenatore.talks.clause', { fee: euro(talk.clause) }), 'btn--ghost mtalk__wide', () => act(payClause(career, data, talk.id))));
      panel.appendChild(acts);
      body.appendChild(panel);
    }

    function drawPlayer(talk) {
      const panel = el('div', 'mtalk__panel');
      const want = talk.counter || talk.demand;
      if (draft.wage == null) draft.wage = want.wage;
      if (draft.years == null) draft.years = want.years;
      if (draft.role == null) draft.role = want.role;
      const step = Math.max(0.01, r2(talk.demand.wage * 0.05));
      const info = el('div', 'mtalk__info');
      const pat = el('span', 'mtalk__pat');
      pat.append(el('span', 'label', t('allenatore.talks.playerPatience')), patienceDots(talk.playerPatience, 3));
      info.appendChild(pat);
      panel.appendChild(info);
      panel.appendChild(stepper(t('allenatore.talks.wage'), euro(draft.wage), () => { draft.wage = r2(Math.max(0.01, draft.wage - step)); draw(); }, () => { draft.wage = r2(draft.wage + step); draw(); }));
      if (talk.kind === 'loan') {
        panel.appendChild(el('p', 'dim mtalk__note', t('allenatore.talks.loanTerms', { share: Math.round(LOAN_WAGE * 100) })));
      } else {
        const years = el('div', 'mseg mseg--tight');
        years.appendChild(el('span', 'label mtalk__seglabel', t('allenatore.talks.years')));
        for (let y = 1; y <= 5; y++) {
          const b = el('button', `mseg__b ${draft.years === y ? 'is-on' : ''}`, String(y));
          b.type = 'button';
          b.addEventListener('click', () => { draft.years = y; draw(); });
          years.appendChild(b);
        }
        panel.appendChild(years);
      }
      const roles = el('div', 'mseg mseg--tight');
      roles.appendChild(el('span', 'label mtalk__seglabel', t('allenatore.talks.role')));
      for (const r of TALK_ROLES) {
        const b = el('button', `mseg__b ${draft.role === r ? 'is-on' : ''}`, t(`allenatore.talks.rolesCap.${r}`));
        b.type = 'button';
        b.addEventListener('click', () => { draft.role = r; draw(); });
        roles.appendChild(b);
      }
      panel.appendChild(roles);
      panel.appendChild(el('p', 'dim mtalk__note', t('allenatore.talks.costNow', { fee: euro(talk.fee), agent: euro(talk.agentFee), room: euro(Math.max(0, wageRoom(career))) })));
      const acts = el('div', 'mmarket__offers');
      acts.append(
        button(t('allenatore.talks.propose'), 'btn--go', () => act(offerContract(career, data, talk.id, { wage: draft.wage, years: talk.kind === 'loan' ? 1 : draft.years, role: draft.role }))),
        button(t('allenatore.talks.withdraw'), 'btn--ghost', () => act(withdrawTalk(career, talk.id))),
      );
      panel.appendChild(acts);
      body.appendChild(panel);
    }

    function drawMedical(talk) {
      const panel = el('div', 'mtalk__panel');
      panel.appendChild(el('p', 'mtalk__note', t('allenatore.talks.medicalAsk')));
      const acts = el('div', 'mmarket__offers');
      if (!talk.discountTried) acts.appendChild(button(t('allenatore.talks.discount'), 'btn--ghost', () => act(medicalChoice(career, data, talk.id, 'discount'))));
      acts.append(
        button(t('allenatore.talks.proceed'), 'btn--go', () => act(medicalChoice(career, data, talk.id, 'proceed'))),
        button(t('allenatore.talks.walk'), 'btn--ghost', () => act(medicalChoice(career, data, talk.id, 'walk'))),
      );
      panel.appendChild(acts);
      body.appendChild(panel);
    }

    draw();
    sheet({ title: null, body, actions: [{ label: t('common.close'), variant: 'btn--go', onClick: (c) => { c(); if (changed) rerender(); } }] });
  }
}

/* in che fase era la trattativa quando è saltata */
function lastOpenStage(talk) {
  if (talk.contract) return 2;
  if (talk.fee != null) return 1;
  return 0;
}
function lastClub(talk) {
  const m = [...talk.log].reverse().find((x) => x.vars?.club);
  return m ? m.vars.club : '';
}
