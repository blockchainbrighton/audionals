/**
 * AUDIOBOOK GENERATOR v3 (Restored Playback & Fixed Split & Interaction & Regeneration)
 */

// --- 1. STATE & STORAGE ---

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

// --- TEXT PARSER (Dual Voice & Multi-Language Logic) ---

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
    escapeRegex: (v) => v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),

    _chReg: null,
    getChapterHeadingRegex: function() {
        if(this._chReg) return this._chReg;
        const kw = LANG_CONFIG.flatMap(l => l[2]).sort((a, b) => b.length - a.length);
        // Matches: # Heading, or Keyword (Chapter) followed by something
        // FIX APPLIED: Wrapped in capturing group (...) so split() retains the delimiter
        return this._chReg = new RegExp(`(^\\s*(?:#{1,6}\\s+[^\\n#]+|(?:${kw.map(this.escapeRegex).join('|')})(?:\\s+[^\\n]+)?)\\s*$)`, 'gmi');
    },

    parseDualVoiceSegments: function(text, delim = '* * *', initVoiceIndex = 0, voiceNames = []) {
        const segs = [];
        const token = delim.trim() || '* * *';
        const escToken = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        
        // Split by token
        const parts = text.split(new RegExp(escToken, 'g'));
        
        let currentVoice = initVoiceIndex % 2; // 0 or 1
        
        parts.forEach(part => {
            let content = part.trim();
            if(content) {
                // Check if segment starts with the current voice's name (e.g. "Vincent.")
                // to add a dramatic pause: "Vincent... ... ... Por fin..."
                if (voiceNames && voiceNames[currentVoice]) {
                    const name = voiceNames[currentVoice];
                    // Regex: Start of line, Name, optional punctuation, optional newline
                    const nameRegex = new RegExp(`^(${TextParser.escapeRegex(name)})([:|.]?)(\\s+)`, 'i');
                    
                    if (nameRegex.test(content)) {
                        // Insert pause
                        content = content.replace(nameRegex, '$1... ... ... $3');
                    }
                }

                segs.push({
                    text: content,
                    voiceIndex: currentVoice
                });
            }
            // Toggle voice for next part
            currentVoice = (currentVoice + 1) % 2;
        });

        return segs;
    },

    detectProjectMetadata: function(manuscript, preamble) {
        let lang = 'English';
        let title = 'Untitled Book';
        let author = 'Unknown Author';

        // Detect Language
        for (const l of LANG_CONFIG) {
            if (l[0] === 'unk') continue;
            // Check keywords in first 1000 chars
            const sample = manuscript.substring(0, 1000);
            for (const kw of l[2]) {
                const re = new RegExp(`^\\s*${TextParser.escapeRegex(kw)}\\s+`, 'mi');
                if (re.test(sample)) { lang = l[1]; break; }
            }
            if (lang !== 'English') break;
        }

        // Detect Title/Author in Preamble
        if (preamble && preamble.trim()) {
            const lines = preamble.split('\n').map(l => l.trim()).filter(Boolean);
            if (lines.length) {
                // Heuristic: First line is often title
                title = lines[0];
                
                // Look for "By [Author]"
                const lc = LANG_CONFIG.find(l => l[1] === lang) || LANG_CONFIG[0];
                const byKw = [...(lc[3] || []), 'By', 'Author', 'Written by'];
                
                for (const line of lines) {
                    for (const bk of byKw) {
                        const m = line.match(new RegExp(`^${TextParser.escapeRegex(bk)}[:\\s]+\\s*(.+)`, 'i'));
                        if (m) { author = m[1].trim(); break; }
                    }
                    if (author !== 'Unknown Author') break;
                }
                
                // Fallback: 2nd line if short
                if (author === 'Unknown Author' && lines.length > 1 && lines[1].length < 50) {
                    author = lines[1];
                }
            }
        }
        
        return { language: lang, title, author };
    },

    getModelCreditMultiplier: function(modelId) {
        switch(modelId) {
            case 'eleven_multilingual_v3':
            case 'eleven_multilingual_v2':
                return 1.0;
            case 'eleven_turbo_v2_5':
            case 'eleven_turbo_v2':
            case 'eleven_flash_v2_5':
            case 'eleven_flash_v2':
            case 'eleven_monolingual_v1':
            case 'eleven_monolingual_v2':
                return 0.5;
            default:
                return 1.0; // Default to highest cost if unknown model
        }
    },
    
    normalize: function(str) {
        return str.toLowerCase().replace(/[^a-z0-9]/g, '');
    },

    detectStartingVoice: function(chapterText, chapterTitle, voiceNames = []) {
        // Simple heuristic: check if Title or First Line contains a voice name
        const candidates = voiceNames.map((n, i) => ({ name: TextParser.normalize(n), index: i })).filter(c => c.name);
        
        const check = (str) => {
            const norm = TextParser.normalize(str);
            for(const c of candidates) {
                if(norm.includes(c.name)) return c.index;
            }
            return null;
        };

        let res = check(chapterTitle);
        if(res !== null) return res;

        // Check first few lines
        const lines = chapterText.split('\n').slice(0, 3);
        for(const line of lines) {
            res = check(line);
            if(res !== null) return res;
        }

        return 0; // Default to Voice 1
    }
};

// --- 2. API SERVICE (ElevenLabs) ---

class APIService {
    static async req(url,opts={}){
        const res=await fetch(url,opts);
        if(!res.ok) throw new Error((await res.json().catch(()=>({error:res.statusText}))).error||"Request failed");
        return res.json();
    }
    static async fetchVoices(key){
        const d=await this.req('https://api.elevenlabs.io/v1/voices',{headers:{'xi-api-key':key}});
        return d.voices.map(v=>({id:v.voice_id,name:v.name,labels:v.labels||{},lang:'en-US',type:'premium',source:'ElevenLabs'}));
    }
    static async generateAudio(text,voiceId,apiKey,modelId,ctx){
        const d=await this.req('/api/generate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text,voiceId,apiKey,modelId,projectId:ctx.projectId,chapterIndex:ctx.chapterIndex,chunkIndex:ctx.chunkIndex})});
        return {duration:Math.ceil(text.length/15),audioUrl:d.url,filename:d.filename};
    }
    static async checkCache(pid,mid,chunks){return this.req('/api/check-cache',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({projectId:pid,modelId:mid,chunks})})}
    static async mergeChapter(pid,idx,files,isTitle){return this.req('/api/merge-chapter',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({projectId:pid,chapterIndex:idx,filenames:files,isTitle})})}
}

class AudioEngine{
    constructor(){this.synth=window.speechSynthesis;this.activeAudio=null;
        this.ctx=null;this.analyser=null;this.dataArray=null;this.canvas=document.getElementById('audio-visualizer');this.cCtx=this.canvas?this.canvas.getContext('2d'):null;this.animId=null;}
    initCtx(){if(!this.ctx){this.ctx=new(window.AudioContext||window.webkitAudioContext)();this.analyser=this.ctx.createAnalyser();this.analyser.fftSize=64;this.dataArray=new Uint8Array(this.analyser.frequencyBinCount)}}
    draw(){if(!this.analyser||!this.cCtx)return;this.animId=requestAnimationFrame(()=>this.draw());this.analyser.getByteFrequencyData(this.dataArray);const w=this.canvas.width,h=this.canvas.height;this.cCtx.fillStyle='#000';this.cCtx.fillRect(0,0,w,h);const bw=(w/this.analyser.frequencyBinCount)*2.5;let x=0;
        for(let i=0;i<this.analyser.frequencyBinCount;i++){const bh=this.dataArray[i]/2;this.cCtx.fillStyle=`rgb(${bh+100},92,231)`;this.cCtx.fillRect(x,h-bh,bw,bh);x+=bw+1;}}
    async getVoices(){let bv=[];if(this.synth) bv=await new Promise(r=>{const v=this.synth.getVoices();v.length?r(v):this.synth.onvoiceschanged=()=>r(this.synth.getVoices())});const fmtBv=bv.map((v,i)=>({id:`sys_${i}`,name:v.name,lang:v.lang,type:'standard',ref:v}));return [...fmtBv,...(STATE.api.elevenLabs.voices||[])]}
    async generateChunk(text,vid,mid,ctx){const v=STATE.voices.find(vo=>vo.id===vid);if(!v)throw new Error('Select voice');if(v.type==='premium'){if(!STATE.api.elevenLabs.connected)throw new Error('API not connected');return APIService.generateAudio(text,vid,STATE.api.elevenLabs.key,mid,ctx)}return new Promise(r=>setTimeout(()=>r({duration:Math.ceil(text.length/15)}),200))}
    playChunk(chunk,overrideVid=null){const pid=`chunk_${chunk.id}`;if(dom.manuscript){dom.manuscript.value=chunk.text;dom.manuscript.scrollTop=0}if(chunk.audioUrl) return this.playAudioBuffer(chunk.audioUrl,pid);const vid=overrideVid||chunk.voiceId||STATE.project.voiceIds[0];const v=STATE.voices.find(vo=>vo.id===vid);if(v&&v.type==='premium')return Promise.reject(new Error('Audio not generated'));if(v&&v.ref){if(!this.synth)return Promise.reject(new Error('No TTS'));return new Promise((res,rej)=>{this.stop(true);STATE.activePlaybackId=pid;STATE.isPlaying=true;this.updateBtn(true);renderTimeline();const ut=new SpeechSynthesisUtterance(chunk.text);ut.voice=v.ref;ut.onend=()=>{STATE.activePlaybackId=null;renderTimeline();res()};ut.onerror=()=>{STATE.activePlaybackId=null;renderTimeline();rej(new Error('Playback failed'))};this.synth.speak(ut)})}return Promise.reject(new Error('Voice unavailable'))}
    playAudioBuffer(url,pid){return new Promise((res,rej)=>{this.initCtx();this.stop(true);const aud=new Audio(url);aud.crossOrigin="anonymous";this.activeAudio=aud;STATE.activePlaybackId=pid;STATE.isPlaying=true;this.updateBtn(true);renderTimeline();const src=this.ctx.createMediaElementSource(aud);src.connect(this.analyser);this.analyser.connect(this.ctx.destination);this.draw();aud.onended=()=>{cancelAnimationFrame(this.animId);this.activeAudio=null;STATE.activePlaybackId=null;renderTimeline();res()};aud.onerror=()=>{cancelAnimationFrame(this.animId);this.activeAudio=null;STATE.activePlaybackId=null;renderTimeline();rej(new Error('Play failed'))};if(this.ctx.state==='suspended')this.ctx.resume();aud.play().catch(rej)})}
    stop(int=false){if(this.synth)this.synth.cancel();if(this.activeAudio){this.activeAudio.pause();this.activeAudio.currentTime=0;this.activeAudio=null}if(!int){STATE.activePlaybackId=null;STATE.isPlaying=false;this.updateBtn(false)}if(this.animId)cancelAnimationFrame(this.animId);if(this.cCtx)this.cCtx.clearRect(0,0,this.canvas.width,this.canvas.height);renderTimeline()}
    updateBtn(p){if(dom.btnPlay){dom.btnPlay.innerText=p?"⏹":"▶";p?dom.btnPlay.classList.add('playing'):dom.btnPlay.classList.remove('playing')}}}

const engine=new AudioEngine();
const dom={manuscript:document.getElementById('manuscript'),timeline:document.getElementById('timeline-container'),voiceDropdown:document.getElementById('voice-dropdown'),chunkSize:document.getElementById('chunk-size'),btnGenerate:document.getElementById('btn-generate'),btnPlay:document.getElementById('btn-play-all'),masterProgress:document.getElementById('master-progress'),elKey:document.getElementById('el-key'),elName:document.getElementById('el-name'),elDot:document.getElementById('el-status-dot'),elStatusText:document.getElementById('el-status-text'),receipt:document.getElementById('live-receipt'),elModel:document.getElementById('el-model'),projectMode:document.getElementById('project-mode'),voiceBtn1:document.getElementById('voice-select-btn-1'),voiceBtn2:document.getElementById('voice-select-btn-2'),voiceName1:document.getElementById('voice-name-1'),voiceName2:document.getElementById('voice-name-2'),groupVoice2:document.getElementById('group-voice-2'),groupToken:document.getElementById('group-token'),voiceToken:document.getElementById('voice-token')};

function setElStatus(s,t){if(dom.elStatusText)dom.elStatusText.innerText=t;if(dom.elDot){dom.elDot.className='status-dot';if(s==='active')dom.elDot.classList.add('active');if(s==='error')dom.elDot.classList.add('error')}}
async function init(){await refreshVoiceList();const k=localStorage.getItem('ab_api_el');if(k){try{const p=JSON.parse(k);dom.elKey.value=p.key;dom.elName.value=p.name;connectElevenLabs(true)}catch(e){}}const t=localStorage.getItem('ab_manuscript');if(t)dom.manuscript.value=t;updateReceipt()}
async function connectElevenLabs(silent=false){
    const key=dom.elKey.value.trim(),name=dom.elName.value.trim()||"My ElevenLabs";if(!key)return;
    setElStatus('idle','Connecting...');
    try{
        const v=await APIService.fetchVoices(key);
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

async function playSingleChunk(id){const pid=`chunk_${id}`;if(STATE.activePlaybackId===pid){engine.stop();return}engine.stop();let chunk; STATE.chapters.some(c=>{chunk=c.chunks.find(k=>k.id===id);return !!chunk});if(chunk) engine.playChunk(chunk).catch(e=>LOG.add(e.message,'error'))}
function displayChapter(idx){const ch=STATE.chapters[idx];if(ch)dom.manuscript.value=ch.chunks.map(c=>c.text).join('\n\n')}
async function playChapter(idx,e){
    if(e)e.stopPropagation();
    const pid=`chapter_${idx}`;
    if(STATE.activePlaybackId===pid){engine.stop();return}
    const ch=STATE.chapters[idx];if(!ch)return;
    STATE.isPlaying=true;STATE.activePlaybackId=pid;renderTimeline();
    try{for(const ck of ch.chunks){if(!STATE.isPlaying||STATE.activePlaybackId!==pid)break;await engine.playChunk(ck)}}catch(e){}
    if(STATE.activePlaybackId===pid){STATE.isPlaying=false;STATE.activePlaybackId=null;renderTimeline()}
}
function haltGeneration(){STATE.halt=true;LOG.add("Stopping...",'warning');document.getElementById('btn-halt').innerText="Stopping..."}
function openSafetyModal(){document.getElementById('safety-modal').classList.add('show')}
function closeSafetyModal(){document.getElementById('safety-modal').classList.remove('show')}

async function checkProjectCache(){
    const mid=dom.elModel.value,all=[],flat=[];
    STATE.chapters.forEach((ch,i)=>ch.chunks.forEach((ck,j)=>{all.push({id:ck.id,text:ck.text,voiceId:ck.voiceId||STATE.project.voiceIds[0],chapterIndex:i,chunkIndex:j});flat.push(ck)}));
    try{
        const res=await APIService.checkCache(STATE.project.id,mid,all);
        let cached=0,miss=0;
        res.chunks.forEach(r=>{const c=all.find(x=>x.id===r.id);if(r.exists){cached++;STATE.chapters[c.chapterIndex].chunks[c.chunkIndex].audioUrl=r.url;STATE.chapters[c.chapterIndex].chunks[c.chunkIndex].status='done'}else miss+=c.text.length});
        const cost=miss*TextParser.getModelCreditMultiplier(mid)*0.000165;
        document.getElementById('confirm-chars').innerText=flat.reduce((a,b)=>a+b.text.length,0).toLocaleString();
        document.getElementById('confirm-new').innerText=all.length-cached;
        document.getElementById('confirm-cached').innerText=cached;
        document.getElementById('confirm-cost').innerText=`$${cost.toFixed(2)}`;
        return {cost,missingCount:all.length-cached};
    }catch(e){LOG.add('Cache check error','error');return null}
}

async function processChunkGeneration(chunk,chIdx,ckIdx,retry=0){
    if(STATE.halt)return false;
    const limit=parseFloat(document.getElementById('budget-limit').value)||999;
    if(STATE.sessionCost>limit){alert('Budget Exceeded');return false}
    updateChunkUI(chunk.id,'processing');
    try{
        const mid=dom.elModel.value,vid=chunk.voiceId||STATE.project.voiceIds[0];
        const res=await engine.generateChunk(chunk.text,vid,mid,{projectId:STATE.project.id,chapterIndex:chIdx,chunkIndex:ckIdx});
        if(!res.cached){STATE.sessionCost+=chunk.text.length*TextParser.getModelCreditMultiplier(mid)*0.000165;updateReceipt()}
        chunk.duration=res.duration;chunk.audioUrl=res.audioUrl;chunk.filename=res.filename;chunk.status='done';updateChunkUI(chunk.id,'done');
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
    const mid=dom.elModel.value,res=await APIService.checkCache(STATE.project.id,mid,[{id:chunk.id,text:chunk.text,voiceId:chunk.voiceId||STATE.project.voiceIds[0],chapterIndex:chIdx,chunkIndex:ckIdx}]);
    const isCached=res.chunks[0].exists,cost=isCached?0:chunk.text.length*TextParser.getModelCreditMultiplier(mid)*0.000165;
    document.getElementById('safety-message').innerText="Generate segment?";document.getElementById('confirm-chars').innerText=chunk.text.length;document.getElementById('confirm-new').innerText=isCached?0:1;document.getElementById('confirm-cached').innerText=isCached?1:0;document.getElementById('confirm-cost').innerText=`$${cost.toFixed(4)}`;
    openSafetyModal();
    document.getElementById('btn-confirm-start').onclick=async()=>{closeSafetyModal();await processChunkGeneration(chunk,chIdx,ckIdx);attachDefaultConfirmListener()};
}

async function generateChapter(idx,e){
    if(e)e.stopPropagation();
    const ch=STATE.chapters[idx];if(!ch)return;
    const mid=dom.elModel.value,checks=ch.chunks.map((k,i)=>({id:k.id,text:k.text,voiceId:k.voiceId||STATE.project.voiceIds[0],chapterIndex:idx,chunkIndex:i}));
    const res=await APIService.checkCache(STATE.project.id,mid,checks);
    let miss=0,total=0,cached=0;
    res.chunks.forEach((r,i)=>{total+=checks[i].text.length;if(r.exists)cached++;else miss+=checks[i].text.length});
    document.getElementById('safety-message').innerText=`Generate ${ch.title}?`;document.getElementById('confirm-chars').innerText=total;document.getElementById('confirm-new').innerText=checks.length-cached;document.getElementById('confirm-cached').innerText=cached;document.getElementById('confirm-cost').innerText=`$${(miss*TextParser.getModelCreditMultiplier(mid)*0.000165).toFixed(2)}`;
    openSafetyModal();
    document.getElementById('btn-confirm-start').onclick=async()=>{closeSafetyModal();STATE.halt=false;document.getElementById('btn-halt').style.display='inline-block';
        let files=[],ok=0;
        for(let i=0;i<ch.chunks.length;i++){if(STATE.halt)break;if(await processChunkGeneration(ch.chunks[i],idx,i)){ok++;if(ch.chunks[i].filename)files.push(ch.chunks[i].filename)}}
        document.getElementById('btn-halt').style.display='none';
        if(ok===ch.chunks.length&&files.length){try{const r=await APIService.mergeChapter(STATE.project.id,idx,files,ch.title==="Titles");ch.audioUrl=r.url;renderTimeline()}catch(e){LOG.add(e.message,'error')}}
        attachDefaultConfirmListener();
    }
}
function attachDefaultConfirmListener(){document.getElementById('btn-confirm-start').onclick=startFullBookGeneration}

function renderTimeline() {
    if (!STATE.chapters.length) {
        dom.timeline.innerHTML = '<div style="padding:20px;text-align:center;color:var(--text-dim);font-style:italic">No chapters. Paste text & "Analyze".</div>';
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
            return `<div id="chunk-${ck.id}" class="chunk-item ${st}" onclick="playSingleChunk('${ck.id}')" style="${bg}" role="button">
                <div style="display:flex;align-items:center;gap:10px;width:100%">
                    <span style="font-family:var(--font-mono);font-size:0.8rem;color:${isPlaying?'var(--accent)':'var(--text-dim)'};width:20px;text-align:center">${isPlaying?'⏹':(cIdx+1)}</span>
                    <span class="voice-tag ${isPlaying?'playing':''}" style="${allDone||isPlaying?'display:inline-block':''};margin:0;width:80px;text-align:center">${ck.voiceName||'Voice'}</span>
                    <span class="chunk-content" style="flex:1">${ck.text.substring(0,60)}...</span>
                    <div class="chunk-actions"><button class="action-btn" onclick="generateSingleChunk('${ck.id}',event)">↺</button><span class="generated-icon" style="opacity:${ck.status==='done'?1:0}">✓</span></div>
                </div></div>`;
        }).join('') : '';

        return `<div class="chapter-card">
            <div class="chapter-header">
                <button class="sm-btn" onclick="toggleChapterCollapse(${idx},event)" style="margin-right:10px;width:24px;padding:0">${collapsed?'+':'−'}</button>
                <div onclick="displayChapter(${idx})" style="flex:1;cursor:pointer">
                    <div style="display:flex;justify-content:space-between;align-items:center">
                        <div style="display:flex;align-items:center;gap:8px"><span style="font-size:1rem;font-weight:700;color:var(--accent)">${ch.title}</span>${allDone?'<span style="color:var(--success)">✓</span>':''}</div>
                        <span style="font-size:0.75rem;background:rgba(255,255,255,0.1);padding:2px 8px;border-radius:12px">${ch.chunks.length} Segments</span>
                    </div>
                    <div style="font-size:0.8rem;color:var(--text-dim);display:flex;gap:10px"><span>🗣️ ${uniqueVoices} Voices</span><span>⏱️ ${(ch.chunks.length*15/60).toFixed(1)} min</span></div>
                </div>
                <div style="margin-left:15px;display:flex;align-items:center;gap:8px">
                    ${ch.audioUrl?`<button class="sm-btn ${playing?'playing':''}" onclick="playChapter(${idx},event)">${playing?'⏹ Stop':'▶ Play'}</button>`:''}
                    <button class="sm-btn" onclick="generateChapter(${idx},event)">⚡ ${ch.audioUrl?'Regen':'Gen Chapter'}</button>
                    ${ch.audioUrl?'<span style="color:var(--success);font-weight:bold;font-size:1.2rem">✓✓</span>':''}
                </div>
            </div>${chunksHtml}</div>`;
    }).join('');
}

function toggleChapterCollapse(i,e){if(e)e.stopPropagation();STATE.chapters[i].collapsed=!STATE.chapters[i].collapsed;renderTimeline()}
function toggleDualMode(){const m=dom.projectMode.value;STATE.project.mode=m;dom.groupVoice2.style.display=m==='dual'?'block':'none';dom.groupToken.style.display=m==='dual'?'block':'none'}
function openVoiceDropdown(s,e){e.stopPropagation();STATE.activeVoiceSlot=s;dom.voiceDropdown.classList.add('show');const r=(s===1?dom.voiceBtn1:dom.voiceBtn2).getBoundingClientRect();dom.voiceDropdown.style.top=`${r.bottom+5}px`;refreshVoiceList()}

async function refreshVoiceList(){
    STATE.voices=await engine.getVoices();const dd=dom.voiceDropdown;dd.innerHTML='';
    if(!STATE.voices.length){dd.innerHTML='<div style="padding:15px;color:var(--text-dim)">No voices.</div>';return}
    const cols={sm:document.createElement('div'),sf:document.createElement('div'),so:document.createElement('div'),pm:document.createElement('div'),pf:document.createElement('div')};
    const labels={sm:'💻 Std-Male',sf:'💻 Std-Female',so:'💻 Std-Other',pm:'☁️ Pre-Male',pf:'☁️ Pre-Female'};
    Object.keys(cols).forEach(k=>{cols[k].className='voice-col';cols[k].innerHTML=`<div class="voice-col-header">${labels[k]}</div>`;dd.appendChild(cols[k])});
    const cur=STATE.project.voiceIds[STATE.activeVoiceSlot-1];
    STATE.voices.forEach(v=>{
        const el=document.createElement('div');el.className=`voice-option ${v.id===cur?'selected':''}`;el.innerText=v.name;
        el.onclick=()=>selectVoice(v.id);
        if(v.type==='premium'){const g=(v.labels.gender||'').toLowerCase();g==='female'?cols.pf.appendChild(el):cols.pm.appendChild(el)}
        else{const n=v.name.toLowerCase();if(n.includes('female')||n.includes('samantha'))cols.sf.appendChild(el);else if(n.includes('male')||n.includes('daniel'))cols.sm.appendChild(el);else cols.so.appendChild(el)}
    });
    updateDropdownButtons();
}

function selectVoice(id){const s=STATE.activeVoiceSlot-1;STATE.project.voiceIds[s]=id;const v=STATE.voices.find(x=>x.id===id),ni=s===0?dom.voiceName1:dom.voiceName2;if(v&&!ni.value.trim())ni.value=v.name.split(' ')[0];updateDropdownButtons();updateModelDropdownState();updateReceipt()}

function updateDropdownButtons(){[0,1].forEach(s=>{const v=STATE.voices.find(x=>x.id===STATE.project.voiceIds[s]),b=s===0?dom.voiceBtn1:dom.voiceBtn2;b.querySelector('span').innerText=v?v.name:"Select Voice..."})}
window.addEventListener('click',e=>{if(!dom.voiceDropdown.contains(e.target)&&!dom.voiceBtn1.contains(e.target)&&!dom.voiceBtn2.contains(e.target))dom.voiceDropdown.classList.remove('show')});
function sanitizeChunkSize(v){const p=parseInt(v,10);return isNaN(p)?1000:Math.min(Math.max(p,200),4000)}

function splitTextIntoChunks(txt,max){
    const res=[];let rem=txt.trim();
    while(rem.length>0){if(rem.length<=max){res.push(rem);break}
        const safe=Math.floor(max*0.75),area=rem.substring(safe,max);
        let split=safe,match,last=-1;
        while((match=/[.!?\u201d"]+(?=\s|$)/g.exec(area))!==null)last=match.index+match[0].length;
        if(last!==-1)split+=last;else{const sp=rem.lastIndexOf(' ',max);split=(sp>max*0.3)?sp:(rem.lastIndexOf('\n',max)>max*0.3?rem.lastIndexOf('\n',max):max)}
        res.push(rem.slice(0,split).trim());rem=rem.slice(split).trimStart();
    }return res
}

dom.manuscript.addEventListener('input',()=>{localStorage.setItem('ab_manuscript',dom.manuscript.value);updateReceipt()});

document.getElementById('btn-analyze').addEventListener('click',()=>{
    const raw=dom.manuscript.value;if(!raw.trim())return;
    STATE.chapters.forEach(c=>c.chunks.forEach(k=>{if(k.audioUrl)URL.revokeObjectURL(k.audioUrl)}));STATE.chapters=[];
    STATE.project.voiceNames=[dom.voiceName1.value,dom.voiceName2.value];STATE.project.token=dom.voiceToken.value;
    const lim=sanitizeChunkSize(dom.chunkSize.value);dom.chunkSize.value=lim;
    const reg=TextParser.getChapterHeadingRegex(),parts=raw.split(reg).filter(p=>p.trim().length>0);
    let curT="Start",pre="",pend="",cnt=0;
    if(parts.length&&!parts[0].match(reg))pre=parts[0];
    for(let i=0;i<parts.length;i++){
        const p=parts[i],pc=p.trim();
        if(pc.match(reg)){
            curT=pc.replace(/^[#\s]+/,'').trim();cnt++;pend=curT.replace(/[:|–—]\s*/g,'... ... ... ').trim();if(!pend.match(/[.!?]$/))pend+='... ... ...';pend+='\n\n';
        }else{
            let ft=pend+p;pend="";let segs=STATE.project.mode==='dual'?TextParser.parseDualVoiceSegments(ft,STATE.project.token,TextParser.detectStartingVoice(ft,curT,STATE.project.voiceNames),STATE.project.voiceNames):[{text:ft,voiceIndex:0}];
            const chChunks=[];
            segs.forEach(s=>splitTextIntoChunks(s.text,lim).forEach(t=>{
                chChunks.push({text:t,status:'pending',id:Math.random().toString(36).substr(2,9),audioUrl:null,voiceId:STATE.project.voiceIds[s.voiceIndex]||STATE.project.voiceIds[0],voiceName:STATE.project.voiceNames[s.voiceIndex]||(s.voiceIndex===0?"Voice 1":"Voice 2"),duration:0});
            }));
            if(chChunks.length){
                let ft="Titles";
                if(cnt>0){let ch=curT.replace(/^(Chapter|Part|Book|Kapitel|Prologue|Epilogue)\s+\d*[:\.]?\s*/i,'');ft=`Chapter ${cnt}${ch?': '+ch:''}`}
                STATE.chapters.push({title:ft,chunks:chChunks,collapsed:false});
            }
        }
    }
    const meta=TextParser.detectProjectMetadata(raw,pre),safeT=(meta.title||'u').replace(/\W/g,''),safeA=(meta.author||'u').replace(/\W/g,'');
    STATE.project.id=`${safeT.substring(0,10)}_${Math.abs([...(safeT+safeA)].reduce((h,c)=>(h<<5)-h+c.charCodeAt(0)|0,0)).toString(16)}`;
    const cost=STATE.chapters.reduce((a,c)=>a+c.chunks.reduce((x,y)=>x+y.text.length,0),0)*TextParser.getModelCreditMultiplier(dom.elModel.value)*0.000165;
    document.getElementById('project-summary').style.display='block';document.getElementById('sum-title').innerText=meta.title;document.getElementById('sum-author').innerText=meta.author;document.getElementById('sum-lang').innerText=meta.language;
    document.getElementById('sum-chapters').innerText=STATE.chapters.length;document.getElementById('sum-chars').innerText=Math.round(cost/0.000165);document.getElementById('sum-cost').innerText=`$${cost.toFixed(2)}`;document.getElementById('sum-model').innerText=dom.elModel.value;
    renderTimeline();dom.btnGenerate.disabled=!STATE.chapters.length;dom.btnGenerate.innerText="2. Generate Audio";updateReceipt();
});

document.getElementById('btn-generate').addEventListener('click',async()=>{if(!STATE.project.voiceIds[0]){alert("Select Voice 1");return}
    dom.btnGenerate.innerText="Checking...";dom.btnGenerate.disabled=true;
    const st=await checkProjectCache();dom.btnGenerate.innerText="2. Generate Audio";dom.btnGenerate.disabled=false;
    if(!st)return;if(st.missingCount===0){alert("All cached!");return}
    document.getElementById('safety-message').innerText="Generate full book?";attachDefaultConfirmListener();openSafetyModal();
});

async function startFullBookGeneration(){
    closeSafetyModal();STATE.halt=false;dom.btnGenerate.disabled=true;dom.btnGenerate.innerText="Generating...";document.getElementById('btn-halt').style.display='inline-block';
    for(let i=0;i<STATE.chapters.length;i++){
        if(STATE.halt)break;const ch=STATE.chapters[i];let files=[],ok=0;
        for(let j=0;j<ch.chunks.length;j++){
            if(STATE.halt)break;const ck=ch.chunks[j];
            if(ck.status==='done'&&ck.audioUrl){ok++;files.push(ck.filename||ck.audioUrl.split('/').pop());continue}
            if(await processChunkGeneration(ck,i,j)){ok++;if(ck.filename)files.push(ck.filename)}
        }
        if(!STATE.halt&&ok===ch.chunks.length&&files.length)try{const r=await APIService.mergeChapter(STATE.project.id,i,files,ch.title==="Titles");ch.audioUrl=r.url}catch(e){}
    }
    dom.btnGenerate.disabled=false;dom.btnGenerate.innerText="2. Generate Audio";document.getElementById('btn-halt').style.display='none';renderTimeline();
}

dom.btnPlay.addEventListener('click',async()=>{if(STATE.isPlaying){engine.stop();return}
    STATE.isPlaying=true;engine.updateBtn(true);dom.masterProgress.value=0;
    const q=STATE.chapters.flatMap(c=>c.chunks),tot=q.length;
    for(let i=0;i<tot;i++){
        if(!STATE.isPlaying)break;const c=q[i];STATE.activePlaybackId=`chunk_${c.id}`;renderTimeline();dom.masterProgress.value=((i+1)/tot)*100;
        document.getElementById(`chunk-${c.id}`)?.scrollIntoView({behavior:'smooth',block:'center'});
        try{await engine.playChunk(c)}catch(e){}
    }
    engine.stop();dom.masterProgress.value=100;
});

function updateReceipt(){
    let est=0,raw=dom.manuscript.value.length,mul=TextParser.getModelCreditMultiplier(dom.elModel.value);
    if(STATE.chapters.length)STATE.chapters.forEach(c=>c.chunks.forEach(k=>{const v=STATE.voices.find(x=>x.id==(k.voiceId||STATE.project.voiceIds[0]));if(v&&v.type==='premium')est+=k.text.length}));else est=raw;
    dom.receipt.innerText=`$${STATE.sessionCost.toFixed(2)} / $${(est*mul*0.000165).toFixed(2)}`;
}

function updateModelDropdownState(){const v1=STATE.voices.find(v=>v.id===STATE.project.voiceIds[0]),v2=STATE.project.mode==='dual'?STATE.voices.find(v=>v.id===STATE.project.voiceIds[1]):null;const p=(v1&&v1.type==='premium')||(v2&&v2.type==='premium');dom.elModel.disabled=!p;dom.elModel.style.opacity=p?'1':'0.5'}

async function saveCurrentProject(){
    if(!STATE.chapters.length&&!dom.manuscript.value.trim()){alert("Empty");return}
    let m={title:"Untitled",author:"Unknown"};try{m=TextParser.detectProjectMetadata(dom.manuscript.value,"")}catch(e){}
    const inp=document.getElementById('project-title-input').value.trim();if(inp)m.title=inp;
    try{
        const r=await APIService.req('/api/projects',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:STATE.project.id,title:m.title,author:m.author,chapters:STATE.chapters,manuscript:dom.manuscript.value,projectSettings:STATE.project})});
        if(r.id)STATE.project.id=r.id;openProjectModal();LOG.add('Saved','success');
    }catch(e){alert("Save failed: "+e.message)}
}

async function openProjectModal(){
    document.getElementById('project-modal').classList.add('show');const lst=document.getElementById('project-list');lst.innerHTML='Loading...';
    try{
        const p=await APIService.req('/api/projects');
        lst.innerHTML=p.length?p.map(x=>`<div class="project-item"><div><strong>${x.title||'Unt'}</strong><br><small>${x.author}</small></div><button class="sm-btn" onclick="loadProject('${x.id}')">Load</button></div>`).join(''):'No projects';
    }catch(e){lst.innerHTML='Error loading projects'}
}

function closeProjectModal(){document.getElementById('project-modal').classList.remove('show')}
function openHelpModal(){document.getElementById('help-modal').classList.add('show')}
function closeHelpModal(){document.getElementById('help-modal').classList.remove('show')}

async function loadProject(id){
    if(!confirm("Load? Unsaved lost."))return;
    try{
        const d=await APIService.req(`/api/projects/${id}`);
        STATE.project=d.projectSettings||STATE.project;STATE.chapters=d.chapters||[];dom.manuscript.value=d.manuscript||"";
        dom.projectMode.value=STATE.project.mode;dom.voiceName1.value=STATE.project.voiceNames?STATE.project.voiceNames[0]:"";dom.voiceName2.value=STATE.project.voiceNames?STATE.project.voiceNames[1]:"";
        toggleDualMode();renderTimeline();updateReceipt();closeProjectModal();LOG.add('Loaded','success');
    }catch(e){alert("Load failed")}
}

init();