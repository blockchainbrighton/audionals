import { AppConfig, UserSession, showConnect } from '@stacks/connect';
import { StacksTestnet } from '@stacks/network';
import { callReadOnlyFunction, cvToValue, uintCV, bufferCV, PostConditionMode } from '@stacks/transactions';
import { chunkFile, computeMerkleRoot, bufToHex } from './lib/merkle.js';
import { processRecursiveAudio } from './lib/audio-engine.js';
import { Buffer } from 'buffer';

const appConfig = new AppConfig(['store_write', 'publish_data']);
const userSession = new UserSession({ appConfig });
const network = new StacksTestnet();
const CONTRACT_ADDR = 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM'; 
const CONTRACT_NAME = 'inscription-core';
let currentFile = null;
let currentChunks = [];
let currentRoot = null;

window.showPage = (page) => {
  document.querySelectorAll('[id^="page-"]').forEach(el => el.classList.add('hidden'));
  document.getElementById(`page-${page}`).classList.remove('hidden');
};

function log(msg) {
  const div = document.createElement('div');
  div.innerText = `> ${msg}`;
  document.getElementById('player-log').appendChild(div);
}

document.getElementById('connect-wallet').addEventListener('click', () => {
  showConnect({
    appDetails: { name: 'Stacks Proto', icon: window.location.origin + '/vite.svg' },
    redirectTo: '/',
    onFinish: () => { window.location.reload(); },
    userSession,
  });
});

document.getElementById('disconnect-wallet').addEventListener('click', () => {
  userSession.signUserOut('/');
});

if (userSession.isUserSignedIn()) {
  document.getElementById('address-display').innerText = `Connected: ${userSession.loadUserData().profile.stxAddress.testnet}`;
  document.getElementById('connect-wallet').classList.add('hidden');
  document.getElementById('disconnect-wallet').classList.remove('hidden');
}

document.getElementById('file-input').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const buf = await file.arrayBuffer();
  currentChunks = chunkFile(buf);
  currentRoot = computeMerkleRoot(currentChunks);
  document.getElementById('mint-steps').innerHTML = `<p>Size: ${buf.byteLength} bytes | Chunks: ${currentChunks.length}</p><p>Root: 0x${bufToHex(currentRoot)}</p>`;
  document.getElementById('btn-start-mint').classList.remove('hidden');
});

document.getElementById('btn-start-mint').addEventListener('click', async () => {
    alert("Check console for flows. Assuming ID=0 for this session.");
    await openContractCall({
        contractAddress: CONTRACT_ADDR,
        contractName: CONTRACT_NAME,
        functionName: 'begin-inscription',
        functionArgs: [ { type: 13, data: "application/json" }, uintCV(currentChunks.length * 8192), uintCV(currentChunks.length) ],
        network,
        onFinish: (data) => { console.log("Begin TX:", data.txId); startChunkUploads(0); }
    });
});

async function openContractCall(opts) {
    const { openContractCall } = await import('@stacks/connect');
    return openContractCall({ ...opts, postConditionMode: PostConditionMode.Allow });
}

async function startChunkUploads(id) {
    for (let i = 0; i < currentChunks.length; i++) {
        await new Promise(resolve => {
            setTimeout(() => {
                openContractCall({
                    contractAddress: CONTRACT_ADDR,
                    contractName: CONTRACT_NAME,
                    functionName: 'add-chunk',
                    functionArgs: [ uintCV(id), uintCV(i), bufferCV(Buffer.from(currentChunks[i])) ],
                    network,
                    onFinish: (data) => { console.log(`Chunk ${i} TX:`, data.txId); resolve(); }
                });
            }, 1000); 
        });
    }
    openContractCall({
        contractAddress: CONTRACT_ADDR,
        contractName: CONTRACT_NAME,
        functionName: 'seal-inscription',
        functionArgs: [ uintCV(id), bufferCV(Buffer.from(currentRoot)) ],
        network,
        onFinish: (data) => console.log("Sealed!", data.txId)
    });
}

async function fetchInscriptionData(id) {
    const metaRes = await callReadOnlyFunction({
        contractAddress: CONTRACT_ADDR,
        contractName: CONTRACT_NAME,
        functionName: 'get-inscription',
        functionArgs: [uintCV(id)],
        senderAddress: CONTRACT_ADDR,
        network
    });
    const meta = cvToValue(metaRes);
    if (!meta) throw new Error("Inscription not found");
    const chunkCount = Number(meta.value['chunk-count'].value);
    const buffers = [];
    for (let i = 0; i < chunkCount; i++) {
        const chunkRes = await callReadOnlyFunction({
            contractAddress: CONTRACT_ADDR,
            contractName: CONTRACT_NAME,
            functionName: 'get-chunk',
            functionArgs: [uintCV(id), uintCV(i)],
            senderAddress: CONTRACT_ADDR,
            network
        });
        buffers.push(cvToValue(chunkRes).value);
    }
    const totalLen = buffers.reduce((acc, b) => acc + b.length, 0);
    const fullFile = new Uint8Array(totalLen);
    let offset = 0;
    buffers.forEach(b => { fullFile.set(b, offset); offset += b.length; });
    return fullFile;
}

document.getElementById('btn-load-manifest').addEventListener('click', async () => {
    const manifestId = parseInt(document.getElementById('manifest-id-input').value);
    try {
        log("Fetching Manifest...");
        const manifestBytes = await fetchInscriptionData(manifestId);
        const manifest = JSON.parse(new TextDecoder().decode(manifestBytes));
        log(`IDs: ${JSON.stringify(manifest)}`);
        const clipBuffers = [];
        for (const clipId of manifest) {
            log(`Fetching Clip ${clipId}...`);
            const clipData = await fetchInscriptionData(parseInt(clipId));
            clipBuffers.push(clipData.buffer);
        }
        log("Playing...");
        const { audioCtx, outputBuffer } = await processRecursiveAudio(clipBuffers);
        const source = audioCtx.createBufferSource();
        source.buffer = outputBuffer;
        source.connect(audioCtx.destination);
        source.start();
    } catch (e) { log(`Error: ${e.message}`); }
});
