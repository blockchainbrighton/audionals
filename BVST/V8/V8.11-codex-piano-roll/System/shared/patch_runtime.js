function normalizePatchDocument(doc) {
    if (!doc || typeof doc !== 'object') {
        throw new Error('Patch must be an object.');
    }
    if (doc.config && typeof doc.config === 'object') {
        return doc.config;
    }
    return doc;
}

function cacheBustParam() {
    try {
        const t = new URL(import.meta.url).searchParams.get('t');
        return t && t.trim() ? t.trim() : '';
    } catch (_) {
        return '';
    }
}

let _bvstSingleton = null;
async function getBVST() {
    if (_bvstSingleton) return _bvstSingleton;
    const t = cacheBustParam();
    const mod = await import(`./plugin_core.js${t ? `?t=${encodeURIComponent(t)}` : ''}`);
    _bvstSingleton = mod.BVST;
    return _bvstSingleton;
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

    const BVST = await getBVST();
    console.log('[BVST] runPatch', { patchUrl, containerId, name: config && config.name });

    BVST.init({
        ...config,
        ...overrides,
        containerId
    });
}
