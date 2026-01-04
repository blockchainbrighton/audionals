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
const network = new StacksTestnet({ url: 'https://api.testnet.hiro.so' });

journeyLog("Network configured", { url: network.coreApiUrl });

// AUTH STATUS UI
const setAuthStatus = (message, tone = 'info') => {
    const el = document.getElementById('auth-status');
    if (!el) return;
    el.className = `status ${tone}`;
    el.innerText = message || '';
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
const getContractDetails = () => {
    const input = document.getElementById('contract-address-input').value.replace(/\s/g, ''); 
    const parts = input.split('.');
    if (parts.length !== 2) {
        journeyLog("ERROR: Invalid contract address format", { input });
        throw new Error("Invalid Address Format. Expected: ADDRESS.CONTRACT_NAME");
    }
    const details = { address: parts[0], name: parts[1] };
    journeyLog("Contract details parsed", details);
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

// UI Logic
window.showPage = (page) => {
    journeyLog(`Switching to page: ${page}`);
    document.querySelectorAll('[id^="page-"]').forEach(el => el.classList.add('hidden'));
    document.getElementById(`page-${page}`).classList.remove('hidden');

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
    journeyLog(`File selected: ${file.name} (${file.size} bytes)`);
    currentMimeType = file.type || "application/octet-stream";
    journeyLog(`Detected MIME: ${currentMimeType}`);
    
    const buf = await file.arrayBuffer();
    journeyLog("File read into ArrayBuffer. Starting chunking...");
    
    currentChunks = chunkFile(buf);
    journeyLog(`File chunked into ${currentChunks.length} pieces.`);
    
    currentRoot = computeMerkleRoot(currentChunks);
    journeyLog("Merkle Root calculated", { root: bufToHex(currentRoot) });
    
    document.getElementById('mint-steps').innerHTML = `Chunks: ${currentChunks.length} | Root: 0x${bufToHex(currentRoot)}`;
    document.getElementById('btn-start-mint').classList.remove('hidden');
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
        Connect.openContractCall({
            ...options,
            fee: 500000, // Default 0.5 STX fee
            onFinish: (data) => resolve(data),
            onCancel: () => reject(new Error("User cancelled transaction")),
        });
    });
}

// HELPER: Poll for Transaction Confirmation
async function waitForTransactionSuccess(txId) {
    journeyLog(`Polling for TX: ${txId}`);
    const apiUrl = network.coreApiUrl; // e.g. https://api.testnet.hiro.so
    
    return new Promise((resolve, reject) => {
        const interval = setInterval(async () => {
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
        }, 5000); // Poll every 5 seconds
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
        const args = [ 
            stringAsciiCV(currentMimeType), 
            uintCV(currentChunks.length * 8192), 
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
        const metaRes = await callReadOnlyFunction({
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
            const res = await callReadOnlyFunction({
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

            await sealInscriptionTransaction(id, currentRoot, statusEl);
        } else {
            statusEl.innerHTML = `Found ${missingIndices.length} missing chunks. Ready to upload + seal.`;

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
        statusEl.innerHTML = `<span style="color:red">Error: ${e.message}</span>`;
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
    await openContractCallWrapper({
        contractAddress: address,
        contractName: name,
        functionName: 'seal-inscription',
        functionArgs: [ uintCV(id), bufferCV(Buffer.from(root)) ],
        network,
        userSession,
        postConditionMode: PostConditionMode.Allow,
        anchorMode: AnchorMode.Any,
    });

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
    
    for (const i of indicesToUpload) {
        journeyLog(`Preparing Chunk ${i}/${currentChunks.length}`);
        
        const p = document.createElement('p');
        p.innerText = `Uploading Part ${id}.${i} (Chunk ${i+1}/${currentChunks.length})...`;
        p.style.margin = "5px 0";
        p.style.paddingLeft = "20px";
        statusEl.appendChild(p);

        try {
            // Safety Delay for Wallet Nonce
            await new Promise(r => setTimeout(r, 2000));
            
            await openContractCallWrapper({
                contractAddress: address,
                contractName: name,
                functionName: 'add-chunk',
                functionArgs: [ uintCV(id), uintCV(i), bufferCV(Buffer.from(currentChunks[i])) ],
                network,
                userSession,
                postConditionMode: PostConditionMode.Allow,
                anchorMode: AnchorMode.Any,
            });
            p.innerText = `Part ${id}.${i} - Confirmed ✓`;
            p.style.color = '#28a745';
        } catch (err) {
            p.innerText = `Part ${id}.${i} - Failed ✕`;
            p.style.color = '#dc3545';
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

async function fetchInscriptionData(id) {
    const { address, name } = getContractDetails();
    journeyLog(`Fetching inscription data for ID: ${id} from ${address}.${name}`);
    
    try {
        const metaRes = await callReadOnlyFunction({
            contractAddress: address, contractHash: '', 
            contractName: name, functionName: 'get-inscription',
            functionArgs: [uintCV(id)], senderAddress: address, network
        });
        const meta = cvToValue(metaRes);
        if (!meta) {
            journeyLog(`ERROR: Inscription ${id} not found on-chain.`);
            throw new Error("Not found");
        }

        // DEBUG: Inspect meta structure to fix MIME extraction
        journeyLog("Meta Object:", meta);
        if (meta.value) journeyLog("Meta.value:", meta.value);

        const count = Number(meta.value['chunk-count'].value);
        const totalSize = Number(meta.value['total-size'].value);
        journeyLog(`Inscription found. ID: ${id}, Chunks: ${count}, Size: ${totalSize} bytes`);
        
        const buffers = [];
        for (let i = 0; i < count; i++) {
            journeyLog(`Fetching Chunk ${i}...`);
            const res = await callReadOnlyFunction({
                contractAddress: address, contractName: name,
                functionName: 'get-chunk', functionArgs: [uintCV(id), uintCV(i)],
                senderAddress: address, network
            });
            const val = cvToValue(res);
            
            if (!val) {
                journeyLog(`CRITICAL: Chunk ${i} is missing on-chain.`);
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
        journeyLog("All chunks fetched. Reconstructing...");
        const full = new Uint8Array(buffers.reduce((a, b) => a + b.length, 0));
        let offset = 0;
        buffers.forEach(b => { full.set(b, offset); offset += b.length; });
        
        // DEBUG: Log Header
        const header = Array.from(full.slice(0, 16)).map(b => b.toString(16).padStart(2,'0')).join(' ');
        journeyLog(`Downloaded ${full.length} bytes. Header: ${header}`);
        
        // Robust MIME Extraction
        let mimeType = "application/octet-stream";
        try {
            const rawMime = meta.value['mime-type'];
            journeyLog("Raw MIME object:", rawMime);
            if (rawMime) {
                if (typeof rawMime === 'string') mimeType = rawMime;
                else if (rawMime.data) mimeType = rawMime.data;
                else if (rawMime.value) mimeType = rawMime.value;
            }
        } catch (err) {
            journeyLog("Error extracting MIME", err);
        }

        // MIME Sniffing / Correction for legacy/incorrect types
        if (mimeType === 'application/json' || mimeType === 'application/octet-stream') {
             const snifferMime = sniffMimeType(full);
             if (snifferMime) {
                 journeyLog(`MIME Sniffer: Corrected ${mimeType} to ${snifferMime}`);
                 mimeType = snifferMime;
             }
        }
        
        return { data: full, mimeType };
    } catch (e) {
        journeyLog("Fetch Error", { error: e.message });
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

document.getElementById('btn-play-single').addEventListener('click', async () => {
    const idInput = document.getElementById('manifest-id-input');
    if (!idInput.value) {
        return alert("Please enter an Inscription ID.");
    }
    const id = parseInt(idInput.value);
    journeyLog(`User clicked 'Load & View' for ID: ${id}`);
    
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
