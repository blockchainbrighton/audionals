/***********************************************************************
 * utils.js
 *  – loadSample() ALWAYS returns { buffer: AudioBuffer, imageData: string|null }
 ***********************************************************************/

import { ctx }                  from './audioEngine.js';
import { extractAudioAndImage } from './fileTypeHandler.js';

export function extractOrdinalId(str) {
  return (str.match(/([0-9a-fA-F]{64,}i\d+)/) || [])[1] || null;
}

export function resolveOrdinalURL(raw) {
  const id = extractOrdinalId(raw);
  if (id && !/^https?:\/\//.test(raw))
    return `https://ordinals.com/content/${id}`;

  try {
    const u = new URL(raw);
    if (/(ordinals\.com|ord\.io)$/i.test(u.hostname)) {
      const id2 = extractOrdinalId(u.pathname);
      if (id2) return `https://ordinals.com/content/${id2}`;
    }
  } catch {/* ignore */}
  return raw;
}

export async function loadSample(source) {
  let arrayBuffer, imageData = null;

  if (source instanceof File) {
    arrayBuffer = await source.arrayBuffer();
  } else {
    const url  = resolveOrdinalURL(String(source).trim());
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`HTTP ${resp.status} – ${url}`);

    if ((resp.headers.get('content-type') || '').startsWith('audio')) {
      arrayBuffer = await resp.arrayBuffer();
    } else {
      const alt = await extractAudioAndImage(resp);
      if (!alt) throw new Error('No audio stream found in file');
      ({ audioArrayBuffer: arrayBuffer, imageDataUrl: imageData } = alt);
    }
  }

  const buffer = await ctx.decodeAudioData(arrayBuffer);
  return { buffer, imageData };          // ← ALWAYS an object
}
