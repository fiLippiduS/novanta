/* Router a hash. Ogni scena è una funzione che riceve un contenitore
   e restituisce una funzione di smontaggio. */

const routes = new Map();
let currentTeardown = null;
let currentName = null;
let root = null;

export function register(name, loader) {
  routes.set(name, loader);
}

export function go(name, params = {}) {
  const q = new URLSearchParams(params).toString();
  const next = `#/${name}${q ? `?${q}` : ''}`;

  /* Riavviare la stessa modalità significa scrivere lo stesso indirizzo, e il
     browser in quel caso non manda nessun evento: il pulsante "riprova"
     restava senza effetto e la partita si bloccava. Qui lo ridisegniamo a mano. */
  if (location.hash === next) { render(); return; }
  location.hash = next;
}

export function current() { return currentName; }

function parse() {
  const raw = location.hash.replace(/^#\/?/, '');
  const [name, query] = raw.split('?');
  return {
    name: name || 'hub',
    params: Object.fromEntries(new URLSearchParams(query || '')),
  };
}

async function render() {
  if (!root) return;          // il router non è ancora partito
  const { name, params } = parse();
  const loader = routes.get(name) || routes.get('hub');

  if (currentTeardown) {
    try { currentTeardown(); } catch (e) { console.error(e); }
    currentTeardown = null;
  }

  const outgoing = root.firstElementChild;
  if (outgoing) {
    outgoing.style.pointerEvents = 'none';
    outgoing.animate(
      [{ opacity: 1 }, { opacity: 0 }],
      { duration: 120, fill: 'forwards' },
    );
    outgoing.remove();
  }

  const host = document.createElement('main');
  host.className = 'scene';
  host.dataset.scene = name;
  root.appendChild(host);

  currentName = name;
  /* la pagina di presentazione sotto il gioco si vede solo nella schermata principale */
  document.body.dataset.route = name;
  const mod = await loader();
  currentTeardown = await mod.mount(host, params);

  window.scrollTo(0, 0);
  host.animate(
    [{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }],
    { duration: 260, easing: 'cubic-bezier(0.16,0.84,0.28,1)' },
  );
}

export function start(mountPoint) {
  root = mountPoint;
  addEventListener('hashchange', render);
  if (!location.hash) location.hash = '#/hub';
  else render();
}
