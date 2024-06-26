// arraysAndInitialization.js

const scriptFiles = [
    'scripts/audionalPlayerScripts.js',
    'scripts/titleDisplayScripts.js',
    'scripts/colourPaletteScrips.js',
    'scripts/colourSettingsScripts.js',
    'scripts/visualiserScripts.js',
    'scripts/visualiserLoggingScripts.js'
];

function initializeScripts() {
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
}
