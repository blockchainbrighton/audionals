// modules/effects.js
export const Effects = {
    get dom() {
        const p = document.getElementById('control-panel');
        return {
            waveform: p.querySelector('#waveform'),
            detune:   p.querySelector('#detune'),
            detuneVal: p.querySelector('#detuneVal'),
            filterType: p.querySelector('#filterType'),
            filterFreq: p.querySelector('#filterFreq'),
            filterFreqVal: p.querySelector('#filterFreqVal'),
            filterQ:   p.querySelector('#filterQ'),
            filterQVal: p.querySelector('#filterQVal'),
            reverb:    p.querySelector('#reverb'),
            reverbVal: p.querySelector('#reverbVal'),
            delay:     p.querySelector('#delay'),
            delayVal:  p.querySelector('#delayVal'),
            bpm:       p.querySelector('#bpm'),
        };
    },
    setOscillator() {
        if (!window.synthApp?.synth) return;
        this.dom.waveform && window.synthApp.synth.set({ oscillator: { type: this.dom.waveform.value } });
    },
    setDetune() {
        if (!window.synthApp?.synth) return;
        let val = +this.dom.detune.value;
        this.dom.detuneVal.textContent = val;
        window.synthApp.synth.set({detune: val});
    },
    setFilter() {
        let filter = window.synthApp.filter;
        if (!filter) return;
        filter.type = this.dom.filterType.value;
        filter.frequency.value = +this.dom.filterFreq.value;
        this.dom.filterFreqVal.textContent = this.dom.filterFreq.value;
        filter.Q.value = +this.dom.filterQ.value;
        this.dom.filterQVal.textContent = this.dom.filterQ.value;
    },
    setReverb() {
        let reverb = window.synthApp.reverb;
        if (!reverb) return;
        let val = +this.dom.reverb.value/100;
        reverb.wet.value = val;
        this.dom.reverbVal.textContent = this.dom.reverb.value+"%";
    },
    setDelay() {
        let delay = window.synthApp.delay;
        if (!delay) return;
        let val = +this.dom.delay.value/100;
        delay.wet.value = val;
        this.dom.delayVal.textContent = this.dom.delay.value+"%";
    }
};
