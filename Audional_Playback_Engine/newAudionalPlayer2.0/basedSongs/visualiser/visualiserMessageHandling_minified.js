// visualiserMessageHandling_minified.js
const handleStopAction=()=>{cci2=initialCCI2,isChannel11Active=!1,isPlaybackActive=!1,activeChannelIndex=null,activeArrayIndex={},renderingState={},console.log(`Stop received. CCI2 reset to initial value ${initialCCI2}`),immediateVisualUpdate()},handleActiveStepAction=e=>{if(!isPlaybackActive||activeChannelIndex!==e){isPlaybackActive=!0,activeChannelIndex=e;const t=0===e?1:e,a=selectArrayIndex(seed,AccessLevel,t);if(console.log(`AccessLevel=${AccessLevel}\nArrayIndex=${a}\nCCI2=${cci2}\nIndex=${a}`),!arrayLengths[a])return void console.error("Invalid array length:",arrayLengths[a]);cci2=calculateCCI2(t,arrayLengths[a]),0===a&&triggerTitleSequence(),shouldUpdateVisualizer(e,a,cci2)&&(activeArrayIndex[e]=a,updateVisualizer(cci2,a,e)),hasLoggedFirstLoop||(playbackLoopCount++,hasLoggedFirstLoop=!0,console.log(`Playback loop count: ${playbackLoopCount} (first loop)`),notifyVisualizerLoopCount(playbackLoopCount))}},triggerTitleSequence=()=>{const e=new Event("playbackStarted");document.dispatchEvent(e),console.log("Title sequence triggered.")};function notifyVisualizerLoopCount(e){AudionalPlayerMessages.postMessage({action:"loopCount",loopCount:e})}document.addEventListener("internalAudioPlayback",(e=>{const{action:t,channelIndex:a}=e.detail;"stop"===t?handleStopAction():"activeStep"===t&&handleActiveStepAction(a)})),AudionalPlayerMessages.onmessage=e=>{const{action:t,channelIndex:a}=e.data;(isPlaybackActive||"stop"===t)&&("stop"===t?handleStopAction():handleActiveStepAction(a))},document.addEventListener("sequenceUpdated",(e=>{const{currentSequence:t,currentStep:a}=e.detail;if(0===t&&0===a){let e;playbackLoopCount++,console.log(`Playback loop count: ${playbackLoopCount}`),console.log(`Current Access Level: ${AccessLevel}`),e=1===AccessLevel&&AccessLevel<=2?5:AccessLevel>=3&&AccessLevel<=4?4:AccessLevel>=5&&AccessLevel<=6?3:AccessLevel>=7&&AccessLevel<=8?2:0,playbackLoopCount>=e?isTrippy||(isTrippy=!0,console.log("isTrippy activated"),handlePlaybackStateChange()):isTrippy&&(isTrippy=!1,console.log("isTrippy deactivated"),handlePlaybackStateChange()),notifyVisualizerLoopCount(playbackLoopCount)}}));