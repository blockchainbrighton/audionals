import { loadToneJSAndBoot } from './toneLoader.js';

// DOM Elements
const canvas = document.getElementById('scope');
const ctx = canvas.getContext('2d');
const startBtn = document.getElementById('startBtn');
const shapeSelect = document.getElementById('shapeSelect');
const loader = document.getElementById('loader');

// State
const state = {
    isPlaying: false,
    currentShape: 'circle',
    analyser: null,
    animationId: null,
    sequence: null
};

// Runtime state for Tone.js
const runtime = {};

// Initialize loader
loadToneJSAndBoot({
    setLoaderStatus: (msg, isError = false) => {
        loader.textContent = msg;
        loader.style.color = isError ? '#ff6b6b' : '#aaa';
    },
    runtimeState: runtime,
    boot: () => {
        startBtn.disabled = false;
    }
});

// Shape functions
const shapes = {
    circle: (t) => ({
        x: 0.5 + 0.4 * Math.cos(t),
        y: 0.5 + 0.4 * Math.sin(t)
    }),
    square: (t) => {
        const seg = Math.floor(t / (Math.PI / 2)) % 4;
        const phase = t % (Math.PI / 2) / (Math.PI / 2);
        switch(seg) {
            case 0: return { x: 0.1 + 0.8 * phase, y: 0.1 };
            case 1: return { x: 0.9, y: 0.1 + 0.8 * phase };
            case 2: return { x: 0.9 - 0.8 * phase, y: 0.9 };
            case 3: return { x: 0.1, y: 0.9 - 0.8 * phase };
        }
    },
    butterfly: (t) => {
        const scale = 0.4;
        const shift = 0.5;
        const cosT = Math.cos(t);
        const sinT = Math.sin(t);
        const r = Math.pow(Math.E, sinT) - 2 * cosT - Math.pow(sinT / 12, 5);
        return {
            x: shift + scale * r * sinT,
            y: shift + scale * r * cosT
        };
    }
};

// Draw function
function draw() {
    if (!state.analyser) return;
    
    // Get waveform data from Tone.js analyser
    const waveform = state.analyser.getValue();
    
    // Clear canvas
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw waveform
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#00ffcc';
    ctx.beginPath();
    
    const sliceWidth = canvas.width / waveform.length;
    let x = 0;
    
    for (let i = 0; i < waveform.length; i++) {
        const v = (waveform[i] + 1) / 2; // Normalize from [-1,1] to [0,1]
        const y = v * canvas.height;
        
        if (i === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
        
        x += sliceWidth;
    }
    
    ctx.stroke();
    
    // Draw shape overlay
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(255, 100, 100, 0.5)';
    ctx.beginPath();
    
    const points = 200;
    for (let i = 0; i <= points; i++) {
        const t = (i / points) * Math.PI * 2;
        const point = shapes[state.currentShape](t);
        const x = point.x * canvas.width;
        const y = point.y * canvas.height;
        
        if (i === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    }
    
    ctx.closePath();
    ctx.stroke();
    
    state.animationId = requestAnimationFrame(draw);
}

// Start audio
async function startAudio() {
    if (state.isPlaying) return;
    
    try {
        // Resume audio context
        await runtime.Tone.start();
        
        // Create synth
        const synth = new runtime.Tone.Synth().toDestination();
        
        // Create analyser
        state.analyser = new runtime.Tone.Analyser('waveform', 1024);
        synth.connect(state.analyser);
        
        // Create a simple melody
        const notes = ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5'];
        let index = 0;
        
        // Function to play next note
        const playNextNote = () => {
            if (!state.isPlaying) return;
            synth.triggerAttackRelease(notes[index], '8n');
            index = (index + 1) % notes.length;
            setTimeout(playNextNote, 500); // Play next note after 500ms
        };
        
        // Start playing
        state.isPlaying = true;
        playNextNote();
        
        // Start drawing
        draw();
        
        // Update UI
        startBtn.textContent = 'Playing...';
        startBtn.disabled = true;
        
    } catch (err) {
        console.error('Error starting audio:', err);
        loader.textContent = 'Audio error: ' + err.message;
        loader.style.color = '#ff6b6b';
    }
}

// Event listeners
startBtn.addEventListener('click', startAudio);

shapeSelect.addEventListener('change', (e) => {
    state.currentShape = e.target.value;
});

// Initial UI setup
startBtn.disabled = true;