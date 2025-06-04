/***********************************************************************
 * utils.js - helpers for loading samples from local files, standard
 *           HTTP URLs, or Bitcoin Ordinal IDs / pages.  Includes a
 *           fallback that extracts base-64 audio hidden inside HTML or
 *           JSON files so “mystery” assets still work.
 ***********************************************************************/

import { ctx } from './audioEngine.js';
import { extractAudioAndImage } from './fileTypeHandler.js';

/* ------------------------------------------------------------------ */
/*  Ordinal helpers                                                    */
/* ------------------------------------------------------------------ */

/**
 * Extract an inscription ID from any string.
 *   Format:  <64-hex>i<index>   (e.g. 0123…abcd i0)
 */
export function extractOrdinalId(str) {
  const m = str.match(/([0-9a-fA-F]{64,}i\d+)/);
  return m ? m[1] : null;
}

/**
 * Normalise anything the user types (raw ID, ordinals.com URL, ord.io
 * URL, etc.) into the canonical:
 *     https://ordinals.com/content/{ID}
 * If it doesn’t look like an Ordinal, return the original string so
 * normal URL loading proceeds.
 */
export function resolveOrdinalURL(input) {
  const id = extractOrdinalId(input);
  if (id && !/^https?:\/\//.test(input)) {
    return `https://ordinals.com/content/${id}`;
  }

  try {
    const url = new URL(input);
    if (/(?:ordinals\.com|ord\.io)$/i.test(url.hostname)) {
      const idInPath = extractOrdinalId(url.pathname);
      if (idInPath) return `https://ordinals.com/content/${idInPath}`;
    }
  } catch {
    /* malformed URL → just keep original */
  }

  return input;
}

/* ------------------------------------------------------------------ */
/*  Main loader                                                        */
/* ------------------------------------------------------------------ */

/**
 * Load a sample from:
 *   • File object (drag-drop / file input)
 *   • Normal HTTP/HTTPS URL
 *   • Raw Ordinal ID or Ordinal page URL
 *
 * Returns an object:  { buffer: AudioBuffer, imageData: string|null }
 * imageData (base-64) is populated only when we discovered an embedded
 * image in an HTML/JSON wrapper.
 */
export async function loadSample(source) {
  let arrayBuffer;
  let imageData = null;

  /* ---------- Local file ---------- */
  if (source instanceof File) {
    arrayBuffer = await source.arrayBuffer();

  /* ---------- Remote fetch ---------- */
  } else {
    const url      = resolveOrdinalURL(source.trim());
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} while fetching ${url}`);
    }

    /* Straight-up audio?  Great, we’re done. */
    if ((response.headers.get('content-type') || '').startsWith('audio')) {
      arrayBuffer = await response.arrayBuffer();

    /* Otherwise try to sniff HTML / JSON wrappers. */
    } else {
      const alt = await extractAudioAndImage(response);
      if (!alt) throw new Error('No audio stream found in file');
      arrayBuffer = alt.audioArrayBuffer;
      imageData   = alt.imageDataUrl;      // may still be null
    }
  }

  const buffer = await ctx.decodeAudioData(arrayBuffer);
  return { buffer, imageData };
}
