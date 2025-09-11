// js/loader.js

(function () {
  'use strict';

  // --- 1. Set Document Title ---
  document.title = 'Oscilloscope App v15.6 (AudioWorklet)';


  // --- 2. Create and Append Meta Tags ---
  const metaTags = [
    { charset: 'UTF-8' },
    { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover, user-scalable=no' },
    { name: 'theme-color', content: '#000000' },
    { name: 'mobile-web-app-capable', content: 'yes' },
    { name: 'format-detection', content: 'telephone=no' },
  ];

  metaTags.forEach(tagInfo => {
    const meta = document.createElement('meta');
    for (const attr in tagInfo) {
      meta.setAttribute(attr, tagInfo[attr]);
    }
    document.head.appendChild(meta);
  });


  // --- 3. Inject Apple-specific Metas on iOS Safari ---
  const ua = navigator.userAgent || navigator.vendor || "";
  const isIOSDevice = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const isSafari = /^((?!chrome|android).)*safari/i.test(ua);

  if (isIOSDevice && isSafari) {
    const appleMetas = [
      { name: 'apple-mobile-web-app-capable', content: 'yes' },
      { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' }
    ];
    appleMetas.forEach(tagInfo => {
      const meta = document.createElement('meta');
      meta.name = tagInfo.name;
      meta.content = tagInfo.content;
      document.head.appendChild(meta);
    });
  }


  // --- 4. Create and Append Styles ---
  const styles = `
    :root { color-scheme: dark; }
    html, body {
      margin: 0; padding: 0;
      height: 100%; width: 100%;
      background: #000; color: #fff;
      font-family: 'Courier New', monospace;
      overflow: hidden;
    }
    body { min-width: 480px; min-height: 400px; }
    @media (max-width: 480px) {
      body {
        min-width: 0;
        min-height: 100dvh;
      }
    }
    @media (prefers-reduced-motion: reduce) {
      * { scroll-behavior: auto !important; }
    }
  `;

  const styleSheet = document.createElement('style');
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);


  // --- 5. Setup Body Content and Seed Sync (after DOM is ready) ---
  document.addEventListener('DOMContentLoaded', () => {
    // Create the main app component
    const appElement = document.createElement('osc-app');
    document.body.appendChild(appElement);

    // Sync the data-seed attribute from <html> to <body>
    const syncSeed = () => {
      document.body.dataset.seed = document.documentElement.dataset.seed || 'default';
    };
    syncSeed(); // Initial sync

    // Observe changes to the <html> data-seed attribute
    const observer = new MutationObserver(syncSeed);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-seed'] });
  });

})();