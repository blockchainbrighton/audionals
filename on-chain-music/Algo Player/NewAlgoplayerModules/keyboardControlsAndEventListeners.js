// keyboardControlsAndEventListeners.js
(()=>{const e=window.globalData||(window.globalData={}),o=e.audioContext;let n=null;const t=o=>{const n=e.songsArray.length;0!==n?("ArrowRight"===o?(e.currentSongIndex=(e.currentSongIndex+1)%n,console.log(`Skipped to next song: ${e.songsArray[e.currentSongIndex].id}`)):"ArrowLeft"===o&&(e.currentSongIndex=(e.currentSongIndex-1+n)%n,console.log(`Skipped to previous song: ${e.songsArray[e.currentSongIndex].id}`)),e.isPlaying?e.resetPlayback():(console.log("Playback is not active. Next song is cued and ready to play."),r(e.currentSongIndex))):console.error("No songs available to skip.")};e.nextSong=()=>t("ArrowRight"),e.previousSong=()=>t("ArrowLeft"),document.addEventListener("keydown",(e=>{"ArrowRight"!==e.key&&"ArrowLeft"!==e.key||(n&&clearTimeout(n),n=setTimeout((()=>{t(e.key)}),300))}));const r=o=>{const n=e.songsArray[o],t=document.getElementById("artworkImage"),r=document.getElementById("songTitle");t&&n.title&&n.title.length>0&&(t.src=n.artworkUrl||"default-artwork.png",console.log(`UI updated for Song: ${n.id}`)),r&&(r.textContent=n.title||"Unknown Title")};document.addEventListener("initialAudioBuffersReady",(function(e){e.detail.success&&console.log("Debugging Script: Audio buffers are ready.")})),o?(o.onstatechange=function(){console.log(`Debugging Script: AudioContext state changed to: ${o.state}`)},console.log("Debugging Script: AudioContext state change listener added.")):console.warn("Debugging Script: AudioContext not found."),["playbackStarted","playbackStopped"].forEach((e=>{document.addEventListener(e,(function(){console.log(`Debugging Script: '${e}' event dispatched.`)}))})),document.addEventListener("DOMContentLoaded",(function(){if(o){const e=async()=>{if("suspended"===o.state)try{await o.resume(),console.log("AudioContext resumed successfully.")}catch(e){console.error("Failed to resume AudioContext:",e)}};document.addEventListener("click",e),document.addEventListener("keydown",e),console.log("AudioContext resumption listeners added.")}else console.warn("AudioContext not found.")}))})();