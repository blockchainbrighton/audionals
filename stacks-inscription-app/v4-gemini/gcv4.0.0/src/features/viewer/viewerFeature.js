import { cvToValue, uintCV } from '@stacks/transactions';
import { processRecursiveAudio } from '../../lib/audio-engine.js';
import { formatInt } from '../../shared/format.js';

export function createViewerFeature({ journeyLog, network, contractService } = {}) {
  function playerLog(msg) {
    journeyLog(`Player: ${msg}`);
    const div = document.createElement('div');
    div.innerText = `> ${msg}`;
    document.getElementById('player-log')?.appendChild(div);
  }

  function sniffMimeType(buffer) {
    if (buffer.length < 4) return null;
    const hex = Array.from(buffer.slice(0, 4))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
      .toLowerCase();
    if (hex === '1a45dfa3') return 'audio/webm';
    if (hex === '52494646') return 'audio/wav';
    if (hex === '89504e47') return 'image/png';
    if (hex.startsWith('ffd8ff')) return 'image/jpeg';
    if (hex === '47494638') return 'image/gif';
    if (hex === '25504446') return 'application/pdf';
    return null;
  }

  async function fetchInscriptionData(id) {
    const { address, name } = contractService.getContractDetails();
    journeyLog(`Fetching inscription data for ID: ${id} from ${address}.${name}`);

    const metaRes = await contractService.callReadOnlyFunctionWithRetry({
      contractAddress: address,
      contractHash: '',
      contractName: name,
      functionName: 'get-inscription',
      functionArgs: [uintCV(id)],
      senderAddress: address,
      network,
    });
    const meta = cvToValue(metaRes);
    if (!meta) {
      journeyLog(`ERROR: Inscription ${id} not found on-chain.`);
      throw new Error('Not found');
    }

    journeyLog('Meta Object:', meta);
    if (meta.value) journeyLog('Meta.value:', meta.value);

    const count = Number(meta.value['chunk-count'].value);
    const totalSize = Number(meta.value['total-size'].value);
    journeyLog(`Inscription found. ID: ${id}, Chunks: ${count}, Size: ${totalSize} bytes`);

    const buffers = [];
    for (let i = 0; i < count; i++) {
      journeyLog(`Fetching Chunk ${i}...`);
      const res = await contractService.callReadOnlyFunctionWithRetry({
        contractAddress: address,
        contractName: name,
        functionName: 'get-chunk',
        functionArgs: [uintCV(id), uintCV(i)],
        senderAddress: address,
        network,
      });
      const val = cvToValue(res);

      if (!val) {
        journeyLog(`CRITICAL: Chunk ${i} is missing on-chain.`);
        throw new Error(`Chunk ${i} missing. Inscription incomplete.`);
      }

      let bytes;
      if (val instanceof Uint8Array) bytes = val;
      else if (val && val.value) bytes = val.value;
      else if (val && val.buffer) bytes = val.buffer;
      else bytes = val;

      if (typeof bytes === 'string') {
        let hexStr = bytes;
        if (hexStr.startsWith('0x')) hexStr = hexStr.slice(2);
        const byteArray = new Uint8Array(hexStr.length / 2);
        for (let j = 0; j < hexStr.length; j += 2) {
          byteArray[j / 2] = parseInt(hexStr.substring(j, j + 2), 16);
        }
        bytes = byteArray;
      }

      if (!bytes || !bytes.length) {
        journeyLog(`CRITICAL: Chunk ${i} data is empty.`);
        throw new Error(`Chunk ${i} is empty.`);
      }

      buffers.push(bytes);
    }

    journeyLog('All chunks fetched. Reconstructing...');
    const full = new Uint8Array(buffers.reduce((a, b) => a + b.length, 0));
    let offset = 0;
    buffers.forEach((b) => {
      full.set(b, offset);
      offset += b.length;
    });

    const header = Array.from(full.slice(0, 16))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join(' ');
    journeyLog(`Downloaded ${full.length} bytes. Header: ${header}`);

    let mimeType = 'application/octet-stream';
    try {
      const rawMime = meta.value['mime-type'];
      journeyLog('Raw MIME object:', rawMime);
      if (rawMime) {
        if (typeof rawMime === 'string') mimeType = rawMime;
        else if (rawMime.data) mimeType = rawMime.data;
        else if (rawMime.value) mimeType = rawMime.value;
      }
    } catch (err) {
      journeyLog('Error extracting MIME', err);
    }

    if (mimeType === 'application/json' || mimeType === 'application/octet-stream') {
      const snifferMime = sniffMimeType(full);
      if (snifferMime) {
        journeyLog(`MIME Sniffer: Corrected ${mimeType} to ${snifferMime}`);
        mimeType = snifferMime;
      }
    }

    return { data: full, mimeType };
  }

  // VIEWER GALLERY (16-per-page)
  const VIEWER_PAGE_SIZE = 16;
  let viewerGalleryPage = 0;
  let viewerSelectedId = null;
  const inscriptionMetaCache = new Map();
  let lastContractId = null; // Track contract to invalidate cache
  
  // Track the highest known ID to support pagination and discovery
  let maxKnownId = -1;

  function tryParseMeta(meta) {
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

  async function fetchInscriptionMeta(id, forceRefresh = false) {
    const { address, name } = contractService.getContractDetails();
    const currentContractId = `${address}.${name}`;

    // Invalidate cache if contract changed
    if (lastContractId !== currentContractId) {
      journeyLog(`Contract changed from ${lastContractId} to ${currentContractId}. Clearing cache.`);
      inscriptionMetaCache.clear();
      lastContractId = currentContractId;
      maxKnownId = -1; // Reset maxKnownId as well since we are on a new chain/contract
    }

    if (!forceRefresh && inscriptionMetaCache.has(id)) return inscriptionMetaCache.get(id);
    
    try {
      const res = await contractService.callReadOnlyFunctionWithRetry({
        contractAddress: address,
        contractName: name,
        functionName: 'get-inscription',
        functionArgs: [uintCV(id)],
        senderAddress: address,
        network,
      }, { retries: 0 }); // Fast fail for discovery

      const meta = cvToValue(res);
      if (!meta) {
        inscriptionMetaCache.set(id, null);
        return null;
      }

      const parsed = tryParseMeta(meta);
      inscriptionMetaCache.set(id, parsed);
      
      // Update maxKnownId if we found a valid inscription higher than current max
      if (id > maxKnownId) {
        maxKnownId = id;
        updateGalleryPaginationUI();
      }
      
      return parsed;
    } catch (e) {
      // If error (like network issue), don't cache null, just return null
      return null;
    }
  }

  // Scan for new inscriptions starting from maxKnownId + 1
  async function scanForNewInscriptions() {
    // Ensure we are synchronized with the current contract
    const { address, name } = contractService.getContractDetails();
    const currentContractId = `${address}.${name}`;
    if (lastContractId !== currentContractId) {
       // This triggers the cache clear in fetchInscriptionMeta implicitly or we can do it here
       // But fetchInscriptionMeta handles it safely.
    }

    let nextId = maxKnownId + 1;
    let gapCount = 0;
    const MAX_GAP = 3; // Stop if we find 3 missing IDs in a row

    journeyLog(`Scanning for new inscriptions starting at #${nextId}...`);
    
    while (gapCount < MAX_GAP) {
      // Fetch in small batches to speed up discovery but respect rate limits
      const batchSize = 3; 
      const promises = [];
      for (let i = 0; i < batchSize; i++) {
        promises.push(fetchInscriptionMeta(nextId + i));
      }
      
      const results = await Promise.all(promises);
      let foundInBatch = false;

      for (let i = 0; i < batchSize; i++) {
        if (results[i]) {
          foundInBatch = true;
          gapCount = 0; // Reset gap count if we find something
        } else {
          gapCount++;
        }
      }

      if (foundInBatch) {
        nextId += batchSize;
      } else {
        // If the whole batch was empty, we probably reached the end
        break;
      }
    }
    
    journeyLog(`Scan complete. Max ID found: ${maxKnownId}`);
    void renderGalleryPage(viewerGalleryPage);
  }

  // Called externally when a mint is finished
  async function refreshInscription(id) {
    journeyLog(`Refreshing inscription #${id}`);
    const meta = await fetchInscriptionMeta(id, true);
    if (meta) {
        // If this is a new ID we didn't know about, it will update maxKnownId automatically inside fetchInscriptionMeta
        // Force a re-render of the gallery if the refreshed ID is on the current page
        const start = viewerGalleryPage * VIEWER_PAGE_SIZE;
        const end = start + VIEWER_PAGE_SIZE - 1;
        if (id >= start && id <= end) {
            void renderGalleryPage(viewerGalleryPage);
        }
    }
  }

  function setGalleryStatus(text) {
    const el = document.getElementById('gallery-status');
    if (el) el.innerText = text;
  }

  function updateGalleryPaginationUI() {
    const prevBtn = document.getElementById('gallery-prev');
    const nextBtn = document.getElementById('gallery-next');
    
    if (prevBtn) prevBtn.disabled = viewerGalleryPage <= 0;
    
    // We can disable 'Next' if we know we are at the end
    // Logic: if the current page includes maxKnownId, there is no next page (yet)
    const currentEnd = (viewerGalleryPage + 1) * VIEWER_PAGE_SIZE - 1;
    if (nextBtn) nextBtn.disabled = maxKnownId >= 0 && currentEnd >= maxKnownId;
  }

  function setGallerySelected(id) {
    viewerSelectedId = id;
    const grid = document.getElementById('gallery-grid');
    if (!grid) return;
    grid.querySelectorAll('.gallery-card').forEach((card) => {
      const cid = Number(card.getAttribute('data-id'));
      card.classList.toggle('selected', Number.isFinite(cid) && cid === id);
    });
  }

  async function renderGalleryPage(page) {
    const grid = document.getElementById('gallery-grid');
    const pageInput = document.getElementById('gallery-page-input');
    if (!grid) return;
    
    viewerGalleryPage = Math.max(0, Number(page) || 0);
    if (pageInput) pageInput.value = String(viewerGalleryPage);

    const start = viewerGalleryPage * VIEWER_PAGE_SIZE;
    const end = start + VIEWER_PAGE_SIZE - 1;
    
    setGalleryStatus(`Showing IDs ${start}–${end}`);
    updateGalleryPaginationUI();

    grid.innerHTML = '';
    
    // Create placeholders
    for (let i = start; i <= end; i++) {
      // Don't render placeholders beyond maxKnownId if we are certain about the max
      // But initially maxKnownId might be -1, so we render anyway until we know better
      if (maxKnownId >= 0 && i > maxKnownId) break;

      const card = document.createElement('div');
      card.className = 'gallery-card';
      card.setAttribute('data-id', String(i));
      card.innerHTML = `
        <div class="id">#${i}</div>
        <div class="muted">Loading…</div>
      `;
      card.addEventListener('click', async () => {
        document.getElementById('manifest-id-input').value = i;
        setGallerySelected(i);
        document.getElementById('btn-play-single').click();
      });
      grid.appendChild(card);
    }

    // Parallel fetch for the page, but throttled to avoid 429
    const idsToFetch = [];
    for (let i = start; i <= end; i++) idsToFetch.push(i);

    const CONCURRENCY_LIMIT = 4;
    for (let i = 0; i < idsToFetch.length; i += CONCURRENCY_LIMIT) {
      const batch = idsToFetch.slice(i, i + CONCURRENCY_LIMIT);
      
      await Promise.all(
        batch.map(async (id) => {
          const meta = await fetchInscriptionMeta(id);
          const card = grid.querySelector(`.gallery-card[data-id="${id}"]`);
          
          if (!meta) {
            // If we thought this ID existed (i.e. <= maxKnownId) but it returned null, show missing
            // If it's beyond maxKnownId, we just remove the card (or don't show it)
            if (card) {
               if (maxKnownId >= 0 && id > maxKnownId) {
                   card.remove(); 
               } else {
                   card.innerHTML = `
                      <div class="id">#${id}</div>
                      <div class="missing">Not found</div>
                   `;
               }
            }
            return;
          }

          if (!card) {
              return;
          }

          const sealed = meta.sealed ? 'sealed' : 'draft';
          const size = meta.totalSize ? `${formatInt(meta.totalSize)} bytes` : 'unknown size';
          const mimeDisplay = meta.mimeType.length > 20 ? meta.mimeType.substring(0, 20) + '...' : meta.mimeType;
          
          card.innerHTML = `
            <div class="id">#${id}</div>
            <div class="muted" title="${meta.mimeType}">${mimeDisplay}</div>
            <div class="muted">${size} • ${formatInt(meta.chunkCount)} chunks • <span class="${meta.sealed ? 'text-success' : 'text-warning'}">${sealed}</span></div>
          `;
        })
      );
    }
    
    updateGalleryPaginationUI();
    if (Number.isFinite(viewerSelectedId)) setGallerySelected(viewerSelectedId);
  }

  async function onPlaySingleClick() {
    const idInput = document.getElementById('manifest-id-input');
    if (!idInput?.value) return alert('Please enter an Inscription ID.');
    const id = parseInt(idInput.value);
    journeyLog(`User clicked 'Load & View' for ID: ${id}`);
    viewerSelectedId = id;
    setGallerySelected(id);

    const container = document.getElementById('media-container');
    if (container) container.innerHTML = '<span style="color: #666;">Loading content from Stacks chain...</span>';

    try {
      playerLog('Fetching metadata and chunks...');
      const { data, mimeType } = await fetchInscriptionData(id);

      journeyLog(`Data fetched successfully. Size: ${data.length} bytes. MIME: ${mimeType}`);
      if (container) container.innerHTML = '';

      if (mimeType.startsWith('audio/')) {
        playerLog('Detected Audio. Decoding...');
        const { audioCtx, outputBuffer } = await processRecursiveAudio([data.buffer]);

        const audioWrapper = document.createElement('div');
        audioWrapper.style.width = '100%';
        audioWrapper.style.textAlign = 'center';

        const info = document.createElement('p');
        info.innerText = `Audio: ${outputBuffer.duration.toFixed(2)}s | ${outputBuffer.sampleRate}Hz | ${outputBuffer.numberOfChannels}ch`;
        audioWrapper.appendChild(info);

        const playBtn = document.createElement('button');
        playBtn.innerText = '▶ Play Audio';
        playBtn.style.background = '#28a745';
        playBtn.onclick = () => {
          const source = audioCtx.createBufferSource();
          source.buffer = outputBuffer;
          source.connect(audioCtx.destination);
          source.start();
        };
        audioWrapper.appendChild(playBtn);
        container?.appendChild(audioWrapper);

        playerLog('Audio ready to play.');
      } else if (mimeType.startsWith('image/')) {
        playerLog('Detected Image. Rendering...');
        const blob = new Blob([data], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const img = document.createElement('img');
        img.src = url;
        img.style.maxWidth = '100%';
        img.style.maxHeight = '600px';
        img.style.border = '1px solid #ddd';
        container?.appendChild(img);
      } else if (mimeType.startsWith('video/')) {
        playerLog('Detected Video. Rendering...');
        const blob = new Blob([data], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const vid = document.createElement('video');
        vid.src = url;
        vid.controls = true;
        vid.style.maxWidth = '100%';
        vid.style.maxHeight = '600px';
        container?.appendChild(vid);
      } else if (mimeType === 'text/html' || mimeType === 'application/pdf') {
        playerLog(`Detected ${mimeType}. Rendering in sandboxed iframe...`);
        const blob = new Blob([data], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const iframe = document.createElement('iframe');
        iframe.src = url;
        iframe.style.width = '100%';
        iframe.style.height = '600px';
        iframe.style.border = '1px solid #ccc';
        iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin');
        container?.appendChild(iframe);
      } else if (mimeType.includes('json') || mimeType.startsWith('text/')) {
        playerLog('Detected Text/JSON. Rendering...');
        const text = new TextDecoder().decode(data);
        const pre = document.createElement('pre');
        try {
          const obj = JSON.parse(text);
          pre.innerText = JSON.stringify(obj, null, 2);
        } catch {
          pre.innerText = text.substring(0, 5000) + (text.length > 5000 ? '\n...[truncated]' : '');
        }
        pre.style.background = '#eee';
        pre.style.padding = '10px';
        pre.style.width = '100%';
        pre.style.overflow = 'auto';
        pre.style.whiteSpace = 'pre-wrap';
        container?.appendChild(pre);
      } else {
        playerLog(`Unknown MIME: ${mimeType}. Displaying as Hex/Text...`);
        const text = new TextDecoder().decode(data);
        const pre = document.createElement('pre');
        pre.innerText = `[Raw Data - First 500 bytes]\n` + text.substring(0, 500);
        pre.style.background = '#f8d7da';
        pre.style.padding = '10px';
        container?.appendChild(pre);
      }
    } catch (e) {
      journeyLog('Player Error', { error: e?.message || String(e) });
      playerLog(`Error: ${e?.message || String(e)}`);
      if (container) container.innerHTML = `<div style="color:red; text-align:center;">Error: ${e?.message || String(e)}</div>`;
    }
  }

  async function onLoadManifestClick() {
    const manifestId = parseInt(document.getElementById('manifest-id-input')?.value);
    journeyLog(`User clicked 'Load Manifest' for ID: ${manifestId}`);
    try {
      playerLog('Fetching...');
      const { data: bytes } = await fetchInscriptionData(manifestId);
      const manifest = JSON.parse(new TextDecoder().decode(bytes));
      journeyLog('Manifest parsed', manifest);

      const clips = [];
      for (const clipId of manifest) {
        playerLog(`Clip ${clipId}...`);
        const { data } = await fetchInscriptionData(parseInt(clipId));
        clips.push(data.buffer);
      }

      journeyLog('All manifest clips fetched. Processing audio...');
      const { audioCtx, outputBuffer } = await processRecursiveAudio(clips);
      const source = audioCtx.createBufferSource();
      source.buffer = outputBuffer;
      source.connect(audioCtx.destination);
      source.start();
      playerLog('Playing!');
    } catch (e) {
      journeyLog('Player Error', { error: e?.message || String(e) });
      playerLog(`Error: ${e?.message || String(e)}`);
    }
  }

  function registerHandlers() {
    document.getElementById('btn-clear-viewer')?.addEventListener('click', () => {
      const container = document.getElementById('media-container');
      if (container) container.innerHTML = '<span style="color: #ccc;">No content loaded</span>';
      const log = document.getElementById('player-log');
      if (log) log.innerHTML = '';
      journeyLog('Viewer cleared.');
    });

    document.getElementById('gallery-prev')?.addEventListener('click', () => void renderGalleryPage(Math.max(0, viewerGalleryPage - 1)));
    document.getElementById('gallery-next')?.addEventListener('click', () => void renderGalleryPage(viewerGalleryPage + 1));
    document.getElementById('gallery-go')?.addEventListener('click', () => {
      const val = Number(document.getElementById('gallery-page-input')?.value);
      void renderGalleryPage(Number.isFinite(val) ? val : 0);
    });
    document.getElementById('gallery-jump')?.addEventListener('click', () => {
      const id = Number(document.getElementById('gallery-jump-id')?.value);
      if (!Number.isFinite(id) || id < 0) return;
      const page = Math.floor(id / VIEWER_PAGE_SIZE);
      void renderGalleryPage(page).then(() => {
        document.getElementById('manifest-id-input').value = id;
        setGallerySelected(id);
        document.getElementById('btn-play-single').click();
      });
    });
    document.getElementById('gallery-refresh')?.addEventListener('click', () => {
      inscriptionMetaCache.clear();
      void renderGalleryPage(viewerGalleryPage);
    });

    document.getElementById('btn-play-single')?.addEventListener('click', () => void onPlaySingleClick());
    document.getElementById('btn-load-manifest')?.addEventListener('click', () => void onLoadManifestClick());
  }

  function onShowPlayPage() {
    void renderGalleryPage(viewerGalleryPage || 0);
  }

  function init() {
    void scanForNewInscriptions();
  }

  return {
    init,
    registerHandlers,
    onShowPlayPage,
    renderGalleryPage,
    fetchInscriptionData,
    refreshInscription,
    scanForNewInscriptions
  };
}
