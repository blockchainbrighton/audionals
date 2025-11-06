import { drawWaveform } from './sequencer-waveform.js';
import { ensureSamplerChannelDefaults, samplerChannelDefaults, runtimeState } from './sequencer-state.js';
import { FADE_SHAPE_PRESETS, normalizeFadeShape } from './fade-shapes.js';
import { requestSchedulerResync } from './sequencer-audio-time-scheduling.js';
import { playSamplerChannel } from './sequencer-sampler-playback.js';

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const clamp01 = value => clamp(value, 0, 1);
const ensureFinite = (value, fallback) => (Number.isFinite(value) ? value : fallback);

const MIN_VIEW_SPAN = 0.015;
const MAX_VIEW_SPAN = 1;
const AUTO_FIT_DELAY_MS = 2100;
const MIN_VIEW_PADDING = 0.03;
const MAX_VIEW_PADDING = 0.12;
const MIN_REGION_DELTA = 0.001;
const MIN_REGION_DELTA_PERCENT = MIN_REGION_DELTA * 100;
const HANDLE_HIT_MARGIN_PX = 14;
const REGION_GRAB_PADDING_PX = 10;
const DEFAULT_CANVAS_HEIGHT = 260;
const MIN_CANVAS_HEIGHT = 180;
const MAX_CANVAS_HEIGHT = 320;
const ZOOM_STEP = 12;

const formatTime = seconds => {
    if (!Number.isFinite(seconds)) return '0 ms';
    if (seconds >= 1) return `${seconds.toFixed(2)} s`;
    return `${Math.round(seconds * 1000)} ms`;
};

const formatPercent = (value, digits = 1) => `${value.toFixed(digits)}%`;
const formatMs = seconds => `${Math.round(seconds * 1000)} ms`;

function createSummaryItem() {
    const span = document.createElement('span');
    span.className = 'waveform-summary-item';
    return span;
}

export class WaveformEditorModal {
    constructor({ container, audioBuffer, channelData, sampleName, onStateChange, onRequestClose }) {
        this.container = container;
        this.audioBuffer = audioBuffer;
        this.channelData = channelData;
        this.sampleName = sampleName || 'Sample Controls';
        this.onStateChange = typeof onStateChange === 'function' ? onStateChange : null;
        this.onRequestClose = typeof onRequestClose === 'function' ? onRequestClose : null;

        ensureSamplerChannelDefaults(this.channelData);

        this.bufferDuration = audioBuffer?.duration || (audioBuffer?.length && audioBuffer?.sampleRate ? audioBuffer.length / audioBuffer.sampleRate : 0);
        this.viewSpan = MAX_VIEW_SPAN;
        this.viewCenter = 0.5;
        this.viewportStart = 0;
        this.viewportEnd = 1;
        this.pendingAutoFit = null;
        this.lastManualZoomAt = 0;
        this.pendingDraw = 0;
        this.isDestroyed = false;
        this.canvasHeight = this.computeCanvasHeight();
        this.listeners = [];
        this.controlIdCounter = 0;
        this.fadeShapeButtons = { in: [], out: [] };

        this.dragState = {
            mode: null,
            pointerId: null,
            grabOffset: 0,
            regionSpan: null
        };

        this.handleBackdropClick = this.handleBackdropClick.bind(this);
        this.handleEscape = this.handleEscape.bind(this);
        this.handleWindowResize = this.handleWindowResize.bind(this);
        this.handleCanvasPointerDown = this.handleCanvasPointerDown.bind(this);
        this.handleCanvasPointerMove = this.handleCanvasPointerMove.bind(this);
        this.handleCanvasPointerUp = this.handleCanvasPointerUp.bind(this);
        this.handleCanvasPointerCancel = this.handleCanvasPointerCancel.bind(this);
        this.handleCanvasPointerLeave = this.handleCanvasPointerLeave.bind(this);
    }

    open() {
        if (!this.container || !this.audioBuffer || !this.channelData) return;

        this.buildDom();
        this.container.innerHTML = '';
        this.container.appendChild(this.contentEl);
        this.container.style.display = 'flex';
        this.container.setAttribute('data-open', 'true');

        this.addListener(this.container, 'click', this.handleBackdropClick);
        this.addListener(document, 'keydown', this.handleEscape);
        this.addListener(window, 'resize', this.handleWindowResize, { passive: true });

        this.attachUiEventHandlers();

        if (typeof ResizeObserver === 'function') {
            this.resizeObserver = new ResizeObserver(() => this.scheduleDraw());
            this.resizeObserver.observe(this.canvasWrap || this.canvas);
        }

        this.updateZoomUI();
        this.updateReadouts();
        this.scheduleDraw(true);
        if (this.onStateChange) this.onStateChange();
        requestSchedulerResync();
        this.scheduleAutoFit();
    }

    destroy() {
        if (this.isDestroyed) return;
        this.isDestroyed = true;

        this.cancelAutoFit();
        if (this.pendingDraw) {
            cancelAnimationFrame(this.pendingDraw);
            this.pendingDraw = 0;
        }

        if (this.resizeObserver) {
            try {
                this.resizeObserver.disconnect();
            } catch (error) {
                /* ignore */
            }
            this.resizeObserver = null;
        }

        while (this.listeners.length) {
            const { target, type, handler, options } = this.listeners.pop();
            try {
                target.removeEventListener(type, handler, options);
            } catch (error) {
                /* ignore */
            }
        }

        if (this.container) {
            this.container.innerHTML = '';
            this.container.style.display = 'none';
            this.container.removeAttribute('data-open');
        }

        this.fadeShapeButtons.in = [];
        this.fadeShapeButtons.out = [];
    }

    close() {
        if (this.isDestroyed) return;
        this.destroy();
        if (this.onRequestClose) this.onRequestClose();
    }

    buildDom() {
        const content = document.createElement('div');
        content.className = 'waveform-modal-content';

        const header = document.createElement('header');
        header.className = 'waveform-modal-header';

        const heading = document.createElement('div');
        heading.className = 'waveform-modal-heading';

        const titleEl = document.createElement('h3');
        titleEl.className = 'waveform-modal-title';
        titleEl.textContent = this.sampleName;

        const subtitleEl = document.createElement('p');
        subtitleEl.className = 'waveform-modal-subtitle';
        subtitleEl.textContent = 'Trim, warp, and preview the active sample.';

        heading.append(titleEl, subtitleEl);

        const closeBtn = document.createElement('button');
        closeBtn.type = 'button';
        closeBtn.className = 'waveform-modal-close';
        closeBtn.setAttribute('aria-label', 'Close waveform editor');
        closeBtn.textContent = '×';

        header.append(heading, closeBtn);

        const body = document.createElement('div');
        body.className = 'waveform-modal-body';

        const visualPanel = document.createElement('section');
        visualPanel.className = 'waveform-visual-panel';

        const canvasWrap = document.createElement('div');
        canvasWrap.className = 'waveform-canvas-wrap';

        const canvas = document.createElement('canvas');
        canvas.className = 'waveform-modal-canvas';
        canvas.style.touchAction = 'none';
        canvasWrap.appendChild(canvas);

        const summary = document.createElement('div');
        summary.className = 'waveform-selection-summary';
        const startInfo = createSummaryItem();
        const endInfo = createSummaryItem();
        const lengthInfo = createSummaryItem();
        summary.append(startInfo, endInfo, lengthInfo);

        const zoomControls = document.createElement('div');
        zoomControls.className = 'waveform-zoom-controls';

        const zoomRow = document.createElement('div');
        zoomRow.className = 'waveform-zoom-row';

        const zoomLabel = document.createElement('span');
        zoomLabel.className = 'waveform-zoom-label';
        zoomLabel.textContent = 'Zoom';

        const zoomOutBtn = document.createElement('button');
        zoomOutBtn.type = 'button';
        zoomOutBtn.className = 'waveform-zoom-button';
        zoomOutBtn.textContent = '−';

        const zoomSlider = document.createElement('input');
        zoomSlider.type = 'range';
        zoomSlider.min = '0';
        zoomSlider.max = '100';
        zoomSlider.value = '0';
        zoomSlider.className = 'waveform-zoom-slider';

        const zoomInBtn = document.createElement('button');
        zoomInBtn.type = 'button';
        zoomInBtn.className = 'waveform-zoom-button';
        zoomInBtn.textContent = '+';

        const fitBtn = document.createElement('button');
        fitBtn.type = 'button';
        fitBtn.className = 'waveform-zoom-button';
        fitBtn.textContent = 'Fit Selection';

        const fullBtn = document.createElement('button');
        fullBtn.type = 'button';
        fullBtn.className = 'waveform-zoom-button';
        fullBtn.textContent = 'Full View';

        zoomRow.append(zoomLabel, zoomOutBtn, zoomSlider, zoomInBtn, fitBtn, fullBtn);

        const panRow = document.createElement('div');
        panRow.className = 'waveform-pan-row';

        const panLabel = document.createElement('span');
        panLabel.className = 'waveform-zoom-label';
        panLabel.textContent = 'Offset';

        const panSlider = document.createElement('input');
        panSlider.type = 'range';
        panSlider.min = '0';
        panSlider.max = '100';
        panSlider.value = '0';
        panSlider.className = 'waveform-pan-slider';

        panRow.append(panLabel, panSlider);
        zoomControls.append(zoomRow, panRow);

        visualPanel.append(canvasWrap, summary, zoomControls);

        const controls = document.createElement('aside');
        controls.className = 'waveform-modal-controls waveform-control-panel';

        this.fadeShapeButtons.in = [];
        this.fadeShapeButtons.out = [];

        const startSlider = document.createElement('input');
        startSlider.type = 'range';
        startSlider.min = '0';
        startSlider.max = '99.9';
        startSlider.step = '0.1';
        startSlider.className = 'waveform-control-slider';

        const startValue = document.createElement('span');
        startValue.className = 'waveform-control-value';

        const endSlider = document.createElement('input');
        endSlider.type = 'range';
        endSlider.min = '0.1';
        endSlider.max = '100';
        endSlider.step = '0.1';
        endSlider.className = 'waveform-control-slider';

        const endValue = document.createElement('span');
        endValue.className = 'waveform-control-value';

        const playbackRateSlider = document.createElement('input');
        playbackRateSlider.type = 'range';
        playbackRateSlider.min = '25';
        playbackRateSlider.max = '400';
        playbackRateSlider.step = '1';
        playbackRateSlider.className = 'waveform-control-slider';

        const playbackRateValue = document.createElement('span');
        playbackRateValue.className = 'waveform-control-value';

        const fadeInSlider = document.createElement('input');
        fadeInSlider.type = 'range';
        fadeInSlider.min = '0';
        fadeInSlider.max = '500';
        fadeInSlider.step = '5';
        fadeInSlider.className = 'waveform-control-slider';

        const fadeInValue = document.createElement('span');
        fadeInValue.className = 'waveform-control-value';

        const fadeOutSlider = document.createElement('input');
        fadeOutSlider.type = 'range';
        fadeOutSlider.min = '0';
        fadeOutSlider.max = '500';
        fadeOutSlider.step = '5';
        fadeOutSlider.className = 'waveform-control-slider';

        const fadeOutValue = document.createElement('span');
        fadeOutValue.className = 'waveform-control-value';

        const createControlRow = (labelText, sliderEl, valueEl, extraEl = null) => {
            const row = document.createElement('div');
            row.className = 'waveform-control-row';

            const slug = labelText.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'ctrl';
            const sliderId = `waveform-control-${slug}-${++this.controlIdCounter}`;
            sliderEl.id = sliderId;

            const labelEl = document.createElement('label');
            labelEl.className = 'waveform-control-label';
            labelEl.setAttribute('for', sliderId);
            labelEl.textContent = labelText;

            row.append(labelEl, sliderEl);
            if (extraEl) row.append(extraEl);
            row.append(valueEl);
            return row;
        };

        const createFadeShapeSelector = kind => {
            const wrapper = document.createElement('div');
            wrapper.className = 'waveform-shape-buttons';
            const bucket = this.fadeShapeButtons[kind];
            FADE_SHAPE_PRESETS.forEach(preset => {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'waveform-shape-button';
                btn.dataset.shape = preset.id;
                btn.title = `${preset.label} fade`;
                btn.textContent = preset.shortLabel;
                btn.setAttribute('aria-pressed', 'false');
                this.addListener(btn, 'click', () => {
                    const normalized = normalizeFadeShape(preset.id);
                    if (kind === 'in') {
                        this.channelData.sampleFadeInShape = normalized;
                    } else {
                        this.channelData.sampleFadeOutShape = normalized;
                    }
                    this.setActiveFadeShape(kind, normalized);
                    this.emitChange();
                });
                wrapper.appendChild(btn);
                bucket.push(btn);
            });
            return wrapper;
        };

        const fadeInShapes = createFadeShapeSelector('in');
        const fadeOutShapes = createFadeShapeSelector('out');

        controls.append(
            createControlRow('Start', startSlider, startValue),
            createControlRow('End', endSlider, endValue),
            createControlRow('Playback Rate', playbackRateSlider, playbackRateValue),
            createControlRow('Fade In', fadeInSlider, fadeInValue, fadeInShapes),
            createControlRow('Fade Out', fadeOutSlider, fadeOutValue, fadeOutShapes)
        );

        body.append(visualPanel, controls);

        const actions = document.createElement('footer');
        actions.className = 'waveform-modal-actions';

        const previewBtn = document.createElement('button');
        previewBtn.type = 'button';
        previewBtn.className = 'waveform-modal-button primary';
        previewBtn.textContent = 'Preview Selection';

        const resetBtn = document.createElement('button');
        resetBtn.type = 'button';
        resetBtn.className = 'waveform-modal-button';
        resetBtn.textContent = 'Reset to Full Sample';

        actions.append(previewBtn, resetBtn);

        content.append(header, body, actions);

        this.contentEl = content;
        this.closeBtn = closeBtn;
        this.bodyEl = body;
        this.visualPanel = visualPanel;
        this.canvasWrap = canvasWrap;
        this.canvas = canvas;
        this.summaryEl = summary;
        this.startInfo = startInfo;
        this.endInfo = endInfo;
        this.lengthInfo = lengthInfo;
        this.zoomControls = zoomControls;
        this.zoomSlider = zoomSlider;
        this.zoomOutBtn = zoomOutBtn;
        this.zoomInBtn = zoomInBtn;
        this.fitSelectionBtn = fitBtn;
        this.fullViewBtn = fullBtn;
        this.panSlider = panSlider;
        this.startSlider = startSlider;
        this.endSlider = endSlider;
        this.startValue = startValue;
        this.endValue = endValue;
        this.playbackRateSlider = playbackRateSlider;
        this.playbackRateValue = playbackRateValue;
        this.fadeInSlider = fadeInSlider;
        this.fadeInValue = fadeInValue;
        this.fadeOutSlider = fadeOutSlider;
        this.fadeOutValue = fadeOutValue;
        this.previewBtn = previewBtn;
        this.resetBtn = resetBtn;
    }

    attachUiEventHandlers() {
        this.addListener(this.closeBtn, 'click', () => this.close());

        this.addListener(this.zoomSlider, 'input', () => {
            const span = this.spanFromSliderValue(Number(this.zoomSlider.value));
            const halfSpan = span / 2;
            this.viewSpan = span;
            this.viewCenter = clamp(this.viewCenter, halfSpan, 1 - halfSpan);
            this.viewportStart = clamp(this.viewCenter - halfSpan, 0, 1 - this.viewSpan);
            this.viewportEnd = this.viewportStart + this.viewSpan;
            this.markManualZoom();
            this.updateZoomUI();
            this.scheduleDraw();
        });

        this.addListener(this.zoomOutBtn, 'click', () => {
            const nextValue = clamp(Number(this.zoomSlider.value) - ZOOM_STEP, 0, 100);
            this.zoomSlider.value = String(nextValue);
            this.zoomSlider.dispatchEvent(new Event('input', { bubbles: false }));
        });

        this.addListener(this.zoomInBtn, 'click', () => {
            const nextValue = clamp(Number(this.zoomSlider.value) + ZOOM_STEP, 0, 100);
            this.zoomSlider.value = String(nextValue);
            this.zoomSlider.dispatchEvent(new Event('input', { bubbles: false }));
        });

        this.addListener(this.fitSelectionBtn, 'click', () => this.fitSelection({ userInitiated: true }));
        this.addListener(this.fullViewBtn, 'click', () => this.setViewWindow(0, 1, { userInitiated: true }));

        this.addListener(this.panSlider, 'input', () => {
            const remaining = 1 - this.viewSpan;
            if (remaining <= 0.0001) return;
            const ratio = clamp(Number(this.panSlider.value) / 100, 0, 1);
            this.viewportStart = clamp(ratio * remaining, 0, 1 - this.viewSpan);
            this.viewportEnd = this.viewportStart + this.viewSpan;
            this.viewCenter = this.viewportStart + this.viewSpan / 2;
            this.markManualZoom();
            this.updateZoomUI();
            this.scheduleDraw();
        });

        this.addListener(this.startSlider, 'input', () => {
            const sliderValue = this.parseRegionSliderValue(this.startSlider);
            if (sliderValue === null) return;
            const raw = sliderValue / 100;
            const safeEnd = ensureFinite(this.channelData.sampleRegion?.end, 1);
            this.channelData.sampleRegion.start = clamp01(Math.min(raw, safeEnd - MIN_REGION_DELTA));
            this.channelData.sampleRegion.end = clamp01(Math.max(this.channelData.sampleRegion.start + MIN_REGION_DELTA, safeEnd));
            this.emitChange();
            this.scheduleAutoFit();
        });

        this.addListener(this.endSlider, 'input', () => {
            const sliderValue = this.parseRegionSliderValue(this.endSlider);
            if (sliderValue === null) return;
            const raw = sliderValue / 100;
            const safeStart = ensureFinite(this.channelData.sampleRegion?.start, 0);
            this.channelData.sampleRegion.end = clamp01(Math.max(raw, safeStart + MIN_REGION_DELTA));
            this.channelData.sampleRegion.start = clamp01(Math.min(this.channelData.sampleRegion.start, this.channelData.sampleRegion.end - MIN_REGION_DELTA));
            this.emitChange();
            this.scheduleAutoFit();
        });

        this.addListener(this.playbackRateSlider, 'input', () => {
            const value = Math.round(parseInt(this.playbackRateSlider.value, 10)) / 100;
            this.channelData.samplePlaybackRate = clamp(ensureFinite(value, 1), 0.25, 4);
            this.emitChange();
        });

        this.addListener(this.fadeInSlider, 'input', () => {
            const value = parseInt(this.fadeInSlider.value, 10) / 1000;
            this.channelData.sampleFadeIn = Math.max(0, ensureFinite(value, samplerChannelDefaults.fadeIn));
            this.emitChange();
        });

        this.addListener(this.fadeOutSlider, 'input', () => {
            const value = parseInt(this.fadeOutSlider.value, 10) / 1000;
            this.channelData.sampleFadeOut = Math.max(0, ensureFinite(value, samplerChannelDefaults.fadeOut));
            this.emitChange();
        });

        this.addListener(this.previewBtn, 'click', () => {
            const Tone = runtimeState.Tone;
            if (!Tone) return;
            const startAt = Tone.now() + 0.02;
            playSamplerChannel(startAt, this.channelData);
        });

        this.addListener(this.resetBtn, 'click', () => {
            this.channelData.sampleRegion.start = samplerChannelDefaults.regionStart;
            this.channelData.sampleRegion.end = samplerChannelDefaults.regionEnd;
            this.channelData.samplePlaybackRate = samplerChannelDefaults.playbackRate;
            this.channelData.sampleFadeIn = samplerChannelDefaults.fadeIn;
            this.channelData.sampleFadeOut = samplerChannelDefaults.fadeOut;
            this.channelData.sampleFadeInShape = samplerChannelDefaults.fadeInShape;
            this.channelData.sampleFadeOutShape = samplerChannelDefaults.fadeOutShape;
            this.emitChange();
            this.setViewWindow(0, 1);
        });

        this.addListener(this.canvas, 'pointerdown', this.handleCanvasPointerDown);
        this.addListener(this.canvas, 'pointermove', this.handleCanvasPointerMove);
        this.addListener(this.canvas, 'pointerup', this.handleCanvasPointerUp);
        this.addListener(this.canvas, 'pointercancel', this.handleCanvasPointerCancel);
        this.addListener(this.canvas, 'pointerleave', this.handleCanvasPointerLeave);
    }

    addListener(target, type, handler, options) {
        target.addEventListener(type, handler, options);
        this.listeners.push({ target, type, handler, options });
    }

    handleBackdropClick(event) {
        if (event.target === this.container) {
            this.close();
        }
    }

    handleEscape(event) {
        if (event.key === 'Escape') {
            this.close();
        }
    }

    handleWindowResize() {
        this.canvasHeight = this.computeCanvasHeight();
        this.scheduleDraw(true);
    }

    computeCanvasHeight() {
        const viewportHeight = Math.max(window.innerHeight || 0, MIN_CANVAS_HEIGHT);
        const desired = Math.round(viewportHeight * 0.36);
        const normalized = clamp(desired || DEFAULT_CANVAS_HEIGHT, MIN_CANVAS_HEIGHT, MAX_CANVAS_HEIGHT);
        return normalized;
    }

    spanFromSliderValue(value) {
        const ratio = clamp(value / 100, 0, 1);
        const logRange = Math.log(MIN_VIEW_SPAN / MAX_VIEW_SPAN);
        return clamp(Math.exp(logRange * ratio) * MAX_VIEW_SPAN, MIN_VIEW_SPAN, MAX_VIEW_SPAN);
    }

    sliderValueFromSpan(span) {
        const clampedSpan = clamp(span, MIN_VIEW_SPAN, MAX_VIEW_SPAN);
        const logRange = Math.log(MIN_VIEW_SPAN / MAX_VIEW_SPAN);
        if (!Number.isFinite(logRange) || logRange === 0) return '0';
        const ratio = Math.log(clampedSpan / MAX_VIEW_SPAN) / logRange;
        return String(Math.round(clamp(ratio, 0, 1) * 100));
    }

    markManualZoom() {
        this.lastManualZoomAt = performance.now();
        this.cancelAutoFit();
    }

    cancelAutoFit() {
        if (this.pendingAutoFit) {
            clearTimeout(this.pendingAutoFit);
            this.pendingAutoFit = null;
        }
    }

    scheduleAutoFit() {
        this.cancelAutoFit();

        const regionStart = ensureFinite(this.channelData.sampleRegion?.start, 0);
        const regionEnd = ensureFinite(this.channelData.sampleRegion?.end, 1);
        const selectionWidth = Math.max(0, regionEnd - regionStart);

        if (selectionWidth >= 0.97) {
            this.setViewWindow(0, 1);
            return;
        }

        this.pendingAutoFit = setTimeout(() => {
            this.pendingAutoFit = null;
            if (performance.now() - this.lastManualZoomAt < AUTO_FIT_DELAY_MS * 0.6) return;
            this.fitSelection();
        }, AUTO_FIT_DELAY_MS);
    }

    setActiveFadeShape(kind, shapeId) {
        const buttons = this.fadeShapeButtons?.[kind];
        if (!Array.isArray(buttons)) return;
        const normalized = normalizeFadeShape(shapeId);
        buttons.forEach(button => {
            const isActive = button.dataset.shape === normalized;
            button.classList.toggle('is-active', isActive);
            button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
        });
    }

    setViewWindow(start, end, { userInitiated = false } = {}) {
        const proposedSpan = clamp(end - start, MIN_VIEW_SPAN, MAX_VIEW_SPAN);
        const halfSpan = proposedSpan / 2;
        const center = clamp(start + halfSpan, halfSpan, 1 - halfSpan);
        this.viewSpan = proposedSpan;
        this.viewCenter = center;
        this.viewportStart = clamp(this.viewCenter - halfSpan, 0, 1 - this.viewSpan);
        this.viewportEnd = clamp(this.viewCenter + halfSpan, this.viewSpan, 1);
        if (userInitiated) this.markManualZoom();
        this.updateZoomUI();
        this.scheduleDraw();
    }

    fitSelection({ userInitiated = false } = {}) {
        const selStartRaw = clamp01(ensureFinite(this.channelData.sampleRegion?.start, 0));
        const selEndRaw = clamp01(ensureFinite(this.channelData.sampleRegion?.end, 1));
        const selSpanRaw = Math.max(0, selEndRaw - selStartRaw);

        if (selSpanRaw >= 0.97) {
            this.setViewWindow(0, 1, { userInitiated });
            return;
        }

        const padding = clamp(selSpanRaw * 0.5, MIN_VIEW_PADDING, MAX_VIEW_PADDING);
        const start = clamp(selStartRaw - padding, 0, 1);
        const end = clamp(selEndRaw + padding, 0, 1);
        this.setViewWindow(start, Math.max(end, start + MIN_VIEW_SPAN), { userInitiated });
    }

    updateZoomUI() {
        if (!this.zoomSlider) return;
        this.zoomSlider.value = this.sliderValueFromSpan(this.viewSpan);

        const remaining = 1 - this.viewSpan;
        if (remaining <= 0.0001) {
            this.panSlider.disabled = true;
            this.panSlider.value = '0';
        } else {
            this.panSlider.disabled = false;
            const ratio = clamp(this.viewportStart / remaining, 0, 1);
            this.panSlider.value = String(Math.round(ratio * 100));
        }

        this.zoomOutBtn.disabled = Number(this.zoomSlider.value) <= 0;
        this.zoomInBtn.disabled = Number(this.zoomSlider.value) >= 100;

        const regionStart = ensureFinite(this.channelData.sampleRegion?.start, 0);
        const regionEnd = ensureFinite(this.channelData.sampleRegion?.end, 1);
        const regionSpan = Math.max(0, regionEnd - regionStart);
        this.fitSelectionBtn.disabled = regionSpan >= 0.97;
        this.fullViewBtn.disabled = this.viewSpan >= 0.995;

        this.refreshSliderConstraints();
    }

    refreshSliderConstraints() {
        const safeStart = ensureFinite(this.channelData.sampleRegion?.start, 0);
        const safeEnd = ensureFinite(this.channelData.sampleRegion?.end, 1);

        this.channelData.sampleRegion.start = clamp01(safeStart);
        this.channelData.sampleRegion.end = clamp01(Math.max(this.channelData.sampleRegion.start + MIN_REGION_DELTA, safeEnd));

        const currentStartPct = clamp(this.channelData.sampleRegion.start * 100, 0, 99.9);
        const currentEndPct = clamp(this.channelData.sampleRegion.end * 100, 0.1, 100);
        const approxFullView = this.viewSpan >= 0.985;

        const dynamicStepPercent = Math.min(0.5, Math.max(0.001, Number((this.viewSpan * 0.1).toFixed(4))));
        const sliderPrecision = dynamicStepPercent <= 0.002 ? 3 : dynamicStepPercent <= 0.01 ? 2 : 1;

        this.startSlider.step = dynamicStepPercent.toString();
        this.endSlider.step = dynamicStepPercent.toString();
        this.startSlider.dataset.precision = String(sliderPrecision);
        this.endSlider.dataset.precision = String(sliderPrecision);

        if (approxFullView) {
            this.startSlider.min = '0';
            this.startSlider.max = '99.9';
            this.endSlider.min = '0.1';
            this.endSlider.max = '100';
            return;
        }

        const viewStartPct = clamp(this.viewportStart * 100, 0, 100);
        const viewEndPct = clamp(this.viewportEnd * 100, 0, 100);

        const startCapMax = clamp(currentEndPct - MIN_REGION_DELTA_PERCENT, 0, 99.9);
        const endCapMin = clamp(currentStartPct + MIN_REGION_DELTA_PERCENT, 0.1, 99.9);

        const startMinCandidate = Math.min(viewStartPct, currentStartPct);
        const startMaxCandidate = Math.max(viewEndPct, currentStartPct);
        const endMinCandidate = Math.min(viewStartPct, currentEndPct);
        const endMaxCandidate = Math.max(viewEndPct, currentEndPct);

        const startMin = clamp(startMinCandidate, 0, startCapMax);
        let startMax = clamp(startMaxCandidate, startMin + dynamicStepPercent, startCapMax);
        if (startMax <= startMin) startMax = Math.min(startCapMax, startMin + dynamicStepPercent);

        let endMin = clamp(endMinCandidate, endCapMin, 100);
        if (endMin < endCapMin) endMin = endCapMin;
        let endMax = clamp(endMaxCandidate, endMin + dynamicStepPercent, 100);
        if (endMax <= endMin) endMax = Math.min(100, endMin + dynamicStepPercent);

        this.startSlider.min = startMin.toFixed(sliderPrecision + 1);
        this.startSlider.max = Math.max(startMin + dynamicStepPercent, startMax).toFixed(sliderPrecision + 1);
        this.endSlider.min = endMin.toFixed(sliderPrecision + 1);
        this.endSlider.max = Math.max(endMin + dynamicStepPercent, endMax).toFixed(sliderPrecision + 1);
    }

    parseRegionSliderValue(slider) {
        const numeric = parseFloat(slider.value);
        return Number.isFinite(numeric) ? numeric : null;
    }

    updateReadouts() {
        const safeStart = ensureFinite(this.channelData.sampleRegion?.start, 0);
        const safeEnd = ensureFinite(this.channelData.sampleRegion?.end, 1);
        this.channelData.sampleRegion.start = clamp01(safeStart);
        this.channelData.sampleRegion.end = clamp01(Math.max(this.channelData.sampleRegion.start + MIN_REGION_DELTA, safeEnd));

        const startPct = this.channelData.sampleRegion.start * 100;
        const endPct = this.channelData.sampleRegion.end * 100;

        const sliderPrecision = Number(this.startSlider.dataset.precision ?? 1);
        const displayPrecision = sliderPrecision > 2 ? 2 : sliderPrecision;

        this.startSlider.value = startPct.toFixed(sliderPrecision);
        this.endSlider.value = endPct.toFixed(sliderPrecision);
        this.startValue.textContent = formatPercent(startPct, displayPrecision);
        this.endValue.textContent = formatPercent(endPct, displayPrecision);

        this.playbackRateSlider.value = Math.round((this.channelData.samplePlaybackRate ?? 1) * 100);
        this.playbackRateValue.textContent = `${(this.channelData.samplePlaybackRate ?? 1).toFixed(2)}×`;

        this.fadeInSlider.value = Math.round((this.channelData.sampleFadeIn ?? 0) * 1000);
        this.fadeOutSlider.value = Math.round((this.channelData.sampleFadeOut ?? 0) * 1000);
        this.fadeInValue.textContent = formatMs(this.channelData.sampleFadeIn ?? 0);
        this.fadeOutValue.textContent = formatMs(this.channelData.sampleFadeOut ?? 0);

        const startSeconds = this.channelData.sampleRegion.start * this.bufferDuration;
        const endSeconds = this.channelData.sampleRegion.end * this.bufferDuration;
        const lengthSeconds = Math.max(0, endSeconds - startSeconds);
        this.startInfo.textContent = `Start: ${formatTime(startSeconds)}`;
        this.endInfo.textContent = `End: ${formatTime(endSeconds)}`;
        this.lengthInfo.textContent = `Length: ${formatTime(lengthSeconds)}`;

        this.setActiveFadeShape('in', this.channelData.sampleFadeInShape);
        this.setActiveFadeShape('out', this.channelData.sampleFadeOutShape);
    }

    emitChange() {
        ensureSamplerChannelDefaults(this.channelData);
        this.updateZoomUI();
        this.updateReadouts();
        this.scheduleDraw();
        if (this.onStateChange) this.onStateChange();
        requestSchedulerResync();
    }

    scheduleDraw(immediate = false) {
        if (!this.canvas || !this.audioBuffer) return;

        if (immediate) {
            if (this.pendingDraw) {
                cancelAnimationFrame(this.pendingDraw);
                this.pendingDraw = 0;
            }
            this.performDraw();
            return;
        }

        if (this.pendingDraw) return;
        this.pendingDraw = requestAnimationFrame(() => {
            this.pendingDraw = 0;
            this.performDraw();
        });
    }

    performDraw() {
        if (!this.canvas || !this.audioBuffer) return;
        const width = Math.max(120, Math.round(this.canvas.clientWidth || this.canvas.offsetWidth || DEFAULT_CANVAS_HEIGHT));
        const height = this.canvasHeight;

        const selectionStart = clamp01(this.channelData.sampleRegion.start ?? 0);
        const selectionEnd = clamp01(this.channelData.sampleRegion.end ?? 1);
        const selectionDuration = Math.max(0, (selectionEnd - selectionStart) * this.bufferDuration);

        drawWaveform(this.canvas, this.audioBuffer, {
            width,
            height,
            waveColor: '#18ffb6',
            backgroundColor: '#0b0f12',
            axisColor: '#182026',
            selection: {
                start: this.channelData.sampleRegion.start,
                end: this.channelData.sampleRegion.end,
                color: 'rgba(24, 255, 182, 0.18)',
                borderColor: '#18ffb6',
                handleColor: '#18ffb6'
            },
            viewport: { start: this.viewportStart, end: this.viewportEnd },
            fade: {
                selectionDuration,
                in: {
                    duration: this.channelData.sampleFadeIn ?? 0,
                    shape: this.channelData.sampleFadeInShape
                },
                out: {
                    duration: this.channelData.sampleFadeOut ?? 0,
                    shape: this.channelData.sampleFadeOutShape
                }
            }
        });
    }

    normalizedFromClientX(clientX) {
        const rect = this.canvas.getBoundingClientRect();
        const width = rect.width || this.canvas.clientWidth || 0;
        if (width <= 0 || !Number.isFinite(width)) return null;
        const ratio = clamp((clientX - rect.left) / width, 0, 1);
        return clamp01(this.viewportStart + ratio * this.viewSpan);
    }

    hitTestHandles(clientX) {
        const rect = this.canvas.getBoundingClientRect();
        const width = rect.width || this.canvas.clientWidth || 0;
        if (width <= 0 || this.viewSpan <= 0) return null;
        const localX = clamp(clientX - rect.left, 0, width);

        const startNorm = this.channelData.sampleRegion.start;
        const endNorm = this.channelData.sampleRegion.end;
        const startRatio = (startNorm - this.viewportStart) / this.viewSpan;
        const endRatio = (endNorm - this.viewportStart) / this.viewSpan;
        const startPx = startRatio * width;
        const endPx = endRatio * width;
        const startVisible = startRatio >= 0 && startRatio <= 1;
        const endVisible = endRatio >= 0 && endRatio <= 1;
        const startHit = startVisible && Math.abs(localX - startPx) <= HANDLE_HIT_MARGIN_PX;
        const endHit = endVisible && Math.abs(localX - endPx) <= HANDLE_HIT_MARGIN_PX;

        if (startHit && endHit) {
            return Math.abs(localX - startPx) <= Math.abs(localX - endPx) ? 'start' : 'end';
        }
        if (startHit) return 'start';
        if (endHit) return 'end';

        const regionSpan = Math.max(0, endNorm - startNorm);
        const overlapsViewport = startRatio < 1 && endRatio > 0;
        if (!overlapsViewport || regionSpan <= MIN_REGION_DELTA * 1.5) return null;
        const pointerInside = localX > startPx + REGION_GRAB_PADDING_PX && localX < endPx - REGION_GRAB_PADDING_PX;
        return pointerInside ? 'region' : null;
    }

    setCanvasCursor(mode) {
        if (mode === 'region') {
            this.canvas.style.cursor = this.dragState.mode ? 'grabbing' : 'grab';
        } else if (mode === 'start' || mode === 'end') {
            this.canvas.style.cursor = 'col-resize';
        } else if (!this.dragState.mode) {
            this.canvas.style.cursor = '';
        }
    }

    updateHoverCursor(event) {
        if (this.dragState.mode) return;
        const hit = this.hitTestHandles(event.clientX);
        this.setCanvasCursor(hit);
    }

    handleCanvasPointerDown(event) {
        if (event.button !== 0 && event.pointerType !== 'touch') return;
        const hit = this.hitTestHandles(event.clientX);
        if (!hit) return;
        event.preventDefault();
        const normalized = this.normalizedFromClientX(event.clientX);
        this.dragState.mode = hit;
        this.dragState.pointerId = event.pointerId;
        this.dragState.regionSpan = Math.max(
            MIN_REGION_DELTA,
            ensureFinite(this.channelData.sampleRegion?.end, 1) - ensureFinite(this.channelData.sampleRegion?.start, 0)
        );
        this.dragState.grabOffset = hit === 'region' && normalized !== null
            ? normalized - this.channelData.sampleRegion.start
            : 0;
        try {
            this.canvas.setPointerCapture(event.pointerId);
        } catch (error) {
            /* ignore capture failures */
        }
        this.canvas.style.cursor = hit === 'region' ? 'grabbing' : 'col-resize';
    }

    handleCanvasPointerMove(event) {
        if (!this.dragState.mode) {
            this.updateHoverCursor(event);
            return;
        }

        event.preventDefault();
        const normalized = this.normalizedFromClientX(event.clientX);
        if (normalized === null) return;

        let regionChanged = false;

        if (this.dragState.mode === 'start') {
            const maxStart = this.channelData.sampleRegion.end - MIN_REGION_DELTA;
            const updated = clamp01(Math.min(normalized, maxStart));
            regionChanged = this.applyRegionUpdate(updated, this.channelData.sampleRegion.end);
        } else if (this.dragState.mode === 'end') {
            const minEnd = this.channelData.sampleRegion.start + MIN_REGION_DELTA;
            const updated = clamp01(Math.max(normalized, minEnd));
            regionChanged = this.applyRegionUpdate(this.channelData.sampleRegion.start, updated);
        } else if (this.dragState.mode === 'region') {
            const span = Math.max(MIN_REGION_DELTA, this.dragState.regionSpan ?? (this.channelData.sampleRegion.end - this.channelData.sampleRegion.start));
            let nextStart = normalized - this.dragState.grabOffset;
            nextStart = clamp(nextStart, 0, 1 - span);
            const nextEnd = nextStart + span;
            regionChanged = this.applyRegionUpdate(nextStart, nextEnd);
            this.canvas.style.cursor = 'grabbing';
        }

        if (regionChanged) {
            this.emitChange();
        }
    }

    handleCanvasPointerUp(event) {
        this.finalizeDrag(event);
    }

    handleCanvasPointerCancel(event) {
        this.finalizeDrag(event);
    }

    handleCanvasPointerLeave(event) {
        if (!this.dragState.mode) {
            this.canvas.style.cursor = '';
        } else {
            this.finalizeDrag(event);
        }
    }

    finalizeDrag(event) {
        if (!this.dragState.mode) {
            if (!event || typeof event.clientX !== 'number') this.canvas.style.cursor = '';
            return;
        }

        const pointerId = this.dragState.pointerId;
        this.dragState.mode = null;
        this.dragState.pointerId = null;
        this.dragState.grabOffset = 0;
        this.dragState.regionSpan = null;

        if (typeof pointerId === 'number') {
            try {
                this.canvas.releasePointerCapture(pointerId);
            } catch (error) {
                /* ignore */
            }
        }

        if (event && typeof event.clientX === 'number') {
            this.updateHoverCursor(event);
        } else {
            this.canvas.style.cursor = '';
        }

        this.scheduleAutoFit();
    }

    applyRegionUpdate(nextStart, nextEnd) {
        const safeStart = clamp01(Number.isFinite(nextStart) ? nextStart : this.channelData.sampleRegion.start);
        const safeEndRaw = clamp01(Number.isFinite(nextEnd) ? nextEnd : this.channelData.sampleRegion.end);
        const clampedStart = clamp01(Math.min(safeStart, safeEndRaw - MIN_REGION_DELTA));
        const clampedEnd = clamp01(Math.max(clampedStart + MIN_REGION_DELTA, safeEndRaw));
        const deltaStart = Math.abs(clampedStart - this.channelData.sampleRegion.start);
        const deltaEnd = Math.abs(clampedEnd - this.channelData.sampleRegion.end);
        if (deltaStart < 1e-6 && deltaEnd < 1e-6) return false;
        this.channelData.sampleRegion.start = clampedStart;
        this.channelData.sampleRegion.end = clampedEnd;
        return true;
    }
}
