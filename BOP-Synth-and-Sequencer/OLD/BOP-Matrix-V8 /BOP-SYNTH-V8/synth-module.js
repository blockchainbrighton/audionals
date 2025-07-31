// synth-module.js
import EnhancedRecorder from './enhanced-recorder.js';
import SaveLoad from './save-load.js';
import EnhancedControls from './enhanced-controls.js';
import Keyboard from './keyboard.js';
import Transport from './transport.js';
import PianoRoll from './piano-roll.js';
import LoopUI from './loop-ui.js';

export const SynthModule = {
    mount(targetElement, initialState) {
        // Remove any children of targetElement first
        targetElement.innerHTML = '';

        // Move core synth UI elements into the container
        // You could also clone and append them if needed
        [
            document.getElementById('control-panel'),
            document.getElementById('transport-controls'),
            document.getElementById('loop-controls'),
            document.querySelector('.keyboard-container'),
            document.querySelector('.status-bar'),
            document.getElementById('midi')
        ].forEach(el => el && targetElement.appendChild(el));

        // Optionally: re-run any UI setup
        EnhancedControls.init();
        Keyboard.init();
        Transport.init();
        PianoRoll.init();
        LoopUI.init();

        // Restore state if provided
        if (initialState) this.loadState(initialState);
    },

    playSequence(time) {
        EnhancedRecorder.playSeq(time);
    },

    getState() {
        return SaveLoad.captureState();
    },

    loadState(obj) {
        SaveLoad.loadState(obj);
    }
};

export default SynthModule;
