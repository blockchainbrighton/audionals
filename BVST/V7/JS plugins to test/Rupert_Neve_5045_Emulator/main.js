let audioCtx;
let neveNode;
let sourceNode;
let isRunning = false;

const startBtn = document.getElementById('start-btn');
const statusMsg = document.getElementById('status-msg');

const thresholdSlider = document.getElementById('threshold');
const thresholdVal = document.getElementById('threshold-val');
const depthSlider = document.getElementById('depth');
const depthVal = document.getElementById('depth-val');
const timeConstRadios = document.getElementsByName('timeConst');
const modeBtn = document.getElementById('mode-btn');
const engageBtn = document.getElementById('engage-btn');
const processLed = document.getElementById('process-led');

// State
let modeState = 0; // 0=RMS, 1=PEAK
let engageState = 1; // 1=Engaged

startBtn.addEventListener('click', async () => {
    if (isRunning) return;
    
    try {
        statusMsg.innerText = "Initializing Audio...";
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        
        await audioCtx.audioWorklet.addModule('neve-5045-processor.js');

        // Create the Worklet Node
        neveNode = new AudioWorkletNode(audioCtx, 'rupert-neve-5045-processor');
        
        // Handle Messages (LED)
        neveNode.port.onmessage = (event) => {
            if (event.data.type === 'activeState') {
                updateLed(event.data.value);
            }
        };

        // Get Microphone Input
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        sourceNode = audioCtx.createMediaStreamSource(stream);
        
        // Connect
        sourceNode.connect(neveNode);
        neveNode.connect(audioCtx.destination);

        // Initialize Params
        updateParams();

        isRunning = true;
        startBtn.disabled = true;
        startBtn.innerText = "Running";
        statusMsg.innerText = "Audio Active. Speak into microphone.";

    } catch (err) {
        console.error(err);
        statusMsg.innerText = "Error: " + err.message;
    }
});

function updateParams() {
    if (!neveNode) return;

    const thresh = parseFloat(thresholdSlider.value);
    const depth = parseFloat(depthSlider.value);
    let timeConstIndex = 0;
    for (const radio of timeConstRadios) {
        if (radio.checked) {
            timeConstIndex = parseInt(radio.value);
            break;
        }
    }

    neveNode.parameters.get('threshold').setTargetAtTime(thresh, audioCtx.currentTime, 0.01);
    neveNode.parameters.get('depth').setTargetAtTime(depth, audioCtx.currentTime, 0.01);
    neveNode.parameters.get('timeConstant').setValueAtTime(timeConstIndex, audioCtx.currentTime);
    neveNode.parameters.get('mode').setValueAtTime(modeState, audioCtx.currentTime);
    neveNode.parameters.get('engage').setValueAtTime(engageState, audioCtx.currentTime);

    // Update Displays
    thresholdVal.innerText = `${thresh.toFixed(1)} dBu`;
    depthVal.innerText = `${depth.toFixed(1)} dB`;
}

// UI Event Listeners
thresholdSlider.addEventListener('input', updateParams);
depthSlider.addEventListener('input', updateParams);

timeConstRadios.forEach(radio => {
    radio.addEventListener('change', updateParams);
});

modeBtn.addEventListener('click', () => {
    modeState = modeState === 0 ? 1 : 0;
    modeBtn.innerText = modeState === 0 ? "RMS" : "PEAK";
    // Optional: Add visual toggle state style
    if (modeState === 1) modeBtn.classList.add('active');
    else modeBtn.classList.remove('active');
    updateParams();
});

engageBtn.addEventListener('click', () => {
    engageState = engageState === 0 ? 1 : 0;
    if (engageState === 1) {
        engageBtn.classList.add('active');
        engageBtn.innerText = "ENGAGE";
    } else {
        engageBtn.classList.remove('active');
        engageBtn.innerText = "BYPASS";
    }
    updateParams();
});

function updateLed(isActive) {
    if (isActive) {
        processLed.classList.add('led-on');
    } else {
        processLed.classList.remove('led-on');
    }
}
