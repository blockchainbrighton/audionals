// ui/logs.js
export const journeyLog = (msg, data = null) => {
    const timestamp = new Date().toLocaleTimeString();
    const logMsg = `[${timestamp}] ${msg}`;
    console.log(logMsg, data || '');
    const el = document.getElementById('journey-log');
    if (el) {
        const div = document.createElement('div');
        // Custom replacer for BigInt
        const isSensitiveKey = (key) =>
            /(appPrivateKey|privateKey|transitKey|secret|mnemonic|seed|authResponseToken|coreSessionToken)/i.test(String(key));

        const redactString = (str) => {
            if (typeof str !== 'string') return str;
            // JWT-like (auth response / requests)
            if (str.startsWith('eyJ') && str.includes('.') && str.length > 60) return '[JWT redacted]';
            // Long hex blobs
            if (/^[0-9a-f]+$/i.test(str) && str.length > 120) return str.slice(0, 32) + '…(hex truncated)';
            // Very long strings
            if (str.length > 400) return str.slice(0, 200) + '…(truncated)';
            return str;
        };

        const safeStringify = (obj) =>
            JSON.stringify(obj, (key, value) => {
                if (typeof value === 'bigint') return value.toString() + 'n';
                if (value instanceof Error) return { name: value.name, message: value.message, stack: value.stack };
                if (isSensitiveKey(key)) return '[REDACTED]';
                if (typeof value === 'string') return redactString(value);
                return value;
            });
        
        const maxLen = (msg.startsWith('AUTH DEBUG DUMP') || msg.startsWith('[console.error]') || msg.startsWith('[window.error]') || msg.startsWith('[unhandledrejection]')) ? 2200 : 250;
        if (data) {
            const serialized = safeStringify(data);
            const truncated = serialized.length > maxLen ? serialized.substring(0, maxLen) + '…' : serialized;
            div.innerText = logMsg + ' ' + truncated;
        } else {
            div.innerText = logMsg;
        }
        el.prepend(div);
    }
};

export const playerLog = (msg) => {
    journeyLog(`Player: ${msg}`);
    const div = document.createElement('div');
    div.innerText = `> ${msg}`;
    const logEl = document.getElementById('player-log');
    if (logEl) logEl.appendChild(div);
};

export const isAuthDebugEnabled = () => {
    const el = document.getElementById('toggle-auth-debug');
    return el ? Boolean(el.checked) : true;
};

export const safeSerialize = (value, maxLen = 1200) => {
    try {
        const json = JSON.stringify(
            value,
            (key, val) => {
                if (typeof val === 'bigint') return `${val.toString()}n`;
                if (val instanceof Error) return { name: val.name, message: val.message, stack: val.stack };
                if (val instanceof Uint8Array) return { type: 'Uint8Array', length: val.length };
                if (typeof val === 'function') return `[Function ${val.name || 'anonymous'}]`;
                if (/(appPrivateKey|privateKey|transitKey|secret|mnemonic|seed|authResponseToken|coreSessionToken)/i.test(String(key)))
                    return '[REDACTED]';
                if (typeof val === 'string') {
                    if (val.startsWith('eyJ') && val.includes('.') && val.length > 60) return '[JWT redacted]';
                    if (/^[0-9a-f]+$/i.test(val) && val.length > 120) return val.slice(0, 32) + '…(hex truncated)';
                    if (val.length > 1200) return val.slice(0, 200) + '…(truncated)';
                }
                return val;
            },
            2
        );
        if (!json) return String(value);
        return json.length > maxLen ? json.slice(0, maxLen) + '…' : json;
    } catch {
        try {
            return String(value);
        } catch {
            return '[unserializable]';
        }
    }
};
