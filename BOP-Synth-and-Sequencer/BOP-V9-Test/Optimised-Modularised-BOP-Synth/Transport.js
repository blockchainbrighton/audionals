// transport.js

import EnhancedRecorder from './EnhancedRecorder.js';

const Transport = {
    init() {
        console.log('Transport controls initializing...');

        const el = document.getElementById('transport-controls');
        if (!el) {
            console.error('[Transport] Container element #transport-controls not found.');
            return;
        }

        el.innerHTML = `
            <button id="recordBtn" class="transport-button"><span>●</span>Record</button>
            <button id="stopBtn" class="transport-button" disabled><span>■</span>Stop</button>
            <button id="playBtn" class="transport-button" disabled><span>▶</span>Play</button>
            <button id="clearBtn" class="transport-button"><span>🗑</span>Clear</button>
        `;

        // Wire up events to EnhancedRecorder module
        document.getElementById('recordBtn').onclick = EnhancedRecorder.onRecord;
        document.getElementById('stopBtn').onclick = EnhancedRecorder.onStop;
        document.getElementById('playBtn').onclick = EnhancedRecorder.onPlay;
        document.getElementById('clearBtn').onclick = EnhancedRecorder.onClear;

        // Store references for state updates back in the recorder module.
        // This preserves the original design where the recorder controls button states.
        EnhancedRecorder.buttons = {
            record: document.getElementById('recordBtn'),
            stop: document.getElementById('stopBtn'),
            play: document.getElementById('playBtn'),
            clear: document.getElementById('clearBtn'),
        };
    }
};

export default Transport;