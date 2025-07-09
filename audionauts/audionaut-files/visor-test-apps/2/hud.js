const visorHud = document.getElementById('visorHud');
const hudModeSelect = document.getElementById('hudMode');

// Function to set HUD content
function setHUDContent(html) {
  visorHud.innerHTML = html;

  // Re-apply scrolling animation if needed
  const scroll = document.querySelector('.scrolling-text');
  if (scroll) {
    scroll.animate([
      { transform: 'translateX(100%)' },
      { transform: 'translateX(-100%)' }
    ], {
      duration: 10000, // Slightly slower for better readability
      iterations: Infinity,
      easing: 'linear'
    });
  }
}

// Function to set mirrored or normal mode
function setHudMode(mode) {
  if (mode === 'mirrored') {
    visorHud.classList.add('mirrored');
  } else {
    visorHud.classList.remove('mirrored');
  }
}

// --- NEW: Responsive Font Sizing ---
// This ensures the text scales proportionally with the helmet.
function updateFontSize() {
    // Calculate font size based on the HUD's current height.
    // The 0.25 multiplier is a good starting point, adjust if needed.
    const newSize = visorHud.clientHeight * 0.25;
    visorHud.style.fontSize = `${newSize}px`;
}

// Use a ResizeObserver to automatically update font size when the helmet resizes.
const resizeObserver = new ResizeObserver(entries => {
    // We only need to react to changes, so the loop is simple.
    for (let entry of entries) {
        updateFontSize();
    }
});

// Start observing the helmet container for size changes.
resizeObserver.observe(document.querySelector('.helmet-container'));


// --- Event Listeners and Initial Setup ---

// Listen for mode change
hudModeSelect.addEventListener('change', (e) => {
  setHudMode(e.target.value);
});

// Initial setup
setHudMode(hudModeSelect.value);

// Example content
setHUDContent(`
  <div class="scrolling-text">
    WELCOME TO THE BAM AUDIONAUTS HELMET HUD — [SYSTEMS ONLINE] — ALLIANCE CONFIRMED —
  </div>
`);

// Initial font size calculation
updateFontSize();