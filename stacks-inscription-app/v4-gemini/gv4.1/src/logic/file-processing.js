// logic/file-processing.js
import { chunkFile, computeMerkleRoot, bufToHex } from '../lib/merkle.js';
import { journeyLog } from '../ui/logs.js';

export function sniffMimeType(buffer) {
    if (buffer.length < 4) return null;
    const hex = Array.from(buffer.slice(0, 4)).map(b => b.toString(16).padStart(2,'0')).join('').toLowerCase();
    
    // WebM / EBML: 1a 45 df a3
    if (hex === '1a45dfa3') return 'audio/webm';
    
    // WAV: 52 49 46 46 (RIFF)
    if (hex === '52494646') return 'audio/wav';
    
    // PNG: 89 50 4e 47
    if (hex === '89504e47') return 'image/png';
    
    // JPG: ff d8 ff
    if (hex.startsWith('ffd8ff')) return 'image/jpeg';
    
    // GIF: 47 49 46 38
    if (hex === '47494638') return 'image/gif';
    
    // PDF: 25 50 44 46
    if (hex === '25504446') return 'application/pdf';

    return null;
}

export function guessMimeTypeFromName(name) {
    const n = (name || '').toLowerCase();
    if (n.endsWith('.html') || n.endsWith('.htm')) return 'text/html';
    if (n.endsWith('.json')) return 'application/json';
    if (n.endsWith('.txt')) return 'text/plain';
    if (n.endsWith('.svg')) return 'image/svg+xml';
    return null;
}

export async function processFileForMint(file) {
    journeyLog(`File selected: ${file.name} (${file.size} bytes)`);
    const mimeType = file.type || guessMimeTypeFromName(file.name) || "application/octet-stream";
    journeyLog(`Detected MIME: ${mimeType}`);
    
    const buf = await file.arrayBuffer();
    journeyLog("File read into ArrayBuffer. Starting chunking...");
    
    const chunks = chunkFile(buf);
    journeyLog(`File chunked into ${chunks.length} pieces.`);
    
    const root = computeMerkleRoot(chunks);
    journeyLog("Merkle Root calculated", { root: bufToHex(root) });

    return {
        file,
        meta: { name: file.name, size: file.size },
        mimeType,
        chunks,
        root
    };
}
