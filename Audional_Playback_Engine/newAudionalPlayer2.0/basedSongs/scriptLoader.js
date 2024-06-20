// scriptLoader.js

// Original script loading order


// 'jsonLoader.js',
//     
// 'audioProcessing.js',
// 
// 'fileAndAudioHandling.js',


// Define the scripts to be loaded
window.scriptsToLoad = [
    'https://ordinals.com/content/61895db1f0d62d24cea96570e66b92435a8a4979e3d3fef8041680ed2afeddc8i0', // 'audioContextManager.js
    'https://ordinals.com/content/1b036f9d60a04f0612af8c53753273f66339e69d7843138007eb3573703b1218i0', // 'jsonLoader.js'
    'https://ordinals.com/content/150e020d5e6ea8b53b7b3d2160f25f65c2e550d413f9c53d9e1cfb101d6914f2i0', // 'audioProcessing.js'
    // 'https://ordinals.com/content/9f6326c90ccce8a298573c0aac7f02b9e782cca4c73482ff1e2155af8cef1283i0', // 'fileAndAudioHandling.js'
    'fileAndAudioHandling.js',
    // TITLES / CREDITS SCRIPTS (OPTIONAL)
    'visualiser/titleDisplays_minified.js',


    'colourSettingsFiles/colourPaletteINDEX_minified.js',
    'colourSettingsFiles/colourSettingsLevel1INDEX.js',
    'colourSettingsFiles/colourSettingsLevel2INDEX.js',
    'colourSettingsFiles/colourSettingsLevel3INDEX.js',
    'colourSettingsFiles/colourSettingsLevel4INDEX.js',
    'colourSettingsFiles/colourSettingsLevel5INDEX.js',
    'colourSettingsFiles/colourSettingsLevel6INDEX.js',
    'visualiser/visualiserCode.js',

];

// Load the main loader script
const mainLoaderScript = document.createElement('script');
mainLoaderScript.src = 'loader_minified.js';
document.head.appendChild(mainLoaderScript);
