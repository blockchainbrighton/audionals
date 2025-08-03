import { loadToneJSAndBoot } from './toneLoader.js';

// DOM Elements
const canvas = document.getElementById('scope');
const ctx = canvas.getContext('2d');
const startBtn = document.getElementById('startBtn');
const shapeSelect = document.getElementById('shapeSelect');
const loader = document.getElementById('loader');

// State
const runtimeState = {};
let isDrawing = false;
let currentShape = 'circle';
let analyser;

// Loader status updater
function setLoaderStatus(text, isError = false) {
    loader.textContent = text;
    loader.style.color = isError ? '#ff6b6b' : '#aaa';
}

// Shape functions
const shapes = {
    circle: (t) => ({
        x: 0.8 * Math.cos(t * 0.7),
        y: 0.8 * Math.sin(t * 0.7)
    }),
    square: (t) => {
        const seg = Math.floor(t / 2) % 4;
        const pos = (t / 2) % 1;
        switch(seg) {
            case 0: return { x: -0.8, y: -0.8 + pos * 1.6 };
            case 1: return { x: -0.8 + pos * 1.6, y: 0.8 };
            case 2: return { x: 0.8, y: 0.8 - pos * 1.6 };
            case 3: return { x: 0.8 - pos * 1.6, y: -0.8 };
        }
    },
    butterfly: (t) => {
        const scale = 0.2;
        const x = Math.sin(t) * (Math.exp(Math.cos(t)) - 2 * Math.cos(4 * t) - Math.pow(Math.sin(t / 12), 5));
        const y = Math.cos(t) * (Math.exp(Math.cos(t)) - 2 * Math.cos(4 * t) - Math.pow(Math.sin(t / 12), 5));
        return { x: x * scale, y: y * scale };
    }
};

// Drawing function
function draw() {
    if (!isDrawing) return;
    
    // Clear canvas
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Get time domain data
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyser.getByteTimeDomainData(dataArray);
    
    // Draw waveform
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#8e2de2';
    ctx.beginPath();
    
    const sliceWidth = canvas.width / bufferLength;
    let x = 0;
    
    for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = v * canvas.height / 2;
        
        if (i === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
        
        x += sliceWidth;
    }
    
    ctx.lineTo(canvas.width, canvas.height / 2);
    ctx.stroke();
    
    // Draw shape overlay
    ctx.strokeStyle = '#4a00e0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const scale = Math.min(canvas.width, canvas.height) / 2;
    
    for (let i = 0; i <= 1000; i++) {
        const t = i / 10;
        const point = shapes[currentShape](t);
        const x = centerX + point.x * scale;
        const y = centerY + point.y * scale;
        
        if (i === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    }
    
    ctx.closePath();
    ctx.stroke();
    
    requestAnimationFrame(draw);
}

// Boot function
function boot() {
    const Tone = runtimeState.Tone;
    
    // Create synth and effects
    const synth = new Tone.Synth({
        oscillator: { type: 'sine' }
    }).toDestination();
    
    // Create analyser
    analyser = new Tone.Analyser('waveform', 1024);
    synth.connect(analyser);
    
    // Setup controls
    startBtn.onclick = async () => {
        if (isDrawing) return;
        
        // Start audio context
        await Tone.start();
        setLoaderStatus('Audio started');
        
        // Play synth
        synth.triggerAttackRelease('C4', '8n');
        
        // Start drawing
        isDrawing = true;
        draw();
        
        startBtn.textContent = 'Playing...';
        startBtn.disabled = true;
    };
    
    shapeSelect.onchange = () => {
        currentShape = shapeSelect.value;
    };
    
    // Initial draw to show shape
    isDrawing = true;
    draw();
    isDrawing = false;
}

// Initialize
loadToneJSAndBoot({
    setLoaderStatus,
    runtimeState,
    boot
});