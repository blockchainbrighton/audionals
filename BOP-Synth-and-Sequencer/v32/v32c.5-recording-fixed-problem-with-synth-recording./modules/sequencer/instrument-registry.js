import { SimpleSynthLogic } from '../simple-synth/simple-synth-logic.js';
import { registerSimpleSynthUI } from '../simple-synth/simple-synth-component.js';

export const INSTRUMENT_LIBRARY = [
    {
        id: 'simple',
        label: 'Simple Synth',
        description: 'Lightweight playable synth with recording support.',
        createLogic: Tone => new SimpleSynthLogic(Tone),
        ensureUI: () => registerSimpleSynthUI(),
        tagName: 'simple-synth-ui'
    }
];

export const DEFAULT_INSTRUMENT_TYPE = INSTRUMENT_LIBRARY[0].id;

export function getInstrumentDefinition(type = DEFAULT_INSTRUMENT_TYPE) {
    return INSTRUMENT_LIBRARY.find(entry => entry.id === type) || INSTRUMENT_LIBRARY[0];
}

export function listInstrumentOptions() {
    return INSTRUMENT_LIBRARY.map(({ id, label }) => ({ id, label }));
}
