// linkToCompressedSongFiles.js

document.addEventListener('DOMContentLoaded', () => {
    const dataUrl = 'https://ordinals.com/content/4de39717229614a8736e9c751656e7e4eb39178eb7cc5ddc7cc6b534df7bbfd4i0'; // TRUTH COMPRESSED SONG FILE .gz
    loadMainScript(() => processSerializedData(dataUrl));

    document.getElementById('downloadFullData').addEventListener('click', () => {
        downloadDeserializedFile();
    });
});

function loadMainScript(callback) {
    const script = document.createElement('script');
    script.src = 'mainScript.js'; // Adjust the path as necessary
    script.onload = callback;
    document.head.appendChild(script);
}
