import { ctx } from './audioEngine.js';

/**
 * Extract an Ordinals inscription ID from any string.
 * Matches `<64+ hex chars>i<digits>` which is the standard format.
 */
function extractOrdinalId(str) {
  const match = str.match(/([0-9a-fA-F]{64,}i\d+)/);
  return match ? match[1] : null;
}

/**
 * Normalize a user‑supplied string (raw ID or URL) into a direct
 * `https://ordinals.com/content/{ID}` link if it looks like a Bitcoin Ordinal.
 * Otherwise, return the original URL unchanged.
 */
function resolveOrdinalURL(input) {
  const idFromRaw = extractOrdinalId(input);
  if (idFromRaw && !/^https?:\/\//.test(input)) {
    // Raw ID only
    return `https://ordinals.com/content/${idFromRaw}`;
  }

  // Try to parse as URL
  try {
    const url = new URL(input);
    // common hosts that embed inscription in the pathname
    if (/(?:ordinals\.com|ord\.io)$/i.test(url.hostname)) {
      const id = extractOrdinalId(url.pathname);
      if (id) return `https://ordinals.com/content/${id}`;
    }
  } catch {
    /* fallthrough: invalid URL */
  }

  // Fallback – return untouched
  return input;
}

/**
 * Load an audio sample from either a File object or a (possibly
 * Ordinals‑style) URL / ID string. Resolves to an AudioBuffer.
 */
export async function loadSample(source) {
  let arrayBuffer;

  if (source instanceof File) {
    arrayBuffer = await source.arrayBuffer();
  } else {
    // Treat as string / URL – first normalize
    const resolved = resolveOrdinalURL(source.trim());
    const res = await fetch(resolved);
    if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${resolved}`);
    arrayBuffer = await res.arrayBuffer();
  }

  return await ctx.decodeAudioData(arrayBuffer);
}

export { resolveOrdinalURL };