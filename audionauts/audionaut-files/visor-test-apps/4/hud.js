// --- Globals & State Management ---
let playlist = [];
let currentSceneIndex = -1;
let isPlaying = false;
let playTimeout;
const visorHud = document.getElementById('visorHud');

// --- DOM Element References ---
const hudModeSelect = document.getElementById('hudMode');
const contentTypeSelect = document.getElementById('contentType');
const contentInput = document.getElementById('contentInput');
const durationInput = document.getElementById('durationInput');
const transitionInSelect = document.getElementById('transitionIn');
const transitionOutSelect = document.getElementById('transitionOut');
const animationSelect = document.getElementById('animation');
const addSceneBtn = document.getElementById('addSceneBtn');
const playBtn = document.getElementById('playBtn');
const stopBtn = document.getElementById('stopBtn');
const clearBtn = document.getElementById('clearBtn');
const playlistDiv = document.getElementById('playlist');

// --- Core Playback Engine ---

/**
 * Manages the sequential playback of scenes from the playlist.
 */
function playNextScene() {
  if (!isPlaying || playlist.length === 0) {
    stopPlayback();
    return;
  }

  // Loop back to the beginning if we're at the end
  currentSceneIndex = (currentSceneIndex + 1) % playlist.length;
  updatePlaylistUI(); // Highlight current scene

  const scene = playlist[currentSceneIndex];
  displayScene(scene);

  // Set timeout for the next scene
  playTimeout = setTimeout(playNextScene, scene.duration);
}

/**
 * Renders a single scene in the HUD, handling transitions.
 * @param {object} scene - The scene object to display.
 */
async function displayScene(scene) {
  const existingContent = visorHud.querySelector('.hud-content');

  // 1. Transition out the old content if it exists
  if (existingContent) {
    const outTransition = existingContent.dataset.transitionOut || 'fade';
    existingContent.classList.add(`${outTransition}-out`);
    // Wait for the transition to finish before removing
    await new Promise(resolve => setTimeout(resolve, 500)); 
    existingContent.remove();
  }
  
  // 2. Create and prepare the new content element
  const contentWrapper = document.createElement('div');
  contentWrapper.classList.add('hud-content');
  contentWrapper.dataset.transitionOut = scene.transitionOut; // Store for next transition

  let contentHtml = '';
  switch (scene.type) {
    case 'image':
      contentHtml = `<img src="${scene.content}" alt="HUD Image">`;
      break;
    case 'video':
      // Videos should be muted and play automatically in a HUD
      contentHtml = `<video src="${scene.content}" autoplay muted loop playsinline></video>`;
      break;
    case 'url':
      // Using an iframe to display external URLs
      contentHtml = `<iframe src="${scene.content}" sandbox="allow-scripts allow-same-origin" frameborder="0"></iframe>`;
      break;
    case 'text':
    default:
      contentHtml = `<p>${scene.content}</p>`;
      break;
  }
  contentWrapper.innerHTML = contentHtml;

  // 3. Add animation class if specified (e.g., scrolling text)
  if (scene.animation === 'scrollLeft') {
      contentWrapper.classList.add('scrolling-left');
  }

  // 4. Append and transition in the new content
  visorHud.appendChild(contentWrapper);
  contentWrapper.classList.add(`${scene.transitionIn}-in`);
}


function startPlayback() {
  if (playlist.length === 0) {
    alert("Playlist is empty. Add a scene first!");
    return;
  }
  isPlaying = true;
  playBtn.textContent = 'Pause';
  playBtn.classList.add('active');
  playNextScene();
}

function stopPlayback(clearHighlight = true) {
  isPlaying = false;
  clearTimeout(playTimeout);
  playBtn.textContent = 'Play';
  playBtn.classList.remove('active');
  if(clearHighlight) {
    currentSceneIndex = -1;
    updatePlaylistUI();
  }
}

function togglePlayback() {
  if (isPlaying) {
    stopPlayback(false); // Pause without resetting highlight
  } else {
    startPlayback();
  }
}

// --- UI & Playlist Management ---

/**
 * Adds a new scene to the playlist from the control panel inputs.
 */
function addScene() {
  const scene = {
    type: contentTypeSelect.value,
    content: contentInput.value,
    duration: parseInt(durationInput.value, 10) || 5000,
    transitionIn: transitionInSelect.value,
    transitionOut: transitionOutSelect.value,
    animation: animationSelect.value
  };

  if (!scene.content) {
    alert("Content/URL field cannot be empty.");
    return;
  }

  playlist.push(scene);
  contentInput.value = ''; // Clear input for next entry
  updatePlaylistUI();
}

/**
 * Clears the playlist and stops playback.
 */
function clearPlaylist() {
  stopPlayback();
  playlist = [];
  visorHud.innerHTML = '';
  updatePlaylistUI();
}

/**
 * Redraws the visual playlist in the control panel.
 */
function updatePlaylistUI() {
  playlistDiv.innerHTML = '<h4>Playlist Queue</h4>';
  if (playlist.length === 0) {
    playlistDiv.innerHTML += '<p>Queue is empty.</p>';
    return;
  }
  const ul = document.createElement('ul');
  playlist.forEach((scene, index) => {
    const li = document.createElement('li');
    if (index === currentSceneIndex && isPlaying) {
      li.classList.add('active');
    }
    li.innerHTML = `
      <span>${index + 1}. [${scene.type.toUpperCase()}] ${scene.content.substring(0, 20)}... (${scene.duration/1000}s)</span>
      <button class="delete-btn" data-index="${index}">×</button>
    `;
    ul.appendChild(li);
  });
  playlistDiv.appendChild(ul);
  
  // Add event listeners to newly created delete buttons
  document.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const indexToRemove = parseInt(e.target.dataset.index, 10);
      playlist.splice(indexToRemove, 1);
      // If we remove the current or a past scene, we need to adjust index and restart
      if (isPlaying) {
        stopPlayback();
        currentSceneIndex = -1; // restart from beginning
        startPlayback();
      } else {
        updatePlaylistUI();
      }
    });
  });
}

// --- Initial Setup & Event Listeners ---

// Function to set mirrored or normal mode
function setHudMode(mode) {
  if (mode === 'mirrored') {
    visorHud.classList.add('mirrored');
  } else {
    visorHud.classList.remove('mirrored');
  }
}

hudModeSelect.addEventListener('change', (e) => setHudMode(e.target.value));

// Control panel listeners
addSceneBtn.addEventListener('click', addScene);
playBtn.addEventListener('click', togglePlayback);
stopBtn.addEventListener('click', () => stopPlayback(true));
clearBtn.addEventListener('click', clearPlaylist);

// Initial State
setHudMode(hudModeSelect.value);
updatePlaylistUI();
// Add a default welcome message to the playlist
playlist.push({
    type: 'text',
    content: 'SYSTEMS ONLINE. AWAITING COMMANDS.',
    duration: 5000,
    transitionIn: 'fade',
    transitionOut: 'fade',
    animation: 'none'
});
updatePlaylistUI();