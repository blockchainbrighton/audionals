// Main JavaScript for OB1 Website

// --- Configuration ---
const CONTENT_BASE_URL = 'https://ordinals.com/content/'; // *** UPDATED BASE URL ***
const ob1InscriptionIds = [
    { id: 'e7d344ef3098d0889856978c4d2e81ccf2358f7f8b66feecc71e03036c59ad48i0', name: 'OB1 #1', soundName: 'Kick' },
    { id: 'ef5707e6ecf4d5b6edb4c3a371ca1c57b5d1057c6505ccb5f8bdc8918b0c4d94i0', name: 'OB1 #2', soundName: 'Snare' },
    { id: 'd030eb3d8bcd68b0ed02b0c67fdb981342eea40b0383814f179a48e76927db93i0', name: 'OB1 #3', soundName: 'Hat' },
    { id: '3b7482a832c4f27c32fc1da7cc4249bbbac1cbdfbdb8673079cad0c33486d233i0', name: 'OB1 #4', soundName: 'Clap' },
    { id: '5a42d7b2e2fe01e4f31cbad5dd671997f87339d970faaab37f6355c4a2f3be5ai0', name: 'OB1 #5', soundName: 'Synth?' },
    { id: 'ddc1838c1a6a3c45b2c6e19ff278c3b51b0797c3f1339c533370442d23687a68i0', name: 'OB1 #6', soundName: 'Bass?' },
    { id: '91f52a4ca00bb27383ae149f24b605d75ea99df033a6cbb6de2389455233bf51i0', name: 'OB1 #7', soundName: 'FX?' },
    { id: '1e3c2571e96729153e4b63e2b561d85aec7bc5ba372d293af469a525dfa3ed59i0', name: 'OB1 #8', soundName: 'Vocal?' },
    { id: '437868aecce108d49f9b29c2f477987cb5834ffdf639a650335af7f0fdd5e55bi0', name: 'OB1 #9', soundName: 'Perc?' },
    { id: '3be1f8e37b718f5b9874aecad792504c5822dc8dfc727ad4928594f7725db987i0', name: 'OB1 #10', soundName: 'Lead?' },
    { id: '1bda678460ef08fb64435b57c9b69fd78fd4556822ccd8e9839b4eb71b3621edi0', name: 'OB1 #11', soundName: 'Arp?' },
    { id: '3e5fe7bc10e37a145a75f7ddd71debd9079b05568c5b9c5e6b4de3d959a4c46bi0', name: 'OB1 #12', soundName: 'Cowbell' },
    // Assuming total supply is 15, add the remaining 3 if IDs are known
    // { id: '...', name: 'OB1 #13', soundName: '...' },
    // { id: '...', name: 'OB1 #14', soundName: '...' },
    // { id: '...', name: 'OB1 #15', soundName: '...' },
];
const beatLabSoundsConfig = ob1InscriptionIds.slice(0, 4); // Use first 4 for beat lab

// --- Global Variables ---
let audioContext = null; // Initialize as null
const audioBuffers = []; // Array to hold decoded AudioBuffers

// --- Initialization ---
document.addEventListener('DOMContentLoaded', function() {
    initCursor();
    initNavigation();
    initWaveform();
    initBeatLab(); // Will setup UI and load samples
    initCollectionGrid();
    initScrollAnimations();
});


// --- Core Functions ---

// Custom cursor
function initCursor() {
    const cursor = document.querySelector('.cursor');
    const cursorFollower = document.querySelector('.cursor-follower');
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion || window.innerWidth <= 768) {
        if (cursor) cursor.style.display = 'none';
        if (cursorFollower) cursorFollower.style.display = 'none';
        return;
    }

    document.addEventListener('mousemove', function(e) {
        cursor.style.left = e.clientX + 'px';
        cursor.style.top = e.clientY + 'px';
        setTimeout(function() {
            cursorFollower.style.left = e.clientX + 'px';
            cursorFollower.style.top = e.clientY + 'px';
        }, 100);
    });
    document.addEventListener('mousedown', function() {
        cursor.style.transform = 'translate(-50%, -50%) scale(0.7)';
        cursorFollower.style.transform = 'translate(-50%, -50%) scale(1.5)';
    });
    document.addEventListener('mouseup', function() {
        cursor.style.transform = 'translate(-50%, -50%) scale(1)';
        cursorFollower.style.transform = 'translate(-50%, -50%) scale(1)';
    });
    const hoverElements = document.querySelectorAll('a, button, .collection-item, .nft-card, .node, .beat-cell');
    hoverElements.forEach(element => {
        element.addEventListener('mouseenter', function() {
            cursor.style.transform = 'translate(-50%, -50%) scale(1.5)';
            cursorFollower.style.transform = 'translate(-50%, -50%) scale(1.8)';
            cursorFollower.style.borderColor = 'var(--accent-color)';
        });
        element.addEventListener('mouseleave', function() {
            cursor.style.transform = 'translate(-50%, -50%) scale(1)';
            cursorFollower.style.transform = 'translate(-50%, -50%) scale(1)';
            cursorFollower.style.borderColor = 'var(--light-color)';
        });
    });
}

// Navigation
function initNavigation() {
    const header = document.querySelector('header');
    const menuToggle = document.querySelector('.menu-toggle');
    const nav = document.querySelector('nav');
    const navLinks = document.querySelectorAll('.nav-link');

    window.addEventListener('scroll', function() {
        if (window.scrollY > 50) header.classList.add('scrolled');
        else header.classList.remove('scrolled');
    });
    menuToggle.addEventListener('click', function() {
        menuToggle.classList.toggle('active');
        nav.classList.toggle('active');
    });
    navLinks.forEach(link => {
        link.addEventListener('click', function() {
            menuToggle.classList.remove('active');
            nav.classList.remove('active');
        });
    });
    document.addEventListener('click', function(event) {
        if (header && !header.contains(event.target) && nav && nav.classList.contains('active')) { // Added checks for elements
            menuToggle.classList.remove('active');
            nav.classList.remove('active');
        }
    });
    // Active link on scroll logic (simplified/removed for brevity, can be added back)
}


// Waveform visualization
function initWaveform() {
    const canvas = document.getElementById('waveform');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let animationFrameId;

    function setupCanvas() {
        const parent = canvas.parentElement;
        if (!parent) return;
        canvas.width = parent.offsetWidth;
        canvas.height = parent.offsetHeight;
    }

    const waveCount = 3;
    const waves = [];
    const colors = ['var(--primary-color)', 'var(--light-color)', 'var(--accent-color)'];

    function initWaves() {
         waves.length = 0;
         if (canvas.height <= 0) return; // Avoid issues if canvas has no height
         for (let i = 0; i < waveCount; i++) {
             waves.push({
                 frequency: 0.015 + (i * 0.004),
                 amplitude: Math.max(10, canvas.height * 0.2 - (i * canvas.height * 0.05)), // Ensure min amplitude
                 speed: 0.03 + (i * 0.01),
                 offset: Math.random() * Math.PI * 2,
                 color: getComputedStyle(document.documentElement).getPropertyValue(colors[i % colors.length]).trim() || '#FFFFFF'
             });
         }
    }

    function animate() {
        if (!canvas || !ctx) return;
        // Ensure dimensions are valid before drawing
        if (canvas.width > 0 && canvas.height > 0) {
             ctx.clearRect(0, 0, canvas.width, canvas.height);
             waves.forEach(wave => drawWave(wave));
        }
        animationFrameId = requestAnimationFrame(animate);
    }


    function drawWave(wave) {
        if (canvas.height <= 0) return; // Prevent drawing if no height
        ctx.beginPath();
        ctx.moveTo(0, canvas.height / 2);
        ctx.strokeStyle = wave.color;
        ctx.lineWidth = 2;
        for (let x = 0; x < canvas.width; x++) {
            const y = Math.sin(x * wave.frequency + wave.offset) * wave.amplitude + (canvas.height / 2);
            ctx.lineTo(x, y);
        }
        ctx.stroke();
    }

    function startAnimation() {
        if (animationFrameId) cancelAnimationFrame(animationFrameId);
        setupCanvas();
        if (canvas.width > 0 && canvas.height > 0) {
            initWaves();
            animate();
        } else {
            console.warn("Waveform canvas has zero dimensions, animation skipped.");
            animationFrameId = null; // Ensure it's null if not running
        }
    }


    let resizeTimeout;
    window.addEventListener('resize', function() {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(startAnimation, 250);
    });

    // Use IntersectionObserver to delay initial animation until visible
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                if (!animationFrameId) startAnimation(); // Start only when visible and not already running
                // observer.unobserve(canvas); // Optional: Stop observing after first visibility
            } else {
                if (animationFrameId) {
                    cancelAnimationFrame(animationFrameId); // Pause animation
                    animationFrameId = null;
                }
            }
        });
    }, { threshold: 0 }); // Trigger as soon as any part is visible

    if (canvas) observer.observe(canvas); // Start observing
}

// --- Audio Utilities ---

function base64ToArrayBuffer(base64) {
    try {
        const binaryString = atob(base64);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        return bytes.buffer;
    } catch (error) {
        console.error("Error decoding Base64 string:", error);
        return null;
    }
}

function extractBase64Audio(htmlString) {
    // Added '?' to make '+' non-greedy, just in case
    const regex = /data:(audio\/[^;]+?);base64,([a-zA-Z0-9+/=]+?)(?=["']|,|\s|$)/;
    const match = htmlString.match(regex);
    if (match && match[2]) {
        console.log(`Found audio MIME type: ${match[1]}`);
        return match[2];
    }
    console.warn("Could not find base64 audio data using data:audio pattern.");
    return null;
}

// --- Beat Lab ---
async function initBeatLab() {
    const beatGridElement = document.querySelector('.beat-grid');
    const playButton = document.getElementById('play-button');
    const stopButton = document.getElementById('stop-button');
    const tempoSlider = document.getElementById('tempo');
    const tempoValue = document.getElementById('tempo-value');

    if (!beatGridElement || !playButton || !stopButton || !tempoSlider) {
        console.error("Beat Lab elements not found.");
        return;
    }

    const rows = beatLabSoundsConfig.length;
    const cols = 8;
    let tempo = 120;
    let isPlaying = false;
    let currentStep = 0;
    let intervalId = null;
    let samplesLoadedSuccessfully = false;

    function initializeAudioContext() {
        if (!audioContext) {
            try {
                const AudioContext = window.AudioContext || window.webkitAudioContext;
                audioContext = new AudioContext();
                console.log("AudioContext created.");
                if (audioContext.state === 'suspended') {
                    audioContext.resume().then(() => console.log("Initial AC resume OK.")).catch(e => console.error("Initial AC resume failed:", e));
                }
                audioContext.onstatechange = () => console.log("AC state:", audioContext.state);
            } catch (e) {
                console.error("Web Audio API not supported:", e);
                alert("Web Audio API not supported. Beat Lab disabled.");
                return false;
            }
        }
        if (audioContext && audioContext.state === 'suspended') {
            audioContext.resume().then(() => console.log("AC resumed by interaction.")).catch(e => console.error("AC resume on interaction failed:", e));
        }
        return true;
    }

    async function loadSamples() {
        console.log("Loading samples...");
        // NOTE: Using ordinals.com/content/ for audio fetching now
        const audioContentBaseUrl = 'https://ordinals.com/content/';
        const promises = beatLabSoundsConfig.map(async (soundInfo, index) => {
            const url = `${audioContentBaseUrl}${soundInfo.id}`; // Use /content/ for audio fetch
            try {
                const response = await fetch(url);
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                const htmlString = await response.text(); // Expecting HTML containing audio
                const base64Data = extractBase64Audio(htmlString); // Extract from HTML
                if (base64Data) {
                    const arrayBuffer = base64ToArrayBuffer(base64Data);
                    if (arrayBuffer) {
                        if (!initializeAudioContext()) return;
                        try {
                            if (audioContext.state !== 'running') {
                                console.log(`AC state is ${audioContext.state} before decoding sample ${index}. Attempting resume...`);
                                await audioContext.resume();
                            }
                            if (audioContext.state === 'running') {
                                const decodedBuffer = await audioContext.decodeAudioData(arrayBuffer);
                                audioBuffers[index] = decodedBuffer;
                                console.log(`Decoded: ${soundInfo.name || soundInfo.id}`);
                            } else {
                                console.error(`Cannot decode sample ${index}, AC state is ${audioContext.state}`);
                            }
                        } catch (decodeError) {
                             console.error(`Decode error for ${soundInfo.id} (AC state: ${audioContext?.state}):`, decodeError);
                        }
                    } else console.error(`ArrayBuffer failed for ${soundInfo.id}`);
                } else console.error(`No Base64 in ${soundInfo.id}`);
            } catch (error) {
                console.error(`Fetch/process error ${soundInfo.id}:`, error);
            }
        });
        await Promise.all(promises);
        console.log("Sample loading finished.");
        samplesLoadedSuccessfully = audioBuffers.length > 0 && audioBuffers.some(b => b);
        if (!samplesLoadedSuccessfully) {
             console.error("Failed to load any valid samples.");
             beatGridElement.innerHTML = '<p style="color: var(--accent-color); text-align: center;">Beat Lab disabled - samples failed to load.</p>';
             playButton.disabled = true;
             stopButton.disabled = true;
             tempoSlider.disabled = true;
        } else {
             console.log("Samples loaded:", audioBuffers.filter(b => b).length);
        }
    }

    function createBeatGrid() {
        beatGridElement.innerHTML = '';
        const labelCol = document.createElement('div');
        labelCol.className = 'beat-labels';
        beatLabSoundsConfig.forEach(soundInfo => {
            const label = document.createElement('div');
            label.className = 'beat-label';
            label.textContent = soundInfo.soundName || 'Sample';
            labelCol.appendChild(label);
        });
        beatGridElement.appendChild(labelCol);

        const gridContainer = document.createElement('div');
        gridContainer.className = 'grid-container';
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                const cell = document.createElement('div');
                cell.className = 'beat-cell';
                cell.dataset.row = row;
                cell.dataset.col = col;
                gridContainer.appendChild(cell);
            }
        }
        beatGridElement.appendChild(gridContainer);
    }

    function playSound(row) {
        if (!initializeAudioContext() || row >= audioBuffers.length || !audioBuffers[row]) {
             console.warn(`playSound: Invalid row index ${row} or buffer not loaded.`);
             return; // Check if buffer exists for the row
        }
        if (audioContext.state !== 'running') {
            console.warn(`Play blocked: AC state ${audioContext.state}. Attempting resume...`);
            audioContext.resume().then(() => {
                if (audioContext.state === 'running') playSound(row); // Retry
                else console.error("AC did not resume.");
            }).catch(e => console.error("Resume before play failed:", e));
            return;
        }
        try {
            const source = audioContext.createBufferSource();
            source.buffer = audioBuffers[row];
            source.connect(audioContext.destination);
            source.start(0);
        } catch (e) { console.error("BufferSource error:", e); }
    }

    function playSequence() {
        if (!isPlaying) return;
        const activeCellsIndices = []; // Store indices of rows to play
        beatGridElement.querySelectorAll('.beat-cell').forEach(cell => cell.classList.remove('playing'));

        for (let row = 0; row < rows; row++) {
            const cell = beatGridElement.querySelector(`.beat-cell[data-row="${row}"][data-col="${currentStep}"]`);
            if (cell) {
                cell.classList.add('playing');
                if (cell.classList.contains('active')) {
                    activeCellsIndices.push(row); // Add row index to list
                }
            }
        }

        // Check context state *before* looping through sounds to play
        if (audioContext?.state === 'running') {
            activeCellsIndices.forEach(rowIndex => playSound(rowIndex)); // Play sounds for this step
        } else if (activeCellsIndices.length > 0) {
             console.warn(`Sequence step ${currentStep} skipped sound: AC state ${audioContext?.state}`);
             // Try to resume if sounds were supposed to play but context wasn't running
             if (initializeAudioContext()) {
                 audioContext.resume();
             }
        }

        currentStep = (currentStep + 1) % cols;
    }


    function startPlayback() {
        if (!samplesLoadedSuccessfully || !initializeAudioContext()) {
             console.warn("Cannot start playback: Samples/AC not ready.");
             return;
        }
        if (isPlaying) return;
        if (audioContext.state !== 'running') {
             console.warn(`Playback blocked: AC state ${audioContext.state}.`);
             alert("Audio is blocked. Please click again or interact with the page.");
             audioContext.resume();
             return;
        }
        console.log("Starting playback...");
        isPlaying = true;
        currentStep = 0;
        const intervalTime = (60 / tempo) * 1000 / 4; // Time per 16th note step
        playSequence(); // Play first step
        intervalId = setInterval(playSequence, intervalTime);
        playButton.innerHTML = '<i class="fas fa-pause"></i>';
    }


    function stopPlayback() {
        if (!isPlaying) return;
        isPlaying = false;
        clearInterval(intervalId);
        intervalId = null;
        // Clear only 'playing' class, not 'active'
        beatGridElement.querySelectorAll('.beat-cell.playing').forEach(cell => {
             cell.classList.remove('playing');
        });
        playButton.innerHTML = '<i class="fas fa-play"></i>';
        currentStep = 0;
    }


    function updateTempo() {
        tempo = parseInt(tempoSlider.value);
        tempoValue.textContent = tempo;
        if (isPlaying) {
            clearInterval(intervalId);
            const intervalTime = (60 / tempo) * 1000 / 4;
            intervalId = setInterval(playSequence, intervalTime);
        }
    }

    // --- Initialize Beat Lab ---
    console.log("Initializing Beat Lab UI setup...");
    createBeatGrid(); // Setup UI first
    await loadSamples(); // Load samples

    if (samplesLoadedSuccessfully) {
        playButton.addEventListener('click', startPlayback);
        stopButton.addEventListener('click', stopPlayback);
        tempoSlider.addEventListener('input', updateTempo);

        // Use event delegation for cell clicks
        beatGridElement.addEventListener('click', (event) => {
            if (event.target.classList.contains('beat-cell')) {
                event.target.classList.toggle('active'); // Toggle active state
                const row = parseInt(event.target.dataset.row);
                if (!isNaN(row)) {
                    playSound(row); // Play sound on click
                }
            }
        });
        console.log("Beat Lab Event Listeners Attached.");
    } else {
        console.error("Beat Lab initialization failed. Controls remain disabled.");
        // UI might already show error message from loadSamples
    }
} // <-- End of async function initBeatLab

// --- Collection Grid ---
function initCollectionGrid() {
    const collectionGrid = document.querySelector('.collection-grid');
    if (!collectionGrid) return;
    collectionGrid.innerHTML = '<p style="text-align: center; width: 100%; opacity: 0.7;">Loading collection previews...</p>'; // Update placeholder

    // Clear placeholder after a short delay to allow rendering
    setTimeout(() => {
        if (collectionGrid.querySelector('p')) {
            collectionGrid.innerHTML = ''; // Clear placeholder only if it's still there
        }
        renderGridItems(); // Start rendering items
    }, 50); // Adjust delay if needed


    function renderGridItems() {
        ob1InscriptionIds.forEach(item => {
            const collectionItem = document.createElement('div');
            collectionItem.className = 'collection-item'; // Keep the main container class

            const contentUrl = `${CONTENT_BASE_URL}${item.id}`; // Still using ordinals.com/content/
            const detailUrl = `https://magiceden.io/ordinals/item-details/${item.id}`; // Link to ME

            collectionItem.innerHTML = `
                <div class="collection-preview-container">
                    <iframe
                        src="${contentUrl}"
                        frameborder="0"
                        scrolling="no"
                        sandbox="allow-scripts allow-same-origin" /* Security: adjust as needed */
                        loading="lazy"
                        title="OB1 Item ${item.name || item.id} Preview" /* Accessibility */
                        class="collection-iframe"
                    ></iframe>
                    <!-- Optional: Overlay link -->
                    <a href="${detailUrl}" target="_blank" rel="noopener noreferrer" class="iframe-link-overlay" aria-label="View ${item.name || 'Item'} on Magic Eden"></a>
                </div>
                <div class="collection-details">
                     <a href="${detailUrl}" target="_blank" rel="noopener noreferrer" class="details-link">
                        <h3>${item.name || 'OB1 Item'}</h3>
                        ${item.soundName ? `<p>Sound: ${item.soundName}</p>` : ''}
                    </a>
                </div>
            `;

            collectionGrid.appendChild(collectionItem);
        });
    }
}

// --- Scroll Animations ---
function initScrollAnimations() {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
        const elements = document.querySelectorAll('.section-header, .text-content, .visual-content, .team-member, .timeline-item, .collection-stat, .collection-item');
        elements.forEach(el => { el.style.opacity = '1'; el.style.transform = 'translateY(0)'; });
        return;
    }
    const fadeElements = document.querySelectorAll('.section-header, .text-content, .visual-content, .team-member, .timeline-item, .collection-stat, .collection-item');
    const fadeOptions = { threshold: 0.1, rootMargin: '0px 0px -50px 0px' };
    const fadeObserver = new IntersectionObserver(function(entries, observer) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
                observer.unobserve(entry.target);
            }
        });
    }, fadeOptions);
    fadeElements.forEach(element => {
        element.style.opacity = '0';
        element.style.transform = 'translateY(20px)';
        element.style.transition = 'opacity 0.5s ease-out, transform 0.5s ease-out';
        fadeObserver.observe(element);
    });
    // Staggering (simplified)
    document.querySelectorAll('.team-member, .collection-stat, .collection-item').forEach((el, index) => {
        el.style.transitionDelay = `${(index % 6) * 0.06}s`; // Apply some delay based on index
    });
}

// --- Placeholder Sounds JS File ---
// This script does not use placeholder_sounds.js