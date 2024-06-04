// audioProcessor.js

function findAndSetEndSequence(playbackData) {
    if (playbackData && playbackData.sequences) {
        let previousSequence = null;
        for (const sequence of Object.values(playbackData.sequences)) {
            const isEmpty = Object.values(sequence.normalSteps).every(steps => steps.length === 0);
            if (isEmpty) {
                if (previousSequence) {
                    playbackData.endSequence = previousSequence;
                    console.log("End sequence set to:", previousSequence);
                    break;
                }
            }
            previousSequence = sequence;
        }
    }
}

async function fetchAndProcessAudioData(channelURLs) {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    await Promise.all(channelURLs.map((url, index) => processAudioUrl(url, index, audioContext)));

    globalAudioBuffers.forEach(bufferData => {
        reverseAudioBuffer(bufferData.buffer, bufferData.channel);
    });
}

async function processAudioUrl(url, index, audioContext) {
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Failed to fetch from URL: ${url}, Status: ${response.status}`);

        const contentType = response.headers.get("Content-Type");
        const audioBuffer = await fetchAndDecodeAudio(response, contentType, audioContext);

        if (audioBuffer) {
            globalAudioBuffers.push({ buffer: audioBuffer, channel: `Channel ${index + 1}` });
        } else {
            console.error(`Failed to decode audio for URL: ${url}`);
        }
    } catch (error) {
        console.error(`Error fetching or decoding audio for Channel ${index + 1}:`, error);
    }
}

async function fetchAndDecodeAudio(response, contentType, audioContext) {
    let arrayBuffer;
    if (/audio\/(wav|mpeg|mp4)|video\/mp4/.test(contentType)) {
        arrayBuffer = await response.arrayBuffer();
    } else {
        const textData = await response.text();
        let base64AudioData = null;
        if (/application\/json/.test(contentType)) {
            base64AudioData = JSON.parse(textData).audioData;
        } else if (/text\/html/.test(contentType)) {
            base64AudioData = extractBase64FromHTML(textData);
        }
        if (base64AudioData) {
            arrayBuffer = base64ToArrayBuffer(base64AudioData.split(",")[1]);
        }
    }
    if (arrayBuffer) {
        return audioContext.decodeAudioData(arrayBuffer);
    }
    console.error(`Unsupported content type: ${contentType}`);
    return null;
}


