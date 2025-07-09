// --- Globals & State Management ---
let playlist = [{
  type: 'text',
  content: 'SYSTEMS ONLINE. AWAITING COMMANDS.',
  duration: 5000,
  transitionIn: 'fade',
  transitionOut: 'fade',
  animation: 'none'
}];
let currentSceneIndex = -1, isPlaying = false, playTimeout;
const visorHud = document.getElementById('visorHud');

// --- DOM Element References ---
const hudModeSelect = document.getElementById('hudMode'),
  contentTypeSelect = document.getElementById('contentType'),
  contentInput = document.getElementById('contentInput'),
  durationInput = document.getElementById('durationInput'),
  transitionInSelect = document.getElementById('transitionIn'),
  transitionOutSelect = document.getElementById('transitionOut'),
  animationSelect = document.getElementById('animation'),
  addSceneBtn = document.getElementById('addSceneBtn'),
  playBtn = document.getElementById('playBtn'),
  stopBtn = document.getElementById('stopBtn'),
  clearBtn = document.getElementById('clearBtn'),
  playlistDiv = document.getElementById('playlist');

// --- Core Playback Engine ---
function playNextScene() {
  if (!isPlaying || !playlist.length) return stopPlayback();
  currentSceneIndex = (currentSceneIndex + 1) % playlist.length;
  updatePlaylistUI();
  const scene = playlist[currentSceneIndex];
  displayScene(scene);
  playTimeout = setTimeout(playNextScene, scene.duration);
}

async function displayScene(scene) {
  const prev = visorHud.querySelector('.hud-content');
  if (prev) {
    prev.classList.add(`${prev.dataset.transitionOut || 'fade'}-out`);
    await new Promise(r => setTimeout(r, 500));
    prev.remove();
  }
  const el = document.createElement('div');
  el.className = 'hud-content';
  el.dataset.transitionOut = scene.transitionOut;
  el.innerHTML =
    scene.type === 'image' ? `<img src="${scene.content}" alt="HUD Image">` :
    scene.type === 'video' ? `<video src="${scene.content}" autoplay muted loop playsinline></video>` :
    scene.type === 'url'   ? `<iframe src="${scene.content}" sandbox="allow-scripts allow-same-origin" frameborder="0"></iframe>` :
    `<p>${scene.content}</p>`;
  if (scene.animation === 'scrollLeft') el.classList.add('scrolling-left');
  visorHud.appendChild(el);
  el.classList.add(`${scene.transitionIn}-in`);
}

function startPlayback() {
  if (!playlist.length) return alert("Playlist is empty. Add a scene first!");
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
  if (clearHighlight) {
    currentSceneIndex = -1;
    updatePlaylistUI();
  }
}

function togglePlayback() {
  isPlaying ? stopPlayback(false) : startPlayback();
}

// --- UI & Playlist Management ---
function addScene() {
  const scene = {
    type: contentTypeSelect.value,
    content: contentInput.value,
    duration: Number(durationInput.value) || 5000,
    transitionIn: transitionInSelect.value,
    transitionOut: transitionOutSelect.value,
    animation: animationSelect.value
  };
  if (!scene.content) return alert("Content/URL field cannot be empty.");
  playlist.push(scene);
  contentInput.value = '';
  updatePlaylistUI();
}

function clearPlaylist() {
  stopPlayback();
  playlist = [];
  visorHud.innerHTML = '';
  updatePlaylistUI();
}

function updatePlaylistUI() {
  playlistDiv.innerHTML = '<h4>Playlist Queue</h4>';
  if (!playlist.length) return playlistDiv.innerHTML += '<p>Queue is empty.</p>';
  const ul = document.createElement('ul');
  playlist.forEach((scene, i) => {
    const li = document.createElement('li');
    if (i === currentSceneIndex && isPlaying) li.classList.add('active');
    li.innerHTML = `
      <span>${i + 1}. [${scene.type.toUpperCase()}] ${scene.content.slice(0, 20)}... (${scene.duration / 1000}s)</span>
      <button class="delete-btn" data-index="${i}">×</button>
    `;
    ul.appendChild(li);
  });
  playlistDiv.appendChild(ul);
  playlistDiv.querySelectorAll('.delete-btn').forEach(btn =>
    btn.onclick = e => {
      e.stopPropagation();
      const idx = +btn.dataset.index;
      playlist.splice(idx, 1);
      if (isPlaying) {
        stopPlayback();
        currentSceneIndex = -1;
        startPlayback();
      } else updatePlaylistUI();
    });
}

// --- Initial Setup & Event Listeners ---
function setHudMode(mode) {
  visorHud.classList.toggle('mirrored', mode === 'mirrored');
}
hudModeSelect.addEventListener('change', e => setHudMode(e.target.value));
addSceneBtn.addEventListener('click', addScene);
playBtn.addEventListener('click', togglePlayback);
stopBtn.addEventListener('click', () => stopPlayback(true));
clearBtn.addEventListener('click', clearPlaylist);

// Initial State
setHudMode(hudModeSelect.value);
updatePlaylistUI();
