// arraysAndInitialization.js

const scriptFiles = [
    'scripts/audionalPlayerScripts.js',   //  '/content/864fbde24ef29877a06ccb0cb2291631b5599c764711617c3dfaae755f92518ei0',   // 'scripts/audionalPlayerScripts.js',      
    'scripts/titleDisplayScripts.js',     //  '/content/5e2a8243e075f7a23e94f9bd4de5154c260f4157317bce504372523cf8d24c8ai0',   // 'scripts/titleDisplayScripts.js',
    'scripts/colourPaletteScrips.js',     //  '/content/7e14b0798d8244ba8b94a9e474a05000ccc335aa51aa69b06b53bea73224fa71i0',   // 'scripts/colourPaletteScrips.js',
    'scripts/colourSettingsScripts.js',   //  '/content/9a90ce273218fdf878e9c36e35f4ac4ebf47f9fb93ba00eabfe8a51958b90b4ei0',   // 'scripts/colourSettingsScripts.js',
    'scripts/visualiserScripts.js',       //  '/content/c0a912d642dba6d9e02ac59744c516b88d052630301f410535e6167809cd8ceai0',   // 'scripts/visualiserScripts.js',
    'scripts/visualiserLoggingScripts.js' //  '/content/fd3da6a5f15f8a379e7219302997ae07d152d69ba413a0e36cb9bb85cbb1f14fi0',   // 'scripts/visualiserLoggingScripts.js'
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
        loadScript('https://ordinals.com/content/f9b3a2f4a426432ead5c01e2e80c18cc7eb14f567cbea8254f66f7fa5a7d0061i0', () => {
            console.log("[debug] loader_NoBlobs.js loaded successfully.");
        });
    });
}