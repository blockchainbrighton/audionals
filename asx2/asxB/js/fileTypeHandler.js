/***********************************************************************
 * fileTypeHandler.js
 * [Patched: handles base64 under "audioData", any field, or nested object]
 ***********************************************************************/

function b64ToArrayBuffer(b64) {
    const bin = atob(b64);
    const len = bin.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) bytes[i] = bin.charCodeAt(i);
    return bytes.buffer;
}

/**
 * Try to extract a base64 audio string from an object, searching all keys.
 * Returns { b64, mime } or null.
 */
function findB64Audio(obj) {
    if (!obj || typeof obj !== "object") return null;
    for (const [key, val] of Object.entries(obj)) {
        if (typeof val === "string") {
            // data:audio/*;base64,....
            const match = val.match(/^data:(audio\/[a-z0-9-+.]+);base64,([A-Za-z0-9+/=]+)$/i);
            if (match) return { b64: match[2], mime: match[1] };
            // Raw base64 (very long)
            if (val.length > 200 && /^[A-Za-z0-9+/=]+$/.test(val)) return { b64: val, mime: "audio/mpeg" };
        } else if (typeof val === "object" && val) {
            const found = findB64Audio(val);
            if (found) return found;
        }
    }
    return null;
}

export async function extractAudioAndImage(response) {
    const ct = response.headers.get('content-type') || '';

    // HTML with <audio> or base64 string
    if (ct.includes('text/html')) {
        const html = await response.text();
        let m = html.match(/data:audio[^"']+;base64,([A-Za-z0-9+/=]+)/);
        if (m) {
            const img = html.match(/data:image[^"']+;base64,[A-Za-z0-9+/=]+/)?.[0] || null;
            return { audioArrayBuffer: b64ToArrayBuffer(m[1]), imageDataUrl: img };
        }
        m = html.match(/["'`]([A-Za-z0-9+/=]{200,})["'`]/); // Large JS string
        if (m) return { audioArrayBuffer: b64ToArrayBuffer(m[1]), imageDataUrl: null };
    }

    // JSON: scan all keys for audio data
    if (ct.includes('application/json') || ct.includes('text/json')) {
        const obj = await response.json();
        // Scan for base64 in any property (audio, audioData, custom, etc.)
        const found = findB64Audio(obj);
        if (found) {
            return { audioArrayBuffer: b64ToArrayBuffer(found.b64), imageDataUrl: null };
        }
        // Also check for .image (data:image/...)
        if (typeof obj.image === 'string' && obj.image.startsWith('data:image')) {
            return { audioArrayBuffer: null, imageDataUrl: obj.image };
        }
    }

    // Plain text: raw base64
    if (ct.startsWith('text/') || ct === '') {
        const txt = await response.text();
        if (/^[A-Za-z0-9+/=\r\n]+$/.test(txt.trim()) && txt.length > 200) {
            return { audioArrayBuffer: b64ToArrayBuffer(txt.trim()), imageDataUrl: null };
        }
    }

    return null;
}
