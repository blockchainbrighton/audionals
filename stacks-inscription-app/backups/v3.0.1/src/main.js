import * as Connect from '@stacks/connect';
import { StacksTestnet } from '@stacks/network';
import { 
    callReadOnlyFunction, 
    cvToValue, 
    uintCV, 
    bufferCV, 
    stringAsciiCV,
    PostConditionMode,
    AnchorMode
} from '@stacks/transactions';
import { chunkFile, computeMerkleRoot, bufToHex } from './lib/merkle.js';
import { processRecursiveAudio } from './lib/audio-engine.js';
import { Buffer } from 'buffer';

window.Buffer = Buffer;

// JOURNEY LOGGER
const journeyLog = (msg, data = null) => {
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

// DEBUG HELPERS
const isAuthDebugEnabled = () => {
    const el = document.getElementById('toggle-auth-debug');
    return el ? Boolean(el.checked) : true;
};

const safeSerialize = (value, maxLen = 1200) => {
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

const listInterestingStorageKeys = () => {
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

const getLocalStorageJsonSummary = (key, maxLen = 500) => {
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

const getSelectedProviderId = () => {
    try {
        return localStorage.getItem('STX_PROVIDER');
    } catch {
        return null;
    }
};

const clearSelectedProviderId = () => {
    try {
        localStorage.removeItem('STX_PROVIDER');
    } catch {
        // ignore
    }
    try {
        Connect.disconnect?.();
    } catch {
        // ignore
    }
};

const wrapProviderForDebug = (provider, label = 'provider') => {
    if (!provider || typeof provider !== 'object') return provider;
    if (provider.__wrappedForAuthDebug) return provider;

    const handler = {
        get(target, prop, receiver) {
            const value = Reflect.get(target, prop, receiver);
            const intercept = ['authenticationRequest', 'transactionRequest', 'signatureRequest', 'structuredDataSignatureRequest', 'request'];
            if (!intercept.includes(String(prop))) return value;
            if (typeof value !== 'function') return value;

            return async (...args) => {
                if (isAuthDebugEnabled()) {
                    journeyLog(`[${label}.${String(prop)}] called`, { args: safeSerialize(args, 800) });
                }
                try {
                    const result = await value.apply(target, args);
                    if (isAuthDebugEnabled()) {
                        journeyLog(`[${label}.${String(prop)}] resolved`, { result: safeSerialize(result, 1200) });
                    }
                    return result;
                } catch (e) {
                    if (isAuthDebugEnabled()) {
                        journeyLog(`[${label}.${String(prop)}] threw`, { error: e?.message || String(e), stack: e?.stack || null });
                    }
                    throw e;
                }
            };
        },
    };

    const proxied = new Proxy(provider, handler);
    try {
        proxied.__wrappedForAuthDebug = true;
    } catch {
        // ignore
    }
    return proxied;
};

const getProviderSummary = () => {
    const candidates = {
        Connect_getStacksProvider: null,
        window_StacksProvider: null,
        window_BlockstackProvider: null,
        window_XverseProviders: null,
    };

    try {
        candidates.Connect_getStacksProvider = Connect.getStacksProvider?.() || null;
    } catch (e) {
        candidates.Connect_getStacksProvider = { error: e?.message || String(e) };
    }

    candidates.window_StacksProvider = window.StacksProvider || null;
    candidates.window_BlockstackProvider = window.BlockstackProvider || null;
    candidates.window_XverseProviders = window.XverseProviders || null;

    const summarize = (p) => {
        if (!p) return null;
        const summary = { type: typeof p };
        try {
            summary.constructorName = p?.constructor?.name || null;
        } catch {
            summary.constructorName = null;
        }
        try {
            summary.keys = Object.keys(p).slice(0, 40);
        } catch {
            summary.keys = ['[unavailable]'];
        }
        try {
            summary.id = p.id || p.providerId || p.name || null;
        } catch {
            summary.id = null;
        }
        try {
            summary.hasAuthenticationRequest = typeof p.authenticationRequest === 'function';
            summary.hasTransactionRequest = typeof p.transactionRequest === 'function';
            summary.hasSignatureRequest = typeof p.signatureRequest === 'function';
        } catch {
            summary.hasAuthenticationRequest = false;
            summary.hasTransactionRequest = false;
            summary.hasSignatureRequest = false;
        }
        return summary;
    };

    return {
        isStacksWalletInstalled: (() => {
            try {
                return Connect.isStacksWalletInstalled();
            } catch {
                return false;
            }
        })(),
        selectedProviderId: getSelectedProviderId(),
        connectLocalStorage: getLocalStorageJsonSummary('@stacks/connect'),
        blockstackSessionLocalStorage: getLocalStorageJsonSummary('blockstack-session'),
        registeredProviders: (() => {
            try {
                const arr = window.webbtc_stx_providers;
                if (!Array.isArray(arr)) return null;
                return arr.map(p => ({ id: p?.id || null, name: p?.name || null, webUrl: p?.webUrl || null })).slice(0, 20);
            } catch {
                return null;
            }
        })(),
        candidates: {
            Connect_getStacksProvider: summarize(candidates.Connect_getStacksProvider),
            window_StacksProvider: summarize(candidates.window_StacksProvider),
            window_BlockstackProvider: summarize(candidates.window_BlockstackProvider),
            window_XverseProviders: summarize(candidates.window_XverseProviders),
        },
    };
};

const dumpAuthDebug = async (reason) => {
    if (!isAuthDebugEnabled()) return;
    let manifestCheck = null;
    try {
        const res = await fetch(CONNECT_AUTH_DEFAULTS.manifestPath, { cache: 'no-store' });
        manifestCheck = { ok: res.ok, status: res.status, contentType: res.headers.get('content-type') };
    } catch (e) {
        manifestCheck = { ok: false, error: e?.message || String(e) };
    }

    const signedIn = userSession.isUserSignedIn();
    const pending = userSession.isSignInPending();

    const debug = {
        reason,
        origin: window.location.origin,
        href: window.location.href,
        visibilityState: document.visibilityState,
        hasFocus: document.hasFocus?.() ?? null,
        userAgent: navigator.userAgent,
        connectDefaults: CONNECT_AUTH_DEFAULTS,
        manifestCheck,
        provider: getProviderSummary(),
        session: {
            isUserSignedIn: signedIn,
            isSignInPending: pending,
            hasUserData: (() => {
                try {
                    return Boolean(userSession.loadUserData());
                } catch {
                    return false;
                }
            })(),
            stxAddress: (() => {
                try {
                    const ud = userSession.loadUserData();
                    return ud?.profile?.stxAddress || null;
                } catch {
                    return null;
                }
            })(),
        },
        localStorageKeys: listInterestingStorageKeys(),
    };

    journeyLog('AUTH DEBUG DUMP', debug);
};

const installGlobalErrorLogging = () => {
    if (window.__authDebugInstalled) return;
    window.__authDebugInstalled = true;

    window.__lastConnectAuthError = null;

    const originalError = console.error.bind(console);
    console.error = (...args) => {
        originalError(...args);
        try {
            if (typeof args?.[0] === 'string' && args[0].includes('[Connect] Error during auth request')) {
                const errObj = args[1];
                window.__lastConnectAuthError = {
                    message: errObj?.message || String(errObj),
                    name: errObj?.name || null,
                };
            }
        } catch {
            // ignore
        }
        if (isAuthDebugEnabled()) journeyLog('[console.error]', { args: safeSerialize(args) });
    };

    const originalWarn = console.warn.bind(console);
    console.warn = (...args) => {
        originalWarn(...args);
        if (isAuthDebugEnabled()) journeyLog('[console.warn]', { args: safeSerialize(args) });
    };

    window.addEventListener('error', (ev) => {
        if (!isAuthDebugEnabled()) return;
        journeyLog('[window.error]', {
            message: ev.message,
            filename: ev.filename,
            lineno: ev.lineno,
            colno: ev.colno,
            error: ev.error ? safeSerialize(ev.error) : null,
        });
    });

    window.addEventListener('unhandledrejection', (ev) => {
        if (!isAuthDebugEnabled()) return;
        journeyLog('[unhandledrejection]', { reason: safeSerialize(ev.reason) });
    });

    window.addEventListener('message', (ev) => {
        if (!isAuthDebugEnabled()) return;
        // Avoid dumping giant payloads; just show origin and a short summary.
        const dataSummary =
            typeof ev.data === 'string'
                ? ev.data.slice(0, 300)
                : safeSerialize(ev.data, 600);
        journeyLog('[window.message]', { origin: ev.origin, data: dataSummary });
    });

    window.addEventListener('focus', () => void dumpAuthDebug('window.focus'));
    window.addEventListener('blur', () => void dumpAuthDebug('window.blur'));
    document.addEventListener('visibilitychange', () => void dumpAuthDebug('visibilitychange'));
    window.addEventListener('storage', (e) => {
        if (!isAuthDebugEnabled()) return;
        if (!e.key) return;
        if (!/(connect|blockstack|stacks|auth|xverse|hiro|leather)/i.test(e.key)) return;
        journeyLog('[storage]', { key: e.key, newValue: (e.newValue || '').slice(0, 200) });
    });
};

journeyLog("App loading...");

const appConfig = new Connect.AppConfig(['store_write', 'publish_data']);
const userSession = new Connect.UserSession({ appConfig });

// HIRO API ACCESS
// Hiro endpoints often do not include CORS headers for browser clients. This app supports a same-origin
// proxy mode (recommended) so reads work reliably in the viewer grid.
//
// Dev proxy is configured in `vite.config.js`:
// - `${location.origin}/hiro-testnet` → `https://api.testnet.hiro.so`
// - `${location.origin}/hiro-mainnet` → `https://api.hiro.so`
//
// Before public launch, you can:
// - Keep `useProxy: true` but provide a reverse proxy on your production host, OR
// - Switch to direct Hiro URLs (may fail in browsers due to CORS).
const HIRO_API = {
    useProxy: true,
    proxyPaths: { testnet: '/hiro-testnet', mainnet: '/hiro-mainnet' },
    direct: {
        testnet: 'https://api.testnet.hiro.so',
        mainnetCandidates: ['https://api.hiro.so', 'https://api.mainnet.hiro.so'],
    },
};

const resolveHiroBaseUrl = (which) => {
    if (HIRO_API.useProxy) return `${window.location.origin}${HIRO_API.proxyPaths[which]}`;
    return which === 'testnet' ? HIRO_API.direct.testnet : HIRO_API.direct.mainnetCandidates[0];
};

const network = new StacksTestnet({ url: resolveHiroBaseUrl('testnet') });

journeyLog("Network configured", { url: network.coreApiUrl });

// AUTH STATUS UI
const setAuthStatus = (message, tone = 'info') => {
    const el = document.getElementById('auth-status');
    if (!el) return;
    el.className = `status ${tone}`;
    el.innerText = message || '';
};

// MINT UI HELPERS
const MICROSTX_PER_STX = 1_000_000;
const getFeePerTxMicroStx = () => {
    const el = document.getElementById('fee-per-tx');
    const raw = el ? Number(el.value) : NaN;
    const fee = Number.isFinite(raw) && raw >= 0 ? Math.floor(raw) : 500_000;
    return fee;
};
const isSafeModeEnabled = () => Boolean(document.getElementById('toggle-safe-mode')?.checked);
const formatMicroStx = (micro) => `${(micro / MICROSTX_PER_STX).toFixed(6)} STX`;
const formatInt = (n) => new Intl.NumberFormat().format(n);

// MINT PREVIEW SETTINGS
// NOTE: HTML preview can execute scripts; keep this enabled for local/dev only.
// Before public launch, set `enabled` to false (or tighten `sandbox`).
const MINT_HTML_PREVIEW = {
    enabled: true,
    sandbox: 'allow-scripts allow-same-origin',
};

let currentFileMeta = { name: null, size: 0 };
let lastInscriptionId = null;
let networkFeeRateMicroPerByte = null;
let mainnetFeeRateMicroPerByte = null;
let lastFeeRateFetch = { current: null, mainnet: null };

const MAINNET_CORE_API_CANDIDATES = HIRO_API.useProxy
    ? [resolveHiroBaseUrl('mainnet')]
    : HIRO_API.direct.mainnetCandidates;

const renderMintGuidance = () => {
    const el = document.getElementById('mint-guidance');
    if (!el) return;
    el.innerText =
        'Large inscriptions require many sequential wallet signatures. Keep the wallet open, avoid refreshing, and consider smaller files if you see wallet “internal error” or repeated cancels. If interrupted, use Resume with the Inscription ID.';
};

const estimateTxCounts = (chunkCount, missingCount = null) => {
    const begin = missingCount === null ? 1 : 0; // resume assumes begin already happened
    const uploads = missingCount === null ? chunkCount : missingCount;
    const seal = 1;
    const total = begin + uploads + seal;
    return { begin, uploads, seal, total };
};

const estimateTxBytes = {
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

const fetchFeeRateWithFallback = async (label, baseUrls) => {
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

const renderFeeEstimates = (context = { mode: 'mint', missingCount: null }) => {
    const el = document.getElementById('fee-estimates');
    if (!el) return;

    const feePerTx = getFeePerTxMicroStx();
    const { total } = estimateTxCounts(currentChunks.length, context.missingCount);
    const fixedTotal = feePerTx * total;
    const hasFile = currentChunks.length > 0;

    const updatedAgo = (t) => {
        if (!t) return null;
        const sec = Math.max(0, Math.round((Date.now() - t) / 1000));
        return sec < 60 ? `${sec}s` : `${Math.round(sec / 60)}m`;
    };

    let feeRateLine = hasFile
        ? 'Current network fee-rate estimate: not loaded (click “Fetch Fee Rates”)'
        : 'Select a file to see per-file fee estimates.';
    if (Number.isFinite(networkFeeRateMicroPerByte) && networkFeeRateMicroPerByte > 0) {
        const bytesUploads = (context.missingCount === null)
            ? currentChunks.reduce((sum, c) => sum + estimateTxBytes.addChunk(c.length), 0)
            : null; // computed in resume UI where we know missing indices
        const bytesBegin = context.missingCount === null ? estimateTxBytes.begin : 0;
        const bytesSeal = estimateTxBytes.seal;
        const bytesTotal = bytesUploads !== null ? (bytesBegin + bytesUploads + bytesSeal) : null;
        if (bytesTotal !== null) {
            const micro = Math.ceil(bytesTotal * networkFeeRateMicroPerByte);
            feeRateLine = `Current network fee-rate estimate: ${formatMicroStx(micro)} (rate ${networkFeeRateMicroPerByte} microSTX/byte${lastFeeRateFetch.current ? `, updated ${updatedAgo(lastFeeRateFetch.current)} ago` : ''})`;
        } else {
            feeRateLine = `Current network fee-rate loaded: ${networkFeeRateMicroPerByte} microSTX/byte${lastFeeRateFetch.current ? ` (updated ${updatedAgo(lastFeeRateFetch.current)} ago)` : ''}`;
        }
    }

    let mainnetFeeLine = hasFile ? 'Mainnet fee-rate estimate: not loaded' : '';
    if (Number.isFinite(mainnetFeeRateMicroPerByte) && mainnetFeeRateMicroPerByte > 0) {
        let src = null;
        try {
            src = localStorage.getItem('fee-rate:mainnetSource');
        } catch {
            src = null;
        }
        const bytesUploads = (context.missingCount === null)
            ? currentChunks.reduce((sum, c) => sum + estimateTxBytes.addChunk(c.length), 0)
            : null;
        const bytesBegin = context.missingCount === null ? estimateTxBytes.begin : 0;
        const bytesSeal = estimateTxBytes.seal;
        const bytesTotal = bytesUploads !== null ? (bytesBegin + bytesUploads + bytesSeal) : null;
        if (bytesTotal !== null) {
            const micro = Math.ceil(bytesTotal * mainnetFeeRateMicroPerByte);
            mainnetFeeLine = `Mainnet fee-rate estimate: ${formatMicroStx(micro)} (rate ${mainnetFeeRateMicroPerByte} microSTX/byte${src ? `, source ${src}` : ''}${lastFeeRateFetch.mainnet ? `, updated ${updatedAgo(lastFeeRateFetch.mainnet)} ago` : ''})`;
        } else {
            mainnetFeeLine = `Mainnet fee-rate loaded: ${mainnetFeeRateMicroPerByte} microSTX/byte${src ? ` (source ${src})` : ''}${lastFeeRateFetch.mainnet ? ` (updated ${updatedAgo(lastFeeRateFetch.mainnet)} ago)` : ''}`;
        }
    }

    el.innerHTML = `
        <div><strong>Transactions required:</strong> ~${formatInt(total)} (${context.missingCount === null ? 'begin + chunks + seal' : 'missing chunks + seal'})</div>
        <div><strong>Configured fee/tx:</strong> ${formatMicroStx(feePerTx)} (${formatInt(feePerTx)} microSTX)</div>
        <div><strong>Configured total:</strong> ${formatMicroStx(fixedTotal)} for ~${formatInt(total)} tx</div>
        <div>${feeRateLine}</div>
        ${mainnetFeeLine ? `<div>${mainnetFeeLine}</div>` : ''}
    `;
};

const maybeFetchFeeRates = async ({ maxAgeMs = 60_000 } = {}) => {
    const now = Date.now();
    const currentAge = lastFeeRateFetch.current ? now - lastFeeRateFetch.current : Infinity;
    const mainnetAge = lastFeeRateFetch.mainnet ? now - lastFeeRateFetch.mainnet : Infinity;
    const shouldFetch =
        currentAge > maxAgeMs ||
        mainnetAge > maxAgeMs ||
        !Number.isFinite(networkFeeRateMicroPerByte) ||
        !Number.isFinite(mainnetFeeRateMicroPerByte);
    if (!shouldFetch) return false;

    try {
        const current = await fetchFeeRateWithFallback('current', [network.coreApiUrl]);
        const mainnet = await fetchFeeRateWithFallback('mainnet', MAINNET_CORE_API_CANDIDATES);

        networkFeeRateMicroPerByte = current.rate;
        mainnetFeeRateMicroPerByte = mainnet.rate;
        lastFeeRateFetch = { current: now, mainnet: now };
        try {
            localStorage.setItem('fee-rate:lastFetch', JSON.stringify(lastFeeRateFetch));
            localStorage.setItem('fee-rate:current', String(current.rate));
            localStorage.setItem('fee-rate:mainnet', String(mainnet.rate));
            localStorage.setItem('fee-rate:mainnetSource', mainnet.baseUrl);
        } catch {
            // ignore
        }
        journeyLog('Fee rates auto-updated', {
            currentNetwork: { baseUrl: current.baseUrl, microSTXPerByte: current.rate },
            mainnet: { baseUrl: mainnet.baseUrl, microSTXPerByte: mainnet.rate },
        });
        return true;
    } catch (e) {
        journeyLog('Fee rates auto-update failed', { error: e?.message || String(e) });
        return false;
    }
};

const renderMintProgress = (msg) => {
    const el = document.getElementById('mint-progress');
    if (!el) return;
    el.innerHTML = msg || '';
};

const getErrorMessage = (e) => {
    if (!e) return 'Unknown error';
    if (typeof e === 'string') return e;
    if (e instanceof Error) return e.message || e.name || 'Error';
    try {
        return JSON.stringify(e);
    } catch {
        return String(e);
    }
};

const escapeHtml = (s) =>
    String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const isRateLimitError = (e) => {
    const msg = getErrorMessage(e);
    return /(^|\b)(429)(\b|$)/.test(msg) || /Response\s+429/.test(msg) || /Too Many Requests/i.test(msg);
};

async function callReadOnlyFunctionWithRetry(opts, { retries = 3, baseDelayMs = 400 } = {}) {
    let lastErr = null;
    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            return await callReadOnlyFunction(opts);
        } catch (e) {
            lastErr = e;
            const msg = getErrorMessage(e);
            journeyLog('Read-only call failed', { attempt, error: msg, functionName: opts.functionName });
            // If the upstream is rate limiting us (429), do not hammer it with retries here.
            // Higher-level callers (like the gallery scheduler) can pause and retry later.
            if (isRateLimitError(e)) break;
            if (attempt >= retries) break;
            const delay = baseDelayMs * Math.pow(2, attempt);
            await sleep(delay);
        }
    }
    throw lastErr || new Error('Read-only call failed');
}

const persistLastInscription = (id) => {
    lastInscriptionId = id;
    try {
        localStorage.setItem('last-inscription-id', String(id));
    } catch {
        // ignore
    }
};

const restoreLastInscription = () => {
    try {
        const raw = localStorage.getItem('last-inscription-id');
        if (!raw) return null;
        const id = Number(raw);
        return Number.isFinite(id) ? id : null;
    } catch {
        return null;
    }
};

const CONNECT_AUTH_DEFAULTS = {
    redirectTo: '/',
    manifestPath: '/manifest.json',
};

async function checkManifestAvailable() {
    try {
        const res = await fetch(CONNECT_AUTH_DEFAULTS.manifestPath, { cache: 'no-store' });
        if (!res.ok) return false;
        const json = await res.json();
        return Boolean(json && typeof json === 'object');
    } catch {
        return false;
    }
}

// CONTRACT CONFIG
let cachedContractInput = null;
let cachedContractDetails = null;
const getContractDetails = ({ silent = false } = {}) => {
    const raw = document.getElementById('contract-address-input')?.value || '';
    const input = raw.replace(/\s/g, '');
    if (cachedContractDetails && cachedContractInput === input) return cachedContractDetails;

    const parts = input.split('.');
    if (parts.length !== 2) {
        if (!silent) journeyLog("ERROR: Invalid contract address format", { input });
        throw new Error("Invalid Address Format. Expected: ADDRESS.CONTRACT_NAME");
    }
    const details = { address: parts[0], name: parts[1] };
    cachedContractInput = input;
    cachedContractDetails = details;
    if (!silent) journeyLog("Contract details parsed", details);
    return details;
};

const CONTRACT_SOURCE = `
(define-constant ERR-NOT-AUTHORIZED (err u100))
(define-constant ERR-ALREADY-SEALED (err u101))
(define-constant ERR-NOT-FOUND (err u102))
(define-constant ERR-INVALID-CHUNK (err u103))
(define-constant MAX-CHUNK-SIZE u8192)
(define-data-var next-id uint u0)
(define-map Inscriptions uint { owner: principal, mime-type: (string-ascii 64), total-size: uint, chunk-count: uint, sealed: bool, merkle-root: (buff 32) })
(define-map Chunks { id: uint, index: uint } (buff 8192))
(define-public (begin-inscription (mime (string-ascii 64)) (total-size uint) (chunk-count uint))
    (let ((id (var-get next-id)))
        (map-insert Inscriptions id { owner: tx-sender, mime-type: mime, total-size: total-size, chunk-count: chunk-count, sealed: false, merkle-root: 0x00 })
        (var-set next-id (+ id u1))
        (ok id)))
(define-public (add-chunk (id uint) (index uint) (data (buff 8192)))
    (let ((meta (unwrap! (map-get? Inscriptions id) ERR-NOT-FOUND)))
        (asserts! (is-eq tx-sender (get owner meta)) ERR-NOT-AUTHORIZED)
        (asserts! (not (get sealed meta)) ERR-ALREADY-SEALED)
        (asserts! (< index (get chunk-count meta)) ERR-INVALID-CHUNK)
        (asserts! (map-insert Chunks {id: id, index: index} data) (err u105))
        (ok true)))
(define-public (seal-inscription (id uint) (root (buff 32)))
    (let ((meta (unwrap! (map-get? Inscriptions id) ERR-NOT-FOUND)))
        (asserts! (is-eq tx-sender (get owner meta)) ERR-NOT-AUTHORIZED)
        (asserts! (not (get sealed meta)) ERR-ALREADY-SEALED)
        (map-set Inscriptions id (merge meta { sealed: true, merkle-root: root }))
        (ok true)))
(define-read-only (get-inscription (id uint)) (map-get? Inscriptions id))
(define-read-only (get-chunk (id uint) (index uint)) (map-get? Chunks {id: id, index: index}))
`;

let currentChunks = [];
let currentRoot = null;
let currentMimeType = "application/octet-stream";
let currentFileObjectUrl = null;

renderMintGuidance();
renderFeeEstimates();

function setMintFilePanelVisible(visible) {
    const panel = document.getElementById('mint-file-panel');
    if (!panel) return;
    panel.classList.toggle('hidden', !visible);
}

function clearMintFilePreview() {
    const el = document.getElementById('mint-file-preview');
    if (el) el.innerHTML = '';
    const stats = document.getElementById('mint-file-stats');
    if (stats) stats.innerHTML = '';
    setMintFilePanelVisible(false);
    if (currentFileObjectUrl) {
        try {
            URL.revokeObjectURL(currentFileObjectUrl);
        } catch {
            // ignore
        }
        currentFileObjectUrl = null;
    }
}

function computeMintByteEstimate({ missingIndices = null, includeBegin = true } = {}) {
    const bytesBegin = includeBegin ? estimateTxBytes.begin : 0;
    const bytesSeal = estimateTxBytes.seal;
    const chunks = missingIndices ? missingIndices.map((i) => currentChunks[i]).filter(Boolean) : currentChunks;
    const bytesUploads = chunks.reduce((sum, c) => sum + estimateTxBytes.addChunk(c.length), 0);
    return { bytesBegin, bytesUploads, bytesSeal, bytesTotal: bytesBegin + bytesUploads + bytesSeal };
}

function renderMintFileStats() {
    const statsEl = document.getElementById('mint-file-stats');
    if (!statsEl) return;
    if (!currentFileMeta?.name || !currentChunks.length || !currentRoot) {
        statsEl.innerHTML = '';
        return;
    }

    const chunkCount = currentChunks.length;
    const lastChunkSize = currentChunks[currentChunks.length - 1]?.length ?? 0;
    const { total } = estimateTxCounts(chunkCount);
    const configuredFeePerTx = getFeePerTxMicroStx();
    const configuredTotal = configuredFeePerTx * total;
    const rootHex = `0x${bufToHex(currentRoot)}`;
    const bytesEstimate = computeMintByteEstimate({ includeBegin: true }).bytesTotal;

    const costAtRate = (rate) => {
        if (!Number.isFinite(rate) || rate <= 0) return null;
        return Math.ceil(bytesEstimate * rate);
    };

    const currentRateCost = costAtRate(networkFeeRateMicroPerByte);
    const mainnetRateCost = costAtRate(mainnetFeeRateMicroPerByte);

    const stxAddress = (() => {
        try {
            const ud = userSession.loadUserData();
            return ud?.profile?.stxAddress?.testnet || ud?.profile?.stxAddress?.mainnet || null;
        } catch {
            return null;
        }
    })();

    statsEl.innerHTML = `
        <div class="k">File</div><div class="v">${currentFileMeta.name}</div>
        <div class="k">MIME</div><div class="v">${currentMimeType || 'unknown'}</div>
        <div class="k">Size</div><div class="v">${formatInt(currentFileMeta.size)} bytes</div>
        <div class="k">Chunks</div><div class="v">${formatInt(chunkCount)} (8192 bytes max, last ${formatInt(lastChunkSize)} bytes)</div>
        <div class="k">Merkle root</div><div class="v">${rootHex}</div>
        <div class="k">Tx required</div><div class="v">~${formatInt(total)} (begin + ${formatInt(chunkCount)} chunk tx + seal)</div>
        <div class="k">Safe mode</div><div class="v">${isSafeModeEnabled() ? 'ON (waits for confirmation)' : 'OFF (faster, more resume risk)'}</div>
        <div class="k">Configured fee/tx</div><div class="v">${formatMicroStx(configuredFeePerTx)} (${formatInt(configuredFeePerTx)} microSTX)</div>
        <div class="k">Configured total</div><div class="v">${formatMicroStx(configuredTotal)} for ~${formatInt(total)} tx</div>
        <div class="k">Est. tx bytes</div><div class="v">~${formatInt(bytesEstimate)} bytes (rough)</div>
        <div class="k">Current fee-rate total</div><div class="v">${currentRateCost !== null ? `${formatMicroStx(currentRateCost)} (rate ${networkFeeRateMicroPerByte} microSTX/byte)` : 'not loaded (Fetch Fee Rates)'}</div>
        <div class="k">Mainnet fee-rate total</div><div class="v">${mainnetRateCost !== null ? `${formatMicroStx(mainnetRateCost)} (rate ${mainnetFeeRateMicroPerByte} microSTX/byte)` : 'not loaded (Fetch Fee Rates)'}</div>
        <div class="k">Resume hint</div><div class="v">Your ID appears after Step 1; it’s auto-saved and pre-filled for Resume.</div>
        <div class="k">Signer</div><div class="v">${stxAddress ? stxAddress : 'Not connected'}</div>
    `;
}

function renderMintFilePreview(file) {
    const previewEl = document.getElementById('mint-file-preview');
    if (!previewEl) return;
    previewEl.innerHTML = '';

    if (currentFileObjectUrl) {
        try {
            URL.revokeObjectURL(currentFileObjectUrl);
        } catch {
            // ignore
        }
        currentFileObjectUrl = null;
    }
    try {
        currentFileObjectUrl = URL.createObjectURL(file);
    } catch {
        currentFileObjectUrl = null;
    }

    const mime = file.type || currentMimeType || '';
    const lowerName = (file.name || '').toLowerCase();
    const isHtml = mime === 'text/html' || lowerName.endsWith('.html') || lowerName.endsWith('.htm');
    const safeLink = currentFileObjectUrl
        ? `<div style="margin-top:8px; font-size:12px;"><a href="${currentFileObjectUrl}" download="${file.name}">Download / open</a></div>`
        : '';

    if (mime.startsWith('image/') && currentFileObjectUrl) {
        previewEl.innerHTML = `<img src="${currentFileObjectUrl}" alt="preview" style="max-width:100%; height:auto; border-radius:6px;">${safeLink}`;
        return;
    }
    if (mime.startsWith('audio/') && currentFileObjectUrl) {
        previewEl.innerHTML = `<audio controls style="width:100%;" src="${currentFileObjectUrl}"></audio>${safeLink}`;
        return;
    }
    if (mime.startsWith('video/') && currentFileObjectUrl) {
        previewEl.innerHTML = `<video controls style="width:100%; max-height:260px;" src="${currentFileObjectUrl}"></video>${safeLink}`;
        return;
    }

    if (isHtml && currentFileObjectUrl) {
        if (!MINT_HTML_PREVIEW.enabled) {
            previewEl.innerHTML = `
                <div style="font-size:12px; color:#856404;">
                    HTML preview is disabled. Download/open the file instead.
                </div>
                ${safeLink}
            `;
            return;
        }

        const iframe = document.createElement('iframe');
        iframe.src = currentFileObjectUrl;
        iframe.style.width = '100%';
        iframe.style.height = '320px';
        iframe.style.border = '1px solid #eee';
        iframe.style.borderRadius = '6px';
        iframe.setAttribute('sandbox', MINT_HTML_PREVIEW.sandbox);

        const note = document.createElement('div');
        note.style.marginTop = '8px';
        note.style.fontSize = '12px';
        note.style.color = '#555';
        note.innerText = 'HTML preview is rendered in an iframe. Relative assets may not load unless they are bundled inline.';

        previewEl.appendChild(iframe);
        previewEl.appendChild(note);
        if (safeLink) {
            const linkWrap = document.createElement('div');
            linkWrap.innerHTML = safeLink;
            previewEl.appendChild(linkWrap);
        }
        return;
    }

    // Fallback: show basic info + link
    previewEl.innerHTML = `
        <div style="font-size:12px; color:#555;">
            No inline preview for <strong>${mime || 'unknown type'}</strong>.
        </div>
        ${safeLink}
    `;
}

function guessMimeTypeFromName(name) {
    const n = (name || '').toLowerCase();
    if (n.endsWith('.html') || n.endsWith('.htm')) return 'text/html';
    if (n.endsWith('.json')) return 'application/json';
    if (n.endsWith('.txt')) return 'text/plain';
    if (n.endsWith('.svg')) return 'image/svg+xml';
    return null;
}

async function handleSelectedFile(file) {
    if (!file) return;
    clearMintFilePreview();
    journeyLog(`File selected: ${file.name} (${file.size} bytes)`);
    currentFileMeta = { name: file.name, size: file.size };
    currentMimeType = file.type || guessMimeTypeFromName(file.name) || "application/octet-stream";
    journeyLog(`Detected MIME: ${currentMimeType}`);
    
    const buf = await file.arrayBuffer();
    journeyLog("File read into ArrayBuffer. Starting chunking...");
    
    currentChunks = chunkFile(buf);
    journeyLog(`File chunked into ${currentChunks.length} pieces.`);
    
    currentRoot = computeMerkleRoot(currentChunks);
    journeyLog("Merkle Root calculated", { root: bufToHex(currentRoot) });
    
    document.getElementById('mint-steps').innerHTML = `File: ${file.name} (${formatInt(file.size)} bytes) | Chunks: ${currentChunks.length} | Root: 0x${bufToHex(currentRoot)}`;
    document.getElementById('btn-start-mint').classList.remove('hidden');
    setMintFilePanelVisible(true);
    renderMintFilePreview(file);
    renderMintFileStats();
    void maybeFetchFeeRates({ maxAgeMs: 60_000 }).then((updated) => {
        if (updated) {
            renderFeeEstimates({ mode: 'mint', missingCount: null });
            renderMintFileStats();
        }
    });
    renderFeeEstimates({ mode: 'mint', missingCount: null });
    const restored = restoreLastInscription();
    if (restored !== null) {
        document.getElementById('resume-id-input').value = restored;
        renderMintProgress(`<div><strong>Last Inscription ID:</strong> #${restored} (pre-filled for resume)</div>`);
    }
}

// UI Logic
window.showPage = (page) => {
    journeyLog(`Switching to page: ${page}`);
    document.querySelectorAll('[id^="page-"]').forEach(el => el.classList.add('hidden'));
    document.getElementById(`page-${page}`).classList.remove('hidden');

    if (page === 'mint') {
        void maybeFetchFeeRates({ maxAgeMs: 60_000 }).then((updated) => {
            if (updated) renderFeeEstimates({ mode: 'mint', missingCount: null });
        });
    }

    if (page === 'play') {
        // Default to showing the first page of inscriptions.
        void renderGalleryPage(viewerGalleryPage || 0);
    }

    if (page === 'mint' && !userSession.isUserSignedIn()) {
        const mintEl = document.getElementById('mint-steps');
        if (mintEl && !mintEl.innerText.trim()) {
            mintEl.innerHTML = `
                <div style="background:#fff3cd; padding:10px; border-radius:5px; color:#856404;">
                    Connect your wallet to inscribe. Viewing inscriptions works without a wallet.
                </div>
            `;
        }
    }
};

const updateUI = () => {
    const signedIn = userSession.isUserSignedIn();
    journeyLog(`Updating UI. User signed in: ${signedIn}`);
    if (signedIn) {
        const userData = userSession.loadUserData();
        const addr = userData?.profile?.stxAddress?.testnet || userData?.profile?.stxAddress?.mainnet || 'Unknown address';
        journeyLog(`User address: ${addr}`);
        document.getElementById('address-display').innerText = `Connected: ${addr}`;
        document.getElementById('connect-wallet').classList.add('hidden');
        document.getElementById('disconnect-wallet').classList.remove('hidden');
        setAuthStatus('Wallet connected. You can deploy and inscribe.', 'ok');
    } else {
        document.getElementById('address-display').innerText = '';
        document.getElementById('connect-wallet').classList.remove('hidden');
        document.getElementById('disconnect-wallet').classList.add('hidden');
        setAuthStatus('Not connected. Viewing works without a wallet, but deploying and inscribing require connecting.', 'info');
    }
};

// INITIALIZE AUTH + UI
async function initAuthAndUI() {
    installGlobalErrorLogging();

    // Restore persisted fee setting (if any)
    try {
        const storedFee = localStorage.getItem('fee-per-tx');
        if (storedFee && document.getElementById('fee-per-tx')) {
            const n = Number(storedFee);
            if (Number.isFinite(n) && n >= 0) document.getElementById('fee-per-tx').value = String(Math.floor(n));
        }
    } catch {
        // ignore
    }

    // Restore cached fee rates (if any) so Mint estimates show something immediately.
    try {
        const currentRate = Number(localStorage.getItem('fee-rate:current'));
        const mainnetRate = Number(localStorage.getItem('fee-rate:mainnet'));
        const lastFetchRaw = localStorage.getItem('fee-rate:lastFetch');
        const lastFetch = lastFetchRaw ? JSON.parse(lastFetchRaw) : null;
        if (Number.isFinite(currentRate) && currentRate > 0) networkFeeRateMicroPerByte = currentRate;
        if (Number.isFinite(mainnetRate) && mainnetRate > 0) mainnetFeeRateMicroPerByte = mainnetRate;
        if (lastFetch && typeof lastFetch === 'object') lastFeeRateFetch = lastFetch;
    } catch {
        // ignore
    }

    const stacksWalletInstalled = Connect.isStacksWalletInstalled();
    if (!stacksWalletInstalled) {
        setAuthStatus(
            'No Stacks wallet provider detected in this browser. Install Xverse (extension) or Leather, then refresh. Logging into a web wallet alone does not connect to this app.',
            'warn'
        );
    }

    const manifestOk = await checkManifestAvailable();
    if (!manifestOk) {
        setAuthStatus(
            'Missing `/manifest.json`. Wallet authentication will fail until it is available at the site root.',
            'error'
        );
    }

    await dumpAuthDebug('init');

    if (userSession.isSignInPending()) {
        journeyLog("Auth sign-in pending. Completing...");
        setAuthStatus('Completing wallet sign-in...', 'info');
        try {
            await userSession.handlePendingSignIn();
            journeyLog("Auth pending sign-in completed.");
        } catch (e) {
            journeyLog("Auth pending sign-in failed", { error: e?.message || String(e) });
            setAuthStatus('Sign-in failed. Please try connecting your wallet again.', 'error');
        }
    }
    updateUI();
}
void initAuthAndUI();

// AUTH HANDLERS
document.getElementById('connect-wallet').addEventListener('click', () => {
    journeyLog("User clicked 'Connect Wallet'");
    setAuthStatus('Opening wallet connect...', 'info');
    void dumpAuthDebug('connect click (before showConnect)');

    // If a stale/invalid selected provider is stored, force the modal to re-select.
    try {
        const provider = Connect.getStacksProvider?.();
        const hasAuth = provider && typeof provider.authenticationRequest === 'function';
        const selectedId = getSelectedProviderId();
        if (selectedId && !hasAuth) {
            journeyLog('Auth debug: selected provider is missing authenticationRequest; clearing STX_PROVIDER to force reselection.', {
                selectedProviderId: selectedId,
                providerKeys: provider ? Object.keys(provider).slice(0, 20) : null,
            });
            clearSelectedProviderId();
        }
    } catch (e) {
        journeyLog('Auth debug: provider inspection failed', { error: e?.message || String(e) });
    }

    // Prefer using the detected provider directly; if missing, let Connect UI pick.
    let provider = null;
    try {
        provider = Connect.getStacksProvider?.() || null;
        if (provider && isAuthDebugEnabled()) {
            provider = wrapProviderForDebug(provider, 'StacksProvider');
        }
    } catch (e) {
        journeyLog('Auth debug: failed to acquire provider for showConnect', { error: e?.message || String(e) });
        provider = null;
    }

    const connectOptions = {
        ...CONNECT_AUTH_DEFAULTS,
        appDetails: { name: 'Stacks Inscription Proto', icon: window.location.origin + '/vite.svg' },
        userSession,
        onFinish: () => {
            journeyLog("Auth onFinish triggered");
            updateUI();
            void dumpAuthDebug('connect onFinish');
        },
        onCancel: () => {
            journeyLog("Auth onCancel triggered");
            const lastErr = window.__lastConnectAuthError;
            if (lastErr?.message) {
                setAuthStatus(`Wallet connect failed: ${lastErr.message}`, 'error');
            } else {
                setAuthStatus('Wallet connection canceled. Connect to deploy or inscribe.', 'warn');
            }
            void dumpAuthDebug('connect onCancel');
        }
    };

    if (provider) Connect.showConnect(connectOptions, provider);
    else Connect.showConnect(connectOptions);
});

document.getElementById('disconnect-wallet').addEventListener('click', () => {
    journeyLog("User clicked 'Disconnect Wallet'");
    userSession.signUserOut();
    updateUI();
    setAuthStatus('Disconnected.', 'info');
});

const ensureAuth = async ({ action } = {}) => {
    journeyLog("Ensuring auth before action...", { action: action || 'unknown' });
    if (userSession.isUserSignedIn()) {
        journeyLog("Auth verified.");
        return;
    }

    void dumpAuthDebug(`ensureAuth start (${action || 'unknown'})`);

    if (!Connect.isStacksWalletInstalled()) {
        setAuthStatus(
            action
                ? `Wallet provider not detected. Install Xverse (extension) or Leather to ${action}, then refresh.`
                : 'Wallet provider not detected. Install Xverse (extension) or Leather, then refresh.',
            'warn'
        );
    }

    setAuthStatus(action ? `Connect your wallet to ${action}.` : 'Connect your wallet to continue.', 'warn');
    journeyLog("Auth missing. Redirecting to connect...");

    return new Promise((resolve, reject) => {
        Connect.showConnect({
            ...CONNECT_AUTH_DEFAULTS,
            appDetails: { name: 'Stacks Inscription Proto', icon: window.location.origin + '/vite.svg' },
            userSession,
            onFinish: () => {
                journeyLog("Auth onFinish (ensureAuth) triggered");
                updateUI();
                void dumpAuthDebug(`ensureAuth onFinish (${action || 'unknown'})`);
                resolve();
            },
            onCancel: () => {
                journeyLog("Auth onCancel (ensureAuth) triggered");
                const lastErr = window.__lastConnectAuthError;
                if (lastErr?.message) {
                    setAuthStatus(`Wallet connect failed: ${lastErr.message}`, 'error');
                } else {
                    setAuthStatus('Wallet connection canceled. Connect to deploy or inscribe.', 'warn');
                }
                void dumpAuthDebug(`ensureAuth onCancel (${action || 'unknown'})`);
                reject(new Error('Wallet connection canceled'));
            }
        });
    });
};

// OPTIONAL: auth monitor (polls for state transitions)
let authMonitorInterval = null;
let authMonitorLastSnapshot = null;

function getAuthMonitorSnapshot() {
    return {
        isStacksWalletInstalled: (() => {
            try {
                return Connect.isStacksWalletInstalled();
            } catch {
                return false;
            }
        })(),
        hasWindowStacksProvider: Boolean(window.StacksProvider),
        hasWindowBlockstackProvider: Boolean(window.BlockstackProvider),
        isUserSignedIn: userSession.isUserSignedIn(),
        isSignInPending: userSession.isSignInPending(),
        storageKeys: listInterestingStorageKeys(),
        visibilityState: document.visibilityState,
        hasFocus: document.hasFocus?.() ?? null,
    };
}

function startAuthMonitor() {
    if (authMonitorInterval) return;
    authMonitorLastSnapshot = null;
    journeyLog('Auth monitor started (polling every 1s).');
    authMonitorInterval = setInterval(() => {
        if (!isAuthDebugEnabled()) return;
        const snap = getAuthMonitorSnapshot();
        const changed = safeSerialize(snap) !== safeSerialize(authMonitorLastSnapshot);
        if (changed) {
            journeyLog('Auth monitor change', snap);
            authMonitorLastSnapshot = snap;
        }
    }, 1000);
}

function stopAuthMonitor() {
    if (!authMonitorInterval) return;
    clearInterval(authMonitorInterval);
    authMonitorInterval = null;
    journeyLog('Auth monitor stopped.');
}

document.getElementById('btn-dump-auth')?.addEventListener('click', () => void dumpAuthDebug('manual dump button'));
document.getElementById('btn-reset-wallet')?.addEventListener('click', () => {
    clearSelectedProviderId();
    journeyLog('Cleared selected wallet provider (STX_PROVIDER).');
    setAuthStatus('Wallet selection reset. Click “Connect Wallet” to choose again.', 'info');
    void dumpAuthDebug('manual reset wallet selection');
});
document.getElementById('btn-toggle-monitor')?.addEventListener('click', (e) => {
    if (!authMonitorInterval) {
        startAuthMonitor();
        e.target.innerText = 'Stop Auth Monitor';
    } else {
        stopAuthMonitor();
        e.target.innerText = 'Start Auth Monitor';
    }
});

// FILE HANDLING
document.getElementById('file-input').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    await handleSelectedFile(file);
    // Allow re-selecting the same file to trigger change again
    e.target.value = '';
});

// DRAG & DROP
(() => {
    const dropZone = document.getElementById('drop-zone');
    if (!dropZone) return;

    const prevent = (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
    };

    const setActive = (active) => {
        dropZone.classList.toggle('active', active);
    };

    // Prevent the browser from opening the file if dropped outside the zone
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach((name) => {
        window.addEventListener(name, prevent);
        document.addEventListener(name, prevent);
    });

    dropZone.addEventListener('dragenter', () => setActive(true));
    dropZone.addEventListener('dragover', () => setActive(true));
    dropZone.addEventListener('dragleave', () => setActive(false));
    dropZone.addEventListener('drop', async (ev) => {
        setActive(false);
        const file = ev.dataTransfer?.files?.[0];
        if (!file) return;
        journeyLog('File dropped into drop zone.', { name: file.name, size: file.size, type: file.type });
        await handleSelectedFile(file);
    });
})();

document.getElementById('fee-per-tx')?.addEventListener('change', () => {
    try {
        localStorage.setItem('fee-per-tx', String(getFeePerTxMicroStx()));
    } catch {
        // ignore
    }
    renderFeeEstimates({ mode: 'mint', missingCount: null });
    renderMintFileStats();
});

document.getElementById('toggle-safe-mode')?.addEventListener('change', () => {
    renderMintProgress(isSafeModeEnabled()
        ? '<div>Safe mode enabled: waits for each transaction to confirm before continuing.</div>'
        : '<div>Safe mode disabled: proceeds after signing; use Resume if chunks are missing.</div>');
    renderMintFileStats();
});

document.getElementById('btn-fetch-fee-rate')?.addEventListener('click', async () => {
    const now = Date.now();
    try {
        const results = await Promise.allSettled([
            fetchFeeRateWithFallback('current', [network.coreApiUrl]),
            fetchFeeRateWithFallback('mainnet', MAINNET_CORE_API_CANDIDATES),
        ]);

        const [currentRes, mainnetRes] = results;
        let hadAny = false;

        if (currentRes.status === 'fulfilled') {
            networkFeeRateMicroPerByte = currentRes.value.rate;
            hadAny = true;
        } else {
            journeyLog('Fee rate fetch failed (current)', { error: currentRes.reason?.message || String(currentRes.reason) });
        }

        if (mainnetRes.status === 'fulfilled') {
            mainnetFeeRateMicroPerByte = mainnetRes.value.rate;
            hadAny = true;
            try {
                localStorage.setItem('fee-rate:mainnetSource', mainnetRes.value.baseUrl);
            } catch {
                // ignore
            }
        } else {
            journeyLog('Fee rate fetch failed (mainnet)', { error: mainnetRes.reason?.message || String(mainnetRes.reason) });
        }

        lastFeeRateFetch = { current: now, mainnet: now };
        try {
            localStorage.setItem('fee-rate:lastFetch', JSON.stringify(lastFeeRateFetch));
            if (Number.isFinite(networkFeeRateMicroPerByte) && networkFeeRateMicroPerByte > 0) {
                localStorage.setItem('fee-rate:current', String(networkFeeRateMicroPerByte));
            }
            if (Number.isFinite(mainnetFeeRateMicroPerByte) && mainnetFeeRateMicroPerByte > 0) {
                localStorage.setItem('fee-rate:mainnet', String(mainnetFeeRateMicroPerByte));
            }
        } catch {
            // ignore
        }

        if (hadAny) {
            journeyLog('Fee rates loaded', { currentNetwork: networkFeeRateMicroPerByte, mainnet: mainnetFeeRateMicroPerByte });
            renderMintProgress('<div>Fee rates updated (current network and/or mainnet).</div>');
        } else {
            renderMintProgress('<div style="color:#856404">Could not fetch fee rates (current or mainnet). Using configured fee/tx.</div>');
        }

        renderFeeEstimates({ mode: 'mint', missingCount: null });
        renderMintFileStats();
    } catch (e) {
        journeyLog('Fee rate fetch failed', { error: e?.message || String(e) });
        renderMintProgress('<div style="color:#856404">Could not fetch fee rates; using configured fee/tx.</div>');
        renderFeeEstimates({ mode: 'mint', missingCount: null });
        renderMintFileStats();
    }
});

// DEPLOY ACTION
document.getElementById('btn-deploy-contract').addEventListener('click', async () => {
    journeyLog("User clicked 'Deploy Contract'");
    try {
        await ensureAuth({ action: 'deploy the contract' });
    } catch (e) {
        journeyLog("Deploy blocked (auth not completed)", { error: e?.message || String(e) });
        return;
    }

    const { name } = getContractDetails();
    const deployParams = {
        contractName: name,
        codeBody: CONTRACT_SOURCE,
        network,
        userSession,
    };
    journeyLog("Requesting Contract Deploy...", { contractName: name });
    Connect.openContractDeploy({
        ...deployParams,
        onFinish: (data) => {
            journeyLog("Deploy onFinish", data);
            alert(`Contract Deployed! TX: ${data.txId}`);
        },
        onCancel: () => journeyLog("Deploy onCancel")
    });
});

// HELPER: Promisified Contract Call
function openContractCallWrapper(options) {
    return new Promise((resolve, reject) => {
        const fee = options.fee ?? getFeePerTxMicroStx();
        Connect.openContractCall({
            ...options,
            fee, // microSTX
            onFinish: (data) => resolve(data),
            onCancel: () => reject(new Error("User cancelled transaction")),
        });
    });
}

// HELPER: Poll for Transaction Confirmation
async function waitForTransactionSuccess(txId, { timeoutMs = 10 * 60 * 1000, pollMs = 5000 } = {}) {
    journeyLog(`Polling for TX: ${txId}`);
    const apiUrl = network.coreApiUrl; // e.g. https://api.testnet.hiro.so
    
    return new Promise((resolve, reject) => {
        const started = Date.now();
        const interval = setInterval(async () => {
            if (Date.now() - started > timeoutMs) {
                clearInterval(interval);
                reject(new Error(`Timed out waiting for TX confirmation: ${txId}`));
                return;
            }
            try {
                const res = await fetch(`${apiUrl}/extended/v1/tx/${txId}`);
                if (res.ok) {
                    const data = await res.json();
                    if (data.tx_status === 'success') {
                        clearInterval(interval);
                        resolve(data);
                    } else if (data.tx_status === 'abort_by_response' || data.tx_status === 'abort_by_post_condition') {
                        clearInterval(interval);
                        reject(new Error(`Transaction failed: ${data.tx_status}`));
                    }
                    // If 'pending', continue polling
                }
            } catch (e) {
                console.error("Polling error:", e);
            }
        }, pollMs); // Poll interval
    });
}

// THE MINT ACTION
document.getElementById('btn-start-mint').addEventListener('click', async () => {
    journeyLog("User clicked 'Begin Inscription'");
    if (!currentChunks.length) {
        journeyLog("ABORT: No file chunks available.");
        return alert("Please select a file first.");
    }
    
    const statusEl = document.getElementById('mint-steps');
    try {
        await ensureAuth({ action: 'inscribe a file' });
    } catch (e) {
        journeyLog("Mint blocked (auth not completed)", { error: e?.message || String(e) });
        statusEl.innerHTML += `
            <div style="background:#fff3cd; padding:15px; border-radius:5px; color:#856404; margin-top:10px;">
                <h3 style="margin-top:0">Wallet Required</h3>
                <p>Connect your wallet to start an inscription. You can still view existing inscriptions without connecting.</p>
            </div>
        `;
        return;
    }

    try {
        const { address, name } = getContractDetails();
        const txCounts = estimateTxCounts(currentChunks.length);
        const feePerTx = getFeePerTxMicroStx();
        renderMintProgress(`
            <div><strong>Ready to mint.</strong> Save your ID when it appears.</div>
            <div><strong>Expected signatures:</strong> ~${formatInt(txCounts.total)} transactions</div>
            <div><strong>Configured fee:</strong> ${formatMicroStx(feePerTx)} per tx (estimated total ${formatMicroStx(feePerTx * txCounts.total)})</div>
            <div style="color:#856404">Tip: For large files, keep Xverse open and do not refresh. If you stop mid-way, use Resume with the ID.</div>
        `);
        const args = [ 
            stringAsciiCV(currentMimeType), 
            uintCV(currentFileMeta?.size || (currentChunks.reduce((sum, c) => sum + c.length, 0))), 
            uintCV(currentChunks.length) 
        ];
        
        statusEl.innerHTML = `
            <div style="background:#eef; padding:15px; border-radius:5px;">
                <h3 style="margin-top:0">Step 1: Reserve Inscription Slot</h3>
                <p>Creating "Draft" Inscription on-chain...</p>
            </div>
        `;

        const txParams = {
            contractAddress: address,
            contractName: name,
            functionName: 'begin-inscription',
            functionArgs: args,
            network,
            userSession,
            postConditionMode: PostConditionMode.Allow,
            anchorMode: AnchorMode.Any,
        };

        // 1. Send Begin-Inscription
        const txData = await openContractCallWrapper(txParams);
        const txId = txData.txId;
        journeyLog(`Initialization TX sent: ${txId}`);

        statusEl.innerHTML = `
            <div style="background:#fff3cd; padding:15px; border-radius:5px; color:#856404;">
                <h3 style="margin-top:0">Step 1: Confirming...</h3>
                <p><strong>TX:</strong> ${txId}</p>
                <p>Waiting for Inscription ID assignment...</p>
                <div class="spinner" style="border: 4px solid #f3f3f3; border-top: 4px solid #3498db; border-radius: 50%; width: 20px; height: 20px; animation: spin 2s linear infinite; margin: 0 auto;"></div>
            </div>
        `;

        // 2. Poll for success and extract ID
        const txDetails = await waitForTransactionSuccess(txId);
        journeyLog("Initialization Confirmed!", txDetails);
        
        let inscriptionId = null;
        if (txDetails.tx_result.repr.includes('(ok u')) {
             const match = txDetails.tx_result.repr.match(/\(ok u(\d+)\)/);
             if (match && match[1]) inscriptionId = parseInt(match[1]);
        }
        
        if (inscriptionId === null) {
            throw new Error("Could not parse Inscription ID from transaction result.");
        }

        journeyLog(`Auto-detected Inscription ID: ${inscriptionId}`);
        persistLastInscription(inscriptionId);
        const resumeInput = document.getElementById('resume-id-input');
        if (resumeInput) resumeInput.value = inscriptionId;
        renderMintProgress(`
            <div style="background:#d4edda; padding:10px; border-radius:5px; color:#155724;">
                <div><strong>Your Inscription ID:</strong> #${inscriptionId}</div>
                <div style="margin-top:6px;">
                    <button onclick="navigator.clipboard.writeText('${inscriptionId}')" style="background:#28a745; padding:6px 10px; font-size:12px;">Copy ID</button>
                    <span style="margin-left:8px;">Use this ID in “Resume / Retry Inscription”.</span>
                </div>
            </div>
        `);
        
        statusEl.innerHTML = `
            <div style="background:#d4edda; padding:15px; border-radius:5px; color:#155724;">
                <h3 style="margin-top:0">Step 2: Upload Data</h3>
                <p><strong>Draft ID: #${inscriptionId}</strong> ready.</p>
                <p>Starting chunk uploads...</p>
            </div>
        `;

        // 3. Start Chunk Uploads
        await startChunkUploads(inscriptionId, statusEl);

        // 4. Seal Inscription
        await sealInscriptionTransaction(inscriptionId, currentRoot, statusEl);

    } catch (e) {
        journeyLog("Minting Process Error", { error: e.message });
        if (lastInscriptionId !== null) {
            renderMintProgress(`
                <div style="background:#fff3cd; padding:10px; border-radius:5px; color:#856404;">
                    <div><strong>Mint interrupted.</strong></div>
                    <div>Resume with Inscription ID: <strong>#${lastInscriptionId}</strong></div>
                    <div>Mint Mode → “Resume / Retry Inscription” → enter the ID → Check & Resume</div>
                </div>
            `);
        }
        document.getElementById('mint-steps').innerHTML += `
            <div style="background:#f8d7da; padding:15px; border-radius:5px; color:#721c24; margin-top:10px;">
                <h3>Process Paused / Failed</h3>
                <p>${e.message}</p>
                <p>If you cancelled a transaction, you can reload the page to start fresh.</p>
            </div>
        `;
    }
});

// RESUME ACTION
document.getElementById('btn-resume-mint').addEventListener('click', async () => {
    const idInput = document.getElementById('resume-id-input');
    if (!idInput.value) return alert("Please enter an Inscription ID.");
    const id = parseInt(idInput.value);
    
    if (!currentChunks.length) {
        return alert("Please load the ORIGINAL file first so we have the data to upload.");
    }

    journeyLog(`Attempting to resume Inscription ID: ${id}`);
    const statusEl = document.getElementById('resume-status');
    statusEl.innerHTML = "Checking on-chain status... <span class='spinner'>...</span>";
    
    try {
        const { address, name } = getContractDetails();
        
        // 1. Fetch Meta
        const metaRes = await callReadOnlyFunctionWithRetry({
            contractAddress: address, contractName: name,
            functionName: 'get-inscription', functionArgs: [uintCV(id)],
            senderAddress: address, network
        });
        const meta = cvToValue(metaRes);
        if (!meta) throw new Error("Inscription ID not found on-chain.");
        
        const chunkCount = Number(meta.value['chunk-count'].value);
        if (chunkCount !== currentChunks.length) {
             throw new Error(`File Mismatch! On-chain expects ${chunkCount} chunks, but loaded file has ${currentChunks.length}.`);
        }
        
        if (meta.value.sealed.value) {
            statusEl.innerHTML = `<span style="color:green">Inscription #${id} is already SEALED and complete.</span>`;
            return;
        }

        // 2. Check Missing Chunks
        statusEl.innerHTML = "Scanning chunks... (this may take a moment)";
        const missingIndices = [];
        
        for (let i = 0; i < chunkCount; i++) {
            if (i > 0 && i % 10 === 0) {
                statusEl.innerHTML = `Scanning chunks... ${i}/${chunkCount}`;
                await sleep(150);
            }

            const res = await callReadOnlyFunctionWithRetry({
                contractAddress: address, contractName: name,
                functionName: 'get-chunk', functionArgs: [uintCV(id), uintCV(i)],
                senderAddress: address, network
            });
            const val = cvToValue(res);
            
            // Check if chunk exists (val is not null/none)
            if (!val) {
                journeyLog(`Chunk ${i} MISSING.`);
                missingIndices.push(i);
            } else {
                journeyLog(`Chunk ${i} EXISTS.`);
            }
        }
        
        if (missingIndices.length === 0) {
            statusEl.innerHTML = "All chunks found! Ready to seal.";

            try {
                await ensureAuth({ action: 'seal the inscription' });
            } catch (e) {
                journeyLog("Resume blocked (auth not completed)", { error: e?.message || String(e) });
                statusEl.innerHTML = `<span style="color:#856404">Wallet required to seal. Please connect and try again.</span>`;
                return;
            }

            renderFeeEstimates({ mode: 'resume', missingCount: 0 });
            await sealInscriptionTransaction(id, currentRoot, statusEl);
        } else {
            const counts = estimateTxCounts(chunkCount, missingIndices.length);
            statusEl.innerHTML = `Found ${missingIndices.length} missing chunks. This will require ~${counts.total} more transactions (missing uploads + seal).`;

            // Fee-rate estimate for missing chunks (if available)
            if (Number.isFinite(networkFeeRateMicroPerByte) && networkFeeRateMicroPerByte > 0) {
                const bytesUploads = missingIndices.reduce((sum, idx) => sum + estimateTxBytes.addChunk(currentChunks[idx].length), 0);
                const bytesTotal = bytesUploads + estimateTxBytes.seal;
                const micro = Math.ceil(bytesTotal * networkFeeRateMicroPerByte);
                statusEl.innerHTML += `<br><span style="color:#555">Fee-rate estimate remaining: ${formatMicroStx(micro)} (rate ${networkFeeRateMicroPerByte} microSTX/byte)</span>`;
            }
            renderFeeEstimates({ mode: 'resume', missingCount: missingIndices.length });

            try {
                await ensureAuth({ action: 'upload missing chunks and seal the inscription' });
            } catch (e) {
                journeyLog("Resume blocked (auth not completed)", { error: e?.message || String(e) });
                statusEl.innerHTML = `<span style="color:#856404">Wallet required to upload/seal. Please connect and try again.</span>`;
                return;
            }

            statusEl.innerHTML = `Found ${missingIndices.length} missing chunks. Starting uploads...`;
            await startChunkUploads(id, statusEl, missingIndices);
            await sealInscriptionTransaction(id, currentRoot, statusEl);
        }

    } catch (e) {
        journeyLog("Resume Error", e);
        statusEl.innerHTML = `<span style="color:red">Error: ${getErrorMessage(e)}</span>`;
    }
});

async function sealInscriptionTransaction(id, root, statusEl) {
    const { address, name } = getContractDetails();
    statusEl.innerHTML += `
        <div style="background:#eef; padding:10px; border-radius:5px; margin-top:10px;">
            <h3 style="margin-top:0">Step: Seal & Finalize</h3>
            <p>Signing Seal Transaction...</p>
        </div>
    `;
    
    journeyLog("Sealing inscription...", { root: bufToHex(root) });
    const sealTx = await openContractCallWrapper({
        contractAddress: address,
        contractName: name,
        functionName: 'seal-inscription',
        functionArgs: [ uintCV(id), bufferCV(Buffer.from(root)) ],
        network,
        userSession,
        postConditionMode: PostConditionMode.Allow,
        anchorMode: AnchorMode.Any,
    });
    if (sealTx?.txId && isSafeModeEnabled()) {
        await waitForTransactionSuccess(sealTx.txId);
    }

    statusEl.innerHTML += `
        <div style="background:#d4edda; padding:10px; border-radius:5px; color:#155724; margin-top: 10px;">
            <h3 style="margin-top:0">🎉 Inscription #${id} Complete!</h3>
            <button onclick="document.getElementById('manifest-id-input').value = ${id}; showPage('play');" style="background:#28a745; color:white; border:none; padding:10px; cursor:pointer;">View Inscription</button>
        </div>
    `;
}

async function startChunkUploads(id, statusEl, specificIndices = null) {
    journeyLog(`Starting sequential chunk uploads for ID: ${id}`);
    const { address, name } = getContractDetails();
    
    const indicesToUpload = specificIndices || Array.from({length: currentChunks.length}, (_, i) => i);
    const totalToUpload = indicesToUpload.length;

    // Persist basic progress so users can recover the ID and state after refresh.
    try {
        localStorage.setItem(
            `inscription-progress:${id}`,
            JSON.stringify({
                id,
                contract: `${address}.${name}`,
                fileName: currentFileMeta?.name || null,
                fileSize: currentFileMeta?.size || null,
                chunkCount: currentChunks.length,
                mimeType: currentMimeType,
                rootHex: currentRoot ? bufToHex(currentRoot) : null,
                startedAt: new Date().toISOString(),
                safeMode: isSafeModeEnabled(),
            })
        );
    } catch {
        // ignore
    }
    
    for (let n = 0; n < indicesToUpload.length; n++) {
        const i = indicesToUpload[n];
        journeyLog(`Preparing Chunk ${i}/${currentChunks.length}`);
        
        const p = document.createElement('p');
        p.innerText = `Uploading Part ${id}.${i} (${n + 1}/${totalToUpload})...`;
        p.style.margin = "5px 0";
        p.style.paddingLeft = "20px";
        statusEl.appendChild(p);

        try {
            // Small pacing to reduce wallet/provider flakiness on large batches.
            await new Promise(r => setTimeout(r, 750));
            
            const tx = await openContractCallWrapper({
                contractAddress: address,
                contractName: name,
                functionName: 'add-chunk',
                functionArgs: [ uintCV(id), uintCV(i), bufferCV(Buffer.from(currentChunks[i])) ],
                network,
                userSession,
                postConditionMode: PostConditionMode.Allow,
                anchorMode: AnchorMode.Any,
            });

            const txId = tx?.txId || null;
            if (txId) {
                p.innerText = `Part ${id}.${i} - Sent (${txId.slice(0, 10)}…)`;
            }

            if (txId && isSafeModeEnabled()) {
                await waitForTransactionSuccess(txId);
            }

            p.innerText = `Part ${id}.${i} - Confirmed ✓`;
            p.style.color = '#28a745';

            // Persist confirmed chunk index for resume guidance.
            try {
                localStorage.setItem(`inscription-last-confirmed:${id}`, String(i));
            } catch {
                // ignore
            }
        } catch (err) {
            p.innerText = `Part ${id}.${i} - Failed ✕`;
            p.style.color = '#dc3545';
            const msg = getErrorMessage(err);
            renderMintProgress(`
                <div style="background:#fff3cd; padding:10px; border-radius:5px; color:#856404;">
                    <div><strong>Upload stopped at chunk ${i}.</strong></div>
                    <div>Reason: ${msg}</div>
                    <div style="margin-top:6px;">Resume: enter <strong>#${id}</strong> in “Resume / Retry Inscription”.</div>
                </div>
            `);
            throw err; // Stop the loop
        }
    }
}
// [END OF FILE ADDITIONS - Now verify integration with existing code]


// PLAYER LOGIC
function playerLog(msg) {
    journeyLog(`Player: ${msg}`);
    const div = document.createElement('div');
    div.innerText = `> ${msg}`;
    document.getElementById('player-log').appendChild(div);
}

async function fetchInscriptionData(id, { meta: parsedMeta = null, verbose = true, chunkDelayMs = 0 } = {}) {
    const { address, name } = getContractDetails({ silent: true });
    if (verbose) journeyLog(`Fetching inscription data for ID: ${id} from ${address}.${name}`);
    
    try {
        let mimeFromMeta = parsedMeta?.mimeType || null;
        let count = Number(parsedMeta?.chunkCount || 0);
        let totalSize = Number(parsedMeta?.totalSize || 0);

        if (!count || !Number.isFinite(count)) {
            const metaRes = await callReadOnlyFunctionWithRetry(
                {
                    contractAddress: address,
                    contractHash: '',
                    contractName: name,
                    functionName: 'get-inscription',
                    functionArgs: [uintCV(id)],
                    senderAddress: address,
                    network,
                },
                { retries: 2, baseDelayMs: 350 }
            );
            const meta = cvToValue(metaRes);
            if (!meta) {
                if (verbose) journeyLog(`ERROR: Inscription ${id} not found on-chain.`);
                throw new Error('Not found');
            }

            if (verbose) {
                // DEBUG: Inspect meta structure to fix MIME extraction
                journeyLog('Meta Object:', meta);
                if (meta.value) journeyLog('Meta.value:', meta.value);
            }

            try {
                count = Number(meta.value['chunk-count'].value);
                totalSize = Number(meta.value['total-size'].value);
                const rawMime = meta.value['mime-type'];
                mimeFromMeta =
                    typeof rawMime === 'string' ? rawMime : rawMime?.value ?? rawMime?.data ?? mimeFromMeta;
            } catch {
                // ignore
            }
        }

        if (verbose) journeyLog(`Inscription found. ID: ${id}, Chunks: ${count}, Size: ${totalSize} bytes`);
        
        const buffers = [];
        for (let i = 0; i < count; i++) {
            if (verbose) journeyLog(`Fetching Chunk ${i}...`);
            const res = await callReadOnlyFunctionWithRetry(
                {
                    contractAddress: address,
                    contractName: name,
                    functionName: 'get-chunk',
                    functionArgs: [uintCV(id), uintCV(i)],
                    senderAddress: address,
                    network,
                },
                { retries: 0, baseDelayMs: 300 }
            );
            const val = cvToValue(res);
            if (chunkDelayMs > 0) await sleep(chunkDelayMs);
            
            if (!val) {
                if (verbose) journeyLog(`CRITICAL: Chunk ${i} is missing on-chain.`);
                throw new Error(`Chunk ${i} missing. Inscription incomplete.`);
            }
            
            // Heuristic fix: check where the bytes are
            let bytes;
            if (val instanceof Uint8Array) bytes = val;
            else if (val && val.value) bytes = val.value; // Maybe it didn't unwrap?
            else if (val && val.buffer) bytes = val.buffer; // Maybe it's a Buffer object?
            else bytes = val; // Fallback

            // If it's a hex string (older stacks.js behavior?)
            if (typeof bytes === 'string') {
                if (bytes.startsWith('0x')) bytes = bytes.slice(2);
                const byteArray = new Uint8Array(bytes.length / 2);
                for (let j = 0; j < bytes.length; j += 2) {
                    byteArray[j / 2] = parseInt(bytes.substring(j, j + 2), 16);
                }
                bytes = byteArray;
            }
            
            if (!bytes || !bytes.length) {
                 journeyLog(`CRITICAL: Chunk ${i} data is empty.`);
                 throw new Error(`Chunk ${i} is empty.`);
            }

            buffers.push(bytes);
        }
        if (verbose) journeyLog("All chunks fetched. Reconstructing...");
        const full = new Uint8Array(buffers.reduce((a, b) => a + b.length, 0));
        let offset = 0;
        buffers.forEach(b => { full.set(b, offset); offset += b.length; });
        
        // DEBUG: Log Header
        const header = Array.from(full.slice(0, 16)).map(b => b.toString(16).padStart(2,'0')).join(' ');
        if (verbose) journeyLog(`Downloaded ${full.length} bytes. Header: ${header}`);
        
        // Robust MIME Extraction
        let mimeType = mimeFromMeta || "application/octet-stream";
        try {
            if (parsedMeta?.mimeType) mimeType = parsedMeta.mimeType;
        } catch (err) {
            if (verbose) journeyLog("Error extracting MIME", err);
        }

        // MIME Sniffing / Correction for legacy/incorrect types
        if (mimeType === 'application/json' || mimeType === 'application/octet-stream') {
             const snifferMime = sniffMimeType(full);
             if (snifferMime) {
                 if (verbose) journeyLog(`MIME Sniffer: Corrected ${mimeType} to ${snifferMime}`);
                 mimeType = snifferMime;
             }
        }
        
        return { data: full, mimeType };
    } catch (e) {
        if (verbose) journeyLog("Fetch Error", { error: e.message });
        throw e;
    }
}

function sniffMimeType(buffer) {
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


// VIEWER CONTROLS
document.getElementById('btn-clear-viewer').addEventListener('click', () => {
    document.getElementById('media-container').innerHTML = '<span style="color: #ccc;">No content loaded</span>';
    document.getElementById('player-log').innerHTML = '';
    journeyLog("Viewer cleared.");
});

// VIEWER GALLERY (16-per-page)
const VIEWER_PAGE_SIZE = 16;
let viewerGalleryPage = 0;
let viewerSelectedId = null;
let viewerGalleryRenderToken = 0;
const inscriptionMetaCache = new Map();
const galleryPreviewUrlById = new Map();

const isGalleryFullPreviewEnabled = () => Boolean(document.getElementById('gallery-full-previews')?.checked);

// Gallery preview safety defaults (used only when full previews are disabled)
const GALLERY_PREVIEW_MAX_BYTES = 128 * 1024; // 128KB
const GALLERY_PREVIEW_MAX_CHUNKS = 16;
// Even when "Full previews" is enabled, auto-loading very large inscriptions can easily trigger API 429s.
// Those should be loaded via single-view (or explicitly queued per-tile).
const GALLERY_AUTO_FULL_MAX_CHUNKS = 24;
const GALLERY_AUTO_FULL_MAX_BYTES = 256 * 1024;
const GALLERY_MIN_REQUEST_DELAY_MS = 250;
const GALLERY_RATE_LIMIT_PAUSE_MS = 10_000;
const VIEWER_GALLERY_HTML_PREVIEW = {
    enabled: true,
    sandbox: 'allow-scripts allow-same-origin',
};

function revokeGalleryPreviewUrls() {
    for (const url of galleryPreviewUrlById.values()) {
        try {
            URL.revokeObjectURL(url);
        } catch {
            // ignore
        }
    }
    galleryPreviewUrlById.clear();
}

async function runWithConcurrency(items, limit, fn) {
    const results = [];
    const queue = [...items];
    const workers = Array.from({ length: Math.max(1, limit) }, async () => {
        while (queue.length) {
            const item = queue.shift();
            try {
                results.push(await fn(item));
            } catch (e) {
                results.push(e);
            }
        }
    });
    await Promise.all(workers);
    return results;
}

function tryParseMeta(meta) {
    if (!meta) return null;
    const v = meta.value || meta;
    try {
        const sealed = Boolean(v.sealed?.value ?? v.sealed);
        const totalSize = Number(v['total-size']?.value ?? v['total-size'] ?? 0);
        const chunkCount = Number(v['chunk-count']?.value ?? v['chunk-count'] ?? 0);
        const owner = v.owner?.value ?? v.owner ?? null;
        const rawMime = v['mime-type'] ?? null;
        const mime =
            typeof rawMime === 'string'
                ? rawMime
                : rawMime?.value ?? rawMime?.data ?? (rawMime?.type ? String(rawMime.type) : null);
        return { sealed, totalSize, chunkCount, owner, mimeType: mime || 'unknown' };
    } catch {
        return { sealed: false, totalSize: 0, chunkCount: 0, owner: null, mimeType: 'unknown' };
    }
}

async function fetchInscriptionMeta(id) {
    if (inscriptionMetaCache.has(id)) return inscriptionMetaCache.get(id);
    const { address, name } = getContractDetails({ silent: true });
    const res = await callReadOnlyFunctionWithRetry({
        contractAddress: address,
        contractName: name,
        functionName: 'get-inscription',
        functionArgs: [uintCV(id)],
        senderAddress: address,
        network,
    });
    const meta = cvToValue(res);
    const parsed = meta ? tryParseMeta(meta) : null;
    inscriptionMetaCache.set(id, parsed);
    return parsed;
}

function estimateInscriptionSizeBytes(meta) {
    if (!meta) return null;
    const total = Number(meta.totalSize || 0);
    if (Number.isFinite(total) && total > 0) return total;
    const chunks = Number(meta.chunkCount || 0);
    if (!Number.isFinite(chunks) || chunks <= 0) return null;
    return chunks * 8192;
}

function renderGalleryCardMeta(meta, { error = null } = {}) {
    if (error) {
        return `
            <div class="missing">Meta error</div>
            <div class="muted">${escapeHtml(error)}</div>
        `;
    }
    if (!meta) return '<div class="missing">Not found</div><div class="muted">Click to try anyway</div>';
    const sealed = meta.sealed ? 'sealed' : 'draft';
    const size = meta.totalSize ? `${formatInt(meta.totalSize)} bytes` : 'unknown size';
    return `
        <div class="muted">${meta.mimeType}</div>
        <div class="muted">${size} • ${formatInt(meta.chunkCount)} chunks • ${sealed}</div>
    `;
}

function renderGalleryPreviewElement(container, mimeType, data) {
    container.innerHTML = '';

    // HTML/PDF can be big; only render if enabled and size is reasonable (enforced elsewhere)
    if (mimeType === 'text/html') {
        if (!VIEWER_GALLERY_HTML_PREVIEW.enabled) {
            container.innerHTML = '<div class="muted">HTML preview disabled</div>';
            return;
        }
        const blob = new Blob([data], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const iframe = document.createElement('iframe');
        iframe.src = url;
        iframe.setAttribute('sandbox', VIEWER_GALLERY_HTML_PREVIEW.sandbox);
        container.appendChild(iframe);
        return url;
    }

    if (mimeType === 'application/pdf') {
        const blob = new Blob([data], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const iframe = document.createElement('iframe');
        iframe.src = url;
        iframe.setAttribute('sandbox', 'allow-same-origin');
        container.appendChild(iframe);
        return url;
    }

    if (mimeType.startsWith('image/')) {
        const blob = new Blob([data], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const img = document.createElement('img');
        img.src = url;
        container.appendChild(img);
        return url;
    }

    if (mimeType.startsWith('video/')) {
        const blob = new Blob([data], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const vid = document.createElement('video');
        vid.src = url;
        vid.controls = true;
        container.appendChild(vid);
        return url;
    }

    if (mimeType.startsWith('audio/')) {
        const blob = new Blob([data], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const audio = document.createElement('audio');
        audio.src = url;
        audio.controls = true;
        container.appendChild(audio);
        return url;
    }

    if (mimeType.includes('json') || mimeType.startsWith('text/')) {
        const text = new TextDecoder().decode(data);
        const div = document.createElement('div');
        div.style.fontSize = '11px';
        div.style.padding = '8px';
        div.style.whiteSpace = 'pre-wrap';
        div.style.maxHeight = '110px';
        div.style.overflow = 'auto';
        // Full preview may be large; still keep it scrollable within the tile.
        div.innerText = text;
        container.appendChild(div);
        return null;
    }

    container.innerHTML = '<div class="muted">No preview</div>';
    return null;
}

async function loadGalleryPreviewIntoCard(id, metaState, card) {
    const previewEl = card.querySelector('.gallery-preview');
    const metaEl = card.querySelector('.gallery-meta');
    if (!previewEl || !metaEl) return;

    const meta = metaState && typeof metaState === 'object' && 'meta' in metaState ? metaState.meta : metaState;
    const metaError = metaState && typeof metaState === 'object' && 'error' in metaState ? metaState.error : null;

    if (!meta && !isGalleryFullPreviewEnabled()) {
        previewEl.innerHTML = '<div class="muted">Meta unavailable<br>(enable Full previews or Retry)</div>';
        metaEl.innerHTML = renderGalleryCardMeta(meta, { error: metaError });
        return;
    }

    if (meta && !isGalleryFullPreviewEnabled()) {
        const approxSize = estimateInscriptionSizeBytes(meta);
        const tooBig =
            (Number.isFinite(approxSize) && approxSize > GALLERY_PREVIEW_MAX_BYTES) ||
            (Number.isFinite(meta.chunkCount) && meta.chunkCount > GALLERY_PREVIEW_MAX_CHUNKS);
        if (tooBig) {
            previewEl.innerHTML = `<div class="muted">Preview skipped<br>(large inscription)</div>`;
            metaEl.innerHTML = renderGalleryCardMeta(meta, { error: metaError });
            return;
        }
    }

    previewEl.innerHTML = '<div class="muted">Loading preview…</div>';
    metaEl.innerHTML = renderGalleryCardMeta(meta, { error: metaError });

    try {
        const { data, mimeType } = await fetchInscriptionData(id, { meta, verbose: false, chunkDelayMs: 80 });
        const url = renderGalleryPreviewElement(previewEl, mimeType, data);
        if (url) {
            // Replace any prior URL for this id
            const prev = galleryPreviewUrlById.get(id);
            if (prev) {
                try {
                    URL.revokeObjectURL(prev);
                } catch {
                    // ignore
                }
            }
            galleryPreviewUrlById.set(id, url);
        }

        // Update meta with the fetched/sniffed MIME (more accurate than on-chain)
        if (meta) {
            metaEl.innerHTML = renderGalleryCardMeta({ ...meta, mimeType });
        } else {
            metaEl.innerHTML = `
                <div class="muted">${escapeHtml(mimeType)}</div>
                <div class="muted">${formatInt(data.length)} bytes • unknown chunks</div>
            `;
        }
    } catch (e) {
        if (isRateLimitError(e)) {
            previewEl.innerHTML = '<div class="missing">Rate limited (429)</div><div class="muted">Pausing…</div>';
            metaEl.innerHTML = renderGalleryCardMeta(meta, { error: metaError || getErrorMessage(e) });
            throw e;
        }
        previewEl.innerHTML = '';
        const msg = getErrorMessage(e);
        const errDiv = document.createElement('div');
        errDiv.className = 'missing';
        errDiv.innerText = 'Preview error';
        const retryBtn = document.createElement('button');
        retryBtn.type = 'button';
        retryBtn.innerText = 'Retry';
        retryBtn.style.marginTop = '8px';
        retryBtn.addEventListener('click', (ev) => {
            ev.stopPropagation();
            void loadGalleryPreviewIntoCard(id, metaState, card);
        });
        previewEl.appendChild(errDiv);
        previewEl.appendChild(retryBtn);
        metaEl.innerHTML = `
            ${renderGalleryCardMeta(meta, { error: metaError })}
            <div class="missing" style="margin-top:6px;">${escapeHtml(msg)}</div>
        `;
    }
}

function setGalleryStatus(text) {
    const el = document.getElementById('gallery-status');
    if (el) el.innerText = text;
}

function setGallerySelected(id) {
    viewerSelectedId = id;
    const grid = document.getElementById('gallery-grid');
    if (!grid) return;
    grid.querySelectorAll('.gallery-card').forEach((card) => {
        const cid = Number(card.getAttribute('data-id'));
        card.classList.toggle('selected', Number.isFinite(cid) && cid === id);
    });
}

async function renderGalleryPage(page) {
    const grid = document.getElementById('gallery-grid');
    const pageInput = document.getElementById('gallery-page-input');
    if (!grid) return;
    const token = ++viewerGalleryRenderToken;
    revokeGalleryPreviewUrls();
    viewerGalleryPage = Math.max(0, Number(page) || 0);
    if (pageInput) pageInput.value = String(viewerGalleryPage);

    const start = viewerGalleryPage * VIEWER_PAGE_SIZE;
    const end = start + VIEWER_PAGE_SIZE - 1;
    setGalleryStatus(`Showing IDs ${start}–${end}`);

    grid.innerHTML = '';
    for (let i = start; i <= end; i++) {
        const card = document.createElement('div');
        card.className = 'gallery-card';
        card.setAttribute('data-id', String(i));
        card.innerHTML = `
            <div class="id">#${i}</div>
            <div class="gallery-preview"><div class="muted">Loading…</div></div>
            <div class="gallery-meta"></div>
        `;
        card.addEventListener('click', async () => {
            document.getElementById('manifest-id-input').value = i;
            setGallerySelected(i);
            document.getElementById('btn-play-single').click();
        });
        grid.appendChild(card);
    }

    // Fetch metadata in parallel and fill cards
    const ids = Array.from({ length: VIEWER_PAGE_SIZE }, (_, idx) => start + idx);
    const metaStateById = new Map();
    const metaConcurrency = 2;
    await runWithConcurrency(ids, metaConcurrency, async (id) => {
        if (token !== viewerGalleryRenderToken) return;
        const card = grid.querySelector(`.gallery-card[data-id="${id}"]`);
        if (!card) return;
        const metaEl = card.querySelector('.gallery-meta');
        const previewEl = card.querySelector('.gallery-preview');
        try {
            const meta = await fetchInscriptionMeta(id);
            metaStateById.set(id, { meta, error: null });
            if (token !== viewerGalleryRenderToken) return;
            if (metaEl) metaEl.innerHTML = renderGalleryCardMeta(meta);
            if (previewEl && !meta) previewEl.innerHTML = '<div class="muted">Not found</div>';
        } catch (e) {
            const err = getErrorMessage(e);
            metaStateById.set(id, { meta: null, error: err });
            if (token !== viewerGalleryRenderToken) return;
            if (metaEl) metaEl.innerHTML = renderGalleryCardMeta(null, { error: err });
            if (previewEl) previewEl.innerHTML = '<div class="missing">Meta error</div>';
        }
    });

    const shouldAutoPreview = (meta) => {
        if (!meta) return false;
        if (!meta.sealed) return false;
        const maxChunks = isGalleryFullPreviewEnabled() ? GALLERY_AUTO_FULL_MAX_CHUNKS : GALLERY_PREVIEW_MAX_CHUNKS;
        const maxBytes = isGalleryFullPreviewEnabled() ? GALLERY_AUTO_FULL_MAX_BYTES : GALLERY_PREVIEW_MAX_BYTES;
        const approxSize = estimateInscriptionSizeBytes(meta);
        const tooBig =
            (Number.isFinite(meta.chunkCount) && meta.chunkCount > maxChunks) ||
            (Number.isFinite(approxSize) && approxSize > maxBytes);
        return !tooBig;
    };

    const queueSinglePreview = async (id) => {
        const card = grid.querySelector(`.gallery-card[data-id="${id}"]`);
        if (!card) return;
        const metaState = metaStateById.get(id) || { meta: null, error: 'Meta not loaded' };

        // Avoid hammering the API: retry rate limits with a pause.
        let pauseMs = GALLERY_RATE_LIMIT_PAUSE_MS;
        for (let attempt = 0; attempt < 3; attempt++) {
            if (token !== viewerGalleryRenderToken) return;
            try {
                await loadGalleryPreviewIntoCard(id, metaState, card);
                return;
            } catch (e) {
                if (!isRateLimitError(e)) return;
                setGalleryStatus(`Rate limited by Hiro (429). Pausing ${Math.ceil(pauseMs / 1000)}s…`);
                await sleep(pauseMs);
                pauseMs = Math.min(60_000, Math.floor(pauseMs * 1.6));
            }
        }
    };

    const idsToAutoPreview = [];
    let skippedDraft = 0;
    let skippedLarge = 0;
    let notFound = 0;
    let metaErrors = 0;
    for (const id of ids) {
        const card = grid.querySelector(`.gallery-card[data-id="${id}"]`);
        if (!card) continue;
        const previewEl = card.querySelector('.gallery-preview');
        const metaState = metaStateById.get(id) || { meta: null, error: 'Meta not loaded' };
        const meta = metaState.meta;

        if (metaState.error) {
            metaErrors++;
            if (previewEl) previewEl.innerHTML = '<div class="missing">Meta error</div>';
            continue;
        }
        if (!meta) {
            notFound++;
            if (previewEl) previewEl.innerHTML = '<div class="muted">Not found</div>';
            continue;
        }
        if (!meta.sealed) {
            skippedDraft++;
            if (previewEl) {
                previewEl.innerHTML = '';
                const div = document.createElement('div');
                div.className = 'muted';
                div.innerText = 'Draft (not sealed)';
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.innerText = 'Try preview';
                btn.style.marginTop = '8px';
                btn.addEventListener('click', (ev) => {
                    ev.stopPropagation();
                    void queueSinglePreview(id);
                });
                previewEl.appendChild(div);
                previewEl.appendChild(btn);
            }
            continue;
        }

        if (!shouldAutoPreview(meta)) {
            skippedLarge++;
            if (previewEl) {
                previewEl.innerHTML = '';
                const div = document.createElement('div');
                div.className = 'muted';
                div.innerText = 'Large inscription';

                const btnView = document.createElement('button');
                btnView.type = 'button';
                btnView.innerText = 'Open viewer';
                btnView.style.marginTop = '8px';
                btnView.addEventListener('click', (ev) => {
                    ev.stopPropagation();
                    document.getElementById('manifest-id-input').value = id;
                    setGallerySelected(id);
                    document.getElementById('btn-play-single').click();
                });

                const btnQueue = document.createElement('button');
                btnQueue.type = 'button';
                btnQueue.innerText = 'Queue preview (slow)';
                btnQueue.style.marginTop = '8px';
                btnQueue.style.marginLeft = '8px';
                btnQueue.addEventListener('click', (ev) => {
                    ev.stopPropagation();
                    void queueSinglePreview(id);
                });

                previewEl.appendChild(div);
                previewEl.appendChild(btnView);
                previewEl.appendChild(btnQueue);
            }
            continue;
        }

        idsToAutoPreview.push(id);
    }

    setGalleryStatus(
        `IDs ${start}–${end} • auto previews ${idsToAutoPreview.length}/${VIEWER_PAGE_SIZE} • draft ${skippedDraft} • large ${skippedLarge} • missing ${notFound} • meta errors ${metaErrors}`
    );

    // Auto-preview sequentially with pacing to avoid 429 rate limits.
    let done = 0;
    for (const id of idsToAutoPreview) {
        if (token !== viewerGalleryRenderToken) break;
        done++;
        setGalleryStatus(
            `Loading previews ${done}/${idsToAutoPreview.length} (IDs ${start}–${end}) • draft ${skippedDraft} • large ${skippedLarge} • missing ${notFound} • meta errors ${metaErrors}`
        );
        await queueSinglePreview(id);
        await sleep(GALLERY_MIN_REQUEST_DELAY_MS);
    }

    if (Number.isFinite(viewerSelectedId)) setGallerySelected(viewerSelectedId);
}

document.getElementById('gallery-prev')?.addEventListener('click', () => {
    void renderGalleryPage(Math.max(0, viewerGalleryPage - 1)).catch((e) =>
        journeyLog('Gallery render failed', { error: getErrorMessage(e) })
    );
});
document.getElementById('gallery-next')?.addEventListener('click', () => {
    void renderGalleryPage(viewerGalleryPage + 1).catch((e) =>
        journeyLog('Gallery render failed', { error: getErrorMessage(e) })
    );
});
document.getElementById('gallery-go')?.addEventListener('click', () => {
    const val = Number(document.getElementById('gallery-page-input')?.value);
    void renderGalleryPage(Number.isFinite(val) ? val : 0).catch((e) =>
        journeyLog('Gallery render failed', { error: getErrorMessage(e) })
    );
});
document.getElementById('gallery-jump')?.addEventListener('click', () => {
    const id = Number(document.getElementById('gallery-jump-id')?.value);
    if (!Number.isFinite(id) || id < 0) return;
    const page = Math.floor(id / VIEWER_PAGE_SIZE);
    void renderGalleryPage(page)
        .then(() => {
            document.getElementById('manifest-id-input').value = id;
            setGallerySelected(id);
            document.getElementById('btn-play-single').click();
        })
        .catch((e) => journeyLog('Gallery render failed', { error: getErrorMessage(e) }));
});
document.getElementById('gallery-refresh')?.addEventListener('click', () => {
    inscriptionMetaCache.clear();
    void renderGalleryPage(viewerGalleryPage).catch((e) =>
        journeyLog('Gallery render failed', { error: getErrorMessage(e) })
    );
});

document.getElementById('gallery-full-previews')?.addEventListener('change', () => {
    void renderGalleryPage(viewerGalleryPage).catch((e) =>
        journeyLog('Gallery render failed', { error: getErrorMessage(e) })
    );
});

document.getElementById('btn-play-single').addEventListener('click', async () => {
    const idInput = document.getElementById('manifest-id-input');
    if (!idInput.value) {
        return alert("Please enter an Inscription ID.");
    }
    const id = parseInt(idInput.value);
    journeyLog(`User clicked 'Load & View' for ID: ${id}`);
    viewerSelectedId = id;
    setGallerySelected(id);
    
    const container = document.getElementById('media-container');
    container.innerHTML = '<span style="color: #666;">Loading content from Stacks chain...</span>';
    
    try {
        playerLog("Fetching metadata and chunks...");
        const { data, mimeType } = await fetchInscriptionData(id);
        
        journeyLog(`Data fetched successfully. Size: ${data.length} bytes. MIME: ${mimeType}`);
        container.innerHTML = ''; // Clear loading text

        if (mimeType.startsWith('audio/')) {
            playerLog("Detected Audio. Decoding...");
            const { audioCtx, outputBuffer } = await processRecursiveAudio([data.buffer]);
            
            // Create audio controls
            const audioWrapper = document.createElement('div');
            audioWrapper.style.width = '100%';
            audioWrapper.style.textAlign = 'center';

            const info = document.createElement('p');
            info.innerText = `Audio: ${(outputBuffer.duration).toFixed(2)}s | ${outputBuffer.sampleRate}Hz | ${outputBuffer.numberOfChannels}ch`;
            audioWrapper.appendChild(info);

            // Simple Play Button for decoded buffer
            const playBtn = document.createElement('button');
            playBtn.innerText = "▶ Play Audio";
            playBtn.style.background = "#28a745";
            playBtn.onclick = () => {
                const source = audioCtx.createBufferSource();
                source.buffer = outputBuffer;
                source.connect(audioCtx.destination);
                source.start();
            };
            audioWrapper.appendChild(playBtn);
            container.appendChild(audioWrapper);
            
            playerLog("Audio ready to play.");

        } else if (mimeType.startsWith('image/')) {
            playerLog("Detected Image. Rendering...");
            const blob = new Blob([data], { type: mimeType });
            const url = URL.createObjectURL(blob);
            const img = document.createElement('img');
            img.src = url;
            img.style.maxWidth = '100%';
            img.style.maxHeight = '600px';
            img.style.border = '1px solid #ddd';
            container.appendChild(img);

        } else if (mimeType.startsWith('video/')) {
            playerLog("Detected Video. Rendering...");
            const blob = new Blob([data], { type: mimeType });
            const url = URL.createObjectURL(blob);
            const vid = document.createElement('video');
            vid.src = url;
            vid.controls = true;
            vid.style.maxWidth = '100%';
            vid.style.maxHeight = '600px';
            container.appendChild(vid);

        } else if (mimeType === 'text/html' || mimeType === 'application/pdf') {
             playerLog(`Detected ${mimeType}. Rendering in sandboxed iframe...`);
             const blob = new Blob([data], { type: mimeType });
             const url = URL.createObjectURL(blob);
             const iframe = document.createElement('iframe');
             iframe.src = url;
             iframe.style.width = '100%';
             iframe.style.height = '600px';
             iframe.style.border = '1px solid #ccc';
             // Sandbox for security: allow scripts but restrict other actions if needed
             iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin'); 
             container.appendChild(iframe);

        } else if (mimeType.includes('json') || mimeType.startsWith('text/')) {
            playerLog(`Detected Text/JSON. Rendering...`);
            const text = new TextDecoder().decode(data);
            const pre = document.createElement('pre');
            
            // Try pretty printing if JSON
            try {
                const obj = JSON.parse(text);
                pre.innerText = JSON.stringify(obj, null, 2);
            } catch (e) {
                pre.innerText = text.substring(0, 5000) + (text.length > 5000 ? '\n...[truncated]' : '');
            }
            
            pre.style.background = '#eee';
            pre.style.padding = '10px';
            pre.style.width = '100%';
            pre.style.overflow = 'auto';
            pre.style.whiteSpace = 'pre-wrap';
            container.appendChild(pre);
        } else {
            playerLog(`Unknown MIME: ${mimeType}. Displaying as Hex/Text...`);
            const text = new TextDecoder().decode(data);
            const pre = document.createElement('pre');
            pre.innerText = `[Raw Data - First 500 bytes]\n` + text.substring(0, 500);
            pre.style.background = '#f8d7da';
            pre.style.padding = '10px';
            container.appendChild(pre);
        }
    } catch (e) { 
        journeyLog("Player Error", { error: e.message });
        playerLog(`Error: ${e.message}`); 
        container.innerHTML = `<div style="color:red; text-align:center;">Error: ${e.message}</div>`;
    }
});

document.getElementById('btn-load-manifest').addEventListener('click', async () => {
    const manifestId = parseInt(document.getElementById('manifest-id-input').value);
    journeyLog(`User clicked 'Load Manifest' for ID: ${manifestId}`);
    try {
        playerLog("Fetching...");
        const { data: bytes } = await fetchInscriptionData(manifestId);
        const manifest = JSON.parse(new TextDecoder().decode(bytes));
        journeyLog("Manifest parsed", manifest);
        
        const clips = [];
        for (const clipId of manifest) {
            playerLog(`Clip ${clipId}...`);
            const { data } = await fetchInscriptionData(parseInt(clipId));
            clips.push(data.buffer);
        }
        
        journeyLog("All manifest clips fetched. Processing audio...");
        const { audioCtx, outputBuffer } = await processRecursiveAudio(clips);
        const source = audioCtx.createBufferSource();
        source.buffer = outputBuffer;
        source.connect(audioCtx.destination);
        source.start();
        playerLog("Playing!");
    } catch (e) { 
        journeyLog("Player Error", { error: e.message });
        playerLog(`Error: ${e.message}`); 
    }
});
