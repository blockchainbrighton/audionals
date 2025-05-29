// pixel-text-prompt.js

(function() {
    const canvas = document.getElementById('pixelTextCanvas');
    if (!canvas) {
      console.error('Pixel Text Prompt: canvas element #pixelTextCanvas not found.');
      return;
    }
    const ctx = canvas.getContext('2d');
    const text = window.APP_CONFIG.startText;
    let flickerInterval;
  
 // Variation 1: Cyberpunk Neon
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.font = 'bold 16px monospace';
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#FF00FF'; // Glow color: Hot Pink/Magenta
  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      if (dx === 0 && dy === 0) continue; // Don't draw center for glow
      ctx.fillText(text, canvas.width/2 + dx, canvas.height/2 + dy);
    }
  }
  ctx.fillStyle = '#00FFFF'; // Brighter text color: Cyan
  ctx.fillText(text, canvas.width/2, canvas.height/2);
  
  // Re-draw center with original black for knockout effect if preferred
  // ctx.fillStyle = '#000000'; 
  // ctx.fillText(text, canvas.width/2, canvas.height/2);
}
  
    // start flicker
    function startFlicker() {
      clearInterval(flickerInterval); // Clear any existing interval
      canvas.style.visibility = 'visible'; // Ensure it's visible when flicker starts
      flickerInterval = setInterval(() => {
        canvas.style.visibility = (canvas.style.visibility === 'hidden') ? 'visible' : 'hidden';
      }, 500);
    }
  
    // stop flicker
    function stopFlicker() {
      clearInterval(flickerInterval);
      canvas.style.visibility = 'visible'; // Ensure it's left in a visible state
    }
  
    // show canvas (fade back in and restart flicker)
    function showCanvas() {
      canvas.classList.remove('hidden');
      // restart flicker once fully visible (after CSS transition)
      // The transition is 16s for opacity and transform.
      // Flicker should resume after the opacity transition mainly.
      setTimeout(startFlicker, 1000); // Adjust timing if needed, 16s is long for flicker resume
    }
  
    // hide canvas (fade+shrink) and trigger playback start
    canvas.addEventListener('click', () => {
      stopFlicker();
      canvas.classList.add('hidden');
      const playBtn = document.getElementById('playBtn');
      if (playBtn) {
          playBtn.click(); // Triggers playbackMgmt.js
      } else {
          console.error('Pixel Text Prompt: #playBtn not found for click trigger.');
      }
    });
  
    // Listen for playback events dispatched by playbackMgmt.js
    
    // When playback starts:
    document.addEventListener('playbackStarted', () => {
      // The canvas click handler already hides the canvas and stops flicker.
      // This listener acts as a safeguard or for alternative playback start triggers.
      if (!canvas.classList.contains('hidden')) {
          stopFlicker();
          canvas.classList.add('hidden');
      }
    });
  
    // When playback stops (naturally or by user action):
    document.addEventListener('playbackStopped', () => {
      showCanvas(); // Uses the existing showCanvas function to make it visible and restart flicker.
    });
  
    // Initial draw & flicker
    // Ensure DOM is ready for canvas operations. This IIFE runs when script is parsed.
    // If script is in <head> or early <body>, wrap in DOMContentLoaded
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
          draw();
          startFlicker();
      });
    } else {
      // DOMContentLoaded has already fired
      draw();
      startFlicker();
    }
  })();
