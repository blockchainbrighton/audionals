import { runtimeState, ensureChannelInsertSettings } from '../sequencer-state.js';
import { ensureChannelGain } from '../sequencer-channel-mixer.js';
import { createEqPlugin, applyEqSettings } from './eq-plugin.js';
import { createCompressorPlugin, applyCompressorSettings } from './compressor-plugin.js';
import { createGatePlugin, applyGateSettings } from './gate-plugin.js';
import { createReverbPlugin, applyReverbSettings } from './reverb-plugin.js';
import { createDelayPlugin, applyDelaySettings } from './delay-plugin.js';
import { createChorusPlugin, applyChorusSettings } from './chorus-plugin.js';
import { createPhaserPlugin, applyPhaserSettings } from './phaser-plugin.js';
import { createBitcrusherPlugin, applyBitcrusherSettings } from './bitcrusher-plugin.js';

const PLUGIN_ORDER = ['eq', 'compressor', 'gate', 'bitcrusher', 'chorus', 'phaser', 'delay', 'reverb'];

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
        this._hasAppliedInitialState = false;
        this.updateRouting();
    }

    ensurePluginNode(pluginId) {
        if (this.plugins[pluginId]) return this.plugins[pluginId];
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
        this.state[pluginId].enabled = !!enabled;
        if (enabled) {
            this.ensurePluginNode(pluginId);
            this.applyPluginParameters(pluginId);
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
        if (!node || typeof handler !== 'function') return;
        handler(node, state);
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
            if (!pluginState.enabled) return;
            const node = this.ensurePluginNode(id);
            if (!node) return;
            cursor.connect(node);
            cursor = node;
        });
        cursor.connect(this.output);
    }

    dispose() {
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
        chain._hasAppliedInitialState = false;
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
