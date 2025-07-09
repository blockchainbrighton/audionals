const visorHud = document.getElementById('visorHud');
const hudModeSelect = document.getElementById('hudMode');

// Function to set HUD content
function setHUDContent(html) {
  visorHud.innerHTML = html;
  // NOTE: The .animate() call has been removed. 
  // CSS now handles the animation automatically.
}

// Function to set mirrored or normal mode
function setHudMode(mode) {
  if (mode === 'mirrored') {
    visorHud.classList.add('mirrored');
  } else {
    visorHud.classList.remove('mirrored');
  }
}

// --- Responsive Font Sizing (Unchanged) ---
function updateFontSize() {
    const newSize = visorHud.clientHeight * 0.25;
    visorHud.style.fontSize = `${newSize}px`;
}

const resizeObserver = new ResizeObserver(entries => {
    for (let entry of entries) {
        updateFontSize();
    }
});

resizeObserver.observe(document.querySelector('.helmet-container'));


// --- Event Listeners and Initial Setup ---
hudModeSelect.addEventListener('change', (e) => {
  setHudMode(e.target.value);
});

setHudMode(hudModeSelect.value);

setHUDContent(`
  <div class="scrolling-text">
    WELCOME TO THE BAM AUDIONAUTS HELMET HUD — [SYSTEMS ONLINE] — ALLIANCE CONFIRMED —
  </div>
`);

updateFontSize();