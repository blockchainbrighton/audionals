// scriptLoader_NB_titleColorPaletteScripts.js

window.titleColorPaletteScriptsToLoad = [
    'https://ordinals.com/content/4915e144695ab04171092a45e2d49cfa7b5e92c9a35ce612e7b749457acc92ddi0', // titleDisplays2.js
    'https://ordinals.com/content/3ab9dda407f9c7f62b46401e2664bc1496247c8950620a11a36a8601267cb42fi0', // colourPalette.js
    'https://ordinals.com/content/4a6164e05aee1d4ed77585bc85e4d4530801ef71e1c277c868ce374c4a7b9902i0', // colourSettingsMaster.js
    'https://ordinals.com/content/0505ae5cebbe9513648fc8e4ecee22d9969764f3cdac9cd6ec33be083c77ae96i0', // LVL 0
    'https://ordinals.com/content/87bb49f5617a241e29512850176e53169c3da4a76444d5d8fcd6c1e41489a4b3i0', // LVL 1
    'https://ordinals.com/content/cea34b6ad754f3a4e992976125bbd1dd59213aab3de03c9fe2eb10ddbe387f76i0', // LVL 2
    'https://ordinals.com/content/bcee9a2e880510772f0129c735a4ecea5bb45277f3b99ff640c1bd393dddd6dfi0', // LVL 3
    'https://ordinals.com/content/90d910fe4088c53a16eb227ec2fe59802091dc4ea51564b2665090403c34f59ci0', // LVL 4
    'https://ordinals.com/content/916fd1731cdecf82706a290d03448c6dc505c01d6ec44bbca20281a19723d617i0', // LVL 5
    'https://ordinals.com/content/6a5e5c8b42793dd35512dfddd81dbbe211f052ac79839dd54b53461f5783a390i0', // LVL 6
    'https://ordinals.com/content/c0ee69121238f6438be8398038301cf5b1d876cce30a0d45a3a5e0b927826940i0', // LVL 7
];

// Ensure DOM is ready before loading these scripts
document.addEventListener('DOMContentLoaded', () => {
    loadNextScripts(window.titleColorPaletteScriptsToLoad, () => {
        const visualizerLoader = document.createElement('script');
        visualizerLoader.src = 'scriptLoader_NB_visualiserScripts.js';
        document.head.appendChild(visualizerLoader);
    });
});
