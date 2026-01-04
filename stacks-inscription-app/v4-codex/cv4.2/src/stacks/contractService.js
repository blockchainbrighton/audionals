import * as Connect from '@stacks/connect';
import { callReadOnlyFunction } from '@stacks/transactions';
import { getErrorMessage } from '../shared/errors.js';
import { sleep } from '../shared/time.js';
import contractSource from '../../contracts/inscription-core.clar?raw';
import { waitForTransactionSuccess } from './txPolling.js';

export function createContractService({ network, userSession, journeyLog, getFeePerTxMicroStx, getContractDetails } = {}) {
  if (typeof getContractDetails !== 'function') {
    throw new Error('createContractService requires getContractDetails()');
  }

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
    waitForTransactionSuccess: (txId, opts) => waitForTransactionSuccess(network, txId, { journeyLog, ...opts }),
    callReadOnlyFunctionWithRetry,
    deployCoreContract,
  };
}
