// imageLoadMgmt.js
(() => {
    'use strict';
  
    /* ─── Configuration & Input ───────────────────────────────────────── */
    if (!Array.isArray(window.images) || window.images.length === 0) {
      console.error('ImageLoadMgmt: Global `images` array missing or empty.');
      return;
    }
    const imageUrls = window.images;
    console.log(`ImageLoadMgmt: Found ${imageUrls.length} image URL(s) to load.`);
  
    /* ─── State ───────────────────────────────────────────────────────── */
    const loadedImageElements = new Array(imageUrls.length);
    let loadedCount = 0, failedCount = 0;
  
    /* ─── Helper: load a single image ─────────────────────────────────── */
    const loadImage = (url, idx) => new Promise(resolve => {
      console.log(`ImageLoadMgmt: [${idx + 1}/${imageUrls.length}] Starting load: ${url}`);
      const img = new Image();

    /* Add CORS flag so the canvas can safely read pixels
    (server must send appropriate Access-Control-Allow-Origin) */
      img.crossOrigin = 'anonymous';   

      img.onload = () => {
        loadedCount++;
        console.log(`ImageLoadMgmt: [${idx + 1}/${imageUrls.length}] Ready for display: ${url}`);
        loadedImageElements[idx] = img;
        resolve(img);
      };
      img.onerror = () => {
        failedCount++;
        console.error(`ImageLoadMgmt: [${idx + 1}/${imageUrls.length}] Failed to load: ${url}`);
        loadedImageElements[idx] = null;
        resolve(null);                          // keep Promise.allSettled happy
      };
      img.src = url;
    });
  
    /* ─── Main batch load ─────────────────────────────────────────────── */
    console.log('ImageLoadMgmt: Starting batch image load...');
    Promise
      .allSettled(imageUrls.map(loadImage))
      .then(() => {
        console.log(`ImageLoadMgmt: Batch load finished. ${loadedCount} succeeded, ${failedCount} failed.`);
        if (failedCount === 0) console.log('ImageLoadMgmt: All images loaded successfully. ✅');
        else console.warn('ImageLoadMgmt: Some images failed. See above.');
  
        // Expose the array for scripts that might run AFTER this event fired
        window.imageRevealLoadedImages = loadedImageElements;
  
        console.log('ImageLoadMgmt: Dispatching appImagesReady event.');
        document.dispatchEvent(new CustomEvent('appImagesReady', {
          detail: { images: loadedImageElements, source: 'imageLoadMgmt' }
        }));
      });
  })();
  