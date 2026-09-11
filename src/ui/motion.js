/* Effetti riutilizzabili. Tutti rispettano prefers-reduced-motion
   perché le classi CSS corrispondenti si autodisattivano. */

const reduce = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

/** onda circolare che parte da un punto dello schermo */
export function wave(x, y, color = 'var(--lime)') {
  if (reduce()) return;
  const el = document.createElement('div');
  el.className = 'wave';
  el.style.left = `${x}px`;
  el.style.top = `${y}px`;
  el.style.setProperty('--wave-color', color);
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 700);
}

export function waveFrom(node, color) {
  if (!node) return;
  const r = node.getBoundingClientRect();
  wave(r.left + r.width / 2, r.top + r.height / 2, color);
}

/** numero che vola via verso l'alto: +1, +30s, ×3 */
export function floatGain(node, text, color = 'var(--lime)') {
  if (reduce() || !node) return;
  const r = node.getBoundingClientRect();
  const el = document.createElement('div');
  el.className = 'float-gain';
  el.textContent = text;
  el.style.left = `${r.left + r.width / 2}px`;
  el.style.top = `${r.top}px`;
  el.style.setProperty('--gain-color', color);
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 800);
}

/** riavvia un'animazione CSS già applicata */
export function replay(node, cls) {
  if (!node) return;
  node.classList.remove(cls);
  void node.offsetWidth;
  node.classList.add(cls);
}

export function shake(node) { replay(node, 'anim-shake'); }

/** applica una classe, la toglie da sola quando l'animazione è finita:
    senza questo un bordo rosso d'errore resterebbe acceso per sempre */
export function flash(node, cls, ms = 420) {
  if (!node) return;
  replay(node, cls);
  clearTimeout(node.__flash);
  node.__flash = setTimeout(() => node.classList.remove(cls), ms);
}

/** due pixel di scossa, mai di più */
export function quake(intensity = 1) {
  if (reduce()) return;
  const app = document.getElementById('app');
  app.animate([
    { transform: 'translate(0,0)' },
    { transform: `translate(${-3 * intensity}px, ${1 * intensity}px)` },
    { transform: `translate(${2 * intensity}px, ${-2 * intensity}px)` },
    { transform: 'translate(0,0)' },
  ], { duration: 180, easing: 'ease-out' });
}

/** ingressi scaglionati su una lista di nodi */
export function stagger(nodes, cls = 'anim-rise', step = 34) {
  [...nodes].forEach((n, i) => {
    n.style.setProperty('--i', i);
    n.style.animationDelay = `${i * step}ms`;
    n.classList.add(cls, 'stagger');
  });
}

/** inclinazione stabile ma casuale, per non allineare mai nulla del tutto */
export function tilt(node, amount = 0.6) {
  const v = (Math.random() * 2 - 1) * amount;
  node.style.setProperty('--tilt', `${v.toFixed(2)}deg`);
  return v;
}
