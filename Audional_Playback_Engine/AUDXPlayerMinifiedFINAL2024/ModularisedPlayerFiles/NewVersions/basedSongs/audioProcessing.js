// audioProcessing.js

async function fetchAndProcessAudioData(channelURLs) {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    await Promise.all(channelURLs.map((url, index) => processAudioUrl(url, index, audioContext)));
    
    // Create reversed buffers
    globalAudioBuffers.forEach(bufferData => {
        reverseAudioBuffer(bufferData.buffer, bufferData.channel);
    });
}

async function processAudioUrl(url, index, audioContext) {
    const channelIndex = index + 1;
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Failed to fetch from URL: ${url}, Status: ${response.status}`);
        
        const contentType = response.headers.get("Content-Type");
        let audioBuffer = await fetchAndDecodeAudio(response, contentType, audioContext);

        if (audioBuffer) {
            globalAudioBuffers.push({ buffer: audioBuffer, channel: `Channel ${channelIndex}` });
        } else {
            logErrorDetails(index, channelIndex, url, contentType);
        }
    } catch (error) {
        console.error(`Error fetching or decoding audio for Channel ${channelIndex}:`, error);
    }
}

async function fetchAndDecodeAudio(response, contentType, audioContext) {
    if (/audio\/(wav|mpeg|mp4)/.test(contentType) || /video\/mp4/.test(contentType)) {
        const arrayBuffer = await response.arrayBuffer();
        console.log(`[fetchAndDecodeAudio] ArrayBuffer length: ${arrayBuffer.byteLength}`);
        return audioContext.decodeAudioData(arrayBuffer);
    }

    const textData = await response.text();
    let base64AudioData = null;
    if (/application\/json/.test(contentType)) {
        base64AudioData = JSON.parse(textData).audioData;
    } else if (/text\/html/.test(contentType)) {
        base64AudioData = extractBase64FromHTML(textData);
    }

    if (base64AudioData) {
        const arrayBuffer = base64ToArrayBuffer(base64AudioData.split(",")[1]);
        console.log(`[fetchAndDecodeAudio] ArrayBuffer length from base64: ${arrayBuffer.byteLength}`);
        return audioContext.decodeAudioData(arrayBuffer);
    }

    if (/audio\//.test(contentType)) {
        const arrayBuffer = await response.arrayBuffer();
        console.log(`[fetchAndDecodeAudio] ArrayBuffer length for direct URL audio: ${arrayBuffer.byteLength}`);
        return audioContext.decodeAudioData(arrayBuffer);
    }

    console.log(`[fetchAndDecodeAudio] Unsupported content type: ${contentType}`);
    return null;
}

function reverseAudioBuffer(buffer, channel) {
    const numberOfChannels = buffer.numberOfChannels;
    const reversedBuffer = audioCtx.createBuffer(numberOfChannels, buffer.length, buffer.sampleRate);

    for (let channelIndex = 0; channelIndex < numberOfChannels; channelIndex++) {
        const originalData = buffer.getChannelData(channelIndex);
        const reversedData = reversedBuffer.getChannelData(channelIndex);
        for (let i = 0; i < buffer.length; i++) {
            reversedData[i] = originalData[buffer.length - 1 - i];
        }
    }

    globalReversedAudioBuffers[channel] = reversedBuffer;
    return reversedBuffer;
}

function playBuffer(buffer, { startTrim, endTrim }, channel, time) {
    const source = audioCtx.createBufferSource();
    source.buffer = buffer;

    // Apply playback speed
    const playbackSpeed = globalPlaybackSpeeds[channel] || 1.0;
    source.playbackRate.value = playbackSpeed;

    // Create a gain node
    const gainNode = audioCtx.createGain();
    const volume = globalVolumeLevels[channel] || 1.0;
    gainNode.gain.value = volume;

    source.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    const startTime = startTrim * buffer.duration;
    const duration = (endTrim - startTrim) * buffer.duration;
    source.start(time, startTime, duration);

    const channelIndex = channel.startsWith("Channel ") ? parseInt(channel.replace("Channel ", ""), 10) - 1 : null;
    if (channelIndex === null) {
        return console.error("Invalid bufferKey format:", channel);
    }

    AudionalPlayerMessages.postMessage({ action: "activeStep", channelIndex, step: currentStep });
    document.dispatchEvent(new CustomEvent("internalAudioPlayback", { detail: { action: "activeStep", channelIndex, step: currentStep } }));
}

function playBufferAtTime(buffer, { startTrim, endTrim }, channel, time) {
    const source = audioCtx.createBufferSource();
    source.buffer = buffer;

    // Apply playback speed
    const playbackSpeed = globalPlaybackSpeeds[channel] || 1.0;
    source.playbackRate.value = playbackSpeed;

    // Create a gain node
    const gainNode = audioCtx.createGain();
    const volume = globalVolumeLevels[channel] || 1.0;
    gainNode.gain.value = volume;

    source.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    const startTime = startTrim * buffer.duration;
    const duration = (endTrim - startTrim) * buffer.duration;
    source.start(time, startTime, duration);

    console.log(`Channel ${channel}: Scheduled reverse play at ${time}, Start Time: ${startTime}, Duration: ${duration}, Volume: ${volume}, Speed: ${playbackSpeed}`);
}

function base64ToArrayBuffer(base64) {
    try {
        const binaryString = window.atob(base64);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        console.log(`[base64ToArrayBuffer] Successfully converted base64 to ArrayBuffer of length ${bytes.length}`);
        return bytes.buffer;
    } catch (error) {
        console.error("[base64ToArrayBuffer] Error converting base64 to ArrayBuffer: ", error);
        return null;
    }
}

function extractBase64FromHTML(htmlContent) {
    try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlContent, "text/html");
        const audioSourceElement = doc.querySelector("audio[data-audionalSampleName] source");

        if (audioSourceElement) {
            const src = audioSourceElement.getAttribute("src");
            console.log(`[extractBase64FromHTML] Audio source element found: ${src}`);
            if (/^data:audio\/(wav|mp3|mp4);base64,/.test(src.toLowerCase())) {
                console.log("[extractBase64FromHTML] Base64 encoded audio source found.");
                return src;
            } else if (/audio\//.test(src.toLowerCase())) {
                console.log("[extractBase64FromHTML] Direct audio source found.");
                return src;
            }
            console.error("[extractBase64FromHTML] Audio data does not start with expected base64 prefix.");
        } else {
            console.error("[extractBase64FromHTML] Could not find the audio source element in the HTML content.");
        }
    } catch (error) {
        console.error("[extractBase64FromHTML] Error parsing HTML content: ", error);
    }
    return null;
}

function calculateReversedTrimTimes(trimTimes) {
    return {
        startTrim: 1.0 - trimTimes.endTrim,
        endTrim: 1.0 - trimTimes.startTrim
    };
}
