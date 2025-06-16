/***********************************************************************
 * utils.js
 *  – loadSample() ALWAYS returns { buffer: AudioBuffer|null, imageData: string|null }
 *  – Now with extensive debug logging at each step
 ***********************************************************************/

import { ctx }                  from './audioEngine.js';
import { extractAudioAndImage } from './fileTypeHandler.js';
import State                    from './state.js';

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

  // Initial log
  console.log(`🟠 [loadSample] Begin. Source=`, source);

  try {
    if (source instanceof File) {
      arrayBuffer = await source.arrayBuffer();
      console.log(`🟢 [loadSample] Loaded from local File. Name="${source.name}", Size=${arrayBuffer.byteLength}`);
    } else {
      if (!url) url = String(source).trim();
      const resolvedUrl = resolveOrdinalURL(url);
      console.log(`🔵 [loadSample] Loading from URL. Raw="${url}" → Resolved="${resolvedUrl}"`);
      const resp = await fetch(resolvedUrl);
      if (!resp.ok) {
        console.warn(`🔴 [loadSample] Failed to fetch: "${resolvedUrl}" (HTTP ${resp.status})`);
        return { buffer: null, imageData: null };
      }
      const ct = resp.headers.get('content-type') || '';
      console.log(`[loadSample] HTTP Content-Type: "${ct}" for "${resolvedUrl}"`);

      // Raw audio or video fetch path
      if (
        ct.startsWith('audio/') ||
        ct === 'application/octet-stream' ||
        ct === '' ||
        ct.startsWith('video/')
      ) {
        arrayBuffer = await resp.arrayBuffer();
        console.log(`[loadSample] Got arrayBuffer: ${arrayBuffer.byteLength} bytes, decoding as audio.`);
      } else {
        // Try to extract base64 or embedded audio
        console.log(`[loadSample] Attempting base64/audio extraction (content-type="${ct}")`);
        const alt = await extractAudioAndImage(resp);
        if (alt && alt.audioArrayBuffer) {
          arrayBuffer = alt.audioArrayBuffer;
          imageData = alt.imageDataUrl;
          console.log(`[loadSample] Extracted base64 audio. Length=${arrayBuffer.byteLength} bytes`);
        } else {
          console.warn(`[loadSample] ❌ No audio found in file (Content-Type: ${ct}) from "${resolvedUrl}"`);
          return { buffer: null, imageData: null };
        }
      }
    }

    try {
      const buffer = await ctx.decodeAudioData(arrayBuffer);
      console.log(`[loadSample] ✅ Audio decoded. Duration=${buffer.duration}s, Channels=${buffer.numberOfChannels}, SampleRate=${buffer.sampleRate}`);
      return { buffer, imageData };
    } catch (err) {
      console.warn(`[loadSample] ❌ decodeAudioData failed. Buffer length=${arrayBuffer?.byteLength}. Error:`, err);
      return { buffer: null, imageData: null };
    }
  } catch (err) {
    // Handles fetch, arrayBuffer, or general errors
    console.warn(`[loadSample] ❌ General error during loadSample:`, err);
    return { buffer: null, imageData: null };
  }
}

/**
 * Rehydrate audio buffers for all channels in current State based on their .src property.
 * - If .src exists, will call loadSample and update channel's buffer and imageData.
 * - Overwrites buffer and imageData for each channel.
 * - Returns a Promise that resolves when all channels are rehydrated.
 */
export async function rehydrateAllChannelBuffers() {
  const state = State.get();
  if (!state || !Array.isArray(state.channels)) {
    console.warn(`[rehydrateAllChannelBuffers] No valid state or channels array.`);
    return;
  }

  console.log(`[rehydrateAllChannelBuffers] Starting. Channel count: ${state.channels.length}`);
  await Promise.all(state.channels.map(async (ch, i) => {
    if (ch.src) {
      console.log(`[rehydrateAllChannelBuffers] Channel ${i}: src="${ch.src}"`);
      const { buffer, imageData } = await loadSample(ch.src);
      if (!buffer) {
        console.warn(`[rehydrateAllChannelBuffers] Channel ${i}: FAILED to load/decode sample for src="${ch.src}"`);
      } else {
        console.log(`[rehydrateAllChannelBuffers] Channel ${i}: Buffer loaded. Duration=${buffer.duration}s`);
      }
      State.updateChannel(i, { buffer, imageData });
    } else {
      console.warn(`[rehydrateAllChannelBuffers] Channel ${i}: No src, buffer cleared`);
      State.updateChannel(i, { buffer: null, imageData: null });
    }
  }));
  console.log(`[rehydrateAllChannelBuffers] Done.`);
}
