// main.js

    // pakoLoader_NoBlobs.js

    const keyMap = {
        0: 'projectName',
        1: 'artistName',
        2: 'projectBPM',
        3: 'currentSequence',
        4: 'channelURLs',
        5: 'channelVolume',
        6: 'channelPlaybackSpeed',
        7: 'trimSettings',
        8: 'projectChannelNames',
        9: 'startSliderValue',
        10: 'endSliderValue',
        11: 'totalSampleDuration',
        12: 'start',
        13: 'end',
        14: 'projectSequences',
        15: 'steps'
    };
    
    const reverseKeyMap = {};
    const channelMap = [];
    const reverseChannelMap = {};
    
    for (let i = 0; i < 26; i++) {
        const letter = String.fromCharCode(65 + i);
        channelMap.push(letter);
        reverseChannelMap[letter] = i;
    }
    
    Object.entries(keyMap).forEach(([k, v]) => {
        reverseKeyMap[v] = +k;
    });
    
    const decompressSteps = compressedSteps => {
        return compressedSteps.reduce((acc, step) => {
            if (typeof step === 'number') {
                acc.push(step);
            } else if (typeof step === 'object' && 'r' in step) {
                const [start, end] = step.r;
                for (let i = start; i <= end; i++) {
                    acc.push(i);
                }
            } else if (typeof step === 'string' && step.endsWith('r')) {
                acc.push({ index: parseInt(step.slice(0, -1), 10), reverse: true });
            }
            return acc;
        }, []);
    };
    
    const recursiveDeserialize = data => {
        if (Array.isArray(data)) {
            return data.map(v => (typeof v === 'object' ? recursiveDeserialize(v) : v));
        } else if (data && typeof data === 'object') {
            return Object.entries(data).reduce((acc, [shortKey, value]) => {
                const fullKey = keyMap[shortKey] ?? shortKey;
                if (fullKey === 'projectSequences') {
                    acc[fullKey] = Object.entries(value).reduce((seqAcc, [shortSeqKey, channels]) => {
                        const seqKey = `s${shortSeqKey.replace('Sequence', '')}`;
                        seqAcc[seqKey] = Object.fromEntries(
                            Object.entries(channels).map(([letter, chValue]) => {
                                const chKey = `ch${reverseChannelMap[letter]}`;
                                return [chKey, { steps: decompressSteps(chValue[reverseKeyMap.steps] || []) }];
                            })
                        );
                        return seqAcc;
                    }, {});
                } else {
                    acc[fullKey] = recursiveDeserialize(value);
                }
                return acc;
            }, {});
        }
        return data;
    };
    
    const loadPako = async () => {
        try {
            const htmlContent = await fetchText('/content/2109694f44c973892fb8152cf5c68607fb19288c045af1abc1716c1c3b4d69e6i0', 'Pako Loader');
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = htmlContent;
            const pakoScript = tempDiv.querySelector('script:contains("pako")');
            if (!pakoScript) throw new Error('Pako library not found in the HTML content.');
    
            const scriptElement = document.createElement('script');
            scriptElement.textContent = pakoScript.textContent;
            document.head.appendChild(scriptElement);
            console.log('Pako library loaded:', pako);
        } catch (error) {
            handleError(error, 'Load Pako');
        }
    };
    
    const processSerializedData = async url => {
        try {
            await loadPako();
            const compressedData = await fetchArrayBuffer(url, 'Serialized Data');
            const decompressedData = pako.inflate(new Uint8Array(compressedData));
            const jsonString = new TextDecoder('utf-8').decode(decompressedData);
            const serializedData = JSON.parse(jsonString);
            const originalData = recursiveDeserialize(serializedData);
            console.log('Deserialized Data:', originalData);
            window.jsonData = originalData;
            window.jsonDataUrl = 'stored in memory';
        } catch (error) {
            handleError(error, 'Process Serialized Data');
        }
    };
    
    
    ///////////////////////////////////////////////////////////////////////////////////////////////
    
    
            // songLoaderConfig_B_NoBlobs.js
    
            function loadScript(e, o) {
                const d = document.createElement("script");
                d.src = e;
                d.onload = o;
                d.onerror = () => console.error(`[debug] Error loading script: ${e}`);
                document.head.appendChild(d);
            }
    
            loadScript("/content/e575d3519ca3d6eb6a8d34e4c969dee9ef72b84766fd3f8f2ed2aeead06a4f66i0", function () {
                console.log("[debug] titleConfig.js loaded successfully.");
                console.log("Deserialized Data URL:", window.jsonDataUrl);
    
                // Define loadScriptsInOrder function
                function loadScriptsInOrder(scripts, callback) {
                    const loadNextScript = index => {
                        if (index >= scripts.length) {
                            callback();
                        } else {
                            loadScript(scripts[index], () => loadNextScript(index + 1));
                        }
                    };
                    loadNextScript(0);
                }
    
    
    ///////////////////////////////////////////////////////////////////////////////////////////////
    
                // audioContextManager.js
                !function(){if(!window.AudioContextManager){class t{constructor(){return t.instance||(this.audioCtx=new(window.AudioContext||window.webkitAudioContext),t.instance=this),t.instance}getAudioContext(){return this.audioCtx}async resume(){console.log(`[resume] [finalDebug] AudioContext State: ${this.audioCtx.state}`),"suspended"===this.audioCtx.state&&(await this.audioCtx.resume(),console.log("AudioContext resumed"))}}window.AudioContextManager=new t}}();
    
    ///////////////////////////////////////////////////////////////////////////////////////////////
                // jsonLoader_NoBlobs.js
                let intervalID=null,gVolMult=1,gJsonData=null,bpm=0,isRevPlay=!1,isToggle=!1,isReady=!1;const srcChanMap=new Map,gTrimTimes={},gVolLevels={},gPlaySpeeds={},actSources=[],gGainNodes=new Map,gAudioBufs=[],gRevAudioBufs={},gainNodes={},audioCtx=window.AudioContextManager.getAudioContext(),audPlayerMsgs=new BroadcastChannel("channel_playback");let audioWorker,preSeq={},curStep=0,beatCount=0,barCount=0,curSeq=0,isPlaying=!1,playTimeoutId=null,nextNoteTime=0,totSeq=0;async function loadJson(){if(gJsonData)try{console.log("[debug] Loaded JSON data:",gJsonData);const e={channelsWithUrls:0,sequencesCount:0,activeStepsPerSequence:{},activeChannelsPerSequence:{},types:{}};analyzeJson(gJsonData,e);const n=preparePlayback(gJsonData,e);console.log("[debug] Prepared data for playback:",n),await fetchAndProcessAudioData(n.channelURLs),preprocessSchedulePlayback(n),console.log("[debug] Preprocessed sequences:",preSeq)}catch(e){console.error("Could not load JSON data from memory:",e)}else console.error("No data found in memory")}function analyzeJson(e,n){if(e.projectSequences&&"object"==typeof e.projectSequences)for(const[t,s]of Object.entries(e.projectSequences)){n.activeStepsPerSequence[t]=0,n.activeChannelsPerSequence[t]=[];for(const[e,o]of Object.entries(s)){const s=`Channel ${parseInt(e.slice(2))+1}`;n.activeStepsPerSequence[t]+=o.steps.length,n.activeChannelsPerSequence[t].push(s)}}for(const[t,s]of Object.entries(e))if("projectSequences"!==t){const e=Array.isArray(s)?"array":typeof s;n.types[e]=(n.types[e]||0)+1,"object"!==e&&"array"!==e||analyzeJson(s,n)}}function setEndSeq(e){if(e&&e.sequences){let n=null,t=!1;for(const s of Object.values(e.sequences)){const o=Object.values(s.normalSteps).every((e=>0===e.length));if(o&&n){e.endSequence=n,t=!0,console.log("End sequence set to:",n);break}o||(n=s)}!t&&n&&(e.endSequence=n,console.log("End sequence set to the last non-empty sequence:",n))}}function preparePlayback(e,n){const{channelURLs:t,trimSettings:s,channelVolume:o,channelPlaybackSpeed:a,projectSequences:r,projectName:c,projectBPM:l,currentSequence:i}=e;bpm=l,totSeq=i,t.forEach(((e,n)=>{const t=n+1,r=s[n]||{};gTrimTimes[`Channel ${t}`]={startTrim:(r.startSliderValue||0)/100,endTrim:(r.endSliderValue||100)/100},gVolLevels[`Channel ${t}`]=(o[n]||1).toFixed(3),gPlaySpeeds[`Channel ${t}`]=Math.max(.1,Math.min(a[n],100)).toFixed(3)}));const p=Object.fromEntries(Object.entries(r).map((([e,n])=>{const t={},s={};return Object.entries(n).forEach((([e,n])=>{const o=`Channel ${parseInt(e.slice(2))+1}`;t[o]=[],s[o]=[],n.steps.forEach((e=>{const n="object"==typeof e?e.index:e;(e.reverse?s:t)[o].push(n)}))})),[e,{normalSteps:t,reverseSteps:s}]}))),u={projectName:c,bpm:l,channels:t.length,channelURLs:t,trimTimes:gTrimTimes,stats:n,sequences:p};return setEndSeq(u),u}function preprocessSchedulePlayback(e){if(!e||!e.sequences)return console.error("Playback data is not available or empty.");bpm=e.bpm,preSeq=Object.fromEntries(Object.entries(e.sequences).map((([e,n])=>[e,{normalSteps:processSteps(n.normalSteps),reverseSteps:processSteps(n.reverseSteps)}]))),isReady=Object.values(preSeq).some((e=>Object.keys(e.normalSteps).length>0||Object.keys(e.reverseSteps).length>0))}function processSteps(e){return Object.fromEntries(Object.entries(e).filter((([,e])=>e.length)).map((([e,n])=>[e,n.map((e=>({step:e,timing:(e*(60/bpm)).toFixed(3)})))])))}
    ///////////////////////////////////////////////////////////////////////////////////////////////
    
            
    
                    // Embed the content of the first script directly
                    window.audionalPlayerScripts = [
                                // "/content/61895db1f0d62d24cea96570e66b92435a8a4979e3d3fef8041680ed2afeddc8i0", // audioContextManager
                                   "/content/204885c72322cbaa0272bae20c992db17e4c88da9938bbff9ba1fa7dd325fa4bi0", // NEED TO REPLACE THIS LINE WITH THE FULL CODE FOR jsonLoader_NoBlobs.js
                                    "/content/150e020d5e6ea8b53b7b3d2160f25f65c2e550d413f9c53d9e1cfb101d6914f2i0",
                                    "/content/935828577e4762caaf32b76a0f74cb4f37bdcdbdae1d27a7c93d000d5cfe9d28i0",
                                    "/content/bab2b37e0abcce41d784d65d94a5c3c266228c2d8bd3ecdee4fba7986f5a042ei0",
                                    "/content/1a5cafb61e4a320434fc4087e203d2a5f695ba9112635b960fc9d7dcb961d9fci0",
                                    "/content/a3d8a40fcde6935f16b49ad7c9e9aa185f01d1618f4e35828415f6cc27377a47i0",
                                    "/content/17c6cb4f92d47043da52ce8334c41961c588b7955488e56f08264840ef63a4eei0"
                                ];
    
                                const scriptFiles = [
                                    // Skipping the first URL and embedding the actual script content
                                    "/content/5e2a8243e075f7a23e94f9bd4de5154c260f4157317bce504372523cf8d24c8ai0",
                                    "/content/7e14b0798d8244ba8b94a9e474a05000ccc335aa51aa69b06b53bea73224fa71i0",
                                    "/content/9a90ce273218fdf878e9c36e35f4ac4ebf47f9fb93ba00eabfe8a51958b90b4ei0",
                                    "/content/c0a912d642dba6d9e02ac59744c516b88d052630301f410535e6167809cd8ceai0",
                                    "/content/fd3da6a5f15f8a379e7219302997ae07d152d69ba413a0e36cb9bb85cbb1f14fi0"
                                ];   
                                         // Updated initializeScripts function
                function initializeScripts() {
                    loadScriptsInOrder(scriptFiles, () => {
                        // Combine all script arrays into the main scriptsToLoad array
                        window.scriptsToLoad = [
                            ...window.audionalPlayerScripts,
                            ...window.titleDisplayScripts,
                            ...window.colourPaletteScrips,
                            ...window.colourSettingsScripts,
                            ...window.visualiserScripts,
                            ...window.visualiserLoggingScripts
                        ];
    
                        // Load the main loader script
                        loadScript('/content/f9b3a2f4a426432ead5c01e2e80c18cc7eb14f567cbea8254f66f7fa5a7d0061i0', () => {
                            console.log("[debug] loader_NoBlobs.js loaded successfully.");
                        });
                    });
                }
    
                // Instead of loading scriptLoaderMaster.js from URL, directly embed its logic here
                if (typeof initializeScripts === "function") {
                    initializeScripts();
                } else {
                    console.error("[debug] Error: initializeScripts function is not defined.");
                }
    
            });
    
    
    
    
    
    const getJsonData = () => {
        const data = window.jsonData;
        if (data) {
            return data;
        } else {
            console.error('No data found in memory');
            return null;
        }
    };