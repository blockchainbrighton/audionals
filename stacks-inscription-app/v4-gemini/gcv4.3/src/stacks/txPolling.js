import { sleep } from '../shared/time.js';

export async function waitForTransactionSuccess(network, txId, { journeyLog, timeoutMs = 10 * 60 * 1000, pollMs = 5000 } = {}) {
  const apiUrl = network.coreApiUrl;
  const started = Date.now();

  journeyLog?.(`Polling for TX: ${txId}`);

  while (true) {
    if (Date.now() - started > timeoutMs) {
      throw new Error(`Timed out waiting for TX confirmation: ${txId}`);
    }

    try {
      const res = await fetch(`${apiUrl}/extended/v1/tx/${txId}`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data.tx_status === 'success') return data;
        if (data.tx_status === 'abort_by_response' || data.tx_status === 'abort_by_post_condition') {
          throw new Error(`Transaction failed: ${data.tx_status}`);
        }
      }
    } catch (e) {
      console.error('Polling error:', e);
    }

    await sleep(pollMs);
  }
}

