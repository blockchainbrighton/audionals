// js/fileTypeHandler.js
/**
 * If the fetched response isn’t plain audio, check whether it’s:
 *   • text/html   containing a base-64 <audio> or <source> tag
 *   • application/json with { audio: "data:audio/…;base64,…", image: "data:image/…;base64,…" }
 *
 * Returns { audioArrayBuffer, imageDataUrl|null }  –or– null if nothing usable found.
 */
export async function extractAudioAndImage(response) {
    const ct = response.headers.get('content-type') || '';
  
    // ---------- HTML ----------
    if (ct.includes('text/html')) {
      const html = await response.text();
      const match = html.match(/data:audio[^"']+base64,([A-Za-z0-9+/=]+)/);
      if (match) {
        const audioBuf = Uint8Array.from(atob(match[1]), c => c.charCodeAt(0)).buffer;
        const imgMatch = html.match(/data:image[^"']+base64,[A-Za-z0-9+/=]+/);
        return { audioArrayBuffer: audioBuf, imageDataUrl: imgMatch ? imgMatch[0] : null };
      }
    }
  
    // ---------- JSON ----------
    if (ct.includes('application/json') || ct.includes('text/json')) {
      const obj = await response.json();
      if (obj.audio?.startsWith('data:audio') && obj.audio.includes(';base64,')) {
        const b64 = obj.audio.split(';base64,')[1];
        const audioBuf = Uint8Array.from(atob(b64), c => c.charCodeAt(0)).buffer;
        const imageDataUrl = typeof obj.image === 'string' && obj.image.startsWith('data:image')
          ? obj.image
          : null;
        return { audioArrayBuffer: audioBuf, imageDataUrl };
      }
    }
  
    // ---------- nothing usable ----------
    return null;
  }
  