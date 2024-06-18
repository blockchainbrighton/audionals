// scriptLoader.js

// Define the scripts to be loaded
window.scriptsToLoad = [
    'audioContextManager_minified.js',
    'jsonLoader_minified.js',
    'audioProcessing_minified.js',

    // TITLES / CREDITS SCRIPTS (OPTIONAL)
    'visualiser/titleDisplays.js',

    'fileAndAudioHandling_minified.js',
    'colourSettingsFiles/colourPaletteINDEX.js',
    'colourSettingsFiles/colourSettingsLevel1INDEX.js',
    'colourSettingsFiles/colourSettingsLevel2INDEX.js',
    'colourSettingsFiles/colourSettingsLevel3INDEX.js',
    'colourSettingsFiles/colourSettingsLevel4INDEX.js',
    'colourSettingsFiles/colourSettingsLevel5INDEX.js',
    'colourSettingsFiles/colorWorker.js',
    'colourSettingsFiles/colourSettingsLevel6INDEX.js',
    'visualiser/visualiserCode.js',

];

// Load the main loader script
const mainLoaderScript = document.createElement('script');
mainLoaderScript.src = 'loader_minified.js';
document.head.appendChild(mainLoaderScript);
