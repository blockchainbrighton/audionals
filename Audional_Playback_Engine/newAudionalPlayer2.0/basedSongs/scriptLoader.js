// scriptLoader.js

// Define the scripts to be loaded
window.scriptsToLoad = [
    'audioContextManager.js',
    'jsonLoader_minified.js',
    'audioProcessing.js',

    // TITLES / CREDITS SCRIPTS (OPTIONAL)
    'visualiser/titleDisplays.js',

    'fileAndAudioHandling.js',
    'colourSettingsFiles/colourPaletteINDEX_minified.js',
    'colourSettingsFiles/colourSettingsLevel1INDEX.js',
    'colourSettingsFiles/colourSettingsLevel2INDEX.js',
    'colourSettingsFiles/colourSettingsLevel3INDEX.js',
    'visualiser/visualiserCode_minified.js',

];

// Load the main loader script
const mainLoaderScript = document.createElement('script');
mainLoaderScript.src = 'loader_minified.js';
document.head.appendChild(mainLoaderScript);
