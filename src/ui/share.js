/* Condivisione del risultato.
   Un gioco senza un risultato da mostrare non si diffonde. Chi ha appena
   fatto il suo record vuole farlo vedere a qualcuno, e quel messaggio è
   l'unica pubblicità gratuita che abbiamo mai avuto.
   Il formato è sempre lo stesso: nome, griglia, numeri, link. */

import { t } from '../core/i18n.js';

const FALLBACK_URL = 'https://instascope.app';

function site() {
  return location.protocol.startsWith('http') ? location.origin : FALLBACK_URL;
}

/** Riga di quadretti: uno per tentativo. Oltre `max` mette i puntini. */
export function grid(flags, { on = '🟩', off = '⬛', max = 24 } = {}) {
  const cells = flags.slice(0, max).map((f) => (f ? on : off));
  if (flags.length > max) cells.push('…');
  return cells.join('');
}

/** Griglia compatta per i punteggi lunghi: quanti pieni su quanti totali. */
export function bars(done, total, { max = 10 } = {}) {
  const filled = total > 0 ? Math.round((done / total) * max) : 0;
  return '🟩'.repeat(filled) + '⬛'.repeat(Math.max(0, max - filled));
}

export function shareText({ mode, grid: g, rows = [] }) {
  const out = [`NOVANTA · ${String(mode).toUpperCase()}`];
  if (g) out.push(g);
  rows.filter(Boolean).forEach((r) => out.push(r));
  out.push(site());
  return out.join('\n');
}

function legacyCopy(text) {
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.cssText = 'position:fixed;top:-1000px;opacity:0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    return ok;
  } catch { return false; }
}

/** Prima il foglio di condivisione del telefono, poi gli appunti. */
export async function copyOrShare(text) {
  if (navigator.share) {
    try { await navigator.share({ text }); return 'shared'; }
    catch { return 'cancelled'; }   // l'utente ha chiuso il foglio
  }
  try { await navigator.clipboard.writeText(text); return 'copied'; }
  catch { return legacyCopy(text) ? 'copied' : 'failed'; }
}

/**
 * Bottone pronto per `sheet({ actions })`.
 * `build()` viene chiamato al momento del tocco, non prima: così il testo
 * contiene sempre l'ultimo punteggio anche se la carta è rimasta aperta.
 */
export function shareAction(build, { label = t('common.share'), variant = 'btn--ghost' } = {}) {
  return {
    label,
    variant,
    onClick: async (close, btn) => {
      const res = await copyOrShare(shareText(build()));
      if (!btn || (res !== 'copied' && res !== 'shared')) return;
      const was = btn.textContent;
      btn.textContent = t('common.copied');
      btn.classList.add('btn--said');
      setTimeout(() => { btn.textContent = was; btn.classList.remove('btn--said'); }, 1600);
    },
  };
}
