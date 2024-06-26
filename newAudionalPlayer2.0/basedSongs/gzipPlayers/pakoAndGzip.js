    // pakoAndGzip.js

// Dynamically load pakoLoader.js
const pakoLoaderScript = document.createElement('script');
pakoLoaderScript.src = "/content/1db9ef42162943bb969ee9d331f02ea77cd3be8a1fb5e607b4e9cda2d7274403i0";
pakoLoaderScript.onload = function() {
    // After pakoLoader.js is loaded, dynamically load gzipSongFile.js
    const gzipSongFileScript = document.createElement('script');
    gzipSongFileScript.src = "/content/1f3d28edf495796d38673596a8ac364956313452f3acdd84c2748287593481a1i0";
    document.body.appendChild(gzipSongFileScript);
};
document.body.appendChild(pakoLoaderScript);
