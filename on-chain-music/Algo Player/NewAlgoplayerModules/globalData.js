//  globalData.js
const globalData=window.globalData={isPlaying:!1,currentSongIndex:0,songsArray:[],audioBuffers:{},reverseAudioBuffers:{},audioContext:new(window.AudioContext||window.webkitAudioContext),masterGain:null,gainNodes:{},startPlayback:null,stopPlayback:null,togglePlayback:null,resetPlayback:null,isArtworkCover:!0,isVisualiserCover:!1};globalData.masterGain=globalData.audioContext.createGain(),globalData.masterGain.connect(globalData.audioContext.destination);

