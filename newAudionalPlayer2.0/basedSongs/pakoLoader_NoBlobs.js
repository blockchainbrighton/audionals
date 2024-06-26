// pakoLoader_NoBlobs.js

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
    return compressedSteps.flatMap(step => {
        if (typeof step === 'number') {
            return step;
        } else if (typeof step === 'object' && 'r' in step) {
            const [start, end] = step.r;
            return Array.from({ length: end - start + 1 }, (_, i) => start + i);
        } else if (typeof step === 'string' && step.endsWith('r')) {
            return { index: parseInt(step.slice(0, -1), 10), reverse: true };
        }
    });
};

const deserialize = serializedData => {
    const recursiveDeserialize = data => {
        if (Array.isArray(data)) {
            return data.map(v => typeof v === 'object' ? recursiveDeserialize(v) : v);
        } else if (typeof data === 'object' && data !== null) {
            return Object.entries(data).reduce((acc, [shortKey, value]) => {
                const fullKey = keyMap[shortKey] ?? shortKey;
                acc[fullKey] = fullKey === 'projectSequences'
                    ? Object.entries(value).reduce((seqAcc, [shortSeqKey, channels]) => {
                        const seqKey = shortSeqKey.replace('s', 'Sequence');
                        seqAcc[seqKey] = Object.entries(channels).reduce((chAcc, [letter, chValue]) => {
                            const chKey = `ch${reverseChannelMap[letter]}`;
                            chAcc[chKey] = { steps: decompressSteps(chValue[reverseKeyMap['steps']] || []) };
                            return chAcc;
                        }, {});
                        return seqAcc;
                    }, {})
                    : recursiveDeserialize(value);
                return acc;
            }, {});
        }
        return data;
    };
    return recursiveDeserialize(serializedData);
};

const loadPako = async () => {
    try {
        const response = await fetch('https://ordinals.com/content/2109694f44c973892fb8152cf5c68607fb19288c045af1abc1716c1c3b4d69e6i0');
        const htmlContent = await response.text();
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = htmlContent;
        const scripts = tempDiv.querySelectorAll('script');
        const pakoScript = Array.from(scripts).find(script => script.textContent.includes('pako'));

        if (!pakoScript) {
            throw new Error('Pako library not found in the HTML content.');
        }

        const scriptElement = document.createElement('script');
        scriptElement.textContent = pakoScript.textContent;
        document.head.appendChild(scriptElement);
        console.log('Pako library loaded:', pako);
    } catch (error) {
        console.error('Error loading Pako:', error);
    }
};

// const processSerializedData = async (url) => {
//     try {
//         await loadPako();
//         const response = await fetch(url);

//         if (!response.ok) {
//             throw new Error('Network response was not ok');
//         }

//         const compressedData = await response.arrayBuffer();
//         const decompressedData = pako.inflate(new Uint8Array(compressedData));
//         const jsonString = new TextDecoder('utf-8').decode(decompressedData);
//         const serializedData = JSON.parse(jsonString);
//         const originalData = deserialize(serializedData);
//         console.log('Deserialized Data:', originalData);

//         // Create a Blob from the deserialized data and set the URL
//         const blob = new Blob([JSON.stringify(originalData)], { type: 'application/json' });
//         window.jsonDataUrl = URL.createObjectURL(blob);

//         // Load the next script
//         const scriptLoader = document.createElement('script');
//         scriptLoader.src = 'songLoaderConfig_B_NoBlobs.js';
//         document.head.appendChild(scriptLoader);

//     } catch (error) {
//         console.error('Error processing data:', error);
//     }
// };

const processSerializedData = async (url) => {
    try {
        await loadPako();
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error('Network response was not ok');
        }

        const compressedData = await response.arrayBuffer();
        const decompressedData = pako.inflate(new Uint8Array(compressedData));
        const jsonString = new TextDecoder('utf-8').decode(decompressedData);
        const serializedData = JSON.parse(jsonString);
        const originalData = deserialize(serializedData);
        console.log('Deserialized Data:', originalData);

        // Store the deserialized data in localStorage
        localStorage.setItem('jsonData', JSON.stringify(originalData));

        // Load the next script
        const scriptLoader = document.createElement('script');
        scriptLoader.src = 'songLoaderConfig_B_NoBlobs.js';
        document.head.appendChild(scriptLoader);

    } catch (error) {
        console.error('Error processing data:', error);
    }
};

// Function to retrieve data from localStorage and simulate the old jsonDataUrl usage
const getJsonData = () => {
    const data = localStorage.getItem('jsonData');
    if (data) {
        return JSON.parse(data);
    } else {
        console.error('No data found in localStorage');
        return null;
    }
};
