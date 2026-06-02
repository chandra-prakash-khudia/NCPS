// Minimal pub/sub so any component can open the command palette without prop
// drilling. Uses a DOM CustomEvent target under the hood.
const EVENT = 'ncps:open-command';
const target = typeof window !== 'undefined' ? window : null;

export function openCommandPalette(initialQuery = '') {
  if (!target) return;
  target.dispatchEvent(new CustomEvent(EVENT, { detail: { initialQuery } }));
}

export function onOpenCommandPalette(handler) {
  if (!target) return () => {};
  const listener = (event) => handler(event.detail || {});
  target.addEventListener(EVENT, listener);
  return () => target.removeEventListener(EVENT, listener);
}
