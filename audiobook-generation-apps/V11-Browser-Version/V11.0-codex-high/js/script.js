/**
 * AUDIOBOOK STUDIO V11 (BROWSER EDITION)
 * Serverless | Local AI | OPFS Storage
 */

import { pipeline, env } from 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.14.0';

const AUDIO_SETTINGS = Object.freeze({
    format: 'mp3',
    mimeType: 'audio/mpeg',
    sampleRate: 44100,
    channels: 1,
    bitrateKbps: 96,
});

const DEFAULT_VOICE_KEY = 'speecht5:default';

// Configure Transformers.js
env.allowLocalModels = false;
env.useBrowserCache = true;

// --- STATE MANAGEMENT ---
const STATE = {
    project: {
        id: null,
        title: 'Untitled Project',
        chapters: [], // { title, chunks: [] }
        voiceMap: { 0: DEFAULT_VOICE_KEY, 1: DEFAULT_VOICE_KEY }, // 0: Narrator, 1: Voice 2
        voiceParams: { speed: 1.0, emotion: 0.4 },
        mode: 'single',
    },
    models: {
        tts: null,
        vocoder: null,
        ffmpeg: null,
        loaded: { tts: false, ffmpeg: false }
    },
    isGenerating: false,
    isPlaying: false,
    stopSignal: false,
    audioContext: null
};

// --- LOGGING ---
const LOG = {
    add: (msg, type = 'info') => {
        const panel = document.getElementById('console-panel');
        const div = document.createElement('div');
        div.className = `log-entry log-${type}`;
        div.innerText = `[${new Date().toLocaleTimeString()}] ${msg}`;
        panel.prepend(div);
        if (type === 'error') console.error(msg);
    }
};

function createId(prefix = 'id') {
    if (globalThis.crypto?.randomUUID) return `${prefix}_${crypto.randomUUID()}`;
    return `${prefix}_${Math.random().toString(36).slice(2)}_${Date.now()}`;
}

function sanitizeFilename(name, fallback = 'untitled') {
    const cleaned = String(name || '')
        .trim()
        .replace(/[<>:"/\\|?*\x00-\x1F]/g, '_')
        .replace(/\s+/g, ' ')
        .slice(0, 80);
    return cleaned || fallback;
}

function parseVoiceKey(key) {
    const value = String(key || DEFAULT_VOICE_KEY);
    const idx = value.indexOf(':');
    if (idx === -1) return { engineId: 'speecht5', voiceId: 'default' };
    return { engineId: value.slice(0, idx), voiceId: value.slice(idx + 1) || 'default' };
}

// --- STORAGE MANAGER (OPFS) ---
const Storage = {
    root: null,
    
    async init() {
        if (!navigator.storage) {
            LOG.add("OPFS not supported!", 'error');
            return;
        }
        this.root = await navigator.storage.getDirectory();
        this.updateUsage();
    },

    async getProjectDir(projectId) {
        if (!this.root) throw new Error("Storage not initialized");
        const projectsDir = await this.root.getDirectoryHandle('projects', { create: true });
        const projectDir = await projectsDir.getDirectoryHandle(projectId, { create: true });
        const chunksDir = await projectDir.getDirectoryHandle('chunks', { create: true });
        return { projectDir, chunksDir };
    },

    async saveChunk(projectId, chunkId, audioData, format = AUDIO_SETTINGS.format) {
        const { chunksDir } = await this.getProjectDir(projectId);
        const handle = await chunksDir.getFileHandle(`${chunkId}.${format}`, { create: true });
        const writable = await handle.createWritable();
        await writable.write(audioData);
        await writable.close();
        const file = await handle.getFile();
        return URL.createObjectURL(file);
    },

    async loadChunk(projectId, chunkId, format = AUDIO_SETTINGS.format) {
        try {
            const { chunksDir } = await this.getProjectDir(projectId);
            const handle = await chunksDir.getFileHandle(`${chunkId}.${format}`);
            const file = await handle.getFile();
            return URL.createObjectURL(file);
        } catch (e) {
            return null;
        }
    },

    async updateUsage() {
        const est = await navigator.storage.estimate();
        const mb = (est.usage / 1024 / 1024).toFixed(1);
        document.getElementById('storage-info').innerText = `Storage: ${mb} MB used`;
    }
};

// --- ZIP (lazy-loaded) ---
const Zip = {
    mod: null,

    async load() {
        if (this.mod) return this.mod;
        this.mod = await import('https://cdn.jsdelivr.net/npm/fflate@0.8.2/esm/browser.js');
        return this.mod;
    },
};

// --- TTS ENGINE MANAGER ---
const EngineManager = {
    cachedVoices: new Map(),
    statuses: new Map(),

    kokoroFallbackVoices: [
        { id: 'af_heart', name: 'Heart', gender: 'female', accent: 'US' },
        { id: 'af_bella', name: 'Bella', gender: 'female', accent: 'US' },
        { id: 'af_nicole', name: 'Nicole', gender: 'female', accent: 'US' },
        { id: 'af_sarah', name: 'Sarah', gender: 'female', accent: 'US' },
        { id: 'af_sky', name: 'Sky', gender: 'female', accent: 'US' },
        { id: 'am_michael', name: 'Michael', gender: 'male', accent: 'US' },
        { id: 'am_adam', name: 'Adam', gender: 'male', accent: 'US' },
        { id: 'bf_emma', name: 'Emma', gender: 'female', accent: 'UK' },
        { id: 'bf_isabella', name: 'Isabella', gender: 'female', accent: 'UK' },
        { id: 'bm_george', name: 'George', gender: 'male', accent: 'UK' },
        { id: 'bm_lewis', name: 'Lewis', gender: 'male', accent: 'UK' },
    ],

    engines: [
        {
            id: 'speecht5',
            label: 'SpeechT5 (Browser)',
            async listVoices() {
                return [{ id: 'default', name: 'Narrator', gender: 'neutral', accent: 'US', engineId: 'speecht5' }];
            },
            async synthesizeWav({ text }) {
                return AudioEngine.generateWav(text);
            },
        },
        {
            id: 'kokoro',
            label: 'Kokoro (Local Server)',
            async listVoices() {
                try {
                    const resp = await fetch('/api/voices?engine=kokoro');
                    if (!resp.ok) throw new Error(await resp.text());
                    const data = await resp.json();
                    return (data.voices || []).map(v => ({ ...v, engineId: 'kokoro' }));
                } catch {
                    return EngineManager.kokoroFallbackVoices.map(v => ({ ...v, engineId: 'kokoro' }));
                }
            },
            async synthesizeWav({ text, voiceId, speed }) {
                const resp = await fetch('/api/synthesize?engine=kokoro', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ text, voice: voiceId, speed }),
                });
                if (!resp.ok) throw new Error(await resp.text());
                return await resp.blob();
            },
        },
        {
            id: 'chatterbox',
            label: 'Chatterbox (Local Server)',
            async listVoices() {
                try {
                    const resp = await fetch('/api/voices?engine=chatterbox');
                    if (!resp.ok) throw new Error(await resp.text());
                    const data = await resp.json();
                    return (data.voices || []).map(v => ({ ...v, engineId: 'chatterbox' }));
                } catch {
                    return [{ id: 'default', name: 'Default', gender: 'neutral', accent: 'unknown', engineId: 'chatterbox' }];
                }
            },
            async synthesizeWav({ text, voiceId, speed, emotion }) {
                // Chatterbox doesn't expose "speed" directly; keep for future.
                const resp = await fetch('/api/synthesize?engine=chatterbox', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        text,
                        voice: voiceId,
                        exaggeration: emotion,
                    }),
                });
                if (!resp.ok) throw new Error(await resp.text());
                return await resp.blob();
            },
        },
    ],

    getEngine(engineId) {
        return this.engines.find(e => e.id === engineId) || this.engines[0];
    },

    async getVoices(engineId) {
        if (this.cachedVoices.has(engineId)) return this.cachedVoices.get(engineId);
        const engine = this.getEngine(engineId);
        const voices = await engine.listVoices();
        this.cachedVoices.set(engineId, voices);
        return voices;
    },

    async refreshStatuses() {
        try {
            const resp = await fetch('/api/engines');
            if (!resp.ok) throw new Error(await resp.text());
            const data = await resp.json();
            const statuses = new Map((data.engines || []).map(e => [e.id, e]));
            this.statuses = statuses;
            UI.updateEngineStatus('kokoro', statuses.get('kokoro'));
            UI.updateEngineStatus('chatterbox', statuses.get('chatterbox'));
        } catch (e) {
            this.statuses = new Map();
            UI.updateEngineStatus('kokoro', { running: false });
            UI.updateEngineStatus('chatterbox', { running: false });
        }
    },
};

// --- MODEL MANAGER ---
const Models = {
    async loadTTS() {
        if (STATE.models.loaded.tts) return;
        updateProgress('tts', 10, 'Loading Pipeline...');
        try {
            // Using SpeechT5 for decent quality/speed balance
            STATE.models.tts = await pipeline('text-to-speech', 'Xenova/speecht5_tts', {
                progress_callback: (d) => {
                    if(d.status === 'progress') updateProgress('tts', d.progress, `Downloading ${d.file}...`);
                }
            });
            
            STATE.models.loaded.tts = true;
            document.getElementById('status-tts').innerText = "Ready";
            document.getElementById('status-tts').classList.add('success');
            updateProgress('tts', 100, '');
            LOG.add("TTS Model Loaded", 'success');
        } catch (e) {
            LOG.add("TTS Load Failed: " + e.message, 'error');
            updateProgress('tts', 0, 'Error');
        }
    },

    async loadFFmpeg() {
        if (STATE.models.loaded.ffmpeg) return;
        updateProgress('ffmpeg', 20, 'Loading WASM...');
        try {
            // Access globals loaded from local vendor scripts
            // The UMD build of @ffmpeg/ffmpeg exports to FFmpegWASM
            if (!window.FFmpegWASM) {
                console.log("Current window keys:", Object.keys(window).filter(k => k.toLowerCase().includes('ffmpeg')));
                throw new Error("FFmpegWASM global not found. Check console for available keys.");
            }

            const { FFmpeg } = window.FFmpegWASM;
            const { toBlobURL } = window.FFmpegUtil;

            if (!FFmpeg) throw new Error("FFmpeg class not found in FFmpegWASM");

            const ffmpeg = new FFmpeg();
            
            // Pipe internal FFmpeg logs to the UI console for visibility
            ffmpeg.on('log', ({ message }) => {
                console.log('[FFmpeg]', message);
                // Only show relevant startup logs in the UI to avoid spam later
                if (message.toLowerCase().includes('load') || !STATE.models.loaded.ffmpeg) {
                     LOG.add(`[FFmpeg] ${message}`, 'info');
                }
            });
            
            // Step 1: Fetch Core JS
            LOG.add("Downloading ffmpeg-core.js...", 'info');
            updateProgress('ffmpeg', 30, 'Fetching JS...');
            const coreBlob = await toBlobURL('js/vendor/ffmpeg-core.js', 'text/javascript');
            
            // Step 2: Fetch Core WASM
            LOG.add("Downloading ffmpeg-core.wasm (30MB)...", 'info');
            updateProgress('ffmpeg', 60, 'Fetching WASM...');
            const wasmBlob = await toBlobURL('js/vendor/ffmpeg-core.wasm', 'application/wasm');
            
            // Step 3: Initialize Worker
            LOG.add("Initializing FFmpeg Worker...", 'info');
            updateProgress('ffmpeg', 80, 'Initializing...');
            
            await ffmpeg.load({
                coreURL: coreBlob,
                wasmURL: wasmBlob,
            });

            STATE.models.ffmpeg = ffmpeg;
            STATE.models.loaded.ffmpeg = true;
            document.getElementById('status-ffmpeg').innerText = "Ready";
            document.getElementById('status-ffmpeg').classList.add('success');
            updateProgress('ffmpeg', 100, '');
            LOG.add("FFmpeg Loaded", 'success');
        } catch (e) {
            LOG.add("FFmpeg Load Failed: " + e.message, 'error');
            console.error(e);
            updateProgress('ffmpeg', 0, 'Error');
        }
    }
};

function updateProgress(id, pct, text) {
    const bar = document.getElementById(`progress-${id}`);
    if(bar) bar.style.width = `${pct}%`;
    const tag = document.getElementById(`status-${id}`);
    if(tag && text) tag.innerText = text;
}

// --- AUDIO ENGINE ---
const AudioEngine = {
    ctx: null,
    
    init() {
        if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    },

    // Generate audio as WAV using Local AI (SpeechT5)
    async generateWav(text) {
        if (!STATE.models.loaded.tts) await Models.loadTTS();
        
        // Speaker Embeddings for SpeechT5
        const out = await STATE.models.tts(text, { speaker_embeddings: 'https://huggingface.co/datasets/Xenova/transformers.js-docs/resolve/main/speaker_embeddings.bin' });
        
        // out.audio is Float32Array
        return this.encodeWAV(out.audio, out.sampling_rate);
    },

    async wavToMp3(wavBlob, jobId = createId('audio')) {
        if (!STATE.models.loaded.ffmpeg) await Models.loadFFmpeg();
        const ffmpeg = STATE.models.ffmpeg;

        const inName = `in_${jobId}.wav`;
        const outName = `out_${jobId}.mp3`;

        const buf = new Uint8Array(await wavBlob.arrayBuffer());
        await ffmpeg.writeFile(inName, buf);

        try {
            await ffmpeg.exec([
                '-hide_banner',
                '-y',
                '-i', inName,
                '-vn',
                '-ac', String(AUDIO_SETTINGS.channels),
                '-ar', String(AUDIO_SETTINGS.sampleRate),
                '-c:a', 'libmp3lame',
                '-b:a', `${AUDIO_SETTINGS.bitrateKbps}k`,
                outName
            ]);
        } catch (e) {
            throw new Error(`MP3 encode failed (FFmpeg.wasm). If this persists, update the bundled FFmpeg core to include MP3 encoding. Original: ${e.message}`);
        } finally {
            try { await ffmpeg.deleteFile?.(inName); } catch {}
        }

        const out = await ffmpeg.readFile(outName);
        try { await ffmpeg.deleteFile?.(outName); } catch {}
        return new Blob([out], { type: AUDIO_SETTINGS.mimeType });
    },

    async generateMp3(text, jobId) {
        const wav = await this.generateWav(text);
        return this.wavToMp3(wav, jobId);
    },

    encodeWAV(samples, sampleRate) {
        const buffer = new ArrayBuffer(44 + samples.length * 2);
        const view = new DataView(buffer);

        const writeString = (offset, string) => {
            for (let i = 0; i < string.length; i++) {
                view.setUint8(offset + i, string.charCodeAt(i));
            }
        };

        writeString(0, 'RIFF');
        view.setUint32(4, 36 + samples.length * 2, true);
        writeString(8, 'WAVE');
        writeString(12, 'fmt ');
        view.setUint32(16, 16, true);
        view.setUint16(20, 1, true); // PCM
        view.setUint16(22, 1, true); // Channels
        view.setUint32(24, sampleRate, true);
        view.setUint32(28, sampleRate * 2, true);
        view.setUint16(32, 2, true); // Block align
        view.setUint16(34, 16, true); // Bits per sample
        writeString(36, 'data');
        view.setUint32(40, samples.length * 2, true);

        for (let i = 0; i < samples.length; i++) {
            let s = Math.max(-1, Math.min(1, samples[i]));
            s = s < 0 ? s * 0x8000 : s * 0x7FFF;
            view.setInt16(44 + i * 2, s, true);
        }

        return new Blob([buffer], { type: 'audio/wav' });
    }
};

// --- UI CONTROLLERS ---
const UI = {
    switchTab(id) {
        document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
        document.querySelectorAll('.sidebar-item').forEach(el => el.classList.remove('active'));
        
        document.getElementById(`tab-${id}`).classList.add('active');
        document.getElementById(`tab-btn-${id}`).classList.add('active');
    },

    toggleDualMode() {
        const mode = document.getElementById('project-mode').value;
        STATE.project.mode = mode;
        document.getElementById('group-voice-2').style.display = mode === 'dual' ? 'block' : 'none';
    },

    updateVoiceButton(roleIdx) {
        const btn = document.getElementById(`voice-select-btn-${roleIdx + 1}`);
        const key = STATE.project.voiceMap[roleIdx] || DEFAULT_VOICE_KEY;
        const { engineId, voiceId } = parseVoiceKey(key);
        btn.querySelector('span').innerText = `${EngineManager.getEngine(engineId).label}: ${voiceId}`;
    },

    updateAllVoiceButtons() {
        UI.updateVoiceButton(0);
        UI.updateVoiceButton(1);
    },

    updateEngineStatus(engineId, status) {
        const el = document.getElementById(`status-${engineId}`);
        if (!el) return;
        if (status?.running) {
            el.innerText = 'Running';
            el.classList.add('success');
        } else {
            el.innerText = 'Not Running';
            el.classList.remove('success');
        }
    },

    closeVoiceDropdown() {
        const dd = document.getElementById('voice-dropdown');
        dd.classList.remove('show');
        dd.innerHTML = '';
    },

    async openVoiceDropdown(role, event) {
        event?.preventDefault?.();
        event?.stopPropagation?.();

        const roleIdx = role - 1;
        const dd = document.getElementById('voice-dropdown');
        const btn = document.getElementById(`voice-select-btn-${role}`);

        // Position dropdown under the clicked button
        const rect = btn.getBoundingClientRect();
        dd.style.position = 'fixed';
        dd.style.left = `${rect.left}px`;
        dd.style.top = `${rect.bottom + 6}px`;
        dd.style.width = `${rect.width}px`;

        dd.innerHTML = '';
        dd.classList.add('show');

        for (const engine of EngineManager.engines) {
            const group = document.createElement('div');
            group.className = 'voice-group';
            group.innerText = engine.label;
            dd.appendChild(group);

            const status = EngineManager.statuses?.get?.(engine.id);
            if ((engine.id === 'kokoro' || engine.id === 'chatterbox') && status && !status.running) {
                const opt = document.createElement('div');
                opt.className = 'voice-option disabled';
                opt.innerHTML = `Start ${engine.label} to use it<small>Run the local server, then click “Refresh Status”.</small>`;
                dd.appendChild(opt);
                continue;
            }

            const voices = await EngineManager.getVoices(engine.id);
            for (const v of voices) {
                const opt = document.createElement('div');
                opt.className = 'voice-option';
                opt.innerHTML = `${v.name || v.id}<small>${v.gender || 'unknown'} • ${v.accent || 'unknown'}</small>`;
                opt.onclick = () => {
                    STATE.project.voiceMap[roleIdx] = `${engine.id}:${v.id}`;
                    UI.updateVoiceButton(roleIdx);
                    UI.closeVoiceDropdown();
                };
                dd.appendChild(opt);
            }
        }
    },

    renderTimeline() {
        const container = document.getElementById('timeline-container');
        if (STATE.project.chapters.length === 0) {
            container.innerHTML = '<div class="empty-state">No chapters. Paste text & Analyze.</div>';
            return;
        }

        container.innerHTML = STATE.project.chapters.map((ch, chIdx) => `
            <div class="chapter-card">
                <div class="chapter-header">
                    <span class="ch-title" onclick="UI.scrollToChapter(${chIdx})">${ch.title}</span>
                    <div class="ch-meta">
                        <span>${ch.chunks.length} Segments</span>
                        ${ch.audioUrl ? '<span style="color:var(--success)">✓ Ready</span>' : ''}
                    </div>
                </div>
                <div>
                    ${ch.chunks.map((ck, ckIdx) => `
                        <div class="chunk-item ${ck.status === 'done' ? 'status-done' : ''}" id="chunk-${chIdx}-${ckIdx}" onclick="Player.playChunk(${chIdx}, ${ckIdx})">
                            <span style="width:20px;text-align:center;color:var(--text-dim)">${ckIdx + 1}</span>
                            <span class="chunk-content">${ck.text.substring(0, 50)}...</span>
                            ${ck.status === 'done' ? '<span>✓</span>' : ''}
                        </div>
                    `).join('')}
                </div>
            </div>
        `).join('');
    },
    
    scrollToChapter(idx) {
        // Optional smooth scroll logic
    }
};

// --- LOGIC ---
const Core = {
    ensureProjectId() {
        if (!STATE.project.id) STATE.project.id = createId('project');
    },

    resetProject() {
        Core.revokeAllAudioUrls();
        Player.stop?.();
        STATE.project = {
            id: createId('project'),
            title: 'Untitled Project',
            chapters: [],
            voiceMap: { 0: DEFAULT_VOICE_KEY, 1: DEFAULT_VOICE_KEY },
            voiceParams: { speed: 1.0, emotion: 0.4 },
            mode: 'single',
        };
        document.getElementById('manuscript').value = '';
        document.getElementById('project-mode').value = 'single';
        UI.toggleDualMode();
        document.getElementById('voice-speed').value = '1';
        document.getElementById('voice-emotion').value = '0.4';
        UI.updateAllVoiceButtons();
        document.getElementById('btn-generate-all').disabled = true;
        document.getElementById('btn-export-all').disabled = true;
        document.getElementById('btn-halt').style.display = 'none';
        UI.renderTimeline();
        LOG.add("New project created", 'success');
    },

    revokeAllAudioUrls() {
        for (const ch of STATE.project.chapters || []) {
            for (const ck of ch.chunks || []) {
                if (ck.audioUrl) {
                    try { URL.revokeObjectURL(ck.audioUrl); } catch {}
                    ck.audioUrl = null;
                }
            }
        }
    },

    analyzeText() {
        Core.ensureProjectId();
        const text = document.getElementById('manuscript').value;
        if (!text.trim()) return;

        // Simple Chapter Splitter
        const chapterRegex = /(?:^|\n)#\s+(.+?)(?:\n|$)/g;
        const parts = text.split(chapterRegex);
        
        STATE.project.chapters = [];
        
        // Handle Intro (before first #)
        if (parts[0].trim()) {
            STATE.project.chapters.push(Core.createChapter('Introduction', parts[0]));
        }

        for (let i = 1; i < parts.length; i += 2) {
            const title = parts[i];
            const content = parts[i+1];
            if (content && content.trim()) {
                STATE.project.chapters.push(Core.createChapter(title, content));
            }
        }

        UI.renderTimeline();
        document.getElementById('btn-generate-all').disabled = false;
        LOG.add(`Analyzed ${STATE.project.chapters.length} chapters.`);
    },

    createChapter(title, text) {
        const blocks = String(text).split(/\n\s*\*\s*\*\s*\*\s*\n/g);
        const chunks = [];
        let role = 0;

        for (const block of blocks) {
            const sentences = block.match(/[^.!?]+[.!?]+(?:\s|$)/g) || [block];
            let currentChunk = "";

            sentences.forEach(s => {
                if (currentChunk.length + s.length > 200) {
                    chunks.push({
                        text: currentChunk.trim(),
                        status: 'pending',
                        id: createId('chunk'),
                        audioFormat: AUDIO_SETTINGS.format,
                        voiceRole: role,
                    });
                    currentChunk = "";
                }
                currentChunk += s;
            });

            if (currentChunk.trim()) {
                chunks.push({
                    text: currentChunk.trim(),
                    status: 'pending',
                    id: createId('chunk'),
                    audioFormat: AUDIO_SETTINGS.format,
                    voiceRole: role,
                });
            }

            role = role === 0 ? 1 : 0;
        }

        return {
            title,
            chunks,
            status: 'pending'
        };
    },

    async synthesizeChunkToMp3(text, roleIdx, jobId) {
        const key = STATE.project.voiceMap[roleIdx] || DEFAULT_VOICE_KEY;
        const { engineId, voiceId } = parseVoiceKey(key);
        const engine = EngineManager.getEngine(engineId);
        const speed = Number(STATE.project.voiceParams?.speed || 1.0);
        const emotion = Number(STATE.project.voiceParams?.emotion ?? 0.4);

        const audio = await engine.synthesizeWav({ text, voiceId, speed, emotion });
        if (audio.type === AUDIO_SETTINGS.mimeType) return audio;
        return AudioEngine.wavToMp3(audio, jobId);
    },

    async generateAll() {
        Core.ensureProjectId();
        if (!STATE.models.loaded.ffmpeg) await Models.loadFFmpeg();
        const enginesUsed = new Set([parseVoiceKey(STATE.project.voiceMap[0]).engineId]);
        if (STATE.project.mode === 'dual') enginesUsed.add(parseVoiceKey(STATE.project.voiceMap[1]).engineId);
        if (enginesUsed.has('speecht5') && !STATE.models.loaded.tts) await Models.loadTTS();

        STATE.isGenerating = true;
        STATE.stopSignal = false;
        document.getElementById('btn-halt').style.display = 'inline-block';
        document.getElementById('btn-generate-all').disabled = true;
        document.getElementById('btn-export-all').disabled = true;

        for (let i = 0; i < STATE.project.chapters.length; i++) {
            const ch = STATE.project.chapters[i];

            for (let j = 0; j < ch.chunks.length; j++) {
                if (STATE.stopSignal) break;

                const ck = ch.chunks[j];
                const el = document.getElementById(`chunk-${i}-${j}`);

                if (ck.status !== 'done') {
                    if (el) el.classList.add('status-processing');
                    try {
                        // GENERATE MP3
                        const jobId = ck.id || createId('chunk');
                        ck.id = jobId;
                        const roleIdx = STATE.project.mode === 'dual' ? (ck.voiceRole ?? 0) : 0;
                        const mp3 = await Core.synthesizeChunkToMp3(ck.text, roleIdx, jobId);
                        const url = await Storage.saveChunk(STATE.project.id, ck.id, mp3, AUDIO_SETTINGS.format);
                        ck.audioUrl = url;
                        ck.audioFormat = AUDIO_SETTINGS.format;
                        ck.status = 'done';

                        if (el) {
                            el.classList.remove('status-processing');
                            el.classList.add('status-done');
                        }
                    } catch (e) {
                        LOG.add(`Gen Error Ch${i+1}:${j+1}: ${e.message}`, 'error');
                        if (el) el.classList.add('status-error');
                    }
                }
            }
        }

        STATE.isGenerating = false;
        document.getElementById('btn-halt').style.display = 'none';
        document.getElementById('btn-generate-all').disabled = false;
        const anyDone = STATE.project.chapters.some(ch => ch.chunks.some(ck => ck.status === 'done'));
        document.getElementById('btn-export-all').disabled = !anyDone;
        LOG.add("Generation Complete", 'success');
        Storage.updateUsage();
    },

    async exportAll() {
        Core.ensureProjectId();
        if (!STATE.models.loaded.ffmpeg) await Models.loadFFmpeg();

        LOG.add("Starting Export (ZIP)...", 'info');

        const ffmpeg = STATE.models.ffmpeg;

        const { zipSync, strToU8 } = await Zip.load();
        const files = {};

        for (let i = 0; i < STATE.project.chapters.length; i++) {
            const ch = STATE.project.chapters[i];
            if (!ch.chunks.some(c => c.status === 'done')) continue;

            LOG.add(`Rendering Chapter ${i+1} MP3...`);

            try {
                const chunkFiles = [];
                // 1. Write chunks to FFmpeg FS
                for (let j = 0; j < ch.chunks.length; j++) {
                    const ck = ch.chunks[j];
                    if (ck.status !== 'done') continue;

                    const fname = `c${i}_p${j}.mp3`;
                    const blob = await (await fetch(ck.audioUrl)).blob();
                    const buf = await blob.arrayBuffer();
                    await ffmpeg.writeFile(fname, new Uint8Array(buf));
                    chunkFiles.push(`file '${fname}'`);
                }

                // 2. Create list.txt
                const listName = `list_${i}.txt`;
                await ffmpeg.writeFile(listName, strToU8(chunkFiles.join('\n')));

                // 3. Run Merge
                const outName = `Chapter_${i+1}.mp3`;
                await ffmpeg.exec([
                    '-hide_banner',
                    '-y',
                    '-f', 'concat',
                    '-safe', '0',
                    '-i', listName,
                    '-vn',
                    '-ac', String(AUDIO_SETTINGS.channels),
                    '-ar', String(AUDIO_SETTINGS.sampleRate),
                    '-c:a', 'libmp3lame',
                    '-b:a', `${AUDIO_SETTINGS.bitrateKbps}k`,
                    outName
                ]);

                // 4. Read back
                const data = await ffmpeg.readFile(outName);
                const title = sanitizeFilename(ch.title, `Chapter_${i + 1}`);
                files[`chapters/${String(i + 1).padStart(2, '0')}_${title}.mp3`] = data;

                // Cleanup
                try { await ffmpeg.deleteFile?.(outName); } catch {}
                try { await ffmpeg.deleteFile?.(listName); } catch {}
                for (let j = 0; j < ch.chunks.length; j++) {
                    try { await ffmpeg.deleteFile?.(`c${i}_p${j}.mp3`); } catch {}
                }

            } catch (e) {
                LOG.add(`Export Failed Ch${i+1}: ${e.message}`, 'error');
                console.error(e);
            }
        }

        const projectForSave = Core.serializeProject();
        files['project.json'] = strToU8(JSON.stringify(projectForSave, null, 2));
        files['manifest.json'] = strToU8(JSON.stringify({
            title: STATE.project.title,
            projectId: STATE.project.id,
            audio: { ...AUDIO_SETTINGS },
            createdAt: new Date().toISOString(),
        }, null, 2));

        const zipData = zipSync(files, { level: 6 });
        const zipBlob = new Blob([zipData], { type: 'application/zip' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(zipBlob);
        a.download = `${sanitizeFilename(STATE.project.title)}_export.zip`;
        a.click();
        LOG.add("Export Complete", 'success');
    },

    serializeProject() {
        const clone = JSON.parse(JSON.stringify(STATE.project));
        for (const ch of clone.chapters || []) {
            delete ch.audioUrl;
            for (const ck of ch.chunks || []) {
                delete ck.audioUrl;
            }
        }
        return clone;
    },

    saveProject() {
        Core.ensureProjectId();
        const data = JSON.stringify(Core.serializeProject(), null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${STATE.project.title.replace(/\s+/g, '_')}_project.json`;
        a.click();
        URL.revokeObjectURL(url);
        LOG.add("Project saved to JSON", 'success');
    },

    triggerLoad() {
        document.getElementById('file-upload').click();
    },

    loadProject(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const data = JSON.parse(e.target.result);
                // Validate basic structure
                if (!data.chapters) throw new Error("Invalid project file");
                
                STATE.project = data;
                Core.ensureProjectId();

                // Ensure chunk IDs exist (older saves)
                for (const ch of STATE.project.chapters) {
                    for (const ck of ch.chunks || []) {
                        if (!ck.id) ck.id = createId('chunk');
                        ck.audioFormat = AUDIO_SETTINGS.format;
                        if (ck.voiceRole !== 0 && ck.voiceRole !== 1) ck.voiceRole = 0;
                    }
                }
                if (!STATE.project.voiceMap) STATE.project.voiceMap = { 0: DEFAULT_VOICE_KEY, 1: DEFAULT_VOICE_KEY };
                for (const k of Object.keys(STATE.project.voiceMap)) {
                    const v = STATE.project.voiceMap[k];
                    if (typeof v !== 'string' || !v.includes(':')) STATE.project.voiceMap[k] = DEFAULT_VOICE_KEY;
                }
                if (!STATE.project.voiceParams) STATE.project.voiceParams = { speed: 1.0, emotion: 0.4 };
                UI.updateAllVoiceButtons();
                document.getElementById('voice-speed').value = String(STATE.project.voiceParams.speed ?? 1.0);
                document.getElementById('voice-emotion').value = String(STATE.project.voiceParams.emotion ?? 0.4);

                // Rehydrate audio URLs from OPFS if generated previously
                await Core.rehydrateAudioUrls();

                UI.renderTimeline();
                
                // Restore UI state
                document.getElementById('manuscript').value = data.chapters.map(c => c.chunks.map(k => k.text).join(' ')).join('\n\n# ');
                
                // Re-enable Generate/Export if chapters exist
                if (STATE.project.chapters.length > 0) {
                    document.getElementById('btn-generate-all').disabled = false;
                    const anyDone = STATE.project.chapters.some(ch => ch.chunks.some(ck => ck.status === 'done'));
                    if (anyDone) document.getElementById('btn-export-all').disabled = false;
                }

                LOG.add(`Loaded project: ${data.title}`, 'success');
            } catch (err) {
                LOG.add("Failed to load project: " + err.message, 'error');
            }
        };
        reader.readAsText(file);
    },

    async rehydrateAudioUrls() {
        if (!Storage.root) await Storage.init();
        const projectId = STATE.project.id;
        for (const ch of STATE.project.chapters || []) {
            for (const ck of ch.chunks || []) {
                if (ck.status === 'done') {
                    ck.audioUrl = await Storage.loadChunk(projectId, ck.id, AUDIO_SETTINGS.format);
                    if (!ck.audioUrl) ck.status = 'pending';
                }
            }
        }
        Storage.updateUsage();
    }
};

const Player = {
    audio: new Audio(),
    queue: [],
    isQueueing: false,
    currentLabel: null,
    
    playChunk(chIdx, ckIdx) {
        const ch = STATE.project.chapters[chIdx];
        if (!ch) return;
        const ck = ch.chunks[ckIdx];
        
        if (ck.audioUrl) {
            this.audio.src = ck.audioUrl;
            this.audio.play();
            LOG.add(`Playing: ${ck.text.substring(0, 20)}...`);
        } else {
            // Fallback: System TTS for preview if not generated
            const u = new SpeechSynthesisUtterance(ck.text);
            window.speechSynthesis.speak(u);
            LOG.add("Previewing (System Voice)...");
        }
    },

    playAll() {
        const items = [];
        for (let i = 0; i < STATE.project.chapters.length; i++) {
            for (let j = 0; j < STATE.project.chapters[i].chunks.length; j++) {
                const ck = STATE.project.chapters[i].chunks[j];
                if (ck?.audioUrl) items.push({ chIdx: i, ckIdx: j });
            }
        }
        if (items.length === 0) {
            LOG.add("Nothing to play yet. Generate audio first.", 'warning');
            return;
        }
        this.queue = items;
        this.isQueueing = true;
        this.nextInQueue();
    },

    stop() {
        this.queue = [];
        this.isQueueing = false;
        this.audio.pause();
        this.audio.currentTime = 0;
        document.getElementById('player-status').innerText = 'Idle';
        const slider = document.getElementById('master-progress');
        slider.disabled = true;
        slider.value = 0;
    },

    nextInQueue() {
        const next = this.queue.shift();
        if (!next) {
            this.isQueueing = false;
            document.getElementById('player-status').innerText = 'Done';
            return;
        }
        this.playChunk(next.chIdx, next.ckIdx);
    }
};

// --- EVENTS ---
document.getElementById('btn-analyze').onclick = Core.analyzeText;
document.getElementById('btn-generate-all').onclick = Core.generateAll;
document.getElementById('btn-export-all').onclick = Core.exportAll;
document.getElementById('btn-save-project').onclick = Core.saveProject;
document.getElementById('btn-load-project').onclick = Core.triggerLoad;
document.getElementById('file-upload').onchange = Core.loadProject;
document.getElementById('btn-halt').onclick = () => { STATE.stopSignal = true; LOG.add("Stopping...", 'warning'); };
document.getElementById('btn-load-tts').onclick = Models.loadTTS;
document.getElementById('btn-load-ffmpeg').onclick = Models.loadFFmpeg;
document.getElementById('btn-new-project').onclick = Core.resetProject;
document.getElementById('btn-play-all').onclick = () => Player.playAll();
document.getElementById('btn-refresh-engines').onclick = () => EngineManager.refreshStatuses();
document.getElementById('voice-speed').oninput = (e) => { STATE.project.voiceParams.speed = Number(e.target.value); };
document.getElementById('voice-emotion').oninput = (e) => { STATE.project.voiceParams.emotion = Number(e.target.value); };

// Tab Switching
window.switchTab = UI.switchTab;
window.toggleDualMode = UI.toggleDualMode;
window.UI = UI;
window.Player = Player;
window.openVoiceDropdown = UI.openVoiceDropdown;

// Close dropdown when clicking elsewhere
document.addEventListener('click', () => UI.closeVoiceDropdown());

// Player wiring
Player.audio.addEventListener('ended', () => {
    if (Player.isQueueing) Player.nextInQueue();
});

Player.audio.addEventListener('play', () => {
    document.getElementById('player-status').innerText = 'Playing';
    const slider = document.getElementById('master-progress');
    slider.disabled = false;
});

Player.audio.addEventListener('pause', () => {
    if (Player.audio.ended) return;
    if (!Player.isQueueing) document.getElementById('player-status').innerText = 'Paused';
});

Player.audio.addEventListener('timeupdate', () => {
    const slider = document.getElementById('master-progress');
    if (slider.disabled) return;
    const dur = Player.audio.duration || 0;
    if (dur > 0) slider.value = (Player.audio.currentTime / dur) * 100;
});

document.getElementById('master-progress').addEventListener('input', (e) => {
    const dur = Player.audio.duration || 0;
    if (dur <= 0) return;
    Player.audio.currentTime = (Number(e.target.value) / 100) * dur;
});

async function initApp() {
    await Storage.init();
    UI.renderTimeline();
    if (!crossOriginIsolated) {
        LOG.add("Warning: crossOriginIsolated is false. Run via `node server_local.js` (COOP/COEP) or FFmpeg.wasm may fail.", 'warning');
    }
    UI.updateAllVoiceButtons();
    await EngineManager.refreshStatuses();
    LOG.add(`Welcome to Audiobook Studio V11 (Local) — MP3 ${AUDIO_SETTINGS.bitrateKbps}kbps`, 'success');
}

initApp();
