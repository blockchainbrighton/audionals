// processSerializedData.js

const processSerializedData = async (url) => {
    try {
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

        // Set window.jsonDataUrl to ensure it's defined
        window.jsonDataUrl = 'stored in localStorage';

        // Load the next script
        const scriptLoader = document.createElement('script');
        scriptLoader.src = 'songLoaderConfig_B_NoBlobs.js';
        document.head.appendChild(scriptLoader);

    } catch (error) {
        console.error('Error processing data:', error);
    }
};

// Helper function to dynamically load scripts
function loadScript(src, callback) {
    const script = document.createElement('script');
    script.src = src;
    script.onload = callback;
    script.onerror = () => console.error(`[debug] Error loading script: ${src}`);
    document.head.appendChild(script);
}
