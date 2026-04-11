const textInput = document.getElementById("textInput");
const voiceSelect = document.getElementById("voiceSelect");
const refreshVoicesBtn = document.getElementById("refreshVoicesBtn");
const generateBtn = document.getElementById("generateBtn");
const statusText = document.getElementById("statusText");
const healthText = document.getElementById("healthText");
const resultCard = document.getElementById("resultCard");
const audioPlayer = document.getElementById("audioPlayer");
const downloadLink = document.getElementById("downloadLink");

const progressCard = document.getElementById("progressCard");
const progressStage = document.getElementById("progressStage");
const progressPercent = document.getElementById("progressPercent");
const progressFill = document.getElementById("progressFill");
const metricChunks = document.getElementById("metricChunks");
const metricElapsed = document.getElementById("metricElapsed");
const metricEta = document.getElementById("metricEta");
const metricSpeed = document.getElementById("metricSpeed");

let activeJobId = null;
let pollTimer = null;

const settingIds = [
  "exaggeration",
  "cfg_weight",
  "temperature",
  "repetition_penalty",
  "min_p",
  "top_p",
];

function setStatus(message, isError = false) {
  statusText.textContent = message;
  statusText.style.color = isError ? "#a73232" : "#473c33";
}

function syncSliderValue(sliderId) {
  const input = document.getElementById(sliderId);
  const value = document.getElementById(`${sliderId}Value`);
  value.textContent = Number(input.value).toFixed(2);
}

function readSettings() {
  return settingIds.reduce((settings, id) => {
    settings[id] = Number(document.getElementById(id).value);
    return settings;
  }, {});
}

function formatSeconds(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "--";
  }
  const seconds = Number(value);
  if (seconds < 60) {
    return `${seconds.toFixed(1)}s`;
  }
  const mins = Math.floor(seconds / 60);
  const rem = Math.round(seconds % 60);
  return `${mins}m ${rem}s`;
}

function showProgress() {
  progressCard.classList.remove("hidden");
}

function resetProgressDisplay() {
  progressStage.textContent = "Queued";
  progressPercent.textContent = "0%";
  progressFill.style.width = "0%";
  metricChunks.textContent = "0 / 0";
  metricElapsed.textContent = "0.0s";
  metricEta.textContent = "--";
  metricSpeed.textContent = "0.0 ch/s";
}

function updateProgressDisplay(job) {
  const progress = Math.max(0, Math.min(1, Number(job.progress || 0)));
  progressStage.textContent = job.message || job.stage || "Working";
  progressPercent.textContent = `${Math.round(progress * 100)}%`;
  progressFill.style.width = `${(progress * 100).toFixed(1)}%`;

  const chunksDone = Number(job.chunks_done || 0);
  const chunksTotal = Number(job.chunks_total || 0);
  metricChunks.textContent = `${chunksDone} / ${chunksTotal}`;
  metricElapsed.textContent = formatSeconds(job.elapsed_seconds || 0);
  metricEta.textContent = formatSeconds(job.eta_seconds);
  metricSpeed.textContent = `${Number(job.speed_chars_per_second || 0).toFixed(1)} ch/s`;
}

function schedulePoll(jobId) {
  if (pollTimer) {
    window.clearTimeout(pollTimer);
  }
  pollTimer = window.setTimeout(() => {
    pollTimer = null;
    pollJob(jobId);
  }, 500);
}

async function loadHealth() {
  try {
    const response = await fetch("/api/health");
    const payload = await response.json();
    const chunking =
      payload.device === "mps" && payload.mps_chunk_chars
        ? ` | MPS chunk: ${payload.mps_chunk_chars} chars`
        : "";
    const runningJobs = payload.jobs ? ` | Jobs running: ${payload.jobs.running}` : "";
    healthText.textContent = `Backend: OK | Device: ${payload.device} | Model loaded: ${payload.model_loaded ? "yes" : "no"}${chunking}${runningJobs}`;
  } catch (error) {
    healthText.textContent = "Backend check failed. Is ui_server.py running?";
  }
}

async function loadVoices() {
  const current = voiceSelect.value;
  refreshVoicesBtn.disabled = true;
  try {
    const response = await fetch("/api/voices");
    const payload = await response.json();
    const voices = payload.voices || [];

    voiceSelect.innerHTML = "";
    for (const voice of voices) {
      const option = document.createElement("option");
      option.value = voice.id;
      option.textContent = voice.name;
      voiceSelect.appendChild(option);
    }

    if (current) {
      const match = Array.from(voiceSelect.options).find((option) => option.value === current);
      if (match) {
        voiceSelect.value = current;
      }
    }
    setStatus(`Loaded ${voices.length} voice option(s).`);
  } catch (error) {
    setStatus(`Failed to load voices: ${error.message}`, true);
  } finally {
    refreshVoicesBtn.disabled = false;
  }
}

async function pollJob(jobId) {
  try {
    const response = await fetch(`/api/jobs/${jobId}`);
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error || `HTTP ${response.status}`);
    }

    updateProgressDisplay(payload);

    if (payload.status === "completed") {
      const audioUrl = `${payload.audio_url}?t=${Date.now()}`;
      audioPlayer.src = audioUrl;
      downloadLink.href = audioUrl;
      downloadLink.setAttribute("download", payload.file || "output.wav");
      resultCard.classList.remove("hidden");

      const speed = payload.generation_seconds != null ? ` in ${payload.generation_seconds}s` : "";
      const chunks = payload.chunks_total ? ` (${payload.chunks_total} chunk${payload.chunks_total === 1 ? "" : "s"})` : "";
      const deviceUsed = payload.device_used ? ` on ${String(payload.device_used).toUpperCase()}` : "";
      setStatus(`Generated ${payload.file}${speed}${chunks}${deviceUsed}`);

      generateBtn.disabled = false;
      activeJobId = null;
      await loadHealth();
      return;
    }

    if (payload.status === "failed") {
      throw new Error(payload.error || "Generation failed.");
    }

    schedulePoll(jobId);
  } catch (error) {
    generateBtn.disabled = false;
    activeJobId = null;
    progressStage.textContent = "Failed";
    progressPercent.textContent = "100%";
    progressFill.style.width = "100%";
    metricEta.textContent = "--";
    setStatus(`Generation failed: ${error.message}`, true);
    await loadHealth();
  }
}

async function generateAudio() {
  const text = textInput.value.trim();
  if (!text) {
    setStatus("Enter some text first.", true);
    return;
  }

  if (activeJobId) {
    setStatus("A generation job is already running.", true);
    return;
  }

  generateBtn.disabled = true;
  showProgress();
  resetProgressDisplay();
  setStatus("Submitting generation job...");

  try {
    const response = await fetch("/api/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text,
        voice: voiceSelect.value || "__default__",
        ...readSettings(),
      }),
    });

    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error || `HTTP ${response.status}`);
    }

    if (!payload.job_id) {
      throw new Error("No job id returned from server.");
    }

    activeJobId = payload.job_id;
    setStatus(`Job ${activeJobId} started.`);
    await loadHealth();
    pollJob(activeJobId);
  } catch (error) {
    generateBtn.disabled = false;
    activeJobId = null;
    setStatus(`Generation failed: ${error.message}`, true);
    await loadHealth();
  }
}

for (const id of settingIds) {
  const input = document.getElementById(id);
  input.addEventListener("input", () => syncSliderValue(id));
  syncSliderValue(id);
}

refreshVoicesBtn.addEventListener("click", loadVoices);
generateBtn.addEventListener("click", generateAudio);

loadHealth();
loadVoices();
