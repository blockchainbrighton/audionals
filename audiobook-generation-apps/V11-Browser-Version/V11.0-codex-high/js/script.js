/**
 * AUDIOBOOK STUDIO V11 (BROWSER EDITION)
 * Serverless | Local AI | OPFS Storage
 */

import { pipeline, env } from 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.14.0';

// Configure Transformers.js
env.allowLocalModels = false;
env.useBrowserCache = true;

// --- STATE MANAGEMENT ---
const STATE = {
    project: {
        id: null,
        title: 'Untitled Project',
        chapters: [], // { title, chunks: [] }
        voiceMap: { 0: 'local-ai', 1: 'local-ai' }, // 0: Narrator, 1: Character
        mode: 'single'
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

    async saveChunk(id, audioData, format = 'wav') {
        // audioData is Blob or ArrayBuffer
        const handle = await this.root.getFileHandle(`${id}.${format}`, { create: true });
        const writable = await handle.createWritable();
        await writable.write(audioData);
        await writable.close();
        return URL.createObjectURL(new Blob([audioData], { type: `audio/${format}` }));
    },

    async loadChunk(id, format = 'wav') {
        try {
            const handle = await this.root.getFileHandle(`${id}.${format}`);
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

    // Generate Audio File (WAV) using Local AI
    async generate(text) {
        if (!STATE.models.loaded.tts) await Models.loadTTS();
        
        // Speaker Embeddings for SpeechT5
        const out = await STATE.models.tts(text, { speaker_embeddings: 'https://huggingface.co/datasets/Xenova/transformers.js-docs/resolve/main/speaker_embeddings.bin' });
        
        // out.audio is Float32Array
        return this.encodeWAV(out.audio, out.sampling_rate);
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
    analyzeText() {
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
        // Simple sentence splitter for chunks
        const sentences = text.match(/[^.!?]+[.!?]+(?:\s|$)/g) || [text];
        // Group sentences into chunks ~200 chars
        const chunks = [];
        let currentChunk = "";
        
        sentences.forEach(s => {
            if (currentChunk.length + s.length > 200) {
                chunks.push({ text: currentChunk.trim(), status: 'pending', id: Math.random().toString(36).substr(2) });
                currentChunk = "";
            }
            currentChunk += s;
        });
        if (currentChunk.trim()) chunks.push({ text: currentChunk.trim(), status: 'pending', id: Math.random().toString(36).substr(2) });

        return {
            title,
            chunks,
            status: 'pending'
        };
    },

    async generateAll() {
        if (!STATE.models.loaded.tts) await Models.loadTTS();
        
        STATE.isGenerating = true;
        STATE.stopSignal = false;
        document.getElementById('btn-halt').style.display = 'inline-block';
        document.getElementById('btn-generate-all').disabled = true;

        for (let i = 0; i < STATE.project.chapters.length; i++) {
            const ch = STATE.project.chapters[i];
            
            for (let j = 0; j < ch.chunks.length; j++) {
                if (STATE.stopSignal) break;
                
                const ck = ch.chunks[j];
                const el = document.getElementById(`chunk-${i}-${j}`);
                
                if (ck.status !== 'done') {
                    if (el) el.classList.add('status-processing');
                    try {
                        // GENERATE
                        const blob = await AudioEngine.generate(ck.text);
                        const url = await Storage.saveChunk(ck.id, blob, 'wav');
                        ck.audioUrl = url;
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
        document.getElementById('btn-export-all').disabled = false;
        LOG.add("Generation Complete", 'success');
        Storage.updateUsage();
    },

    async exportAll() {
        if (!STATE.models.loaded.ffmpeg) {
            await Models.loadFFmpeg();
        }
        
        LOG.add("Starting Export...", 'info');
        
        const ffmpeg = STATE.models.ffmpeg;
        
        for (let i = 0; i < STATE.project.chapters.length; i++) {
            const ch = STATE.project.chapters[i];
            if (!ch.chunks.some(c => c.status === 'done')) continue;

            LOG.add(`Merging Chapter ${i+1}...`);
            
            try {
                const chunkFiles = [];
                // 1. Write chunks to FFmpeg FS
                for (let j = 0; j < ch.chunks.length; j++) {
                    const ck = ch.chunks[j];
                    if (ck.status !== 'done') continue;
                    
                    const fname = `c${i}_p${j}.wav`;
                    const blob = await (await fetch(ck.audioUrl)).blob();
                    const buf = await blob.arrayBuffer();
                    await ffmpeg.writeFile(fname, new Uint8Array(buf));
                    chunkFiles.push(`file '${fname}'`);
                }

                // 2. Create list.txt
                await ffmpeg.writeFile(`list_${i}.txt`, chunkFiles.join('\n'));

                // 3. Run Merge
                const outName = `Chapter_${i+1}.wav`;
                await ffmpeg.exec(['-f', 'concat', '-safe', '0', '-i', `list_${i}.txt`, '-c', 'copy', outName]);

                // 4. Read back
                const data = await ffmpeg.readFile(outName);
                
                // 5. Download
                const outBlob = new Blob([data.buffer], { type: 'audio/wav' });
                const a = document.createElement('a');
                a.href = URL.createObjectURL(outBlob);
                a.download = `${STATE.project.title.replace(/\s+/g, '_')}_Chapter_${i+1}.wav`;
                a.click();
                
                // Cleanup
                // await ffmpeg.deleteFile(outName);
                // chunkFiles.forEach(f => ffmpeg.deleteFile(f.split("'"[1]));

            } catch (e) {
                LOG.add(`Export Failed Ch${i+1}: ${e.message}`, 'error');
                console.error(e);
            }
        }
        LOG.add("Export Complete", 'success');
    },

    saveProject() {
        const data = JSON.stringify(STATE.project, null, 2);
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
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                // Validate basic structure
                if (!data.chapters) throw new Error("Invalid project file");
                
                STATE.project = data;
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
    }
};

const Player = {
    audio: new Audio(),
    
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

// Tab Switching
window.switchTab = UI.switchTab;
window.toggleDualMode = UI.toggleDualMode;
window.openVoiceDropdown = (id) => {
    // Simple alert for now as we only support one model in V11 Basic
    alert("V11 Basic currently supports standard English Narrator (SpeechT5). Multi-voice support coming in V11 Pro.");
};

// Init
Storage.init();
LOG.add("Welcome to Audiobook Studio V11 (Local)", 'success');
