<script>
    import { onMount, onDestroy } from 'svelte';
    import { writable } from 'svelte/store';

    let audioContext = new (window.AudioContext || window.webkitAudioContext)();
    let audioBuffer;
    let sourceNode;
    let startTime;
    let startOffset = 0;
    let isPlaying = false;
    let ordinalId = '';
    let startDimmedWidth = '0%';
    let endDimmedWidth = '0%';
    let maxDuration = 0;

    const startSliderValue = writable(0);
    const endSliderValue = writable(0);

    let canvas, playbackCanvas, ctx, playbackCtx;

    $: {
        maxDuration = audioBuffer ? audioBuffer.duration : 0;
        startDimmedWidth = audioBuffer ? `${($startSliderValue / maxDuration) * 100}%` : '0%';
        endDimmedWidth = audioBuffer ? `${(1 - $endSliderValue / maxDuration) * 100}%` : '0%';

        if ($startSliderValue >= $endSliderValue) {
            startSliderValue.set($endSliderValue - 0.01);
        } else if ($endSliderValue <= $startSliderValue) {
            endSliderValue.set($startSliderValue + 0.01);
        }
    }

    onMount(() => {
        ctx = canvas.getContext('2d');
        playbackCtx = playbackCanvas.getContext('2d');
    });

    onDestroy(() => {
      if (sourceNode) {
        sourceNode.disconnect();
      }
      audioContext.close();
    });

    // Function to convert base64 to an array buffer
    function base64ToArrayBuffer(base64) {
        const binaryString = atob(base64);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        return bytes.buffer;
    }

    // Function to decode audio data using a Promise to handle async decodeAudioData
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

        // Check if the response is JSON with base64 audio data
        if (contentType && contentType.includes('application/json')) {
            const jsonData = await response.json();
            if (!jsonData.audioData) {
                throw new Error("No audioData field in JSON response");
            }
            const base64Audio = jsonData.audioData.split(',')[1]; // Assuming the data is prefixed with a data URL
            const arrayBuffer = base64ToArrayBuffer(base64Audio);
            audioBuffer = await decodeAudioData(arrayBuffer); // Using your custom decodeAudioData function
        } else {
            // Assuming the response is a binary audio file (mp3, wav, etc.)
            const arrayBuffer = await response.arrayBuffer();
            audioBuffer = await decodeAudioData(arrayBuffer); // Using your custom decodeAudioData function
        }

        startSliderValue.set(0);
        endSliderValue.set(audioBuffer.duration);
        drawWaveform();
    } catch (error) {
        console.error('Error fetching or decoding audio:', error);
        // Optionally update the UI to reflect the error
    }
}


    $: if (audioBuffer) {
        startDimmedWidth = `${($startSliderValue / audioBuffer.duration) * 100}%`;
        endDimmedWidth = `${(1 - $endSliderValue / audioBuffer.duration) * 100}%`;
    } else {
        startDimmedWidth = '0%';
        endDimmedWidth = '0%';
    }

    $: {
        if ($startSliderValue >= $endSliderValue) {
            startSliderValue.set($endSliderValue - 0.01);
        }
        if ($endSliderValue <= $startSliderValue) {
            endSliderValue.set($startSliderValue + 0.01);
        }
    }

    function loadSample() {
        if (ordinalId) {
            fetchAudio(ordinalId);
        }
    }

  function drawWaveform() {
    if (!audioBuffer) {
        // Handle the lack of audioBuffer more gracefully or trigger a user notification
        return;
    }

    const width = canvas.width;
    const height = canvas.height;
    const channelData = audioBuffer.getChannelData(0);
    const step = Math.ceil(channelData.length / width);
    const amp = height / 2;
    let min, max, datum, yLow, yHigh;

    ctx.clearRect(0, 0, width, height);
    ctx.beginPath();

    // Draw the waveform with a single path
    for (let i = 0; i < width; i++) {
        min = 1.0;
        max = -1.0;
        for (let j = 0; j < step; j++) {
            datum = channelData[i * step + j];
            if (datum < min) min = datum;
            if (datum > max) max = datum;
        }
        yLow = amp * (1 + min);
        yHigh = amp * (1 + max);

        // Move to the bottom of the wave segment and draw to the top
        ctx.moveTo(i, yLow);
        ctx.lineTo(i, yHigh);
    }

    ctx.stroke();
}

function playAudio() {
    if (isPlaying) {
        stopAudio();
    }

    sourceNode = audioContext.createBufferSource();
    sourceNode.buffer = audioBuffer;
    sourceNode.connect(audioContext.destination);

    startOffset = $startSliderValue;
    const endOffset = $endSliderValue;

    // Only start the audio if we have a valid buffer and start/end offsets
    if (audioBuffer && startOffset < endOffset) {
        sourceNode.start(0, startOffset, endOffset - startOffset);
        startTime = audioContext.currentTime - startOffset;
        isPlaying = true;
    }
}

function stopAudio() {
    if (isPlaying && sourceNode) {
        sourceNode.disconnect();
        sourceNode = null;
        isPlaying = false;
    }
}

    </script>  
 <style>
    .waveform-container {
      position: relative; /* Absolute positioning context for children */
      width: 100%;
      height: 200px;
      background: #f3f3f3;
      border: 1px solid #000;
    }
  
    /* Both canvas and .dimmed share these properties */
    canvas, .dimmed {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
    }
  
    /* Since canvas elements now use 100% of .waveform-container's height, 
       the height property is no longer needed here */
    canvas {
      display: block;
    }
  
    .slider {
      width: 100%;
    }
  
    .dimmed {
      background: rgba(0, 0, 0, 0.5); /* Semi-transparent black */
    }
  </style>
  
  <h1>Audio Trimmer</h1>
  <input type="text" bind:value={ordinalId} placeholder="Enter Ordinal ID" />
  <button on:click={loadSample}>Load Sample</button>
  <div class="waveform-container">
    <!-- Bind the canvas for the waveform -->
    <canvas bind:this={canvas} width="4000" height="800" class="waveform-canvas"></canvas>
    <canvas bind:this={playbackCanvas} width="4000" height="800" class="playback-canvas"></canvas>
    <div class="dimmed" style="width: {startDimmedWidth}; left: 0;"></div>
    <div class="dimmed" style="width: {endDimmedWidth}; right: 0; left: auto;"></div>
</div>

<input type="range" class="slider" bind:value={$startSliderValue} min="0" max={maxDuration} step="0.01" >
<input type="range" class="slider" bind:value={$endSliderValue} min="0" max={maxDuration} step="0.01" >

<button on:click={playAudio}>Play</button>
<button on:click={stopAudio}>Stop</button>