/* ALLENATORE — la partita dal vivo.
   Il tabellone, la cronaca minuto per minuto, i cambi e la tattica quando
   vuoi, e i momenti chiave che fermano il gioco finché non scegli. */

import { t, tRandom } from '../../core/i18n.js';
import * as audio from '../../core/audio.js';
import { el, crest, sheet } from '../../ui/components.js';
import { tick, decide, adviseMoment, setTactics, substitute, playerRatings, bestBenchFor } from '../../manager/match.js';
import { STYLE_IDS, MENTALITY_IDS, FORMATION_IDS, FORMATIONS } from '../../manager/tactics.js';
import { roleFit } from '../../manager/players.js';
import { button, chip, ovrBadge, roleTag } from './ui.js';

const SPEEDS = [{ id: 1, ms: 650 }, { id: 2, ms: 300 }, { id: 4, ms: 110 }];
const LOUD = new Set(['goal', 'penGoal', 'red', 'secondYellow', 'penalty', 'penSaved', 'penMissed', 'woodwork', 'bigSave', 'bigMiss', 'injury', 'disallowed', 'error']);
const ICON = {
  goal: '⚽', penGoal: '⚽', saved: '🧤', bigSave: '🧤', miss: '↗', bigMiss: '↗', woodwork: '▮', blocked: '▣', yellow: '🟨', red: '🟥', secondYellow: '🟥',
  injury: '✚', sub: '⇄', penalty: '●', penSaved: '🧤', penMissed: '✕', disallowed: '⚑', error: '!', halftime: '⏸', fulltime: '⏹', kickoff: '▶', added: '+', tactic: '▦', decision: '★', extratime: '⏱', shootout: '●',
};

export function mountLive(stage, { match, career, clubName, onSave, onFinish, comp = null }) {
  const userKey = match.user;
  const me = () => match.sides.find((s) => s.key === userKey);
  const pname = (id) => {
    for (const s of match.sides) { const p = s.byId.get(id); if (p) return p.name; }
    return '';
  };
  const short = (id) => pname(id).split(' ').slice(-1)[0];
  let speed = Number(localStorage.getItem('novanta:manager-speed') || 2);
  let timer = null;
  let holdUntil = 0;
  let minutesSinceSave = 0;
  let paused = false;
  let ended = false;

  const root = el('div', `mlive ${comp ? `comp comp--${comp}` : ''}`.trim());
  stage.appendChild(root);

  /* ---------------- tabellone ---------------- */
  const board = el('section', 'mlive__board card');
  const [H, A] = match.sides;
  const team = (s) => {
    const box = el('div', `mlive__team ${s.key === userKey ? 'is-me' : ''}`);
    box.append(crest(career.clubs[s.team.id]?.colors || [], 40), el('strong', 'mlive__tname', s.team.name));
    return box;
  };
  const score = el('div', 'mlive__score');
  const scoreN = el('strong', 'display num mlive__goals', '0–0');
  const clock = el('span', 'mlive__clock label', "0'");
  score.append(scoreN, clock);
  const top = el('div', 'mlive__top');
  top.append(team(H), score, team(A));
  const poss = el('div', 'mlive__poss');
  const possH = el('i', 'mlive__possH');
  poss.appendChild(possH);
  const statsRow = el('div', 'mlive__stats');
  board.append(top, poss, statsRow);

  const scorers = el('div', 'mlive__scorers');
  board.appendChild(scorers);

  /* ---------------- comandi ---------------- */
  const controls = el('div', 'mlive__controls');
  const speedBox = el('div', 'mseg mseg--tight');
  const speedBtns = SPEEDS.map((sp) => {
    const b = el('button', `mseg__b ${speed === sp.id ? 'is-on' : ''}`, `${sp.id}×`);
    b.type = 'button';
    b.addEventListener('click', () => { speed = sp.id; localStorage.setItem('novanta:manager-speed', String(speed)); speedBtns.forEach((x, i) => x.classList.toggle('is-on', SPEEDS[i].id === speed)); restart(); });
    speedBox.appendChild(b);
    return b;
  });
  const tacticsBtn = button(`▦ ${t('allenatore.live.tactics')}`, 'btn--ghost', () => openTactics());
  const skipBtn = button(`⏭ ${t('allenatore.live.skip')}`, 'btn--ghost', () => skipAhead());
  controls.append(speedBox, tacticsBtn, skipBtn);

  const feed = el('ol', 'mlive__feed');
  const pitchBox = el('section', 'mlive__xi card');

  root.append(board, controls, pitchBox, feed);

  /* ---------------- disegno ---------------- */

  function updateBoard() {
    scoreN.textContent = `${H.goals}–${A.goals}`;
    const m = match.minute;
    const reg = [45, 90, 105, 120][Math.min(3, match.period - 1)] || 90;
    clock.textContent = match.finished ? t('allenatore.live.ft') : m > reg ? `${reg}+${m - reg}'` : `${m}'`;
    const total = H.stats.possession + A.stats.possession || 1;
    possH.style.width = `${(H.stats.possession / total) * 100}%`;
    statsRow.innerHTML = '';
    const pair = (label, a, b) => {
      const r = el('div', 'mlive__stat');
      r.append(el('span', 'num', String(a)), el('span', 'label', label), el('span', 'num', String(b)));
      statsRow.appendChild(r);
    };
    pair(t('allenatore.live.possession'), `${Math.round((H.stats.possession / total) * 100)}%`, `${Math.round((A.stats.possession / total) * 100)}%`);
    pair(t('allenatore.live.shots'), `${H.stats.shots} (${H.stats.onTarget})`, `${A.stats.shots} (${A.stats.onTarget})`);
    pair(t('allenatore.live.corners'), H.stats.corners, A.stats.corners);
    pair(t('allenatore.live.cards'), `${H.stats.yellows}/${H.stats.reds}`, `${A.stats.yellows}/${A.stats.reds}`);
    scorers.innerHTML = '';
    for (const s of match.sides) {
      const col = el('div', `mlive__sc mlive__sc--${s.key}`);
      for (const e of match.events.filter((x) => x.side === s.key && ['goal', 'penGoal'].includes(x.type))) col.appendChild(el('span', '', `⚽ ${short(e.player)} ${minuteLabel(e)}${e.type === 'penGoal' ? ` (${t('allenatore.live.penShort')})` : ''}`));
      for (const e of match.events.filter((x) => x.side === s.key && ['red', 'secondYellow'].includes(x.type))) col.appendChild(el('span', '', `🟥 ${short(e.player)} ${minuteLabel(e)}`));
      scorers.appendChild(col);
    }
  }

  function updateXI() {
    pitchBox.innerHTML = '';
    const s = me();
    const head = el('div', 'mlive__xihead');
    head.append(el('span', 'label', `${s.formation} · ${t(`allenatore.styles.${s.style}.name`)} · ${t(`allenatore.mentality.${s.mentality}`)}`), el('span', 'label', t('allenatore.live.subsLeft', { n: s.subsLeft, w: s.windowsLeft })));
    pitchBox.appendChild(head);
    const list = el('div', 'mlive__xilist');
    const ratings = playerRatings(match);
    for (const o of [...s.onPitch].sort((a, b) => s.slots[a.slot].y - s.slots[b.slot].y)) {
      const p = s.byId.get(o.id);
      const ps = match.pstats[o.id] || {};
      const b = el('button', `mlive__pl ${p.fitness < 45 ? 'is-tired' : ''}`);
      b.type = 'button';
      const fit = el('i', `mlive__fit ${p.fitness < 45 ? 'is-low' : p.fitness < 65 ? 'is-mid' : ''}`);
      fit.style.width = `${p.fitness}%`;
      const marks = `${ps.goals ? '⚽'.repeat(ps.goals) : ''}${ps.yellow ? '🟨' : ''}`;
      b.append(roleTag(s.slots[o.slot].role), el('span', 'mlive__pln', `${short(o.id)} ${marks}`), el('span', 'mlive__plr num', (ratings[o.id] ?? 6).toFixed(1)), el('span', 'mlive__fitbar'));
      b.lastChild.appendChild(fit);
      b.addEventListener('click', () => subFor(o.id));
      list.appendChild(b);
    }
    pitchBox.appendChild(list);
  }

  /* minuto con il recupero: 45+2', 90+4' */
  function minuteLabel(e) {
    if (!e.minute) return '';
    const reg = [45, 90, 105, 120][Math.min(3, (e.period || 1) - 1)];
    return e.minute > reg ? `${reg}+${e.minute - reg}'` : `${e.minute}'`;
  }

  function line(e) {
    const vars = { player: e.player ? short(e.player) : '', assist: e.assist ? short(e.assist) : '', keeper: e.keeper ? short(e.keeper) : '', team: e.side ? match.sides.find((s) => s.key === e.side).team.name : '', added: e.added || '', weeks: e.weeks || '', in: e.in ? short(e.in) : '', out: e.out ? short(e.out) : '', home: e.score ? e.score[0] : H.goals, away: e.score ? e.score[1] : A.goals };
    if (e.type === 'tactic') return t('allenatore.live.lines.tactic', { team: vars.team, mentality: t(`allenatore.mentality.${e.mentality}`) });
    if (e.type === 'decision') return t(`allenatore.moments.${e.moment}.done`, vars);
    if (e.type === 'goal' && e.assist) return fillText(tRandom('allenatore.live.lines.goalAssist'), vars);
    const key = `allenatore.live.lines.${e.type}`;
    return fillText(tRandom(key), vars);
  }
  function fillText(s, vars) { return String(s).replace(/\{(\w+)\}/g, (m, k) => (vars[k] !== undefined ? vars[k] : m)); }

  function addFeed(e) {
    if (['chance'].includes(e.type)) return;
    const quiet = ['saved', 'miss', 'blocked', 'yellow'].includes(e.type);
    if (quiet && speed === 4 && e.side !== userKey) return;
    const li = el('li', `mlive__ev mlive__ev--${e.type} ${e.side === userKey ? 'is-me' : e.side ? 'is-them' : ''}`);
    li.append(el('span', 'mlive__min num', minuteLabel(e)), el('span', 'mlive__ico', ICON[e.type] || '·'), el('span', 'mlive__txt', line(e)));
    feed.prepend(li);
    li.animate([{ opacity: 0, transform: 'translateY(-6px)' }, { opacity: 1, transform: 'none' }], { duration: 200 });
    while (feed.children.length > 60) feed.lastChild.remove();
    if (LOUD.has(e.type)) {
      holdUntil = Date.now() + (e.type === 'goal' || e.type === 'penGoal' ? 1400 : 700);
      if (e.type === 'goal' || e.type === 'penGoal') {
        audio.sfx.goal();
        board.classList.remove('is-goal-me', 'is-goal-them');
        void board.offsetWidth;
        board.classList.add(e.side === userKey ? 'is-goal-me' : 'is-goal-them');
        if (navigator.vibrate && e.side === userKey) navigator.vibrate(60);
      } else if (e.type === 'woodwork') audio.sfx.post();
      else if (e.type === 'bigSave' || e.type === 'penSaved') audio.sfx.save();
      else if (e.type === 'red' || e.type === 'secondYellow') audio.sfx.whistle();
    }
    if (e.type === 'halftime' || e.type === 'fulltime') audio.sfx.whistle();
  }

  /* ---------------- il tempo che scorre ---------------- */

  function restart() {
    clearInterval(timer);
    if (ended) return;
    timer = setInterval(loop, SPEEDS.find((s) => s.id === speed).ms);
  }

  function loop() {
    if (paused || ended) return;
    if (Date.now() < holdUntil) return;
    if (match.pending) { showMoment(); return; }
    if (match.finished) { finish(); return; }
    const evs = tick(match);
    evs.forEach(addFeed);
    updateBoard();
    if (evs.some((e) => ['sub', 'yellow', 'red', 'secondYellow', 'injury', 'goal', 'penGoal'].includes(e.type)) || match.minute % 3 === 0) updateXI();
    if (++minutesSinceSave >= 5) { minutesSinceSave = 0; onSave(match); }
    if (match.pending) showMoment();
    if (match.finished) finish();
  }

  function skipAhead() {
    /* corre fino al prossimo momento importante o alla fine */
    let guard = 0;
    while (!match.finished && !match.pending && guard++ < 200) {
      const evs = tick(match);
      evs.forEach(addFeed);
      if (evs.some((e) => e.side === userKey && ['goal', 'penGoal', 'red', 'secondYellow', 'injury'].includes(e.type))) break;
      if (evs.some((e) => e.side && e.side !== userKey && ['goal', 'penGoal', 'red'].includes(e.type))) break;
    }
    holdUntil = 0;
    updateBoard(); updateXI();
    onSave(match);
    if (match.pending) showMoment();
    if (match.finished) finish();
  }

  /* ---------------- momenti chiave ---------------- */

  let momentOpen = false;
  function showMoment() {
    if (momentOpen || !match.pending) return;
    momentOpen = true;
    paused = true;
    audio.sfx.urgent();
    const m = match.pending;
    const ctxVars = momentVars(m);
    const body = el('div', 'mmoment');
    body.append(el('span', 'label', `${minuteLabel(m)} · ${H.team.name} ${H.goals}–${A.goals} ${A.team.name}`), el('p', 'mmoment__d', t(`allenatore.moments.${m.id}.d`, ctxVars)));
    const opts = el('div', 'mmoment__opts');
    const adviceBox = el('p', 'mmoment__advice dim');
    let s;
    m.options.forEach((o) => {
      const b = el('button', `mevent__opt ${o.disabled ? 'is-off' : ''}`);
      b.type = 'button';
      b.disabled = o.disabled;
      if (m.id === 'penalty') {
        const info = m.ctx.takers.find((x) => `taker:${x.id}` === o.id);
        b.append(el('span', 'mevent__l', pname(info.id)), el('span', 'label', `${t('allenatore.attrs.finishing')} ${info.finishing} · ${t('allenatore.attrs.composure')} ${info.composure} · ${t('allenatore.form')} ${info.form > 0 ? '+' : ''}${info.form}`));
      } else {
        b.append(el('span', 'mevent__l', t(`allenatore.moments.${m.id}.o.${o.id}`, ctxVars)));
      }
      b.addEventListener('click', () => {
        const before = match.events.length;
        const outcome = decide(match, o.id);
        s.close();
        momentOpen = false;
        paused = false;
        match.events.slice(before).forEach(addFeed);
        if (outcome === 'good' || outcome === 'bad') toast(t(`allenatore.moments.${m.id}.${outcome}`, ctxVars), outcome);
        updateBoard(); updateXI();
        onSave(match);
        holdUntil = Date.now() + 500;
      });
      opts.appendChild(b);
    });
    const ask = button(`🗣 ${t('allenatore.live.askAssistant')}`, 'btn--ghost btn--block', () => {
      ask.disabled = true;
      const staff = career.flags.staff || 50;
      const adv = adviseMoment(match, 14, 0.45 + staff / 200, career.md + 1);
      const pick = m.options.find((o) => o.id === adv.pick);
      const label = m.id === 'penalty' ? pname(pick.id.split(':')[1]) : t(`allenatore.moments.${m.id}.o.${pick.id}`, ctxVars);
      adviceBox.textContent = t('allenatore.live.assistantSays', { option: label });
    });
    body.append(opts, ask, adviceBox);
    s = sheet({ title: t(`allenatore.moments.${m.id}.t`, ctxVars), body, dismissable: false });
  }

  function momentVars(m) {
    const c = m.ctx || {};
    return {
      player: c.player ? short(c.player) : '', in: c.in ? short(c.in) : '', out: c.out ? short(c.out) : '',
      like: c.like ? short(c.like) : '', attackerIn: c.attackerIn ? short(c.attackerIn) : '', defenderIn: c.defenderIn ? short(c.defenderIn) : '',
      tall: c.tall ? short(c.tall) : '', taker: c.taker ? short(c.taker) : '', opponent: match.sides.find((s) => s.key !== userKey).team.name,
    };
  }

  function toast(text, tone) {
    const n = el('div', `mtoast mtoast--${tone}`, text);
    root.appendChild(n);
    setTimeout(() => n.remove(), 3200);
  }

  /* ---------------- tattica e cambi ---------------- */

  function openTactics() {
    paused = true;
    const s = me();
    const body = el('div', 'stack');
    const men = el('div', 'mseg');
    for (const id of MENTALITY_IDS) {
      const b = el('button', `mseg__b ${s.mentality === id ? 'is-on' : ''}`, t(`allenatore.mentality.${id}`));
      b.type = 'button';
      b.addEventListener('click', () => { setTactics(match, userKey, { mentality: id }); me().locked = true; [...men.children].forEach((x) => x.classList.toggle('is-on', x === b)); addFeed(match.events[match.events.length - 1]); updateXI(); });
      men.appendChild(b);
    }
    const style = el('select', 'mselect');
    for (const id of STYLE_IDS) { const o = el('option', '', t(`allenatore.styles.${id}.name`)); o.value = id; o.selected = s.style === id; style.appendChild(o); }
    style.addEventListener('change', () => { setTactics(match, userKey, { style: style.value }); addFeed(match.events[match.events.length - 1]); updateXI(); });
    const form = el('select', 'mselect');
    for (const id of FORMATION_IDS) { const o = el('option', '', id); o.value = id; o.selected = s.formation === id; form.appendChild(o); }
    form.addEventListener('change', () => { setTactics(match, userKey, { formation: form.value }); addFeed(match.events[match.events.length - 1]); updateXI(); });
    body.append(el('span', 'label', t('allenatore.mentalityLabel')), men, el('span', 'label', t('allenatore.styleLabel')), style, el('span', 'label', t('allenatore.formation')), form, el('p', 'dim', t('allenatore.live.changeCost')));
    sheet({ title: t('allenatore.live.tactics'), body, actions: [{ label: t('allenatore.live.resume'), variant: 'btn--go', onClick: (c) => { c(); paused = false; onSave(match); } }], dismissable: false });
  }

  function subFor(outId) {
    const s = me();
    if (match.finished) return;
    paused = true;
    const o = s.onPitch.find((x) => x.id === outId);
    if (!o) { paused = false; return; }
    const role = s.slots[o.slot].role;
    const body = el('div', 'mpicker');
    const outP = s.byId.get(outId);
    body.appendChild(el('p', 'dim', t('allenatore.live.subOut', { name: outP.name, fitness: Math.round(outP.fitness), subs: s.subsLeft })));
    const best = bestBenchFor(s, role);
    const bench = s.bench.map((id) => s.byId.get(id)).filter(Boolean).sort((a, b) => b.ovr * roleFit(b.role, role, b.extra) - a.ovr * roleFit(a.role, role, a.extra));
    let sh;
    for (const p of bench) {
      const row = el('button', `mprow ${p.id === best ? 'is-sel' : ''} ${p.injury ? 'is-off' : ''}`);
      row.type = 'button';
      row.append(roleTag(p.role), el('span', 'mprow__main'), ovrBadge(p.ovr));
      row.children[1].append(el('strong', 'mprow__name', p.name), el('span', 'mprow__sub label', `${t('allenatore.fit')} ${Math.round(roleFit(p.role, role, p.extra) * 100)}%`));
      row.addEventListener('click', () => {
        if (p.injury) return;
        const ok = substitute(match, userKey, outId, p.id);
        if (!ok) { toast(t('allenatore.live.subDenied'), 'bad'); return; }
        addFeed(match.events[match.events.length - 1]);
        sh.close();
        paused = false;
        updateXI();
        onSave(match);
      });
      body.appendChild(row);
    }
    if (!bench.length || s.subsLeft <= 0) body.appendChild(el('p', 'mstrip__alert', t('allenatore.live.noSubs')));
    sh = sheet({ title: t('allenatore.live.subTitle'), body, actions: [{ label: t('common.cancel'), onClick: (c) => { c(); paused = false; } }], dismissable: false });
  }

  /* ---------------- fischio finale ---------------- */

  function finish() {
    if (ended) return;
    ended = true;
    clearInterval(timer);
    updateBoard(); updateXI();
    const ratings = playerRatings(match);
    const s = me();
    const body = el('div', 'mfinal');
    const res = s.goals > match.sides.find((x) => x !== s).goals ? 'win' : s.goals < match.sides.find((x) => x !== s).goals ? 'loss' : 'draw';
    body.append(el('strong', `display t-xxl num mfinal__score is-${res}`, `${H.goals}–${A.goals}`), el('span', 'display t-lg', t(`allenatore.${res}`)));
    const table = el('div', 'mfinal__stats');
    const row = (label, a, b) => { const r = el('div', 'mlive__stat'); r.append(el('span', 'num', String(a)), el('span', 'label', label), el('span', 'num', String(b))); table.appendChild(r); };
    row(t('allenatore.live.possession'), `${H.stats.possessionPct}%`, `${A.stats.possessionPct}%`);
    row(t('allenatore.stats.shots'), H.stats.shots, A.stats.shots);
    row(t('allenatore.live.onTarget'), H.stats.onTarget, A.stats.onTarget);
    row('xG', H.stats.xg.toFixed(2), A.stats.xg.toFixed(2));
    row(t('allenatore.live.corners'), H.stats.corners, A.stats.corners);
    row(t('allenatore.live.fouls'), H.stats.fouls, A.stats.fouls);
    body.appendChild(table);
    const list = el('div', 'mfinal__ratings');
    const mine = Object.entries(ratings).filter(([id]) => s.byId.has(id)).sort((a, b) => b[1] - a[1]);
    const motm = Object.entries(ratings).sort((a, b) => b[1] - a[1])[0];
    if (motm) body.appendChild(chip(`★ ${t('allenatore.live.motm')}: ${pname(motm[0])} ${motm[1].toFixed(1)}`, 'amber'));
    for (const [id, r] of mine) {
      const p = s.byId.get(id);
      const it = el('div', 'mfinal__r');
      it.append(roleTag(p.role), el('span', '', p.name), el('strong', `num ${r >= 7 ? 'is-hi' : r < 6 ? 'is-lo' : ''}`, r.toFixed(1)));
      list.appendChild(it);
    }
    body.appendChild(list);
    sheet({ title: t('allenatore.live.fulltime'), body, dismissable: false, actions: [{ label: t('allenatore.continue'), variant: 'btn--go', onClick: (c) => { c(); onFinish(match); } }] });
  }

  /* ---------------- partenza ---------------- */
  for (const e of match.events.slice(-30)) addFeed(e);
  holdUntil = 0;
  updateBoard();
  updateXI();
  if (match.finished) finish();
  else restart();

  return () => { clearInterval(timer); ended = true; };
}
