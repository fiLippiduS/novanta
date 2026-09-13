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
import { resolveOutcome, woodwork, GOAL as O_GOAL, SAVE as O_SAVE, POST as O_POST } from '../arcade/outcome.js';
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
  let rebound = null;     // la palla che torna indietro dal legno
  let woodFlash = null;   // il legno colpito che vibra per un attimo
  const history = [];   // un quadretto per tiro, per il messaggio da condividere

  function newShot() {
    round += 1;
    shot = createShot(R.L.GOAL, round);
    plan = null;
    trail = [];
    resultLabel = null;
    rebound = null;
    woodFlash = null;
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
        const hit = woodwork(pos, g) || { part: pos.y < g.top + 20 ? 'bar' : pos.x < (g.left + g.right) / 2 ? 'left' : 'right', inside: true };
        startRebound(pos, hit, shot.power);
        if (hit.part === 'bar') audio.sfx.bar(); else audio.sfx.post();
        setState(rig, 'beaten');
        show(t(hit.part === 'bar' ? 'arcade.bar' : 'arcade.post'), 'warn');
        comm.say(hit.part === 'bar' ? 'commentary.arcadeBar' : 'commentary.arcadePost', 'warn');
      } else {
        audio.sfx.miss();
        setState(rig, 'celebrate');
        show(t('arcade.out'), 'warn');
        comm.say('commentary.arcadeOut', 'warn');
      }
      quake(outcome === O_POST ? 1.1 : 0.8);
      /* dopo un legno si guarda la palla tornare indietro prima del verdetto */
      setTimeout(gameOver, outcome === O_POST ? 2000 : 1500);
    }
  }

  /* Il rimbalzo sul legno. La palla vive in uno spazio semplice: quanto è
     tornata verso il dischetto (depth, 0 sulla linea, 1 sul dischetto), a che
     altezza da terra (h) e dove sta in orizzontale. Da questi tre numeri si
     ricava la posizione sullo schermo con la stessa prospettiva del tiro. */
  function startRebound(pos, hit, power) {
    const g = R.L.GOAL;
    const scale0 = 0.58;
    const kick = 0.75 + power * 0.5;
    const r = {
      x: pos.x,
      depth: 0,
      h: Math.max(0, (g.bottom - pos.y) / scale0),
      vx: 0, vd: 0, vh: 0,
      t: 0,
      bounces: 0,
    };
    const centre = (g.left + g.right) / 2;
    if (hit.part === 'bar') {
      if (hit.inside) {
        /* sotto la traversa: giù secca, rimbalza sulla linea e torna fuori */
        r.vh = -620 * kick; r.vd = 0.32 * kick; r.vx = (pos.x - centre) * 0.25;
      } else {
        /* sopra: si impenna e ricade verso il campo */
        r.vh = 430 * kick; r.vd = 0.42 * kick; r.vx = (pos.x - centre) * 0.3;
      }
    } else {
      const out = hit.part === 'left' ? -1 : 1;
      if (hit.inside) {
        /* palo interno: attraversa lo specchio e schizza fuori */
        r.vx = -out * (170 + rand() * 90) * kick; r.vd = 0.62 * kick; r.vh = 60 + rand() * 80;
      } else {
        /* palo esterno: via di lato, verso il fondo */
        r.vx = out * (220 + rand() * 90) * kick; r.vd = 0.38 * kick; r.vh = 90 + rand() * 90;
      }
    }
    rebound = r;
    woodFlash = { part: hit.part, t: 0, y: pos.y, x: pos.x };
    trail = [];
  }

  function updateRebound(dt) {
    if (!rebound) return;
    const s = dt / 1000;
    const r = rebound;
    r.t += dt;
    r.vh -= 1500 * s;
    r.h += r.vh * s;
    r.x += r.vx * s;
    r.depth = Math.min(1.2, r.depth + r.vd * s);
    if (r.h <= 0) {
      r.h = 0;
      if (Math.abs(r.vh) > 120 && r.bounces < 4) {
        audio.sfx.bounce(Math.min(1, Math.abs(r.vh) / 700));
        r.bounces += 1;
      }
      r.vh = Math.abs(r.vh) * 0.48;
      r.vx *= 0.82;
      r.vd *= 0.85;
      if (r.vh < 40) r.vh = 0;
    }
    if (woodFlash) {
      woodFlash.t += dt;
      if (woodFlash.t > 480) woodFlash = null;
    }
  }

  function reboundPos() {
    const g = R.L.GOAL;
    const r = rebound;
    const groundY = g.bottom + (R.L.SPOT.y - g.bottom) * r.depth;
    const scale = 0.58 + 0.42 * r.depth;
    return { x: r.x, y: groundY - r.h * scale, scale };
  }

  function drawWoodFlash() {
    if (!woodFlash) return;
    const g = R.L.GOAL;
    const k = 1 - woodFlash.t / 480;
    /* il legno trema: un tratto chiaro che oscilla e si spegne */
    const wob = Math.sin(woodFlash.t / 18) * 3 * k;
    ctx.save();
    ctx.globalAlpha = 0.85 * k;
    ctx.strokeStyle = '#FFFFFF';
    ctx.shadowColor = '#FFFFFF';
    ctx.shadowBlur = 16 * k;
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    if (woodFlash.part === 'bar') {
      const a = Math.max(g.left, woodFlash.x - 90);
      const b = Math.min(g.right, woodFlash.x + 90);
      ctx.moveTo(a, g.top + wob);
      ctx.quadraticCurveTo(woodFlash.x, g.top - wob * 2, b, g.top + wob);
    } else {
      const x = woodFlash.part === 'left' ? g.left : g.right;
      const a = Math.max(g.top, woodFlash.y - 70);
      const b = Math.min(g.bottom, woodFlash.y + 70);
      ctx.moveTo(x + wob, a);
      ctx.quadraticCurveTo(x - wob * 2, woodFlash.y, x + wob, b);
    }
    ctx.stroke();
    ctx.restore();
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
    if (rebound) {
      const b = reboundPos();
      lookAt(rig, b.x, b.y);
    } else if (shot && (shot.phase === PHASE.FLIGHT || shot.phase === PHASE.DONE)) {
      const k = Math.min(1, shot.t / shot.flightMs);
      const b = ballAt(shot, k, R.L.SPOT);
      lookAt(rig, b.x, b.y);
    } else {
      lookAt(rig, R.L.SPOT.x, R.L.SPOT.y);
    }

    updateRig(rig, dt);
    updateNet(net, dt);
    updateRebound(dt);
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

    drawWoodFlash();
    if (rebound) {
      const pos = reboundPos();
      trail.push(pos);
      if (trail.length > 9) trail.shift();
      R.drawBall(ctx, pos, trail);
    } else if (shot.phase === PHASE.FLIGHT || shot.phase === PHASE.DONE) {
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
