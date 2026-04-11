import { BVST } from './plugin_core.js';

function normalizePatchDocument(doc) {
    if (!doc || typeof doc !== 'object') {
        throw new Error('Patch must be an object.');
    }
    if (doc.config && typeof doc.config === 'object') {
        return doc.config;
    }
    return doc;
}

export async function runPatch(options = {}) {
    const containerId = options.containerId || 'app-container';
    const patchUrl = options.patchUrl || './patch.json';
    const overrides = options.overrides && typeof options.overrides === 'object' ? options.overrides : {};

    let patchDoc;
    if (options.patch && typeof options.patch === 'object') {
        patchDoc = options.patch;
    } else {
        const res = await fetch(patchUrl, { cache: 'no-store' });
        if (!res.ok) throw new Error(`Failed to load patch: ${patchUrl} (${res.status})`);
        patchDoc = await res.json();
    }

    const config = normalizePatchDocument(patchDoc);

    BVST.init({
        ...config,
        ...overrides,
        containerId
    });
}

