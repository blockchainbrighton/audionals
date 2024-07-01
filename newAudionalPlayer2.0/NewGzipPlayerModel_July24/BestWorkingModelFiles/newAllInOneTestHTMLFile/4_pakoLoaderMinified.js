// 3_pakoLoader_minified.js

const keyMap = {
    0: "projectName",
    1: "artistName",
    2: "projectBPM",
    3: "currentSequence",
    4: "channelURLs",
    5: "channelVolume",
    6: "channelPlaybackSpeed",
    7: "trimSettings",
    8: "projectChannelNames",
    9: "startSliderValue",
    10: "endSliderValue",
    11: "totalSampleDuration",
    12: "start",
    13: "end",
    14: "projectSequences",
    15: "steps"
};

const reverseKeyMap = Object.fromEntries(Object.entries(keyMap).map(([key, value]) => [value, +key]));

const channelMap = Array.from({ length: 26 }, (_, index) => String.fromCharCode(65 + index));
const reverseChannelMap = Object.fromEntries(channelMap.map((char, index) => [char, index]));

const decompressSteps = (steps) => steps.flatMap(step => {
    if (typeof step === "number") return step;
    if (typeof step === "object" && "r" in step) {
        const [start, end] = step.r;
        return Array.from({ length: end - start + 1 }, (_, index) => start + index);
    }
    if (typeof step === "string" && step.endsWith("r")) {
        return { index: parseInt(step.slice(0, -1), 10), reverse: true };
    }
});

const deserialize = (data) => {
    const transform = (obj) => {
        if (Array.isArray(obj)) return obj.map(item => (typeof item === "object" ? transform(item) : item));
        if (typeof obj === "object" && obj !== null) {
            return Object.entries(obj).reduce((acc, [key, value]) => {
                const mappedKey = keyMap[key] ?? key;
                acc[mappedKey] = mappedKey === "projectSequences" 
                    ? Object.entries(value).reduce((seqAcc, [seqKey, seqValue]) => {
                        seqAcc[seqKey.replace("s", "Sequence")] = Object.entries(seqValue).reduce((chAcc, [chKey, chValue]) => {
                            chAcc[`ch${reverseChannelMap[chKey]}`] = { steps: decompressSteps(chValue[reverseKeyMap.steps] || []) };
                            return chAcc;
                        }, {});
                        return seqAcc;
                    }, {})
                    : transform(value);
                return acc;
            }, {});
        }
        return obj;
    };
    return transform(data);
};

const loadPako = async () => {
    try {
        const response = await fetch("https://ordinals.com/content/2109694f44c973892fb8152cf5c68607fb19288c045af1abc1716c1c3b4d69e6i0");
        const text = await response.text();
        const container = document.createElement("div");
        container.innerHTML = text;
        const scriptElements = container.querySelectorAll("script");
        const pakoScript = Array.from(scriptElements).find(script => script.textContent.includes("pako"));

        if (!pakoScript) throw new Error("Pako library not found in the HTML content.");

        const script = document.createElement("script");
        script.textContent = pakoScript.textContent;
        document.head.appendChild(script);
        console.log("Pako library loaded:", pako);
    } catch (error) {
        console.error("Error loading Pako:", error);
    }
};

const processSerializedData = async (url) => {
    try {
        await loadPako();
        const response = await fetch(url);
        if (!response.ok) throw new Error("Network response was not ok");

        const arrayBuffer = await response.arrayBuffer();
        const inflatedData = pako.inflate(new Uint8Array(arrayBuffer));
        const decodedData = new TextDecoder("utf-8").decode(inflatedData);
        const jsonData = JSON.parse(decodedData);
        const deserializedData = deserialize(jsonData);

        console.log("Deserialized Data:", deserializedData);

        const blob = new Blob([JSON.stringify(deserializedData)], { type: "application/json" });
        window.jsonDataUrl = URL.createObjectURL(blob);

        const scriptSrc = "5_songLoaderConfig_B.js";  // Absolute path
        console.log("Loading script from:", scriptSrc);
        const script = document.createElement("script");
        script.src = scriptSrc;
        document.head.appendChild(script);
    } catch (error) {
        console.error("Error processing data:", error);
    }
};

