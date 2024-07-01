// 2_pakoAndGzipSongLoaders.js

const pakoLoaderScript = document.createElement("script");
pakoLoaderScript.src = "4_pakoLoaderMinified.js";  // Ensure the extension is included
pakoLoaderScript.onload = function() {
    const e = document.createElement("script");
    e.src = "4_gzipSongFile.js";  // Ensure the extension is included
    document.body.appendChild(e);
};
pakoLoaderScript.onerror = function() {
    console.error("Error loading 3_pakoLoaderMinified.js");
};
document.body.appendChild(pakoLoaderScript);
