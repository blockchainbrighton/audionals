// waveformTrimmer.js

const HANDLE_WIDTH = 10;

let trimmerContainer, startHandle, endHandle;
let isDragging = false, dragTarget, dragOffsetX = 0;
let currentBufferDuration = 0, trimStartRatio = 0, trimEndRatio = 1, isReversed = false;

const clamp = (v, min, max) => (v < min ? min : v > max ? max : v);

const updateHandlesUI = () => {
  if (!trimmerContainer) return;
  const W = trimmerContainer.clientWidth; if (!W) return;
  const [ds, de] = isReversed
    ? [1 - trimEndRatio, 1 - trimStartRatio]
    : [trimStartRatio, trimEndRatio];
  startHandle.style.left = `${clamp(ds * W, 0, W)}px`;
  endHandle.style.left   = `${clamp(de * W - HANDLE_WIDTH, 0, W - HANDLE_WIDTH)}px`;
};

const dispatchTrimChangeEvent = () => {
  trimmerContainer.dispatchEvent(new CustomEvent('trimchanged', {
    detail: {
      startRatio: trimStartRatio,
      endRatio:   trimEndRatio,
      startTime:  trimStartRatio * currentBufferDuration,
      endTime:    trimEndRatio   * currentBufferDuration,
      duration:   (trimEndRatio - trimStartRatio) * currentBufferDuration
    },
    bubbles: true,
    cancelable: true
  }));
};

const calculateRatio = x => {
  const { width, left } = trimmerContainer.getBoundingClientRect();
  return clamp((x - left) / width, 0, 1);
};

const handlePointerDown = e => {
  if (e.button !== 0) return;
  isDragging = true;
  dragTarget = e.target.dataset.type;
  dragOffsetX = e.clientX - e.target.getBoundingClientRect().left;
  trimmerContainer.classList.add('dragging');
  e.preventDefault();
  e.stopPropagation();
};

const handlePointerMove = e => {
  if (!isDragging) return;
  e.preventDefault();
  const W = trimmerContainer.clientWidth; if (!W) return;
  const idealX = e.clientX - dragOffsetX;
  const rawRatio = calculateRatio(
    dragTarget === 'end' ? idealX + HANDLE_WIDTH : idealX
  );
  let ns = trimStartRatio, ne = trimEndRatio, sep = HANDLE_WIDTH / W;

  if (dragTarget === 'start') {
    if (isReversed) ne = clamp(1 - rawRatio, trimStartRatio + sep, 1);
    else           ns = clamp(rawRatio, 0, trimEndRatio - sep);
  } else {
    if (isReversed) ns = clamp(1 - rawRatio, 0, trimEndRatio - sep);
    else           ne = clamp(rawRatio, trimStartRatio + sep, 1);
  }

  if (ns !== trimStartRatio || ne !== trimEndRatio) {
    trimStartRatio = ns;
    trimEndRatio   = ne;
    updateHandlesUI();
    dispatchTrimChangeEvent();
  }
};

const handlePointerUp = e => {
  if (!isDragging) return;
  isDragging = false;
  trimmerContainer.classList.remove('dragging');
  e.stopPropagation();
};

export function init(containerId) {
  trimmerContainer = document.getElementById(containerId);
  if (!trimmerContainer) {
    console.error(`Waveform Trimmer: Container element with ID "${containerId}" not found.`);
    return false;
  }
  Object.assign(trimmerContainer.style, { position: 'relative', overflow: 'hidden' });

  [startHandle, endHandle] = ['start', 'end'].map(type => {
    const h = document.createElement('div');
    h.className = `trim-handle trim-handle-${type}`;
    h.dataset.type = type;
    trimmerContainer.appendChild(h);
    return h;
  });

  ['pointerdown','pointermove','pointerup','pointercancel'].forEach((evt,i) => {
    const listener = i === 1
      ? handlePointerMove
      : (i > 1 ? handlePointerUp : handlePointerDown);
    const targets  = i === 0 ? [startHandle, endHandle] : [document];
    targets.forEach(t => t.addEventListener(evt, listener));
  });

  isReversed = false;
  resetTrims();
  console.log("Waveform Trimmer initialized.");
  return true;
}

export function setReversed(reversed) {
  if (isReversed === reversed) return;
  isReversed = reversed;
  console.log(`Waveform Trimmer: Set reversed state to ${isReversed}`);
  updateHandlesUI();
}

export function setBufferDuration(duration) {
  const newDur = Math.max(0, duration);
  if (currentBufferDuration === newDur) return;
  currentBufferDuration = newDur;
  console.log(`Waveform Trimmer: Buffer duration set to ${currentBufferDuration.toFixed(3)}s`);
  resetTrims();
}

export function resetTrims() {
  trimStartRatio = 0;
  trimEndRatio   = 1;
  updateHandlesUI();
  dispatchTrimChangeEvent();
  console.log("Waveform Trimmer: Trims reset to full range (0.0 - 1.0).");
}

export function getTrimTimes() {
  if (currentBufferDuration <= 0) return { startTime: 0, endTime: 0, duration: 0 };
  const startTime = trimStartRatio * currentBufferDuration;
  const endTime   = trimEndRatio   * currentBufferDuration;
  return { startTime, endTime, duration: Math.max(0, endTime - startTime) };
}
