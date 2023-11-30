<script>
    import { onMount, onDestroy } from 'svelte';
    import { writable, get } from 'svelte/store';

    // Props and external dependencies
    export let externalOrdinalId = '';
    export let externalAudioContext;
    export let channelIndex;

    // Accessing the global object
    // const globalSettings = window.UnifiedSequencerSettings;

    // Internal state managed with Svelte stores
    const startSliderValue = writable(0); // 0% to start
    const endSliderValue = writable(100); // 100% to end
    const loopEnabled = writable(false);
    let isLooping = false;

    // Other variables
    let audioContext = externalAudioContext || new (window.AudioContext || window.webkitAudioContext)();
    let audioBuffer, sourceNode, startTime, isPlaying = false;
    let ordinalId = '', maxDuration = 0;
    let startDimmedWidth = '0%', endDimmedWidth = '0%';
    let canvas, playbackCanvas, ctx, playbackCtx;

    // Formatted time for display
    let formattedStartTime = '0:00.00';
    let formattedEndTime = '0:00.00';

    // Reactive statements to update formatted time
    $: formattedStartTime = formatTime($startSliderValue);
    $: formattedEndTime = formatTime($endSliderValue);


    // Sync with global settings on component mount
    onMount(() => {
        if (window.audioTrimmerData) {
            // Use the data from the global object
            const { audioData, trimSettings } = window.audioTrimmerData;
            // Load audio and set initial trim settings
            // Use this data to set up your component
            // For example, load the audio, set initial trim settings, etc.
            loadAudio(audioData);
            setInitialTrimSettings(trimSettings);

            // Clear the global data to avoid reuse
            window.audioTrimmerData = null;
        }
            // syncWithGlobalSettings();
        ctx = canvas.getContext('2d');
        playbackCtx = playbackCanvas.getContext('2d');
    });

    function formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        seconds = Math.floor(seconds % 60);
        const hundredths = Math.floor((seconds - Math.floor(seconds)) * 100);
        return `${minutes}:${seconds.toString().padStart(2, '0')}.${hundredths}`;
    }

    // Ensure disconnection and cleanup on component destruction
    onDestroy(() => {
        if (sourceNode) {
            sourceNode.disconnect();
        }
        audioContext.close();
    });

   //  // Function to synchronize with global settings
   //  function syncWithGlobalSettings() {
   //      const currentTrimValues = globalSettings.settings.masterSettings.trimValues[channelIndex];
   //      startSliderValue.set(parseFloat(currentTrimValues.startTrimTime));
   //      endSliderValue.set(parseFloat(currentTrimValues.endTrimTime));
   //  }

    function base64ToArrayBuffer(base64) {
        const binaryString = atob(base64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        return bytes.buffer;
    }

    function decodeAudioData(audioData) {
        return new Promise((resolve, reject) => {
            audioContext.decodeAudioData(audioData, resolve, (e) => reject(new Error(`Decoding audio data failed with error: ${e}`)));
        });
    }
  
    async function fetchAudio(ordinalId) {
        const url = `https://ordinals.com/content/${ordinalId}`;
        try {
            const response = await fetch(url);
            const contentType = response.headers.get('content-type');
            let arrayBuffer;

            if (contentType && contentType.includes('application/json')) {
                const jsonData = await response.json();
                if (!jsonData.audioData) {
                    throw new Error("No audioData field in JSON response");
                }
                const base64Audio = jsonData.audioData.split(',')[1];
                arrayBuffer = base64ToArrayBuffer(base64Audio);
            } else {
                arrayBuffer = await response.arrayBuffer();
            }

            audioBuffer = await decodeAudioData(arrayBuffer);
            startSliderValue.set(0);
            endSliderValue.set(audioBuffer.duration);
            drawWaveform();
        } catch (error) {
            console.error('Error fetching or decoding audio:', error);
        }
    }

    $: if (externalOrdinalId) {
        fetchAudio(externalOrdinalId);
    }

    function loadSample() {
        const idToUse = externalOrdinalId || ordinalId;
        if (idToUse) {
            fetchAudio(idToUse);
        }
    }

    let scaleFactor = 10; // Adjust this based on how zoomed in you want the waveform to be

    function drawWaveform() {
        if (!audioBuffer) return;
        const duration = audioBuffer.duration;
        const scaledWidth = duration * scaleFactor; // Calculate width based on duration and scale factor
        canvas.width = scaledWidth; // Set the canvas width
        playbackCanvas.width = scaledWidth; // Set the playback canvas width

        const channelData = audioBuffer.getChannelData(0);
        const step = Math.ceil(channelData.length / width);
        const amp = height / 2;
        ctx.clearRect(0, 0, width, height);
        ctx.beginPath();

        for (let i = 0; i < width; i++) {
            const { min, max } = getMinMax(channelData, i * step, step);
            ctx.moveTo(i, amp * (1 + min));
            ctx.lineTo(i, amp * (1 + max));
        }

        ctx.stroke();
    }

    function toggleLoop() {
        isLooping = !isLooping;
    }

    function playAudio() {
        sourceNode = audioContext.createBufferSource();
        sourceNode.buffer = audioBuffer;
        sourceNode.connect(audioContext.destination);
        const startValue = $startSliderValue;
        const endValue = $endSliderValue;
        sourceNode.loop = isLooping;
        if (isLooping) {
            sourceNode.loopStart = Math.max(0, startValue);
            sourceNode.loopEnd = Math.min(endValue, audioBuffer.duration);
        }
        if (audioBuffer && startValue < endValue) {
            sourceNode.start(0, startValue, endValue - startValue);
            startTime = audioContext.currentTime - startValue;
            isPlaying = true;
            animatePlayback();
        }
        sourceNode.onended = () => {
            isPlaying = false;
            if (isLooping) playAudio();
        };
    }

    function stopAudio() {
        if (isPlaying && sourceNode) {
            sourceNode.disconnect();
            sourceNode = null;
            isPlaying = false;
        }
        isLooping = false;
    }

    function getMinMax(channelData, startIndex, step) {
        let min = 1.0, max = -1.0;
        for (let i = 0; i < step; i++) {
            const datum = channelData[startIndex + i];
            if (datum < min) min = datum;
            if (datum > max) max = datum;
        }
        return { min, max };
    }

    function getCurrentPlaybackPosition() {
        if (!isPlaying) return 0;
        return (audioContext.currentTime - startTime) % audioBuffer.duration;
    }

    function updatePlaybackCanvas() {
        const currentPosition = getCurrentPlaybackPosition();
        const width = playbackCanvas.width;
        const height = playbackCanvas.height;
        playbackCtx.clearRect(0, 0, width, height);
        const xPosition = (currentPosition / audioBuffer.duration) * width;
        playbackCtx.beginPath();
        playbackCtx.moveTo(xPosition, 0);
        playbackCtx.lineTo(xPosition, height);
        playbackCtx.strokeStyle = '#FF0000';
        playbackCtx.lineWidth = 2;
        playbackCtx.stroke();
    }

    function animatePlayback() {
        if (isPlaying) {
            updatePlaybackCanvas();
            requestAnimationFrame(animatePlayback);
        }
    }

    // Update the dimmed widths reactively
    $: if (audioBuffer) {
        maxDuration = audioBuffer.duration;
        startDimmedWidth = `${Math.max(0, $startSliderValue / maxDuration) * 100}%`;
        endDimmedWidth = `${Math.max(0, (1 - $endSliderValue / maxDuration)) * 100}%`;
    }


  // Function to update global settings with local values
function updateGlobalSettings() {
    if (!window.UnifiedSequencerSettings || !window.UnifiedSequencerSettings.settings) {
        console.error('UnifiedSequencerSettings is not initialized');
        return;
    }

    // Ensure that channelIndex is defined and is a valid index
    if (channelIndex === undefined || channelIndex < 0) {
        console.error('Invalid or undefined channelIndex');
        return;
    }

    // Update the specific channel's trim settings in the global object
    window.UnifiedSequencerSettings.settings.masterSettings.trimValues[channelIndex] = {
        startTrimTime: get(startSliderValue).toString(),
        endTrimTime: get(endSliderValue).toString()
    };
}

    // Subscribe to store changes to keep the global object updated
    // startSliderValue.subscribe(updateGlobalSettings);
    // endSliderValue.subscribe(updateGlobalSettings);
</script>

<style>
.waveform-container {
    max-width: 100%; /* Limit the width to the parent container's width */
    overflow-x: auto; /* Enable horizontal scrolling */
    height: 200px; /* Adjust height as needed */
    background: #f3f3f3;
    border: 1px solid #000;
}

canvas, .dimmed {
    position: absolute;
    top: 0;
    left: 0;
    height: 100%;
}

canvas {
    display: block;
    width: auto !important; /* Allow canvas to expand as needed */
}

    .slider {
      width: 100%;
    }

    .dimmed {
      background: rgba(0, 0, 0, 0.5);
    }

    .loop-button.on {
        background-color: green;
    }

    .loop-button.off {
        background-color: red;
    }
</style>

  
<h1>Audio Trimmer</h1>
<input type="text" bind:value={ordinalId} placeholder="Enter Ordinal ID" />
<button on:click={loadSample}>Load Sample</button>

<div class="waveform-container">
    <canvas bind:this={canvas} width="4000" height="800" class="waveform-canvas"></canvas>
    <canvas bind:this={playbackCanvas} width="4000" height="800" class="playback-canvas"></canvas>
    <div class="dimmed" style="width: {startDimmedWidth}; left: 0;"></div>
    <div class="dimmed" style="width: {endDimmedWidth}; right: 0; left: auto;"></div>
</div>

<div>
    <p>Start Time: {formattedStartTime}</p>
    <p>End Time: {formattedEndTime}</p>
    <!-- ... rest of the HTML -->
</div>

<input type="range" class="slider" bind:value={$startSliderValue} min="0" max={maxDuration} step="0.01" >
<input type="range" class="slider" bind:value={$endSliderValue} min="0" max={maxDuration} step="0.01" >

<button on:click={playAudio}>Play</button>
<button on:click={stopAudio}>Stop</button>

<button on:click={toggleLoop}
        class="loop-button"
        class:off={!isLooping}
        class:on={isLooping}>
    Loop Selection
</button>

