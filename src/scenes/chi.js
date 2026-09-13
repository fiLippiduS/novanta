/* CHI È? — la carriera di un giocatore, riga per riga, senza il nome.
   Si scrive, si sceglie dall'elenco, e ogni tentativo sbagliato costa una
   vita ma lascia un indizio: stessa nazionale, stesso ruolo, squadre in
   comune. Chi si arrende vede la risposta dopo una pubblicità. */

import { t } from '../core/i18n.js';
import * as store from '../core/storage.js';
import * as audio from '../core/audio.js';
import { go } from '../core/router.js';
import { el, topbar, sheet, stat } from '../ui/components.js';
import { createCounter } from '../ui/counter.js';
import { createCommentary } from '../ui/commentary.js';
import { quake, replay, waveFrom, flash, stagger } from '../ui/motion.js';
import { searchBox, buildSearchIndex } from '../ui/search.js';
import { nationTag, ensureFlagFont, flagEmoji, countryName } from '../ui/flags.js';
import { loadIndex, loadCareer, wikiUrl } from '../players/data.js';
import { renderInfobox } from '../players/infobox.js';
import { roleShort, roleName } from '../players/terms.js';
import { shareAction, grid } from '../ui/share.js';
import * as ads from '../ads/adapter.js';

const LIVES = 5;
const LEVELS = {
  easy: { minFame: 66 },
  medium: { minFame: 50 },
  hard: { minFame: 34 },
};

function hitRow(p) {
  const row = el('div', `hit role--${p.role}`);
  row.appendChild(el('span', 'hit__role', roleShort(p.role)));
  const main = el('span', 'hit__main');
  main.append(el('span', 'hit__name', p.label));
  const meta = el('span', 'hit__meta');
  const f = flagEmoji(p.nation);
  meta.textContent = `${f ? `${f} ` : ''}${countryName(p.nation)} · ${p.birthYear}`;
  main.appendChild(meta);
  row.appendChild(main);
  return row;
}

export async function mount(host, params = {}) {
  ensureFlagFont();
  const shell = el('div', 'shell chi');
  const bar = topbar({ title: t('chi.title'), onExit: () => go('hub') });

  const streakCounter = createCounter(store.get('chi.streak') || 0, { className: 'arcade__score display' });
  const bestBox = el('div', 'squad__best');
  bestBox.append(el('span', 'label', t('common.best')), el('strong', 'num', String(store.get('chi.best') || 0)));
  const scores = el('div', 'squad__scores');
  scores.append(streakCounter.el, bestBox);
  bar.slot.appendChild(scores);
  shell.appendChild(bar.el);
  host.appendChild(shell);

  const loading = el('p', 'chi__loading label', t('common.loading'));
  shell.appendChild(loading);

  const data = await loadIndex();
  loading.remove();

  const comm = createCommentary();
  let level = params.level && LEVELS[params.level] ? params.level : (store.get('chi.level') || 'medium');
  let target = null;
  let career = null;
  let lives = LIVES;
  let guesses = [];
  let finished = false;
  let box = null;

  const searchIndex = buildSearchIndex(data.players);

  /* ---------------- scelta del giocatore ---------------- */

  function pool() {
    const min = LEVELS[level].minFame;
    return data.players.filter((p) => p.complete && p.fame >= min && p.clubs.length >= 1);
  }

  function pickTarget() {
    const recent = new Set(store.get('chi.recent') || []);
    const candidates = pool().filter((p) => !recent.has(p.id));
    const list = candidates.length ? candidates : pool();
    return list[Math.floor(Math.random() * list.length)];
  }

  /* ---------------- disegno ---------------- */

  const layout = el('div', 'chi__layout');
  const side = el('div', 'chi__side');
  const main = el('div', 'chi__main');
  layout.append(side, main);

  const levels = el('div', 'chi__levels');
  Object.keys(LEVELS).forEach((key) => {
    const b = el('button', `chip chi__level${key === level ? ' is-on' : ''}`, t(`chi.level.${key}`));
    b.type = 'button';
    b.addEventListener('click', () => {
      if (key === level) return;
      level = key;
      store.save({ chi: { level } });
      levels.querySelectorAll('.chi__level').forEach((n) => n.classList.toggle('is-on', n === b));
      newRound();
    });
    levels.appendChild(b);
  });

  const livesRow = el('div', 'chi__lives');
  const livesDots = el('div', 'lives');
  livesRow.append(el('span', 'label', t('chi.lives')), livesDots);

  const search = searchBox({
    placeholder: t('chi.placeholder'),
    index: searchIndex,
    render: hitRow,
    onPick: guess,
  });

  const guessesBox = el('div', 'chi__guesses');
  const actions = el('div', 'chi__actions');
  const giveUp = el('button', 'btn btn--ghost chi__giveup', t('chi.giveUp'));
  giveUp.type = 'button';
  giveUp.addEventListener('click', surrender);
  actions.appendChild(giveUp);

  side.append(levels, livesRow, search.el, guessesBox, actions, comm.el);
  shell.appendChild(layout);

  function paintLives() {
    livesDots.textContent = '';
    for (let i = 0; i < LIVES; i++) {
      livesDots.appendChild(el('i', `life${i >= lives ? ' life--lost' : ''}`));
    }
  }

  async function newRound() {
    finished = false;
    lives = LIVES;
    guesses = [];
    guessesBox.textContent = '';
    paintLives();
    search.setDisabled(true);
    giveUp.disabled = true;
    main.textContent = '';
    main.appendChild(el('p', 'chi__loading label', t('common.loading')));

    target = pickTarget();
    career = await loadCareer(target.id);
    if (!career) { target = null; return newRound(); }

    box = renderInfobox(target, career, data.clubs, { hidden: true });
    main.textContent = '';
    main.appendChild(box);
    replay(box, 'anim-rise');
    stagger(box.querySelectorAll('.ibox__spell, .hon'), 'anim-rise', 18);

    search.setDisabled(false);
    giveUp.disabled = false;
    comm.say('commentary.chiStart');
    if (matchMedia('(min-width: 56rem)').matches) search.focus();
  }

  /* ---------------- tentativi ---------------- */

  function feedbackChips(p) {
    const row = el('div', 'guess__hints');
    const same = (ok, label) => {
      const c = el('span', `ghint ${ok ? 'ghint--ok' : 'ghint--no'}`, label);
      row.appendChild(c);
    };
    same(p.nation === target.nation, `${flagEmoji(p.nation) || p.nation} ${t(p.nation === target.nation ? 'chi.hintSameNation' : 'chi.hintOtherNation')}`);
    same(p.role === target.role, `${roleShort(p.role)} ${t(p.role === target.role ? 'chi.hintSameRole' : 'chi.hintOtherRole')}`);
    const diff = target.birthYear - p.birthYear;
    const born = el('span', `ghint ${diff === 0 ? 'ghint--ok' : 'ghint--mid'}`,
      diff === 0 ? t('chi.hintSameYear') : t(diff > 0 ? 'chi.hintYounger' : 'chi.hintOlder'));
    row.appendChild(born);
    const shared = p.clubs.filter((c) => target.clubs.includes(c));
    const sh = el('span', `ghint ${shared.length ? 'ghint--ok' : 'ghint--no'}`,
      t('chi.hintShared', { n: shared.length }));
    row.appendChild(sh);
    return { row, shared };
  }

  function guess(p) {
    if (finished || !target) return;
    if (guesses.includes(p.id)) {
      comm.say('commentary.chiAgain', 'warn');
      audio.sfx.dup();
      return;
    }
    guesses.push(p.id);

    if (p.id === target.id) { win(); return; }

    lives -= 1;
    audio.sfx.miss();
    quake(0.6);
    paintLives();
    const lost = livesDots.children[lives];
    if (lost) replay(lost, 'anim-shake');

    const item = el('div', 'guess card');
    const head = el('div', 'guess__head');
    head.append(el('span', 'guess__x', '✗'), el('span', 'guess__name', p.label));
    const { row, shared } = feedbackChips(p);
    item.append(head, row);
    guessesBox.prepend(item);
    replay(item, 'anim-rise');

    /* le squadre in comune si accendono nella scheda: il tentativo insegna qualcosa */
    shared.forEach((c) => {
      box.querySelectorAll(`.ibox__spell[data-club="${c}"]`).forEach((n) => flash(n, 'ibox__spell--shared', 2400));
    });

    if (lives === 2 && box.__born.hidden) {
      box.__born.hidden = false;
      replay(box.__born, 'anim-snap');
      comm.say('commentary.chiBorn', 'warn');
    } else {
      comm.say('commentary.chiWrong', 'bad');
    }

    if (lives <= 0) lose(false);
  }

  function reveal(good) {
    finished = true;
    search.setDisabled(true);
    giveUp.disabled = true;
    box.__name.textContent = target.label;
    box.__name.dataset.hidden = '0';
    box.__born.hidden = false;
    box.classList.add(good ? 'ibox--solved' : 'ibox--failed');
    replay(box.__name, 'anim-snap');
  }

  function win() {
    reveal(true);
    audio.sfx.goal();
    waveFrom(box.__name, 'var(--lime)');
    comm.say('commentary.chiRight', 'good');
    const s = store.load();
    const streak = (s.chi.streak || 0) + 1;
    const best = Math.max(s.chi.best || 0, streak);
    const coins = 2 + lives;
    store.save({
      chi: { streak, best, solved: (s.chi.solved || 0) + 1, played: (s.chi.played || 0) + 1, recent: remember(s) },
      coins: (s.coins || 0) + coins,
    });
    streakCounter.set(streak);
    bestBox.querySelector('strong').textContent = String(best);
    if (streak > (s.chi.best || 0) && streak > 1) audio.sfx.record();
    setTimeout(() => endSheet(true, coins), 900);
  }

  function lose(surrendered) {
    reveal(false);
    audio.sfx.over();
    comm.say(surrendered ? 'commentary.chiSurrender' : 'commentary.chiLost', 'bad');
    const s = store.load();
    store.save({ chi: { streak: 0, played: (s.chi.played || 0) + 1, recent: remember(s) } });
    streakCounter.set(0);
    setTimeout(() => endSheet(false, 0), 900);
  }

  function remember(s) {
    return [...(s.chi.recent || []), target.id].slice(-60);
  }

  async function surrender() {
    if (finished || !target) return;
    giveUp.disabled = true;
    search.setDisabled(true);
    /* la risposta arriva in ogni caso: anche senza annuncio disponibile */
    await ads.breakThen('chi-arrenditi');
    lose(true);
  }

  function endSheet(good, coins) {
    const body = el('div', 'result');
    const who = el('div', 'chi__answer');
    who.append(el('strong', 'display t-lg', target.label), nationTag(target.nation));
    body.appendChild(who);
    const rowStats = el('div', 'result__stats');
    rowStats.append(
      stat(t('chi.streak'), store.get('chi.streak') || 0, good ? 'good' : null),
      stat(t('common.best'), store.get('chi.best') || 0),
      stat(t('chi.tries'), `${guesses.length}/${LIVES}`),
    );
    if (coins) rowStats.appendChild(stat(t('common.coins'), `+${coins}`, 'warn'));
    body.appendChild(rowStats);
    const link = el('a', 'chi__wiki', t('chi.wiki'));
    link.href = wikiUrl(career.title);
    link.target = '_blank';
    link.rel = 'noopener';
    body.appendChild(link);

    sheet({
      title: good ? t('chi.solved') : t('chi.missed'),
      body,
      dismissable: true,
      actions: [
        {
          label: t('chi.next'), variant: 'btn--go',
          onClick: async (close) => { close(); await ads.interstitial('chi-next', 4); newRound(); },
        },
        shareAction(() => ({
          mode: t('chi.title'),
          grid: grid(guesses.map((id) => id === target.id), { on: '🟩', off: '🟥', max: LIVES }),
          rows: [good ? t('chi.shareSolved', { n: guesses.length }) : t('chi.shareMissed'), `${t('chi.streak').toLowerCase()} ${store.get('chi.streak') || 0}`],
        })),
        { label: t('common.back'), variant: 'btn--ghost', onClick: (c) => { c(); go('hub'); } },
      ],
    });
  }

  await newRound();

  return () => {
    comm.destroy();
    document.querySelectorAll('.sheet').forEach((x) => x.remove());
  };
}
