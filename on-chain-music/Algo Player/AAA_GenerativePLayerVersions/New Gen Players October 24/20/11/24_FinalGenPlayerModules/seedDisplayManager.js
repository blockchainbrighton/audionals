// seedDisplayManager.js
window.updateSeedDisplay=function(){const a=globalData.songsArray[globalData.currentSongIndex];if(a){const e=a.seed,n=a.bpm,o=a.id;displaySeedAndBPM(e,n,o),globalData.currentSeed=e}},window.handleNextSong=function(){globalData.nextSong(),updateSeedDisplay()},window.handlePreviousSong=function(){globalData.previousSong(),updateSeedDisplay()};
