// core/auth.js
import * as Connect from '@stacks/connect';
import { AppConfig, UserSession } from '@stacks/connect';
import { journeyLog, isAuthDebugEnabled, safeSerialize } from '../ui/logs.js';
import { getLocalStorageJsonSummary, listInterestingStorageKeys, getSelectedProviderId, clearSelectedProviderId } from './memory.js';
import { CONNECT_AUTH_DEFAULTS } from '../config.js';

const appConfig = new AppConfig(['store_write', 'publish_data']);
export const userSession = new UserSession({ appConfig });

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

export const getProviderSummary = () => {
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

export const dumpAuthDebug = async (reason) => {
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

export const ensureAuth = async ({ action } = {}) => {
    journeyLog("Ensuring auth before action...", { action: action || 'unknown' });
    if (userSession.isUserSignedIn()) {
        journeyLog("Auth verified.");
        return;
    }

    void dumpAuthDebug(`ensureAuth start (${action || 'unknown'})`);

    const setAuthStatus = (message, tone = 'info') => {
        const el = document.getElementById('auth-status');
        if (!el) return;
        el.className = `status ${tone}`;
        el.innerText = message || '';
    };

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
                // The main updateUI should be handled by the caller or an event listener
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

export function wrapProvider(provider) {
    if (isAuthDebugEnabled()) {
        return wrapProviderForDebug(provider, 'StacksProvider');
    }
    return provider;
}
