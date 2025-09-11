// Function to inject styles into the document head
function injectStyles() {
  const style = document.createElement('style');
  style.textContent = `
    :root { color-scheme: dark; }

    html, body {
      margin: 0; padding: 0;
      height: 100%; width: 100%;
      background: #000; color: #fff;
      font-family: 'Courier New', monospace;
      overflow: hidden; /* no page scroll during performance */
    }

    /* Desktop-friendly floor, but don't block phones from fitting */
    body { min-width: 480px; min-height: 400px; }

    /* On small screens, let the app fill the dynamic viewport
       (prevents iOS URL bar shrinking issues) */
    @media (max-width: 480px) {
      body {
        min-width: 0;
        min-height: 100dvh; /* dynamic viewport height on mobile */
      }
    }

    /* Respect reduced motion preferences (small global nudge) */
    @media (prefers-reduced-motion: reduce) {
      * { scroll-behavior: auto !important; }
    }
  `;
  document.head.appendChild(style);
}

// Function to inject Apple-specific meta tags on iOS Safari
function injectAppleMetas() {
  const ua = navigator.userAgent || navigator.vendor || "";
  const isIOSDevice = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1); // iPadOS w/ desktop UA
  const isSafari = /^((?!chrome|android).)*safari/i.test(ua);

  if (isIOSDevice && isSafari) {
    const m1 = document.createElement('meta');
    m1.name = 'apple-mobile-web-app-capable';
    m1.content = 'yes';
    document.head.appendChild(m1);

    const m2 = document.createElement('meta');
    m2.name = 'apple-mobile-web-app-status-bar-style';
    m2.content = 'black-translucent';
    document.head.appendChild(m2);
  }
}

// Function to synchronize data-seed attribute
function syncDataSeed() {
  document.addEventListener('DOMContentLoaded', () => {
    document.body.dataset.seed = document.documentElement.dataset.seed || 'default';
    const mo = new MutationObserver(() => {
      document.body.dataset.seed = document.documentElement.dataset.seed || 'default';
    });
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-seed'] });
  });
}

// Execute all setup functions
injectStyles();
injectAppleMetas();
syncDataSeed();