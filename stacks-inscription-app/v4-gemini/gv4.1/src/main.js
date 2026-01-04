import { Buffer } from 'buffer';
import * as Connect from '@stacks/connect';
import { 
    stringAsciiCV, 
    uintCV, 
    cvToValue,
    PostConditionMode, 
    AnchorMode 
} from '@stacks/transactions';

import { network } from './core/network.js';
import { 
    userSession, 
    dumpAuthDebug, 
    getProviderSummary, 
    ensureAuth, 
    wrapProvider
} from './core/auth.js';
import { 
    journeyLog, 
    playerLog, 
    isAuthDebugEnabled, 
    safeSerialize 
} from './ui/logs.js';
import { 
    getContractDetails, 
    callReadOnlyFunctionWithRetry 
} from './core/contract.js';
import { 
    listInterestingStorageKeys, 
    getSelectedProviderId, 
    clearSelectedProviderId, 
    persistLastInscription, 
    restoreLastInscription 
} from './core/memory.js';
import { 
    formatMicroStx, 
    formatInt, 
    sleep,
    getErrorMessage
} from './core/utils.js';
import { 
    CONNECT_AUTH_DEFAULTS, 
    CONTRACT_SOURCE, 
    MAINNET_CORE_API_CANDIDATES 
} from './config.js';
import { 
    processFileForMint 
} from './logic/file-processing.js';
import { 
    fetchFeeRateWithFallback, 
    estimateTxCounts, 
    estimateTxBytes 
} from './logic/fee-estimation.js';
import { 
    fetchInscriptionData 
} from './logic/fetch-inscription.js';
import { 
    openContractCallWrapper, 
    waitForTransactionSuccess, 
    startChunkUploads, 
    sealInscriptionTransaction 
} from './logic/transaction-flow.js';
import { 
    renderMintGuidance, 
    renderMintProgress, 
    renderFeeEstimates, 
    renderMintFileStats, 
    renderMintFilePreview, 
    setMintFilePanelVisible, 
    clearMintFilePreview, 
    getFeePerTxMicroStx, 
    isSafeModeEnabled 
} from './ui/mint-ui.js';
import { 
    renderGalleryPage, 
    VIEWER_PAGE_SIZE 
} from './ui/gallery-ui.js';
import { bufToHex } from './lib/merkle.js';
import { processRecursiveAudio } from './lib/audio-engine.js';

window.Buffer = Buffer;

// --- STATE ---
let currentChunks = [];
let currentRoot = null;
let currentMimeType = "application/octet-stream";
let currentFileMeta = { name: null, size: 0 };
let currentFileObjectUrl = null;

let networkFeeRateMicroPerByte = null;
let mainnetFeeRateMicroPerByte = null;
let lastFeeRateFetch = { current: null, mainnet: null };
let lastInscriptionId = null;

let viewerGalleryPage = 0;
let authMonitorInterval = null;
let authMonitorLastSnapshot = null;

// --- INITIALIZATION ---

journeyLog("App loading...");
journeyLog("Network configured", { url: network.coreApiUrl });

renderMintGuidance();
renderFeeEstimates({ currentChunks, networkFeeRateMicroPerByte, mainnetFeeRateMicroPerByte, lastFeeRateFetch });

const setAuthStatus = (message, tone = 'info') => {
    const el = document.getElementById('auth-status');
    if (!el) return;
    el.className = `status ${tone}`;
    el.innerText = message || '';
};

// --- UI HELPERS ---

window.showPage = (page) => {
    journeyLog(`Switching to page: ${page}`);
    document.querySelectorAll('[id^="page-"]').forEach(el => el.classList.add('hidden'));
    document.getElementById(`page-${page}`).classList.remove('hidden');

    if (page === 'mint') {
        void maybeFetchFeeRates({ maxAgeMs: 60_000 }).then((updated) => {
            if (updated) renderFeeEstimates({ currentChunks, networkFeeRateMicroPerByte, mainnetFeeRateMicroPerByte, lastFeeRateFetch, context: { mode: 'mint', missingCount: null } });
        });
    }

    if (page === 'play') {
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

// --- AUTH INIT ---

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

async function initAuthAndUI() {
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

    // Restore cached fee rates
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

// --- AUTH HANDLERS ---

document.getElementById('connect-wallet').addEventListener('click', () => {
    journeyLog("User clicked 'Connect Wallet'");
    setAuthStatus('Opening wallet connect...', 'info');
    void dumpAuthDebug('connect click (before showConnect)');

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

    let provider = null;
    try {
        provider = Connect.getStacksProvider?.() || null;
        if (provider) provider = wrapProvider(provider);
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
            setAuthStatus('Wallet connection canceled. Connect to deploy or inscribe.', 'warn');
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

// --- AUTH MONITOR ---

function getAuthMonitorSnapshot() {
    return {
        isStacksWalletInstalled: (() => {
            try { return Connect.isStacksWalletInstalled(); } catch { return false; }
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

// --- FEE HANDLING ---

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

document.getElementById('fee-per-tx')?.addEventListener('change', () => {
    try {
        localStorage.setItem('fee-per-tx', String(getFeePerTxMicroStx()));
    } catch {
        // ignore
    }
    renderFeeEstimates({ currentChunks, networkFeeRateMicroPerByte, mainnetFeeRateMicroPerByte, lastFeeRateFetch });
    renderMintFileStats({ currentFileMeta, currentChunks, currentRoot, currentMimeType, networkFeeRateMicroPerByte, mainnetFeeRateMicroPerByte });
});

document.getElementById('toggle-safe-mode')?.addEventListener('change', () => {
    renderMintProgress(isSafeModeEnabled()
        ? '<div>Safe mode enabled: waits for each transaction to confirm before continuing.</div>'
        : '<div>Safe mode disabled: proceeds after signing; use Resume if chunks are missing.</div>');
    renderMintFileStats({ currentFileMeta, currentChunks, currentRoot, currentMimeType, networkFeeRateMicroPerByte, mainnetFeeRateMicroPerByte });
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

        renderFeeEstimates({ currentChunks, networkFeeRateMicroPerByte, mainnetFeeRateMicroPerByte, lastFeeRateFetch });
        renderMintFileStats({ currentFileMeta, currentChunks, currentRoot, currentMimeType, networkFeeRateMicroPerByte, mainnetFeeRateMicroPerByte });
    } catch (e) {
        journeyLog('Fee rate fetch failed', { error: e?.message || String(e) });
        renderMintProgress('<div style="color:#856404">Could not fetch fee rates; using configured fee/tx.</div>');
        renderFeeEstimates({ currentChunks, networkFeeRateMicroPerByte, mainnetFeeRateMicroPerByte, lastFeeRateFetch });
        renderMintFileStats({ currentFileMeta, currentChunks, currentRoot, currentMimeType, networkFeeRateMicroPerByte, mainnetFeeRateMicroPerByte });
    }
});

// --- FILE HANDLING ---

document.getElementById('file-input').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Clear previous
    if (currentFileObjectUrl) { try { URL.revokeObjectURL(currentFileObjectUrl); } catch {} currentFileObjectUrl = null; }
    try { currentFileObjectUrl = URL.createObjectURL(file); } catch { currentFileObjectUrl = null; }

    const processed = await processFileForMint(file);
    currentChunks = processed.chunks;
    currentRoot = processed.root;
    currentFileMeta = processed.meta;
    currentMimeType = processed.mimeType;

    document.getElementById('mint-steps').innerHTML = `File: ${file.name} (${formatInt(file.size)} bytes) | Chunks: ${currentChunks.length} | Root: 0x${bufToHex(currentRoot)}`;
    document.getElementById('btn-start-mint').classList.remove('hidden');
    
    setMintFilePanelVisible(true);
    renderMintFilePreview(file, currentMimeType, currentFileObjectUrl);
    renderMintFileStats({ currentFileMeta, currentChunks, currentRoot, currentMimeType, networkFeeRateMicroPerByte, mainnetFeeRateMicroPerByte });
    
    void maybeFetchFeeRates({ maxAgeMs: 60_000 }).then((updated) => {
        if (updated) {
            renderFeeEstimates({ currentChunks, networkFeeRateMicroPerByte, mainnetFeeRateMicroPerByte, lastFeeRateFetch });
            renderMintFileStats({ currentFileMeta, currentChunks, currentRoot, currentMimeType, networkFeeRateMicroPerByte, mainnetFeeRateMicroPerByte });
        }
    });
    renderFeeEstimates({ currentChunks, networkFeeRateMicroPerByte, mainnetFeeRateMicroPerByte, lastFeeRateFetch });

    const restored = restoreLastInscription();
    if (restored !== null) {
        document.getElementById('resume-id-input').value = restored;
        renderMintProgress(`<div><strong>Last Inscription ID:</strong> #${restored} (pre-filled for resume)</div>`);
    }
    // Allow re-selecting the same file
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
        
        // Trigger manual change handler logic reused
        if (currentFileObjectUrl) { try { URL.revokeObjectURL(currentFileObjectUrl); } catch {} currentFileObjectUrl = null; }
        try { currentFileObjectUrl = URL.createObjectURL(file); } catch { currentFileObjectUrl = null; }

        const processed = await processFileForMint(file);
        currentChunks = processed.chunks;
        currentRoot = processed.root;
        currentFileMeta = processed.meta;
        currentMimeType = processed.mimeType;

        document.getElementById('mint-steps').innerHTML = `File: ${file.name} (${formatInt(file.size)} bytes) | Chunks: ${currentChunks.length} | Root: 0x${bufToHex(currentRoot)}`;
        document.getElementById('btn-start-mint').classList.remove('hidden');
        
        setMintFilePanelVisible(true);
        renderMintFilePreview(file, currentMimeType, currentFileObjectUrl);
        renderMintFileStats({ currentFileMeta, currentChunks, currentRoot, currentMimeType, networkFeeRateMicroPerByte, mainnetFeeRateMicroPerByte });
        renderFeeEstimates({ currentChunks, networkFeeRateMicroPerByte, mainnetFeeRateMicroPerByte, lastFeeRateFetch });
    });
})();

// --- DEPLOY ---

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

// --- MINT ---

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
        lastInscriptionId = inscriptionId;
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

        await startChunkUploads({ 
            id: inscriptionId, 
            currentChunks, 
            currentFileMeta, 
            currentMimeType, 
            currentRoot, 
            statusEl 
        });

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

// --- RESUME ---

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
            
            if (!val) {
                journeyLog(`Chunk ${i} MISSING.`);
                missingIndices.push(i);
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

            renderFeeEstimates({ currentChunks, networkFeeRateMicroPerByte, mainnetFeeRateMicroPerByte, lastFeeRateFetch, context: { mode: 'resume', missingCount: 0 } });
            await sealInscriptionTransaction(id, currentRoot, statusEl);
        } else {
            const counts = estimateTxCounts(chunkCount, missingIndices.length);
            statusEl.innerHTML = `Found ${missingIndices.length} missing chunks. This will require ~${counts.total} more transactions (missing uploads + seal).`;

            if (Number.isFinite(networkFeeRateMicroPerByte) && networkFeeRateMicroPerByte > 0) {
                const bytesUploads = missingIndices.reduce((sum, idx) => sum + estimateTxBytes.addChunk(currentChunks[idx].length), 0);
                const bytesTotal = bytesUploads + estimateTxBytes.seal;
                const micro = Math.ceil(bytesTotal * networkFeeRateMicroPerByte);
                statusEl.innerHTML += `<br><span style="color:#555">Fee-rate estimate remaining: ${formatMicroStx(micro)} (rate ${networkFeeRateMicroPerByte} microSTX/byte)</span>`;
            }
            renderFeeEstimates({ currentChunks, networkFeeRateMicroPerByte, mainnetFeeRateMicroPerByte, lastFeeRateFetch, context: { mode: 'resume', missingCount: missingIndices.length } });

            try {
                await ensureAuth({ action: 'upload missing chunks and seal the inscription' });
            } catch (e) {
                journeyLog("Resume blocked (auth not completed)", { error: e?.message || String(e) });
                statusEl.innerHTML = `<span style="color:#856404">Wallet required to upload/seal. Please connect and try again.</span>`;
                return;
            }

            statusEl.innerHTML = `Found ${missingIndices.length} missing chunks. Starting uploads...`;
            await startChunkUploads({ 
                id, 
                currentChunks, 
                currentFileMeta, 
                currentMimeType, 
                currentRoot, 
                statusEl, 
                specificIndices: missingIndices 
            });
            await sealInscriptionTransaction(id, currentRoot, statusEl);
        }

    } catch (e) {
        journeyLog("Resume Error", e);
        statusEl.innerHTML = `<span style="color:red">Error: ${getErrorMessage(e)}</span>`;
    }
});

// --- PLAYER / VIEWER ---

document.getElementById('btn-play-single').addEventListener('click', async () => {
    const idInput = document.getElementById('manifest-id-input');
    const id = parseInt(idInput.value);
    if (isNaN(id)) return alert("Please enter a numeric Inscription ID.");

    playerLog(`Loading Inscription #${id}...`);
    const container = document.getElementById('media-container');
    container.innerHTML = 'Loading...';

    try {
        const { data, mimeType } = await fetchInscriptionData(id);
        
        container.innerHTML = '';
        const blob = new Blob([data], { type: mimeType });
        const url = URL.createObjectURL(blob);

        if (mimeType.startsWith('image/')) {
            const img = document.createElement('img');
            img.src = url;
            img.style.maxWidth = '100%';
            container.appendChild(img);
        } else if (mimeType.startsWith('audio/')) {
            const audio = document.createElement('audio');
            audio.controls = true;
            audio.src = url;
            container.appendChild(audio);
        } else if (mimeType.startsWith('video/')) {
            const video = document.createElement('video');
            video.controls = true;
            video.src = url;
            video.style.maxWidth = '100%';
            container.appendChild(video);
        } else {
             const div = document.createElement('div');
             div.innerHTML = `
                <p>Content Type: ${mimeType}</p>
                <a href="${url}" download="inscription-${id}.dat" style="color:blue; text-decoration:underline;">Download Data</a>
             `;
             container.appendChild(div);
        }
        playerLog("Content loaded.");
    } catch (e) {
        playerLog(`Error: ${e.message}`);
        container.innerHTML = `<span style="color:red">Error loading #${id}</span>`;
    }
});

document.getElementById('btn-clear-viewer').addEventListener('click', () => {
    document.getElementById('media-container').innerHTML = '<span style="color: #ccc;">No content loaded</span>';
    document.getElementById('player-log').innerHTML = '';
    journeyLog("Viewer cleared.");
});

// --- GALLERY ---

document.getElementById('gallery-prev').addEventListener('click', () => {
    if (viewerGalleryPage > 0) {
        viewerGalleryPage--;
        void renderGalleryPage(viewerGalleryPage);
    }
});
document.getElementById('gallery-next').addEventListener('click', () => {
    viewerGalleryPage++;
    void renderGalleryPage(viewerGalleryPage);
});
document.getElementById('gallery-go').addEventListener('click', () => {
    const el = document.getElementById('gallery-page-input');
    const p = parseInt(el.value);
    if (!isNaN(p) && p >= 0) {
        viewerGalleryPage = p;
        void renderGalleryPage(viewerGalleryPage);
    }
});
document.getElementById('gallery-refresh').addEventListener('click', () => {
    void renderGalleryPage(viewerGalleryPage);
});
document.getElementById('gallery-jump').addEventListener('click', () => {
    const el = document.getElementById('gallery-jump-id');
    const id = parseInt(el.value);
    if (!isNaN(id) && id >= 0) {
        const page = Math.floor(id / VIEWER_PAGE_SIZE);
        viewerGalleryPage = page;
        void renderGalleryPage(viewerGalleryPage);
    }
});
