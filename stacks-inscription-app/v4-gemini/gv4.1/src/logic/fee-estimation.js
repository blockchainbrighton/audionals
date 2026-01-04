// logic/fee-estimation.js
import { journeyLog } from '../ui/logs.js';

export const estimateTxCounts = (chunkCount, missingCount = null) => {
    const begin = missingCount === null ? 1 : 0; // resume assumes begin already happened
    const uploads = missingCount === null ? chunkCount : missingCount;
    const seal = 1;
    const total = begin + uploads + seal;
    return { begin, uploads, seal, total };
};

export const estimateTxBytes = {
    begin: 380,
    seal: 420,
    addChunk: (chunkLen) => 520 + chunkLen, // overhead + raw bytes (rough)
};

const extractFeeRate = (data) => {
    if (data === null || data === undefined) return null;
    if (typeof data === 'number') return Number.isFinite(data) ? data : null;
    if (typeof data === 'string') {
        const n = Number(data);
        return Number.isFinite(n) ? n : null;
    }
    if (Array.isArray(data)) {
        // Some APIs may return an array of estimations.
        const rates = data
            .map(extractFeeRate)
            .filter((n) => Number.isFinite(n) && n > 0);
        return rates.length ? Math.max(...rates) : null;
    }
    if (typeof data === 'object') {
        const direct =
            data.fee_rate ??
            data.feeRate ??
            data.fee_rate_per_byte ??
            data.feeRatePerByte ??
            null;
        const directParsed = extractFeeRate(direct);
        if (directParsed) return directParsed;

        // Some fee endpoints return an `estimations` array.
        if (Array.isArray(data.estimations)) {
            const rates = data.estimations
                .map((e) => extractFeeRate(e?.fee_rate ?? e?.feeRate ?? e))
                .filter((n) => Number.isFinite(n) && n > 0);
            return rates.length ? Math.max(...rates) : null;
        }
    }
    return null;
};

const fetchFeeRateFromBaseUrl = async (baseUrl) => {
    const url = `${baseUrl}/v2/fees/transfer`;
    const res = await fetch(url, { cache: 'no-store', redirect: 'follow' });
    const contentType = res.headers.get('content-type') || '';
    const text = await res.text();
    let parsed = null;
    try {
        parsed = JSON.parse(text);
    } catch {
        parsed = null;
    }
    if (!res.ok) {
        throw new Error(`HTTP ${res.status} from ${url} (${contentType || 'unknown content-type'})`);
    }
    const rate = extractFeeRate(parsed);
    if (!Number.isFinite(rate) || rate <= 0) {
        const preview = text ? text.slice(0, 200) : '';
        throw new Error(`Unrecognized fee response from ${url}: ${preview}`);
    }
    return rate;
};

export const fetchFeeRateWithFallback = async (label, baseUrls) => {
    let lastErr = null;
    for (const baseUrl of baseUrls) {
        try {
            const rate = await fetchFeeRateFromBaseUrl(baseUrl);
            return { baseUrl, rate };
        } catch (e) {
            lastErr = e;
            journeyLog('Fee rate source failed', { label, baseUrl, error: e?.message || String(e) });
        }
    }
    throw lastErr || new Error(`Fee rate unavailable (${label})`);
};
