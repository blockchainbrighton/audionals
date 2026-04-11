import { injectSequencerStyles, injectGridSequencerStyles } from './ui_styles.js';

export class StepSequencer {
    constructor(containerId, options = {}) {
        this.container = typeof containerId === 'string' ? document.getElementById(containerId) : containerId;
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
        injectSequencerStyles();
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

    clear() {
        this.steps = Array(this.numSteps).fill().map(() => ({
            active: false,
            note: 'C2',
            accent: false,
            slide: false
        }));
        this.render();
        // Notify change for all steps? Or just rely on render. 
        // Logic (SequencerManager) pulls data from UI or pushes it?
        // SequencerManager.runStep calls ui.getStep(idx). So updating UI state is sufficient.
    }
}

export class GridSequencer {
    constructor(containerId, options = {}) {
        this.container = typeof containerId === 'string' ? document.getElementById(containerId) : containerId;
        if (!this.container) throw new Error(`Container ${containerId} not found`);

        this.numSteps = options.numSteps || 16;
        this.rows = options.rows || [
            { name: "KICK", note: 36, class: "row-0" },
            { name: "SNARE", note: 38, class: "row-1" },
            { name: "HAT", note: 42, class: "row-2" },
            { name: "CLAP", note: 39, class: "row-3" }
        ];
        
        // 2D Array [row][step] -> boolean
        this.gridData = options.initialData || 
            Array(this.rows.length).fill().map(() => Array(this.numSteps).fill(false));
            
        this.onStepChange = options.onStepChange || ((row, step, val) => {});
        
        this.injectStyles();
        this.render();
    }

    injectStyles() {
        injectGridSequencerStyles();
    }

    render() {
        this.container.innerHTML = '';
        this.container.className = 'bvst-grid-container';
        this.container.style.gridTemplateColumns = `60px repeat(${this.numSteps}, 1fr)`;

        this.rows.forEach((row, rIdx) => {
            const label = document.createElement('div');
            label.className = 'bvst-row-label';
            label.innerText = row.name;
            this.container.appendChild(label);
            
            for(let s=0; s<this.numSteps; s++) {
                const step = document.createElement('div');
                step.className = `bvst-step ${row.class || ''}`;
                step.id = `bvst-step-${rIdx}-${s}`;
                if (this.gridData[rIdx][s]) step.classList.add('active');
                
                step.onclick = () => this.toggleStep(rIdx, s);
                this.container.appendChild(step);
            }
        });
    }

    toggleStep(row, step) {
        this.gridData[row][step] = !this.gridData[row][step];
        const el = document.getElementById(`bvst-step-${row}-${step}`);
        if (this.gridData[row][step]) el.classList.add('active');
        else el.classList.remove('active');
        
        this.onStepChange(row, step, this.gridData[row][step]);
    }

    highlightStep(idx) {
        // Clear previous 'current'
        const prev = (idx === 0) ? this.numSteps - 1 : idx - 1;
        for(let r=0; r<this.rows.length; r++) {
            const el = document.getElementById(`bvst-step-${r}-${prev}`);
            if(el) el.classList.remove('current');
            
            // Just in case of sync drift, clear all? 
            // Optimally we just clear the one we set.
        }
        // Safety clear all 'current' if needed, but performance...
        this.container.querySelectorAll('.current').forEach(el => el.classList.remove('current'));

        // Set new
        for(let r=0; r<this.rows.length; r++) {
            const el = document.getElementById(`bvst-step-${r}-${idx}`);
            if(el) el.classList.add('current');
        }
    }
    
    getStepData(idx) {
        // Return array of active notes for this step
        const activeNotes = [];
        for(let r=0; r<this.rows.length; r++) {
            if (this.gridData[r][idx]) {
                activeNotes.push(this.rows[r].note);
            }
        }
        return activeNotes;
    }

    clear() {
        this.gridData = Array(this.rows.length).fill().map(() => Array(this.numSteps).fill(false));
        this.render();
    }
}