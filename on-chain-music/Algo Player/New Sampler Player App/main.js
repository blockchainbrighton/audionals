// main.js
import {
    playKick,
    playSnare,
    playHiHat,
    playTonalHit,
    getSample,
  } from './player.js';
  import { audioContext, loadSample } from './audioLoader.js';
  
  // Ensure the user interacts with the page before audio can be played
  document.body.addEventListener(
    'click',
    () => {
      if (audioContext.state === 'suspended') {
        audioContext.resume();
      }
    },
    { once: true }
  );
  
  // Current BPM (default)
  let currentBpm = 137;
  
  // Scheduler variables
  let isBeatPlaying = false;
  let isRhythmLoopPlaying = false;
  let isMelodyLoopPlaying = false;
  
  let nextNoteTime = 0.0; // When the next note is due
  const scheduleAheadTime = 0.1; // How far ahead to schedule audio (sec)
  const lookahead = 25.0; // How frequently to call scheduling function (ms)
  
  let current16thNote = 0; // What note is currently last scheduled?
  let timerID = 0;
  
  // Map to hold currently playing sources for loops
  const activeSources = new Map();
  
  // Add an object to store loop info
  const loopInfo = {
    rhythmLoop: null,
    melodyLoop: null,
  };
  
  // Add event listeners to buttons
  document.getElementById('playKick').addEventListener('click', () => playKick(currentBpm));
  document.getElementById('playSnare').addEventListener('click', () => playSnare(currentBpm));
  document.getElementById('playHiHat').addEventListener('click', () => playHiHat(currentBpm));
  document.getElementById('playTonalHit').addEventListener('click', () => playTonalHit(currentBpm));
  
  // Loop buttons
  document.getElementById('generateBeat').addEventListener('click', toggleBeat);
  document.getElementById('playRhythmLoop').addEventListener('click', toggleRhythmLoop);
  document.getElementById('playMelodyLoop').addEventListener('click', toggleMelodyLoop);
  
  // BPM Control
  document.getElementById('setBpm').addEventListener('click', () => {
    const bpmInput = document.getElementById('bpmInput').value;
    const bpm = parseInt(bpmInput, 10);
    if (isNaN(bpm) || bpm <= 0) {
      alert('Please enter a valid BPM value.');
      return;
    }
    currentBpm = bpm;
    alert(`BPM set to ${currentBpm}`);
  
    // If any loops or beats are playing, restart the scheduler
    if (isBeatPlaying || isRhythmLoopPlaying || isMelodyLoopPlaying) {
      stopScheduler();
      startScheduler();
    }
  });
  
  // Scheduler function
  function scheduler() {
    // While there are notes that will need to play before the next interval, schedule them and advance the pointer.
    while (nextNoteTime < audioContext.currentTime + scheduleAheadTime) {
      // Schedule beat notes
      if (isBeatPlaying) {
        scheduleBeat(current16thNote, nextNoteTime);
      }
  
      // Schedule looped samples
      if (isRhythmLoopPlaying) {
        scheduleLoop('loop', 'rhythm', nextNoteTime, 'rhythmLoop');
      }
      if (isMelodyLoopPlaying) {
        scheduleLoop('loop', 'melody', nextNoteTime, 'melodyLoop');
      }
  
      nextNote();
    }
  
    timerID = setTimeout(scheduler, lookahead);
  }
  
  // Advances current note and time by a 16th note
  function nextNote() {
    const secondsPerBeat = 60.0 / currentBpm;
    nextNoteTime += 0.25 * secondsPerBeat; // Add a quarter of a beat (16th note)
    current16thNote = (current16thNote + 1) % 16;
  }
  
  function scheduleBeat(beatNumber, time) {
    let loopDuration = null;
    let loopStartTime = null;
  
    // Determine if a loop is playing and get its duration and start time
    if (isRhythmLoopPlaying && loopInfo.rhythmLoop) {
      loopDuration = loopInfo.rhythmLoop.duration;
      loopStartTime = loopInfo.rhythmLoop.startTime;
    } else if (isMelodyLoopPlaying && loopInfo.melodyLoop) {
      loopDuration = loopInfo.melodyLoop.duration;
      loopStartTime = loopInfo.melodyLoop.startTime;
    }
  
    if (loopDuration && loopStartTime !== null) {
      // Calculate the number of beats that fit into the loop duration
      const secondsPerBeat = 60.0 / currentBpm;
      const totalBeatsInLoop = Math.round(loopDuration / secondsPerBeat);
  
      // Calculate the beat position within the loop
      const timeSinceLoopStart = time - loopStartTime;
      const beatPositionInLoop = Math.floor(timeSinceLoopStart / secondsPerBeat) % totalBeatsInLoop;
  
      // Schedule beats based on beatPositionInLoop
  
      // Example beat pattern synchronized with the loop
      if (beatPositionInLoop === 0) {
        // First beat of the loop
        playSampleAtTime('drum', 'kick', time);
      }
      if (beatPositionInLoop === Math.floor(totalBeatsInLoop / 2)) {
        // Middle of the loop
        playSampleAtTime('drum', 'snare', time);
      }
      // Hi-hat on every beat within the loop
      playSampleAtTime('drum', 'hihat', time);
    } else {
      // Default beat scheduling when no loop is playing
      if (beatNumber % 8 === 0) {
        playSampleAtTime('drum', 'kick', time);
      }
      if (beatNumber % 8 === 4) {
        playSampleAtTime('drum', 'snare', time);
      }
      playSampleAtTime('drum', 'hihat', time);
    }
  }
  
  // Modify the scheduleLoop function
  async function scheduleLoop(category, type, time, sourceKey) {
    if (activeSources.has(sourceKey)) return; // Already scheduled
  
    const sample = getSample(category, type);
    if (!sample) return;
  
    const audioBuffer = await loadSample(sample);
    if (!audioBuffer) return;
  
    const source = audioContext.createBufferSource();
    source.buffer = audioBuffer;
  
    const gainNode = audioContext.createGain();
    gainNode.gain.value = sample.properties.volume || 1.0;
  
    source.connect(gainNode).connect(audioContext.destination);
  
    // Set playback rate
    let playbackRate = sample.properties.playbackRate || 1.0;
    const sampleBpm = sample.properties.bpm || sample.tempo || 120;
    if (currentBpm && sampleBpm) {
      playbackRate *= currentBpm / sampleBpm;
    }
    source.playbackRate.value = playbackRate;
  
    // Handle trimming
    const startOffset = sample.properties.trimStart || 0;
    const endOffset = audioBuffer.duration - (sample.properties.trimEnd || 0);
  
    // Handle looping
    source.loop = true;
    source.loopStart = startOffset;
    source.loopEnd = endOffset;
  
    // Start the source at the scheduled time
    source.start(time, startOffset);
  
    // Store the source so we can stop it later
    activeSources.set(sourceKey, source);
  
    // Store loop info
    const loopDuration = (endOffset - startOffset) / playbackRate;
    loopInfo[sourceKey] = {
      startTime: time,
      duration: loopDuration,
    };
  }
  
  // Function to play a sample at a specific time
  async function playSampleAtTime(category, type, time) {
    const sample = getSample(category, type);
    if (!sample) return;
  
    const audioBuffer = await loadSample(sample);
    if (!audioBuffer) return;
  
    const source = audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.playbackRate.value = sample.properties.playbackRate || 1.0;
  
    const gainNode = audioContext.createGain();
    gainNode.gain.value = sample.properties.volume || 1.0;
  
    source.connect(gainNode).connect(audioContext.destination);
  
    // Handle trimming
    const startOffset = sample.properties.trimStart || 0;
    const duration = audioBuffer.duration - startOffset - (sample.properties.trimEnd || 0);
  
    source.start(time, startOffset, duration);
  }
  
  // Toggle Beat Function
  function toggleBeat() {
    const button = document.getElementById('generateBeat');
    if (!isBeatPlaying) {
      // Start the beat
      isBeatPlaying = true;
      button.classList.add('active');
      startScheduler();
    } else {
      // Stop the beat
      isBeatPlaying = false;
      button.classList.remove('active');
      stopScheduler();
    }
  }
  
  // Toggle Rhythm Loop
  function toggleRhythmLoop() {
    const button = document.getElementById('playRhythmLoop');
    const sourceKey = 'rhythmLoop';
    if (!isRhythmLoopPlaying) {
      isRhythmLoopPlaying = true;
      button.classList.add('active');
      startScheduler();
    } else {
      isRhythmLoopPlaying = false;
      button.classList.remove('active');
      stopSource(sourceKey);
    }
  }
  
  // Toggle Melody Loop
  function toggleMelodyLoop() {
    const button = document.getElementById('playMelodyLoop');
    const sourceKey = 'melodyLoop';
    if (!isMelodyLoopPlaying) {
      isMelodyLoopPlaying = true;
      button.classList.add('active');
      startScheduler();
    } else {
      isMelodyLoopPlaying = false;
      button.classList.remove('active');
      stopSource(sourceKey);
    }
  }
  
  // Start the scheduler
  function startScheduler() {
    if (timerID === 0) {
      nextNoteTime = audioContext.currentTime + 0.1; // Slight delay to start
      scheduler();
    }
  }
  
  // Stop the scheduler if nothing is playing
  function stopScheduler() {
    if (!isBeatPlaying && !isRhythmLoopPlaying && !isMelodyLoopPlaying) {
      clearTimeout(timerID);
      timerID = 0;
      activeSources.forEach((source) => {
        source.stop();
      });
      activeSources.clear();
    }
  }
  
  // Stop a specific source
  function stopSource(sourceKey) {
    const source = activeSources.get(sourceKey);
    if (source) {
      source.stop();
      activeSources.delete(sourceKey);
    }
    // Clear loop info when stopping the source
    if (loopInfo[sourceKey]) {
      loopInfo[sourceKey] = null;
    }
  }