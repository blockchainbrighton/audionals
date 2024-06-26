// visualiserStateAssignments.js

function getAssignments(n){return Array.from({length:TOTAL_CHANNELS},((e,r)=>{const{arrayIndex:t,cci2:a}=n[r+1]||{};return void 0!==t&&void 0!==a?`Channel ${r+1}: ArrayIndex=${t}, CCI2=${a}`:`Channel ${r+1}: Unassigned`}))}function getTimecode(){return void 0===window.playbackStartTime?0:Date.now()-window.playbackStartTime}