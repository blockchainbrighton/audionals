import { bufToHex } from '../../lib/merkle.js';
import { formatInt, formatMicroStx } from '../../shared/format.js';
import { getFeePerTxMicroStx, isSafeModeEnabled } from './settings.js';

export function createMintUi({ mintState, feeFeature, userSession, htmlPreview } = {}) {
  const MINT_HTML_PREVIEW = {
    enabled: true,
    sandbox: 'allow-scripts allow-same-origin',
    ...(htmlPreview || {}),
  };

  const renderGuidance = () => {
    const el = document.getElementById('mint-guidance');
    if (!el) return;
    el.innerText =
      'Large inscriptions require many sequential wallet signatures. Keep the wallet open, avoid refreshing, and consider smaller files if you see wallet “internal error” or repeated cancels. If interrupted, use Resume with the Inscription ID.';
  };

  const renderProgress = (msg) => {
    const el = document.getElementById('mint-progress');
    if (!el) return;
    el.innerHTML = msg || '';
  };

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
    if (mintState.currentFileObjectUrl) {
      try {
        URL.revokeObjectURL(mintState.currentFileObjectUrl);
      } catch {
        // ignore
      }
      mintState.currentFileObjectUrl = null;
    }
  }

  function computeMintByteEstimate({ missingIndices = null, includeBegin = true } = {}) {
    const bytesBegin = includeBegin ? feeFeature.estimateTxBytes.begin : 0;
    const bytesSeal = feeFeature.estimateTxBytes.seal;
    const chunks = missingIndices
      ? missingIndices.map((i) => mintState.currentChunks[i]).filter(Boolean)
      : mintState.currentChunks;
    const bytesUploads = chunks.reduce((sum, c) => sum + feeFeature.estimateTxBytes.addChunk(c.length), 0);
    return { bytesBegin, bytesUploads, bytesSeal, bytesTotal: bytesBegin + bytesUploads + bytesSeal };
  }

  function renderMintFileStats() {
    const statsEl = document.getElementById('mint-file-stats');
    if (!statsEl) return;
    if (!mintState.currentFileMeta?.name || !mintState.currentChunks.length || !mintState.currentRoot) {
      statsEl.innerHTML = '';
      return;
    }

    const chunkCount = mintState.currentChunks.length;
    const lastChunkSize = mintState.currentChunks[mintState.currentChunks.length - 1]?.length ?? 0;
    const { total } = feeFeature.estimateTxCounts(chunkCount);
    const configuredFeePerTx = getFeePerTxMicroStx();
    const configuredTotal = configuredFeePerTx * total;
    const rootHex = `0x${bufToHex(mintState.currentRoot)}`;
    const bytesEstimate = computeMintByteEstimate({ includeBegin: true }).bytesTotal;

    const { currentNetworkMicroStxPerByte, mainnetMicroStxPerByte } = feeFeature.getFeeRates();
    const costAtRate = (rate) => {
      if (!Number.isFinite(rate) || rate <= 0) return null;
      return Math.ceil(bytesEstimate * rate);
    };
    const currentRateCost = costAtRate(currentNetworkMicroStxPerByte);
    const mainnetRateCost = costAtRate(mainnetMicroStxPerByte);

    const stxAddress = (() => {
      try {
        const ud = userSession.loadUserData();
        return ud?.profile?.stxAddress?.testnet || ud?.profile?.stxAddress?.mainnet || null;
      } catch {
        return null;
      }
    })();

    statsEl.innerHTML = `
      <div class="k">File</div><div class="v">${mintState.currentFileMeta.name}</div>
      <div class="k">MIME</div><div class="v">${mintState.currentMimeType || 'unknown'}</div>
      <div class="k">Size</div><div class="v">${formatInt(mintState.currentFileMeta.size)} bytes</div>
      <div class="k">Chunks</div><div class="v">${formatInt(chunkCount)} (8192 bytes max, last ${formatInt(lastChunkSize)} bytes)</div>
      <div class="k">Merkle root</div><div class="v">${rootHex}</div>
      <div class="k">Tx required</div><div class="v">~${formatInt(total)} (begin + ${formatInt(chunkCount)} chunk tx + seal)</div>
      <div class="k">Safe mode</div><div class="v">${isSafeModeEnabled() ? 'ON (wait for confirmations)' : 'OFF (faster, resume if missing)'}</div>
      <div class="k">Fee/tx</div><div class="v">${formatMicroStx(configuredFeePerTx)} (est. total ${formatMicroStx(configuredTotal)})</div>
      <div class="k">Fee-rate est</div><div class="v">${
        currentRateCost ? `${formatMicroStx(currentRateCost)} at ${currentNetworkMicroStxPerByte} µSTX/byte` : 'not loaded'
      }</div>
      <div class="k">Mainnet rate</div><div class="v">${
        mainnetRateCost ? `${formatMicroStx(mainnetRateCost)} at ${mainnetMicroStxPerByte} µSTX/byte` : 'not loaded'
      }</div>
      <div class="k">Reminder</div><div class="v">Save the Inscription ID shown after Step 1; it’s auto-saved and pre-filled for Resume.</div>
      <div class="k">Signer</div><div class="v">${stxAddress ? stxAddress : 'Not connected'}</div>
    `;
  }

  function renderMintFilePreview(file) {
    const previewEl = document.getElementById('mint-file-preview');
    if (!previewEl) return;
    previewEl.innerHTML = '';

    if (mintState.currentFileObjectUrl) {
      try {
        URL.revokeObjectURL(mintState.currentFileObjectUrl);
      } catch {
        // ignore
      }
      mintState.currentFileObjectUrl = null;
    }
    try {
      mintState.currentFileObjectUrl = URL.createObjectURL(file);
    } catch {
      mintState.currentFileObjectUrl = null;
    }

    const mime = file.type || mintState.currentMimeType || '';
    const lowerName = (file.name || '').toLowerCase();
    const isHtml = mime === 'text/html' || lowerName.endsWith('.html') || lowerName.endsWith('.htm');
    const safeLink = mintState.currentFileObjectUrl
      ? `<div style="margin-top:8px; font-size:12px;"><a href="${mintState.currentFileObjectUrl}" download="${file.name}">Download / open</a></div>`
      : '';

    if (mime.startsWith('image/') && mintState.currentFileObjectUrl) {
      previewEl.innerHTML = `<img src="${mintState.currentFileObjectUrl}" alt="preview" style="max-width:100%; height:auto; border-radius:6px;">${safeLink}`;
      return;
    }
    if (mime.startsWith('audio/') && mintState.currentFileObjectUrl) {
      previewEl.innerHTML = `<audio controls style="width:100%;" src="${mintState.currentFileObjectUrl}"></audio>${safeLink}`;
      return;
    }
    if (mime.startsWith('video/') && mintState.currentFileObjectUrl) {
      previewEl.innerHTML = `<video controls style="width:100%; max-height:260px;" src="${mintState.currentFileObjectUrl}"></video>${safeLink}`;
      return;
    }

    if (isHtml && mintState.currentFileObjectUrl) {
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
      iframe.src = mintState.currentFileObjectUrl;
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

    previewEl.innerHTML = `
      <div style="font-size:12px; color:#555;">
        No inline preview for <strong>${mime || 'unknown type'}</strong>.
      </div>
      ${safeLink}
    `;
  }

  return {
    renderGuidance,
    renderProgress,
    setMintFilePanelVisible,
    clearMintFilePreview,
    renderMintFilePreview,
    renderMintFileStats,
  };
}

