// jsonLoader.js
let globalVolumeMultiplier=1,globalJsonData=null,bpm=0;const sourceChannelMap=new Map;let globalTrimTimes={},globalVolumeLevels={},globalPlaybackSpeeds={},activeSources=[],globalGainNodes=new Map,globalAudioBuffers=[],globalReversedAudioBuffers={},isReversePlay=!1,isToggleInProgress=!1;const gainNodes={},audioCtx=window.AudioContextManager.getAudioContext();let audioWorker,preprocessedSequences={},isReadyToPlay=!1,currentStep=0,beatCount=0,barCount=0,currentSequence=0,isPlaying=!1,playbackTimeoutId=null,nextNoteTime=0,totalSequences=0;const AudionalPlayerMessages=new BroadcastChannel("channel_playback");async function loadJsonFromUrl(e){try{const n=await fetch(e);if(!n.ok)throw new Error(`HTTP error! Status: ${n.status}`);globalJsonData=await n.json();const t={channelsWithUrls:0,sequencesCount:0,activeStepsPerSequence:{},activeChannelsPerSequence:{},types:{}};analyzeJsonStructure(globalJsonData,t);const s=prepareForPlayback(globalJsonData,t);await fetchAndProcessAudioData(s.channelURLs),preprocessAndSchedulePlayback(s)}catch(e){console.error("Could not load JSON data from URL:",e)}}function analyzeJsonStructure(e,n){if(e.projectSequences&&"object"==typeof e.projectSequences)for(const[t,s]of Object.entries(e.projectSequences)){n.activeStepsPerSequence[t]=0,n.activeChannelsPerSequence[t]=[];for(const[e,o]of Object.entries(s)){const s=`Channel ${parseInt(e.slice(2))+1}`;n.activeStepsPerSequence[t]+=o.steps.length,n.activeChannelsPerSequence[t].push(s)}}for(const[t,s]of Object.entries(e))if("projectSequences"!==t){const e=Array.isArray(s)?"array":typeof s;n.types[e]=(n.types[e]||0)+1,"object"!==e&&"array"!==e||analyzeJsonStructure(s,n)}}function findAndSetEndSequence(e){if(e&&e.sequences){let n=null,t=!1;for(const[s,o]of Object.entries(e.sequences)){const s=Object.values(o.normalSteps).every((e=>0===e.length));if(s&&n){e.endSequence=n,t=!0,console.log("End sequence set to:",n);break}s||(n=o)}!t&&n&&(e.endSequence=n,console.log("End sequence set to the last non-empty sequence:",n))}}function prepareForPlayback(e,n){const{channelURLs:t,trimSettings:s,channelVolume:o,channelPlaybackSpeed:a,projectSequences:r,projectName:c,projectBPM:l,currentSequence:u}=e;bpm=l,totalSequences=u,globalTrimTimes={},globalVolumeLevels={},globalPlaybackSpeeds={},t.forEach(((e,n)=>{const t=n+1,r=s[n]||{};globalTrimTimes[`Channel ${t}`]={startTrim:Number((r.startSliderValue||0)/100).toFixed(3),endTrim:Number((r.endSliderValue||100)/100).toFixed(3)},globalVolumeLevels[`Channel ${t}`]=Number(o[n]||1).toFixed(3),globalPlaybackSpeeds[`Channel ${t}`]=Number(Math.max(.1,Math.min(a[n],100))||1).toFixed(3)})),logVolumeSettings();const i=Object.entries(r).reduce(((e,[n,t])=>{const s={},o={};return Object.entries(t).forEach((([e,n])=>{const t=`Channel ${parseInt(e.slice(2))+1}`;s[t]=[],o[t]=[],n.steps.forEach((e=>{const n="object"==typeof e?e.index:e;e.reverse?o[t].push(n):s[t].push(n)}))})),e[n]={normalSteps:s,reverseSteps:o},e}),{}),p={projectName:c,bpm:l,channels:t.length,channelURLs:t,trimTimes:globalTrimTimes,stats:{channelsWithUrls:n.channelsWithUrls,sequencesCount:n.sequencesCount,activeStepsPerSequence:n.activeStepsPerSequence,activeChannelsPerSequence:n.activeChannelsPerSequence},sequences:i};return findAndSetEndSequence(p),p}function preprocessAndSchedulePlayback(e){if(!e||!e.sequences)return console.error("Playback data is not available or empty.");bpm=e.bpm,preprocessedSequences=Object.fromEntries(Object.entries(e.sequences).map((([e,n])=>[e,{normalSteps:processSteps(n.normalSteps),reverseSteps:processSteps(n.reverseSteps)}]))),isReadyToPlay=Object.values(preprocessedSequences).some((e=>Object.keys(e.normalSteps).length>0||Object.keys(e.reverseSteps).length>0))}function processSteps(e){return Object.fromEntries(Object.entries(e).filter((([,e])=>Array.isArray(e)&&e.length)).map((([e,n])=>[e,n.map((e=>({step:e,timing:Number(e*(60/bpm)).toFixed(3)})))])))}function logVolumeSettings(){for(const[e,n]of Object.entries(globalVolumeLevels));}