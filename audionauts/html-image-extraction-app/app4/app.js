// Ordinal Snapshot Tool – Core Logic

const processBtn = document.getElementById('processBtn');
const result = document.getElementById('result');
const ordinalUrl = document.getElementById('ordinalUrl');

// Helper: Logging
const log = (...a) => console.log('[APP]', ...a);

// Core: Fetch & snapshot (supports images & HTML)
async function fetchAndSnapshot(url) {
  log('Fetching URL:', url);
  if (/\.(png|jpg|jpeg|gif)$/i.test(url)) return urlToBase64(url);

  return new Promise((resolve, reject) => {
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    // For local dev only – On-chain will always be same-origin!
    iframe.sandbox = "allow-scripts allow-same-origin";
    document.body.appendChild(iframe);

    iframe.onload = async () => {
      let doc = null;
      try { doc = iframe.contentDocument; } catch (e) {
        cleanup();
        reject(new Error("Cross-origin or sandboxed HTML: DOM not accessible. Snapshot not possible from local/dev."));
        return;
      }
      if (!doc || !doc.body) {
        cleanup();
        reject(new Error("No accessible DOM/body in loaded content."));
        return;
      }
      try {
        if (window.html2canvas) {
          const canvas = await window.html2canvas(doc.body);
          cleanup();
          resolve(canvas.toDataURL());
        } else {
          cleanup();
          reject(new Error("html2canvas not loaded"));
        }
      } catch (e) {
        cleanup();
        reject(new Error("Snapshot failed: " + e.message));
      }
    };

    iframe.onerror = () => { cleanup(); reject(new Error("Iframe failed to load")); };
    function cleanup() { document.body.removeChild(iframe); }
    iframe.src = url;
  });
}

// Image → Base64
function urlToBase64(imgUrl) {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.crossOrigin = "Anonymous";
    img.onload = function() {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth; canvas.height = img.naturalHeight;
      canvas.getContext('2d').drawImage(img, 0, 0);
      resolve(canvas.toDataURL());
    };
    img.onerror = reject;
    img.src = imgUrl;
  });
}

// UI Handler
processBtn.onclick = async () => {
  result.innerHTML = '<p>Processing... (see console for logs)</p>';
  const url = ordinalUrl.value.trim();
  try {
    const views = [
      { label: 'Viewport (default)', transform: null },
      { label: 'Full Body (actual size)', transform: null },
      { label: 'Square Centered (padded)', transform: 'center' },
      { label: 'Square Scaled (stretched)', transform: 'scale' },
    ];
    const imgs = [];
    for (let view of views) {
      log('Processing view:', view.label);
      const snap = await fetchAndSnapshot(url);
      imgs.push(`
        <div class="snapshot">
          <h3>${view.label}</h3>
          <img src="${snap}" alt="Snapshot" />
          <textarea rows="2" cols="40" readonly>${snap}</textarea>
        </div>`);
    }
    result.innerHTML = imgs.length
      ? `<div class="snapshot-row">${imgs.join('')}</div>`
      : '<b style="color:red">No images could be captured.<br>Check console for detailed error messages.</b>';
  } catch (e) {
    log('Error:', e);
    result.innerHTML = '<b style="color:red">Failed: ' + e.message + '</b>';
  }
};

// Show dev patch status
document.addEventListener('DOMContentLoaded', () => {
  const devStatus = document.getElementById('devpatch-status');
  if (devStatus) devStatus.textContent = window.LOCAL_DEV_PATCH_ACTIVE ? "ON" : "OFF";
});
