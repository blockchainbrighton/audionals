// loadPlayerScriptsNew.js
document.addEventListener("DOMContentLoaded", () => {
    const scriptUrls = [
        "/content/44088e23250de51c70149b344a11ba29fe39850ac9b3bf2aa99e73f5d29c4825i0", // loadAndPrepareSongDataOrginalPakoHack
        "/content/5c03e882ab5a531271b2e93a80d8a9d72cb533c580bec1567020f5cd61595560i0", // projectArtistMapping
        "/content/016f153f011f6a23b8fccd0efcc7945913ee97f241c7a2df7c71c4fa7c9a5fb3i0", // unifiedMetadataManagement
        "/content/ef622be8aeeac45fdbdc291dd0db739d24c2c667c5c3ce7662f2b8c7f2c3de58i0", // GainNodeHelpers
        "/content/f4cc99813b43f71b3e781d3c99f24a6a7a5b1004ea0efce3b225011e347b8df0i0", // audioProcessingAndManagement
        "/content/7b305327f2951d219532ef0cb46b2039b23f2cfd0d8d0e827f3fe1b2b754b5a9i0", // DynamicGainBalancing
        "/content/7f1e3b45f22f943ddfb90a0b9811671185f720bb303f002215b9e0fd932f299ci0", // playbackEngine
        "/content/8b5b09cfedbc0c6a187816181f8d33f90c5bbd15fc10af47008176effb866a47i0"  // keyboardControlsAndEventListeners
    ];

    scriptUrls.forEach((src) => {
        const script = document.createElement("script");
        script.src = src;
        script.async = false; // Ensure scripts are executed in order
        document.body.appendChild(script);
    });
});