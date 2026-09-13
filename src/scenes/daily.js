/* IL NOVANTESIMO — cinque round, la stessa sfida per tutti nel mondo,
   generata dalla data. Nessuna chiamata di rete, nessun server. */

import { t, tRandom, lang } from '../core/i18n.js';
import * as store from '../core/storage.js';
import * as audio from '../core/audio.js';
import { go } from '../core/router.js';
import { el, topbar, crest, sheet, stat } from '../ui/components.js';
import { createCounter } from '../ui/counter.js';
import { createCommentary } from '../ui/commentary.js';
import { waveFrom, floatGain, quake, replay, stagger } from '../ui/motion.js';
import { rngFor, utcDayKey, msToNextDay } from '../core/rng.js';
import { buildDay } from '../rounds/builders.js';
import * as ads from '../ads/adapter.js';
import { copyOrShare } from '../ui/share.js';

const MAX_PER_ROUND = 200;

let cached = null;
async function loadSquads() {
  if (cached) return cached;
  const res = await fetch('data/squads.json');
  cached = (await res.json()).squads;
  return cached;
}

function hhmmss(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return [Math.floor(s / 3600), Math.floor((s % 3600) / 60), s % 60]
    .map((n) => String(n).padStart(2, '0')).join(':');
}

/* ieri in UTC, per capire se la striscia continua */
function yesterdayKey() {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

function squareFor(points) {
  if (points >= MAX_PER_ROUND) return '🟩';
  if (points > 0) return '🟨';
  return '⬛';
}

export async function mount(host) {
  const squads = await loadSquads();
  const day = utcDayKey();
  const rounds = buildDay(rngFor('daily', day), squads);

  const saved = store.get('daily');
  const alreadyPlayed = saved.lastDay === day;

  const shell = el('div', 'shell daily');
  const bar = topbar({ title: t('daily.title'), onExit: () => go('hub') });

  const score = createCounter(0, { className: 'daily__score display' });
  bar.slot.appendChild(score.el);

  const pips = el('div', 'pips');
  const pipEls = rounds.map(() => {
    const p = el('i', 'pip');
    pips.appendChild(p);
    return p;
  });

  const stage = el('div', 'daily__stage');
  const comm = createCommentary();

  shell.append(bar.el, pips, stage, comm.el);
  host.appendChild(shell);

  let idx = 0;
  let total = 0;
  const results = [];
  let clock = null;

  if (alreadyPlayed) {
    showAlreadyPlayed();
    return () => clearInterval(clock);
  }

  renderRound();

  /* ---------------- un round alla volta ---------------- */

  function renderRound() {
    const r = rounds[idx];
    stage.textContent = '';
    pipEls.forEach((p, i) => p.classList.toggle('pip--now', i === idx));

    const card = el('div', 'qcard card halftone misreg card--print');
    card.append(
      el('p', 'label', `${t('daily.round')} ${idx + 1} ${t('daily.of')} ${rounds.length}`),
      el('h3', 'qcard__prompt display t-lg', t(r.promptKey)),
    );

    let clueCount = r.type === 'drip' ? 1 : (r.clues ? r.clues.length : 0);
    const clueBox = el('div', 'clues');

    const paintClues = () => {
      clueBox.textContent = '';
      (r.clues || []).slice(0, clueCount).forEach((name) => {
        clueBox.appendChild(el('span', 'clue', name));
      });
      stagger(clueBox.children, 'anim-snap', 60);
    };

    if (r.type === 'teammates') {
      const pair = el('div', 'pair');
      pair.append(
        el('span', 'clue clue--big', r.pair[0]),
        el('span', 'pair__amp display', '&'),
        el('span', 'clue clue--big', r.pair[1]),
      );
      card.appendChild(pair);
    } else if (r.clues) {
      paintClues();
      card.appendChild(clueBox);
    }

    /* nel round a indizi si può chiedere un nome in più, pagando in punti */
    let more = null;
    if (r.type === 'drip') {
      more = el('button', 'btn btn--ghost btn--sm', t('daily.nextClue'));
      more.type = 'button';
      more.addEventListener('click', () => {
        clueCount += 1;
        paintClues();
        audio.sfx.tick();
        if (clueCount >= r.clues.length) more.disabled = true;
      });
      card.appendChild(more);
    }

    const opts = el('div', 'options');
    r.options.forEach((o) => {
      const b = el('button', 'option');
      b.type = 'button';
      b.append(el('span', 'option__label', o.i18n ? t(o.label) : o.label));
      if (o.colors) b.prepend(crest(o.colors, 26));
      b.addEventListener('click', () => answer(r, o, b, opts, clueCount, more));
      opts.appendChild(b);
    });
    card.appendChild(opts);

    stage.appendChild(card);
    card.classList.add('anim-rise');
    stagger(opts.children, 'anim-rise', 45);
  }

  function answer(r, chosen, btn, opts, clueCount, more) {
    [...opts.children].forEach((b) => { b.disabled = true; });
    if (more) more.disabled = true;

    // gli indizi in più costano: cinque nomi valgono meno di uno
    const penalty = r.type === 'drip' ? (clueCount - 1) * 40 : 0;
    const points = chosen.correct ? Math.max(40, MAX_PER_ROUND - penalty) : 0;

    total += points;
    results.push(points);
    score.set(total);

    btn.classList.add(chosen.correct ? 'option--right' : 'option--wrong');
    pipEls[idx].classList.add(chosen.correct
      ? (points >= MAX_PER_ROUND ? 'pip--full' : 'pip--part')
      : 'pip--miss');

    if (chosen.correct) {
      audio.sfx.hit();
      waveFrom(btn, 'var(--lime)');
      floatGain(btn, `+${points}`);
      comm.say('commentary.dailyRight', 'good');
    } else {
      audio.sfx.miss();
      quake(0.7);
      comm.say('commentary.dailyWrong', 'bad');
      [...opts.children].forEach((b, i) => {
        if (r.options[i].correct) b.classList.add('option--right');
      });
    }

    const note = revealNote(r);
    if (note) {
      const n = el('p', 'qcard__note dim', note);
      btn.closest('.qcard').appendChild(n);
      replay(n, 'anim-rise');
    }

    setTimeout(() => {
      idx += 1;
      if (idx >= rounds.length) finish();
      else renderRound();
    }, 1700);
  }

  function revealNote(r) {
    if (r.type === 'teammates') {
      const team = r.reveal.team;
      return team
        ? t('daily.wereTeammates', { team: team.name, season: team.season })
        : t('daily.notTeammates');
    }
    const team = r.reveal.team;
    if (!team) return null;
    return t('daily.wasTeam', { team: team.name, season: team.season });
  }

  /* ---------------- fine ---------------- */

  function finish() {
    audio.sfx.whistle();
    comm.say('commentary.dailyEnd');

    const prev = store.get('daily');
    let streak = prev.streak || 0;
    let streakNote;
    if (prev.lastDay === yesterdayKey()) { streak += 1; streakNote = 'daily.streakNow'; }
    else if (!prev.lastDay) { streak = 1; streakNote = 'daily.streakStart'; }
    else { streak = 1; streakNote = 'daily.streakLost'; }

    store.save({
      daily: { lastDay: day, lastScore: total, streak, results: { [day]: results } },
      coins: (store.get('coins') || 0) + Math.round(total / 10),
    });

    showResults(streak, streakNote);
  }

  function shareText(streak) {
    const grid = results.map(squareFor).join('');
    const date = new Date().toLocaleDateString(lang() === 'it' ? 'it-IT' : 'en-GB',
      { day: '2-digit', month: '2-digit' });
    return `NOVANTA · ${date}\n${grid}  ${total}\n${t('hub.streak')} ${streak}\n${location.origin}`;
  }

  function showResults(streak, streakNote) {
    const body = el('div', 'result');
    const grid = el('p', 'sharegrid', results.map(squareFor).join(' '));
    body.append(grid);

    const row = el('div', 'result__stats');
    row.append(
      stat(t('daily.total'), total, 'good'),
      stat(t('hub.streak'), streak),
      stat(t('common.coins'), `+${Math.round(total / 10)}`, 'warn'),
    );
    body.append(row, el('p', 'result__line dim', t(streakNote, { n: streak })));

    const next = el('p', 'result__line dim');
    const tick = () => { next.textContent = t('daily.nextIn', { t: hhmmss(msToNextDay()) }); };
    tick();
    clock = setInterval(tick, 1000);
    body.appendChild(next);

    sheet({
      title: t('daily.done'),
      body,
      dismissable: false,
      actions: [
        {
          label: t('daily.shareCta'),
          variant: 'btn--go',
          onClick: async (close, btn) => {
            const res = await copyOrShare(shareText(streak));
            if (res !== 'copied' && res !== 'shared') return;
            comm.say('daily.shared');
            if (!btn) return;
            const was = btn.textContent;
            btn.textContent = t('common.copied');
            setTimeout(() => { btn.textContent = was; }, 1600);
          },
        },
        {
          label: t('hub.squadTitle'),
          variant: 'btn--ghost',
          onClick: (close) => { close(); go('squad'); },
        },
        { label: t('common.back'), variant: 'btn--ghost', onClick: (close) => { close(); go('hub'); } },
      ],
    });
  }

  function showAlreadyPlayed() {
    const box = el('div', 'card halftone misreg card--print soon anim-rise');
    const s = store.get('daily');
    const gridRow = (s.results && s.results[day]) || [];
    box.append(
      el('h3', 'display t-xxl', t('daily.alreadyPlayed')),
      el('p', 'sharegrid', gridRow.map(squareFor).join(' ')),
      el('p', 'dim', t('daily.yourScore', { n: s.lastScore || 0 })),
    );
    const next = el('p', 'label');
    const tick = () => { next.textContent = t('daily.nextIn', { t: hhmmss(msToNextDay()) }); };
    tick();
    clock = setInterval(tick, 1000);
    box.appendChild(next);

    const cta = el('button', 'btn btn--go', t('hub.squadTitle'));
    cta.type = 'button';
    cta.addEventListener('click', () => go('squad'));
    box.appendChild(cta);
    stage.appendChild(box);
    score.set(s.lastScore || 0);
  }

  return () => {
    clearInterval(clock);
    comm.destroy();
    document.querySelectorAll('.sheet').forEach((x) => x.remove());
  };
}
