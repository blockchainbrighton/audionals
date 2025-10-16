/**
 * @file ChannelManager.js
 * @description Keeps a per‑channel snapshot of the synth state and swaps it in/out
 *              by delegating to the existing SaveLoad instance.
 */
export class ChannelManager {
    /**
     * @param {SaveLoad} saveLoad  – the already‑constructed SaveLoad singleton
     * @param {number}   maxChannels – how many channels/tracks you support
     */
    constructor(saveLoad, maxChannels = 8) {
        this.saveLoad     = saveLoad;
        this.maxChannels  = maxChannels;
        this.channelBank  = new Array(maxChannels).fill(null);  // each slot = saved state
        this.activeIndex  = 0;
    }

    /**
     * Persist the current channel’s patch and switch to a new one.
     * @param {number} index  – 0‑based channel index
     */
    switchTo(index) {
        if (index < 0 || index >= this.maxChannels) {
            console.warn(`[ChannelManager] Invalid channel ${index}`);
            return;
        }

        // 1️⃣ save current channel (deep‑cloned so later mutations don’t leak)
        this.channelBank[this.activeIndex] =
            structuredClone(this.saveLoad.getFullState());

        // 2️⃣ load the target channel, or reset if empty
        const targetState = this.channelBank[index];
        if (targetState) {
            this.saveLoad.loadState(targetState);
        } else {
            // OPTIONAL: supply a factory for a “blank” patch instead of do‑nothing
            console.info(`[ChannelManager] Channel ${index} is empty; keeping current patch as is.`);
        }

        this.activeIndex = index;
    }

    /**
     * Convenience: export everything for session persistence.
     */
    exportBank() {
        return JSON.stringify({
            channelBank: this.channelBank,
            activeIndex: this.activeIndex,
            version:     '1.0-channel-bank'
        });
    }

    /**
     * Convenience: restore a previously saved bank in one shot.
     * @param {string|object} jsonOrObj  – value returned by exportBank()
     */
    importBank(jsonOrObj) {
        const obj = typeof jsonOrObj === 'string' ? JSON.parse(jsonOrObj) : jsonOrObj;
        if (!Array.isArray(obj.channelBank) || obj.channelBank.length !== this.maxChannels) {
            throw new Error('[ChannelManager] Corrupt bank file');
        }
        this.channelBank = obj.channelBank;
        this.activeIndex = obj.activeIndex ?? 0;
        // Immediately load whichever channel was active when exported
        const state = this.channelBank[this.activeIndex];
        if (state) this.saveLoad.loadState(state);
    }
}
