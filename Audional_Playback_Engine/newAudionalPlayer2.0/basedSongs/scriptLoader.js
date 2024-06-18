// scriptLoader.js

// Define the scripts to be loaded
window.scriptsToLoad = [
    'audioContextManager_minified.js',
    'jsonLoader_minified.js',
    'audioProcessing_minified.js',

    // TITLES / CREDITS SCRIPTS (OPTIONAL)
    'visualiser/titleDisplays.js',

    'fileAndAudioHandling_minified.js',
    'colourSettingsFiles/colourPaletteINDEX_minified.js',
    'colourSettingsFiles/colourSettingsLevel1INDEX.js',
    'colourSettingsFiles/colourSettingsLevel2INDEX_minified.js',
    'colourSettingsFiles/colourSettingsLevel3INDEX_minified.js',
    'visualiser/visualiserCode.js',

];

// Load the main loader script
const mainLoaderScript = document.createElement('script');
mainLoaderScript.src = 'loader_minified.js';
document.head.appendChild(mainLoaderScript);
