/* L'ingresso allo stadio. Tre porte, nient'altro.
   Se questa schermata non è già diversa dalle altre, il gioco ha fallito qui. */

import { t } from '../core/i18n.js';
import * as store from '../core/storage.js';
import * as audio from '../core/audio.js';
import { go } from '../core/router.js';
import { el, crest } from '../ui/components.js';
import { stagger, tilt, waveFrom } from '../ui/motion.js';
import { msToNextDay, utcDayKey } from '../core/rng.js';
import { LANGS, lang, setLang } from '../core/i18n.js';

function hhmmss(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = String(Math.floor(s / 3600)).padStart(2, '0');
  const m = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
  const sec = String(s % 60).padStart(2, '0');
  return `${h}:${m}:${sec}`;
}

function modeCard({ id, index, title, desc, meta, accent, onGo, disabled }) {
  const card = el('button', `mode mode--${id} card halftone misreg card--print`);
  card.type = 'button';
  card.style.setProperty('--misreg-color', accent);
  card.style.setProperty('--mode-accent', accent);
  if (disabled) card.classList.add('mode--soon');
  tilt(card, 0.45);

  const n = el('span', 'mode__index display num', index);
  const body = el('span', 'mode__body');
  body.append(
    el('span', 'mode__title display t-xl', title),
    el('span', 'mode__desc', desc),
  );

  const foot = el('span', 'mode__meta');
  meta.forEach((m) => {
    const chip = el('span', 'chip');
    chip.append(el('span', 'label', m.label), el('strong', 'num', m.value));
    foot.appendChild(chip);
  });
  body.appendChild(foot);

  const arrow = el('span', 'mode__arrow', '→');
  card.append(n, body, arrow);

  card.addEventListener('click', () => {
    audio.sfx.tick();
    waveFrom(arrow, accent);
    setTimeout(onGo, 90);
  });
  return card;
}

export function mount(host) {
  const data = store.load();
  const shell = el('div', 'shell hub');

  /* --- testata --- */
  const head = el('header', 'hub__head');
  const mark = el('h1', 'hub__mark display');
  mark.innerHTML = '<span class="hub__word">NOVANTA</span>';
  head.append(
    el('p', 'label hub__tagline', t('hub.tagline')),
    mark,
    el('p', 'hub__sub dim', t('hub.sub')),
  );

  /* arco di gesso dietro al titolo */
  const arc = el('div', 'hub__arc');
  arc.innerHTML = `<svg viewBox="0 0 400 120" aria-hidden="true" preserveAspectRatio="none">
    <path d="M4 116 C 60 18, 340 18, 396 116" fill="none"
      stroke="rgba(237,232,218,0.16)" stroke-width="1.5" stroke-dasharray="3 7"/>
    <circle cx="200" cy="112" r="3.5" fill="var(--lime)"/>
  </svg>`;
  head.appendChild(arc);

  /* --- le tre modalità --- */
  const modes = el('div', 'hub__modes');

  const squadBest = data.squad.best;
  modes.appendChild(modeCard({
    id: 'squad', index: '01', accent: 'var(--lime)',
    title: t('hub.squadTitle'), desc: t('hub.squadDesc'),
    meta: [
      { label: t('common.best'), value: squadBest || '—' },
      { label: t('hub.games'), value: data.squad.played },
    ],
    onGo: () => go('squad'),
  }));

  modes.appendChild(modeCard({
    id: 'arcade', index: '02', accent: 'var(--amber)',
    title: t('hub.arcadeTitle'), desc: t('hub.arcadeDesc'),
    meta: [
      { label: t('common.best'), value: data.arcade.best || '—' },
      { label: t('arcade.scored'), value: data.arcade.totalGoals },
    ],
    onGo: () => go('arcade'),
  }));

  modes.appendChild(modeCard({
    id: 'asta', index: '03', accent: 'var(--flare)',
    title: t('hub.astaTitle'), desc: t('hub.astaDesc'),
    meta: [
      { label: t('asta.record'), value: data.asta.wins || '—' },
      { label: t('hub.games'), value: data.asta.played },
    ],
    onGo: () => go('asta'),
  }));

  modes.appendChild(modeCard({
    id: 'duello', index: '04', accent: 'var(--sky)',
    title: t('hub.duelloTitle'), desc: t('hub.duelloDesc'),
    meta: [
      { label: t('common.best'), value: data.duel.best || '—' },
      { label: t('duello.right'), value: data.duel.total },
    ],
    onGo: () => go('duello'),
  }));

  const car = data.career && data.career.player;
  modes.appendChild(modeCard({
    id: 'carriera', index: '05', accent: 'var(--amber)',
    title: t('hub.carrieraTitle'), desc: t('hub.carrieraDesc'),
    meta: car
      ? [{ label: t('carriera.season'), value: car.seasons.length + 1 },
         { label: t('carriera.goals'), value: car.totals.goals }]
      : [{ label: t('carriera.age'), value: 16 }],
    onGo: () => go('carriera'),
  }));

  const doneToday = data.daily.lastDay === utcDayKey();
  const dailyCard = modeCard({
    id: 'daily', index: '06', accent: 'var(--lime)',
    title: t('hub.dailyTitle'), desc: t('hub.dailyDesc'),
    meta: [
      { label: t('hub.streak'), value: `${data.daily.streak}` },
      { label: t('hub.nextIn'), value: hhmmss(msToNextDay()) },
    ],
    onGo: () => go('daily'),
  });
  if (doneToday) dailyCard.classList.add('mode--done');
  modes.appendChild(dailyCard);

  const clockChip = dailyCard.querySelectorAll('.chip strong')[1];
  const clock = setInterval(() => { clockChip.textContent = hhmmss(msToNextDay()); }, 1000);

  /* --- piede: lingua, audio, note legali --- */
  const foot = el('footer', 'hub__foot');

  const langBtn = el('button', 'pill', lang().toUpperCase());
  langBtn.type = 'button';
  langBtn.setAttribute('aria-label', t('common.language'));
  langBtn.addEventListener('click', () => {
    const next = LANGS[(LANGS.indexOf(lang()) + 1) % LANGS.length];
    setLang(next);
  });

  const soundBtn = el('button', 'pill', audio.isEnabled() ? '♪' : '✕');
  soundBtn.type = 'button';
  soundBtn.setAttribute('aria-label', t('common.sound'));
  soundBtn.addEventListener('click', () => {
    audio.setEnabled(!audio.isEnabled());
    soundBtn.textContent = audio.isEnabled() ? '♪' : '✕';
    if (audio.isEnabled()) audio.sfx.tick();
  });

  /* Tre righe di testo vero: servono a chi arriva da fuori e, molto
     concretamente, anche a chi deve approvare il sito per la pubblicità. */
  const links = el('nav', 'hub__links');
  [
    ['/come-si-gioca', t('foot.howto')],
    ['/dati', t('foot.data')],
    ['/privacy', t('foot.privacy')],
  ].forEach(([href, label]) => {
    const a = el('a', 'hub__legal dim', label);
    a.href = href;
    links.appendChild(a);
  });

  foot.append(langBtn, soundBtn, el('span', 'spacer'), links);

  shell.append(head, modes, foot);
  host.appendChild(shell);

  stagger(modes.children, 'anim-rise', 70);
  head.classList.add('anim-rise');

  return () => clearInterval(clock);
}
