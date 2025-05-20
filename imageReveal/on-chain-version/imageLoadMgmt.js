/* imageLoadMgmt.js  â”€ streamlined */
(() => {
    'use strict';
  
    if (!Array.isArray(window.images) || !window.images.length) {
      console.error('ImageLoadMgmt: global `images` array missing/empty.'); return;
    }
  
    const urls = window.images,
          loaded = Array(urls.length);
    let ok = 0, fail = 0;
  
    const load = (url,i) => new Promise(res => {
      const img = new Image(); img.crossOrigin = 'anonymous';
      img.onload  = () => { ok++;  loaded[i] = img;  console.log(`ImageLoadMgmt: âœ” [${i+1}/${urls.length}] ${url}`); res(img); };
      img.onerror = () => { fail++;loaded[i] = null; console.error(`ImageLoadMgmt: âœ– [${i+1}/${urls.length}] ${url}`); res(null); };
      img.src = url;
    });
  
    Promise.allSettled(urls.map(load)).then(() => {
      console.log(`ImageLoadMgmt: done. ${ok} ok, ${fail} failed.`);
      window.imageRevealLoadedImages = loaded;
      document.dispatchEvent(new CustomEvent('appImagesReady', { detail:{ images:loaded, source:'imageLoadMgmt' } }));
    });
  })();