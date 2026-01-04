// core/contract.js
import { callReadOnlyFunction } from '@stacks/transactions';
import { journeyLog } from '../ui/logs.js';
import { getErrorMessage, sleep } from './utils.js';

export const getContractDetails = () => {
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

export async function callReadOnlyFunctionWithRetry(opts, { retries = 3, baseDelayMs = 400 } = {}) {
    let lastErr = null;
    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            return await callReadOnlyFunction(opts);
        } catch (e) {
            lastErr = e;
            const msg = getErrorMessage(e);
            journeyLog('Read-only call failed', { attempt, error: msg, functionName: opts.functionName });
            if (attempt >= retries) break;
            const delay = baseDelayMs * Math.pow(2, attempt);
            await sleep(delay);
        }
    }
    throw lastErr || new Error('Read-only call failed');
}
