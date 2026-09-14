/* IMPOSTORE — da tre a dieci persone, un telefono solo.
   Tutti vedono il nome di un giocatore tranne uno, che vede solo un indizio
   vago. A turno ognuno dice una parola sul giocatore; l'impostore deve
   bluffare. Quando il gruppo è pronto, si vota chi espellere. */

import { t } from '../core/i18n.js';
import * as store from '../core/storage.js';
import * as audio from '../core/audio.js';
import { go } from '../core/router.js';
import { el, topbar, sheet } from '../ui/components.js';
import { replay, waveFrom, quake, stagger } from '../ui/motion.js';
import { ensureFlagFont, nationTag } from '../ui/flags.js';
import { loadIndex } from '../players/data.js';
import { kitNode } from '../players/infobox.js';
import { roleName } from '../players/terms.js';
import { roster } from '../ui/roster.js';
import * as ads from '../ads/adapter.js';

const POOLS = { famous: 65, all: 42 };

let cluesPromise = null;
function loadClues() {
  if (!cluesPromise) cluesPromise = fetch('data/players/clues.json').then((r) => r.json());
  return cluesPromise;
}

function shuffle(list) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* un indizio su tanti, preferendo quelli più vaghi */
const WEIGHT = { club: 3, decade: 2, confed: 2, role: 1, win: 2, trait: 2 };
function pickClue(list) {
  const pool = list.flatMap((c) => Array(WEIGHT[c.split(':')[0]] || 1).fill(c));
  return pool[Math.floor(Math.random() * pool.length)];
}

export async function mount(host) {
  ensureFlagFont();
  const shell = el('div', 'shell impostore');
  const bar = topbar({ title: t('impostore.title'), onExit: () => go('hub') });
  shell.appendChild(bar.el);
  host.appendChild(shell);

  const [data, clues] = await Promise.all([loadIndex(), loadClues()]);

  /* ---------------- testo di un indizio ---------------- */

  function clueNode(code) {
    const [kind, value] = code.split(':');
    const wrap = el('span', 'clue');
    if (kind === 'club') {
      const c = data.clubs[+value];
      wrap.append(kitNode(c.colors), el('span', '', c.name));
      return wrap;
    }
    if (kind === 'decade') {
      const d = +value;
      wrap.textContent = d < 2000 ? t('impostore.clue.decadeOld', { yy: String(d).slice(2) }) : t('impostore.clue.decadeNew', { yyyy: d });
      return wrap;
    }
    wrap.textContent = t(`impostore.clue.${kind}.${value}`);
    return wrap;
  }

  /* ================================================================ */
  /* impostazione                                                       */
  /* ================================================================ */

  let party = null;
  let scores = new Map();
  let level = store.get('impostore.level') || 'famous';

  function renderSetup() {
    shell.textContent = '';
    shell.appendChild(bar.el);
    const box = el('div', 'imp__intro card halftone misreg card--print anim-rise');
    box.style.setProperty('--misreg-color', 'var(--flare)');
    box.append(
      el('h3', 'display t-xxl', t('impostore.title')),
      el('p', 'imp__lead', t('impostore.intro')),
    );
    const how = el('ol', 'imp__how');
    ['how1', 'how2', 'how3', 'how4'].forEach((k) => how.appendChild(el('li', '', t(`impostore.${k}`))));
    box.appendChild(how);

    const levels = el('div', 'chi__levels');
    Object.keys(POOLS).forEach((key) => {
      const b = el('button', `chip chi__level${key === level ? ' is-on' : ''}`, t(`impostore.level.${key}`));
      b.type = 'button';
      b.addEventListener('click', () => {
        level = key;
        store.save({ impostore: { level } });
        levels.querySelectorAll('.chi__level').forEach((n) => n.classList.toggle('is-on', n === b));
      });
      levels.appendChild(b);
    });

    const r = roster({ min: 3, max: 10, key: 'party' });
    const startBtn = el('button', 'btn btn--go btn--lg btn--block', t('impostore.start'));
    startBtn.type = 'button';
    startBtn.addEventListener('click', () => {
      party = r.names();
      scores = new Map(party.map((n) => [n, 0]));
      audio.sfx.whistle();
      newRound();
    });
    box.append(el('h4', 'label imp__label', t('impostore.pool')), levels, el('h4', 'label imp__label', t('impostore.players')), r.el, startBtn);
    shell.appendChild(box);
  }

  /* ================================================================ */
  /* round                                                              */
  /* ================================================================ */

  let round = null;

  function newRound() {
    const min = POOLS[level];
    const recent = new Set(store.get('impostore.recent') || []);
    const pool = data.players.filter((p) => p.fame >= min && clues[p.id] && clues[p.id].length >= 3);
    const fresh = pool.filter((p) => !recent.has(p.id));
    const list = fresh.length ? fresh : pool;
    const secret = list[Math.floor(Math.random() * list.length)];
    store.save({ impostore: { recent: [...recent, secret.id].slice(-120), rounds: (store.get('impostore.rounds') || 0) + 1 } });

    const people = party.map((name) => ({ name, alive: true }));
    const impostor = Math.floor(Math.random() * people.length);
    round = {
      secret,
      clue: pickClue(clues[secret.id]),
      people,
      impostor,
      revealOrder: shuffle(people.map((_, i) => i)),
      speakOrder: [],
      speaker: 0,
      turns: 0,
    };
    revealStep(0);
  }

  /* ---------------- scopri il tuo ruolo, uno alla volta ---------------- */

  function revealStep(k) {
    shell.textContent = '';
    shell.appendChild(bar.el);
    if (k >= round.revealOrder.length) { startDiscussion(); return; }
    const who = round.revealOrder[k];
    const person = round.people[who];

    const screen = el('div', 'imp__reveal');
    const step = el('p', 'label imp__step', t('impostore.step', { n: k + 1, tot: round.revealOrder.length }));
    const name = el('h2', 'imp__name display', person.name);
    const note = el('p', 'imp__note', t('impostore.onlyYou', { name: person.name }));
    const btn = el('button', 'btn btn--go btn--lg', t('impostore.discover'));
    btn.type = 'button';
    screen.append(step, name, note, btn);
    shell.appendChild(screen);
    replay(screen, 'anim-rise');

    btn.addEventListener('click', () => {
      audio.sfx.tick();
      screen.textContent = '';
      const isImpostor = who === round.impostor;
      const card = el('div', `role-card ${isImpostor ? 'role-card--impostor' : 'role-card--innocent'}`);
      card.appendChild(el('p', 'label', person.name));
      if (isImpostor) {
        card.append(
          el('h3', 'role-card__title display', t('impostore.youImpostor')),
          el('p', 'role-card__hint label', t('impostore.clueLabel')),
        );
        const clue = clueNode(round.clue);
        clue.classList.add('role-card__clue', 'display');
        card.appendChild(clue);
        card.appendChild(el('p', 'role-card__note', t('impostore.impostorNote')));
        quake(0.4);
      } else {
        card.append(
          el('h3', 'role-card__title display', t('impostore.youInnocent')),
          el('p', 'role-card__hint label', t('impostore.playerLabel')),
          el('strong', 'role-card__player display', round.secret.label),
        );
        const meta = el('div', 'role-card__meta');
        meta.append(el('span', '', roleName(round.secret.role)), nationTag(round.secret.nation));
        card.append(meta, el('p', 'role-card__note', t('impostore.innocentNote')));
      }
      const last = k === round.revealOrder.length - 1;
      const hide = el('button', 'btn btn--ghost btn--lg', last ? t('impostore.hideStart') : t('impostore.hideNext', { name: round.people[round.revealOrder[k + 1]].name }));
      hide.type = 'button';
      hide.addEventListener('click', () => { audio.sfx.tick(); revealStep(k + 1); });
      screen.append(card, hide);
      replay(card, 'anim-snap');
    });
  }

  /* ---------------- una parola a testa ---------------- */

  function startDiscussion() {
    const alive = round.people.map((p, i) => (p.alive ? i : -1)).filter((i) => i >= 0);
    round.speakOrder = shuffle(alive);
    round.speaker = 0;
    renderDiscussion();
  }

  function renderDiscussion(message = null) {
    shell.textContent = '';
    shell.appendChild(bar.el);
    const screen = el('div', 'imp__talk');

    if (message) {
      const m = el('div', 'imp__message card');
      m.textContent = message;
      screen.appendChild(m);
      replay(m, 'anim-snap');
    }

    const current = round.speakOrder[round.speaker % round.speakOrder.length];
    const next = round.speakOrder[(round.speaker + 1) % round.speakOrder.length];
    const now = el('div', 'imp__now');
    now.append(
      el('p', 'label', t('impostore.speaks')),
      el('h2', 'imp__speaker display', round.people[current].name),
      el('p', 'imp__note', t('impostore.oneWord')),
      el('p', 'label imp__nextup', t('impostore.after', { name: round.people[next].name })),
    );
    screen.appendChild(now);

    const list = el('ol', 'imp__order');
    round.speakOrder.forEach((i, pos) => {
      const li = el('li', `${i === current ? 'is-now' : ''}`);
      li.append(el('span', 'imp__pos num', String(pos + 1)), el('span', '', round.people[i].name));
      list.appendChild(li);
    });
    const out = round.people.filter((p) => !p.alive);
    screen.appendChild(list);
    if (out.length) {
      const gone = el('p', 'imp__gone label', `${t('impostore.expelledList')}: ${out.map((p) => p.name).join(', ')}`);
      screen.appendChild(gone);
    }

    const actions = el('div', 'imp__actions');
    const pass = el('button', 'btn btn--ghost btn--lg', t('impostore.pass'));
    pass.type = 'button';
    pass.addEventListener('click', () => {
      audio.sfx.tick();
      round.speaker += 1;
      round.turns += 1;
      renderDiscussion();
    });
    const vote = el('button', 'btn btn--go btn--lg', t('impostore.vote'));
    vote.type = 'button';
    vote.addEventListener('click', () => { audio.sfx.whistle(); renderVote(); });
    actions.append(pass, vote);
    screen.appendChild(actions);

    shell.appendChild(screen);
    replay(now, 'anim-rise');
  }

  /* ---------------- votazione ---------------- */

  function renderVote() {
    shell.textContent = '';
    shell.appendChild(bar.el);
    const screen = el('div', 'imp__vote');
    screen.append(
      el('h3', 'display t-xl', t('impostore.voteTitle')),
      el('p', 'imp__note', t('impostore.voteNote')),
    );
    const grid = el('div', 'imp__grid');
    let chosen = null;
    const confirm = el('button', 'btn btn--go btn--lg btn--block', t('impostore.expelPick'));
    confirm.type = 'button';
    confirm.disabled = true;

    round.people.forEach((p, i) => {
      if (!p.alive) return;
      const b = el('button', 'vote', p.name);
      b.type = 'button';
      b.addEventListener('click', () => {
        chosen = i;
        grid.querySelectorAll('.vote').forEach((n) => n.classList.toggle('is-on', n === b));
        confirm.disabled = false;
        confirm.textContent = t('impostore.expel', { name: p.name });
        audio.sfx.tick();
      });
      grid.appendChild(b);
    });
    stagger(grid.children, 'anim-rise', 40);

    const back = el('button', 'btn btn--ghost btn--block', t('impostore.backToTalk'));
    back.type = 'button';
    back.addEventListener('click', () => renderDiscussion());
    confirm.addEventListener('click', () => { if (chosen !== null) expel(chosen); });

    screen.append(grid, confirm, back);
    shell.appendChild(screen);
  }

  function expel(i) {
    const person = round.people[i];
    person.alive = false;

    if (i === round.impostor) {
      audio.sfx.goal();
      round.people.forEach((p, k) => { if (k !== round.impostor && p.alive) scores.set(p.name, (scores.get(p.name) || 0) + 1); });
      endRound(true);
      return;
    }

    audio.sfx.miss();
    quake(0.7);
    const alive = round.people.filter((p) => p.alive);
    if (alive.length <= 2) {
      const imp = round.people[round.impostor];
      scores.set(imp.name, (scores.get(imp.name) || 0) + 2);
      endRound(false, person.name);
      return;
    }
    /* il gioco continua, senza chi è appena uscito */
    const message = t('impostore.wrongExpel', { name: person.name });
    const alivers = round.people.map((p, k) => (p.alive ? k : -1)).filter((k) => k >= 0);
    round.speakOrder = shuffle(alivers);
    round.speaker = 0;
    renderDiscussion(message);
  }

  function endRound(caught, lastWrong = null) {
    const imp = round.people[round.impostor];
    shell.textContent = '';
    shell.appendChild(bar.el);
    const screen = el('div', 'imp__end');
    const verdict = el('div', `imp__verdict card ${caught ? 'imp__verdict--win' : 'imp__verdict--lose'}`);
    if (lastWrong) verdict.appendChild(el('p', 'imp__note', t('impostore.wrongExpel', { name: lastWrong })));
    verdict.append(
      el('p', 'label', caught ? t('impostore.innocentsWin') : t('impostore.impostorWins')),
      el('h2', 'display t-xxl', t('impostore.wasImpostor', { name: imp.name })),
      el('p', 'label imp__label', t('impostore.theClue')),
    );
    const clue = clueNode(round.clue);
    clue.classList.add('imp__clue');
    verdict.appendChild(clue);
    verdict.appendChild(el('p', 'label imp__label', t('impostore.thePlayer')));
    const pl = el('div', 'imp__player');
    pl.append(el('strong', 'display t-xl', round.secret.label), nationTag(round.secret.nation));
    verdict.appendChild(pl);
    screen.appendChild(verdict);
    replay(verdict, 'anim-snap');
    waveFrom(verdict, caught ? 'var(--lime)' : 'var(--flare)');

    const table = el('ol', 'imp__scores');
    [...scores.entries()].sort((a, b) => b[1] - a[1]).forEach(([name, pts]) => {
      const li = el('li');
      li.append(el('span', '', name), el('strong', 'num', t('impostore.pts', { n: pts })));
      table.appendChild(li);
    });
    screen.append(el('h4', 'label imp__label', t('impostore.standings')), table);

    const actions = el('div', 'imp__actions');
    const again = el('button', 'btn btn--go btn--lg', t('impostore.newRound'));
    again.type = 'button';
    again.addEventListener('click', async () => { await ads.interstitial('impostore-round', 3); newRound(); });
    const change = el('button', 'btn btn--ghost btn--lg', t('impostore.changePlayers'));
    change.type = 'button';
    change.addEventListener('click', renderSetup);
    actions.append(again, change);
    screen.appendChild(actions);
    shell.appendChild(screen);
  }

  renderSetup();

  return () => {
    document.querySelectorAll('.sheet').forEach((x) => x.remove());
  };
}
