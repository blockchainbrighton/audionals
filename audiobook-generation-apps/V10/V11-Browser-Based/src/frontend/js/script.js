import { StorageService } from './storage.js';
import { FFmpeg } from 'https://unpkg.com/@ffmpeg/ffmpeg@0.12.10/dist/esm/index.js';
import { fetchFile } from 'https://unpkg.com/@ffmpeg/util@0.12.1/dist/esm/index.js';

/**
 * AUDIOBOOK GENERATOR v3 (Browser-Based / Static)
 */

// --- 1. STATE & STORAGE ---
const storage = new StorageService();
const ffmpeg = new FFmpeg();
let ffmpegLoaded = false;

const STATE = {
    chapters: [],
    voices: [],
    project: {
        id: 'proj_' + Date.now().toString(36),
        mode: 'single', // 'single' or 'dual'
        voiceIds: [null, null], // [Voice 1, Voice 2]
        voiceNames: ['', ''],
        token: '* * *'
    },
    isProcessing: false,
    isPlaying: false,
    activePlaybackId: null, 
    activeVoiceSlot: null,
    halt: false,
    sessionCost: 0,
    api: {
        elevenLabs: {
            key: '',
            name: '',
            voices: [],
            connected: false
        }
    }
};

// UI Helpers
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

function switchTab(tabName) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.settings-content').forEach(c => c.classList.remove('active'));
    
    const index = tabName === 'project' ? 0 : 1;
    document.querySelectorAll('.tab')[index].classList.add('active');
    document.getElementById(`tab-${tabName}`).classList.add('active');
}

// --- TEXT PARSER ---
const LANG_CONFIG = [
  ['en', 'English', ['Chapter'], ['By', 'Written by', 'Narrated by']],
  ['de', 'German', ['Kapitel'], ['Von', 'Geschrieben von']],
  ['es', 'Spanish', ['Capítulo', 'Capitulo'], ['Por', 'Escrito por']],
  ['fr', 'French', ['Chapitre'], ['Par', 'Écrit par']],
  ['it', 'Italian', ['Capitolo'], ['Di', 'Scritto da']],
  ['pt', 'Portuguese', ['Capítulo', 'Capitulo'], ['Por', 'Escrito por']],
  ['nl', 'Dutch', ['Hoofdstuk'], ['Door', 'Geschreven door']],
  ['pl', 'Polish', ['Rozdział'], ['Przez', 'Napisał']],
  ['ru', 'Russian', ['Глава'], ['Автор']],
  ['tr', 'Turkish', ['Bölüm'], ['Yazan']],
  ['fi', 'Finnish', ['Luku'], ['Kirjoittanut']],
  ['hu', 'Hungarian', ['Fejezet'], ['Írta']],
  ['cs', 'Czech', ['Kapitola'], ['Napsal']],
  ['el', 'Greek', ['Κεφάλαιο'], ['Από']],
  ['id', 'Indonesian', ['Bab'], ['Oleh']],
  ['unk', 'Unknown', ['Part', 'Parte', 'Partie', 'Teil', 'Livre', 'Libro', 'Buch'], []]
];

const TextParser = {
    escapeRegex: (v) => v.replace(/[.*+?^${}()|[\\]/g, '\\$&'),
    _chReg: null,
    getChapterHeadingRegex: function() {
        if(this._chReg) return this._chReg;
        const kw = LANG_CONFIG.flatMap(l => l[2]).sort((a, b) => b.length - a.length);
        return this._chReg = new RegExp(`(^\\s*(?:#{1,6}\\s+[^\\n#]+|(?:${kw.map(this.escapeRegex).join('|')})(?:\\s+[^\\n]+)?)\\s*$)`, 'gmi');
    },
    parseDualVoiceSegments: function(text, delim = '* * *', initVoiceIndex = 0, voiceNames = []) {
        const segs = [];
        const token = delim.trim() || '* * *';
        const escToken = token.replace(/[.*+?^${}()|[\\]/g, '\\$&');
        const parts = text.split(new RegExp(escToken, 'g'));
        let currentVoice = initVoiceIndex % 2; 
        parts.forEach(part => {
            let content = part.trim();
            if(content) {
                if (voiceNames && voiceNames[currentVoice]) {
                    const name = voiceNames[currentVoice];
                    const nameRegex = new RegExp(`^(${TextParser.escapeRegex(name)})([:|.]?)(\\s+)`, 'i');
                    if (nameRegex.test(content)) content = content.replace(nameRegex, '$1... ... ... $3');
                }
                segs.push({ text: content, voiceIndex: currentVoice });
            }
            currentVoice = (currentVoice + 1) % 2;
        });
        return segs;
    },
    detectProjectMetadata: function(manuscript, preamble) {
        let lang = 'English', title = 'Untitled Book', author = 'Unknown Author';
        for (const l of LANG_CONFIG) {
            if (l[0] === 'unk') continue;
            const sample = manuscript.substring(0, 1000);
            for (const kw of l[2]) {
                const re = new RegExp(`^\\s*${TextParser.escapeRegex(kw)}\\s+`, 'mi');
                if (re.test(sample)) { lang = l[1]; break; }
            }
            if (lang !== 'English') break;
        }
        if (preamble && preamble.trim()) {
            const lines = preamble.split('\n').map(l => l.trim()).filter(Boolean);
            if (lines.length) {
                title = lines[0];
                const lc = LANG_CONFIG.find(l => l[1] === lang) || LANG_CONFIG[0];
                const byKw = [...(lc[3] || []), 'By', 'Author', 'Written by'];
                for (const line of lines) {
                    for (const bk of byKw) {
                        const m = line.match(new RegExp(`^${TextParser.escapeRegex(bk)}[:\\s]+\\s*(.+)`, 'i'));
                        if (m) { author = m[1].trim(); break; }
                    }
                    if (author !== 'Unknown Author') break;
                }
                if (author === 'Unknown Author' && lines.length > 1 && lines[1].length < 50) author = lines[1];
            }
        }
        return { language: lang, title, author };
    },
    getModelCreditMultiplier: function(modelId) {
        switch(modelId) {
            case 'eleven_multilingual_v3': case 'eleven_multilingual_v2': return 1.0;
            case 'eleven_turbo_v2_5': case 'eleven_turbo_v2': case 'eleven_flash_v2_5': case 'eleven_flash_v2': case 'eleven_monolingual_v1': return 0.5;
            default: return 1.0; 
        }
    },
    normalize: function(str) { return str.toLowerCase().replace(/[^a-z0-9]/g, ''); },
    detectStartingVoice: function(chapterText, chapterTitle, voiceNames = []) {
        const candidates = voiceNames.map((n, i) => ({ name: TextParser.normalize(n), index: i })).filter(c => c.name);
        const check = (str) => {
            const norm = TextParser.normalize(str);
            for(const c of candidates) if(norm.includes(c.name)) return c.index;
            return null;
        };
        let res = check(chapterTitle);
        if(res !== null) return res;
        const lines = chapterText.split('\n').slice(0, 3);
        for(const line of lines) { res = check(line); if(res !== null) return res; }
        return 0; 
    }
};

// --- BROWSER API SERVICE (ElevenLabs Direct) ---
const BrowserAPI = {
    async fetchVoices(key) {
        const res = await fetch('https://api.elevenlabs.io/v1/voices', { headers: { 'xi-api-key': key } });
        if (!res.ok) throw new Error("Failed to fetch voices");
        const d = await res.json();
        return d.voices.map(v => ({ id: v.voice_id, name: v.name, labels: v.labels || {}, lang: 'en-US', type: 'premium', source: 'ElevenLabs' }));
    },
    async generateAudio(text, voiceId, apiKey, modelId) {
        const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
            method: 'POST',
            headers: { 'xi-api-key': apiKey, 'Content-Type': 'application/json', 'Accept': 'audio/mpeg' },
            body: JSON.stringify({ text, model_id: modelId, voice_settings: { stability: 0.5, similarity_boost: 0.75 } })
        });
        if (!res.ok) throw new Error("Generation failed: " + res.statusText);
        return await res.blob();
    }
};

// --- FFmpeg Merge Service ---
async function initFFmpeg() {
    if (ffmpegLoaded) return;
    try {
        LOG.add("Initializing Audio Engine...", 'info');

        const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
        const ffmpegBaseURL = 'https://unpkg.com/@ffmpeg/ffmpeg@0.12.10/dist/esm';

        LOG.add("Fetching FFmpeg Core...", 'info');
        const coreBlob = await fetch(`${baseURL}/ffmpeg-core.js`).then(r => {
            if (!r.ok) throw new Error(`Failed to fetch core: ${r.statusText}`);
            return r.blob();
        });
        const coreURL = URL.createObjectURL(coreBlob);

        LOG.add("Fetching FFmpeg Worker...", 'info');
        const workerBlob = await fetch(`${ffmpegBaseURL}/worker.js`).then(r => {
            if (!r.ok) throw new Error(`Failed to fetch worker: ${r.statusText}`);
            return r.blob();
        });
        const workerURL = URL.createObjectURL(workerBlob);

        LOG.add("Loading FFmpeg instance...", 'info');
        // Pass workerLoadURL to use our blob instead of the CDN URL directly
        await ffmpeg.load({
            coreURL: coreURL,
            wasmURL: `${baseURL}/ffmpeg-core.wasm`,
            workerLoadURL: workerURL
        });
        
        ffmpegLoaded = true;
        LOG.add("Audio Engine Ready", 'success');
    } catch(e) {
        console.error("FFmpeg Init Error:", e);
        LOG.add("Audio Engine Failed: " + e.message, 'error');
    }
}

async function mergeAudioChunks(chunks, outputName) {
    if (!ffmpegLoaded) await initFFmpeg();
    
    const inputNames = [];
    for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        let blob = chunk.blob;
        if (!blob) {
            const record = await storage.getChunk(chunk.id);
            if (!record) throw new Error(`Missing audio for chunk ${i+1}`);
            blob = record.blob;
        }
        
        const fname = `input${i}.mp3`;
        inputNames.push(fname);
        await ffmpeg.writeFile(fname, await fetchFile(blob));
    }

    const fileList = inputNames.map(f => `file '${f}'`).join('\n');
    await ffmpeg.writeFile('list.txt', fileList);
    await ffmpeg.exec(['-f', 'concat', '-safe', '0', '-i', 'list.txt', '-c', 'copy', 'output.mp3']);
    
    const data = await ffmpeg.readFile('output.mp3');
    return new Blob([data.buffer], { type: 'audio/mpeg' });
}


class AudioEngine{
    constructor(){this.synth=window.speechSynthesis;this.activeAudio=null;
        this.ctx=null;this.analyser=null;this.dataArray=null;this.canvas=document.getElementById('audio-visualizer');this.cCtx=this.canvas?this.canvas.getContext('2d'):null;this.animId=null;}
    initCtx(){if(!this.ctx){this.ctx=new(window.AudioContext||window.webkitAudioContext)();this.analyser=this.ctx.createAnalyser();this.analyser.fftSize=64;this.dataArray=new Uint8Array(this.analyser.frequencyBinCount)}}
    draw(){
        if(!this.analyser||!this.cCtx)return;
        this.animId=requestAnimationFrame(()=>this.draw());
        this.analyser.getByteFrequencyData(this.dataArray);
        const w=this.canvas.width,h=this.canvas.height;
        this.cCtx.fillStyle='#000';this.cCtx.fillRect(0,0,w,h);
        const bw=(w/this.analyser.frequencyBinCount)*2.5;
        let x=0;
        for(let i=0;i<this.analyser.frequencyBinCount;i++){
            const bh=this.dataArray[i]/2;
            this.cCtx.fillStyle=`rgb(${bh+100},92,231)`;
            this.cCtx.fillRect(x,h-bh,bw,bh);
            x+=bw+1;
        }
    }
    async getVoices(){let bv=[];if(this.synth) bv=await new Promise(r=>{const v=this.synth.getVoices();v.length?r(v):this.synth.onvoiceschanged=()=>r(this.synth.getVoices())});const fmtBv=bv.map((v,i)=>({id:`sys_${i}`,name:v.name,lang:v.lang,type:'standard',ref:v}));return [...fmtBv,...(STATE.api.elevenLabs.voices||[])]}
    
    async generateChunk(text,vid,mid){
        const v=STATE.voices.find(vo=>vo.id===vid);
        if(!v)throw new Error('Select voice');
        if(v.type==='premium'){
            if(!STATE.api.elevenLabs.connected)throw new Error('API not connected');
            return BrowserAPI.generateAudio(text, vid, STATE.api.elevenLabs.key, mid);
        }
        return null; 
    }

    playChunk(chunk,overrideVid=null){
        const pid=`chunk_${chunk.id}`;
        if(dom.manuscript){dom.manuscript.value=chunk.text;dom.manuscript.scrollTop=0}
        
        if(chunk.audioUrl) return this.playAudioBuffer(chunk.audioUrl,pid);
        
        const vid=overrideVid||chunk.voiceId||STATE.project.voiceIds[0];
        const v=STATE.voices.find(vo=>vo.id===vid);
        if(v&&v.type==='premium') return Promise.reject(new Error('Audio not generated'));
        
        if(v&&v.ref){
            if(!this.synth)return Promise.reject(new Error('No TTS'));
            return new Promise((res,rej)=>{
                this.stop(true);STATE.activePlaybackId=pid;STATE.isPlaying=true;this.updateBtn(true);renderTimeline();
                const ut=new SpeechSynthesisUtterance(chunk.text);ut.voice=v.ref;
                this.cancelCurrent=()=>{this.cancelCurrent=null;res()};
                ut.onend=()=>{this.cancelCurrent=null;STATE.activePlaybackId=null;renderTimeline();res()};
                ut.onerror=()=>{this.cancelCurrent=null;STATE.activePlaybackId=null;renderTimeline();rej(new Error('Playback failed'))};
                this.synth.speak(ut)
            });
        }
        return Promise.reject(new Error('Voice unavailable'))
    }

    playAudioBuffer(url,pid){
        return new Promise((res,rej)=>{
            this.initCtx();this.stop(true);
            const aud=new Audio(url);aud.crossOrigin="anonymous";this.activeAudio=aud;
            STATE.activePlaybackId=pid;STATE.isPlaying=true;this.updateBtn(true);renderTimeline();
            const src=this.ctx.createMediaElementSource(aud);src.connect(this.analyser);this.analyser.connect(this.ctx.destination);this.draw();
            this.cancelCurrent=()=>{this.cancelCurrent=null;res()};
            aud.onended=(()=>{this.cancelCurrent=null;cancelAnimationFrame(this.animId);this.activeAudio=null;STATE.activePlaybackId=null;renderTimeline();res()});
            aud.onerror=(()=>{this.cancelCurrent=null;cancelAnimationFrame(this.animId);this.activeAudio=null;STATE.activePlaybackId=null;renderTimeline();rej(new Error('Play failed'))});
            if(this.ctx.state==='suspended')this.ctx.resume();aud.play().catch(rej)
        })
    }
    stop(int=false){
        if(this.synth)this.synth.cancel();
        if(this.activeAudio){this.activeAudio.pause();this.activeAudio.currentTime=0;this.activeAudio=null}
        if(this.cancelCurrent)this.cancelCurrent();
        if(!int){STATE.activePlaybackId=null;STATE.isPlaying=false;this.updateBtn(false)}
        if(this.animId)cancelAnimationFrame(this.animId);
        if(this.cCtx)this.cCtx.clearRect(0,0,this.canvas.width,this.canvas.height);
        renderTimeline()
    }
    updateBtn(p){if(dom.btnPlay){dom.btnPlay.innerText=p?"⏹":"▶";p?dom.btnPlay.classList.add('playing'):dom.btnPlay.classList.remove('playing')}}
}

const engine=new AudioEngine();
const dom={manuscript:document.getElementById('manuscript'),timeline:document.getElementById('timeline-container'),voiceDropdown:document.getElementById('voice-dropdown'),chunkSize:document.getElementById('chunk-size'),btnGenerate:document.getElementById('btn-generate'),btnPlay:document.getElementById('btn-play-all'),masterProgress:document.getElementById('master-progress'),elKey:document.getElementById('el-key'),elName:document.getElementById('el-name'),elDot:document.getElementById('el-status-dot'),elStatusText:document.getElementById('el-status-text'),receipt:document.getElementById('live-receipt'),elModel:document.getElementById('el-model'),projectMode:document.getElementById('project-mode'),voiceBtn1:document.getElementById('voice-select-btn-1'),voiceBtn2:document.getElementById('voice-select-btn-2'),voiceName1:document.getElementById('voice-name-1'),voiceName2:document.getElementById('voice-name-2'),groupVoice2:document.getElementById('group-voice-2'),groupToken:document.getElementById('group-token'),voiceToken:document.getElementById('voice-token')};

function setElStatus(s,t){if(dom.elStatusText)dom.elStatusText.innerText=t;if(dom.elDot){dom.elDot.className='status-dot';if(s==='active')dom.elDot.classList.add('active');if(s==='error')dom.elDot.classList.add('error')}}

async function init(){
    await storage.init();
    await initFFmpeg(); 
    await refreshVoiceList();
    const k=localStorage.getItem('ab_api_el');
    if(k){
        try{const p=JSON.parse(k);dom.elKey.value=p.key;dom.elName.value=p.name;connectElevenLabs(true)}catch(e){}
    }
    const t=localStorage.getItem('ab_manuscript');if(t)dom.manuscript.value=t;updateReceipt();
}

async function connectElevenLabs(silent=false){
    const key=dom.elKey.value.trim(),name=dom.elName.value.trim()||"My ElevenLabs";if(!key)return;
    setElStatus('idle','Connecting...');
    try{
        const v=await BrowserAPI.fetchVoices(key);
        STATE.api.elevenLabs={connected:true,key,name,voices:v};
        localStorage.setItem('ab_api_el',JSON.stringify({key,name}));
        setElStatus('active','Connected');
        document.getElementById('btn-connect-el').innerText="Connected";document.getElementById('btn-disconnect-el').style.display='block';
        refreshVoiceList();LOG.add('Connected','success');
    }catch(e){
        STATE.api.elevenLabs={key:'',name:'',voices:[],connected:false};
        setElStatus('error','Error');LOG.add('Connection failed','error');
    }
}
function disconnectElevenLabs(){localStorage.removeItem('ab_api_el');STATE.api.elevenLabs={key:'',name:'',voices:[],connected:false};dom.elKey.value='';dom.elName.value='';setElStatus('idle','Not Connected');document.getElementById('btn-connect-el').innerText="Connect";document.getElementById('btn-disconnect-el').style.display='none';refreshVoiceList();LOG.add('Disconnected')}

// --- PLAYBACK ---
async function playSingleChunk(id){
    const pid=`chunk_${id}`;if(STATE.activePlaybackId===pid){engine.stop();return}engine.stop();
    let chunk; STATE.chapters.some(c=>{chunk=c.chunks.find(k=>k.id===id);return !!chunk});
    
    if(chunk && !chunk.audioUrl && chunk.status === 'done') {
        const rec = await storage.getChunk(id);
        if(rec && rec.blob) chunk.audioUrl = URL.createObjectURL(rec.blob);
    }

    if(chunk) engine.playChunk(chunk).catch(e=>LOG.add(e.message,'error'))
}
function displayChapter(idx){const ch=STATE.chapters[idx];if(ch)dom.manuscript.value=ch.chunks.map(c=>c.text).join('\n\n')}

async function playChapter(idx,e){
    if(e)e.stopPropagation();
    const pid=`chapter_${idx}`;
    if(STATE.activePlaybackId===pid){engine.stop();return}
    const ch=STATE.chapters[idx];if(!ch)return;
    engine.stop();
    STATE.isPlaying=true;STATE.activePlaybackId=pid;renderTimeline();
    try{
        for(const ck of ch.chunks){
            if(!STATE.isPlaying) break;
            
            if(!ck.audioUrl && ck.status==='done') {
                const rec = await storage.getChunk(ck.id);
                if(rec && rec.blob) ck.audioUrl = URL.createObjectURL(rec.blob);
            }

            await engine.playChunk(ck);
        }
    }catch(e){console.error(e);}
    if(STATE.isPlaying && (STATE.activePlaybackId===pid || STATE.activePlaybackId===null)){
        STATE.isPlaying=false;STATE.activePlaybackId=null;renderTimeline();
        engine.stop();
    }
}
function haltGeneration(){STATE.halt=true;LOG.add("Stopping...",'warning');document.getElementById('btn-halt').innerText="Stopping..."}
function openSafetyModal(){document.getElementById('safety-modal').classList.add('show')}
function closeSafetyModal(){document.getElementById('safety-modal').classList.remove('show')}

async function checkProjectCache(){
    const mid=dom.elModel.value;
    const checks = [];
    STATE.chapters.forEach((ch,i)=>ch.chunks.forEach((ck,j)=>{ checks.push(ck.id); }));
    
    const results = await storage.checkChunksExistence(checks);
    let cached=0, miss=0;
    
    results.forEach(r => {
        let chunk; STATE.chapters.some(c=> chunk=c.chunks.find(k=>k.id===r.id));
        if(chunk) {
            if(r.exists) {
                cached++;
                chunk.status = 'done';
            } else {
                miss += chunk.text.length;
            }
        }
    });

    const cost=miss*TextParser.getModelCreditMultiplier(mid)*0.000165;
    document.getElementById('confirm-chars').innerText=checks.reduce((a,b)=>{
        let chunk; STATE.chapters.some(c=> chunk=c.chunks.find(k=>k.id===b));
        return a + (chunk?chunk.text.length:0);
    },0).toLocaleString();
    
    document.getElementById('confirm-new').innerText=checks.length-cached;
    document.getElementById('confirm-cached').innerText=cached;
    document.getElementById('confirm-cost').innerText=`$${cost.toFixed(2)}`;
    return {cost,missingCount:checks.length-cached};
}

async function processChunkGeneration(chunk,chIdx,ckIdx,retry=0){
    if(STATE.halt)return false;
    const limit=parseFloat(document.getElementById('budget-limit').value)||999;
    if(STATE.sessionCost>limit){alert('Budget Exceeded');return false}
    updateChunkUI(chunk.id,'processing');
    try{
        const mid=dom.elModel.value,vid=chunk.voiceId||STATE.project.voiceIds[0];
        
        const blob = await engine.generateChunk(chunk.text,vid,mid);
        if(blob) {
            STATE.sessionCost+=chunk.text.length*TextParser.getModelCreditMultiplier(mid)*0.000165;
            updateReceipt();
            await storage.saveChunk(chunk.id, blob, { text: chunk.text, voiceId: vid });
            chunk.audioUrl = URL.createObjectURL(blob); 
            chunk.duration = Math.ceil(chunk.text.length/15); 
        }
        
        chunk.status='done';updateChunkUI(chunk.id,'done');
        return true;
    }catch(e){
        if(retry<3&&!STATE.halt){await new Promise(r=>setTimeout(r,Math.pow(2,retry)*1000));return processChunkGeneration(chunk,chIdx,ckIdx,retry+1)}
        chunk.status='error';updateChunkUI(chunk.id,'error');LOG.add(e.message,'error');return false;
    }
}
function updateChunkUI(id,st){const el=document.getElementById(`chunk-${id}`);if(el){el.className=`chunk-item status-${st}`}}

async function generateSingleChunk(id,e){
    if(e)e.stopPropagation();
    let chunk,chIdx,ckIdx; STATE.chapters.some((ch,i)=>{const x=ch.chunks.findIndex(c=>c.id===id);if(x!==-1){chunk=ch.chunks[x];chIdx=i;ckIdx=x;return true}});
    if(!chunk)return;
    const res = await storage.getChunk(chunk.id);
    const isCached = !!res;
    const cost = isCached ? 0 : chunk.text.length*TextParser.getModelCreditMultiplier(dom.elModel.value)*0.000165;
    
    document.getElementById('safety-message').innerText="Generate segment?";document.getElementById('confirm-chars').innerText=chunk.text.length;document.getElementById('confirm-new').innerText=isCached?0:1;document.getElementById('confirm-cached').innerText=isCached?1:0;document.getElementById('confirm-cost').innerText=`$${cost.toFixed(4)}`;
    openSafetyModal();
    document.getElementById('btn-confirm-start').onclick=async()=>{closeSafetyModal();await processChunkGeneration(chunk,chIdx,ckIdx);attachDefaultConfirmListener()};
}

async function generateChapter(idx,e){
    if(e)e.stopPropagation();
    const ch=STATE.chapters[idx];if(!ch)return;
    const checks = ch.chunks.map(k=>k.id);
    const results = await storage.checkChunksExistence(checks);
    let miss=0,total=0,cached=0;
    
    ch.chunks.forEach(k=>{
        total+=k.text.length;
        if(results.find(r=>r.id===k.id).exists) cached++; else miss+=k.text.length;
    });

    const cost = miss*TextParser.getModelCreditMultiplier(dom.elModel.value)*0.000165;
    
    document.getElementById('safety-message').innerText=`Generate ${ch.title}?`;document.getElementById('confirm-chars').innerText=total;document.getElementById('confirm-new').innerText=ch.chunks.length-cached;document.getElementById('confirm-cached').innerText=cached;document.getElementById('confirm-cost').innerText=`$${cost.toFixed(2)}`;
    openSafetyModal();
    document.getElementById('btn-confirm-start').onclick=async()=>{closeSafetyModal();STATE.halt=false;document.getElementById('btn-halt').style.display='inline-block';
        let chunksForMerge=[],ok=0;
        for(let i=0;i<ch.chunks.length;i++){
            if(STATE.halt)break;
            const ck=ch.chunks[i];
            const exists = results.find(r=>r.id===ck.id).exists;
            
            if(exists && ck.status !== 'done') ck.status='done'; 
            
            if(ck.status!=='done'){
                 if(await processChunkGeneration(ck,idx,i)) ok++;
            } else {
                 ok++;
            }
        }
        document.getElementById('btn-halt').style.display='none';
        
        if(ok===ch.chunks.length){
             try {
                 const mergeBlob = await mergeAudioChunks(ch.chunks, 'temp.mp3');
                 ch.audioUrl = URL.createObjectURL(mergeBlob);
             } catch(e) { LOG.add("Merge Failed: "+e.message, 'error'); }
        }
        attachDefaultConfirmListener();
    }
}
function attachDefaultConfirmListener(){document.getElementById('btn-confirm-start').onclick=startFullBookGeneration}

async function startFullBookGeneration(){
    closeSafetyModal();STATE.halt=false;dom.btnGenerate.disabled=true;dom.btnGenerate.innerText="Generating...";document.getElementById('btn-halt').style.display='inline-block';
    for(let i=0;i<STATE.chapters.length;i++){
        if(STATE.halt)break;
        const ch=STATE.chapters[i];let ok=0;
        for(let j=0;j<ch.chunks.length;j++){
             if(STATE.halt)break;
             const ck=ch.chunks[j];
             const rec = await storage.getChunk(ck.id);
             if(rec) { ck.status='done'; ok++; continue; }
             
             if(await processChunkGeneration(ck,i,j)) ok++;
        }
        if(!STATE.halt && ok===ch.chunks.length) {
             try {
                 const mergeBlob = await mergeAudioChunks(ch.chunks, 'temp.mp3');
                 ch.audioUrl = URL.createObjectURL(mergeBlob);
             } catch(e) { LOG.add("Merge Failed Ch "+i, 'error'); }
        }
    }
    dom.btnGenerate.disabled=false;dom.btnGenerate.innerText="2. Generate Audio";document.getElementById('btn-halt').style.display='none';renderTimeline();
}

// --- RENDER TIMELINE ---
function renderTimeline() {
    if (!STATE.chapters.length) {
        dom.timeline.innerHTML = '<div style="padding:20px;text-align:center;color:var(--text-dim);font-style:italic">No chapters. Paste text & \"Analyze\".</div>';
        return;
    }
    dom.timeline.innerHTML = STATE.chapters.map((ch, idx) => {
        const uniqueVoices = new Set(ch.chunks.map(c => c.voiceName)).size;
        const allDone = ch.chunks.every(ck => ck.status === 'done');
        const playing = STATE.activePlaybackId === `chapter_${idx}`;
        const collapsed = ch.collapsed;
        
        const chunksHtml = !collapsed ? ch.chunks.map((ck, cIdx) => {
            const isPlaying = STATE.activePlaybackId === `chunk_${ck.id}`;
            const st = isPlaying ? 'status-playing' : `status-${ck.status}`;
            const bg = cIdx % 2 === 0 ? 'background:rgba(255,255,255,0.02);' : '';
            return `<div id="chunk-${ck.id}" class="chunk-item ${st}" onclick="window.playSingleChunk('${ck.id}')" style="${bg}" role="button">
                <div style="display:flex;align-items:center;gap:10px;width:100%">
                    <span style="font-family:var(--font-mono);font-size:0.8rem;color:${isPlaying?'var(--accent)':'var(--text-dim)'};width:20px;text-align:center">${isPlaying?'⏹':(cIdx+1)}</span>
                    <span class="voice-tag ${isPlaying?'playing':''}" style="${allDone||isPlaying?'display:inline-block':''};margin:0;width:80px;text-align:center">${ck.voiceName||'Voice'}</span>
                    <span class="chunk-content" style="flex:1">${ck.text.substring(0,60)}...</span>
                    <div class="chunk-actions"><button class="action-btn" onclick="window.generateSingleChunk('${ck.id}',event)">↺</button><span class="generated-icon" style="opacity:${ck.status==='done'?1:0}">✓</span></div>
                </div></div>`;
        }).join('') : '';

        return `<div class="chapter-card">
            <div class="chapter-header">
                <div class="ch-row">
                    <div style="display:flex;align-items:center;gap:6px;flex:1;overflow:hidden">
                        <button class="sm-btn" onclick="window.toggleChapterCollapse(${idx},event)" style="width:20px;padding:0;height:20px;line-height:18px">${collapsed?'+':'−'}</button>
                        <span class="ch-title" title="${ch.title}" onclick="window.displayChapter(${idx})" style="cursor:pointer">${ch.title}</span>
                    </div>
                    <div class="ch-meta">
                        <span>${ch.chunks.length} Segs</span>
                        <span>${(ch.chunks.length*15/60).toFixed(1)}m</span>
                    </div>
                </div>
                <div class="ch-row" style="margin-top:6px;">
                    <div style="display:flex;gap:5px;align-items:center">
                        <span class="ch-meta" style="margin:0">${uniqueVoices} Voice${uniqueVoices>1?'s':''}</span>
                        ${allDone ? '<span style="color:var(--success);font-size:0.8rem">✓</span>' : ''}
                    </div>
                    <div style="display:flex;gap:5px;">
                        ${ch.chunks.length ? `<button class="sm-btn ${playing?'playing':''}" onclick="window.playChapter(${idx},event)">${playing?'⏹':'▶'}</button>` : ''}
                        <button class="sm-btn" onclick="window.generateChapter(${idx},event)">${ch.audioUrl?'⚡ Regen':'⚡ Gen'}</button>
                    </div>
                </div>
            </div>${chunksHtml}</div>`;
    }).join('');
}

// --- MANUSCRIPT ANALYSIS ---

function splitBySentence(text, max) {
    if (text.length <= max) return [text];
    const sentences = text.match(/[^.!?]+[.!?]+["']?|[^.!?]+$/g) || [text];
    const chunks = [];
    let current = "";
    
    sentences.forEach(s => {
        if ((current + s).length > max) {
            if (current) chunks.push(current.trim());
            current = s;
        } else {
            current += s;
        }
    });
    if (current) chunks.push(current.trim());
    return chunks;
}

document.getElementById('btn-analyze').addEventListener('click', async () => {
    const text = dom.manuscript.value;
    if(!text.trim()) { alert("Please paste a manuscript first."); return; }
    
    // 1. Metadata
    const meta = TextParser.detectProjectMetadata(text);
    STATE.project.title = meta.title;
    document.getElementById('sum-title').innerText = meta.title;
    document.getElementById('sum-author').innerText = meta.author;
    document.getElementById('sum-lang').innerText = meta.language;
    
    // 2. Split Chapters
    const regex = TextParser.getChapterHeadingRegex();
    // Split keeping delimiters
    const split = text.split(regex).filter(x => x && x.trim());
    
    STATE.chapters = [];
    
    // Logic: The regex capture group includes the header. 
    // split() with capture group returns [preamble, header, body, header, body...]
    // But my regex wraps the whole line in a group.
    
    let i = 0;
    // Handle preamble if first item is not a header
    if (split.length > 0 && !regex.test(split[0])) {
         STATE.chapters.push({
             title: "Chapter 1 (Preamble)",
             text: split[0],
             collapsed: false,
             chunks: []
         });
         i++;
    }

    while(i < split.length) {
        const part = split[i];
        if(regex.test(part)) {
             const title = part.trim().replace(/[#]/g, '').trim();
             let body = "";
             if(i+1 < split.length && !regex.test(split[i+1])) {
                 body = split[i+1];
                 i += 2;
             } else {
                 i++;
             }
             STATE.chapters.push({
                 title: title,
                 text: (part + "\n" + body).trim(),
                 collapsed: false,
                 chunks: []
             });
        } else {
             // Orphaned text? Append to previous or new ch
             if(STATE.chapters.length) {
                 STATE.chapters[STATE.chapters.length-1].text += "\n" + part;
             }
             i++;
        }
    }
    
    // 3. Process Chunks (Split by size & Dual Voice)
    const mode = dom.projectMode.value;
    const token = dom.voiceToken.value;
    const maxLen = parseInt(dom.chunkSize.value) || 1000;
    
    STATE.chapters.forEach((ch, idx) => {
        let segments = [];
        
        if(mode === 'dual') {
             const startVoiceIdx = TextParser.detectStartingVoice(ch.text, ch.title, STATE.project.voiceNames);
             const rawSegs = TextParser.parseDualVoiceSegments(ch.text, token, startVoiceIdx, STATE.project.voiceNames);
             
             rawSegs.forEach(rs => {
                 if(rs.text.length > maxLen) {
                      const sub = splitBySentence(rs.text, maxLen);
                      sub.forEach(s => segments.push({ 
                          text: s, 
                          voiceId: STATE.project.voiceIds[rs.voiceIndex], 
                          voiceName: STATE.project.voiceNames[rs.voiceIndex] 
                      }));
                 } else {
                      segments.push({ 
                          text: rs.text, 
                          voiceId: STATE.project.voiceIds[rs.voiceIndex], 
                          voiceName: STATE.project.voiceNames[rs.voiceIndex] 
                      });
                 }
             });
        } else {
             const sub = splitBySentence(ch.text, maxLen);
             const vid = STATE.project.voiceIds[0];
             const vname = STATE.project.voiceNames[0];
             sub.forEach(s => segments.push({ text: s, voiceId: vid, voiceName: vname }));
        }
        
        ch.chunks = segments.map((s, k) => ({
             id: `ch${idx}_ck${k}_${Date.now()}`,
             text: s.text,
             voiceId: s.voiceId,
             voiceName: s.voiceName,
             status: 'pending',
             duration: 0
        }));
    });
    
    // Update UI
    document.getElementById('sum-chapters').innerText = STATE.chapters.length;
    document.getElementById('sum-chars').innerText = text.length.toLocaleString();
    document.getElementById('project-summary').style.display = 'block';
    
    renderTimeline();
    dom.btnGenerate.disabled = false;
    LOG.add(`Analyzed: ${STATE.chapters.length} chapters found.`, 'success');
});


// --- MISSING UI FUNCTIONS ---

function toggleChapterCollapse(idx, e) {
    if(e) e.stopPropagation();
    if(STATE.chapters[idx]) {
        STATE.chapters[idx].collapsed = !STATE.chapters[idx].collapsed;
        renderTimeline();
    }
}

async function refreshVoiceList() {
    STATE.voices = await engine.getVoices();
}

function updateReceipt() {
    const cost = STATE.sessionCost || 0;
    if(dom.receipt) dom.receipt.innerText = `$${cost.toFixed(2)} Est. Cost`;
}

function toggleDualMode() {
    STATE.project.mode = dom.projectMode.value;
    const isDual = STATE.project.mode === 'dual';
    dom.groupVoice2.style.display = isDual ? 'block' : 'none';
    dom.groupToken.style.display = isDual ? 'block' : 'none';
}

function openVoiceDropdown(slot, e) {
    if(e) e.stopPropagation();
    STATE.activeVoiceSlot = slot;
    const btn = slot === 1 ? dom.voiceBtn1 : dom.voiceBtn2;
    const rect = btn.getBoundingClientRect();
    
    // Simple positioning
    const dd = dom.voiceDropdown;
    dd.style.top = (rect.bottom + window.scrollY) + "px";
    dd.style.left = (rect.left + window.scrollX) + "px";
    dd.style.width = rect.width + "px";
    
    dd.innerHTML = STATE.voices.map(v => 
        `<div class="voice-option" onclick="window.selectVoice('${v.id}')" style="padding:8px;cursor:pointer;border-bottom:1px solid #333;background:#222;">
            <div style="font-weight:bold">${v.name}</div>
            <div style="font-size:0.75rem;color:#888">${v.lang || 'en'} • ${v.type}</div>
        </div>`
    ).join('');
    
    dd.classList.add('show');
}

window.selectVoice = function(vid) {
    const v = STATE.voices.find(vo => vo.id === vid);
    if(!v) return;
    
    const slot = STATE.activeVoiceSlot;
    STATE.project.voiceIds[slot-1] = vid;
    STATE.project.voiceNames[slot-1] = v.name;
    
    if(slot === 1) {
        dom.voiceBtn1.querySelector('span').innerText = v.name;
        dom.voiceName1.value = v.name; 
    } else {
        dom.voiceBtn2.querySelector('span').innerText = v.name;
        dom.voiceName2.value = v.name;
    }
    
    dom.voiceDropdown.classList.remove('show');
}

window.addEventListener('click', () => {
    if(dom.voiceDropdown) dom.voiceDropdown.classList.remove('show');
});

// --- PROJECT MANAGEMENT ---

function openProjectModal() {
    document.getElementById('project-modal').classList.add('show');
    loadProjectList();
}

function closeProjectModal() {
    document.getElementById('project-modal').classList.remove('show');
}

async function loadProjectList() {
    const list = document.getElementById('project-list');
    list.innerHTML = '<div style="padding:20px;text-align:center">Loading...</div>';
    try {
        const projects = await storage.getProjects();
        if(projects.length === 0) {
            list.innerHTML = '<div style="padding:20px;text-align:center;color:var(--text-dim)">No saved projects.</div>';
            return;
        }
        list.innerHTML = projects.map(p => 
            `<div class="project-item" onclick="window.loadProject('${p.id}')" oncontextmenu="window.showProjectContextMenu(event, '${p.id}', '${p.title}')" style="padding:10px;border-bottom:1px solid #333;cursor:pointer;">
                <div style="font-weight:bold">${p.title || 'Untitled'}</div>
                <div style="font-size:0.8rem;color:var(--text-dim)">${new Date(p.updatedAt).toLocaleDateString()} • ${p.chapters ? p.chapters.length : 0} Ch</div>
            </div>`
        ).join('');
    } catch(e) {
        list.innerHTML = `<div style="padding:20px;color:var(--danger)">Error: ${e.message}</div>`;
    }
}

async function saveCurrentProject() {
    const titleInput = document.getElementById('project-title-input');
    const title = titleInput.value.trim() || STATE.project.title || 'Untitled Project';
    
    STATE.project.title = title;
    STATE.project.manuscript = dom.manuscript.value;
    STATE.project.chapters = STATE.chapters; 
    STATE.project.updatedAt = new Date().toISOString();
    
    try {
        await storage.saveProject(STATE.project);
        LOG.add(`Project "${title}" saved.`, 'success');
        closeProjectModal();
    } catch(e) {
        LOG.add(`Save failed: ${e.message}`, 'error');
    }
}

async function loadProject(id) {
    try {
        const p = await storage.getProject(id);
        if(!p) throw new Error("Project not found");
        
        STATE.project = p;
        STATE.chapters = p.chapters || [];
        dom.manuscript.value = p.manuscript || '';
        
        dom.projectMode.value = p.mode || 'single';
        toggleDualMode();
        
        if(p.voiceIds) {
            if(p.voiceIds[0]) {
                 const v = STATE.voices.find(x => x.id === p.voiceIds[0]);
                 if(v) { 
                     dom.voiceBtn1.querySelector('span').innerText = v.name;
                     dom.voiceName1.value = p.voiceNames ? p.voiceNames[0] : v.name;
                 }
            }
            if(p.voiceIds[1]) {
                 const v = STATE.voices.find(x => x.id === p.voiceIds[1]);
                 if(v) { 
                     dom.voiceBtn2.querySelector('span').innerText = v.name;
                     dom.voiceName2.value = p.voiceNames ? p.voiceNames[1] : v.name;
                 }
            }
        }
        
        renderTimeline();
        closeProjectModal();
        LOG.add(`Loaded "${p.title}"`, 'success');
    } catch(e) {
        LOG.add(`Load failed: ${e.message}`, 'error');
    }
}

async function renameProject(id, currentTitle) {
    const newTitle = prompt("Enter new project name:", currentTitle);
    if(newTitle && newTitle.trim()) {
        try {
            await storage.renameProject(id, newTitle.trim());
            loadProjectList(); 
        } catch(e) { alert(e.message); }
    }
}

// --- DELETE MODAL ---
function initDeleteProcess(id, title) {
    pendingDeleteId = id;
    document.getElementById('del-project-name').innerText = title;
    document.getElementById('delete-confirm-input').value = '';
    document.getElementById('btn-final-delete').disabled = true;
    document.getElementById('delete-confirm-modal').classList.add('show');
}

function closeDeleteModal() {
    document.getElementById('delete-confirm-modal').classList.remove('show');
    pendingDeleteId = null;
}

document.getElementById('delete-confirm-input').addEventListener('input', (e) => {
    document.getElementById('btn-final-delete').disabled = e.target.value.toLowerCase() !== 'delete';
});

document.getElementById('btn-final-delete').onclick = async () => {
    if(pendingDeleteId) {
        try {
            await storage.deleteProject(pendingDeleteId);
            closeDeleteModal();
            loadProjectList();
            LOG.add("Project deleted", 'success');
        } catch(e) { LOG.add(e.message, 'error'); }
    }
};

function openHelpModal() { document.getElementById('help-modal').classList.add('show'); }
function closeHelpModal() { document.getElementById('help-modal').classList.remove('show'); }


// Global Exports for HTML Event Handlers
window.playSingleChunk = playSingleChunk;
window.generateSingleChunk = generateSingleChunk;
window.playChapter = playChapter;
window.generateChapter = generateChapter;
window.displayChapter = displayChapter;
window.toggleChapterCollapse = toggleChapterCollapse;
window.loadProject = loadProject;
window.renameProject = renameProject;
window.initDeleteProcess = initDeleteProcess;
window.toggleDualMode = toggleDualMode;
window.openVoiceDropdown = openVoiceDropdown;
window.saveCurrentProject = saveCurrentProject;
window.closeProjectModal = closeProjectModal;
window.openProjectModal = openProjectModal;
window.openHelpModal = openHelpModal;
window.closeHelpModal = closeHelpModal;
window.closeDeleteModal = closeDeleteModal;
window.connectElevenLabs = connectElevenLabs;
window.disconnectElevenLabs = disconnectElevenLabs;
window.closeSafetyModal = closeSafetyModal;
window.haltGeneration = haltGeneration;

// --- Context Menu & Safe Delete Logic ---
let ctxMenuTarget = null;
let pendingDeleteId = null;

window.showProjectContextMenu = function(e, id, title){
    e.preventDefault();
    ctxMenuTarget = { id, title };
    const menu = document.getElementById('context-menu');
    const x = Math.min(e.clientX, window.innerWidth - 160);
    const y = Math.min(e.clientY, window.innerHeight - 150);
    menu.style.top = `${y}px`;
    menu.style.left = `${x}px`;
    menu.classList.add('show');
}

function hideContextMenu(){
    document.getElementById('context-menu').classList.remove('show');
}

window.addEventListener('click', () => {
    document.getElementById('context-menu').classList.remove('show');
});

// Bind Context Menu Actions
document.getElementById('ctx-open').onclick = () => { if(ctxMenuTarget) loadProject(ctxMenuTarget.id); };
document.getElementById('ctx-rename').onclick = () => { if(ctxMenuTarget) renameProject(ctxMenuTarget.id, ctxMenuTarget.title); };
document.getElementById('ctx-delete').onclick = () => { if(ctxMenuTarget) initDeleteProcess(ctxMenuTarget.id, ctxMenuTarget.title); };

// ... existing logic for delete modal ...

init();
