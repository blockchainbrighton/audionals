function dispatchSequenceEvent(e,t){const n=new CustomEvent(e,{detail:t});document.dispatchEvent(n)}function playSequenceStep(e){if(!isReadyToPlay||!Object.keys(preprocessedSequences).length)return console.error("Sequence data is not ready or empty.");const t=Object.keys(preprocessedSequences);currentSequence%=t.length;const n=preprocessedSequences[t[currentSequence]];n&&Object.keys(n).length?(playSteps(n.normalSteps,e),playSteps(n.reverseSteps,e,!0),incrementStepAndSequence(t.length)):incrementStepAndSequence(t.length)}function playSteps(e,t,n=!1){if(!e||"object"!=typeof e)return console.error("[playSteps] Invalid steps data:",e);for(const[r,c]of Object.entries(e))if(Array.isArray(c)){const e=c.find((e=>e.step===currentStep));e&&playChannelStep(r,e,t,n)}else console.error(`[playSteps] Expected steps to be an array for channel "${r}", but got:`,c)}function playChannelStep(e,t,n,r){const c=globalAudioBuffers.find((t=>t.channel===e)),o=globalTrimTimes[e];if(c?.buffer&&o){const s=r?globalReversedAudioBuffers[e]:c.buffer,u=r?calculateReversedTrimTimes(o):o;playBuffer(s,u,e,n),notifyVisualizer(parseInt(e.slice(8))-1,t.step)}else console.error(`No audio buffer or trim times found for ${e}`)}function scheduleNotes(){const e=audioCtx.currentTime;for(nextNoteTime=Math.max(nextNoteTime,e);nextNoteTime<e+.1;){const e=nextNoteTime;playSequenceStep(e),audioCtx.currentTime>e&&console.warn(`[scheduleNotes] Note scheduled for ${e.toFixed(3)} missed at ${audioCtx.currentTime.toFixed(3)}.`),nextNoteTime+=getStepDuration()}}function incrementStepAndSequence(e){currentStep=(currentStep+1)%64,0===currentStep&&(currentSequence=(currentSequence+1)%e),dispatchSequenceEvent("sequenceUpdated",{currentSequence:currentSequence,currentStep:currentStep})}document.addEventListener("sequenceUpdated",(e=>{const{currentSequence:t,currentStep:n}=e.detail}));