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
        const safeStringify = (obj) => JSON.stringify(obj, (key, value) => 
            typeof value === 'bigint' ? value.toString() + 'n' : value
        );
        
        div.innerText = logMsg + (data ? ' ' + safeStringify(data).substring(0, 200) + '...' : '');
        el.prepend(div);
    }
};

journeyLog("App loading...");

const appConfig = new Connect.AppConfig(['store_write', 'publish_data']);
const userSession = new Connect.UserSession({ appConfig });
const network = new StacksTestnet({ url: 'https://api.testnet.hiro.so' });

journeyLog("Network configured", { url: network.coreApiUrl });

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

// UI Logic
window.showPage = (page) => {
    journeyLog(`Switching to page: ${page}`);
    document.querySelectorAll('[id^="page-"]').forEach(el => el.classList.add('hidden'));
    document.getElementById(`page-${page}`).classList.remove('hidden');
};

const updateUI = () => {
    const signedIn = userSession.isUserSignedIn();
    journeyLog(`Updating UI. User signed in: ${signedIn}`);
    if (signedIn) {
        const userData = userSession.loadUserData();
        const addr = userData.profile.stxAddress.testnet;
        journeyLog(`User address: ${addr}`);
        document.getElementById('address-display').innerText = `Connected: ${addr}`;
        document.getElementById('connect-wallet').classList.add('hidden');
        document.getElementById('disconnect-wallet').classList.remove('hidden');
    } else {
        document.getElementById('address-display').innerText = '';
        document.getElementById('connect-wallet').classList.remove('hidden');
        document.getElementById('disconnect-wallet').classList.add('hidden');
    }
};

// INITIALIZE UI
updateUI();

// AUTH HANDLERS
document.getElementById('connect-wallet').addEventListener('click', () => {
    journeyLog("User clicked 'Connect Wallet'");
    Connect.showConnect({
        appDetails: { name: 'Stacks Inscription Proto', icon: window.location.origin + '/vite.svg' },
        userSession,
        onFinish: () => {
            journeyLog("Auth onFinish triggered");
            updateUI();
        },
        onCancel: () => {
            journeyLog("Auth onCancel triggered");
        }
    });
});

document.getElementById('disconnect-wallet').addEventListener('click', () => {
    journeyLog("User clicked 'Disconnect Wallet'");
    userSession.signUserOut();
    updateUI();
});

const ensureAuth = (callback) => {
    journeyLog("Ensuring auth before action...");
    if (userSession.isUserSignedIn()) {
        journeyLog("Auth verified.");
        callback();
    } else {
        journeyLog("Auth missing. Redirecting to connect...");
        Connect.showConnect({
            appDetails: { name: 'Stacks Inscription Proto', icon: window.location.origin + '/vite.svg' },
            userSession,
            onFinish: () => {
                journeyLog("Auth onFinish (ensureAuth) triggered");
                updateUI();
                callback();
            }
        });
    }
};

// FILE HANDLING
document.getElementById('file-input').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    journeyLog(`File selected: ${file.name} (${file.size} bytes)`);
    
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
document.getElementById('btn-deploy-contract').addEventListener('click', () => {
    journeyLog("User clicked 'Deploy Contract'");
    ensureAuth(() => {
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
});

// THE MINT ACTION
document.getElementById('btn-start-mint').addEventListener('click', () => {
    journeyLog("User clicked 'Start Inscription'");
    if (!currentChunks.length) {
        journeyLog("ABORT: No file chunks available.");
        return alert("Please select a file first.");
    }
    
    ensureAuth(() => {
        try {
            const { address, name } = getContractDetails();
            const args = [ 
                stringAsciiCV("application/json"), 
                uintCV(currentChunks.length * 8192), 
                uintCV(currentChunks.length) 
            ];
            
            journeyLog(`Constructing openContractCall for ${address}.${name}::begin-inscription`);
            journeyLog("Args CV:", args.map(a => ({ type: a.type, val: a.value?.toString() || a.data })));

            const statusEl = document.getElementById('mint-steps');
            statusEl.innerHTML = "<b>Status: Sending Initialization TX...</b>";

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

            journeyLog("Triggering wallet popup via Connect.openContractCall...", {
                contract: `${address}.${name}`,
                func: 'begin-inscription',
                network: network.coreApiUrl
            });

            Connect.openContractCall({
                ...txParams,
                onFinish: (data) => {
                    journeyLog("Mint onFinish triggered", data);
                    statusEl.innerHTML = `
                        <b>Step 1 Complete! TX: ${data.txId}</b><br>
                        <p style="color:orange">WAIT for this transaction to confirm (approx 2 mins).</p>
                        <input type="number" id="manual-inscription-id" placeholder="ID (e.g. 0)" value="0">
                        <button id="btn-start-uploads">Start Chunk Uploads</button>
                    `;
                    document.getElementById('btn-start-uploads').addEventListener('click', () => {
                        const id = parseInt(document.getElementById('manual-inscription-id').value);
                        journeyLog(`User clicked 'Start Chunk Uploads' for ID: ${id}`);
                        startChunkUploads(id);
                    });
                },
                onCancel: () => {
                    journeyLog("Mint onCancel triggered (User closed wallet or rejected)");
                    statusEl.innerHTML = "<b>Status: Transaction Cancelled by User.</b>";
                }
            });
        } catch (e) {
            journeyLog("CRITICAL ERROR in Mint Action setup", { error: e.message, stack: e.stack });
            alert("Error setting up transaction: " + e.message);
        }
    });
});

async function startChunkUploads(id) {
    journeyLog(`Starting sequential chunk uploads for ID: ${id}`);
    const { address, name } = getContractDetails();
    for (let i = 0; i < currentChunks.length; i++) {
        journeyLog(`Preparing Chunk ${i}/${currentChunks.length}`);
        await new Promise(r => setTimeout(r, 1000));
        Connect.openContractCall({
            contractAddress: address,
            contractName: name,
            functionName: 'add-chunk',
            functionArgs: [ uintCV(id), uintCV(i), bufferCV(Buffer.from(currentChunks[i])) ],
            network,
            userSession,
            onFinish: (d) => journeyLog(`Chunk ${i} Sent`, { txId: d.txId }),
            onCancel: () => journeyLog(`Chunk ${i} Cancelled`)
        });
    }
}

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
        
        const count = Number(meta.value['chunk-count'].value);
        journeyLog(`Inscription found. Expecting ${count} chunks.`);
        
        const buffers = [];
        for (let i = 0; i < count; i++) {
            journeyLog(`Fetching Chunk ${i}...`);
            const res = await callReadOnlyFunction({
                contractAddress: address, contractName: name,
                functionName: 'get-chunk', functionArgs: [uintCV(id), uintCV(i)],
                senderAddress: address, network
            });
            journeyLog(`Chunk ${i} raw res:`, res);
            const val = cvToValue(res);
            journeyLog(`Chunk ${i} cvToValue:`, val);
            
            // Heuristic fix: check where the bytes are
            let bytes;
            if (val instanceof Uint8Array) bytes = val;
            else if (val && val.value) bytes = val.value; // Maybe it didn't unwrap?
            else if (val && val.buffer) bytes = val.buffer; // Maybe it's a Buffer object?
            else bytes = val; // Fallback

            // If it's a hex string (older stacks.js behavior?)
            if (typeof bytes === 'string') {
                journeyLog("Chunk is string, converting hex...");
                if (bytes.startsWith('0x')) bytes = bytes.slice(2);
                const byteArray = new Uint8Array(bytes.length / 2);
                for (let j = 0; j < bytes.length; j += 2) {
                    byteArray[j / 2] = parseInt(bytes.substring(j, j + 2), 16);
                }
                bytes = byteArray;
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
        
        return full;
    } catch (e) {
        journeyLog("Fetch Error", { error: e.message });
        throw e;
    }
}

document.getElementById('btn-play-single').addEventListener('click', async () => {
    const id = parseInt(document.getElementById('manifest-id-input').value);
    journeyLog(`User clicked 'Play Single' for ID: ${id}`);
    try {
        playerLog("Fetching...");
        const data = await fetchInscriptionData(id);
        
        journeyLog("Audio data fetched. Processing...");
        
        // Attempt to decode
        const { audioCtx, outputBuffer } = await processRecursiveAudio([data.buffer]);
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

document.getElementById('btn-load-manifest').addEventListener('click', async () => {
    const manifestId = parseInt(document.getElementById('manifest-id-input').value);
    journeyLog(`User clicked 'Load Manifest' for ID: ${manifestId}`);
    try {
        playerLog("Fetching...");
        const bytes = await fetchInscriptionData(manifestId);
        const manifest = JSON.parse(new TextDecoder().decode(bytes));
        journeyLog("Manifest parsed", manifest);
        
        const clips = [];
        for (const clipId of manifest) {
            playerLog(`Clip ${clipId}...`);
            const data = await fetchInscriptionData(parseInt(clipId));
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
