// scriptLoaderMaster.js

function loadScript(src, callback) {
    const script = document.createElement('script');
    script.src = src;
    script.onload = () => {
        console.log(`[debug] Loaded script: ${src}`);
        callback();
    };
    script.onerror = () => console.error(`[debug] Error loading script: ${src}`);
    document.head.appendChild(script);
}

function loadScriptsInOrder(scripts, finalCallback) {
    const loadNextScript = (index) => {
        if (index >= scripts.length) {
            finalCallback();
            return;
        }
        loadScript(scripts[index], () => loadNextScript(index + 1));
    };
    loadNextScript(0);
}

const scriptFiles = [
    'scripts/audionalPlayerScripts.js',
    'scripts/titleDisplayScripts.js',
    'scripts/colourPaletteScrips.js',
    'scripts/colourSettingsScripts.js',
    'scripts/visualiserScripts.js',
    'scripts/visualiserLoggingScripts.js'
];

loadScriptsInOrder(scriptFiles, () => {
    // Combine all script arrays into the main scriptsToLoad array
    window.scriptsToLoad = [
        ...window.audionalPlayerScripts,
        ...window.titleDisplayScripts,
        ...window.colourPaletteScrips,
        ...window.colourSettingsScripts,
        ...window.visualiserScripts,
        ...window.visualiserLoggingScripts
    ];

    // Load the main loader script
    loadScript('loader_NoBlobs.js', () => {
        console.log("[debug] loader_NoBlobs.js loaded successfully.");
    });
});
