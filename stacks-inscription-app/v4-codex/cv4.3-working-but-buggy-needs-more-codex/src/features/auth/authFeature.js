import { safeSerialize } from '../../shared/serialization.js';

export function createAuthFeature({
  Connect,
  userSession,
  journeyLog,
  appDetails = { name: 'Stacks Inscription Proto', icon: () => window.location.origin + '/vite.svg' },
  connectDefaults = { redirectTo: '/', manifestPath: '/manifest.json' },
} = {}) {
  const CONNECT_AUTH_DEFAULTS = {
    redirectTo: '/',
    manifestPath: '/manifest.json',
    ...connectDefaults,
  };

  const isAuthDebugEnabled = () => {
    const el = document.getElementById('toggle-auth-debug');
    return el ? Boolean(el.checked) : true;
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

      const previewString = parsed ? safeSerialize(parsed, maxLen) : decoded;
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
        const intercept = [
          'authenticationRequest',
          'transactionRequest',
          'signatureRequest',
          'structuredDataSignatureRequest',
          'request',
        ];
        if (!intercept.includes(String(prop))) return value;
        if (typeof value !== 'function') return value;

        return async (...args) => {
          if (isAuthDebugEnabled()) journeyLog(`[${label}.${String(prop)}] called`, { args: safeSerialize(args, 800) });
          try {
            const result = await value.apply(target, args);
            if (isAuthDebugEnabled())
              journeyLog(`[${label}.${String(prop)}] resolved`, { result: safeSerialize(result, 1200) });
            return result;
          } catch (e) {
            if (isAuthDebugEnabled())
              journeyLog(`[${label}.${String(prop)}] threw`, { error: e?.message || String(e), stack: e?.stack || null });
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
          return arr.map((p) => ({ id: p?.id || null, name: p?.name || null, webUrl: p?.webUrl || null })).slice(0, 20);
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
          window.__lastConnectAuthError = { message: errObj?.message || String(errObj), name: errObj?.name || null };
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
      const dataSummary = typeof ev.data === 'string' ? ev.data.slice(0, 300) : safeSerialize(ev.data, 600);
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

  const setAuthStatus = (message, tone = 'info') => {
    const el = document.getElementById('auth-status');
    if (!el) return;
    el.className = `status ${tone}`;
    el.innerText = message || '';
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

  async function init() {
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
      setAuthStatus('Missing `/manifest.json`. Wallet authentication will fail until it is available at the site root.', 'error');
    }

    await dumpAuthDebug('init');

    if (userSession.isSignInPending()) {
      journeyLog('Auth sign-in pending. Completing...');
      setAuthStatus('Completing wallet sign-in...', 'info');
      try {
        await userSession.handlePendingSignIn();
        journeyLog('Auth pending sign-in completed.');
      } catch (e) {
        journeyLog('Auth pending sign-in failed', { error: e?.message || String(e) });
        setAuthStatus('Sign-in failed. Please try connecting your wallet again.', 'error');
      }
    }
    updateUI();
  }

  const ensureAuth = async ({ action } = {}) => {
    journeyLog('Ensuring auth before action...', { action: action || 'unknown' });
    if (userSession.isUserSignedIn()) {
      journeyLog('Auth verified.');
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
    journeyLog('Auth missing. Redirecting to connect...');

    return new Promise((resolve, reject) => {
      Connect.showConnect({
        ...CONNECT_AUTH_DEFAULTS,
        appDetails: { name: appDetails.name, icon: typeof appDetails.icon === 'function' ? appDetails.icon() : appDetails.icon },
        userSession,
        onFinish: () => {
          journeyLog('Auth onFinish (ensureAuth) triggered');
          updateUI();
          void dumpAuthDebug(`ensureAuth onFinish (${action || 'unknown'})`);
          resolve();
        },
        onCancel: () => {
          journeyLog('Auth onCancel (ensureAuth) triggered');
          const lastErr = window.__lastConnectAuthError;
          if (lastErr?.message) setAuthStatus(`Wallet connect failed: ${lastErr.message}`, 'error');
          else setAuthStatus('Wallet connection canceled. Connect to deploy or inscribe.', 'warn');
          void dumpAuthDebug(`ensureAuth onCancel (${action || 'unknown'})`);
          reject(new Error('Wallet connection canceled'));
        },
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

  function registerHandlers() {
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

    document.getElementById('connect-wallet')?.addEventListener('click', () => {
      journeyLog("User clicked 'Connect Wallet'");
      setAuthStatus('Opening wallet connect...', 'info');
      void dumpAuthDebug('connect click (before showConnect)');

      try {
        const provider = Connect.getStacksProvider?.();
        const hasAuth = provider && typeof provider.authenticationRequest === 'function';
        const selectedId = getSelectedProviderId();
        if (selectedId && !hasAuth) {
          journeyLog('Auth debug: selected provider missing authenticationRequest; clearing STX_PROVIDER to force reselection.', {
            selectedProviderId: selectedId,
            providerKeys: provider ? Object.keys(provider).slice(0, 20) : null,
          });
          clearSelectedProviderId();
        }
      } catch {
        // ignore
      }

      let provider = null;
      try {
        provider = Connect.getStacksProvider?.() || null;
      } catch (e) {
        journeyLog('Auth debug: failed to acquire provider for showConnect', { error: e?.message || String(e) });
        provider = null;
      }

      const connectOptions = {
        ...CONNECT_AUTH_DEFAULTS,
        appDetails: { name: appDetails.name, icon: typeof appDetails.icon === 'function' ? appDetails.icon() : appDetails.icon },
        userSession,
        onFinish: () => {
          journeyLog('Auth onFinish triggered');
          updateUI();
          void dumpAuthDebug('connect onFinish');
        },
        onCancel: () => {
          journeyLog('Auth onCancel triggered');
          const lastErr = window.__lastConnectAuthError;
          if (lastErr?.message) setAuthStatus(`Wallet connect failed: ${lastErr.message}`, 'error');
          else setAuthStatus('Wallet connection canceled. Connect to deploy or inscribe.', 'warn');
          void dumpAuthDebug('connect onCancel');
        },
      };

      const debugProvider = provider ? wrapProviderForDebug(provider, 'walletProvider') : null;
      if (debugProvider) Connect.showConnect(connectOptions, debugProvider);
      else Connect.showConnect(connectOptions);
    });

    document.getElementById('disconnect-wallet')?.addEventListener('click', () => {
      journeyLog("User clicked 'Disconnect Wallet'");
      userSession.signUserOut();
      updateUI();
      setAuthStatus('Disconnected.', 'info');
    });
  }

  return {
    CONNECT_AUTH_DEFAULTS,
    init,
    registerHandlers,
    ensureAuth,
    updateUI,
    setAuthStatus,
    isAuthDebugEnabled,
    dumpAuthDebug,
    clearSelectedProviderId,
  };
}

