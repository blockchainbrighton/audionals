function setChannelVolume(e,n){console.log("{channelSettings.js} setChannelVolume: channelIndex:",e,"volume:",n);const a=document.querySelector(`.channel[data-id="Channel-${e}"]`);a.dataset.volume=n,updateChannelVolume(a)}function updateChannelVolume(e){console.log("{channelSettings.js} updateChannelVolume: channel:",e);const n=parseFloat(e.dataset.volume);gainNodes[parseInt(e.dataset.id.split("-")[1])].gain.value=n}