/**
 * @file transport.js
 * @description Creates the transport UI and connects it to the EnhancedRecorder module.
 */

import EnhancedRecorder from './EnhancedRecorder.js';

const Transport = {
    init() {
        console.log('Transport controls initializing...');

        const el = document.getElementById('transport-controls');
        if (!el) {
            console.error('[Transport] Container element #transport-controls not found.');
            return;
        }

        // Create the buttons in the DOM
        el.innerHTML = `
            <button id="recordBtn" class="transport-button record-btn"><span>●</span>Record</button>
            <button id="stopBtn" class="transport-button stop-btn" disabled><span>■</span>Stop</button>
            <button id="playBtn" class="transport-button play-btn" disabled><span>▶</span>Play</button>
            <button id="clearBtn" class="transport-button clear-btn"><span>🗑</span>Clear</button>
        `;

        // Get references to the newly created buttons
        const recordBtn = document.getElementById('recordBtn');
        const stopBtn = document.getElementById('stopBtn');
        const playBtn = document.getElementById('playBtn');
        const clearBtn = document.getElementById('clearBtn');
        
        // Wire up UI events to the recorder's handler methods
        recordBtn.onclick = () => EnhancedRecorder.onRecord();
        stopBtn.onclick = () => EnhancedRecorder.onStop();
        playBtn.onclick = () => EnhancedRecorder.onPlay();
        clearBtn.onclick = () => EnhancedRecorder.onClear();

        // **This is the crucial step**:
        // Give the button references to the EnhancedRecorder so it can manage their state.
        EnhancedRecorder.registerButtons({
            record: recordBtn,
            stop: stopBtn,
            play: playBtn,
            clear: clearBtn,
        });

        console.log('[Transport] Transport controls initialized and registered with recorder.');
    }
};

export default Transport;