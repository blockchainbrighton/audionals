// logic/transaction-flow.js
import * as Connect from '@stacks/connect';
import { 
    uintCV, 
    bufferCV, 
    PostConditionMode, 
    AnchorMode 
} from '@stacks/transactions';
import { journeyLog } from '../ui/logs.js';
import { getContractDetails } from '../core/contract.js';
import { network } from '../core/network.js';
import { userSession } from '../core/auth.js';
import { renderMintProgress, getFeePerTxMicroStx, isSafeModeEnabled } from '../ui/mint-ui.js';
import { bufToHex } from '../lib/merkle.js';
import { sleep, getErrorMessage } from '../core/utils.js';

// HELPER: Promisified Contract Call
export function openContractCallWrapper(options) {
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
export async function waitForTransactionSuccess(txId, { timeoutMs = 10 * 60 * 1000, pollMs = 5000 } = {}) {
    journeyLog(`Polling for TX: ${txId}`);
    const apiUrl = network.coreApiUrl; 
    
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
        }, pollMs);
    });
}

export async function sealInscriptionTransaction(id, root, statusEl) {
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
            <button onclick="document.getElementById('manifest-id-input').value = ${id}; window.showPage('play');" style="background:#28a745; color:white; border:none; padding:10px; cursor:pointer;">View Inscription</button>
        </div>
    `;
}

export async function startChunkUploads({ 
    id, 
    currentChunks, 
    currentFileMeta, 
    currentMimeType, 
    currentRoot, 
    statusEl, 
    specificIndices = null 
}) {
    journeyLog(`Starting sequential chunk uploads for ID: ${id}`);
    const { address, name } = getContractDetails();
    
    const indicesToUpload = specificIndices || Array.from({length: currentChunks.length}, (_, i) => i);
    const totalToUpload = indicesToUpload.length;

    // Persist basic progress
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
            // Small pacing to reduce wallet/provider flakiness
            await sleep(750);
            
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

            // Persist confirmed chunk index
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
