// audioContextManager.js
(function() {
    // Check if the AudioContextManager already exists
    if (window.AudioContextManager) return;

    class AudioContextManager {
        constructor() {
            if (!AudioContextManager.instance) {
                this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
                AudioContextManager.instance = this;
            }
            return AudioContextManager.instance;
        }

        getAudioContext() {
            return this.audioCtx;
        }

        async resume() {
            console.log(`[resume] [finalDebug] AudioContext State: ${this.audioCtx.state}`);
            if (this.audioCtx.state === "suspended") {
                await this.audioCtx.resume();
                console.log("AudioContext resumed");
            }
        }
    }

    // Create a global instance
    window.AudioContextManager = new AudioContextManager();
})();
