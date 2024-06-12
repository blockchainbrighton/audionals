// audioProcessing.js

async function fetchAndProcessAudioData(channelURLs) {
    await Promise.all(channelURLs.map((url, index) => processAudioUrl(url, index + 1, audioCtx)));

    // Create reversed buffers only for channels with reverse steps
    createReversedBuffersForChannelsWithReverseSteps();
}

async function processAudioUrl(url, channelIndex, audioContext) {
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Failed to fetch from URL: ${url}, Status: ${response.status}`);
        
        const contentType = response.headers.get("Content-Type");
        const audioBuffer = await fetchAndDecodeAudio(response, contentType, audioContext);

        if (audioBuffer) {
            // Create a new gain node for this channel
            const gainNode = audioContext.createGain();
            const channelVolume = parseVolumeLevel(globalVolumeLevels[`Channel ${channelIndex}`]);
            const adjustedVolume = channelVolume * globalVolumeMultiplier;
            gainNode.gain.value = adjustedVolume;

            console.log(`[processAudioUrl] Channel ${channelIndex}: Gain node set with volume level: ${adjustedVolume} (original: ${channelVolume}, multiplier: ${globalVolumeMultiplier})`);

            // Apply fade-in/out to the buffer
            const processedBuffer = applyFadeInOut(audioBuffer, audioContext);
            globalAudioBuffers.push({ buffer: processedBuffer, gainNode, channel: `Channel ${channelIndex}` });
        } else {
            console.error(`Failed to decode audio for Channel ${channelIndex}:`, url);
        }
    } catch (error) {
        console.error(`Error processing audio URL for Channel ${channelIndex}:`, error);
    }
}



function setGlobalVolumeMultiplier(multiplier) {
    globalVolumeMultiplier = Math.max(0.0, multiplier);  // Ensure multiplier is not negative

    console.log(`[setGlobalVolumeMultiplier] Global volume multiplier set to ${globalVolumeMultiplier}`);

    // Update existing gain nodes
    globalAudioBuffers.forEach(({ gainNode, channel }) => {
        const channelVolume = parseVolumeLevel(globalVolumeLevels[channel]);
        gainNode.gain.value = channelVolume * globalVolumeMultiplier;
        console.log(`[setGlobalVolumeMultiplier] Adjusted ${channel} volume to ${gainNode.gain.value} (original: ${channelVolume})`);
    });
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

function createReversedBuffersForChannelsWithReverseSteps() {
    const channelsWithReverseSteps = new Set();

    for (const sequence of Object.values(globalJsonData.projectSequences)) {
        for (const [channelName, channelData] of Object.entries(sequence)) {
            if (channelData.steps.some(step => step.reverse)) {
                channelsWithReverseSteps.add(`Channel ${parseInt(channelName.slice(2)) + 1}`);
            }
        }
    }

    globalAudioBuffers.forEach(({ buffer, gainNode, channel }) => {
        if (channelsWithReverseSteps.has(channel)) {
            globalReversedAudioBuffers[channel] = createReversedBuffer(buffer);
            console.log(`Reversed audio buffers created for ${channel} with gain value: ${gainNode.gain.value}`);
        }
    });

    console.log("Channels with reverse steps:", [...channelsWithReverseSteps]);
}


function createReversedBuffer(buffer) {
    const reversedBuffer = audioCtx.createBuffer(
        buffer.numberOfChannels,
        buffer.length,
        buffer.sampleRate
    );

    for (let i = 0; i < buffer.numberOfChannels; i++) {
        const channelData = buffer.getChannelData(i);
        reversedBuffer.getChannelData(i).set([...channelData].reverse());
    }

    return reversedBuffer;
}

function clampVolume(volume) {
    return Math.max(0.0, Math.min(volume, 3.0));
}

function parseVolumeLevel(level) {
    const defaultVolume = 1.0;
    let volume = defaultVolume;

    if (typeof level === 'number') {
        volume = level;
    } else if (typeof level === 'string') {
        volume = parseFloat(level);
    }

    if (isNaN(volume)) {
        volume = defaultVolume;
    }

    const clampedVolume = clampVolume(volume);

    console.log(`[parseVolumeLevel] Input level: ${level}, Parsed volume: ${volume}, Clamped volume: ${clampedVolume}`);

    return clampedVolume;
}


function applyFadeInOut(buffer, audioContext, fadeDuration = 0.01) {
    const shortBufferThreshold = 5; // Duration below which buffers are considered short (in seconds)
    const bufferDuration = buffer.duration;
    const sampleRate = buffer.sampleRate;

    if (bufferDuration < shortBufferThreshold) {
        // Skip fading for very short buffers to preserve transients
        console.log(`[applyFadeInOut] Skipped fading for short buffer with duration ${bufferDuration}`);
        return buffer;
    }

    const fadeInSamples = fadeDuration * sampleRate;
    const fadeOutSamples = fadeDuration * sampleRate;

    const newBuffer = audioContext.createBuffer(
        buffer.numberOfChannels,
        buffer.length,
        sampleRate
    );

    for (let i = 0; i < buffer.numberOfChannels; i++) {
        const inputData = buffer.getChannelData(i);
        const outputData = newBuffer.getChannelData(i);

        for (let j = 0; j < buffer.length; j++) {
            if (j < fadeInSamples) {
                // Apply fade-in
                outputData[j] = inputData[j] * (j / fadeInSamples);
            } else if (j > buffer.length - fadeOutSamples) {
                // Apply fade-out
                outputData[j] = inputData[j] * ((buffer.length - j) / fadeOutSamples);
            } else {
                outputData[j] = inputData[j];
            }
        }
    }

    console.log(`[applyFadeInOut] Applied fade-in and fade-out to buffer with duration ${bufferDuration}`);

    return newBuffer;
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
        console.error("[base64ToArrayBuffer] Error converting base64 to ArrayBuffer:", error);
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
        console.error("[extractBase64FromHTML] Error parsing HTML content:", error);
    }
    return null;
}
