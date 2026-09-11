/* ASTA — venti crediti, cinque ruoli, un avversario che non regala niente.
   Il motore sta in src/auction: qui c'è solo quello che si vede e si tocca. */

import { t } from '../core/i18n.js';
import * as store from '../core/storage.js';
import * as audio from '../core/audio.js';
import { go } from '../core/router.js';
import { el, topbar, sheet, stat } from '../ui/components.js';
import { createCounter } from '../ui/counter.js';
import { createCommentary } from '../ui/commentary.js';
import { waveFrom, floatGain, quake, replay, stagger, flash } from '../ui/motion.js';
import { onHidden } from '../core/visibility.js';
import * as ads from '../ads/adapter.js';
import { shareAction } from '../ui/share.js';
import {
  createAuction, createTeam, openNext, raise, settle, canBid, maxBid,
  needs, lineup, ROLES, NEED, START_CREDITS, BID_MS,
} from '../auction/engine.js';
import { createBot, decide, scoutReport } from '../auction/bot.js';
import { simulate, shootout, strength, MINUTES } from '../auction/match.js';

let cachedCatalog = null;
async function loadCatalog() {
  if (cachedCatalog) return cachedCatalog;
  const res = await fetch('data/auction.json', { cache: 'force-cache' });
  cachedCatalog = (await res.json()).players;
  return cachedCatalog;
}

const rand = Math.random;

export async function mount(host, params = {}) {
  const catalog = await loadCatalog();

  /* in sviluppo si può accorciare il tempo di rilancio per arrivare in fondo
     all'asta senza aspettare: ?bid=400 — attivo solo su localhost */
  const devBid = location.hostname === 'localhost' ? Number(params.bid) : 0;
  const bidMs = devBid > 0 ? devBid : BID_MS;

  const you = createTeam(t('asta.you'), true);
  const bot = createTeam(t('asta.bot'), false);
  const brain = createBot(rand);
  const auction = createAuction(rand, catalog, [you, bot]);

  const shell = el('div', 'shell asta');
  const bar = topbar({ title: t('asta.title'), onExit: () => go('hub') });
  shell.appendChild(bar.el);
  host.appendChild(shell);

  const comm = createCommentary();
  let raf = null;
  let botTimer = null;
  let endTimer = null;
  let scoutUsed = false;
  let matchStop = null;
  let matchResume = null;

  /* ---------------- schermata iniziale ---------------- */

  function renderIntro() {
    const box = el('div', 'asta__intro card halftone misreg card--print anim-rise');
    box.append(
      el('h3', 'display t-xxl', t('asta.title')),
      el('p', 'asta__lead', t('asta.intro')),
      el('p', 'dim', t('asta.rules1')),
      el('p', 'dim', t('asta.rules2')),
    );

    const roles = el('div', 'rolebar');
    ROLES.forEach((r) => {
      const chip = el('span', `rolechip rolechip--${r}`);
      chip.append(
        el('strong', '', t(`asta.rolesShort.${r}`)),
        el('span', 'rolechip__n num', `×${NEED[r]}`),
      );
      roles.appendChild(chip);
    });
    box.appendChild(roles);

    const go1 = el('button', 'btn btn--go btn--lg btn--block', t('asta.start'));
    go1.type = 'button';
    go1.addEventListener('click', () => { audio.sfx.whistle(); startAuction(); });

    const scout = el('button', 'btn btn--reward btn--block', `▶ ${t('asta.scout')}`);
    scout.type = 'button';
    scout.title = t('asta.scoutDesc');
    scout.addEventListener('click', async () => {
      scout.disabled = true;
      const earned = await ads.rewarded('asta-scout');
      if (!earned) { scout.disabled = false; return; }
      scoutUsed = true;
      scout.hidden = true;
      showScout();
    });

    box.append(go1, scout, el('p', 'asta__fine dim', t('asta.scoutDesc')));
    shell.appendChild(box);
  }

  function showScout() {
    const report = scoutReport(brain, bot, auction.lots, Math.max(0, auction.index));
    const body = el('div', 'scout');
    report.forEach((r) => {
      const row = el('div', 'scout__row');
      row.append(
        el('span', `rolechip rolechip--${r.player.role}`, t(`asta.rolesShort.${r.player.role}`)),
        el('span', 'scout__name', r.player.name),
        el('strong', 'scout__max num', t('asta.scoutMax', { n: r.max })),
      );
      body.appendChild(row);
    });
    stagger(body.children, 'anim-rise', 60);
    sheet({ title: t('asta.scoutTitle'), body, actions: [
      { label: t('common.close'), variant: 'btn--go', onClick: (c) => c() },
    ] });
  }

  /* ---------------- l'asta ---------------- */

  let priceCounter = null;
  let countEl = null;
  let lastSecond = 0;
  /* La barra segue una scadenza vera invece di sottrarre il tempo fotogramma
     per fotogramma: con i fotogrammi lunghi il conteggio finiva prima di quello
     che si vedeva, e la barra restava a metà mentre il giocatore era già
     aggiudicato. Così quello che scorre e quello che scade sono la stessa cosa. */
  let deadline = 0;
  let last = 0;
  let running = false;
  let stage = null;
  let raiseBtn = null;
  let lotCard = null;

  function startAuction() {
    shell.textContent = '';
    shell.appendChild(bar.el);

    const board = el('div', 'asta__board');
    board.append(teamPanel(you, 'you'), teamPanel(bot, 'bot'));

    stage = el('div', 'asta__stage');
    shell.append(board, stage, comm.el);
    nextLot();
  }

  function teamPanel(team, kind) {
    const p = el('div', `tpanel tpanel--${kind}`);
    p.dataset.team = kind;
    const head = el('div', 'tpanel__head');
    head.append(el('span', 'label', team.name), el('strong', 'tpanel__credits num', String(team.credits)));
    const slots = el('div', 'tpanel__slots');
    ROLES.forEach((r) => {
      for (let i = 0; i < NEED[r]; i++) {
        const s = el('i', `tslot tslot--${r}`);
        s.dataset.role = r;
        s.dataset.i = i;
        s.title = t(`asta.roles.${r}`);
        slots.appendChild(s);
      }
    });
    p.append(head, slots);
    return p;
  }

  function refreshPanels() {
    [['you', you], ['bot', bot]].forEach(([kind, team]) => {
      const p = shell.querySelector(`.tpanel--${kind}`);
      if (!p) return;
      p.querySelector('.tpanel__credits').textContent = String(team.credits);
      ROLES.forEach((r) => {
        team.squad[r].forEach((player, i) => {
          const s = p.querySelector(`.tslot[data-role="${r}"][data-i="${i}"]`);
          if (s && !s.classList.contains('tslot--full')) {
            s.classList.add('tslot--full');
            s.title = `${player.name} · ${player.paid}`;
            replay(s, 'anim-snap');
          }
        });
      });
    });
  }

  function nextLot() {
    const lot = openNext(auction);
    if (!lot) return showSquads();

    stage.textContent = '';
    deadline = performance.now() + bidMs;

    lotCard = el('div', 'lotcard card halftone misreg card--print');
    lotCard.style.setProperty('--misreg-color', roleColor(lot.role));
    lotCard.style.setProperty('--role-color', roleColor(lot.role));

    const head = el('div', 'lotcard__head');
    head.append(
      el('span', 'label', `${t('asta.lot')} ${auction.index + 1}/${auction.lots.length}`),
      el('span', `rolechip rolechip--${lot.role}`, t(`asta.roles.${lot.role}`)),
    );

    const name = el('h3', 'lotcard__name display', lot.player.name);
    const tag = el('p', 'lotcard__tag dim', lot.player.tag);

    const ratingBox = el('div', 'lotcard__rating');
    ratingBox.append(el('span', 'label', t('asta.rating')),
      el('strong', 'num', String(lot.player.rating)));

    /* Conto alla rovescia in chiaro invece della barra: si legge a colpo
       d'occhio quanto manca, e il giocatore è aggiudicato solo quando
       arriva a zero. */
    countEl = el('div', 'lotcount display num', String(Math.ceil(bidMs / 1000)));
    lastSecond = Math.ceil(bidMs / 1000);

    const priceRow = el('div', 'lotcard__price');
    priceCounter = createCounter(lot.price, { className: 'lotprice display' });
    const capEl = el('span', 'lotcard__cap label');
    priceRow.append(el('span', 'label', t('asta.price')), priceCounter.el, capEl);
    lotCard.__cap = capEl;

    const status = el('p', 'lotcard__status label');
    lotCard.__status = status;

    raiseBtn = el('button', 'btn btn--go btn--lg btn--block asta__raise');
    raiseBtn.type = 'button';
    raiseBtn.addEventListener('click', onRaise);

    lotCard.append(head, name, tag, ratingBox, priceRow, countEl, status, raiseBtn);
    stage.appendChild(lotCard);
    replay(lotCard, 'anim-snap');

    audio.sfx.tick();
    comm.say('commentary.astaOpen');
    updateStatus();
    refreshPanels();

    running = true;
    last = performance.now();
    if (!raf) raf = requestAnimationFrame(tick);
    scheduleBot();
  }

  /* porta arancione, difesa verde, centrocampo blu, attacco rosso */
  function roleColor(role) {
    return ({
      POR: 'var(--amber)',
      DIF: 'var(--lime)',
      CEN: 'var(--sky)',
      ATT: 'var(--flare)',
    })[role];
  }

  function updateStatus() {
    const c = auction.current;
    if (!c) return;
    const st = lotCard.__status;
    const mine = c.leader === you;
    const iCanBid = canBid(you, c.role, c.price);

    if (c.uncontested) {
      /* Nessuno può contendere il giocatore, ma l'assegnazione si vede lo
         stesso: il cronometro scorre e la carta si chiude come le altre. */
      st.textContent = `${mine ? t('asta.uncontested') : t('asta.botUncontested')} · `
        + t('asta.assigning', { n: c.price });
      st.dataset.tone = mine ? 'good' : 'dim';
    } else if (mine) {
      st.textContent = t('asta.leading');
      st.dataset.tone = 'good';
    } else {
      st.textContent = iCanBid ? t('asta.botLeading') : t('asta.noCredits');
      st.dataset.tone = iCanBid ? 'warn' : 'bad';
    }

    // il tetto è sempre a schermo: così si capisce perché a un certo punto
    // non si può più rilanciare, invece di trovare il bottone spento
    const cap = maxBid(you, c.role);
    lotCard.__cap.textContent = cap > 0 ? t('asta.maxBid', { n: cap }) : '';

    raiseBtn.disabled = mine || !iCanBid;
    // il bottone dice quanto ti costa, non ripete quello che c'è scritto sopra
    raiseBtn.textContent = mine
      ? `✓ ${t('asta.yoursFor', { n: c.price })}`
      : `${t('asta.raise')} → ${c.price + 1}`;
    lotCard.classList.toggle('lotcard--mine', mine);
    lotCard.classList.toggle('lotcard--uncontested', Boolean(c.uncontested));
  }

  function onRaise() {
    const c = auction.current;
    if (!c || !running) return;
    if (!raise(auction, you)) return;
    deadline = performance.now() + bidMs;
    priceCounter.set(c.price);
    audio.sfx.hit();
    lastSecond = -1;          // il conto riparte pieno a ogni rilancio
    waveFrom(raiseBtn, roleColor(c.role));
    floatGain(priceCounter.el, `−1`, 'var(--amber)');
    comm.say('commentary.astaYouLead', 'good');
    updateStatus();
    refreshPanels();
    scheduleBot();
  }

  function scheduleBot() {
    clearTimeout(botTimer);
    const c = auction.current;
    if (!c || c.leader === bot || !needs(bot, c.role)) return;
    const remainingOfRole = auction.lots.slice(auction.index).filter((l) => l.role === c.role).length;
    const call = decide(brain, bot, c, remainingOfRole, rand);
    if (!call) return;
    botTimer = setTimeout(() => {
      if (!running || auction.current !== c) return;
      if (!raise(auction, bot)) return;
      deadline = performance.now() + bidMs;
      priceCounter.set(c.price);
      audio.sfx.dup();
      lastSecond = -1;
      const panel = shell.querySelector('.tpanel--bot');
      flash(panel, 'tpanel--bid', 500);
      comm.say('commentary.astaBotBid', 'warn');
      updateStatus();
      scheduleBot();
    }, call.delay);
  }

  function tick(now) {
    raf = requestAnimationFrame(tick);
    last = now;
    if (!running || !auction.current || !countEl) return;

    const remaining = deadline - now;
    const secs = Math.max(0, Math.ceil(remaining / 1000));

    if (secs !== lastSecond) {
      lastSecond = secs;
      countEl.textContent = String(secs);
      replay(countEl, 'anim-snap');
      if (secs > 0) audio.sfx[secs <= 2 ? 'urgent' : 'tick']();
    }
    countEl.classList.toggle('lotcount--urgent', secs <= 2 && secs > 0);

    // il giocatore è aggiudicato solo quando il conto arriva a zero
    if (remaining <= 0) {
      countEl.textContent = '0';
      closeLot();
    }
  }

  function closeLot() {
    running = false;
    clearTimeout(botTimer);
    const record = settle(auction);
    if (!record) return;

    const mine = record.winner === you;
    audio.sfx[mine ? 'goal' : 'over']();
    comm.say(mine ? 'commentary.astaWonYou' : 'commentary.astaWonBot', mine ? 'good' : 'bad');

    lotCard.classList.add(mine ? 'lotcard--won' : 'lotcard--lost');
    const badge = el('p', 'lotcard__sold display t-lg',
      `${t('asta.sold')} ${t('asta.soldTo', { who: record.winner.name, n: record.price })}`);
    lotCard.appendChild(badge);
    replay(badge, 'anim-snap');
    raiseBtn.disabled = true;
    if (!mine) quake(0.6);

    refreshPanels();
    endTimer = setTimeout(nextLot, 1500);
  }

  /* ---------------- rose pronte ---------------- */

  function showSquads() {
    running = false;
    cancelAnimationFrame(raf);
    raf = null;
    stage.textContent = '';

    const grid = el('div', 'squads');
    grid.append(squadColumn(you, t('asta.yourSquad'), 'you'),
      squadColumn(bot, t('asta.botSquad'), 'bot'));

    const cta = el('button', 'btn btn--go btn--lg btn--block', t('asta.playMatch'));
    cta.type = 'button';
    cta.addEventListener('click', async () => {
      cta.disabled = true;
      await ads.interstitial('asta-match', 2);
      playMatch();
    });

    const wrap = el('div', 'asta__ready');
    wrap.append(el('h3', 'display t-xl', t('asta.squadsReady')), grid, cta);
    stage.appendChild(wrap);
    stagger(grid.querySelectorAll('.sq__row'), 'anim-rise', 55);
  }

  function squadColumn(team, title, kind) {
    const col = el('div', `sq sq--${kind}`);
    col.append(el('p', 'label', title));

    const men = lineup(team);
    men.forEach((p) => {
      const row = el('div', 'sq__row');
      row.append(
        el('span', `rolechip rolechip--${p.role}`, t(`asta.rolesShort.${p.role}`)),
        el('span', 'sq__name', p.name),
        el('span', 'sq__ovr num', String(p.rating)),
        el('span', 'sq__paid num', String(p.paid)),
      );
      col.appendChild(row);
    });

    /* La media della rosa dice in una riga chi ha comprato meglio,
       molto più dei crediti avanzati. */
    const media = Math.round(men.reduce((n, p) => n + p.rating, 0) / Math.max(1, men.length));
    const foot = el('div', 'sq__foot');
    foot.append(
      el('span', 'label', t('asta.avg')),
      el('strong', 'sq__avg display num', String(media)),
      el('span', 'spacer'),
      el('span', 'label', t('asta.left')),
      el('strong', 'num', String(team.credits)),
    );
    col.appendChild(foot);
    return col;
  }

  /* ---------------- la partita ---------------- */

  function playMatch() {
    const result = simulate(rand, you, bot);
    stage.textContent = '';

    const card = el('div', 'mcard');

    const head = el('div', 'mcard__head');
    const clock = el('span', 'mcard__clock num', "0'");
    const scoreEl = el('strong', 'mcard__score display num', '0–0');
    head.append(
      el('span', 'label mcard__comp', t('asta.matchTitle')),
      el('span', 'mcard__vs', `${t('asta.vs')} ${bot.name}`),
      clock,
      scoreEl,
    );

    const list = el('div', 'mcard__events');
    card.append(head, list);
    stage.appendChild(card);
    replay(card, 'anim-rise');

    audio.sfx.whistle();
    comm.say('commentary.matchKick');

    /* Il cronometro scorre davvero: gli avvenimenti compaiono quando il minuto
       li raggiunge, non a intervalli fissi. Su un evento l'orologio si ferma
       un istante, il tempo di leggerlo. */
    /* Quaranta minuti in una decina di secondi: abbastanza lento da seguire
       il cronometro, abbastanza veloce da non annoiare. Su ogni avvenimento
       l'orologio si ferma il tempo di leggerlo. */
    const MS_PER_MINUTE = 165;
    const PAUSE_ON_EVENT = 850;

    let minute = 0;
    let acc = 0;
    let holdUntil = 0;
    let next = 0;
    let h = 0, a = 0;
    let mLast = performance.now();
    let mRaf = null;

    const step = (now) => {
      mRaf = requestAnimationFrame(step);
      const dt = Math.min(200, now - mLast);
      mLast = now;
      if (now < holdUntil) return;

      acc += dt;
      while (acc >= MS_PER_MINUTE && minute < MINUTES) {
        acc -= MS_PER_MINUTE;
        minute += 1;
        clock.textContent = `${minute}'`;

        if (next < result.events.length && result.events[next].minute === minute) {
          while (next < result.events.length && result.events[next].minute === minute) {
            const e = result.events[next++];
            if (e.type === 'goal') { if (e.side === 'home') h += 1; else a += 1; }
            addEvent(list, e, scoreEl, h, a);
          }
          holdUntil = now + PAUSE_ON_EVENT;
          acc = 0;
          break;
        }
      }

      if (minute >= MINUTES && next >= result.events.length) {
        cancelAnimationFrame(mRaf);
        mRaf = null;
        clock.textContent = t('asta.fullTime');
        clock.classList.add('mcard__clock--end');
        audio.sfx.whistle();
        /* Una finale non può finire pari: se i novanta non bastano,
           si va sul dischetto e si vede tirare uno per uno. */
        if (result.outcome === 'draw') {
          endTimer = setTimeout(() => runShootout(result, card, list, clock, scoreEl), 800);
        } else {
          endTimer = setTimeout(() => finishMatch(result, card), 700);
        }
      }
    };

    mRaf = requestAnimationFrame(step);
    matchStop = () => { if (mRaf) cancelAnimationFrame(mRaf); mRaf = null; };
    matchResume = () => { mLast = performance.now(); holdUntil = 0; if (!mRaf) mRaf = requestAnimationFrame(step); };
  }

  /* ---- i rigori, uno alla volta ---- */
  function runShootout(result, card, list, clock, scoreEl) {
    const so = shootout(rand, you, bot, {
      home: new Set(result.sentOff.home), away: new Set(result.sentOff.away),
    });
    clock.textContent = t('asta.pens');
    clock.classList.add('mcard__clock--pens');

    const head = el('div', 'mrow mrow--sep');
    head.append(el('span', 'label', t('asta.pens')));
    list.appendChild(head);

    let h = 0, a = 0;
    let i = 0;
    const step = () => {
      if (i >= so.kicks.length) {
        scoreEl.textContent = `${result.goalsHome}–${result.goalsAway}`;
        const tag = el('p', 'mcard__pens label',
          t('asta.penResult', { a: so.home, b: so.away }));
        card.appendChild(tag);
        replay(tag, 'anim-snap');
        const adjusted = { ...result, shootout: so, outcome: so.winner === 'home' ? 'win' : 'loss' };
        endTimer = setTimeout(() => finishMatch(adjusted, card), 800);
        return;
      }
      const k = so.kicks[i++];
      if (k.scored) { if (k.side === 'home') h += 1; else a += 1; }

      const row = el('div', `mrow mrow--${k.side} mrow--pen ${k.scored ? '' : 'mrow--missed'}`.trim());
      row.append(
        el('span', 'mrow__min num', `${k.round}`),
        el('i', `mrow__mark mrow__mark--${k.scored ? 'goal' : 'miss'}`),
        el('span', 'mrow__name', k.taker.name),
      );
      list.appendChild(row);
      replay(row, 'anim-rise');
      scoreEl.textContent = `${h}–${a}`;
      audio.sfx[k.scored ? 'goal' : 'save']();
      if (k.side === 'home' && k.scored) quake(0.7);

      endTimer = setTimeout(step, 620);
    };
    endTimer = setTimeout(step, 500);
  }

  /** una riga del tabellino: gol, ammonizione o espulsione */
  function addEvent(list, e, scoreEl, h, a) {
    const row = el('div', `mrow mrow--${e.side} mrow--${e.type}`);
    const mark = el('i', `mrow__mark mrow__mark--${e.type}`);
    row.append(el('span', 'mrow__min num', `${e.minute}'`), mark,
      el('span', 'mrow__name', e.player.name));

    /* Il segno colorato dice già se è giallo o rosso: ripeterlo a parole
       rubava spazio al nome. Resta solo il caso che non si vede dal segno. */
    if (e.type === 'red' && e.second) {
      row.appendChild(el('span', 'mrow__tag label', t('asta.secondYellowShort')));
    }
    if (e.type !== 'goal') {
      const full = e.type === 'red'
        ? (e.second ? t('asta.secondYellow') : t('asta.red'))
        : t('asta.yellow');
      row.title = `${e.player.name} — ${full}`;
      mark.setAttribute('aria-label', full);
    }

    list.appendChild(row);
    replay(row, 'anim-rise');

    if (e.type === 'goal') {
      scoreEl.textContent = `${h}–${a}`;
      replay(scoreEl, 'anim-snap');
      audio.sfx[e.side === 'home' ? 'goal' : 'save']();
      if (e.side === 'home') quake(0.9);
    } else if (e.type === 'red') {
      audio.sfx.post();
      quake(0.7);
      comm.say('commentary.matchRed', 'bad');
    } else {
      audio.sfx.dup();
      comm.say('commentary.matchYellow', 'warn');
    }
  }

  function finishMatch(result, card) {
    matchStop = null;
    matchResume = null;
    const key = result.outcome === 'win' ? 'asta.win'
      : result.outcome === 'loss' ? 'asta.loss' : 'asta.draw';
    card.classList.add(`mcard--${result.outcome}`);
    comm.say(`commentary.match${result.outcome === 'win' ? 'Win' : result.outcome === 'loss' ? 'Loss' : 'Draw'}`,
      result.outcome === 'win' ? 'good' : result.outcome === 'loss' ? 'bad' : 'warn');

    const s = store.load();
    const wins = (s.asta?.wins || 0) + (result.outcome === 'win' ? 1 : 0);
    const pens = Boolean(result.shootout);
    const coins = result.outcome === 'win' ? (pens ? 22 : 30)
      : result.outcome === 'draw' ? 12 : (pens ? 8 : 5);
    store.save({
      asta: { wins, played: (s.asta?.played || 0) + 1 },
      coins: (s.coins || 0) + coins,
    });

    const body = el('div', 'result');
    const row = el('div', 'result__stats');
    row.append(
      stat(t('common.score'),
        pens ? `${result.shootout.home}–${result.shootout.away}`
          : `${result.goalsHome}–${result.goalsAway}`,
        result.outcome === 'win' ? 'good' : null),
      stat(t('asta.record'), wins),
      stat(t('common.coins'), `+${coins}`, 'warn'),
    );
    body.append(row);

    sheet({
      title: t(key),
      body,
      dismissable: false,
      actions: [
        { label: t('asta.again'), variant: 'btn--go', onClick: (c) => { c(); go('asta'); } },
        shareAction(() => ({
          mode: t('asta.title'),
          grid: result.outcome === 'win' ? '🟩' : result.outcome === 'draw' ? '🟨' : '🟥',
          rows: [
            `${result.goalsHome}–${result.goalsAway}${pens ? ` (${result.shootout.home}–${result.shootout.away} dcr)` : ''}`,
            `${t('asta.record').toLowerCase()} ${wins}`,
          ],
        })),
        { label: t('common.back'), variant: 'btn--ghost', onClick: (c) => { c(); go('hub'); } },
      ],
    });
  }

  /* ---------------- ciclo di vita ---------------- */

  const stopVisibility = onHidden({
    pause: () => {
      if (matchStop) { matchStop(); return true; }
      if (!running) return false;
      running = false;
      clearTimeout(botTimer);
      return true;
    },
    resume: () => {
      if (matchResume) { matchResume(); return; }
      const now = performance.now();
      // la scadenza slitta del tempo passato in secondo piano
      deadline += now - last;
      last = now;
      running = true;
      scheduleBot();
    },
  });

  function teardown() {
    stopVisibility();
    if (matchStop) matchStop();
    cancelAnimationFrame(raf);
    clearTimeout(botTimer);
    clearTimeout(endTimer);
    comm.destroy();
    document.querySelectorAll('.sheet').forEach((x) => x.remove());
  }

  /* scorciatoia di sviluppo: assegna le rose e salta alle schermate finali,
     per collaudare tabellino e simulazione senza rifare tutta l'asta.
     ?skip=1 — attivo solo su localhost */
  if (location.hostname === 'localhost' && params.skip === '1') {
    shell.textContent = '';
    shell.appendChild(bar.el);
    const board = el('div', 'asta__board');
    board.append(teamPanel(you, 'you'), teamPanel(bot, 'bot'));
    stage = el('div', 'asta__stage');
    shell.append(board, stage, comm.el);
    let lot;
    while ((lot = openNext(auction))) {
      if (!lot.uncontested && rand() < 0.5) raise(auction, auction.teams.find((t) => t !== lot.leader));
      settle(auction);
    }
    refreshPanels();
    showSquads();
    return teardown;
  }

  renderIntro();

  return teardown;
}
