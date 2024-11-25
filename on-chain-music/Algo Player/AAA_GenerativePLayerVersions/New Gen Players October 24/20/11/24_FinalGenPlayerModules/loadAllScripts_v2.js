// loadAllScripts_v2.js
const scriptUrls = [
    "/content/616ef4c1bef02cb6c0f785ef76b98df4e379e8f01e2b31e2ae9e68449485f2bci0", // songsAndArtwork.js
    "/content/067a04f8437a6e3c8287c603264eccfd875221bfc2a703bb43189fa35323e13fi0", // globalDataObject.js - Updated to handle Audio Context
    "/content/079d00cc6a48f05aed58021b7c892ff28df625a4bdb6416499772fec58b1cf81i0", // seedManagement.js
    "/content/ea4990e9237a01afc5a4b16b8f31bc2bc58d81d19e4e570fe6b6deb325ac72cei0", // seedDisplayManager.js
    "/content/34749a38c929b59a365575c8b72986c4a663a6fb41fed3bc8b23aa935a7df538i0", // gainNodeHelper.js
    "/content/88e31c014497fe68531488644c8d18bf3f00be3ef052b8a5f5fc1f5fb0a9fedai0", // configureEffects.js
    "/content/8287527ee3c6fe45bedead8b953dafd57ecd176f0fa1a4641413aef0bc5441b6i0", // initialiseSongsWithEffects.js
    "/content/1ebdcd2b3da09ed63ca6d626d7ecf0205f04e3826683c230ff2855c93236c36ei0", // audioProcessingAndManagement.js
    "/content/e6efeb0e068d89d62c9d3722749837fedd418fe990d41766d6974596085ae877i0", // unifiedMetadataManagement.js
    "/content/1440175525ca0e108583fc3a2e9850bfb5165d2c72fb70546e680b09aed0f435i0", // loadPlayerScripts.js
    "/content/9ae73af1958b5ccc3f7bf59784cf3473f18f208e6d6737044e8e514444ef90ddi0", // fetchAndPrepareOriginalAudionalSongFiles_v2.js - Updated to throw less errors for empty URLs
    "/content/cc5c47b922f7b60a2ab24134ac79a871c94459060b150758eeb90b49f09c33e0i0"  // playback.js
];
function loadScript(o){return new Promise(((r,c)=>{const e=document.createElement("script");e.src=o,e.type="application/javascript",e.onload=()=>{console.log(`Loaded script: ${o}`),r()},e.onerror=()=>{console.error(`Failed to load script: ${o}`),c(new Error(`Failed to load script ${o}`))},document.head.appendChild(e)}))}async function loadScriptsSequentially(o){for(const r of o)await loadScript(r)}loadScriptsSequentially(scriptUrls).then((()=>{console.log("All scripts loaded successfully.")})).catch((o=>{console.error("Error loading scripts:",o)}));
