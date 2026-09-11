/* LA ROSA — novanta secondi per nominare una squadra intera.
   Il finale è la parte importante: i giocatori mancati si rivelano
   uno a uno, ed è lì che nasce la voglia di riprovare subito. */

import { t } from '../core/i18n.js';
import * as store from '../core/storage.js';
import * as audio from '../core/audio.js';
import { go } from '../core/router.js';
import { el, topbar, crest, sheet, stat } from '../ui/components.js';
import { createCounter } from '../ui/counter.js';
import { createCommentary } from '../ui/commentary.js';
import { waveFrom, floatGain, shake, quake, replay, flash } from '../ui/motion.js';
import { buildIndex, matchGuess, matchExact, hasLongerCandidate, initialsOf } from '../core/match.js';
import { rngFor, utcDayKey, shuffled } from '../core/rng.js';
import * as ads from '../ads/adapter.js';
import { shareAction, bars } from '../ui/share.js';
import { onHidden } from '../core/visibility.js';

const ROUND_MS = 90_000;
const BONUS_MS = 30_000;

let cachedSquads = null;
async function loadSquads() {
  if (cachedSquads) return cachedSquads;
  const res = await fetch('data/squads.json', { cache: 'force-cache' });
  cachedSquads = (await res.json()).squads;
  return cachedSquads;
}

/* Le squadre girano in una rotazione mescolata: si passa da tutte prima di
   rivederne una, e ogni giro l'ordine è nuovo. Con l'estrazione a caso capitava
   di ritrovarsi la stessa squadra due partite dopo. */
function chooseTeam(squads, wanted) {
  if (wanted) {
    const found = squads.find((s) => s.id === wanted);
    if (found) return found;
  }

  const ids = squads.map((s) => s.id);
  let queue = (store.get('squad.queue') || []).filter((id) => ids.includes(id));

  if (queue.length === 0) {
    const rand = () => Math.random();
    queue = shuffled(rand, ids);
    // mai ricominciare con la stessa squadra appena giocata
    const last = store.get('squad.lastTeam');
    if (queue[0] === last && queue.length > 1) {
      [queue[0], queue[queue.length - 1]] = [queue[queue.length - 1], queue[0]];
    }
  }

  const id = queue.shift();
  store.save({ squad: { queue, lastTeam: id } });
  return squads.find((s) => s.id === id) || squads[0];
}

export async function mount(host, params) {
  const squads = await loadSquads();
  const team = chooseTeam(squads, params.team);
  const index = buildIndex(team.players, team.aliases);

  /* in sviluppo si può accorciare il round per collaudare il finale:
     ?secs=6 — attivo solo su localhost */
  const devSecs = location.hostname === 'localhost' ? Number(params.secs) : 0;
  const roundMs = devSecs > 0 ? devSecs * 1000 : ROUND_MS;

  const found = new Set();
  let running = false;
  let ended = false;
  let remaining = roundMs;
  let hintUsed = false;
  let bonusUsed = false;
  let streak = 0;
  let raf = null;
  let lastTick = 0;
  let urgentFrom = 10_000;

  const best = store.get('squad.best') || 0;
  let bestBeaten = false;

  /* ---------------- impalcatura ---------------- */

  const shell = el('div', 'shell squad');
  const bar = topbar({ title: t('squad.title'), onExit: () => go('hub') });

  const score = createCounter(0, { className: 'squad__score display' });
  const bestBox = el('div', 'squad__best');
  bestBox.append(el('span', 'label', t('common.best')), el('strong', 'num', String(best)));

  const scoreWrap = el('div', 'squad__scores');
  scoreWrap.append(score.el, bestBox);
  bar.slot.appendChild(scoreWrap);

  /* --- identità della squadra: solo nome, stagione e fasce di colore --- */
  const banner = el('div', 'squad__banner');
  banner.style.setProperty('--team-a', team.colors[0]);
  banner.style.setProperty('--team-b', team.colors[1] || team.colors[0]);
  const ident = el('div', 'squad__ident');
  ident.append(
    el('h3', 'squad__team display t-xxl', team.name),
    el('p', 'squad__season label', `${team.season} · ${team.league}`),
  );
  banner.append(crest(team.colors, 54), ident);

  /* --- cronometro --- */
  const timerWrap = el('div', 'timer');
  const timerFill = el('i', 'timer__fill');
  const timerNum = el('span', 'timer__num num', '1:30');
  timerWrap.append(timerFill, timerNum);

  /* --- campo di gioco --- */
  const form = el('form', 'squad__form');
  const input = el('input', 'squad__input');
  input.type = 'text';
  input.autocomplete = 'off';
  input.autocapitalize = 'words';
  input.spellcheck = false;
  input.placeholder = t('squad.placeholder');
  input.setAttribute('aria-label', t('squad.placeholder'));
  input.name = 'guess';
  form.appendChild(input);
  // il browser ripristina il contenuto dei campi dopo un ricaricamento:
  // qui è solo spazzatura della partita precedente
  input.value = '';
  requestAnimationFrame(() => { input.value = ''; });

  /* Il suggerimento si sblocca solo nell'ultimo terzo della partita:
     prima sarebbe un'offerta invadente, dopo è un salvagente chiesto. */
  const hintBtn = el('button', 'squad__hint btn btn--reward btn--sm');
  hintBtn.type = 'button';
  hintBtn.hidden = true;
  hintBtn.textContent = `▶ ${t('squad.hint')}`;
  hintBtn.title = t('squad.hintDesc');
  form.appendChild(hintBtn);

  const comm = createCommentary();

  /* --- griglia: una casella vuota per ogni giocatore da trovare --- */
  const grid = el('div', 'squad__grid');
  const slots = team.players.map(() => {
    const s = el('div', 'slot');
    s.appendChild(el('span', 'slot__n'));
    grid.appendChild(s);
    return s;
  });
  const progress = el('p', 'squad__progress label');
  const updateProgress = () => {
    progress.textContent = `${t('squad.found')} ${found.size} / ${team.players.length}`;
  };
  updateProgress();

  shell.append(bar.el, banner, timerWrap, form, comm.el, progress, grid);
  host.appendChild(shell);

  /* ---------------- conto alla rovescia d'inizio ---------------- */

  const ready = el('div', 'countdown');
  const readyNum = el('div', 'countdown__n display');
  ready.append(el('p', 'label', t('squad.getReady')), readyNum);
  host.appendChild(ready);

  let n = 3;
  readyNum.textContent = String(n);
  audio.sfx.tick();
  const cd = setInterval(() => {
    n -= 1;
    if (n > 0) {
      readyNum.textContent = String(n);
      replay(readyNum, 'anim-snap');
      audio.sfx.tick();
    } else {
      clearInterval(cd);
      readyNum.textContent = t('squad.go');
      readyNum.classList.add('countdown__n--go');
      replay(readyNum, 'anim-snap');
      audio.sfx.whistle();
      setTimeout(() => {
        ready.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 200, fill: 'forwards' });
        setTimeout(() => ready.remove(), 210);
        begin();
      }, 420);
    }
  }, 700);

  /* ---------------- ciclo di gioco ---------------- */

  function begin() {
    running = true;
    lastTick = performance.now();
    input.focus();
    comm.say('commentary.squadStart');
    tickLoop();
  }

  function tickLoop() {
    raf = requestAnimationFrame(tickLoop);
    const now = performance.now();
    // un fotogramma non può valere più di un quarto di secondo: protegge
    // dai salti di un browser che ha appena ripreso a disegnare
    const dt = Math.min(250, now - lastTick);
    lastTick = now;
    if (!running) return;

    remaining -= dt;
    if (remaining <= 0) { remaining = 0; finish(); }

    const ratio = remaining / roundMs;
    timerFill.style.transform = `scaleX(${Math.max(0, Math.min(1, ratio))})`;

    const secs = Math.ceil(remaining / 1000);
    const label = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;
    if (timerNum.textContent !== label) {
      timerNum.textContent = label;
      if (remaining < urgentFrom) {
        audio.sfx.urgent();
        replay(timerNum, 'anim-snap');
      }
    }
    timerWrap.classList.toggle('timer--urgent', remaining < urgentFrom);

    if (!hintUsed && hintBtn.hidden && remaining < roundMs / 3 && found.size < team.players.length) {
      hintBtn.hidden = false;
      replay(hintBtn, 'anim-snap');
    }
  }

  /* ---------------- tentativi ---------------- */

  function accept(entry, viaEnter) {
    found.add(entry.id);
    streak += 1;

    const slot = slots[found.size - 1];
    slot.classList.add('slot--filled');
    slot.style.setProperty('--tilt', `${(Math.random() * 2 - 1) * 1.6}deg`);
    slot.querySelector('.slot__n').textContent = entry.name;
    replay(slot, 'anim-snap');

    score.set(found.size);
    updateProgress();
    audio.sfx.hit();
    waveFrom(input, 'var(--lime)');
    floatGain(input, '+1');

    if (!bestBeaten && best > 0 && found.size > best) {
      bestBeaten = true;
      bestBox.classList.add('squad__best--beaten');
      bestBox.querySelector('strong').textContent = String(found.size);
      bestBox.style.animation = 'overtake 460ms var(--e-spring)';
      audio.sfx.record();
      comm.say('commentary.squadRecord', 'good');
    } else {
      bestBox.querySelector('strong').textContent =
        String(Math.max(best, found.size));
      comm.say(streak >= 4 ? 'commentary.squadStreak' : 'commentary.squadHit', 'good');
    }

    input.value = '';
    if (found.size === team.players.length) finish(true);
  }

  function reject() {
    streak = 0;
    shake(form);
    flash(input, 'squad__input--bad', 360);
    audio.sfx.miss();
    comm.say('commentary.squadMiss', 'bad');
  }

  function duplicate(entry) {
    audio.sfx.dup();
    comm.say('commentary.squadDup', 'warn');
    const i = [...found].indexOf(entry.id);
    const slot = slots[i >= 0 ? i : 0];
    if (slot) replay(slot, 'anim-ring');
    input.value = '';
  }

  hintBtn.addEventListener('click', async () => {
    if (hintUsed || ended) return;
    const missing = index.entries.filter((e) => !found.has(e.id));
    if (!missing.length) return;
    hintBtn.disabled = true;
    const earned = await ads.rewarded('squad-hint');
    if (!earned) { hintBtn.disabled = false; input.focus(); return; }

    hintUsed = true;
    hintBtn.hidden = true;
    const target = missing[Math.floor(Math.random() * missing.length)];
    const ghost = slots[team.players.length - 1];
    ghost.classList.add('slot--ghost');
    ghost.querySelector('.slot__n').textContent = initialsOf(target.name);
    replay(ghost, 'anim-snap');
    comm.say('squad.hintGiven', 'warn');
    comm.el.textContent = t('squad.hintGiven', { letters: initialsOf(target.name) });
    audio.sfx.record();
    lastTick = performance.now();
    input.focus();
  });

  /* accettazione automatica: appena quello che hai scritto è inequivocabile,
     il punto è tuo, senza premere invio */
  input.addEventListener('input', () => {
    if (!running) return;
    const raw = input.value;
    if (raw.trim().length < 3) return;
    const entry = matchExact(index, raw, found);
    if (!entry) return;
    if (hasLongerCandidate(index, raw, found, entry.id)) return;
    accept(entry, false);
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!running) return;
    const raw = input.value.trim();
    if (!raw) return;
    const r = matchGuess(index, raw, found);
    if (r.status === 'hit') accept(r.entry, true);
    else if (r.status === 'duplicate') duplicate(r.entry);
    else { reject(); input.value = ''; }
  });

  /* ---------------- fine partita ---------------- */

  function finish(perfect = false) {
    if (ended) return;
    ended = true;
    running = false;
    cancelAnimationFrame(raf);
    input.blur();
    input.disabled = true;
    hintBtn.hidden = true;
    audio.sfx.whistle();
    if (!perfect) quake();

    const s = store.load();
    const isRecord = found.size > (s.squad.best || 0);
    store.save({
      squad: {
        best: Math.max(s.squad.best || 0, found.size),
        played: (s.squad.played || 0) + 1,
        bestTeam: team.id,
      },
      coins: (s.coins || 0) + found.size,
    });

    revealMissing().then(() => showResults(isRecord, perfect));
  }

  /* i mancati si rivelano uno alla volta: è il momento che riporta a giocare */
  function revealMissing() {
    const missing = index.entries.filter((e) => !found.has(e.id));
    let i = found.size;
    return new Promise((resolve) => {
      if (!missing.length) return resolve();
      comm.say('commentary.squadEnd', 'warn');
      let k = 0;
      const iv = setInterval(() => {
        const slot = slots[i++];
        const entry = missing[k++];
        if (slot && entry) {
          slot.classList.add('slot--missed');
          slot.querySelector('.slot__n').textContent = entry.name;
          replay(slot, 'anim-rise');
          audio.sfx.dup();
        }
        if (k >= missing.length) { clearInterval(iv); setTimeout(resolve, 420); }
      }, 110);
    });
  }

  async function showResults(isRecord, perfect) {
    const body = el('div', 'result');
    body.append(
      el('p', 'result__line',
        t('squad.youNamed', { n: found.size, tot: team.players.length })),
    );

    const row = el('div', 'result__stats');
    row.append(
      stat(t('common.score'), found.size, isRecord ? 'good' : null),
      stat(t('common.best'), Math.max(best, found.size)),
      stat(t('common.coins'), `+${found.size}`, 'warn'),
    );
    body.appendChild(row);

    if (isRecord) {
      const badge = el('p', 'result__record display t-lg', t('squad.newRecord'));
      body.appendChild(badge);
      audio.sfx.record();
    }

    const actions = [];

    /* rewarded: offerto solo ora, mai durante la partita */
    if (!bonusUsed && !perfect) {
      actions.push({
        label: `▶ ${t('squad.addTime')}`,
        variant: 'btn--reward',
        onClick: async (close) => {
          close();
          const earned = await ads.rewarded('squad-extra-time');
          if (earned) { bonusUsed = true; resume(); }
          else showResults(isRecord, perfect);
        },
      });
    }

    actions.push({
      label: t('common.retry'),
      variant: 'btn--go',
      onClick: (close) => { close(); go('squad', { team: team.id }); },
    });
    actions.push({
      label: t('squad.again'),
      variant: 'btn--ghost',
      onClick: async (close) => {
        close();
        await ads.interstitial('squad-next-team', 3);
        go('squad');
      },
    });
    actions.push(shareAction(() => ({
      mode: t('squad.title'),
      grid: bars(found.size, team.players.length),
      rows: [
        `${team.name} · ${found.size}/${team.players.length}`,
        `${t('common.best').toLowerCase()} ${Math.max(best, found.size)}`,
      ],
    })));

    sheet({
      title: perfect ? t('squad.perfect') : t('squad.timeUp'),
      body,
      actions,
      dismissable: false,
    });
  }

  /* ripresa dopo il rewarded: le caselle rivelate tornano vuote */
  function resume() {
    ended = false;
    running = true;
    remaining = BONUS_MS;
    urgentFrom = 8_000;
    input.disabled = false;
    input.focus();
    slots.forEach((s, i) => {
      if (s.classList.contains('slot--missed')) {
        s.classList.remove('slot--missed');
        s.querySelector('.slot__n').textContent = '';
      }
    });
    floatGain(timerWrap, `+30s`, 'var(--amber)');
    audio.sfx.record();
    lastTick = performance.now();
    tickLoop();
  }

  /* la partita si mette in pausa se l'utente cambia scheda */
  const stopVisibility = onHidden({
    pause: () => {
      if (!running) return false;
      running = false;
      timerWrap.classList.add('timer--paused');
      return true;
    },
    resume: () => {
      if (ended) return;
      lastTick = performance.now();
      running = true;
      timerWrap.classList.remove('timer--paused');
      input.focus();
    },
  });

  /* ---------------- smontaggio ---------------- */
  return () => {
    stopVisibility();
    clearInterval(cd);
    cancelAnimationFrame(raf);
    comm.destroy();
    document.querySelectorAll('.sheet').forEach((s) => s.remove());
  };
}
