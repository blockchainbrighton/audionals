// songLoaderConfig_B_NoBlobs.js

// Define the function to load a script
function loadScript(src, callback) {
    const script = document.createElement('script');
    script.src = src;
    script.onload = callback;
    script.onerror = () => console.error(`[debug] Error loading script: ${src}`);
    document.head.appendChild(script);
}

// Load titleConfig.js first, then scriptLoader.js
loadScript('https://ordinals.com/content/e575d3519ca3d6eb6a8d34e4c969dee9ef72b84766fd3f8f2ed2aeead06a4f66i0', function() {
    console.log("[debug] titleConfig.js loaded successfully.");
    // Once titleConfig.js is loaded, log the deserialized data URL
    console.log("Deserialized Data URL:", window.jsonDataUrl);

    // Load the next script
    loadScript('scriptLoaderMaster_NoBlobs.js', () => {
        console.log("[debug] scriptLoader_NoBlobsB.js loaded successfully.");
    });
});
