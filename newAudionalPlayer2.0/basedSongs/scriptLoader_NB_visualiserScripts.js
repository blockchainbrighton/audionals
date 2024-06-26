// scriptLoader_NB_visualiserScripts.js

window.visualizerScriptsToLoad = [
    'https://ordinals.com/content/6f1def70a3290c50793773a8b1712c9a1b0561b3674ee50a06c13bc4e492f459i0', // initVisualiser.js
    'https://ordinals.com/content/c7c92a81d5279950be7d0bd3e755ad620551bc65e6e514d6f7c29b4c24465d0ai0', // visualiserHelperFunctions.js
    'https://ordinals.com/content/305829e076d38130be65851c79241929983f16d679822015ff237029f67d5d9ei0', // visualiserMessageHandling.js
    'https://ordinals.com/content/0d8309856ec04e8ab5bd6aa4689429102378fb45368ad0e2787f0dfc72c66152i0', // visualiserWorkers.js
    'https://ordinals.com/content/287c837ecffc5b80d8e3c92c22b6dbf0447a3d916b95ee314c66909f6f2b2f3ci0', // visualiserGeometry.js
    'https://ordinals.com/content/214457a4f832847565746ecb0b9460ec7dc8ad93549a00a69f18b3d492c0e005i0', // visualiserDrawingColours.js
    'visualiser/visualiserLoggingUtils_minified.js',
    'visualiser/visualiserLogInitialAssignments_minified.js',
    'visualiser/visualiserStateSetup_minified.js',
    'visualiser/visualiserStateAssignments_minified.js',
    'visualiser/visualiserStateDownload_minified.js',
];

// Ensure DOM is ready before loading these scripts
document.addEventListener('DOMContentLoaded', () => {
    loadNextScripts(window.visualizerScriptsToLoad, () => {
        const mainLoaderScript = document.createElement('script');
        mainLoaderScript.src = 'https://ordinals.com/content/f9b3a2f4a426432ead5c01e2e80c18cc7eb14f567cbea8254f66f7fa5a7d0061i0';
        document.head.appendChild(mainLoaderScript);
    });
});
