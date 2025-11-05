import { runtimeState, ensureChannelInsertSettings } from '../sequencer-state.js';
import { ensureChannelGain } from '../sequencer-channel-mixer.js';
import { createEqPlugin, applyEqSettings } from './eq-plugin.js';
import { createCompressorPlugin, applyCompressorSettings } from './compressor-plugin.js';
import { createGatePlugin, applyGateSettings } from './gate-plugin.js';

const PLUGIN_ORDER = ['eq', 'compressor', 'gate'];

const APPLY_HANDLERS = {
    eq: applyEqSettings,
    compressor: applyCompressorSettings,
    gate: applyGateSettings
};

class ChannelInsertChain {
    constructor(Tone) {
        this.Tone = Tone;
        this.input = new Tone.Gain(1);
        this.output = new Tone.Gain(1);
        this.plugins = {
            eq: createEqPlugin(Tone),
            compressor: createCompressorPlugin(Tone),
            gate: createGatePlugin(Tone)
        };
        this.state = {
            eq: {},
            compressor: {},
            gate: {}
        };
        this.destination = null;
        this.sources = new Set();
        this.updateRouting();
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
    }

    attachSource(source) {
        if (!source || typeof source.connect !== 'function') return;
        if (this.sources.has(source)) return;
        this.sources.add(source);
        source.connect(this.input);
    }

    detachSource(source) {
        if (!source || !this.sources.has(source)) return;
        try {
            source.disconnect(this.input);
        } catch (err) { /* ignore */ }
        this.sources.delete(source);
    }

    applyState(state) {
        if (!state) return;
        this.state = {
            eq: { ...(state.eq || {}) },
            compressor: { ...(state.compressor || {}) },
            gate: { ...(state.gate || {}) }
        };
        this.applyAllParameters();
        this.updateRouting();
    }

    setPluginEnabled(pluginId, enabled) {
        if (!this.state[pluginId]) this.state[pluginId] = {};
        this.state[pluginId].enabled = !!enabled;
        this.updateRouting();
    }

    setParameter(pluginId, param, value) {
        if (!this.state[pluginId]) this.state[pluginId] = {};
        this.state[pluginId][param] = value;
        this.applyPluginParameters(pluginId);
    }

    applyAllParameters() {
        PLUGIN_ORDER.forEach(id => this.applyPluginParameters(id));
    }

    applyPluginParameters(pluginId) {
        const node = this.plugins[pluginId];
        const handler = APPLY_HANDLERS[pluginId];
        if (!node || typeof handler !== 'function') return;
        handler(node, this.state[pluginId]);
    }

    updateRouting() {
        try { this.input.disconnect(); } catch (err) { /* ignore */ }
        PLUGIN_ORDER.forEach(id => {
            const node = this.plugins[id];
            if (!node) return;
            try { node.disconnect(); } catch (err) { /* ignore */ }
        });

        let cursor = this.input;
        PLUGIN_ORDER.forEach(id => {
            const pluginState = this.state[id] || {};
            const node = this.plugins[id];
            if (!node) return;
            if (pluginState.enabled) {
                cursor.connect(node);
                cursor = node;
            }
        });
        cursor.connect(this.output);
    }

    dispose() {
        this.clearSources();
        try { this.input.dispose?.(); } catch (err) { /* ignore */ }
        try { this.output.dispose?.(); } catch (err) { /* ignore */ }
        PLUGIN_ORDER.forEach(id => {
            const node = this.plugins[id];
            if (!node) return;
            try { node.dispose?.(); } catch (err) { /* ignore */ }
        });
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
    chain.applyState(channel.insertSettings);
    return chain;
}

export function attachSourceToChannelInserts(channel, sourceNode) {
    const chain = ensureChannelInsertChain(channel);
    if (!chain) return;
    chain.attachSource(sourceNode);
}

export function resetChannelInsertSources(channel) {
    const chain = getChainMap().get(channel);
    if (!chain) return;
    chain.clearSources();
}

export function setChannelInsertEnabled(channel, pluginId, enabled) {
    if (!channel) return;
    ensureChannelInsertSettings(channel);
    if (!channel.insertSettings[pluginId]) channel.insertSettings[pluginId] = {};
    channel.insertSettings[pluginId].enabled = !!enabled;
    const chain = ensureChannelInsertChain(channel);
    if (chain) {
        chain.setPluginEnabled(pluginId, enabled);
    }
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
        chain.applyState(channel.insertSettings);
    }
}

export function disposeChannelInsertChain(channel) {
    const chainMap = getChainMap();
    const chain = chainMap.get(channel);
    if (!chain) return;
    chain.dispose();
    chainMap.delete(channel);
}
