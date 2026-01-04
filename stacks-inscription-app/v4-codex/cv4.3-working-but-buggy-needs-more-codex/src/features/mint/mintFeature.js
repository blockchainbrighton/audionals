import { Buffer } from 'buffer';
import { cvToValue, uintCV, bufferCV, stringAsciiCV, PostConditionMode, AnchorMode } from '@stacks/transactions';
import { chunkFile, computeMerkleRoot, bufToHex } from '../../lib/merkle.js';
import { formatInt, formatMicroStx } from '../../shared/format.js';
import { getErrorMessage } from '../../shared/errors.js';
import { sleep } from '../../shared/time.js';
import { getFeePerTxMicroStx, isSafeModeEnabled } from './settings.js';
import { createMintUi } from './mintUi.js';
import {
  persistLastConfirmedChunk,
  persistLastInscriptionId,
  restoreLastInscriptionId,
  saveInscriptionProgressHint,
} from './mintStorage.js';
import { parseOkUIntFromTxResult, summarizeTxResult } from '../../stacks/txResult.js';

export function createMintFeature({ journeyLog, userSession, network, ensureAuth, contractService, feeFeature, mintState } = {}) {
  const MINT_HTML_PREVIEW = {
    enabled: true,
    sandbox: 'allow-scripts allow-same-origin',
  };

  const ui = createMintUi({ mintState, feeFeature, userSession, htmlPreview: MINT_HTML_PREVIEW });

  const renderMintGuidance = () => ui.renderGuidance();

  const renderMintProgress = (msg) => ui.renderProgress(msg);

  const persistLastInscription = (id) => persistLastInscriptionId(mintState, id);

  const restoreLastInscription = () => restoreLastInscriptionId();

  function setMintFilePanelVisible(visible) {
    ui.setMintFilePanelVisible(visible);
  }

  function clearMintFilePreview() {
    ui.clearMintFilePreview();
  }

  function renderMintFileStats() {
    ui.renderMintFileStats();
  }

  function renderMintFilePreview(file) {
    ui.renderMintFilePreview(file);
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
    mintState.currentFileMeta = { name: file.name, size: file.size };
    mintState.currentMimeType = file.type || guessMimeTypeFromName(file.name) || 'application/octet-stream';
    journeyLog(`Detected MIME: ${mintState.currentMimeType}`);

    const buf = await file.arrayBuffer();
    journeyLog('File read into ArrayBuffer. Starting chunking...');

    mintState.currentChunks = chunkFile(buf);
    journeyLog(`File chunked into ${mintState.currentChunks.length} pieces.`);

    mintState.currentRoot = computeMerkleRoot(mintState.currentChunks);
    journeyLog('Merkle Root calculated', { root: bufToHex(mintState.currentRoot) });

    const stepsEl = document.getElementById('mint-steps');
    if (stepsEl) {
      stepsEl.innerHTML = `File: ${file.name} (${formatInt(file.size)} bytes) | Chunks: ${mintState.currentChunks.length} | Root: 0x${bufToHex(
        mintState.currentRoot
      )}`;
    }
    document.getElementById('btn-start-mint')?.classList.remove('hidden');
    setMintFilePanelVisible(true);
    renderMintFilePreview(file);
    renderMintFileStats();
    void feeFeature.maybeFetchFeeRates({ maxAgeMs: 60_000 }).then((updated) => {
      if (updated) {
        feeFeature.renderFeeEstimates({ mode: 'mint', missingCount: null });
        renderMintFileStats();
      }
    });
    feeFeature.renderFeeEstimates({ mode: 'mint', missingCount: null });

    const restored = restoreLastInscription();
    if (restored !== null) {
      const resumeEl = document.getElementById('resume-id-input');
      if (resumeEl) resumeEl.value = restored;
      renderMintProgress(`<div><strong>Last Inscription ID:</strong> #${restored} (pre-filled for resume)</div>`);
    }
  }

  async function sealInscriptionTransaction(id, root, statusEl) {
    const { address, name } = contractService.getContractDetails();
    statusEl.innerHTML += `
      <div style="background:#eef; padding:10px; border-radius:5px; margin-top:10px;">
        <h3 style="margin-top:0">Step: Seal & Finalize</h3>
        <p>Signing Seal Transaction...</p>
      </div>
    `;

    journeyLog('Sealing inscription...', { root: bufToHex(root) });
    const sealTx = await contractService.openContractCallWrapper({
      contractAddress: address,
      contractName: name,
      functionName: 'seal-inscription',
      functionArgs: [uintCV(id), bufferCV(Buffer.from(root))],
      network,
      userSession,
      postConditionMode: PostConditionMode.Allow,
      anchorMode: AnchorMode.Any,
    });

    if (sealTx?.txId && isSafeModeEnabled()) await contractService.waitForTransactionSuccess(sealTx.txId);

    statusEl.innerHTML += `
      <div style="background:#d4edda; padding:10px; border-radius:5px; color:#155724; margin-top: 10px;">
        <h3 style="margin-top:0">🎉 Inscription #${id} Complete!</h3>
        <button onclick="document.getElementById('manifest-id-input').value = ${id}; showPage('play');" style="background:#28a745; color:white; border:none; padding:10px; cursor:pointer;">View Inscription</button>
      </div>
    `;
  }

  async function startChunkUploads(id, statusEl, specificIndices = null) {
    journeyLog(`Starting sequential chunk uploads for ID: ${id}`);
    const { address, name } = contractService.getContractDetails();

    const indicesToUpload = specificIndices || Array.from({ length: mintState.currentChunks.length }, (_, i) => i);
    const totalToUpload = indicesToUpload.length;

    saveInscriptionProgressHint({
      id,
      contractId: `${address}.${name}`,
      mintState,
      safeMode: isSafeModeEnabled(),
      rootHex: mintState.currentRoot ? bufToHex(mintState.currentRoot) : null,
    });

    for (let n = 0; n < indicesToUpload.length; n++) {
      const i = indicesToUpload[n];
      journeyLog(`Preparing Chunk ${i}/${mintState.currentChunks.length}`);

      const p = document.createElement('p');
      p.innerText = `Uploading Part ${id}.${i} (${n + 1}/${totalToUpload})...`;
      p.style.margin = '5px 0';
      p.style.paddingLeft = '20px';
      statusEl.appendChild(p);

      try {
        await sleep(750);

        const tx = await contractService.openContractCallWrapper({
          contractAddress: address,
          contractName: name,
          functionName: 'add-chunk',
          functionArgs: [uintCV(id), uintCV(i), bufferCV(Buffer.from(mintState.currentChunks[i]))],
          network,
          userSession,
          postConditionMode: PostConditionMode.Allow,
          anchorMode: AnchorMode.Any,
        });

        const txId = tx?.txId || null;
        if (txId) p.innerText = `Part ${id}.${i} - Sent (${txId.slice(0, 10)}…)`;
        if (txId && isSafeModeEnabled()) await contractService.waitForTransactionSuccess(txId);

        p.innerText = `Part ${id}.${i} - Confirmed ✓`;
        p.style.color = '#28a745';

        persistLastConfirmedChunk(id, i);
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
        throw err;
      }
    }
  }

  async function onStartMintClick() {
    journeyLog("User clicked 'Begin Inscription'");
    if (!mintState.currentChunks.length) {
      journeyLog('ABORT: No file chunks available.');
      alert('Please select a file first.');
      return;
    }

    const statusEl = document.getElementById('mint-steps');
    try {
      await ensureAuth({ action: 'inscribe a file' });
    } catch (e) {
      journeyLog('Mint blocked (auth not completed)', { error: e?.message || String(e) });
      if (statusEl) {
        statusEl.innerHTML += `
          <div style="background:#fff3cd; padding:15px; border-radius:5px; color:#856404; margin-top:10px;">
            <h3 style="margin-top:0">Wallet Required</h3>
            <p>Connect your wallet to start an inscription. You can still view existing inscriptions without connecting.</p>
          </div>
        `;
      }
      return;
    }

    try {
      const { address, name } = contractService.getContractDetails();
      journeyLog('MINT DEBUG config', {
        contractId: `${address}.${name}`,
        file: mintState.currentFileMeta,
        mimeType: mintState.currentMimeType,
        chunkCount: mintState.currentChunks.length,
        rootHex: mintState.currentRoot ? bufToHex(mintState.currentRoot) : null,
        safeMode: isSafeModeEnabled(),
        feePerTxMicroStx: getFeePerTxMicroStx(),
      });

      const txCounts = feeFeature.estimateTxCounts(mintState.currentChunks.length);
      const feePerTx = getFeePerTxMicroStx();

      renderMintProgress(`
        <div><strong>Ready to mint.</strong> Save your ID when it appears.</div>
        <div><strong>Expected signatures:</strong> ~${formatInt(txCounts.total)} transactions</div>
        <div><strong>Configured fee:</strong> ${formatMicroStx(feePerTx)} per tx (estimated total ${formatMicroStx(
        feePerTx * txCounts.total
      )})</div>
        <div style="color:#856404">Tip: For large files, keep Xverse open and do not refresh. If you stop mid-way, use Resume with the ID.</div>
      `);

      const args = [
        stringAsciiCV(mintState.currentMimeType),
        uintCV(
          mintState.currentFileMeta?.size || mintState.currentChunks.reduce((sum, c) => sum + c.length, 0)
        ),
        uintCV(mintState.currentChunks.length),
      ];

      if (statusEl) {
        statusEl.innerHTML = `
          <div style="background:#eef; padding:15px; border-radius:5px;">
            <h3 style="margin-top:0">Step 1: Reserve Inscription Slot</h3>
            <p>Creating "Draft" Inscription on-chain...</p>
          </div>
        `;
      }

      const txData = await contractService.openContractCallWrapper({
        contractAddress: address,
        contractName: name,
        functionName: 'begin-inscription',
        functionArgs: args,
        network,
        userSession,
        postConditionMode: PostConditionMode.Allow,
        anchorMode: AnchorMode.Any,
      });

      const txId = txData.txId;
      journeyLog(`Initialization TX sent: ${txId}`);

      if (statusEl) {
        statusEl.innerHTML = `
          <div style="background:#fff3cd; padding:15px; border-radius:5px; color:#856404;">
            <h3 style="margin-top:0">Step 1: Confirming...</h3>
            <p><strong>TX:</strong> ${txId}</p>
            <p>Waiting for Inscription ID assignment...</p>
            <div class="spinner" style="border: 4px solid #f3f3f3; border-top: 4px solid #3498db; border-radius: 50%; width: 20px; height: 20px; animation: spin 2s linear infinite; margin: 0 auto;"></div>
          </div>
        `;
      }

      const txDetails = await contractService.waitForTransactionSuccess(txId);
      journeyLog('TX DEBUG begin-inscription confirmed', {
        txId,
        status: txDetails?.tx_status ?? null,
        result: summarizeTxResult(txDetails?.tx_result),
      });

      const parsed = parseOkUIntFromTxResult(txDetails?.tx_result);
      if (!parsed.ok) {
        journeyLog('TX DEBUG begin-inscription parse failed', parsed);
        const details = parsed.debug?.repr ? ` Result: ${parsed.debug.repr}` : '';
        if (parsed.kind === 'err_response') {
          throw new Error(`Contract returned (err u${parsed.errCode ?? 'unknown'}).${details}`);
        }
        if (parsed.kind === 'not_uint') {
          throw new Error(`Contract returned (ok ...) but not a uint ID.${details} (${parsed.detail || 'unknown'})`);
        }
        if (parsed.kind === 'not_response') {
          throw new Error(`Unexpected tx result type for begin-inscription.${details} (${parsed.detail || 'unknown'})`);
        }
        throw new Error(
          `Could not parse Inscription ID from transaction result (expected "(ok u<id>)").${details} ` +
            `This usually means the selected contract is not the expected inscription-core version.`
        );
      }

      const inscriptionId = parsed.value;

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

      if (statusEl) {
        statusEl.innerHTML = `
          <div style="background:#d4edda; padding:15px; border-radius:5px; color:#155724;">
            <h3 style="margin-top:0">Step 2: Upload Data</h3>
            <p><strong>Draft ID: #${inscriptionId}</strong> ready.</p>
            <p>Starting chunk uploads...</p>
          </div>
        `;
      }

      await startChunkUploads(inscriptionId, statusEl);
      await sealInscriptionTransaction(inscriptionId, mintState.currentRoot, statusEl);
    } catch (e) {
      journeyLog('Minting Process Error', { error: e?.message || String(e) });
      if (mintState.lastInscriptionId !== null) {
        renderMintProgress(`
          <div style="background:#fff3cd; padding:10px; border-radius:5px; color:#856404;">
            <div><strong>Mint interrupted.</strong></div>
            <div>Resume with Inscription ID: <strong>#${mintState.lastInscriptionId}</strong></div>
            <div>Mint Mode → “Resume / Retry Inscription” → enter the ID → Check & Resume</div>
          </div>
        `);
      }
      document.getElementById('mint-steps').innerHTML += `
        <div style="background:#f8d7da; padding:15px; border-radius:5px; color:#721c24; margin-top:10px;">
          <h3>Process Paused / Failed</h3>
          <p>${e?.message || String(e)}</p>
          <p>If you cancelled a transaction, you can reload the page to start fresh.</p>
        </div>
      `;
    }
  }

  async function onResumeMintClick() {
    const idInput = document.getElementById('resume-id-input');
    if (!idInput?.value) return alert('Please enter an Inscription ID.');
    const id = parseInt(idInput.value);

    if (!mintState.currentChunks.length) return alert('Please load the ORIGINAL file first so we have the data to upload.');

    journeyLog(`Attempting to resume Inscription ID: ${id}`);
    const statusEl = document.getElementById('resume-status');
    if (statusEl) statusEl.innerHTML = "Checking on-chain status... <span class='spinner'>...</span>";

    try {
      const { address, name } = contractService.getContractDetails();

      const metaRes = await contractService.callReadOnlyFunctionWithRetry({
        contractAddress: address,
        contractName: name,
        functionName: 'get-inscription',
        functionArgs: [uintCV(id)],
        senderAddress: address,
        network,
      });
      const meta = cvToValue(metaRes);
      if (!meta) throw new Error('Inscription ID not found on-chain.');

      const chunkCount = Number(meta.value['chunk-count'].value);
      if (chunkCount !== mintState.currentChunks.length) {
        throw new Error(`File Mismatch! On-chain expects ${chunkCount} chunks, but loaded file has ${mintState.currentChunks.length}.`);
      }

      if (meta.value.sealed.value) {
        if (statusEl) statusEl.innerHTML = `<span style="color:green">Inscription #${id} is already SEALED and complete.</span>`;
        return;
      }

      if (statusEl) statusEl.innerHTML = 'Scanning chunks... (this may take a moment)';
      const missingIndices = [];

      for (let i = 0; i < chunkCount; i++) {
        if (i > 0 && i % 10 === 0) {
          if (statusEl) statusEl.innerHTML = `Scanning chunks... ${i}/${chunkCount}`;
          await sleep(150);
        }

        const res = await contractService.callReadOnlyFunctionWithRetry({
          contractAddress: address,
          contractName: name,
          functionName: 'get-chunk',
          functionArgs: [uintCV(id), uintCV(i)],
          senderAddress: address,
          network,
        });
        const val = cvToValue(res);
        if (!val) {
          journeyLog(`Chunk ${i} MISSING.`);
          missingIndices.push(i);
        } else {
          journeyLog(`Chunk ${i} EXISTS.`);
        }
      }

      if (missingIndices.length === 0) {
        if (statusEl) statusEl.innerHTML = 'All chunks found! Ready to seal.';
        try {
          await ensureAuth({ action: 'seal the inscription' });
        } catch (e) {
          journeyLog('Resume blocked (auth not completed)', { error: e?.message || String(e) });
          if (statusEl) statusEl.innerHTML = `<span style="color:#856404">Wallet required to seal. Please connect and try again.</span>`;
          return;
        }

        feeFeature.renderFeeEstimates({ mode: 'resume', missingCount: 0 });
        await sealInscriptionTransaction(id, mintState.currentRoot, statusEl);
      } else {
        const counts = feeFeature.estimateTxCounts(chunkCount, missingIndices.length);
        if (statusEl) {
          statusEl.innerHTML = `Found ${missingIndices.length} missing chunks. This will require ~${counts.total} more transactions (missing uploads + seal).`;
        }

        const { currentNetworkMicroStxPerByte } = feeFeature.getFeeRates();
        if (Number.isFinite(currentNetworkMicroStxPerByte) && currentNetworkMicroStxPerByte > 0 && statusEl) {
          const bytesUploads = missingIndices.reduce(
            (sum, idx) => sum + feeFeature.estimateTxBytes.addChunk(mintState.currentChunks[idx].length),
            0
          );
          const bytesTotal = bytesUploads + feeFeature.estimateTxBytes.seal;
          const micro = Math.ceil(bytesTotal * currentNetworkMicroStxPerByte);
          statusEl.innerHTML += `<br><span style="color:#555">Fee-rate estimate remaining: ${formatMicroStx(
            micro
          )} (rate ${currentNetworkMicroStxPerByte} microSTX/byte)</span>`;
        }

        feeFeature.renderFeeEstimates({ mode: 'resume', missingCount: missingIndices.length });

        try {
          await ensureAuth({ action: 'upload missing chunks and seal the inscription' });
        } catch (e) {
          journeyLog('Resume blocked (auth not completed)', { error: e?.message || String(e) });
          if (statusEl) statusEl.innerHTML = `<span style="color:#856404">Wallet required to upload/seal. Please connect and try again.</span>`;
          return;
        }

        if (statusEl) statusEl.innerHTML = `Found ${missingIndices.length} missing chunks. Starting uploads...`;
        await startChunkUploads(id, statusEl, missingIndices);
        await sealInscriptionTransaction(id, mintState.currentRoot, statusEl);
      }
    } catch (e) {
      journeyLog('Resume Error', e);
      if (statusEl) statusEl.innerHTML = `<span style="color:red">Error: ${getErrorMessage(e)}</span>`;
    }
  }

  function registerHandlers() {
    document.getElementById('btn-start-mint')?.addEventListener('click', () => void onStartMintClick());
    document.getElementById('btn-resume-mint')?.addEventListener('click', () => void onResumeMintClick());

    document.getElementById('file-input')?.addEventListener('change', async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      await handleSelectedFile(file);
      e.target.value = '';
    });

    (() => {
      const dropZone = document.getElementById('drop-zone');
      if (!dropZone) return;

      const prevent = (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
      };
      const setActive = (active) => dropZone.classList.toggle('active', active);

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
  }

  function handleSafeModeChanged() {
    renderMintProgress(
      isSafeModeEnabled()
        ? '<div>Safe mode enabled: waits for each transaction to confirm before continuing.</div>'
        : '<div>Safe mode disabled: proceeds after signing; use Resume if chunks are missing.</div>'
    );
    renderMintFileStats();
  }

  function onShowMintPage() {
    if (!userSession.isUserSignedIn()) {
      const mintEl = document.getElementById('mint-steps');
      if (mintEl && !mintEl.innerText.trim()) {
        mintEl.innerHTML = `
          <div style="background:#fff3cd; padding:10px; border-radius:5px; color:#856404;">
            Connect your wallet to inscribe. Viewing inscriptions works without a wallet.
          </div>
        `;
      }
    }
  }

  function init() {
    renderMintGuidance();
    feeFeature.renderFeeEstimates({ mode: 'mint', missingCount: null });
  }

  return {
    init,
    registerHandlers,
    renderMintFileStats,
    renderMintProgress,
    handleSafeModeChanged,
    onShowMintPage,
    handleSelectedFile,
  };
}
