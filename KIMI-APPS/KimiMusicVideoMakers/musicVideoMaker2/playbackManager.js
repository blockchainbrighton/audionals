let isPlaying = false;
let playStart = 0;
let pauseTime = 0;

async function playTimeline() {
  if (isPlaying) return;
  isPlaying = true;
  playStart = Date.now() - (pauseTime || 0);
  startTimer();

  // Start both channels
  playChannel('visual');
  playChannel('audio');
}

function pauseTimeline() {
  if (!isPlaying) return;
  isPlaying = false;
  pauseTime = Date.now() - playStart;
  stopTimer();
  [...document.querySelectorAll('video,audio')].forEach(el => el.pause());
}

function stopTimeline() {
  isPlaying = false;
  pauseTime = 0;
  stopTimer();
  document.getElementById('media-container').innerHTML = '';
  document.getElementById('audio-output').src = '';
}

async function playChannel(channel) {
  const arr  = channel === 'visual' ? visualTimeline : audioTimeline;
  const cont = channel === 'visual'
               ? document.getElementById('media-container')
               : document.getElementById('audio-output');

  // Loop through every clip, but DON’T rush
  for (let i = 0; i < arr.length && isPlaying; i++) {
    const { url, duration } = arr[i];

    // --- VISUAL BRANCH -------------------------------------------------
    if (channel === 'visual') {
      const resp = await fetch(url, { method: 'HEAD' });
      const type = resp.headers.get('Content-Type');

      const el = type.startsWith('video')
                 ? document.createElement('video')
                 : document.createElement('img');

      // Style
      el.style.maxWidth  = '100%';
      el.style.maxHeight = '100%';
      el.style.objectFit = 'contain';

      // Promisify load
      const loaded = new Promise((res, rej) => {
        el.onload  = res;
        el.onerror = rej;
        if (type.startsWith('video')) {
          el.onloadeddata = res;
          el.onerror      = rej;
        }
      });

      el.src = url;
      cont.innerHTML = '';
      cont.appendChild(el);

      // ⏳ Wait until the media is **really** ready
      await loaded;

      // 🎯 Now start the guaranteed visible timer
      await wait(duration * 1000);
    }

    // --- AUDIO BRANCH -------------------------------------------------
    else {
      cont.src = url;
      await cont.play();
      await wait(duration * 1000);
      cont.pause();
    }
  }
}

function wait(ms) {
  return new Promise(res => {
    const id = setInterval(() => {
      if (!isPlaying) { clearInterval(id); return; }
      const elapsed = Date.now() - playStart;
      if (elapsed >= ms) { clearInterval(id); res(); }
    }, 25);
  });
}