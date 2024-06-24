// pakoDeserialise.js

// linkToCompressedSongFiles.js

document.addEventListener('DOMContentLoaded', () => {
    const dataUrl = 'https://ordinals.com/content/4de39717229614a8736e9c751656e7e4eb39178eb7cc5ddc7cc6b534df7bbfd4i0'; // TRUTH COMPRESSED SONG FILE .gz
    loadMainScript(() => processSerializedData(dataUrl));

    document.getElementById('downloadFullData').addEventListener('click', () => {
        downloadDeserializedFile();
    });
});

function loadMainScript(callback) {
    const script = document.createElement('script');
    script.src = 'pakoDeserialise.js'; // Adjust the path as necessary
    script.onload = callback;
    document.head.appendChild(script);
}


async function loadPako() {
    try {
        const response = await fetch('https://ordinals.com/content/2109694f44c973892fb8152cf5c68607fb19288c045af1abc1716c1c3b4d69e6i0');
        const htmlContent = await response.text();
        
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = htmlContent;
        
        const scripts = tempDiv.querySelectorAll('script');
        let pakoScriptContent = '';
        
        for (let script of scripts) {
            if (script.textContent && script.textContent.includes('pako')) {
                pakoScriptContent = script.textContent;
                break;
            }
        }
        
        if (!pakoScriptContent) {
            throw new Error('Pako library not found in the HTML content.');
        }
        
        const pakoScript = document.createElement('script');
        pakoScript.textContent = pakoScriptContent;
        document.head.appendChild(pakoScript);
        
        console.log('Pako library loaded:', pako);
    } catch (error) {
        console.error('Error loading Pako:', error);
    }
}

loadPako();

const keyMap = {
    0: 'projectName',
    1: 'artistName',
    2: 'projectBPM',
    3: 'currentSequence',
    4: 'channelURLs',
    5: 'channelVolume',
    6: 'channelPlaybackSpeed',
    7: 'trimSettings',
    8: 'projectChannelNames',
    9: 'startSliderValue',
    10: 'endSliderValue',
    11: 'totalSampleDuration',
    12: 'start',
    13: 'end',
    14: 'projectSequences',
    15: 'steps'
};

const reverseKeyMap = Object.fromEntries(Object.entries(keyMap).map(([k, v]) => [v, +k]));
const channelMap = Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i)); // A-Z
const reverseChannelMap = Object.fromEntries(channelMap.map((letter, i) => [letter, i]));

const decompressSteps = compressedSteps => {
    const steps = [];

    compressedSteps.forEach(step => {
        if (typeof step === 'number') {
            steps.push(step);
        } else if (typeof step === 'object' && 'r' in step) {
            const [start, end] = step.r;
            for (let i = start; i <= end; i++) {
                steps.push(i);
            }
        } else if (typeof step === 'string' && step.endsWith('r')) {
            steps.push({ index: parseInt(step.slice(0, -1), 10), reverse: true });
        }
    });

    return steps;
};

const deserialize = serializedData => {
    const data = {};

    for (const [shortKey, value] of Object.entries(serializedData)) {
        const fullKey = keyMap[shortKey] ?? shortKey;

        if (Array.isArray(value)) {
            data[fullKey] = value.map(v => typeof v === 'object' ? deserialize(v) : v);
        } else if (typeof value === 'object' && value !== null) {
            data[fullKey] = fullKey === 'projectSequences'
                ? Object.entries(value).reduce((acc, [shortSeqKey, channels]) => {
                    const seqKey = shortSeqKey.replace('s', 'Sequence');
                    const expandedChannels = Object.entries(channels).reduce((chAcc, [letter, chValue]) => {
                        const chKey = `ch${reverseChannelMap[letter]}`;
                        chAcc[chKey] = { steps: decompressSteps(chValue[reverseKeyMap['steps']] || []) };
                        return chAcc;
                    }, {});
                    acc[seqKey] = expandedChannels;
                    return acc;
                }, {})
                : deserialize(value);
        } else {
            data[fullKey] = value;
        }
    }

    return data;
};

const processSerializedData = async (url) => {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        const compressedData = await response.arrayBuffer();

        if (typeof pako === 'undefined') {
            throw new Error('Pako library is not loaded.');
        }

        const decompressedData = pako.inflate(new Uint8Array(compressedData));

        const jsonString = new TextDecoder('utf-8').decode(decompressedData);
        const serializedData = JSON.parse(jsonString);
        const originalData = deserialize(serializedData);

        console.log('Deserialized Data:', originalData);

        deserializedDataBlob = new Blob([JSON.stringify(originalData, null, 2)], { type: 'application/json' });
        document.getElementById('downloadFullData').disabled = false;

        return originalData;
    } catch (error) {
        console.error('Error processing data:', error);
    }
};

const downloadDeserializedFile = () => {
    if (deserializedDataBlob) {
        const url = URL.createObjectURL(deserializedDataBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'fullyDeserializedData.json';
        a.click();
        URL.revokeObjectURL(url);
    } else {
        console.error('No deserialized data available for download.');
    }
};
