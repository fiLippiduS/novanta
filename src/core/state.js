/* Store minimo con sottoscrizioni. Niente framework, niente magia. */

const state = {
  scene: null,
  soundOn: true,
  coins: 0,
};

const subs = new Set();

export function get(key) { return key ? state[key] : state; }

export function set(patch) {
  Object.assign(state, patch);
  subs.forEach((fn) => fn(state));
}

export function subscribe(fn) {
  subs.add(fn);
  return () => subs.delete(fn);
}

/* bus eventi per le cose che attraversano le scene (audio, pubblicità, record) */
const bus = new EventTarget();

export function emit(name, detail) {
  bus.dispatchEvent(new CustomEvent(name, { detail }));
}

export function on(name, fn) {
  const h = (e) => fn(e.detail);
  bus.addEventListener(name, h);
  return () => bus.removeEventListener(name, h);
}
