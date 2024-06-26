// scriptLoader_NoBlobs.js

// Define the scripts to be loaded
window.scriptsToLoad = [
    'https://ordinals.com/content/61895db1f0d62d24cea96570e66b92435a8a4979e3d3fef8041680ed2afeddc8i0', // 'audioContextManager.js
    'https://ordinals.com/content/204885c72322cbaa0272bae20c992db17e4c88da9938bbff9ba1fa7dd325fa4bi0', // 'jsonLoader.js'
    'https://ordinals.com/content/150e020d5e6ea8b53b7b3d2160f25f65c2e550d413f9c53d9e1cfb101d6914f2i0', // 'audioProcessing.js'
    'https://ordinals.com/content/935828577e4762caaf32b76a0f74cb4f37bdcdbdae1d27a7c93d000d5cfe9d28i0',          // 'commonUtils.js'
    'https://ordinals.com/content/bab2b37e0abcce41d784d65d94a5c3c266228c2d8bd3ecdee4fba7986f5a042ei0', // 'fileAndAudioHandling.js'
    'https://ordinals.com/content/1a5cafb61e4a320434fc4087e203d2a5f695ba9112635b960fc9d7dcb961d9fci0',      // 'playbackControl.js'
    'https://ordinals.com/content/a3d8a40fcde6935f16b49ad7c9e9aa185f01d1618f4e35828415f6cc27377a47i0',   // 'sequenceOperations.js'
    'https://ordinals.com/content/17c6cb4f92d47043da52ce8334c41961c588b7955488e56f08264840ef63a4eei0',     // 'workerOperations.js'

    
    // TITLES / CREDITS SCRIPTS (OPTIONAL)

    'https://ordinals.com/content/4915e144695ab04171092a45e2d49cfa7b5e92c9a35ce612e7b749457acc92ddi0', // titleDisplays2.js

    'https://ordinals.com/content/3ab9dda407f9c7f62b46401e2664bc1496247c8950620a11a36a8601267cb42fi0', // colourPalette.js

    'https://ordinals.com/content/4a6164e05aee1d4ed77585bc85e4d4530801ef71e1c277c868ce374c4a7b9902i0', // colourSettingsMaster
    'https://ordinals.com/content/0505ae5cebbe9513648fc8e4ecee22d9969764f3cdac9cd6ec33be083c77ae96i0', // 'colourSettingsFiles/colourSettingsLevel0INDEX_minified.js',
    'https://ordinals.com/content/87bb49f5617a241e29512850176e53169c3da4a76444d5d8fcd6c1e41489a4b3i0', // 'colourSettingsFiles/colourSettingsLevel1INDEX_minified.js',
    'https://ordinals.com/content/cea34b6ad754f3a4e992976125bbd1dd59213aab3de03c9fe2eb10ddbe387f76i0', // 'colourSettingsFiles/colourSettingsLevel2INDEX_minified.js',
    'https://ordinals.com/content/bcee9a2e880510772f0129c735a4ecea5bb45277f3b99ff640c1bd393dddd6dfi0', // 'colourSettingsFiles/colourSettingsLevel3INDEX_minified.js',   
    'https://ordinals.com/content/90d910fe4088c53a16eb227ec2fe59802091dc4ea51564b2665090403c34f59ci0', // 'colourSettingsFiles/colourSettingsLevel4INDEX_minified.js',
    'https://ordinals.com/content/916fd1731cdecf82706a290d03448c6dc505c01d6ec44bbca20281a19723d617i0', // 'colourSettingsFiles/colourSettingsLevel5INDEX_minified.js',
    'https://ordinals.com/content/6a5e5c8b42793dd35512dfddd81dbbe211f052ac79839dd54b53461f5783a390i0', // 'colourSettingsFiles/colourSettingsLevel6INDEX_minified.js',
    'https://ordinals.com/content/c0ee69121238f6438be8398038301cf5b1d876cce30a0d45a3a5e0b927826940i0', // 'colourSettingsFiles/colourSettingsLevel7INDEX_minified.js',
    'https://ordinals.com/content/6f1def70a3290c50793773a8b1712c9a1b0561b3674ee50a06c13bc4e492f459i0', // initVisualiser
    'https://ordinals.com/content/c7c92a81d5279950be7d0bd3e755ad620551bc65e6e514d6f7c29b4c24465d0ai0', // visualiserHelperFunctions
    'https://ordinals.com/content/305829e076d38130be65851c79241929983f16d679822015ff237029f67d5d9ei0', // visualiserMessageHandling 
    'https://ordinals.com/content/0d8309856ec04e8ab5bd6aa4689429102378fb45368ad0e2787f0dfc72c66152i0', // visualiserWorkers_minified.js',
    'https://ordinals.com/content/287c837ecffc5b80d8e3c92c22b6dbf0447a3d916b95ee314c66909f6f2b2f3ci0', // 'visualiser/visualiserGeometry_minified.js'
    'https://ordinals.com/content/214457a4f832847565746ecb0b9460ec7dc8ad93549a00a69f18b3d492c0e005i0', // visualiserDrawingColours 

  
    'https://ordinals.com/content/466f20036924cef3c4b161bb59aa0537a5b4397517e56767603d967f5e47e9f5i0',   // 'visualiser/visualiserLoggingUtils_minified.js',
    'https://ordinals.com/content/e1d2c8691ee70e02cad50e28e2f6b30d678c9120f847e21c60f71635a856c27ai0',    // 'visualiser/visualiserLogInitialAssignments_minified.js',
    'https://ordinals.com/content/901b495545cc804a677d8ae3145f1e28342ebe8a40a118a990ec8c8b6e169410i0',    // 'visualiser/visualiserStateSetup_minified.js',
    'https://ordinals.com/content/e1d2c8691ee70e02cad50e28e2f6b30d678c9120f847e21c60f71635a856c27ai0',    // 'visualiser/visualiserStateAssignments_minified.js',
    'https://ordinals.com/content/63b496ffd5617898582acaecf4c2bcec5261a2c664b3adfb32e2e9ed601ef36ei0',    // 'visualiser/visualiserStateDownload_minified.js',

];

// Load the main loader script
const mainLoaderScript = document.createElement('script');
mainLoaderScript.src = 'loader_NoBlobs.js';
mainLoaderScript.onload = () => console.log("[debug] loader_NoBlobs.js loaded successfully.");
mainLoaderScript.onerror = () => console.error("[debug] Error loading loader_NoBlobs.js");
document.head.appendChild(mainLoaderScript);

