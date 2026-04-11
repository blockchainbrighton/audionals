// ContentLoader.js

const preloadUrls = [
  'https://ordinals.com/content/e7d344ef3098d0889856978c4d2e81ccf2358f7f8b66feecc71e03036c59ad48i0',
  'https://ordinals.com/content/ef5707e6ecf4d5b6edb4c3a371ca1c57b5d1057c6505ccb5f8bdc8918b0c4d94i0',
  'https://ordinals.com/content/d030eb3d8bcd68b0ed02b0c67fdb981342eea40b0383814f179a48e76927db93i0',
  'https://ordinals.com/content/3b7482a832c4f27c32fc1da7cc4249bbbac1cbdfbdb8673079cad0c33486d233i0',
  'https://ordinals.com/content/5a42d7b2e2fe01e4f31cbad5dd671997f87339d970faaab37f6355c4a2f3be5ai0',
  'https://ordinals.com/content/ddc1838c1a6a3c45b2c6e19ff278c3b51b0797c3f1339c533370442d23687a68i0',
  'https://ordinals.com/content/1e3c2571e96729153e4b63e2b561d85aec7bc5ba372d293af469a525dfa3ed59i0',
  'https://ordinals.com/content/91f52a4ca00bb27383ae149f24b605d75ea99df033a6cbb6de2389455233bf51i0',
  'https://ordinals.com/content/437868aecce108d49f9b29c2f477987cb5834ffdf639a650335af7f0fdd5e55bi0',
  'https://ordinals.com/content/3be1f8e37b718f5b9874aecad792504c5822dc8dfc727ad4928594f7725db987i0'
];

const TOTAL_IFRAMES_TO_INITIALIZE = 36;
const BLOB_REVOKE_FALLBACK_MS = 30000;

// Startup tuning: keep first paint responsive, then load remaining preloads in background.
export const STARTUP_IMMEDIATE_PRELOAD_COUNT = 1;
export const STARTUP_DEFERRED_PRELOAD_DELAY_MS = 400;
export const PRELOAD_BATCH_CONCURRENCY = 2;
export const PRELOAD_TASK_STAGGER_MS = 120;
export const RANDOM_MIX_CONCURRENCY = 3;
export const AUTO_DEFERRED_PRELOAD_ENABLED = true;
export const ORDERED_MIX_CONCURRENCY = 3;

const ORDERED_REPEAT_PATTERN = [2, 3];
const ORDERED_VARIATIONS = [
  { speed: 0.9, action: 'decreaseScheduleMultiplier', times: 2 },
  { speed: 1.0, action: 'increaseScheduleMultiplier', times: 2 },
  { speed: 1.2, action: 'increaseScheduleMultiplier', times: 3 }
];

const htmlFetchCache = new Map();

window.iframeSettings = window.iframeSettings || {};

function delay(ms) {
  if (ms <= 0) return Promise.resolve();
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function getOriginFromSrc(src) {
  try {
    const origin = new URL(src, window.location.href).origin;
    return origin === 'null' ? '*' : origin;
  } catch {
    return '*';
  }
}

function revokeBlobUrl(iframe, blobUrl) {
  let revoked = false;
  const cleanup = () => {
    if (revoked) return;
    revoked = true;
    URL.revokeObjectURL(blobUrl);
  };

  iframe.addEventListener('load', cleanup, { once: true });
  iframe.addEventListener('error', cleanup, { once: true });
  window.setTimeout(cleanup, BLOB_REVOKE_FALLBACK_MS);
}

function fetchHtmlWithCache(url) {
  const existing = htmlFetchCache.get(url);
  if (existing) return existing;

  const requestPromise = fetch(url)
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Network response was not ok: ${response.statusText}`);
      }
      return response.text();
    })
    .catch((error) => {
      htmlFetchCache.delete(url);
      throw error;
    });

  htmlFetchCache.set(url, requestPromise);
  return requestPromise;
}

function getStartupImmediatePreloadCount() {
  const override = window.ORDSPD_STARTUP_IMMEDIATE_PRELOAD_COUNT;
  if (Number.isInteger(override) && override >= 0) return override;
  return STARTUP_IMMEDIATE_PRELOAD_COUNT;
}

function isDeferredStartupPreloadEnabled() {
  if (typeof window.ORDSPD_ENABLE_DEFERRED_PRELOAD === 'boolean') {
    return window.ORDSPD_ENABLE_DEFERRED_PRELOAD;
  }
  return AUTO_DEFERRED_PRELOAD_ENABLED;
}

async function runTasksWithConcurrency(taskFactories, concurrencyLimit) {
  if (taskFactories.length === 0) return;

  const limit = Math.max(1, Math.min(concurrencyLimit, taskFactories.length));
  let index = 0;

  async function worker() {
    while (index < taskFactories.length) {
      const taskIndex = index;
      index += 1;
      await taskFactories[taskIndex]();
    }
  }

  const workers = Array.from({ length: limit }, () => worker());
  await Promise.all(workers);
}

async function manageContentLoading(iframe, url, loadButton, options = {}) {
  const { showAlertOnError = true, staggerMs = 0 } = options;

  try {
    const html = await fetchHtmlWithCache(url);
    const blob = new Blob([html], { type: 'text/html' });
    const blobUrl = URL.createObjectURL(blob);

    revokeBlobUrl(iframe, blobUrl);
    iframe.src = blobUrl;

    if (loadButton) {
      loadButton.classList.add('hidden');
    }

    await delay(staggerMs);
  } catch (error) {
    console.error('Error:', error);
    if (showAlertOnError) {
      alert('There was an issue loading the content.');
    }
    if (loadButton) {
      loadButton.classList.remove('hidden');
    }
    throw error;
  }
}

function scheduleDeferredPreloads(taskFactories, prerequisitePromise = Promise.resolve()) {
  if (taskFactories.length === 0) return;

  const runDeferred = () => {
    prerequisitePromise.finally(() => {
      runTasksWithConcurrency(taskFactories, PRELOAD_BATCH_CONCURRENCY).catch((error) => {
        console.error('Deferred preload failed:', error);
      });
    });
  };

  if (typeof window.requestIdleCallback === 'function') {
    window.requestIdleCallback(runDeferred, { timeout: STARTUP_DEFERRED_PRELOAD_DELAY_MS });
    return;
  }

  window.setTimeout(runDeferred, STARTUP_DEFERRED_PRELOAD_DELAY_MS);
}

function manageContentLoadingPromise(iframe, url, loadButton, options = {}) {
  return manageContentLoading(iframe, url, loadButton, options);
}

function getWrappers() {
  return Array.from(document.querySelectorAll('.iframe-wrapper'));
}

function createIframeElementForIndex(index) {
  const iframe = document.createElement('iframe');
  iframe.id = `iframe-${index}`;
  iframe.loading = 'lazy';
  iframe.style.zIndex = '1';
  return iframe;
}

function buildOrderedSelectionPlan(totalPads) {
  const plan = [];
  let groupIndex = 0;

  while (plan.length < totalPads) {
    const sampleIndex = groupIndex % preloadUrls.length;
    const repeatCount = ORDERED_REPEAT_PATTERN[groupIndex % ORDERED_REPEAT_PATTERN.length];
    const url = preloadUrls[sampleIndex];

    for (let repeatPosition = 0; repeatPosition < repeatCount && plan.length < totalPads; repeatPosition++) {
      const variation = ORDERED_VARIATIONS[Math.min(repeatPosition, ORDERED_VARIATIONS.length - 1)];
      plan.push({
        url,
        speed: variation.speed,
        action: variation.action,
        times: variation.times
      });
    }

    groupIndex += 1;
  }

  return plan;
}

function applyPadVariationSettings(iframe, variation) {
  const speed = variation.speed.toFixed(2);
  window.iframeSettings[iframe.id] = window.iframeSettings[iframe.id] || {};
  window.iframeSettings[iframe.id].speed = speed;
  window.iframeSettings[iframe.id].action = variation.action;
  window.iframeSettings[iframe.id].times = variation.times;

  if (!iframe.contentWindow) return;

  const src = iframe.getAttribute('src');
  if (!src) return;

  const origin = getOriginFromSrc(src);
  iframe.contentWindow.postMessage({ type: 'playAtSpeed', data: { speed } }, origin);
  for (let i = 0; i < variation.times; i++) {
    iframe.contentWindow.postMessage({ type: variation.action }, origin);
  }
}

function loadPadEntry(entry, padIndex, wrappers, loadButtons) {
  const iframe = ensureIframeForIndex(padIndex, wrappers);
  if (!iframe) return Promise.resolve();

  return manageContentLoadingPromise(iframe, entry.url, loadButtons[padIndex], {
    showAlertOnError: false,
    staggerMs: PRELOAD_TASK_STAGGER_MS
  }).then(() => {
    window.iframeSettings[iframe.id] = window.iframeSettings[iframe.id] || {};
    window.iframeSettings[iframe.id].url = entry.url;
    if (entry.speed !== undefined && entry.action && entry.times !== undefined) {
      applyPadVariationSettings(iframe, entry);
    }
  });
}

function loadPadPlan(plan, wrappers, loadButtons, concurrency, startPadIndex = 0) {
  const loadTasks = plan.map((entry, offset) => {
    const padIndex = startPadIndex + offset;
    return () => loadPadEntry(entry, padIndex, wrappers, loadButtons);
  });

  return runTasksWithConcurrency(loadTasks, concurrency);
}

function ensureIframeForIndex(index, wrappers) {
  const wrapper = wrappers[index];
  if (!wrapper) return null;

  let iframe = wrapper.querySelector('iframe');
  if (!iframe) {
    iframe = createIframeElementForIndex(index);
    const loadButton = wrapper.querySelector('.load-button');
    wrapper.insertBefore(iframe, loadButton || null);
  } else if (!iframe.id) {
    iframe.id = `iframe-${index}`;
  }

  return iframe;
}

export function preloadContent() {
  const wrappers = getWrappers();
  const loadButtons = wrappers.map((wrapper) => wrapper.querySelector('.load-button'));
  const startupPlan = buildOrderedSelectionPlan(TOTAL_IFRAMES_TO_INITIALIZE);

  const defaultSettings = {
    volume: 1,
    playbackSpeed: 1,
    scheduleMultiplier: 1
  };

  window.iframeSettings = window.iframeSettings || {};

  for (let i = 0; i < TOTAL_IFRAMES_TO_INITIALIZE; i++) {
    const wrapper = wrappers[i];
    if (!wrapper) continue;

    const startupEntry = startupPlan[i];
    if (!startupEntry) continue;

    const iframe = wrapper.querySelector('iframe');
    const iframeId = `iframe-${i}`;
    if (iframe && !iframe.id) {
      iframe.id = iframeId;
    }
    window.iframeSettings[iframeId] = { ...defaultSettings };
    window.iframeSettings[iframeId].url = startupEntry.url;
    window.iframeSettings[iframeId].speed = startupEntry.speed.toFixed(2);
    window.iframeSettings[iframeId].action = startupEntry.action;
    window.iframeSettings[iframeId].times = startupEntry.times;
  }

  const immediateCount = getStartupImmediatePreloadCount();
  const immediatePlan = startupPlan.slice(0, immediateCount);
  const deferredPlan = startupPlan.slice(immediateCount);

  const immediatePreloadPromise = loadPadPlan(
    immediatePlan,
    wrappers,
    loadButtons,
    PRELOAD_BATCH_CONCURRENCY
  ).catch((error) => {
    console.error('Immediate preload failed:', error);
  });

  if (isDeferredStartupPreloadEnabled()) {
    scheduleDeferredPreloads(
      deferredPlan.map((entry, offset) => {
        const padIndex = immediateCount + offset;
        return () => loadPadEntry(entry, padIndex, wrappers, loadButtons);
      }),
      immediatePreloadPromise
    );
  }
}

export function loadOrderedSamplesAndApplyVariations() {
  const wrappers = getWrappers();
  if (wrappers.length !== TOTAL_IFRAMES_TO_INITIALIZE) {
    console.error(`Expected ${TOTAL_IFRAMES_TO_INITIALIZE} wrappers for ordered sample placement.`);
    return;
  }

  const loadButtons = wrappers.map((wrapper) => wrapper.querySelector('.load-button'));
  const orderedPlan = buildOrderedSelectionPlan(TOTAL_IFRAMES_TO_INITIALIZE);

  loadPadPlan(orderedPlan, wrappers, loadButtons, ORDERED_MIX_CONCURRENCY).catch((error) => {
    console.error('An error occurred while loading ordered samples:', error);
  });
}

export function loadContentFromURL(iframe, loadButton) {
  const url = prompt('Please enter the URL:');
  if (!url) return;

  loadButton.classList.add('hidden');
  const jsonUrlPattern = /\.json$/i;

  if (jsonUrlPattern.test(url)) {
    processJSONContent(url, iframe, loadButton);
    return;
  }

  manageContentLoading(iframe, url, loadButton, { showAlertOnError: true }).catch(() => {});
}

async function processJSONContent(url, iframe, loadButton) {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Network response was not ok: ${response.statusText}`);
    const jsonData = await response.json();

    if (!isValidAudionalJSON(jsonData)) {
      throw new Error('Invalid JSON format for audional content');
    }

    placeAudioData(jsonData.audioData, iframe);

    if (jsonData.imageData) {
      placeImageData(jsonData.imageData, iframe);
    }

    console.log('JSON content processed successfully');
    loadButton.classList.add('hidden');
  } catch (error) {
    console.error('Error:', error);
    alert('There was an issue loading the JSON content.');
    loadButton.classList.remove('hidden');
  }
}

function isValidAudionalJSON(jsonData) {
  return jsonData.protocol === 'audional' && jsonData.operation === 'deploy' && jsonData.audioData;
}

function placeAudioData(audioData, iframe) {
  console.log('Placing audio data into the pad...');
}

function placeImageData(imageData, iframe) {
  console.log('Placing image data into the pad...');
}

function getRandomSampleMix() {
  const mix = [];
  for (let i = 0; i < TOTAL_IFRAMES_TO_INITIALIZE; i++) {
    const randomIndex = Math.floor(Math.random() * preloadUrls.length);
    mix.push(randomIndex);
  }
  return mix;
}

function randomizeSamplesAndLoad() {
  const wrappers = getWrappers();
  if (wrappers.length !== TOTAL_IFRAMES_TO_INITIALIZE) {
    console.error(`Expected ${TOTAL_IFRAMES_TO_INITIALIZE} wrappers for sample placement.`);
    return;
  }

  const loadButtons = wrappers.map((wrapper) => wrapper.querySelector('.load-button'));
  const randomMix = getRandomSampleMix();

  const loadTasks = randomMix.map((index, iframeIndex) => {
    const url = preloadUrls[index];
    const loadButton = loadButtons[iframeIndex];

    return () =>
      {
        const iframe = ensureIframeForIndex(iframeIndex, wrappers);
        if (!iframe) return Promise.resolve();
        return manageContentLoadingPromise(iframe, url, loadButton, {
          showAlertOnError: false,
          staggerMs: PRELOAD_TASK_STAGGER_MS
        }).then(() => {
          window.iframeSettings[iframe.id] = window.iframeSettings[iframe.id] || {};
          window.iframeSettings[iframe.id].url = url;
        });
      };
  });

  runTasksWithConcurrency(loadTasks, RANDOM_MIX_CONCURRENCY)
    .then(() => {
      randomizePlaySpeeds();
      randomizeScheduleMultipliers();
    })
    .catch((error) => {
      console.error('An error occurred while loading samples:', error);
    });
}

const randomMixButton = document.querySelector('.random-mix-btn');
if (randomMixButton) {
  randomMixButton.addEventListener('click', randomizeSamplesAndLoad);
}

const orderedMixButton = document.querySelector('#orderedMixButton, .ordered-mix-btn');
if (orderedMixButton) {
  orderedMixButton.addEventListener('click', loadOrderedSamplesAndApplyVariations);
}

export function randomizePlaySpeeds() {
  const iframes = document.querySelectorAll('iframe');

  iframes.forEach((iframe) => {
    const src = iframe.getAttribute('src');
    if (!src) return;

    let randomSpeed;
    const rand = Math.random();
    if (rand < 0.33) {
      randomSpeed = (Math.random() * (0.8 - 0.2) + 0.2).toFixed(2);
    } else if (rand < 0.63) {
      randomSpeed = (Math.random() * (2 - 0.8) + 0.8).toFixed(2);
    } else {
      randomSpeed = (Math.random() * (100 - 3) + 3).toFixed(2);
    }

    const messageData = { type: 'playAtSpeed', data: { speed: randomSpeed } };
    const iframeId = iframe.id || `iframe-${Math.random().toString(16).slice(2)}`;

    window.iframeSettings[iframeId] = window.iframeSettings[iframeId] || {};
    window.iframeSettings[iframeId].speed = randomSpeed;

    if (iframe.contentWindow) {
      iframe.contentWindow.postMessage(messageData, getOriginFromSrc(src));
    }
  });
}

window.randomizePlaySpeeds = randomizePlaySpeeds;

export function randomizeScheduleMultipliers() {
  const iframes = document.querySelectorAll('iframe');

  iframes.forEach((iframe) => {
    const src = iframe.getAttribute('src');
    if (!src) return;

    const actionType = Math.random() < 0.5 ? 'increaseScheduleMultiplier' : 'decreaseScheduleMultiplier';
    const repetitions = Math.floor(Math.random() * 3) + 1;
    const iframeId = iframe.id || `iframe-${Math.random().toString(16).slice(2)}`;

    for (let i = 0; i < repetitions; i++) {
      const messageData = { type: actionType };

      window.iframeSettings[iframeId] = window.iframeSettings[iframeId] || {};
      window.iframeSettings[iframeId].action = actionType;
      window.iframeSettings[iframeId].times = repetitions;

      if (iframe.contentWindow) {
        iframe.contentWindow.postMessage(messageData, getOriginFromSrc(src));
      }
    }
  });
}

window.randomizeScheduleMultipliers = randomizeScheduleMultipliers;

// Test-only utility to isolate cache behavior between test cases.
export function __resetContentLoaderCacheForTests() {
  htmlFetchCache.clear();
}

export function __buildOrderedSelectionPlanForTests(totalPads = TOTAL_IFRAMES_TO_INITIALIZE) {
  return buildOrderedSelectionPlan(totalPads);
}
