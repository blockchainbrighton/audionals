// memory.js - LocalStorage wrappers

export const listInterestingStorageKeys = () => {
    const keys = [];
    try {
        for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (!k) continue;
            if (/(connect|blockstack|stacks|auth|xverse|hiro|leather)/i.test(k)) keys.push(k);
        }
    } catch {
        // ignore
    }
    return keys.sort();
};

export const getLocalStorageJsonSummary = (key, maxLen = 500) => {
    try {
        const raw = localStorage.getItem(key);
        if (!raw) return null;
        let decoded = raw;
        // Some values may be stored as hex-encoded JSON (starting with 7b = "{")
        if (/^[0-9a-f]+$/i.test(raw) && raw.startsWith('7b') && raw.length % 2 === 0) {
            try {
                const bytes = new Uint8Array(raw.length / 2);
                for (let i = 0; i < raw.length; i += 2) bytes[i / 2] = parseInt(raw.slice(i, i + 2), 16);
                decoded = new TextDecoder().decode(bytes);
            } catch {
                decoded = raw;
            }
        }

        let parsed = null;
        try {
            parsed = JSON.parse(decoded);
        } catch {
            parsed = null;
        }

        const redact = (obj) => {
            if (!obj || typeof obj !== 'object') return obj;
            if (Array.isArray(obj)) return obj.map(redact);
            const out = {};
            for (const [k, v] of Object.entries(obj)) {
                if (/(appPrivateKey|privateKey|transitKey|secret|mnemonic|seed|authResponseToken|coreSessionToken)/i.test(k)) {
                    out[k] = '[REDACTED]';
                } else if (typeof v === 'string' && v.startsWith('eyJ') && v.includes('.') && v.length > 60) {
                    out[k] = '[JWT redacted]';
                } else {
                    out[k] = redact(v);
                }
            }
            return out;
        };

        const previewString = parsed ? JSON.stringify(redact(parsed)) : decoded;

        return {
            key,
            length: decoded.length,
            parsedType: parsed ? typeof parsed : null,
            preview: previewString.length > maxLen ? previewString.slice(0, maxLen) + '…' : previewString,
        };
    } catch {
        return null;
    }
};

export const getSelectedProviderId = () => {
    try {
        return localStorage.getItem('STX_PROVIDER');
    } catch {
        return null;
    }
};

export const clearSelectedProviderId = () => {
    try {
        localStorage.removeItem('STX_PROVIDER');
    } catch {
        // ignore
    }
};

export const persistLastInscription = (id) => {
    try {
        localStorage.setItem('last-inscription-id', String(id));
    } catch {
        // ignore
    }
};

export const restoreLastInscription = () => {
    try {
        const raw = localStorage.getItem('last-inscription-id');
        if (!raw) return null;
        const id = Number(raw);
        return Number.isFinite(id) ? id : null;
    } catch {
        return null;
    }
};
