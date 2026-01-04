// core/utils.js

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export const getErrorMessage = (e) => {
    if (!e) return 'Unknown error';
    if (typeof e === 'string') return e;
    if (e instanceof Error) return e.message || e.name || 'Error';
    try {
        return JSON.stringify(e);
    } catch {
        return String(e);
    }
};

export const formatMicroStx = (micro) => `${(micro / 1_000_000).toFixed(6)} STX`;
export const formatInt = (n) => new Intl.NumberFormat().format(n);
