import { sleep } from '../shared/time.js';

export async function waitForTransactionSuccess(network, txId, { journeyLog, timeoutMs = 10 * 60 * 1000, pollMs = 5000 } = {}) {
  const apiUrl = network.coreApiUrl;
  const started = Date.now();

  journeyLog?.(`Polling for TX: ${txId}`);

  while (true) {
    if (Date.now() - started > timeoutMs) {
      throw new Error(`Timed out waiting for TX confirmation: ${txId}`);
    }

    const pollUrl = `${apiUrl}/extended/v1/tx/${txId}`;
    try {
      const res = await fetch(pollUrl, { cache: 'no-store' });
      if (res.ok) {
        const text = await res.text();
        try {
          const data = JSON.parse(text);
          if (data.tx_status === 'success') return data;
          if (data.tx_status === 'abort_by_response' || data.tx_status === 'abort_by_post_condition') {
            throw new Error(`Transaction failed: ${data.tx_status}`);
          }
        } catch (jsonErr) {
          console.error(`Polling JSON parse error for ${pollUrl}. Response start: ${text.slice(0, 50)}`);
          throw jsonErr;
        }
      } else {
        journeyLog?.(`Polling failed status: ${res.status} for ${pollUrl}`);
      }
    } catch (e) {
      console.error('Polling error:', e);
    }

    await sleep(pollMs);
  }
}

