// songLoaderConfig_B.js

// Define the function to load a script
function loadScript(src, callback) {
    const script = document.createElement('script');
    script.src = src;
    script.onload = callback;
    document.head.appendChild(script);
}

// Load titleConfig.js first, then scriptLoader.js
loadScript('https://ordinals.com/content/e575d3519ca3d6eb6a8d34e4c969dee9ef72b84766fd3f8f2ed2aeead06a4f66i0', function() {
    // Once titleConfig.js is loaded, load scriptLoader.js
    loadScript('scriptLoader_NoBlobs.js');
});

// Use the deserialized data URL from pakoLoader.js
console.log("Deserialized Data URL:", window.jsonDataUrl);
