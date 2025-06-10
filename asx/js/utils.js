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
  let url = typeof source === "string" ? source : null;

  // Logging: indicate the source being loaded
  console.log("[loadSample] Loading sample from:", source);

  if (source instanceof File) {
    arrayBuffer = await source.arrayBuffer();
    console.log("[loadSample] Loaded from local File, size:", arrayBuffer.byteLength);
  } else {
    if (!url) url = String(source).trim();
    const resp = await fetch(url);
    const ct = resp.headers.get('content-type') || '';
    console.log("[loadSample] HTTP Content-Type:", ct);

    // Try the original method first (base64, HTML, JSON, etc)
    if (
      ct.startsWith('audio/') ||
      ct === 'application/octet-stream' ||
      ct === '' ||
      ct.startsWith('video/') // Some servers may serve Opus as video/webm
    ) {
      // "Probably raw audio or video file; try as-is"
      arrayBuffer = await resp.arrayBuffer();
      console.log(`[loadSample] Fetched arrayBuffer: ${arrayBuffer.byteLength} bytes, attempting to decode as audio`);
    } else {
      // Try to extract base64 or other embedded audio
      const alt = await extractAudioAndImage(resp);
      if (alt && alt.audioArrayBuffer) {
        arrayBuffer = alt.audioArrayBuffer;
        imageData = alt.imageDataUrl;
        console.log(`[loadSample] Extracted base64 audio from file, length: ${arrayBuffer.byteLength} bytes`);
      } else {
        throw new Error(`No audio stream found in file (Content-Type: ${ct})`);
      }
    }
  }

  try {
    const buffer = await ctx.decodeAudioData(arrayBuffer);
    console.log("[loadSample] Successfully decoded audio buffer:", buffer);
    return { buffer, imageData };
  } catch (err) {
    console.error("[loadSample] decodeAudioData failed. Buffer byteLength:", arrayBuffer?.byteLength, err);
    throw new Error("decodeAudioData failed: " + err.message);
  }
}
