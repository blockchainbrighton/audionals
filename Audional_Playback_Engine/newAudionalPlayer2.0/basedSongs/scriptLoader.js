// scriptLoader.js

// Define the scripts to be loaded
window.scriptsToLoad = [
    'https://ordinals.com/content/61895db1f0d62d24cea96570e66b92435a8a4979e3d3fef8041680ed2afeddc8i0', // 'audioContextManager.js
    'https://ordinals.com/content/1b036f9d60a04f0612af8c53753273f66339e69d7843138007eb3573703b1218i0', // 'jsonLoader.js'
    'https://ordinals.com/content/150e020d5e6ea8b53b7b3d2160f25f65c2e550d413f9c53d9e1cfb101d6914f2i0', // 'audioProcessing.js'
 // 'https://ordinals.com/content/9f6326c90ccce8a298573c0aac7f02b9e782cca4c73482ff1e2155af8cef1283i0', // Original non-modularised 'fileAndAudioHandling.js'
    'https://ordinals.com/content/935828577e4762caaf32b76a0f74cb4f37bdcdbdae1d27a7c93d000d5cfe9d28i0',          // 'commonUtils.js'
    'https://ordinals.com/content/bab2b37e0abcce41d784d65d94a5c3c266228c2d8bd3ecdee4fba7986f5a042ei0', // 'fileAndAudioHandling.js'
    'https://ordinals.com/content/1a5cafb61e4a320434fc4087e203d2a5f695ba9112635b960fc9d7dcb961d9fci0',      // 'playbackControl.js'
    'https://ordinals.com/content/a3d8a40fcde6935f16b49ad7c9e9aa185f01d1618f4e35828415f6cc27377a47i0',   // 'sequenceOperations.js'
    'https://ordinals.com/content/17c6cb4f92d47043da52ce8334c41961c588b7955488e56f08264840ef63a4eei0',     // 'workerOperations.js'

    
    // TITLES / CREDITS SCRIPTS (OPTIONAL)
    'visualiser/titleDisplays_2_minified.js',

    // 'https://ordinals.com/content/68268de54425d46e3bd8da0b7efb79f57fad18a777e3493c916457047efd3920i0', // colourPalette.js
    'colourSettingsFiles/colourPaletteINDEX_minified.js',
    'colourSettingsFiles/colourSettingsMaster.js',
    'colourSettingsFiles/colourSettingsLevel1INDEX.js',
    'colourSettingsFiles/colourSettingsLevel2INDEX.js',
    'colourSettingsFiles/colourSettingsLevel3INDEX.js',
    'colourSettingsFiles/colourSettingsLevel4INDEX.js',
    'colourSettingsFiles/colourSettingsLevel5INDEX.js',
    'colourSettingsFiles/colourSettingsLevel6INDEX.js',
    'colourSettingsFiles/colourSettingsLevel7INDEX.js',

    // 'visualiser/initVisualiser.js',
    'visualiser/visualiserCode.js',

];

// Load the main loader script
const mainLoaderScript = document.createElement('script');
mainLoaderScript.src = 'https://ordinals.com/content/0d81728a7d3eda3e4d9cdf6c8ca8f2c0701e1fdc183e77654440ba47760c7bc4i0';
document.head.appendChild(mainLoaderScript);
