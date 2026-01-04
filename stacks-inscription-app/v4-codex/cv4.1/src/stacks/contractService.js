import * as Connect from '@stacks/connect';
import { callReadOnlyFunction } from '@stacks/transactions';
import { getErrorMessage } from '../shared/errors.js';
import { sleep } from '../shared/time.js';
import contractSource from '../../contracts/inscription-core.clar?raw';

export function createContractService({ network, userSession, journeyLog, getFeePerTxMicroStx } = {}) {
  const getContractDetails = () => {
    const input = document.getElementById('contract-address-input')?.value?.replace(/\s/g, '');
    const parts = String(input || '').split('.');
    if (parts.length !== 2) {
      journeyLog('ERROR: Invalid contract address format', { input });
      throw new Error('Invalid Address Format. Expected: ADDRESS.CONTRACT_NAME');
    }
    const details = { address: parts[0], name: parts[1] };
    journeyLog('Contract details parsed', details);
    return details;
  };

  const getContractSource = () => contractSource;

  function openContractCallWrapper(options) {
    return new Promise((resolve, reject) => {
      const fee = options.fee ?? (typeof getFeePerTxMicroStx === 'function' ? getFeePerTxMicroStx() : undefined);
      Connect.openContractCall({
        ...options,
        fee,
        onFinish: (data) => resolve(data),
        onCancel: () => reject(new Error('User cancelled transaction')),
      });
    });
  }

  async function waitForTransactionSuccess(txId, { timeoutMs = 10 * 60 * 1000, pollMs = 5000 } = {}) {
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
          if (!res.ok) return;
          const data = await res.json();
          if (data.tx_status === 'success') {
            clearInterval(interval);
            resolve(data);
          } else if (data.tx_status === 'abort_by_response' || data.tx_status === 'abort_by_post_condition') {
            clearInterval(interval);
            reject(new Error(`Transaction failed: ${data.tx_status}`));
          }
        } catch (e) {
          console.error('Polling error:', e);
        }
      }, pollMs);
    });
  }

  async function callReadOnlyFunctionWithRetry(opts, { retries = 3, baseDelayMs = 400 } = {}) {
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

  const deployCoreContract = async () => {
    const { name } = getContractDetails();
    journeyLog('Requesting Contract Deploy...', { contractName: name });
    Connect.openContractDeploy({
      contractName: name,
      codeBody: getContractSource(),
      network,
      userSession,
      onFinish: (data) => {
        journeyLog('Deploy onFinish', data);
        alert(`Contract Deployed! TX: ${data.txId}`);
      },
      onCancel: () => journeyLog('Deploy onCancel'),
    });
  };

  return {
    getContractDetails,
    getContractSource,
    openContractCallWrapper,
    waitForTransactionSuccess,
    callReadOnlyFunctionWithRetry,
    deployCoreContract,
  };
}

