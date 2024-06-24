// scriptLoader.js

// Define the scripts to be loaded
window.scriptsToLoad = [
    'https://ordinals.com/content/61895db1f0d62d24cea96570e66b92435a8a4979e3d3fef8041680ed2afeddc8i0', // 'audioContextManager.js
    'https://ordinals.com/content/1b036f9d60a04f0612af8c53753273f66339e69d7843138007eb3573703b1218i0', // 'jsonLoader.js'
    'https://ordinals.com/content/150e020d5e6ea8b53b7b3d2160f25f65c2e550d413f9c53d9e1cfb101d6914f2i0', // 'audioProcessing.js'
    'https://ordinals.com/content/935828577e4762caaf32b76a0f74cb4f37bdcdbdae1d27a7c93d000d5cfe9d28i0',          // 'commonUtils.js'
    'https://ordinals.com/content/bab2b37e0abcce41d784d65d94a5c3c266228c2d8bd3ecdee4fba7986f5a042ei0', // 'fileAndAudioHandling.js'
    'https://ordinals.com/content/1a5cafb61e4a320434fc4087e203d2a5f695ba9112635b960fc9d7dcb961d9fci0',      // 'playbackControl.js'
    'https://ordinals.com/content/a3d8a40fcde6935f16b49ad7c9e9aa185f01d1618f4e35828415f6cc27377a47i0',   // 'sequenceOperations.js'
    'https://ordinals.com/content/17c6cb4f92d47043da52ce8334c41961c588b7955488e56f08264840ef63a4eei0',     // 'workerOperations.js'

    
    // TITLES / CREDITS SCRIPTS (OPTIONAL)
    // titleDisplays - 4915e144695ab04171092a45e2d49cfa7b5e92c9a35ce612e7b749457acc92ddi0
    'https://ordinals.com/content/4915e144695ab04171092a45e2d49cfa7b5e92c9a35ce612e7b749457acc92ddi0', // colourPalette.js
    // 'titleDisplays/titleDisplays_2_minified.js',
    // 'https://ordinals.com/content/68268de54425d46e3bd8da0b7efb79f57fad18a777e3493c916457047efd3920i0', // colourPalette.js
    // colourPalette  - 3ab9dda407f9c7f62b46401e2664bc1496247c8950620a11a36a8601267cb42fi0
    'https://ordinals.com/content/3ab9dda407f9c7f62b46401e2664bc1496247c8950620a11a36a8601267cb42fi0',
    // 'colourSettingsFiles/colourPaletteINDEX_minified.js',
    // colourSettingsMaster.js - 
    'https://ordinals.com/content/4a6164e05aee1d4ed77585bc85e4d4530801ef71e1c277c868ce374c4a7b9902i0',
    // 'colourSettingsFiles/colourSettingsMaster_minified.js',
    // LVL 0 0505ae5cebbe9513648fc8e4ecee22d9969764f3cdac9cd6ec33be083c77ae96i0
    'https://ordinals.com/content/0505ae5cebbe9513648fc8e4ecee22d9969764f3cdac9cd6ec33be083c77ae96i0',
    // 'colourSettingsFiles/colourSettingsLevel0INDEX_minified.js',
    // LVL 1 87bb49f5617a241e29512850176e53169c3da4a76444d5d8fcd6c1e41489a4b3i0
    'https://ordinals.com/content/87bb49f5617a241e29512850176e53169c3da4a76444d5d8fcd6c1e41489a4b3i0',
    // 'colourSettingsFiles/colourSettingsLevel1INDEX_minified.js',
    // LVL 2 cea34b6ad754f3a4e992976125bbd1dd59213aab3de03c9fe2eb10ddbe387f76i0
    'https://ordinals.com/content/cea34b6ad754f3a4e992976125bbd1dd59213aab3de03c9fe2eb10ddbe387f76i0',
    // 'colourSettingsFiles/colourSettingsLevel2INDEX_minified.js',
    // LVL 3 bcee9a2e880510772f0129c735a4ecea5bb45277f3b99ff640c1bd393dddd6dfi0 
    'https://ordinals.com/content/bcee9a2e880510772f0129c735a4ecea5bb45277f3b99ff640c1bd393dddd6dfi0',   
    // 'colourSettingsFiles/colourSettingsLevel3INDEX_minified.js',
    // LVL 4 90d910fe4088c53a16eb227ec2fe59802091dc4ea51564b2665090403c34f59ci0
    'https://ordinals.com/content/90d910fe4088c53a16eb227ec2fe59802091dc4ea51564b2665090403c34f59ci0',
    // 'colourSettingsFiles/colourSettingsLevel4INDEX_minified.js',
    // LVL 5 916fd1731cdecf82706a290d03448c6dc505c01d6ec44bbca20281a19723d617i0
    'https://ordinals.com/content/916fd1731cdecf82706a290d03448c6dc505c01d6ec44bbca20281a19723d617i0',
    // 'colourSettingsFiles/colourSettingsLevel5INDEX_minified.js',
    // LVL 6 6a5e5c8b42793dd35512dfddd81dbbe211f052ac79839dd54b53461f5783a390i0
    'https://ordinals.com/content/6a5e5c8b42793dd35512dfddd81dbbe211f052ac79839dd54b53461f5783a390i0',
    // 'colourSettingsFiles/colourSettingsLevel6INDEX_minified.js',
    // LVL 7 c0ee69121238f6438be8398038301cf5b1d876cce30a0d45a3a5e0b927826940i0
    'https://ordinals.com/content/c0ee69121238f6438be8398038301cf5b1d876cce30a0d45a3a5e0b927826940i0',
    // 'colourSettingsFiles/colourSettingsLevel7INDEX_minified.js',
    // initVisualiser - 6f1def70a3290c50793773a8b1712c9a1b0561b3674ee50a06c13bc4e492f459i0
    'https://ordinals.com/content/6f1def70a3290c50793773a8b1712c9a1b0561b3674ee50a06c13bc4e492f459i0',
    // 'visualiser/initVisualiser_minified.js',
    // helperFunctions - c7c92a81d5279950be7d0bd3e755ad620551bc65e6e514d6f7c29b4c24465d0ai0
    'https://ordinals.com/content/c7c92a81d5279950be7d0bd3e755ad620551bc65e6e514d6f7c29b4c24465d0ai0',
    // 'visualiser/visualiserHelperFunctions_minified.js',
    // visualiserLogging - 99ecc0668e27f03cf202f9ebc49d0332ac8f594bc9b5483969108b83723a0e9di0
    'https://ordinals.com/content/99ecc0668e27f03cf202f9ebc49d0332ac8f594bc9b5483969108b83723a0e9di0',
    // 'visualiser/visualiserLogging_minified.js',
    // visualiserMessageHandling - 305829e076d38130be65851c79241929983f16d679822015ff237029f67d5d9ei0
    'https://ordinals.com/content/305829e076d38130be65851c79241929983f16d679822015ff237029f67d5d9ei0',
    // 'visualiser/visualiserMessageHandling_minified.js',
    // visualiserWorkers - 0d8309856ec04e8ab5bd6aa4689429102378fb45368ad0e2787f0dfc72c66152i0
    'https://ordinals.com/content/0d8309856ec04e8ab5bd6aa4689429102378fb45368ad0e2787f0dfc72c66152i0',
    // 'visualiser/visualiserWorkers_minified.js',
    // visualiserGeometry - 287c837ecffc5b80d8e3c92c22b6dbf0447a3d916b95ee314c66909f6f2b2f3ci0
    'https://ordinals.com/content/287c837ecffc5b80d8e3c92c22b6dbf0447a3d916b95ee314c66909f6f2b2f3ci0',
    // 'visualiser/visualiserGeometry_minified.js',
    // visualiserDrawingColours - 214457a4f832847565746ecb0b9460ec7dc8ad93549a00a69f18b3d492c0e005i0
    'https://ordinals.com/content/214457a4f832847565746ecb0b9460ec7dc8ad93549a00a69f18b3d492c0e005i0',
    // 'visualiser/visualiserDrawingColours_minified.js',
];
// Load the main loader script
const mainLoaderScript = document.createElement('script');
mainLoaderScript.src = 'https://ordinals.com/content/0d81728a7d3eda3e4d9cdf6c8ca8f2c0701e1fdc183e77654440ba47760c7bc4i0';
document.head.appendChild(mainLoaderScript);
