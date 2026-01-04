import { formatInt, formatMicroStx } from '../../shared/format.js';
import { updatedAgo } from '../../shared/time.js';
import { getFeePerTxMicroStx } from '../mint/settings.js';

export function createFeeFeature({
  journeyLog,
  network,
  mintState,
  onFeeChanged = () => {},
  onSafeModeChanged = () => {},
  onProgressMessage = () => {},
} = {}) {
  let networkFeeRateMicroPerByte = null;
  let mainnetFeeRateMicroPerByte = null;
  let lastFeeRateFetch = { current: null, mainnet: null };

  const MAINNET_CORE_API_CANDIDATES = ['https://api.hiro.so', 'https://api.mainnet.hiro.so'];

  const estimateTxCounts = (chunkCount, missingCount = null) => {
    const begin = missingCount === null ? 1 : 0;
    const uploads = missingCount === null ? chunkCount : missingCount;
    const seal = 1;
    const total = begin + uploads + seal;
    return { begin, uploads, seal, total };
  };

  const estimateTxBytes = {
    begin: 380,
    seal: 420,
    addChunk: (chunkLen) => 520 + chunkLen,
  };

  const extractFeeRate = (data) => {
    if (data === null || data === undefined) return null;
    if (typeof data === 'number') return Number.isFinite(data) ? data : null;
    if (typeof data === 'string') {
      const n = Number(data);
      return Number.isFinite(n) ? n : null;
    }
    if (Array.isArray(data)) {
      const rates = data.map(extractFeeRate).filter((n) => Number.isFinite(n) && n > 0);
      return rates.length ? Math.max(...rates) : null;
    }
    if (typeof data === 'object') {
      const direct =
        data.fee_rate ?? data.feeRate ?? data.fee_rate_per_byte ?? data.feeRatePerByte ?? null;
      const directParsed = extractFeeRate(direct);
      if (directParsed) return directParsed;
      if (Array.isArray(data.estimations)) {
        const rates = data.estimations
          .map((e) => extractFeeRate(e?.fee_rate ?? e?.feeRate ?? e))
          .filter((n) => Number.isFinite(n) && n > 0);
        return rates.length ? Math.max(...rates) : null;
      }
    }
    return null;
  };

  const fetchFeeRateFromBaseUrl = async (baseUrl) => {
    const url = `${baseUrl}/v2/fees/transfer`;
    const res = await fetch(url, { cache: 'no-store', redirect: 'follow' });
    const contentType = res.headers.get('content-type') || '';
    const text = await res.text();
    let parsed = null;
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = null;
    }
    if (!res.ok) throw new Error(`HTTP ${res.status} from ${url} (${contentType || 'unknown content-type'})`);
    const rate = extractFeeRate(parsed);
    if (!Number.isFinite(rate) || rate <= 0) {
      const preview = text ? text.slice(0, 200) : '';
      throw new Error(`Unrecognized fee response from ${url}: ${preview}`);
    }
    return rate;
  };

  const fetchFeeRateWithFallback = async (label, baseUrls) => {
    let lastErr = null;
    for (const baseUrl of baseUrls) {
      try {
        const rate = await fetchFeeRateFromBaseUrl(baseUrl);
        return { baseUrl, rate };
      } catch (e) {
        lastErr = e;
        journeyLog('Fee rate source failed', { label, baseUrl, error: e?.message || String(e) });
      }
    }
    throw lastErr || new Error(`Fee rate unavailable (${label})`);
  };

  const renderFeeEstimates = (context = { mode: 'mint', missingCount: null }) => {
    const el = document.getElementById('fee-estimates');
    if (!el) return;

    const feePerTx = getFeePerTxMicroStx();
    const chunkCount = mintState.currentChunks.length;
    const { total } = estimateTxCounts(chunkCount, context.missingCount);
    const fixedTotal = feePerTx * total;
    const hasFile = chunkCount > 0;

    let feeRateLine = hasFile
      ? 'Current network fee-rate estimate: not loaded (click “Fetch Fee Rates”)'
      : 'Select a file to see per-file fee estimates.';
    if (Number.isFinite(networkFeeRateMicroPerByte) && networkFeeRateMicroPerByte > 0) {
      const bytesUploads =
        context.missingCount === null
          ? mintState.currentChunks.reduce((sum, c) => sum + estimateTxBytes.addChunk(c.length), 0)
          : null;
      const bytesBegin = context.missingCount === null ? estimateTxBytes.begin : 0;
      const bytesSeal = estimateTxBytes.seal;
      const bytesTotal = bytesUploads !== null ? bytesBegin + bytesUploads + bytesSeal : null;
      if (bytesTotal !== null) {
        const micro = Math.ceil(bytesTotal * networkFeeRateMicroPerByte);
        feeRateLine = `Current network fee-rate estimate: ${formatMicroStx(micro)} (rate ${networkFeeRateMicroPerByte} microSTX/byte${
          lastFeeRateFetch.current ? `, updated ${updatedAgo(lastFeeRateFetch.current)} ago` : ''
        })`;
      } else {
        feeRateLine = `Current network fee-rate loaded: ${networkFeeRateMicroPerByte} microSTX/byte${
          lastFeeRateFetch.current ? ` (updated ${updatedAgo(lastFeeRateFetch.current)} ago)` : ''
        }`;
      }
    }

    let mainnetFeeLine = hasFile ? 'Mainnet fee-rate estimate: not loaded' : '';
    if (Number.isFinite(mainnetFeeRateMicroPerByte) && mainnetFeeRateMicroPerByte > 0) {
      let src = null;
      try {
        src = localStorage.getItem('fee-rate:mainnetSource');
      } catch {
        src = null;
      }
      const bytesUploads =
        context.missingCount === null
          ? mintState.currentChunks.reduce((sum, c) => sum + estimateTxBytes.addChunk(c.length), 0)
          : null;
      const bytesBegin = context.missingCount === null ? estimateTxBytes.begin : 0;
      const bytesSeal = estimateTxBytes.seal;
      const bytesTotal = bytesUploads !== null ? bytesBegin + bytesUploads + bytesSeal : null;
      if (bytesTotal !== null) {
        const micro = Math.ceil(bytesTotal * mainnetFeeRateMicroPerByte);
        mainnetFeeLine = `Mainnet fee-rate estimate: ${formatMicroStx(micro)} (rate ${mainnetFeeRateMicroPerByte} microSTX/byte${
          src ? `, source ${src}` : ''
        }${lastFeeRateFetch.mainnet ? `, updated ${updatedAgo(lastFeeRateFetch.mainnet)} ago` : ''})`;
      } else {
        mainnetFeeLine = `Mainnet fee-rate loaded: ${mainnetFeeRateMicroPerByte} microSTX/byte${
          src ? ` (source ${src})` : ''
        }${lastFeeRateFetch.mainnet ? ` (updated ${updatedAgo(lastFeeRateFetch.mainnet)} ago)` : ''}`;
      }
    }

    el.innerHTML = `
      <div><strong>Transactions required:</strong> ~${formatInt(total)} (${
        context.missingCount === null ? 'begin + chunks + seal' : 'missing chunks + seal'
      })</div>
      <div><strong>Configured fee/tx:</strong> ${formatMicroStx(feePerTx)} (${formatInt(feePerTx)} microSTX)</div>
      <div><strong>Configured total:</strong> ${formatMicroStx(fixedTotal)} for ~${formatInt(total)} tx</div>
      <div>${feeRateLine}</div>
      ${mainnetFeeLine ? `<div>${mainnetFeeLine}</div>` : ''}
    `;
  };

  const maybeFetchFeeRates = async ({ maxAgeMs = 60_000 } = {}) => {
    const now = Date.now();
    const currentAge = lastFeeRateFetch.current ? now - lastFeeRateFetch.current : Infinity;
    const mainnetAge = lastFeeRateFetch.mainnet ? now - lastFeeRateFetch.mainnet : Infinity;
    const shouldFetch =
      currentAge > maxAgeMs ||
      mainnetAge > maxAgeMs ||
      !Number.isFinite(networkFeeRateMicroPerByte) ||
      !Number.isFinite(mainnetFeeRateMicroPerByte);
    if (!shouldFetch) return false;

    try {
      const current = await fetchFeeRateWithFallback('current', [network.coreApiUrl]);
      const mainnet = await fetchFeeRateWithFallback('mainnet', MAINNET_CORE_API_CANDIDATES);

      networkFeeRateMicroPerByte = current.rate;
      mainnetFeeRateMicroPerByte = mainnet.rate;
      lastFeeRateFetch = { current: now, mainnet: now };
      try {
        localStorage.setItem('fee-rate:lastFetch', JSON.stringify(lastFeeRateFetch));
        localStorage.setItem('fee-rate:current', String(current.rate));
        localStorage.setItem('fee-rate:mainnet', String(mainnet.rate));
        localStorage.setItem('fee-rate:mainnetSource', mainnet.baseUrl);
      } catch {
        // ignore
      }
      journeyLog('Fee rates auto-updated', {
        currentNetwork: { baseUrl: current.baseUrl, microSTXPerByte: current.rate },
        mainnet: { baseUrl: mainnet.baseUrl, microSTXPerByte: mainnet.rate },
      });
      return true;
    } catch (e) {
      journeyLog('Fee rates auto-update failed', { error: e?.message || String(e) });
      return false;
    }
  };

  function initFromStorage() {
    try {
      const storedFee = localStorage.getItem('fee-per-tx');
      const feeEl = document.getElementById('fee-per-tx');
      if (storedFee && feeEl) {
        const n = Number(storedFee);
        if (Number.isFinite(n) && n >= 0) feeEl.value = String(Math.floor(n));
      }
    } catch {
      // ignore
    }

    try {
      const currentRate = Number(localStorage.getItem('fee-rate:current'));
      const mainnetRate = Number(localStorage.getItem('fee-rate:mainnet'));
      const lastFetchRaw = localStorage.getItem('fee-rate:lastFetch');
      const lastFetch = lastFetchRaw ? JSON.parse(lastFetchRaw) : null;
      if (Number.isFinite(currentRate) && currentRate > 0) networkFeeRateMicroPerByte = currentRate;
      if (Number.isFinite(mainnetRate) && mainnetRate > 0) mainnetFeeRateMicroPerByte = mainnetRate;
      if (lastFetch && typeof lastFetch === 'object') lastFeeRateFetch = lastFetch;
    } catch {
      // ignore
    }
  }

  function registerHandlers() {
    document.getElementById('fee-per-tx')?.addEventListener('change', () => {
      try {
        localStorage.setItem('fee-per-tx', String(getFeePerTxMicroStx()));
      } catch {
        // ignore
      }
      renderFeeEstimates({ mode: 'mint', missingCount: null });
      onFeeChanged();
    });

    document.getElementById('toggle-safe-mode')?.addEventListener('change', () => {
      onSafeModeChanged();
    });

    document.getElementById('btn-fetch-fee-rate')?.addEventListener('click', async () => {
      const now = Date.now();
      try {
        const results = await Promise.allSettled([
          fetchFeeRateWithFallback('current', [network.coreApiUrl]),
          fetchFeeRateWithFallback('mainnet', MAINNET_CORE_API_CANDIDATES),
        ]);

        const [currentRes, mainnetRes] = results;
        let hadAny = false;

        if (currentRes.status === 'fulfilled') {
          networkFeeRateMicroPerByte = currentRes.value.rate;
          hadAny = true;
        } else {
          journeyLog('Fee rate fetch failed (current)', { error: currentRes.reason?.message || String(currentRes.reason) });
        }

        if (mainnetRes.status === 'fulfilled') {
          mainnetFeeRateMicroPerByte = mainnetRes.value.rate;
          hadAny = true;
          try {
            localStorage.setItem('fee-rate:mainnetSource', mainnetRes.value.baseUrl);
          } catch {
            // ignore
          }
        } else {
          journeyLog('Fee rate fetch failed (mainnet)', { error: mainnetRes.reason?.message || String(mainnetRes.reason) });
        }

        lastFeeRateFetch = { current: now, mainnet: now };
        try {
          localStorage.setItem('fee-rate:lastFetch', JSON.stringify(lastFeeRateFetch));
          if (Number.isFinite(networkFeeRateMicroPerByte) && networkFeeRateMicroPerByte > 0) {
            localStorage.setItem('fee-rate:current', String(networkFeeRateMicroPerByte));
          }
          if (Number.isFinite(mainnetFeeRateMicroPerByte) && mainnetFeeRateMicroPerByte > 0) {
            localStorage.setItem('fee-rate:mainnet', String(mainnetFeeRateMicroPerByte));
          }
        } catch {
          // ignore
        }

        if (hadAny) {
          journeyLog('Fee rates loaded', { currentNetwork: networkFeeRateMicroPerByte, mainnet: mainnetFeeRateMicroPerByte });
          onProgressMessage('<div>Fee rates updated (current network and/or mainnet).</div>');
        } else {
          onProgressMessage(
            '<div style="color:#856404">Could not fetch fee rates (current or mainnet). Using configured fee/tx.</div>'
          );
        }

        renderFeeEstimates({ mode: 'mint', missingCount: null });
        onFeeChanged();
      } catch (e) {
        journeyLog('Fee rate fetch failed', { error: e?.message || String(e) });
        onProgressMessage('<div style="color:#856404">Could not fetch fee rates; using configured fee/tx.</div>');
        renderFeeEstimates({ mode: 'mint', missingCount: null });
        onFeeChanged();
      }
    });
  }

  return {
    estimateTxCounts,
    estimateTxBytes,
    initFromStorage,
    registerHandlers,
    renderFeeEstimates,
    maybeFetchFeeRates,
    getFeeRates: () => ({
      currentNetworkMicroStxPerByte: networkFeeRateMicroPerByte,
      mainnetMicroStxPerByte: mainnetFeeRateMicroPerByte,
    }),
  };
}
