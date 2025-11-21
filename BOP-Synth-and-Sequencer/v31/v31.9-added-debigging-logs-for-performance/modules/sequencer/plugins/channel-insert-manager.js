import { runtimeState, ensureChannelInsertSettings, getCurrentSequence } from '../sequencer-state.js';
import { ensureChannelGain } from '../sequencer-channel-mixer.js';
import { createEqPlugin, applyEqSettings } from './eq-plugin.js';
import { createCompressorPlugin, applyCompressorSettings } from './compressor-plugin.js';
import { createGatePlugin, applyGateSettings } from './gate-plugin.js';
import { createReverbPlugin, applyReverbSettings } from './reverb-plugin.js';
import { createDelayPlugin, applyDelaySettings } from './delay-plugin.js';
import { createChorusPlugin, applyChorusSettings } from './chorus-plugin.js';
import { createPhaserPlugin, applyPhaserSettings } from './phaser-plugin.js';
import { createBitcrusherPlugin, applyBitcrusherSettings } from './bitcrusher-plugin.js';
import { ensureAuxBus } from '../sequencer-aux-bus.js';
import { normalizeInsertQuality } from './insert-quality.js';

const PLUGIN_ORDER = ['eq', 'compressor', 'gate', 'bitcrusher', 'chorus', 'phaser', 'delay', 'reverb'];
const INSERT_CHAIN_IDLE_TIMEOUT_MS = 45000;
const SEND_PLUGIN_IDS = new Set(['delay', 'reverb']);

const CREATE_HANDLERS = {
    eq: createEqPlugin,
    compressor: createCompressorPlugin,
    gate: createGatePlugin,
    bitcrusher: createBitcrusherPlugin,
    chorus: createChorusPlugin,
    phaser: createPhaserPlugin,
    delay: createDelayPlugin,
    reverb: createReverbPlugin
};

const APPLY_HANDLERS = {
    eq: applyEqSettings,
    compressor: applyCompressorSettings,
    gate: applyGateSettings,
    bitcrusher: applyBitcrusherSettings,
    chorus: applyChorusSettings,
    phaser: applyPhaserSettings,
    delay: applyDelaySettings,
    reverb: applyReverbSettings
};

class ChannelInsertChain {
    constructor(Tone) {
        this.Tone = Tone;
        this.input = new Tone.Gain(1);
        this.output = new Tone.Gain(1);
        this.plugins = {};
        this.state = {};
        this.destination = null;
        this.sources = new Set();
        this.lastActivityAt = Date.now();
        this._hasAppliedInitialState = false;
        this._isSuspended = false;
        this._routingScheduled = false;
        this._routingScheduleHandle = null;
        this._routingScheduleType = null;
        this.updateRouting({ immediate: true });
    }

    ensurePluginNode(pluginId) {
        if (this.plugins[pluginId]) return this.plugins[pluginId];
        if (SEND_PLUGIN_IDS.has(pluginId)) {
            const node = new this.Tone.Gain(1);
            node.__sendGain = new this.Tone.Gain(0);
            node.connect(node.__sendGain);
            this.plugins[pluginId] = node;
            return node;
        }
        const factory = CREATE_HANDLERS[pluginId];
        if (typeof factory !== 'function') return null;
        try {
            const node = factory(this.Tone);
            this.plugins[pluginId] = node || null;
            return this.plugins[pluginId];
        } catch (err) {
            console.warn(`[CHANNEL-INSERT] Failed to create plugin node for ${pluginId}:`, err);
            this.plugins[pluginId] = null;
            return null;
        }
    }

    disposePluginNode(pluginId) {
        const node = this.plugins[pluginId];
        if (!node) return;
        if (node.__sendGain) {
            try { node.__sendGain.disconnect(); } catch { /* ignore */ }
            try { node.__sendGain.dispose?.(); } catch { /* ignore */ }
        }
        if (typeof node.stop === 'function') {
            try { node.stop(); } catch (err) { /* ignore */ }
        }
        try { node.disconnect(); } catch (err) { /* ignore */ }
        try { node.dispose?.(); } catch (err) { /* ignore */ }
        delete this.plugins[pluginId];
    }

    setDestination(node) {
        if (this.destination === node) return;
        try { this.output.disconnect(); } catch (err) { /* ignore disconnect issues */ }
        this.destination = node || null;
        if (node) {
            this.output.connect(node);
        }
    }

    clearSources() {
        this.sources.forEach(source => {
            try {
                source.disconnect(this.input);
            } catch (err) { /* ignore */ }
        });
        this.sources.clear();
        this.setSuspended(true);
        this.lastActivityAt = Date.now();
    }

    attachSource(source) {
        if (!source || typeof source.connect !== 'function') return;
        if (this.sources.has(source)) return;
        this.sources.add(source);
        source.connect(this.input);
        this.setSuspended(false);
        this.lastActivityAt = Date.now();
    }

    detachSource(source) {
        if (!source || !this.sources.has(source)) return;
        try {
            source.disconnect(this.input);
        } catch (err) { /* ignore */ }
        this.sources.delete(source);
        if (!this.sources.size) {
            this.setSuspended(true);
            this.lastActivityAt = Date.now();
        }
    }

    applyState(state) {
        if (!state) return;
        PLUGIN_ORDER.forEach(id => {
            this.state[id] = { ...(state?.[id] || {}) };
            if (this.state[id].enabled) {
                this.ensurePluginNode(id);
            }
        });
        this.applyAllParameters(true);
        this.updateRouting();
        this._hasAppliedInitialState = true;
    }

    setPluginEnabled(pluginId, enabled) {
        if (!this.state[pluginId]) this.state[pluginId] = {};
        const nextEnabled = !!enabled;
        if (this.state[pluginId].enabled === nextEnabled && this.plugins[pluginId]) {
            return;
        }
        this.state[pluginId].enabled = nextEnabled;
        if (enabled) {
            this.ensurePluginNode(pluginId);
            this.applyPluginParameters(pluginId);
        } else {
            this.disposePluginNode(pluginId);
        }
        this.updateRouting();
    }

    setParameter(pluginId, param, value) {
        if (!this.state[pluginId]) this.state[pluginId] = {};
        this.state[pluginId][param] = value;
        this.applyPluginParameters(pluginId);
    }

    applyAllParameters(includeDisabled = false) {
        PLUGIN_ORDER.forEach(id => this.applyPluginParameters(id, includeDisabled));
    }

    applyPluginParameters(pluginId, includeDisabled = false) {
        const state = this.state[pluginId] || {};
        if (!state.enabled && !includeDisabled) return;
        const node = this.plugins[pluginId] || (state.enabled ? this.ensurePluginNode(pluginId) : null);
        const handler = APPLY_HANDLERS[pluginId];
        if (!node) return;
        if (SEND_PLUGIN_IDS.has(pluginId)) {
            this.applySendPluginParameters(pluginId, node, state);
            return;
        }
        if (typeof handler !== 'function') return;
        handler(node, state);
    }

    applySendPluginParameters(pluginId, node, state = {}) {
        if (!node.__sendGain) return;
        const quality = normalizeInsertQuality(state.quality);
        const bus = ensureAuxBus(pluginId, quality);
        if (bus && node.__connectedBusKey !== bus.key) {
            try { node.__sendGain.disconnect(); } catch { /* ignore */ }
            node.__sendGain.connect(bus.input);
            node.__connectedBusKey = bus.key;
        }
        const sendLevel = Math.min(1, Math.max(0, typeof state.wet === 'number' ? state.wet : 0));
        node.__sendGain.gain.value = sendLevel;
        state.quality = quality;
    }

    updateRouting({ immediate = false } = {}) {
        const applyNow = () => {
            this._routingScheduled = false;
            this._routingScheduleHandle = null;
            this._routingScheduleType = null;
            this._applyRoutingGraph();
        };
        if (immediate) {
            if (this._routingScheduleHandle !== null) {
                if (this._routingScheduleType === 'raf' && typeof cancelAnimationFrame === 'function') {
                    cancelAnimationFrame(this._routingScheduleHandle);
                } else if (this._routingScheduleType === 'timeout') {
                    clearTimeout(this._routingScheduleHandle);
                }
                this._routingScheduleHandle = null;
                this._routingScheduleType = null;
                this._routingScheduled = false;
            }
            applyNow();
            return;
        }
        if (this._routingScheduled) return;
        const raf = typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function'
            ? window.requestAnimationFrame.bind(window)
            : (typeof globalThis.requestAnimationFrame === 'function'
                ? globalThis.requestAnimationFrame.bind(globalThis)
                : null);
        if (raf) {
            this._routingScheduled = true;
            this._routingScheduleType = 'raf';
            this._routingScheduleHandle = raf(applyNow);
        } else {
            this._routingScheduled = true;
            this._routingScheduleType = 'timeout';
            this._routingScheduleHandle = setTimeout(applyNow, 0);
        }
    }

    _applyRoutingGraph() {
        try { this.input.disconnect(); } catch (err) { /* ignore */ }
        PLUGIN_ORDER.forEach(id => {
            const node = this.plugins[id];
            if (!node) return;
            try { node.disconnect(); } catch (err) { /* ignore */ }
        });

        let cursor = this.input;
        if (this._isSuspended) {
            cursor.connect(this.output);
            return;
        }
        PLUGIN_ORDER.forEach(id => {
            const pluginState = this.state[id] || {};
            if (!pluginState.enabled) return;
            const node = this.ensurePluginNode(id);
            if (!node) return;
            cursor.connect(node);
            cursor = node;
        });
        cursor.connect(this.output);
    }

    setSuspended(flag) {
        const next = !!flag;
        if (next === this._isSuspended) return;
        this._isSuspended = next;
        this.updateRouting({ immediate: true });
    }

    dispose() {
        if (this._routingScheduleHandle !== null) {
            if (this._routingScheduleType === 'raf' && typeof cancelAnimationFrame === 'function') {
                cancelAnimationFrame(this._routingScheduleHandle);
            } else if (this._routingScheduleType === 'timeout') {
                clearTimeout(this._routingScheduleHandle);
            }
            this._routingScheduleHandle = null;
            this._routingScheduleType = null;
            this._routingScheduled = false;
        }
        this.clearSources();
        try { this.input.dispose?.(); } catch (err) { /* ignore */ }
        try { this.output.dispose?.(); } catch (err) { /* ignore */ }
        PLUGIN_ORDER.forEach(id => this.disposePluginNode(id));
    }
}

function getChainMap() {
    return runtimeState.channelInsertChains;
}

function createChainForChannel(channel) {
    const Tone = runtimeState.Tone;
    if (!Tone) return null;
    const chain = new ChannelInsertChain(Tone);
    getChainMap().set(channel, chain);
    return chain;
}

function shouldSuspendChain(channel, chain) {
    if (!channel || !chain) return true;
    if (!chain.sources || chain.sources.size === 0) return true;
    if (channel.muted) return true;
    const vol = typeof channel.volume === 'number' ? channel.volume : 1;
    return vol <= 0;
}

function syncSuspensionState(channel, chain) {
    if (!chain) return;
    chain.setSuspended(shouldSuspendChain(channel, chain));
}

export function ensureChannelInsertChain(channel) {
    if (!channel) return null;
    ensureChannelInsertSettings(channel);
    const chainMap = getChainMap();
    let chain = chainMap.get(channel);
    if (!chain) {
        chain = createChainForChannel(channel);
    }
    if (!chain) return null;

    const gainNode = ensureChannelGain(channel);
    chain.setDestination(gainNode);
    if (!chain._hasAppliedInitialState) {
        chain.applyState(channel.insertSettings);
    }
    syncSuspensionState(channel, chain);
    return chain;
}

export function attachSourceToChannelInserts(channel, sourceNode) {
    const chain = ensureChannelInsertChain(channel);
    if (!chain) return;
    chain.attachSource(sourceNode);
    syncSuspensionState(channel, chain);
}

export function resetChannelInsertSources(channel) {
    const chain = getChainMap().get(channel);
    if (!chain) return;
    chain.clearSources();
    syncSuspensionState(channel, chain);
}

export function setChannelInsertEnabled(channel, pluginId, enabled) {
    if (!channel) return;
    ensureChannelInsertSettings(channel);
    if (!channel.insertSettings[pluginId]) channel.insertSettings[pluginId] = {};
    channel.insertSettings[pluginId].enabled = !!enabled;
    const chain = ensureChannelInsertChain(channel);
    if (!chain) return;
    chain.setPluginEnabled(pluginId, enabled);
    syncSuspensionState(channel, chain);
}

export function setChannelInsertParameter(channel, pluginId, param, value) {
    if (!channel) return;
    ensureChannelInsertSettings(channel);
    if (!channel.insertSettings[pluginId]) channel.insertSettings[pluginId] = {};
    channel.insertSettings[pluginId][param] = value;
    const chain = ensureChannelInsertChain(channel);
    if (chain) {
        chain.setParameter(pluginId, param, value);
    }
}

export function applyChannelInsertState(channel) {
    const chain = ensureChannelInsertChain(channel);
    if (chain) {
        chain._hasAppliedInitialState = false;
        chain.applyState(channel.insertSettings);
        syncSuspensionState(channel, chain);
    }
}

export function disposeChannelInsertChain(channel) {
    const chainMap = getChainMap();
    const chain = chainMap.get(channel);
    if (!chain) return;
    chain.dispose();
    chainMap.delete(channel);
}

export function updateInsertSuspensionForChannel(channel) {
    const chain = getChainMap().get(channel);
    if (!chain) return;
    syncSuspensionState(channel, chain);
}

export function updateInsertSuspensionForSequence(sequence = getCurrentSequence()) {
    if (!sequence?.channels) return;
    sequence.channels.forEach(channel => updateInsertSuspensionForChannel(channel));
}

export function pruneIdleInsertChains({ idleMs = INSERT_CHAIN_IDLE_TIMEOUT_MS } = {}) {
    const chainMap = getChainMap();
    if (!chainMap?.size) return;
    const now = Date.now();
    chainMap.forEach((chain, channel) => {
        if (!chain) return;
        if (chain.sources && chain.sources.size > 0) return;
        const lastActivity = chain.lastActivityAt || 0;
        if (lastActivity && now - lastActivity < idleMs) return;
        chain.dispose();
        chainMap.delete(channel);
    });
}
