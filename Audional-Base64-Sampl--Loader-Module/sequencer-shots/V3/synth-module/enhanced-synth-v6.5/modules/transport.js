// modules/transport.js
import { EnhancedRecorder } from './enhanced-recorder.js';

export const Transport = {
    init() {
        console.log('Transport controls initializing...');

        const el = document.getElementById('transport-controls');
        el.innerHTML = `
            <button id="recordBtn" class="transport-button"><span>●</span>Record</button>
            <button id="stopBtn" class="transport-button" disabled><span>■</span>Stop</button>
            <button id="playBtn" class="transport-button" disabled><span>▶</span>Play</button>
            <button id="clearBtn" class="transport-button"><span>🗑</span>Clear</button>
        `;

        // Wire up events to EnhancedRecorder module
        document.getElementById('recordBtn').onclick = EnhancedRecorder.onRecord;
        document.getElementById('stopBtn').onclick   = EnhancedRecorder.onStop;
        document.getElementById('playBtn').onclick   = EnhancedRecorder.onPlay;
        document.getElementById('clearBtn').onclick  = EnhancedRecorder.onClear;

        // Store references for state updates
        EnhancedRecorder.buttons = {
            record: document.getElementById('recordBtn'),
            stop:   document.getElementById('stopBtn'),
            play:   document.getElementById('playBtn'),
            clear:  document.getElementById('clearBtn'),
        };
    }
};
