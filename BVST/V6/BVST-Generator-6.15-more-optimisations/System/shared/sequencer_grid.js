export class GridSequencer {
    constructor(containerId, options = {}) {
        this.container = document.getElementById(containerId);
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
        const id = 'bvst-grid-seq-styles';
        if (document.getElementById(id)) return;
        const css = `
            .bvst-grid-container { 
                display: grid; 
                grid-template-columns: 60px repeat(16, 1fr); 
                gap: 4px; 
                background: #222; 
                padding: 10px; 
                border-radius: 4px; 
                margin-top: 10px;
            }
            .bvst-row-label { 
                display: flex; 
                align-items: center; 
                font-size: 10px; 
                color: #888; 
                font-weight: bold; 
                font-family: monospace;
            }
            .bvst-step {
                background: #333; 
                border: 1px solid #444; 
                cursor: pointer;
                border-radius: 2px;
                min-height: 20px;
            }
            .bvst-step:hover { border-color: #666; }
            .bvst-step.active { background: #f90; border-color: #f90; box-shadow: 0 0 5px #f90; }
            .bvst-step.current { background: #fff; }
            .bvst-step.active.current { background: #ffc; }
            
            /* Custom Row Colors */
            .row-0 .bvst-step.active { background: #f44; border-color: #f44; box-shadow: 0 0 5px #f44; }
            .row-1 .bvst-step.active { background: #4f4; border-color: #4f4; box-shadow: 0 0 5px #4f4; }
            .row-2 .bvst-step.active { background: #4bf; border-color: #4bf; box-shadow: 0 0 5px #4bf; }
            .row-3 .bvst-step.active { background: #d4f; border-color: #d4f; box-shadow: 0 0 5px #d4f; }
        `;
        const style = document.createElement('style');
        style.id = id;
        style.textContent = css;
        document.head.appendChild(style);
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
}
