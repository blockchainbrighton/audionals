// audioContextManager.js
!function(){if(!window.AudioContextManager){class t{constructor(){return t.instance||(this.audioCtx=new(window.AudioContext||window.webkitAudioContext),t.instance=this),t.instance}getAudioContext(){return this.audioCtx}async resume(){console.log(`[resume] [finalDebug] AudioContext State: ${this.audioCtx.state}`),"suspended"===this.audioCtx.state&&(await this.audioCtx.resume(),console.log("AudioContext resumed"))}}window.AudioContextManager=new t}}();