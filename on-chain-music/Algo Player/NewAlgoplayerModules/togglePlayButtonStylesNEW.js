// togglePlayButtonStylesNEW.js
function proceedWithPlayback(){globalData.isPlaying?globalData.stopPlayback():globalData.startPlayback()}globalData.togglePlayback=function(){"suspended"===globalData.audioContext.state?globalData.audioContext.resume().then((()=>{proceedWithPlayback()})):proceedWithPlayback()};
