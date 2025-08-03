// main.js
import { loadToneJSAndBoot } from './toneLoader.js';

// --- 1. State & DOM Elements ---
const state = {
    isPlaying: false,
    analyser: null,
    animationId: null,
    currentShape: 'circle', // default shape
    Tone: null // Will be populated by the loader
};

const canvas = document.getElementById('scope');
const ctx = canvas.getContext('2d');
const startBtn = document.getElementById('startBtn');
const shapeSelect = document.getElementById('shapeSelect');
const loaderDiv = document.getElementById('loader');

// --- 2. Drawing Functions ---
const drawFunctions = {
    circle: (data, time) => {
        const size = Math.min(canvas.width, canvas.height) * 0.8;
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;

        ctx.beginPath();
        for (let i = 0; i < data.length; i++) {
            const angle = (i / data.length) * Math.PI * 2;
            const amplitude = (data[i] + 1) / 2; // Map from [-1, 1] to [0, 1]
            const radius = (size / 2) * amplitude;
            const x = centerX + Math.cos(angle + time) * radius;
            const y = centerY + Math.sin(angle + time) * radius;

            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.stroke();
    },
    square: (data, time) => {
        const size = Math.min(canvas.width, canvas.height) * 0.8;
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const side = size / Math.sqrt(2);
        const offsetX = (canvas.width - side) / 2;
        const offsetY = (canvas.height - side) / 2;

        ctx.beginPath();
        for (let i = 0; i < data.length; i++) {
            const progress = i / data.length;
            let x, y;
            if (progress < 0.25) {
                // Top side
                x = offsetX + (progress / 0.25) * side;
                y = offsetY;
            } else if (progress < 0.5) {
                // Right side
                x = offsetX + side;
                y = offsetY + ((progress - 0.25) / 0.25) * side;
            } else if (progress < 0.75) {
                // Bottom side
                x = offsetX + side - ((progress - 0.5) / 0.25) * side;
                y = offsetY + side;
            } else {
                // Left side
                x = offsetX;
                y = offsetY + side - ((progress - 0.75) / 0.25) * side;
            }
            const amplitude = (data[i] + 1) / 2;
            const distX = x - centerX;
            const distY = y - centerY;
            const finalX = centerX + distX * (0.8 + 0.2 * amplitude);
            const finalY = centerY + distY * (0.8 + 0.2 * amplitude);

            if (i === 0) ctx.moveTo(finalX, finalY);
            else ctx.lineTo(finalX, finalY);
        }
        ctx.closePath();
        ctx.stroke();
    },
    butterfly: (data, time) => {
        const size = Math.min(canvas.width, canvas.height) * 0.4;
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;

        ctx.beginPath();
        for (let i = 0; i < data.length; i++) {
            const t = (i / data.length) * Math.PI * 24; // 12 "wings"
            // Butterfly parametric equations
            const scale = Math.pow(Math.E, Math.cos(t)) - 2 * Math.cos(4 * t) + Math.pow(Math.sin(t / 12), 5);
            let x = Math.sin(t) * scale;
            let y = Math.cos(t) * scale;

            // Use audio data to modulate the shape
            const amplitude = (data[i] + 1) / 2;
            x *= size * (0.5 + 0.5 * amplitude);
            y *= size * (0.5 + 0.5 * amplitude);

            x += centerX;
            y += centerY;

            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.stroke();
    }
};

// --- 3. Animation Loop ---
function animate() {
    if (!state.analyser || !state.isPlaying) return;

    const bufferLength = state.analyser.fftSize;
    const dataArray = new Float32Array(bufferLength);
    state.analyser.getFloatTimeDomainData(dataArray);

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Styling
    ctx.strokeStyle = `hsl(${(performance.now() / 50) % 360}, 100%, 70%)`;
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    const currentTime = performance.now() / 1000;
    const drawFunc = drawFunctions[state.currentShape] || drawFunctions.circle;
    drawFunc(dataArray, currentTime);

    state.animationId = requestAnimationFrame(animate);
}

// --- 4. Start/Stop Logic ---
async function startAudioAndDraw() {
    if (state.isPlaying) return;
    if (!state.Tone) {
        loaderDiv.textContent = 'Error: Tone.js not loaded.';
        return;
    }

    try {
        // Resume Audio Context
        if (state.Tone.context.state !== 'running') {
            await state.Tone.start();
            await state.Tone.context.resume();
        }

        // Create a simple sound source
        const oscillator = new state.Tone.Oscillator(220, "sine").start();
        const filter = new state.Tone.Filter(1500, "lowpass").toDestination();
        oscillator.connect(filter);

        // LFO modulate the filter frequency for movement
        const lfo = new state.Tone.LFO("4n", 500, 3000).start();
        lfo.connect(filter.frequency);

        // Create analyser
        state.analyser = state.Tone.context.createAnalyser();
        state.analyser.fftSize = 2048;
        filter.connect(state.analyser);

        state.isPlaying = true;
        startBtn.textContent = 'Stop Audio + Draw';
        animate();
    } catch (err) {
        console.error('Error starting audio:', err);
        loaderDiv.textContent = 'Failed to start audio.';
    }
}

function stopAudioAndDraw() {
    if (!state.isPlaying) return;

    // Stop Tone.js sources
    state.Tone.Transport.stop();
    state.Tone.Destination.mute = true;
    // Note: In a full app, you'd dispose of individual nodes.
    // For simplicity here, we just mute and stop the animation.

    state.isPlaying = false;
    if (state.animationId) {
        cancelAnimationFrame(state.animationId);
        state.animationId = null;
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    startBtn.textContent = 'Start Audio + Draw';
}

// --- 5. Event Listeners ---
startBtn.addEventListener('click', () => {
    if (state.isPlaying) {
        stopAudioAndDraw();
    } else {
        startAudioAndDraw();
    }
});

shapeSelect.addEventListener('change', () => {
    state.currentShape = shapeSelect.value;
});

// --- 6. Initialize Loader ---
loadToneJSAndBoot({
    setLoaderStatus: (message, isError = false) => {
        loaderDiv.textContent = message;
        loaderDiv.style.color = isError ? 'red' : '#aaa';
    },
    runtimeState: state, // Pass our state object to be populated
    boot: () => {
        // This is called after Tone.js is successfully loaded
        console.log('Tone.js is ready, demo can now be started.');
        loaderDiv.textContent = 'Audio engine ready. Click Start.';
    }
});