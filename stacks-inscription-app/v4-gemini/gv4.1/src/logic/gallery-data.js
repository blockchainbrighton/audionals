// logic/gallery-data.js
import { uintCV, cvToValue } from '@stacks/transactions';
import { callReadOnlyFunctionWithRetry, getContractDetails } from '../core/contract.js';
import { network } from '../core/network.js';

export const inscriptionMetaCache = new Map();

export function tryParseMeta(meta) {
    if (!meta) return null;
    const v = meta.value || meta;
    try {
        const sealed = Boolean(v.sealed?.value ?? v.sealed);
        const totalSize = Number(v['total-size']?.value ?? v['total-size'] ?? 0);
        const chunkCount = Number(v['chunk-count']?.value ?? v['chunk-count'] ?? 0);
        const owner = v.owner?.value ?? v.owner ?? null;
        const rawMime = v['mime-type'] ?? null;
        const mime =
            typeof rawMime === 'string'
                ? rawMime
                : rawMime?.value ?? rawMime?.data ?? (rawMime?.type ? String(rawMime.type) : null);
        return { sealed, totalSize, chunkCount, owner, mimeType: mime || 'unknown' };
    } catch {
        return { sealed: false, totalSize: 0, chunkCount: 0, owner: null, mimeType: 'unknown' };
    }
}

export async function fetchInscriptionMeta(id) {
    if (inscriptionMetaCache.has(id)) return inscriptionMetaCache.get(id);
    const { address, name } = getContractDetails();
    
    // We use callReadOnlyFunctionWithRetry to be robust against network blips
    const res = await callReadOnlyFunctionWithRetry({
        contractAddress: address,
        contractName: name,
        functionName: 'get-inscription',
        functionArgs: [uintCV(id)],
        senderAddress: address,
        network,
    });
    
    const val = cvToValue(res);
    const parsed = tryParseMeta(val);
    if (parsed) inscriptionMetaCache.set(id, parsed);
    return parsed;
}
