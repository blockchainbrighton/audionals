// modules/keyboard.js
import { Recorder } from './recorder.js';

export const Keyboard = {
    WHITE_NOTES: ['C','D','E','F','G','A','B'],
    BLACKS: { 0:'C#', 1:'D#', 3:'F#', 4:'G#', 5:'A#' },

    init() {
        this.keyboard = document.getElementById('keyboard');
        document.getElementById('octaveUp').onclick   = () => { if (synthApp.curOct<7) { synthApp.curOct++; document.getElementById('octaveLabel').textContent='Octave: '+synthApp.curOct; this.draw(); }};
        document.getElementById('octaveDown').onclick = () => { if (synthApp.curOct>0) { synthApp.curOct--; document.getElementById('octaveLabel').textContent='Octave: '+synthApp.curOct; this.draw(); }};
        this.draw();
    },
    draw() {
        this.keyboard.innerHTML = '';
        const kbWidth = this.keyboard.offsetWidth || 800;
        const whiteKeyW = 100 / Math.floor(kbWidth/38);
        const totalWhite = Math.floor(100 / whiteKeyW);

        let whiteIndex = 0;
        for (let i = 0; i < totalWhite; i++) {
            let wn = this.WHITE_NOTES[whiteIndex % 7];
            let octaveOffset = Math.floor((whiteIndex) / 7);
            let midi = Tone.Frequency(`${wn}${synthApp.curOct+octaveOffset}`).toMidi();
            let note = Tone.Frequency(midi, "midi").toNote();

            let wkey = document.createElement('div');
            wkey.className = 'key-white';
            wkey.dataset.note = note;
            wkey.style.left = (i * whiteKeyW) + '%';
            wkey.style.width = whiteKeyW + '%';
            wkey.tabIndex = 0;
            this.addKeyHandlers(wkey, note);

            if (wn === "C" || wn === "F") {
                let lbl = document.createElement('span');
                lbl.className = 'key-label';
                lbl.innerText = note;
                wkey.appendChild(lbl);
            }
            this.keyboard.appendChild(wkey);
            whiteIndex++;
        }
        // Black keys
        whiteIndex = 0;
        for (let i = 0; i < totalWhite; i++) {
            if (this.BLACKS.hasOwnProperty(whiteIndex%7)) {
                let wn = this.WHITE_NOTES[whiteIndex % 7];
                let octaveOffset = Math.floor((whiteIndex) / 7);
                let blackNote = this.BLACKS[whiteIndex%7] + (synthApp.curOct+octaveOffset);
                let midi = Tone.Frequency(blackNote).toMidi();
                let bkey = document.createElement('div');
                bkey.className = 'key-black';
                bkey.dataset.note = Tone.Frequency(midi, "midi").toNote();
                let leftPercent = (i + 0.7) * whiteKeyW - (whiteKeyW*0.28);
                bkey.style.left = leftPercent + '%';
                bkey.style.width = (whiteKeyW * 0.62) + '%';
                bkey.tabIndex = 0;
                this.addKeyHandlers(bkey, bkey.dataset.note);
                this.keyboard.appendChild(bkey);
            }
            whiteIndex++;
        }
    },
    addKeyHandlers(el, note) {
        el.onmousedown   = ()=>Recorder.playNote(note);
        el.onmouseup     = ()=>Recorder.releaseNote(note);
        el.onmouseleave  = ()=>Recorder.releaseNote(note);
        el.ontouchstart  = (e)=>{e.preventDefault(); Recorder.playNote(note);}
        el.ontouchend    = (e)=>{e.preventDefault(); Recorder.releaseNote(note);}
    },
    updateKeyVisual(note, on){
        this.keyboard.querySelectorAll('.key-white,.key-black').forEach(k=>{
            if(k.dataset.note===note) k.classList.toggle('active',!!on);
        });
    }
};