/* Contatore a cifre tabulari.
   Ogni cifra che cambia scorre da sola: è il dettaglio che fa
   sembrare il punteggio un tabellone e non un testo. */

export function createCounter(initial = 0, opts = {}) {
  const el = document.createElement('div');
  el.className = `counter num ${opts.className || ''}`.trim();
  let value = null;

  function render(next, animate = true) {
    const str = String(next);
    const prev = value === null ? '' : String(value);
    if (str === prev) return;

    const pad = opts.pad ? str.padStart(opts.pad, '0') : str;
    const prevPad = opts.pad ? prev.padStart(opts.pad, '0') : prev;

    el.textContent = '';
    [...pad].forEach((ch, i) => {
      const d = document.createElement('span');
      d.className = 'counter__d';
      d.textContent = ch;
      if (animate && prevPad[i] !== ch) {
        d.classList.add('counter__d--roll');
        d.style.animationDelay = `${i * 22}ms`;
      }
      el.appendChild(d);
    });
    value = next;
  }

  render(initial, false);

  return {
    el,
    set: (v, animate = true) => render(v, animate),
    get: () => value,
  };
}
