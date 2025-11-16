import { runtimeState } from './sequencer-state.js';
import { createReverbPlugin, applyReverbSettings } from './plugins/reverb-plugin.js';
import { createDelayPlugin, applyDelaySettings } from './plugins/delay-plugin.js';
import { normalizeInsertQuality, REVERB_QUALITY_PROFILES, DELAY_QUALITY_PROFILES } from './plugins/insert-quality.js';

const AUX_PLUGIN_DEFS = {
    reverb: {
        create: createReverbPlugin,
        apply: applyReverbSettings,
        profiles: REVERB_QUALITY_PROFILES
    },
    delay: {
        create: createDelayPlugin,
        apply: applyDelaySettings,
        profiles: DELAY_QUALITY_PROFILES
    }
};

function getDestinationNode(Tone) {
    if (!Tone) return null;
    if (typeof Tone.getDestination === 'function') return Tone.getDestination();
    return Tone.Destination ?? null;
}

export function ensureAuxBus(pluginId, quality = 'normal') {
    const Tone = runtimeState.Tone;
    if (!Tone) return null;
    const normalizedQuality = normalizeInsertQuality(quality);
    const key = `${pluginId}:${normalizedQuality}`;
    let busRegistry = runtimeState.auxBuses;
    if (!busRegistry) {
        busRegistry = new Map();
        runtimeState.auxBuses = busRegistry;
    }
    if (busRegistry.has(key)) {
        return busRegistry.get(key);
    }
    const def = AUX_PLUGIN_DEFS[pluginId];
    if (!def) return null;
    const input = new Tone.Gain(1);
    const effect = def.create(Tone);
    const output = new Tone.Gain(1);
    input.connect(effect);
    effect.connect(output);
    const destination = getDestinationNode(Tone);
    if (destination) output.connect(destination);
    const profile = def.profiles?.[normalizedQuality];
    if (profile) {
        def.apply(effect, { ...profile, enabled: true });
    }
    const bus = { key, pluginId, quality: normalizedQuality, input, effect, output };
    busRegistry.set(key, bus);
    return bus;
}

export function disposeAuxBuses() {
    const busRegistry = runtimeState.auxBuses;
    if (!busRegistry) return;
    busRegistry.forEach(bus => {
        try { bus.input.disconnect(); } catch { /* ignore */ }
        try { bus.output.disconnect(); } catch { /* ignore */ }
        try { bus.input.dispose?.(); } catch { /* ignore */ }
        try { bus.effect.dispose?.(); } catch { /* ignore */ }
        try { bus.output.dispose?.(); } catch { /* ignore */ }
    });
    busRegistry.clear();
}
