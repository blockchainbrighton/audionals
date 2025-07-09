const visorHud = document.getElementById('visorHud');
const hudModeSelect = document.getElementById('hudMode');
const contentTypeSelect = document.getElementById('contentType');
const contentSourceInput = document.getElementById('contentSource');
const animationTypeSelect = document.getElementById('animationType');
const updateHudButton = document.getElementById('updateHudButton');

let isTransitioning = false;

// Example content for easy testing
const exampleContent = {
  text: 'WELCOME TO THE BAM AUDIONAUTS HELMET HUD — [SYSTEMS ONLINE] — ALLIANCE CONFIRMED —',
  image: 'https://images.unsplash.com/photo-1534796636912-3b95b3ab5986?w=800&q=80', // Nebula
  video: 'https://assets.mixkit.co/videos/preview/mixkit-black-and-white-shot-of-a-glitch-texture-32407-large.mp4', // Glitch effect
  url: 'https://www.shadertoy.com/embed/lsfGzr?gui=false&t=10&paused=false&muted=true' // Simple Shadertoy
};

/**
 * Creates the appropriate DOM element for the given content type.
 * @param {object} config - The configuration object {type, source}.
 * @returns {HTMLElement|null} The created DOM element or null.
 */
function createContentElement(config) {
  if (!config.source) return null;

  let element;
  switch (config.type) {
    case 'text':
      // Wrap the text in a div to apply the marquee scroll effect
      element = document.createElement('div');
      element.className = 'scrolling-text-content';
      element.textContent = config.source;
      // Mirror the inner content so it scrolls the right way when the container is mirrored
      if (visorHud.classList.contains('mirrored')) {
        element.style.transform = 'scaleX(-1)';
      }
      return element;
    case 'image':
      element = document.createElement('img');
      element.src = config.source;
      element.alt = 'HUD Image';
      return element;
    case 'video':
      element = document.createElement('video');
      element.src = config.source;
      element.autoplay = true;
      element.muted = true;
      element.loop = true;
      element.playsInline = true;
      return element;
    case 'url':
      element = document.createElement('iframe');
      element.src = config.source;
      element.setAttribute('frameborder', '0');
      element.setAttribute('allow', 'autoplay; encrypted-media');
      // Iframe content cannot be mirrored with CSS transform.
      return element;
    default:
      return null;
  }
}

/**
 * Main function to update the HUD content with transitions.
 * @param {object} config - The configuration object {type, source, animation}.
 */
async function updateHUD(config) {
  if (isTransitioning) return;
  isTransitioning = true;
  updateHudButton.disabled = true;

  const oldContent = visorHud.firstElementChild;
  const newContent = createContentElement(config);

  // Animate out the old content if it exists
  if (oldContent && config.animation !== 'instant') {
    await animate(oldContent, `anim-${config.animation}-out`);
  }
  if (oldContent) {
    oldContent.remove();
  }
  
  // Animate in the new content if it exists
  if (newContent) {
    visorHud.appendChild(newContent);
    if (config.type === 'text') updateFontSize(); // Adjust font for text
    
    if (config.animation !== 'instant') {
      await animate(newContent, `anim-${config.animation}-in`);
    }
  }

  isTransitioning = false;
  updateHudButton.disabled = false;
}

/**
 * Helper function to run a CSS animation and return a Promise.
 * @param {HTMLElement} element - The element to animate.
 * @param {string} animationClass - The CSS class for the animation.
 * @returns {Promise<void>} A promise that resolves when the animation ends.
 */
function animate(element, animationClass) {
  return new Promise(resolve => {
    const onAnimationEnd = () => {
      element.classList.remove(animationClass);
      element.removeEventListener('animationend', onAnimationEnd);
      resolve();
    };
    element.classList.add(animationClass);
    element.addEventListener('animationend', onAnimationEnd);
  });
}


// --- Responsive Font Sizing ---
function updateFontSize() {
    // Only apply to text content
    const textElement = visorHud.querySelector('.scrolling-text-content');
    if(textElement) {
        const newSize = visorHud.clientHeight * 0.25; // 25% of visor height
        visorHud.style.fontSize = `${newSize}px`;
    }
}

const resizeObserver = new ResizeObserver(entries => {
    for (let entry of entries) {
        updateFontSize();
    }
});

resizeObserver.observe(visorHud);

// --- Event Listeners and Initial Setup ---
function setHudMode(mode) {
  visorHud.classList.toggle('mirrored', mode === 'mirrored');
  // Re-run the update to fix text direction if it's currently showing
  if (contentTypeSelect.value === 'text') {
    const textElement = visorHud.querySelector('.scrolling-text-content');
    if (textElement) {
        textElement.style.transform = (mode === 'mirrored') ? 'scaleX(-1)' : 'none';
    }
  }
}

hudModeSelect.addEventListener('change', (e) => setHudMode(e.target.value));

contentTypeSelect.addEventListener('change', (e) => {
    // Populate the source input with the example for the selected type
    contentSourceInput.value = exampleContent[e.target.value];
});

updateHudButton.addEventListener('click', () => {
    const config = {
      type: contentTypeSelect.value,
      source: contentSourceInput.value,
      animation: animationTypeSelect.value,
    };
    updateHUD(config);
});


// Initial page load setup
function initialize() {
    setHudMode(hudModeSelect.value);
    // Load default content type and example
    contentTypeSelect.value = 'text';
    contentSourceInput.value = exampleContent.text;
    // Trigger initial content display
    updateHudButton.click(); 
    // Set initial font size
    updateFontSize();
}

initialize();