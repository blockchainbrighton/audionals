// ui/mint-ui.js
import { formatMicroStx, formatInt } from '../core/utils.js';
import { estimateTxCounts, estimateTxBytes } from '../logic/fee-estimation.js';
import { MINT_HTML_PREVIEW } from '../config.js';
import { bufToHex } from '../lib/merkle.js';
import { userSession } from '../core/auth.js';

export const renderMintGuidance = () => {
    const el = document.getElementById('mint-guidance');
    if (!el) return;
    el.innerText =
        'Large inscriptions require many sequential wallet signatures. Keep the wallet open, avoid refreshing, and consider smaller files if you see wallet “internal error” or repeated cancels. If interrupted, use Resume with the Inscription ID.';
};

export const renderMintProgress = (msg) => {
    const el = document.getElementById('mint-progress');
    if (!el) return;
    el.innerHTML = msg || '';
};

export const getFeePerTxMicroStx = () => {
    const el = document.getElementById('fee-per-tx');
    const raw = el ? Number(el.value) : NaN;
    const fee = Number.isFinite(raw) && raw >= 0 ? Math.floor(raw) : 500_000;
    return fee;
};

export const isSafeModeEnabled = () => Boolean(document.getElementById('toggle-safe-mode')?.checked);

export const setMintFilePanelVisible = (visible) => {
    const panel = document.getElementById('mint-file-panel');
    if (!panel) return;
    panel.classList.toggle('hidden', !visible);
};

export const clearMintFilePreview = () => {
    const el = document.getElementById('mint-file-preview');
    if (el) el.innerHTML = '';
    const stats = document.getElementById('mint-file-stats');
    if (stats) stats.innerHTML = '';
    setMintFilePanelVisible(false);
    // Cleanup object URLs handled by caller or state manager if possible
};

export const renderFeeEstimates = ({ 
    currentChunks, 
    networkFeeRateMicroPerByte, 
    mainnetFeeRateMicroPerByte, 
    lastFeeRateFetch, 
    context = { mode: 'mint', missingCount: null } 
}) => {
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

export const renderMintFileStats = ({
    currentFileMeta,
    currentChunks,
    currentRoot,
    currentMimeType,
    networkFeeRateMicroPerByte,
    mainnetFeeRateMicroPerByte
}) => {
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
    
    // logic duplicated from computeMintByteEstimate in main.js, simplified here
    const bytesBegin = estimateTxBytes.begin;
    const bytesSeal = estimateTxBytes.seal;
    const bytesUploads = currentChunks.reduce((sum, c) => sum + estimateTxBytes.addChunk(c.length), 0);
    const bytesEstimate = bytesBegin + bytesUploads + bytesSeal;

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
};

export const renderMintFilePreview = (file, currentMimeType, currentFileObjectUrl) => {
    const previewEl = document.getElementById('mint-file-preview');
    if (!previewEl) return;
    previewEl.innerHTML = '';

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

    // Fallback
    previewEl.innerHTML = `
        <div style="font-size:12px; color:#555;">
            No inline preview for <strong>${mime || 'unknown type'}</strong>.
        </div>
        ${safeLink}
    `;
};
