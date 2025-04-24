export function genId() {
  return 'mod-' + Math.random().toString(36).substr(2, 9);
}