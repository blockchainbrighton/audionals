// linkToCompressedSongFiles_B.js

document.addEventListener('DOMContentLoaded', () => {
    const dataUrl = 'serializedFiles/TRUTH_AUDX_17_s.json.gz'; // Update with actual URL
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
