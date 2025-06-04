export function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }
export function uid() { return Math.random().toString(36).slice(2, 9); }
export function downloadJSON(data, filename = "project.json") {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], {type: "application/json"}));
  a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
}
export async function gzip(data) {
  if ('CompressionStream' in window) {
    const cs = new CompressionStream('gzip');
    const writer = cs.writable.getWriter();
    writer.write(new TextEncoder().encode(data));
    writer.close();
    const resp = await new Response(cs.readable).arrayBuffer();
    return new Uint8Array(resp);
  }
  throw new Error("Gzip not supported in this browser");
}
export async function gunzip(arrayBuffer) {
  if ('DecompressionStream' in window) {
    const ds = new DecompressionStream('gzip');
    const writer = ds.writable.getWriter();
    writer.write(new Uint8Array(arrayBuffer));
    writer.close();
    const resp = await new Response(ds.readable).text();
    return JSON.parse(resp);
  }
  throw new Error("Gunzip not supported in this browser");
}
export function isOrdinalsUrl(url) {
  return typeof url === 'string' && /https?:\/\/(ordinals|ord|ordinals\.com)\//.test(url);
}
