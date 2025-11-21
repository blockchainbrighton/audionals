import { runtimeState } from './sequencer-state.js';

export function requestRecorderDensityReduction(logicOrInstrument, { maxEvents = 24 } = {}) {
    const logic = logicOrInstrument?.logic ? logicOrInstrument.logic : logicOrInstrument;
    const recorder = logic?.modules?.recorder;
    if (recorder?.reduceDensity) {
        return recorder.reduceDensity(maxEvents);
    }
    return false;
}

export function reduceAllInstrumentRecorders({ maxEvents = 24 } = {}) {
    if (!runtimeState.instrumentRack) return;
    Object.values(runtimeState.instrumentRack).forEach(instr => {
        requestRecorderDensityReduction(instr, { maxEvents });
    });
}
