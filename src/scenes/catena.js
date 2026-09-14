/* CATENA — squadra, giocatore, squadra, giocatore.
   Parte una squadra: si nomina qualcuno che ci ha giocato almeno una partita.
   Quel giocatore va al centro: si nomina un'altra squadra in cui ha giocato.
   Nessuna squadra e nessun giocatore si ripete. Quaranta secondi a mossa.
   Da soli si fa il record; in gruppo ci si passa il telefono e chi resta
   senza risposta esce. */

import { t } from '../core/i18n.js';
import * as store from '../core/storage.js';
import * as audio from '../core/audio.js';
import { go } from '../core/router.js';
import { el, topbar, sheet, stat } from '../ui/components.js';
import { createCommentary } from '../ui/commentary.js';
import { quake, replay, waveFrom, floatGain, shake } from '../ui/motion.js';
import { searchBox, buildSearchIndex } from '../ui/search.js';
import { ensureFlagFont, flagEmoji, countryName, nationTag } from '../ui/flags.js';
import { loadIndex } from '../players/data.js';
import { kitNode } from '../players/infobox.js';
import { roleShort, roleName } from '../players/terms.js';
import { roster, handoff } from '../ui/roster.js';
import { onHidden } from '../core/visibility.js';
import { shareAction } from '../ui/share.js';
import * as ads from '../ads/adapter.js';

const TURN_MS = 40_000;
const PENALTY_MS = 5_000;
const MIN_START_PLAYERS = 40;

function playerHit(p) {
  const row = el('div', `hit role--${p.role}`);
  row.appendChild(el('span', 'hit__role', roleShort(p.role)));
  const main = el('span', 'hit__main');
  const f = flagEmoji(p.nation);
  main.append(el('span', 'hit__name', p.label), el('span', 'hit__meta', `${f ? `${f} ` : ''}${countryName(p.nation)} · ${p.birthYear}`));
  row.appendChild(main);
  return row;
}

function clubHit(c) {
  const row = el('div', 'hit');
  const k = kitNode(c.colors);
  k.classList.add('hit__kit');
  row.appendChild(k);
  const main = el('span', 'hit__main');
  main.appendChild(el('span', 'hit__name', c.name));
  row.appendChild(main);
  return row;
}

/* anello del tempo */
function ringTimer() {
  const wrap = el('div', 'ring');
  wrap.innerHTML = `<svg viewBox="0 0 64 64" aria-hidden="true">
    <circle class="ring__track" cx="32" cy="32" r="28" fill="none" stroke-width="6"/>
    <circle class="ring__arc" cx="32" cy="32" r="28" fill="none" stroke-width="6" stroke-linecap="round"
      stroke-dasharray="175.93" stroke-dashoffset="0"/></svg>`;
  const n = el('span', 'ring__n num', '40');
  wrap.appendChild(n);
  const arc = wrap.querySelector('.ring__arc');
  return {
    el: wrap,
    set(ms, total) {
      const frac = Math.max(0, Math.min(1, ms / total));
      arc.style.strokeDashoffset = String(175.93 * (1 - frac));
      n.textContent = String(Math.ceil(ms / 1000));
      wrap.classList.toggle('ring--warn', ms <= 15000 && ms > 7000);
      wrap.classList.toggle('ring--urgent', ms <= 7000);
    },
  };
}

export async function mount(host) {
  ensureFlagFont();
  const shell = el('div', 'shell catena');
  const bar = topbar({ title: t('catena.title'), onExit: () => go('hub') });
  shell.appendChild(bar.el);
  host.appendChild(shell);

  const data = await loadIndex();
  const clubsWithPlayers = data.clubs.filter((c) => (data.clubPlayers.get(c.id) || []).length > 0)
    .map((c) => ({ ...c, label: c.name, weight: Math.min(99, (data.clubPlayers.get(c.id) || []).length) }));
  const playerIndex = buildSearchIndex(data.players);
  const clubIndex = buildSearchIndex(clubsWithPlayers);

  const comm = createCommentary();
  let raf = null;
  let teardownVisibility = null;

  /* ================================================================ */
  /* impostazione                                                       */
  /* ================================================================ */

  function renderSetup() {
    const box = el('div', 'catena__intro card halftone misreg card--print anim-rise');
    box.style.setProperty('--misreg-color', 'var(--flare)');
    box.append(
      el('h3', 'display t-xxl', t('catena.title')),
      el('p', 'catena__lead', t('catena.intro')),
      el('p', 'dim', t('catena.rules')),
    );

    const solo = el('button', 'btn btn--go btn--lg btn--block', t('catena.solo'));
    solo.type = 'button';
    solo.addEventListener('click', () => { audio.sfx.whistle(); start([t('catena.you')], false); });

    const partyTitle = el('h4', 'label catena__party', t('catena.party'));
    const r = roster({ min: 2, max: 10, key: 'party' });
    const group = el('button', 'btn btn--ghost btn--lg btn--block', t('catena.startParty'));
    group.type = 'button';
    group.addEventListener('click', () => { audio.sfx.whistle(); start(r.names(), true); });

    box.append(solo, partyTitle, r.el, group);
    shell.appendChild(box);
  }

  /* ================================================================ */
  /* partita                                                            */
  /* ================================================================ */

  function start(names, party) {
    shell.textContent = '';
    shell.appendChild(bar.el);
    shell.classList.toggle('catena--solo', !party);

    const people = names.map((name, i) => ({ id: i, name, alive: true, score: 0 }));
    const usedPlayers = new Set();
    const usedClubs = new Set();
    const chain = [];
    let turn = 0;
    let phase = 'player';            // cosa va scritto adesso
    let current = null;              // squadra o giocatore al centro
    let deadline = 0;
    let remaining = TURN_MS;
    let running = false;
    let lastSecond = 40;
    let over = false;

    /* partenza: una squadra con abbastanza giocatori nel catalogo. Il catalogo
       ora arriva fino alle serie minori: le squadre più rappresentate escono
       più spesso, così si parte più volentieri da un Milan che da uno Swindon */
    const starters = clubsWithPlayers.filter((c) => (data.clubPlayers.get(c.id) || []).length >= MIN_START_PLAYERS);
    const weights = starters.map((c) => (data.clubPlayers.get(c.id) || []).length ** 1.5);
    let roll = Math.random() * weights.reduce((a, b) => a + b, 0);
    let startIdx = 0;
    while (startIdx < starters.length - 1 && roll >= weights[startIdx]) { roll -= weights[startIdx]; startIdx += 1; }
    current = { kind: 'club', club: starters[startIdx] };
    usedClubs.add(current.club.id);
    chain.push(current);

    /* ---- testata dei turni ---- */
    const turnBar = el('div', 'catena__turns');
    const nowBox = el('div', 'turn turn--now');
    const nextBox = el('div', 'turn turn--next');
    turnBar.append(nowBox, nextBox);
    const ring = ringTimer();
    const head = el('div', 'catena__head');
    head.append(turnBar, ring.el);

    const scoreBox = el('div', 'squad__scores');
    const scoreN = el('strong', 'arcade__score display num', '0');
    const bestBox = el('div', 'squad__best');
    bestBox.append(el('span', 'label', t('common.best')), el('strong', 'num', String(store.get('catena.best') || 0)));
    scoreBox.append(scoreN, bestBox);
    if (!party) bar.slot.appendChild(scoreBox);

    const stage = el('div', 'catena__stage');
    const prompt = el('p', 'catena__prompt label');
    const search = searchBox({
      placeholder: '', index: playerIndex, render: playerHit, onPick: (item) => answer(item),
    });
    const trail = el('div', 'catena__trail');
    const alive = el('div', 'catena__alive');

    shell.append(head, stage, prompt, search.el, comm.el, trail, alive);

    function paintTurns() {
      if (!party) {
        /* da soli il conteggio sta già in alto: qui resta solo il tempo */
        nowBox.hidden = true;
        nextBox.hidden = true;
        scoreN.textContent = String(chain.length - 1);
        replay(scoreN, 'anim-snap');
        return;
      }
      const me = people[turn];
      const nxt = nextAlive(turn);
      nowBox.innerHTML = '';
      nowBox.append(el('span', 'label', t('catena.turnNow')), el('strong', 'turn__name display', me.name));
      nextBox.innerHTML = '';
      nextBox.append(el('span', 'label', t('catena.turnNext')), el('strong', 'turn__name', nxt === turn ? '—' : people[nxt].name));
      alive.textContent = '';
      people.forEach((p) => {
        const chip = el('span', `pchip${p.alive ? '' : ' pchip--out'}${p.id === turn ? ' pchip--now' : ''}`);
        chip.append(el('span', '', p.name), el('strong', 'num', String(p.score)));
        alive.appendChild(chip);
      });
    }

    function nextAlive(from) {
      for (let k = 1; k <= people.length; k++) {
        const i = (from + k) % people.length;
        if (people[i].alive) return i;
      }
      return from;
    }

    function nodeCard(node, big = true) {
      const card = el('div', `node node--${node.kind}${big ? ' node--big' : ''}`);
      if (node.kind === 'club') {
        const c = node.club;
        const stripes = el('div', 'node__stripes');
        (c.colors.length ? c.colors : ['#8B8779']).forEach((col) => { const s = el('i'); s.style.background = col; stripes.appendChild(s); });
        card.style.setProperty('--node-c', c.colors[0] || '#8B8779');
        card.append(stripes, el('span', 'node__kicker label', t('catena.club')), el('strong', 'node__name display', c.name));
      } else {
        const p = node.player;
        card.classList.add(`role--${p.role}`);
        card.style.setProperty('--node-c', 'var(--role-c)');
        const meta = el('div', 'node__meta');
        const role = el('span', 'hit__role', roleShort(p.role));
        meta.append(role, el('span', 'node__role', roleName(p.role)), nationTag(p.nation));
        card.append(el('span', 'node__kicker label', t('catena.player')), el('strong', 'node__name display', p.label), meta);
      }
      return card;
    }

    function paintStage(animateFrom = null) {
      const card = nodeCard(current);
      stage.textContent = '';
      stage.appendChild(card);
      if (animateFrom) {
        /* il nome scelto parte dalla barra e vola al centro */
        const to = card.getBoundingClientRect();
        const dx = animateFrom.left + animateFrom.width / 2 - (to.left + to.width / 2);
        const dy = animateFrom.top + animateFrom.height / 2 - (to.top + to.height / 2);
        card.animate([
          { transform: `translate(${dx}px, ${dy}px) scale(0.55)`, opacity: 0.4 },
          { transform: 'translate(0,0) scale(1.06)', opacity: 1, offset: 0.75 },
          { transform: 'none', opacity: 1 },
        ], { duration: 520, easing: 'cubic-bezier(0.18,1.12,0.42,1)' });
      } else {
        replay(card, 'anim-snap');
      }
      if (phase === 'player') {
        prompt.textContent = t('catena.askPlayer', { club: current.club.name });
        search.setIndex(playerIndex, null);
        search.input.placeholder = t('catena.placeholderPlayer');
      } else {
        prompt.textContent = t('catena.askClub', { player: current.player.label });
        search.setIndex(clubIndex, null);
        search.input.placeholder = t('catena.placeholderClub');
      }
      search.clear();
    }

    function paintTrail() {
      trail.textContent = '';
      chain.slice(0, -1).reverse().forEach((node) => {
        const chip = el('span', `tchip tchip--${node.kind}`);
        if (node.kind === 'club') chip.append(kitNode(node.club.colors), el('span', '', node.club.name));
        else {
          const f = flagEmoji(node.player.nation);
          chip.append(el('span', 'flag', f || ''), el('span', '', node.player.label));
        }
        trail.appendChild(chip);
      });
    }

    /* ---- fine della catena: niente più mosse possibili ---- */
    function exhausted() {
      if (phase === 'player') {
        const ids = data.clubPlayers.get(current.club.id) || [];
        return ids.every((id) => usedPlayers.has(id));
      }
      return current.player.clubs.every((c) => usedClubs.has(c));
    }

    /* ---- tempo ---- */
    function tick(now) {
      raf = requestAnimationFrame(tick);
      if (!running) return;
      remaining = Math.max(0, deadline - now);
      ring.set(remaining, TURN_MS);
      const s = Math.ceil(remaining / 1000);
      if (s !== lastSecond) {
        lastSecond = s;
        if (s <= 5 && s > 0) audio.sfx.urgent();
      }
      if (remaining <= 0) timeUp();
    }

    function startClock() {
      deadline = performance.now() + TURN_MS;
      remaining = TURN_MS;
      lastSecond = 40;
      running = true;
      search.setDisabled(false);
      if (matchMedia('(pointer: fine)').matches) search.focus();
      if (!raf) raf = requestAnimationFrame(tick);
    }

    teardownVisibility = onHidden({
      pause: () => { if (!running) return false; running = false; remaining = Math.max(0, deadline - performance.now()); return true; },
      resume: () => { deadline = performance.now() + remaining; running = true; },
    });

    async function beginTurn(first = false) {
      running = false;
      search.setDisabled(true);
      paintTurns();
      paintStage();
      if (exhausted()) { finish(phase === 'player' ? 'noPlayers' : 'noClubs'); return; }
      if (party) {
        await handoff({
          name: people[turn].name,
          note: phase === 'player' ? t('catena.handoffClub', { club: current.club.name }) : t('catena.askClub', { player: current.player.label }),
          action: t('party.ready'),
        });
      } else if (first) {
        comm.say('commentary.catenaStart');
      }
      if (over) return;
      startClock();
    }

    function answer(item) {
      if (!running || over) return;
      const from = search.el.getBoundingClientRect();

      if (phase === 'player') {
        const p = item;
        if (usedPlayers.has(p.id)) return wrong('catena.used');
        if (!p.clubs.includes(current.club.id)) return wrong('catena.notThere', { player: p.label, club: current.club.name });
        usedPlayers.add(p.id);
        current = { kind: 'player', player: p };
        phase = 'club';
      } else {
        const c = item;
        if (usedClubs.has(c.id)) return wrong('catena.used');
        if (!current.player.clubs.includes(c.id)) return wrong('catena.notThere', { player: current.player.label, club: c.name });
        usedClubs.add(c.id);
        current = { kind: 'club', club: c };
        phase = 'player';
      }

      running = false;
      chain.push(current);
      people[turn].score += 1;
      audio.sfx.hit();
      floatGain(ring.el, '+1');
      comm.say('commentary.catenaRight', 'good');
      paintTrail();
      paintTurns();
      paintStage(from);
      waveFrom(stage.firstElementChild, 'var(--lime)');

      if (!party) {
        const best = store.get('catena.best') || 0;
        if (chain.length - 1 > best) bestBox.querySelector('strong').textContent = String(chain.length - 1);
      }
      if (party) turn = nextAlive(turn);
      setTimeout(() => beginTurn(), party ? 700 : 350);
    }

    function wrong(key, params) {
      audio.sfx.miss();
      shake(search.el);
      deadline -= PENALTY_MS;
      floatGain(ring.el, '−5s', 'var(--flare)');
      comm.say(key === 'catena.used' ? 'commentary.catenaUsed' : 'commentary.catenaWrong', 'bad');
      prompt.textContent = t(key, params);
      prompt.classList.add('catena__prompt--bad');
      setTimeout(() => {
        prompt.classList.remove('catena__prompt--bad');
        if (!over) prompt.textContent = phase === 'player'
          ? t('catena.askPlayer', { club: current.club.name })
          : t('catena.askClub', { player: current.player.label });
      }, 1600);
    }

    function timeUp() {
      running = false;
      search.setDisabled(true);
      audio.sfx.over();
      quake(0.8);
      if (!party) { finish('time'); return; }
      people[turn].alive = false;
      comm.say('commentary.catenaOut', 'bad');
      const left = people.filter((p) => p.alive);
      if (left.length <= 1) { finish('lastStanding'); return; }
      const out = people[turn];
      turn = nextAlive(turn);
      sheet({
        title: t('catena.eliminated', { name: out.name }),
        body: el('p', 'result__line', t('catena.eliminatedNote')),
        dismissable: false,
        actions: [{ label: t('catena.continue'), variant: 'btn--go', onClick: (close) => { close(); beginTurn(); } }],
      });
    }

    function finish(reason) {
      if (over) return;
      over = true;
      running = false;
      cancelAnimationFrame(raf);
      raf = null;
      search.setDisabled(true);
      const links = chain.length - 1;

      const body = el('div', 'result');
      const why = {
        time: t('catena.endTime'),
        noPlayers: t('catena.endNoPlayers', { club: current.kind === 'club' ? current.club.name : '' }),
        noClubs: t('catena.endNoClubs', { player: current.kind === 'player' ? current.player.label : '' }),
        lastStanding: t('catena.endLast'),
      }[reason];
      body.appendChild(el('p', 'result__line', why));

      let title = t('catena.over');
      if (!party) {
        const s = store.load();
        const best = Math.max(s.catena.best || 0, links);
        store.save({ catena: { best, played: (s.catena.played || 0) + 1 }, coins: (s.coins || 0) + links });
        const row = el('div', 'result__stats');
        row.append(stat(t('catena.links'), links, links > (s.catena.best || 0) ? 'good' : null), stat(t('common.best'), best), stat(t('common.coins'), `+${links}`, 'warn'));
        body.appendChild(row);
        if (links > (s.catena.best || 0) && links > 0) { body.appendChild(el('p', 'result__record display t-lg', t('squad.newRecord'))); audio.sfx.record(); }
      } else {
        const ranking = [...people].sort((a, b) => (b.alive - a.alive) || (b.score - a.score));
        const winner = ranking[0];
        title = t('catena.winner', { name: winner.name });
        const list = el('ol', 'catena__rank');
        ranking.forEach((p) => {
          const li = el('li', `${p.alive ? '' : 'is-out'}`);
          li.append(el('span', '', p.name), el('strong', 'num', t('catena.points', { n: p.score })));
          list.appendChild(li);
        });
        body.appendChild(list);
        store.save({ catena: { parties: (store.get('catena.parties') || 0) + 1 } });
        audio.sfx.record();
      }

      sheet({
        title,
        body,
        dismissable: false,
        actions: [
          { label: t('catena.again'), variant: 'btn--go', onClick: async (close) => { close(); await ads.interstitial('catena-restart', 3); go('catena'); } },
          shareAction(() => ({
            mode: t('catena.title'),
            grid: '🔗'.repeat(Math.min(links, 12)),
            rows: [party ? t('catena.winner', { name: [...people].sort((a, b) => (b.alive - a.alive) || (b.score - a.score))[0].name }) : t('catena.shareLinks', { n: links })],
          })),
          { label: t('common.back'), variant: 'btn--ghost', onClick: (c) => { c(); go('hub'); } },
        ],
      });
    }

    paintTrail();
    beginTurn(true);
  }

  renderSetup();

  return () => {
    cancelAnimationFrame(raf);
    if (teardownVisibility) teardownVisibility();
    comm.destroy();
    document.querySelectorAll('.sheet, .handoff').forEach((x) => x.remove());
  };
}
