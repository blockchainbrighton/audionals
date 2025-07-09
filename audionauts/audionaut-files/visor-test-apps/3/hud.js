// Function to set HUD content
function setHUDContent(html) {
    document.getElementById('visorHud').innerHTML = html;
  
    // Re-apply scrolling animation if needed
    const scroll = document.querySelector('.scrolling-text');
    if (scroll) {
      scroll.animate([
        { transform: 'translateX(100%)' },
        { transform: 'translateX(-100%)' }
      ], {
        duration: 8000,
        iterations: Infinity,
        easing: 'linear'
      });
    }
  }
  
  // Function to set mirrored or normal mode
  function setHudMode(mode) {
    const visorHud = document.getElementById('visorHud');
    if (mode === 'mirrored') {
      visorHud.classList.add('mirrored');
    } else {
      visorHud.classList.remove('mirrored');
    }
  }
  
  // Listen for mode change
  const hudModeSelect = document.getElementById('hudMode');
  hudModeSelect.addEventListener('change', (e) => {
    setHudMode(e.target.value);
  });
  
  // Initial setup
  setHudMode(hudModeSelect.value);
  
  // Example content
  setHUDContent(`
    <div class="scrolling-text">
      WELCOME TO THE BAM AUDIONAUTS HELMET HUD — [SYSTEMS ONLINE] —
    </div>
  `);

  function updateHudFontSize() {
    const visor = document.getElementById('visorHud');
    if (!visor) return;
    const width = visor.offsetWidth;
    visor.style.fontSize = (width * 0.30) + 'px'; // 0.30 = 30% of visor width
  }
  
  // Run on load, and any time the window resizes
  window.addEventListener('resize', updateHudFontSize);
  window.addEventListener('DOMContentLoaded', updateHudFontSize);
  