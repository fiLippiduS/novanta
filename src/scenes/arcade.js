/* RIGORI — un tiro alla volta, una vita sola.
   Il portiere è difficile, ma non bara mai: se il tiro è perfetto
   nei primi turni, entra. L'utente deve poter dire "ho sbagliato io". */

import { t } from '../core/i18n.js';
import * as store from '../core/storage.js';
import * as audio from '../core/audio.js';
import { go } from '../core/router.js';
import { el, topbar, sheet, stat } from '../ui/components.js';
import { createCounter } from '../ui/counter.js';
import { createCommentary } from '../ui/commentary.js';
import { quake, floatGain, replay } from '../ui/motion.js';
import { createNet, hitNet, updateNet } from '../arcade/net.js';
import { createRig, updateRig, drawRig, setState, handPositions, lookAt } from '../arcade/keeper-rig.js';
import { createKeeper, decide, remember, isPerfectCorner } from '../arcade/keeper.js';
import { createShot, updateShot, advance, ballAt, PHASE } from '../arcade/shot.js';
import * as R from '../arcade/render.js';
import { resolveOutcome, GOAL as O_GOAL, SAVE as O_SAVE, POST as O_POST } from '../arcade/outcome.js';
import * as ads from '../ads/adapter.js';
import { shareAction, grid } from '../ui/share.js';
import { onHidden } from '../core/visibility.js';

/* maglia chiara: contro la rete scura il portiere deve staccarsi subito,
   altrimenti non si legge il tuffo */
const KIT = { kit: '#3E6BC4', shorts: '#2C4A86', socks: '#4C7BD6', skin: '#D2A379', gloves: '#C9F24B' };


export function mount(host) {
  const shell = el('div', 'shell arcade');
  const bar = topbar({ title: t('arcade.title'), onExit: () => go('hub') });

  const goals = createCounter(0, { className: 'arcade__score display' });
  const bestVal = store.get('arcade.best') || 0;
  const bestBox = el('div', 'squad__best');
  bestBox.append(el('span', 'label', t('common.best')), el('strong', 'num', String(bestVal)));
  const scores = el('div', 'squad__scores');
  scores.append(goals.el, bestBox);
  bar.slot.appendChild(scores);

  const stage = el('div', 'arcade__stage');
  const canvas = el('canvas', 'arcade__canvas');
  canvas.setAttribute('aria-label', t('arcade.title'));
  stage.append(canvas);

  /* Una sola zona di testo sotto il campo, con un'altezza fissa:
     prima il nome del gesto e il verdetto si sovrapponevano alla palla
     e la riga in fondo finiva tagliata fuori dallo schermo. */
  const say = el('div', 'arcade__say');
  const prompt = el('div', 'arcade__prompt display');
  const verdict = el('div', 'arcade__verdict display');
  const hint = el('p', 'arcade__hint label');
  say.append(verdict, prompt, hint);

  const comm = createCommentary();

  shell.append(bar.el, stage, say, comm.el);
  host.appendChild(shell);

  /* ---------------- stato ---------------- */

  let ctx = R.fitCanvas(canvas);
  const keeper = createKeeper();
  let net = createNet(R.L.GOAL);
  const rig = createRig({
    x: (R.L.GOAL.left + R.L.GOAL.right) / 2,
    y: R.L.GOAL.bottom - 34 * R.KEEPER_SCALE,
    scale: R.KEEPER_SCALE,
  });


  /* La geometria dipende dalla forma del riquadro: se cambia (rotazione del
     telefono, finestra ridimensionata) rete e portiere vanno ricollocati. */
  function relayout() {
    ctx = R.fitCanvas(canvas);
    net = createNet(R.L.GOAL);
    rig.baseY = R.L.GOAL.bottom - 34 * R.KEEPER_SCALE;
    if (!shot || shot.phase === PHASE.AIM) {
      rig.baseX = (R.L.GOAL.left + R.L.GOAL.right) / 2;
      rig.x = rig.baseX;
      rig.y = rig.baseY;
    }
  }
  const rand = Math.random;

  let shot = null;
  let plan = null;
  let round = 0;
  let score = 0;
  let streak = 0;
  let bestBeaten = false;
  let phaseLocked = false;
  let over = false;
  let continued = false;
  let trail = [];
  let flash = 0;
  let fairHint = 0;
  let raf = null;
  let last = performance.now();
  let resolveAt = 0;
  let resultLabel = null;
  const history = [];   // un quadretto per tiro, per il messaggio da condividere

  function newShot() {
    round += 1;
    shot = createShot(R.L.GOAL, round);
    plan = null;
    trail = [];
    resultLabel = null;
    phaseLocked = false;
    verdict.textContent = '';
    verdict.className = 'arcade__verdict display';
    prompt.hidden = false;
    hint.hidden = false;
    setState(rig, 'idle');

    // il portiere si sposta per invogliarti a cambiare angolo
    const d = keeper.round >= 8 && rand() < 0.45 ? (rand() < 0.5 ? -1 : 1) : 0;
    rig.baseX = (R.L.GOAL.left + R.L.GOAL.right) / 2 + d * 70;

    // nei primi dieci turni gli angoli imparabili restano segnalati
    fairHint = round <= 10 ? 1 : 0;

    prompt.textContent = t('arcade.aim');
    hint.textContent = t('arcade.tapAim');
    comm.say('commentary.arcadeStart');
  }

  /* ---------------- input: un solo gesto ---------------- */

  function tap() {
    if (over || !shot) return;
    if (shot.phase === PHASE.FLIGHT || shot.phase === PHASE.DONE) return;
    if (phaseLocked) return;

    audio.sfx.tick();
    const next = advance(shot);

    if (next === PHASE.POWER) {
      prompt.textContent = t('arcade.power');
      hint.textContent = t('arcade.tapPower');
    } else if (next === PHASE.CURVE) {
      prompt.textContent = t('arcade.curve');
      hint.textContent = t('arcade.tapCurve');
      setState(rig, 'load');
    }
    if (shot.phase === PHASE.FLIGHT) startFlight();
  }

  function startFlight() {
    phaseLocked = true;
    prompt.textContent = '';
    hint.textContent = '';
    fairHint = 0;
    audio.sfx.kick();
    plan = decide(keeper, shot, R.L.GOAL, rand);
    resolveAt = shot.flightMs;
    rig.diveScheduled = plan.reactionMs;
    setState(rig, 'load');
  }

  canvas.addEventListener('pointerdown', (e) => { e.preventDefault(); tap(); });
  const onKey = (e) => {
    if (e.code === 'Space' || e.code === 'Enter') { e.preventDefault(); tap(); }
  };
  addEventListener('keydown', onKey);

  /* ---------------- esito ---------------- */

  function resolveShot() {
    if (!plan) return;
    const g = R.L.GOAL;
    const pos = ballAt(shot, 1, R.L.SPOT);
    const outcome = resolveOutcome(pos, g, {
      hands: handPositions(rig),
      body: { x: rig.x, y: rig.y },
      radius: plan.saveRadius,
    });

    remember(keeper, shot, g);
    shot.phase = PHASE.DONE;

    history.push(outcome === O_GOAL);

    if (outcome === O_GOAL) {
      score += 1;
      streak += 1;
      goals.set(score);
      hitNet(net, pos.x, pos.y, shot.power);
      flash = 1;
      audio.sfx.goal();
      quake(1.4);
      setState(rig, 'beaten');
      show(t('arcade.goal'), 'good');
      comm.say(streak >= 4 ? 'commentary.arcadeHot' : 'commentary.arcadeGoal', 'good');
      floatGain(verdict, '+1');
      if (!bestBeaten && bestVal > 0 && score > bestVal) {
        bestBeaten = true;
        bestBox.classList.add('squad__best--beaten');
        audio.sfx.record();
      }
      bestBox.querySelector('strong').textContent = String(Math.max(bestVal, score));
      setTimeout(newShot, 1500);
    } else {
      streak = 0;
      if (outcome === O_SAVE) {
        audio.sfx.save();
        setState(rig, 'save');
        show(t('arcade.saved'), 'bad');
        comm.say('commentary.arcadeSave', 'bad');
      } else if (outcome === O_POST) {
        audio.sfx.post();
        setState(rig, 'beaten');
        show(t('arcade.post'), 'warn');
        comm.say('commentary.arcadePost', 'warn');
      } else {
        audio.sfx.miss();
        setState(rig, 'celebrate');
        show(t('arcade.out'), 'warn');
        comm.say('commentary.arcadeOut', 'warn');
      }
      quake(0.8);
      setTimeout(gameOver, 1500);
    }
  }

  function show(text, tone) {
    verdict.textContent = text;
    verdict.className = `arcade__verdict display arcade__verdict--${tone}`;
    prompt.hidden = true;
    hint.hidden = true;
    replay(verdict, 'anim-snap');
  }

  /* ---------------- fine ---------------- */

  function gameOver() {
    if (over) return;
    over = true;
    setState(rig, 'celebrate');
    audio.sfx.over();

    const s = store.load();
    const isRecord = score > (s.arcade.best || 0);
    store.save({
      arcade: {
        best: Math.max(s.arcade.best || 0, score),
        played: (s.arcade.played || 0) + 1,
        totalGoals: (s.arcade.totalGoals || 0) + score,
      },
      coins: (s.coins || 0) + score * 2,
    });

    const body = el('div', 'result');
    const row = el('div', 'result__stats');
    row.append(
      stat(t('arcade.scored'), score, isRecord ? 'good' : null),
      stat(t('common.best'), Math.max(bestVal, score)),
      stat(t('common.coins'), `+${score * 2}`, 'warn'),
    );
    body.appendChild(row);
    if (isRecord && score > 0) body.appendChild(el('p', 'result__record display t-lg', t('squad.newRecord')));

    const actions = [];
    /* una sola seconda chance per partita: altrimenti il record non vale niente */
    if (!continued) {
      actions.push({
        label: `▶ ${t('arcade.oneMore')}`,
        variant: 'btn--reward',
        onClick: async (close) => {
          close();
          const earned = await ads.rewarded('arcade-continue');
          if (earned) revive();
          else gameOverSheet(body, isRecord);
        },
      });
    }
    actions.push({
      label: t('common.retry'),
      variant: 'btn--go',
      onClick: async (close) => { close(); await ads.interstitial('arcade-restart', 3); go('arcade'); },
    });
    actions.push(shareAction(() => ({
      mode: t('arcade.title'),
      grid: grid(history, { on: '⚽', off: '🧤' }),
      rows: [`${score} ${t('arcade.scored').toLowerCase()} · ${t('common.best').toLowerCase()} ${Math.max(bestVal, score)}`],
    })));
    actions.push({
      label: t('common.back'),
      variant: 'btn--ghost',
      onClick: (close) => { close(); go('hub'); },
    });

    sheet({ title: t('arcade.gameOver'), body, actions, dismissable: false });
  }

  function gameOverSheet(body, isRecord) {
    sheet({
      title: t('arcade.gameOver'),
      body,
      actions: [
        { label: t('common.retry'), variant: 'btn--go', onClick: (c) => { c(); go('arcade'); } },
        { label: t('common.back'), variant: 'btn--ghost', onClick: (c) => { c(); go('hub'); } },
      ],
      dismissable: false,
    });
  }

  function revive() {
    continued = true;
    over = false;
    floatGain(stage, t('arcade.oneMore'), 'var(--amber)');
    audio.sfx.record();
    newShot();
  }

  /* ---------------- ciclo ---------------- */

  function frame(now) {
    raf = requestAnimationFrame(frame);
    try { step(now); } catch (e) { console.error('[rigori]', e); }
  }

  /* Un errore dentro un fotogramma non deve fermare l'animazione:
     requestAnimationFrame non riprogramma niente se la funzione lancia. */
  function step(now) {
    const dt = Math.min(48, now - last);
    last = now;

    if (shot && shot.phase !== PHASE.DONE) updateShot(shot, dt);

    /* L'effetto ha una finestra: se scade, il tiro parte da solo. Prima
       succedeva senza passare da startFlight, quindi il portiere non aveva
       nessun piano e il tiro si bloccava a metà volo. */
    if (shot && shot.phase === PHASE.FLIGHT && !plan) startFlight();

    // il portiere si tuffa quando è passato il suo tempo di reazione
    if (shot && shot.phase === PHASE.FLIGHT && plan && rig.state !== 'dive'
        && rig.state !== 'save' && rig.state !== 'beaten'
        && shot.t >= rig.diveScheduled) {
      rig.dir = plan.target.x < rig.x ? -1 : 1;
      rig.diveFrom = { x: rig.x, y: rig.y };
      rig.diveTo = { x: plan.target.x, y: Math.min(plan.target.y + 20, R.L.GOAL.bottom - 10) };
      rig.diveMs = 300;
      setState(rig, 'dive');
    }

    if (shot && shot.phase === PHASE.FLIGHT && shot.t >= resolveAt) resolveShot();

    /* la testa del portiere segue la palla: durante il volo la guarda,
       prima del tiro tiene d'occhio il dischetto */
    if (shot && (shot.phase === PHASE.FLIGHT || shot.phase === PHASE.DONE)) {
      const k = Math.min(1, shot.t / shot.flightMs);
      const b = ballAt(shot, k, R.L.SPOT);
      lookAt(rig, b.x, b.y);
    } else {
      lookAt(rig, R.L.SPOT.x, R.L.SPOT.y);
    }

    updateRig(rig, dt);
    updateNet(net, dt);
    if (flash > 0) flash = Math.max(0, flash - dt / 420);
    if (fairHint > 0 && shot && shot.phase !== PHASE.AIM) fairHint = Math.max(0, fairHint - dt / 500);

    draw(now);
  }

  function draw(now) {
    ctx.clearRect(0, 0, R.VW, R.L.VH);
    R.drawCrowd(ctx, now);
    R.drawPitch(ctx, streak / 10);
    R.drawGoal(ctx, net);
    R.drawFairHint(ctx, fairHint);
    drawRig(ctx, rig, KIT);

    if (!shot) return;

    if (shot.phase === PHASE.AIM) R.drawAim(ctx, shot);
    else if (shot.phase === PHASE.POWER) { R.drawAim(ctx, shot); R.drawPower(ctx, shot); }
    else if (shot.phase === PHASE.CURVE) { R.drawPower(ctx, shot); R.drawCurve(ctx, shot); }

    if (shot.phase === PHASE.FLIGHT || shot.phase === PHASE.DONE) {
      const k = Math.min(1, shot.t / shot.flightMs);
      const pos = ballAt(shot, k, R.L.SPOT);
      trail.push(pos);
      if (trail.length > 9) trail.shift();
      R.drawBall(ctx, pos, trail);
    } else {
      R.drawBall(ctx, { x: R.L.SPOT.x, y: R.L.SPOT.y - 14, scale: 1 }, []);
    }

    if (flash > 0) {
      ctx.save();
      ctx.globalAlpha = flash * 0.24;
      ctx.fillStyle = '#C9F24B';
      ctx.fillRect(0, 0, R.VW, R.L.VH);
      ctx.restore();
    }
  }

  /* tornando da un'altra scheda il ciclo riparte dall'istante attuale,
     altrimenti il tiro in volo salterebbe direttamente in porta */
  const stopVisibility = onHidden({
    pause: () => true,
    resume: () => { last = performance.now(); },
  });

  const onResize = () => relayout();
  addEventListener('resize', onResize);
  addEventListener('orientationchange', onResize);

  /* Il riquadro cresce con il layout, non con la finestra: l'evento resize
     da solo non basta ad accorgersene. */
  const ro = new ResizeObserver(() => relayout());
  ro.observe(stage);
  requestAnimationFrame(relayout);

  newShot();
  raf = requestAnimationFrame(frame);

  return () => {
    stopVisibility();
    cancelAnimationFrame(raf);
    removeEventListener('keydown', onKey);
    ro.disconnect();
    removeEventListener('resize', onResize);
    removeEventListener('orientationchange', onResize);
    comm.destroy();
    document.querySelectorAll('.sheet').forEach((s) => s.remove());
  };
}
