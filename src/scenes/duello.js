/* PIÙ O MENO — due giocatori, un parametro, una domanda sola.
   Chi vince resta in campo e affronta il prossimo: la catena scorre da
   destra a sinistra e non si ferma finché non sbagli. */

import { t } from '../core/i18n.js';
import * as store from '../core/storage.js';
import * as audio from '../core/audio.js';
import { go } from '../core/router.js';
import { el, topbar, sheet, stat } from '../ui/components.js';
import { createCounter } from '../ui/counter.js';
import { createCommentary } from '../ui/commentary.js';
import { quake, floatGain, replay, waveFrom } from '../ui/motion.js';
import * as ads from '../ads/adapter.js';
import { shareAction, grid } from '../ui/share.js';
import { nextRound, firstRound, winnerOf, PARAMS } from '../duel/engine.js';
import { countryName, flagEmoji, ensureFlagFont } from '../ui/flags.js';

const rand = Math.random;
const REVEAL_MS = 900;
const SHIFT_MS = 480;

let cached = null;
async function loadPlayers() {
  if (cached) return cached;
  const res = await fetch('data/duel.json');
  cached = (await res.json()).players;
  return cached;
}

const ROLE_COLOR = {
  POR: 'var(--amber)', DIF: 'var(--lime)', CEN: 'var(--sky)', ATT: 'var(--flare)',
};

export async function mount(host) {
  ensureFlagFont();
  const players = await loadPlayers();

  const shell = el('div', 'shell duello');
  const bar = topbar({ title: t('duello.title'), onExit: () => go('hub') });

  const score = createCounter(0, { className: 'arcade__score display' });
  const bestVal = store.get('duel.best') || 0;
  const bestBox = el('div', 'squad__best');
  bestBox.append(el('span', 'label', t('common.best')), el('strong', 'num', String(bestVal)));
  const scores = el('div', 'squad__scores');
  scores.append(score.el, bestBox);
  bar.slot.appendChild(scores);

  const arena = el('div', 'arena');
  const leftSlot = el('div', 'arena__slot arena__slot--left');
  const vs = el('div', 'arena__vs');
  const rightSlot = el('div', 'arena__slot arena__slot--right');
  arena.append(leftSlot, vs, rightSlot);

  const comm = createCommentary();
  const hint = el('p', 'duello__hint label', t('duello.pick'));
  shell.append(bar.el, arena, hint, comm.el);
  host.appendChild(shell);

  /* ---------------- stato ---------------- */

  let keeper = null;          // chi resta in campo
  let rival = null;
  let param = null;
  let recent = [];
  let lastParam = null;
  let points = 0;
  let streak = 0;
  let busy = false;
  let over = false;
  let continued = false;
  let bestBeaten = false;

  /* ---------------- le carte ---------------- */

  function card(player, side) {
    const c = el('button', `dcard dcard--${side}`);
    c.type = 'button';
    c.style.setProperty('--role-c', ROLE_COLOR[player.role]);

    const top = el('div', 'dcard__top');
    top.append(
      el('span', 'dcard__role label', t(`duello.roles.${player.role}`)),
      el('span', 'dcard__nat label', /^[A-Z]{2}(-[A-Z]{1,3})?$/.test(player.nation) ? `${flagEmoji(player.nation)} ${countryName(player.nation)}`.trim() : player.nation),
    );

    const name = el('strong', 'dcard__name display', player.name);
    const club = el('span', 'dcard__club label', player.club);

    /* Il posto del numero c'è già, con un trattino: così quando il dato
       compare la carta non si allunga e l'occhio sa dove guardare. */
    const valBox = el('div', 'dcard__value');
    const placeholder = el('span', 'dcard__num dcard__num--wait display', '—');
    const counter = createCounter(0, { className: 'dcard__num display' });
    counter.el.hidden = true;
    valBox.append(placeholder, counter.el);

    c.append(top, name, club, valBox);
    c.__counter = counter;
    c.__valBox = valBox;
    c.__placeholder = placeholder;
    c.__player = player;
    c.addEventListener('click', () => choose(side));
    return c;
  }

  function paintParam() {
    vs.textContent = '';
    vs.append(
      el('span', 'label arena__who', t('duello.who')),
      el('strong', 'arena__param display', t(`duello.params.${param.key}`)),
    );
    replay(vs, 'anim-snap');
  }

  function render(entering) {
    leftSlot.textContent = '';
    rightSlot.textContent = '';
    const l = card(keeper, 'left');
    const r = card(rival, 'right');
    leftSlot.appendChild(l);
    rightSlot.appendChild(r);
    paintParam();
    hint.textContent = t('duello.pick');

    if (entering) {
      const wide = matchMedia('(min-width: 34rem)').matches;
      r.animate(
        [{ transform: wide ? 'translateX(46%)' : 'translateY(46%)', opacity: 0 },
          { transform: 'none', opacity: 1 }],
        { duration: 340, easing: 'cubic-bezier(0.18,1.32,0.42,1)' },
      );
    } else {
      replay(l, 'anim-rise');
      replay(r, 'anim-rise');
    }
  }

  /* ---------------- la scelta ---------------- */

  function choose(side) {
    if (busy || over) return;
    busy = true;

    const l = leftSlot.firstChild;
    const r = rightSlot.firstChild;
    const chosen = side === 'left' ? keeper : rival;
    const other = side === 'left' ? rival : keeper;
    const right = chosen[param.key] >= other[param.key];

    // i numeri escono su tutte e due le carte: il confronto si vede
    [[l, keeper], [r, rival]].forEach(([cardEl, p]) => {
      cardEl.__placeholder.hidden = true;
      cardEl.__counter.el.hidden = false;
      cardEl.__counter.set(p[param.key]);
      cardEl.disabled = true;
    });

    const winner = winnerOf(param, keeper, rival);
    const winEl = winner === keeper ? l : r;
    const loseEl = winner === keeper ? r : l;
    winEl.classList.add('dcard--win');
    loseEl.classList.add('dcard--lose');

    if (right) {
      points += 1;
      streak += 1;
      score.set(points);
      audio.sfx.hit();
      waveFrom(side === 'left' ? l : r, 'var(--lime)');
      floatGain(side === 'left' ? l : r, '+1');
      comm.say(streak >= 5 ? 'commentary.duelHot' : 'commentary.duelRight', 'good');
      if (!bestBeaten && bestVal > 0 && points > bestVal) {
        bestBeaten = true;
        bestBox.classList.add('squad__best--beaten');
        audio.sfx.record();
      }
      bestBox.querySelector('strong').textContent = String(Math.max(bestVal, points));
      setTimeout(advance, REVEAL_MS);
    } else {
      (side === 'left' ? l : r).classList.add('dcard--wrong');
      audio.sfx.miss();
      quake(1);
      comm.say('commentary.duelWrong', 'bad');
      setTimeout(gameOver, 1300);
    }
  }

  /* La catena scorre: chi ha vinto scivola a sinistra e da destra entra
     il prossimo. È il movimento che dà il senso di continuità. */
  function advance() {
    const l = leftSlot.firstChild;
    const r = rightSlot.firstChild;
    const winner = winnerOf(param, keeper, rival);

    /* Lo spostamento si misura dagli slot, non si scrive a mano: così la
       stessa animazione funziona con le carte affiancate e impilate. */
    const a = leftSlot.getBoundingClientRect();
    const b = rightSlot.getBoundingClientRect();
    const dx = a.left - b.left;
    const dy = a.top - b.top;
    const out = Math.abs(dx) > Math.abs(dy) ? 'translateX(-120%)' : 'translateY(-120%)';
    const moving = winner === keeper ? null : r;

    l.animate([{ transform: 'none', opacity: 1 }, { transform: out, opacity: 0 }],
      { duration: SHIFT_MS, easing: 'cubic-bezier(0.7,0,0.84,0)', fill: 'forwards' });

    if (moving) {
      moving.animate(
        [{ transform: 'none' }, { transform: `translate(${dx}px, ${dy}px)` }],
        { duration: SHIFT_MS, easing: 'cubic-bezier(0.16,0.84,0.28,1)', fill: 'forwards' },
      );
    }

    setTimeout(() => {
      keeper = winner;
      recent.push(rival.name);
      lastParam = param.key;
      const round = nextRound(rand, players, keeper, recent.slice(-5), lastParam);
      if (!round) { gameOver(); return; }
      param = round.param;
      rival = round.rival;
      busy = false;
      render(true);
    }, SHIFT_MS);
  }

  /* ---------------- fine ---------------- */

  function gameOver() {
    if (over) return;
    over = true;
    audio.sfx.over();

    const s = store.load();
    const isRecord = points > (s.duel?.best || 0);
    store.save({
      duel: {
        best: Math.max(s.duel?.best || 0, points),
        played: (s.duel?.played || 0) + 1,
        total: (s.duel?.total || 0) + points,
      },
      coins: (s.coins || 0) + points * 2,
    });

    const body = el('div', 'result');
    const row = el('div', 'result__stats');
    row.append(
      stat(t('duello.right'), points, isRecord ? 'good' : null),
      stat(t('common.best'), Math.max(bestVal, points)),
      stat(t('common.coins'), `+${points * 2}`, 'warn'),
    );
    body.appendChild(row);
    if (isRecord && points > 0) {
      body.appendChild(el('p', 'result__record display t-lg', t('squad.newRecord')));
    }

    const actions = [];
    /* L'unica pubblicità di questa modalità, e la chiede l'utente:
       una seconda possibilità quando la catena si è appena spezzata. */
    if (!continued && points > 0) {
      actions.push({
        label: `▶ ${t('duello.oneMore')}`,
        variant: 'btn--reward',
        onClick: async (close) => {
          close();
          const earned = await ads.rewarded('duello-continue');
          if (earned) revive(); else gameOver();
        },
      });
    }
    actions.push({
      label: t('common.retry'),
      variant: 'btn--go',
      onClick: async (close) => { close(); await ads.interstitial('duello-restart', 3); go('duello'); },
    });
    actions.push(shareAction(() => ({
      mode: t('duello.title'),
      grid: grid(Array(points).fill(true).concat(continued ? [] : [false])),
      rows: [`${points} · ${t('common.best').toLowerCase()} ${Math.max(bestVal, points)}`],
    })));
    actions.push({ label: t('common.back'), variant: 'btn--ghost', onClick: (c) => { c(); go('hub'); } });

    sheet({ title: t('duello.gameOver'), body, actions, dismissable: false });
  }

  function revive() {
    continued = true;
    over = false;
    busy = false;
    const round = nextRound(rand, players, keeper, recent.slice(-5), lastParam);
    if (!round) { over = true; gameOver(); return; }
    param = round.param;
    rival = round.rival;
    recent.push(rival.name);
    audio.sfx.record();
    render(true);
  }

  /* ---------------- avvio ---------------- */

  const start = firstRound(rand, players);
  keeper = start.left;
  rival = start.rival;
  param = start.param;
  recent = [keeper.name, rival.name];
  lastParam = param.key;
  render(false);
  comm.say('commentary.duelStart');

  return () => {
    comm.destroy();
    document.querySelectorAll('.sheet').forEach((x) => x.remove());
  };
}
