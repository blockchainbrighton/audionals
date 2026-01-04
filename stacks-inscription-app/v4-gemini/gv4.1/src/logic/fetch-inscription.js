// logic/fetch-inscription.js
import { uintCV, cvToValue, callReadOnlyFunction } from '@stacks/transactions';
import { journeyLog } from '../ui/logs.js';
import { getContractDetails } from '../core/contract.js';
import { sniffMimeType } from './file-processing.js';
import { network } from '../core/network.js';

export async function fetchInscriptionData(id) {
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
