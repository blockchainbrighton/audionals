export class StepSequencer {
    constructor(containerId, options = {}) {
        this.container = document.getElementById(containerId);
        if (!this.container) throw new Error(`Container ${containerId} not found`);

        this.numSteps = options.numSteps || 16;
        this.steps = options.initialSteps || Array(this.numSteps).fill().map(() => ({
            active: false,
            note: 'C2',
            accent: false,
            slide: false
        }));
        
        this.onStepChange = options.onStepChange || ((stepIdx, data) => {});
        
        this.injectStyles();
        this.render();
    }

    injectStyles() {
        const id = 'bvst-sequencer-styles';
        if (document.getElementById(id)) return;
        const css = `
            .seq-grid { display: grid; grid-template-columns: repeat(16, 1fr); gap: 2px; margin-top: 10px; }
            .step-col { display: flex; flex-direction: column; align-items: center; gap: 4px; }
            .led { width: 8px; height: 8px; background: #400; border-radius: 50%; margin-bottom: 5px; border: 1px solid #000; box-shadow: inset 0 0 2px #000; }
            .led.active { background: #f00; box-shadow: 0 0 5px #f00; }
            .led.current { background: #ff0; box-shadow: 0 0 8px #ff0; }
            
            .seq-btn {
                width: 100%; height: 20px; border: 1px solid #444; background: #222;
                cursor: pointer; font-size: 0.6rem; display: flex; justify-content: center; align-items: center; color: #888;
                user-select: none;
            }
            .seq-btn:hover { border-color: #666; }
            .seq-btn.active { background: #666; color: #fff; border-color: #888; }
            
            /* Accent & Slide Colors */
            .seq-btn.accent.active { background: #ff3333; color: #000; }
            .seq-btn.slide.active { background: #4a90e2; color: #000; }
            
            .note-select {
                width: 100%; font-size: 0.6rem; background: #111; color: #ccc;
                border: 1px solid #333; -webkit-appearance: none; padding: 0; text-align: center; cursor: pointer;
            }
            .note-select:focus { border-color: #666; outline: none; }
        `;
        const style = document.createElement('style');
        style.id = id;
        style.textContent = css;
        document.head.appendChild(style);
    }

    render() {
        this.container.innerHTML = '';
        this.container.classList.add('seq-grid');
        
        // Handle grid columns based on numSteps (responsive-ish)
        this.container.style.gridTemplateColumns = `repeat(${this.numSteps}, 1fr)`;

        for (let i = 0; i < this.numSteps; i++) {
            const col = document.createElement('div');
            col.className = 'step-col';
            
            // LED
            const led = document.createElement('div');
            led.className = 'led';
            led.id = `led-${i}`;
            col.appendChild(led);

            // Active Button
            const btnActive = document.createElement('div');
            btnActive.className = `seq-btn ${this.steps[i].active ? 'active' : ''}`;
            btnActive.innerText = 'ON';
            btnActive.onclick = () => this.toggleParam(i, 'active', btnActive);
            col.appendChild(btnActive);

            // Note Select
            const noteSel = document.createElement('select');
            noteSel.className = 'note-select';
            this.populateNotes(noteSel, this.steps[i].note);
            noteSel.onchange = (e) => this.updateNote(i, e.target.value);
            col.appendChild(noteSel);

            // Accent
            const btnAcc = document.createElement('div');
            btnAcc.className = `seq-btn accent ${this.steps[i].accent ? 'active' : ''}`;
            btnAcc.innerText = 'AC';
            btnAcc.onclick = () => this.toggleParam(i, 'accent', btnAcc);
            col.appendChild(btnAcc);

            // Slide
            const btnSlide = document.createElement('div');
            btnSlide.className = `seq-btn slide ${this.steps[i].slide ? 'active' : ''}`;
            btnSlide.innerText = 'SL';
            btnSlide.onclick = () => this.toggleParam(i, 'slide', btnSlide);
            col.appendChild(btnSlide);

            this.container.appendChild(col);
        }
    }

    populateNotes(select, current) {
        const notes = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
        [1, 2, 3].forEach(oct => {
            notes.forEach(n => {
                const val = n + oct;
                const opt = document.createElement('option');
                opt.value = val;
                opt.text = val;
                if (val === current) opt.selected = true;
                select.appendChild(opt);
            });
        });
    }

    toggleParam(idx, param, el) {
        this.steps[idx][param] = !this.steps[idx][param];
        if (this.steps[idx][param]) el.classList.add('active');
        else el.classList.remove('active');
        this.onStepChange(idx, this.steps[idx]);
    }

    updateNote(idx, note) {
        this.steps[idx].note = note;
        this.onStepChange(idx, this.steps[idx]);
    }

    highlightStep(idx) {
        // Clear previous
        const prev = (idx === 0) ? this.numSteps - 1 : idx - 1;
        // In case of jump or reset, ideally clear all 'current' first or track last
        const current = this.container.querySelector('.led.current');
        if(current) current.classList.remove('current');
        
        // Set new
        const led = this.container.querySelector(`#led-${idx}`);
        if(led) led.classList.add('current');
    }
    
    getStep(idx) {
        return this.steps[idx];
    }
    
    setSequence(newSteps) {
        // Merge ensuring length match
        newSteps.forEach((s, i) => {
            if (i < this.numSteps) this.steps[i] = { ...this.steps[i], ...s };
        });
        this.render();
    }
}