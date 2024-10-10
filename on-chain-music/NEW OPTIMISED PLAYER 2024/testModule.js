// testModule.js

const debugConfig = {
    enabled: true, // Global switch to enable/disable logging
    channels: new Set([7]), // Channels to log (use empty Set to log all)
    processes: new Set(['decompressSteps', 'deserialize', 'letterToNumber']), // Processes to log
};

const logger = {
    log: (process, message, channelNumber = null, ...args) => {
        if (!debugConfig.enabled) return;
        if (!debugConfig.processes.has(process)) return;
        if (channelNumber !== null && !debugConfig.channels.has(channelNumber)) return;
        console.log(`[${process}] ${message}`, ...args);
    },
    warn: (process, message, channelNumber = null, ...args) => {
        if (!debugConfig.enabled) return;
        if (!debugConfig.processes.has(process)) return;
        if (channelNumber !== null && !debugConfig.channels.has(channelNumber)) return;
        console.warn(`[${process}] ${message}`, ...args);
    }
};


    const fullscreenButton = document.getElementById('fullscreenButton');
    const closeButton = document.getElementById('closeButton');
    const artworkCanvas = document.getElementById('artworkCanvas');
    
    let closeButtonVisible = false;
    
    fullscreenButton.addEventListener('click', () => {
        if (document.fullscreenElement) {
            document.exitFullscreen();
        } else {
            artworkCanvas.requestFullscreen();
        }
    });
    
    document.addEventListener('fullscreenchange', () => {
        if (document.fullscreenElement) {
            artworkCanvas.style.width = '100vw';
            artworkCanvas.style.height = '100vh';
            closeButton.style.display = 'block'; // Show close button
            closeButtonVisible = true;
    
            // Fade out the close button after a few seconds
            setTimeout(() => {
                if (!closeButtonVisible) return;
                closeButton.classList.add('fade-out');
            }, 3000);
        } else {
            artworkCanvas.style.width = '66vh';
            artworkCanvas.style.height = '66vh';
            closeButton.style.display = 'none'; // Hide close button
            closeButton.classList.remove('fade-out');
            closeButtonVisible = false;
        }
    });
    
    // Show close button when mouse moves in fullscreen
    document.addEventListener('mousemove', () => {
        if (document.fullscreenElement) {
            closeButton.style.display = 'block';
            closeButton.classList.remove('fade-out');
            closeButtonVisible = true;
    
            // Reset fade-out timer
            setTimeout(() => {
                if (!closeButtonVisible) return;
                closeButton.classList.add('fade-out');
            }, 3000);
        }
    });
    
    // Close button functionality
    closeButton.addEventListener('click', () => {
        document.exitFullscreen();
    });
    
    // Handle mouse movement to keep the close button visible
    closeButton.addEventListener('mouseover', () => {
        closeButtonVisible = true;
        closeButton.style.display = 'block';
        closeButton.classList.remove('fade-out');
    });
    


    const keyMap = {
        "0": "projectName", 
        "1": "artistName", 
        "2": "projectBPM", 
        "3": "currentSequence",
        "4": "channelURLs", 
        "5": "channelVolume", 
        "6": "channelPlaybackSpeed", 
        "7": "trimSettings",
        "8": "projectChannelNames", 
        "9": "startSliderValue", 
        "10": "endSliderValue", 
        "11": "totalSampleDuration",
        "12": "start", 
        "13": "end", 
        "14": "projectSequences", 
        "15": "steps"
    };
    
    const reverseKeyMap = Object.fromEntries(
        Object.entries(keyMap).map(([k, v]) => [v, k])
    );
    
    const decompressSteps = (steps, channelNumber) => {
        logger.log('decompressSteps', 'Starting decompressSteps for channelNumber:', channelNumber, channelNumber);
        const seenIndices = new Set();
        return steps.map(step => {
            let index, reverse;
    
            if (typeof step === "number") {
                index = step;
                reverse = false;
                logger.log('decompressSteps', `Step is a number. Index: ${index}, Reverse: ${reverse}`, channelNumber);
            } else if (typeof step === "string" && step.endsWith("r")) {
                index = parseInt(step.slice(0, -1), 10);
                reverse = channelNumber !== 7; // Override for Channel 7
                logger.log('decompressSteps', `Step is a string with 'r'. Index: ${index}, Reverse: ${reverse}`, channelNumber);
            } else if (typeof step === "object") {
                if (step.r && Array.isArray(step.r)) {
                    // Existing format with 'r' property
                    index = step.r[0];
                    reverse = Boolean(step.r[1]) && channelNumber !== 7;
                    logger.log('decompressSteps', `Step is an object with 'r'. Index: ${index}, Reverse: ${reverse}`, channelNumber);
                } else if ('index' in step && 'reverse' in step) {
                    // New format with 'index' and 'reverse' properties
                    index = step.index;
                    reverse = Boolean(step.reverse) && channelNumber !== 7;
                    logger.log('decompressSteps', `Step is an object with 'index' and 'reverse'. Index: ${index}, Reverse: ${reverse}`, channelNumber);
                } else {
                    logger.warn('decompressSteps', 'Unknown object step format:', channelNumber, step);
                    return null;
                }
            } else {
                logger.warn("[decompressSteps] Unknown step format:", channelNumber, step);
                return null;
            }
    
            if (seenIndices.has(index)) {
                logger.warn('decompressSteps', `Duplicate step index ${index} detected. Ignoring duplicate.`, channelNumber);
                return null;
            }
            seenIndices.add(index);
    
            logger.log('decompressSteps', `Processed step: { index: ${index}, reverse: ${reverse} }`, channelNumber);
            return { index, reverse };
        }).filter(Boolean);
    };
    
    
    const letterToNumber = (() => {
        const map = Object.fromEntries(
            [...Array(16)].map((_, i) => [String.fromCharCode(97 + i), i])
        );
        return (letter) => {
            const number = map[letter.toLowerCase()];
            if (number === undefined) {
                logger.warn('letterToNumber', `Unknown letter for channel number conversion: ${letter}`);
                return null;
            }
            logger.log('letterToNumber', `Converted letter '${letter}' to channel number: ${number}`);
            return number;
        };
    })();
    
    const deserialize = (data) => {
        logger.log('deserialize', 'Starting deserialization process.');
        return Object.fromEntries(
            Object.entries(data).map(([key, value]) => {
                const mappedKey = keyMap[key] || key;
                logger.log('deserialize', `Mapping key: ${key} to ${mappedKey}`);
                if (mappedKey === "projectSequences") {
                    logger.log('deserialize', 'Deserializing projectSequences');
                    return [
                        mappedKey, 
                        Object.fromEntries(
                            Object.entries(value).map(([seqKey, seqValue]) => {
                                const sequenceId = `Sequence${seqKey.replace(/^s/, "")}`;
                                logger.log('deserialize', `Deserializing ${sequenceId}`);
                                const channels = Object.fromEntries(
                                    Object.entries(seqValue).map(([chanKey, chanData]) => {
                                        let channelNumber = parseInt(chanKey.replace(/^ch/, ""), 10);
                                        if (isNaN(channelNumber)) {
                                            channelNumber = letterToNumber(chanKey);
                                        }
                                        if (channelNumber !== null) {
                                            const stepsKey = reverseKeyMap.steps;
                                            const stepsData = chanData[stepsKey] || [];
                                            
                                            // Log raw steps data
                                            logger.log('deserialize', `Raw stepsData for ${sequenceId}, Channel ${channelNumber}:`, channelNumber, stepsData);
                                            
                                            // Decompress steps
                                            const decompressedSteps = decompressSteps(stepsData, channelNumber);
                                            
                                            // Log decompressed steps
                                            logger.log('deserialize', `Decompressed steps for ${sequenceId}, Channel ${channelNumber}:`, channelNumber, decompressedSteps);
                                            
                                            decompressedSteps.forEach(step => {
                                                if (step.reverse) {
                                                    logger.log('deserialize', `Reverse step found in ${sequenceId}, Channel ${channelNumber}:`, channelNumber, step);
                                                } else {
                                                    logger.log('deserialize', `Step found in ${sequenceId}, Channel ${channelNumber}:`, channelNumber, step);
                                                }
                                            });
                                            return [
                                                `Channel ${channelNumber}`, 
                                                { steps: decompressedSteps }
                                            ];
                                        } else {
                                            logger.warn('deserialize', `Invalid channel key: ${chanKey} in ${sequenceId}`, null, chanKey);
                                            return null;
                                        }
                                    }).filter(Boolean)
                                );
                                return [sequenceId, channels];
                            })
                        )
                    ];
                }
                return [mappedKey, value];
            })
        );
    };
    
    
    

    // Main AudioPlayer class
    class AudioPlayer {
        constructor() {
            this.initializeProperties();
            this.uiHandler = new UIHandler(this);
            this.artworkManager = new ArtworkManager(this.uiHandler); // Pass the entire UIHandler instance
            this.uiHandler.setArtworkManager(this.artworkManager);
            this.audioLoader = new AudioLoader(this);
    
            this.audioProcessor = new AudioProcessor(this.audioCtx);
            this.playbackScheduler = new PlaybackScheduler(this.audioCtx, this.audioProcessor, this.onSongEnd.bind(this)); // Pass callback
            this.uiHandler.initEventListeners(); // Initialize UI event listeners
    
            // Add interval tracking for the skip buttons
            this.skipInterval = null;
        }
    
        initializeProperties() {
            this.projectNames = [];
            this.songLoadCounter = 0;
            this.totalSongs = SONGS.length;
            this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            this.isPlaying = false;
            this.currentSequence = 0;
            this.startTime = 0;
            this.pendingTimeouts = [];
            this.currentSongIndex = 0;
            this.skipSpeed = 10; // Define 10x skip speed
        }
    
        reset() {
            this.stop();
            this.audioProcessor.reset();
            this.playbackScheduler.reset();
            this.pendingTimeouts.forEach(clearTimeout);
            this.pendingTimeouts = [];
            this.processedData = {};
            this.currentSequence = this.startTime = 0;
            this.toggleButtons(true);
            this.artworkManager.clearArtwork();
        }
    
        async play() {
            if (this.audioCtx.state === 'suspended') {
                await this.audioCtx.resume();
                console.log('AudioContext resumed');
            }
            if (this.isPlaying) return;
            this.isPlaying = true;
            this.startTime = this.audioCtx.currentTime;
            console.log(`Playback started at ${this.startTime.toFixed(3)} seconds`, "isPlaying:", this.isPlaying);
            this.playbackScheduler.scheduleSequences(this.processedData, this.startTime, this.isPlaying, this.pendingTimeouts);
        }
    
        stop() {
            if (!this.isPlaying) return;
            this.playbackScheduler.stop();
            this.isPlaying = false;
            console.log("Stopped song.", "isPlaying:", this.isPlaying);
            this.pendingTimeouts.forEach(clearTimeout);
            this.pendingTimeouts = [];
        }
    
        skipSong(direction) {
            // Clear any existing song end timeout to prevent multiple triggers
            if (this.playbackScheduler.songEndTimeout) {
                clearTimeout(this.playbackScheduler.songEndTimeout);
                this.playbackScheduler.songEndTimeout = null;
            }
    
            this.currentSongIndex = (direction === 'forward') 
                ? (this.currentSongIndex + 1) % SONGS.length 
                : (this.currentSongIndex - 1 + SONGS.length) % SONGS.length;
            this.audioLoader.loadSong(SONGS[this.currentSongIndex].songUrl, this.isPlaying);
        }
    
        // Method to fast-skip through the song while holding the button
        fastSkip(direction) {
            const audio = document.getElementById('audioPlayer');
            if (audio) {
                const skipTime = direction === 'forward' ? this.skipSpeed : -this.skipSpeed;
                const newTime = audio.currentTime + skipTime;
                // Ensure the new time is within the audio duration bounds
                audio.currentTime = Math.min(Math.max(newTime, 0), audio.duration);
                console.log(`Fast skipped ${direction} by ${this.skipSpeed} seconds. Current time: ${audio.currentTime}`);
            } else {
                console.error('Audio element not found for fast skipping.');
            }
        }
    
        toggleButtons(disabled) {
            this.uiHandler.toggleButtons(disabled);
        }
    
        /**
         * Callback method to handle the end of a song.
         */
        onSongEnd() {
            console.log("Song has ended. Skipping to the next song.");
            this.skipSong('forward');
        }
    }


    class UIHandler {
        constructor(audioPlayer) {
            this.audioPlayer = audioPlayer;
            this.bindUIElements();
            this.artworkManager = null; // Initialize ArtworkManager reference
            this.isFastSkipping = false; // Flag to track fast skipping
            this.seekSliderMaxValue = 100; // Maximum value for the seek slider
        }
    
        // Setter method to link ArtworkManager
        setArtworkManager(artworkManager) {
            this.artworkManager = artworkManager;
        }
    
        bindUIElements() {
            ['loadButton', 'playButton', 'stopButton', 'skipForwardButton', 'skipBackButton', 'loadingIndicator', 'errorMessage', 'songTitle', 'artistName', 'artworkCanvas', 'seekSlider']
                .forEach(id => this[id] = document.getElementById(id));
        }
    
        initEventListeners() {
            this.loadButton.addEventListener('click', () => this.loadButtonHandler());
            this.playButton.addEventListener('click', () => this.audioPlayer.play());
            this.stopButton.addEventListener('click', () => this.audioPlayer.stop());
    
            // **Toggle Playback on artworkCanvas Click**
            this.artworkCanvas.addEventListener('click', () => {
                if (this.audioPlayer.isPlaying) {
                    this.audioPlayer.stop();
                } else {
                    this.audioPlayer.play();
                }
            });
    
            // Add event listener for the seek slider
            this.seekSlider.addEventListener('input', () => {
                const audio = document.getElementById('audioPlayer');
                if (audio && !audio.seeking) {
                    const seekTime = (this.seekSlider.value / this.seekSliderMaxValue) * audio.duration;
                    audio.currentTime = seekTime;
                    console.log(`Seeked to ${seekTime} seconds`);
                }
            });
    
            // Skip Forward Button
            this.skipForwardButton.addEventListener('click', (e) => {
                if (!this.isFastSkipping) {
                    this.audioPlayer.skipSong('forward');
                }
            });
            this.skipForwardButton.addEventListener('mousedown', () => {
                this.isFastSkipping = true;
                this.startFastSkip('forward');
            });
            this.skipForwardButton.addEventListener('mouseup', () => {
                this.stopFastSkip();
                this.isFastSkipping = false;
            });
            this.skipForwardButton.addEventListener('mouseleave', () => {
                this.stopFastSkip();
                this.isFastSkipping = false;
            });
    
            // Skip Back Button
            this.skipBackButton.addEventListener('click', (e) => {
                if (!this.isFastSkipping) {
                    this.audioPlayer.skipSong('back');
                }
            });
            this.skipBackButton.addEventListener('mousedown', () => {
                this.isFastSkipping = true;
                this.startFastSkip('back');
            });
            this.skipBackButton.addEventListener('mouseup', () => {
                this.stopFastSkip();
                this.isFastSkipping = false;
            });
            this.skipBackButton.addEventListener('mouseleave', () => {
                this.stopFastSkip();
                this.isFastSkipping = false;
            });
        }
        
        updateSeekSlider(currentTime, duration) {
            const progress = (currentTime / duration) * this.seekSliderMaxValue;
            this.seekSlider.value = progress;
        }
    
        enableSeekSlider() {
            this.seekSlider.disabled = false;
        }
    
        disableSeekSlider() {
            this.seekSlider.disabled = true;
        }
    
        startFastSkip(direction) {
            // Start fast skip with an interval
            this.audioPlayer.skipInterval = setInterval(() => {
                this.audioPlayer.fastSkip(direction);
            }, 100); // Fast skip interval (100 ms for 10x speed)
        }
    
        stopFastSkip() {
            // Clear the fast skip interval
            clearInterval(this.audioPlayer.skipInterval);
            this.audioPlayer.skipInterval = null;
        }
    
        loadButtonHandler() {
            // Show loading indicator
            this.showLoading(true);
    
            // Load the selected song
            const currentSongUrl = SONGS[this.audioPlayer.currentSongIndex].songUrl;
            this.audioPlayer.audioLoader.loadSong(currentSongUrl)
                .then(() => {
                    // Update song title and artist name
                    const song = SONGS[this.audioPlayer.currentSongIndex];
                    this.showSongTitle(song.projectName);
                    this.showArtistName(song.artistName);
    
                    // Update the artwork using ArtworkManager
                    if (this.artworkManager) {
                        const currentArtworkUrl = song.artworkUrl;
                        this.artworkManager.displayArtwork(currentArtworkUrl, this.audioPlayer.currentSongIndex);
                    } else {
                        console.warn("ArtworkManager is not linked to UIHandler.");
                    }
                })
                .catch(error => {
                    console.error("Error loading song:", error);
                    this.displayError("Failed to load the song.");
                })
                .finally(() => {
                    // Hide loading indicator
                    this.showLoading(false);
                });
        }
    
        showSongTitle(title) {
            this.songTitle.textContent = title;
        }
    
        showArtistName(name) {
            this.artistName.textContent = name;
        }
    
        showLoading(isLoading) {
            this.loadingIndicator.style.display = isLoading ? 'block' : 'none';
        }
    
        displayError(message) {
            this.errorMessage.textContent = message;
            this.errorMessage.style.display = 'block';
        }
    
        toggleButtons(disabled) {
            [this.playButton, this.stopButton, this.skipForwardButton, this.skipBackButton].forEach(btn => btn.disabled = disabled);
        }
    }


// ArtworkManager class
class ArtworkManager {
    constructor(uiHandler) {
        this.artworkCanvas = uiHandler.artworkCanvas;
    }

    async displayArtwork(url, songIndex) {
        this.artworkCanvas.innerHTML = ''; // Clear the artwork canvas
        try {
            const res = await fetch(url, { method: 'HEAD' });
            if (!res.ok) throw new Error(`Failed to fetch artwork: ${res.status}`);
            const contentType = res.headers.get('Content-Type');
            const mediaElement = this.createMediaElement(contentType, url, songIndex); // Pass the currentSongIndex for alt text
            this.artworkCanvas.appendChild(mediaElement);
        } catch (error) {
            console.error(`Error displaying artwork:`, error);
            this.artworkCanvas.appendChild(this.createErrorElement('Failed to load artwork.'));
        }
    }

    createMediaElement(contentType, url, songIndex) {
        const elements = {
            image: () => {
                const img = Object.assign(document.createElement('img'), {
                    src: url,
                    alt: `Artwork for song ${songIndex + 1}`, // Use the current song index for alt text
                    onload: () => this.fitMediaElement(this.artworkCanvas, img) // Fit the image within the canvas
                });
                return img;
            },
            video: () => Object.assign(document.createElement('video'), { src: url, controls: true }),
            audio: () => Object.assign(document.createElement('audio'), { src: url, controls: true }),
            html: () => Object.assign(document.createElement('iframe'), { src: url, width: '100%', height: '100%', frameBorder: 0 })
        };

        const type = contentType.split('/')[0]; // Get the type (image, video, audio, etc.)
        return elements[type] ? elements[type]() : this.createErrorElement('Unsupported artwork format.');
    }

    fitMediaElement(container, element) {
        if (!element || !element.naturalWidth || !element.naturalHeight) {
            console.error('Element is undefined or does not have natural dimensions.');
            return;
        }

        const { clientWidth: w, clientHeight: h } = container;
        const imgAspect = element.naturalWidth / element.naturalHeight;
        const canvasAspect = w / h;

        element.style.width = imgAspect > canvasAspect ? '100%' : 'auto';
        element.style.height = imgAspect > canvasAspect ? 'auto' : '100%';
    }

    createErrorElement(message) {
        return Object.assign(document.createElement('div'), { className: 'unsupported', textContent: message });
    }

    clearArtwork() {
        this.artworkCanvas.innerHTML = '';
    }
}


    // AudioLoader class
    class AudioLoader {
        constructor(audioPlayer) {
            this.audioPlayer = audioPlayer;
        }

        async loadSong(url, autoPlay = false) {
            this.audioPlayer.reset();
            try {
                this.audioPlayer.uiHandler.showLoading(true);
                console.log(`Loading song from URL: ${url}`);
                await this.loadGzipSongFile(url);
                this.audioPlayer.toggleButtons(false);

                // Get the current song from the SONGS array
                const song = SONGS[this.audioPlayer.currentSongIndex];
                if (song) {
                    // Calculate total number of sequences
                    const totalSequences = Object.keys(this.audioPlayer.processedData.projectSequences).length;

                    // Calculate playback time
                    const bpm = this.audioPlayer.processedData.projectBPM;
                    const globalSpeed = this.audioPlayer.processedData.globalPlaybackSpeed;
                    const stepDuration = 60 / bpm / 4; // As defined in PlaybackScheduler
                    const stepsPerSequence = 64; // Assuming this is constant based on PlaybackScheduler
                    const playbackTimeSeconds = totalSequences * stepsPerSequence * stepDuration / globalSpeed;

                    // Log song details with additional information
                    const formatTime = (seconds) => {
                        const minutes = Math.floor(seconds / 60);
                        const secs = (seconds % 60).toFixed(0);
                        return `${minutes}.${secs} mins`;
                    };

                    console.log(`Loaded Song Details:
                        - Index: ${this.audioPlayer.currentSongIndex}
                        - Project Name: ${song.projectName || "Unknown Title"}
                        - Artist Name: ${song.artistName || "Unknown Artist"}
                        - BPM: ${bpm || "N/A"}
                        - Channels: ${Object.keys(this.audioPlayer.processedData.channelURLs).length}
                        - Total Sequences: ${totalSequences}
                        - Playback Time: ${formatTime(playbackTimeSeconds)}`);


                    // Update the UI with the song's project name and artist name
                    this.audioPlayer.uiHandler.showSongTitle(song.projectName || "Unknown Title");
                    this.audioPlayer.uiHandler.showArtistName(song.artistName || "Unknown Artist");

                    // Display the artwork if available
                    if (song.artworkUrl) {
                        console.log(`Displaying artwork from URL: ${song.artworkUrl}`);
                        await this.audioPlayer.artworkManager.displayArtwork(song.artworkUrl, this.audioPlayer.currentSongIndex);
                    } else {
                        console.warn(`No artwork URL found for song at index ${this.audioPlayer.currentSongIndex}`);
                    }
                } else {
                    this.audioPlayer.uiHandler.showSongTitle("Unknown Title");
                    this.audioPlayer.uiHandler.showArtistName("Unknown Artist");
                    console.warn(`No song found at index ${this.audioPlayer.currentSongIndex}`);
                }

                if (autoPlay) {
                    console.log("Auto-playing the song.");
                    this.audioPlayer.play();
                }
            } catch (e) {
                console.error("Error loading file:", e);
                this.audioPlayer.uiHandler.displayError("Failed to load file.");
            } finally {
                this.audioPlayer.uiHandler.showLoading(false);
                console.log("Finished loading song.");
            }
        }

        async loadGzipSongFile(url) {
            try {
                const res = await fetch(url);
                if (!res.ok) throw new Error(`Network response not ok: ${res.statusText}`);

                const compressedData = new Uint8Array(await res.arrayBuffer());
                const decompressedData = JSON.parse(new TextDecoder().decode(pako.inflate(compressedData)));
                const data = deserialize(decompressedData);

                const metadata = {
                    projectBPM: data.projectBPM,
                    currentSequence: data.currentSequence,
                    channelURLs: this.arrayToObject(data.channelURLs),
                    channelVolume: this.arrayToObject(data.channelVolume, 0, true),
                    channelPlaybackSpeed: this.arrayToObject(data.channelPlaybackSpeed, 0, true),
                    trimSettings: this.mapTrimSettings(data.trimSettings),
                    projectChannelNames: data.projectChannelNames,
                    projectSequences: data.projectSequences,
                    globalPlaybackSpeed: data.globalPlaybackSpeed || 1,
                };

                this.audioPlayer.processedData = {
                    ...metadata,
                    VOLUME_CONTROLS: metadata.channelVolume,
                    SPEED_CONTROLS: metadata.channelPlaybackSpeed,
                    songDataUrls: Object.values(metadata.channelURLs),
                };

                console.log(`Sequences loaded: ${Object.keys(this.audioPlayer.processedData.projectSequences).length}`);

                if (this.audioPlayer.processedData.songDataUrls.length === 16) {
                    console.log("Fetching and processing audio data for all channels.");
                    await this.fetchAndProcessAudioData(this.audioPlayer.processedData.songDataUrls.map(u => `https://ordinals.com${u}`));
                } else {
                    throw new Error("Invalid channel URLs or channel count.");
                }

                if (++this.audioPlayer.songLoadCounter === this.audioPlayer.totalSongs) {
                    this.logProjectNames();
                }
            } catch (error) {
                console.error(`Error loading file:`, error);
                throw error; // Re-throw to be caught in loadSong
            }
        }

        arrayToObject(arr, start = 0, parse = false) {
            return arr.reduce((obj, val, idx) => {
                obj[`Channel ${start + idx}`] = parse ? parseFloat(val) || 1 : val;
                return obj;
            }, {});
        }

        mapTrimSettings(arr) {
            return arr.reduce((obj, item, idx) => {
                obj[`Channel ${idx}`] = typeof item === 'object' && item
                    ? { start: item[9] || 0, end: item[10] || 100 }
                    : { start: 0, end: typeof item === 'number' ? item : 100 };
                if (typeof item !== 'object' && typeof item !== 'number') {
                    console.warn(`Invalid trim for Channel ${idx}.`);
                }
                return obj;
            }, {});
        }

        async fetchAndProcessAudioData(urls) {
            console.log("Starting to fetch and process audio data for channels.");
            const results = await Promise.allSettled(urls.map(this.processAudioUrl.bind(this)));
            results.forEach((res, i) => {
                if (res.status === 'rejected') {
                    console.error(`Failed to load Channel ${i} (${urls[i]}):`, res.reason);
                } else {
                    console.log(`Successfully loaded Channel ${i}: ${urls[i]}`);
                }
            });
            this.audioPlayer.audioProcessor.createReversedBuffers(this.audioPlayer.processedData);
            console.log("Completed fetching and processing all audio data.");
        }

        async processAudioUrl(url, index) {
            const channelName = `Channel ${index}`;
            try {
                const res = await fetch(url);
                if (!res.ok) throw new Error(`Fetch failed: ${url}, Status: ${res.status}`);

                const audioBuffer = await this.handleResponseByType(res, res.headers.get("Content-Type"), channelName);
                if (audioBuffer) {
                    this.audioPlayer.audioProcessor.logAudioBufferDetails(audioBuffer, channelName);
                    this.audioPlayer.audioProcessor.storeAudioBuffer(audioBuffer, channelName, this.audioPlayer.processedData);
                    console.log(`Processed audio for ${channelName}.`);
                }
            } catch (error) {
                console.error(`Error processing ${channelName}:`, error);
                throw error; // Re-throw to be handled in fetchAndProcessAudioData
            }
        }

        async handleResponseByType(response, contentType, channelName) {
            if (/audio|video/.test(contentType)) {
                return this.fetchAndDecodeAudio(response, channelName);
            }
            if (/json/.test(contentType)) {
                return this.handleResponse(response, channelName, 'JSON');
            }
            if (/html/.test(contentType)) {
                return this.handleResponse(response, channelName, 'HTML');
            }
            throw new Error(`Unsupported content type for ${channelName}: ${contentType}`);
        }

        async handleResponse(response, channelName, type) {
            return this.handleAudioDataFromResponse(response, channelName, type);
        }

        async fetchAndDecodeAudio(response, channelName) {
            try {
                const arrayBuffer = await response.arrayBuffer();
                const audioBuffer = await this.audioPlayer.audioCtx.decodeAudioData(arrayBuffer);
                console.log(`Decoded audio for ${channelName}.`);
                return audioBuffer;
            } catch (error) {
                console.error(`decodeAudioData failed for ${channelName}:`, error);
                throw new Error(`Failed to decode audio for ${channelName}.`);
            }
        }

        async handleAudioDataFromResponse(response, channelName, type) {
            try {
                const data = type === 'JSON' ? await response.json() : await response.text();
                const base64Audio = type === 'JSON' ? data.audioData : this.extractBase64FromHTML(data);

                if (base64Audio) {
                    const arrayBuffer = this.base64ToArrayBuffer(base64Audio.split(",")[1]);
                    if (arrayBuffer) {
                        const audioBuffer = await this.audioPlayer.audioCtx.decodeAudioData(arrayBuffer);
                        console.log(`Decoded ${type} audio data for ${channelName}.`);
                        return audioBuffer;
                    }
                    throw new Error(`Invalid base64 data for ${channelName}.`);
                }
                throw new Error(`Invalid ${type} structure for audio data in ${channelName}.`);
            } catch (error) {
                console.error(`Error handling ${type} response for ${channelName}:`, error);
                throw error;
            }
        }

        base64ToArrayBuffer(base64) {
            try {
                const binaryString = atob(base64);
                const len = binaryString.length;
                const bytes = new Uint8Array(len);
                for (let i = 0; i < len; i++) {
                    bytes[i] = binaryString.charCodeAt(i);
                }
                console.log("Converted base64 to ArrayBuffer.");
                return bytes.buffer;
            } catch (error) {
                console.error("[base64ToArrayBuffer] Conversion error:", error);
                return null;
            }
        }

        extractBase64FromHTML(htmlContent) {
            try {
                const parser = new DOMParser();
                const doc = parser.parseFromString(htmlContent, "text/html");
                const audioSource = doc.querySelector("audio[data-audionalSampleName] source")?.getAttribute("src");
                if (/^data:audio\/(wav|mp3|mp4);base64,/.test(audioSource?.toLowerCase()) || /audio\//.test(audioSource?.toLowerCase())) {
                    console.log("Extracted base64 audio data from HTML.");
                    return audioSource;
                }
                console.error("[extractBase64FromHTML] Invalid audio source format.");
            } catch (error) {
                console.error("[extractBase64FromHTML] Parsing error:", error);
            }
            return null;
        }

        logProjectNames() {
            const projectNames = SONGS.map(song => song.projectName || "Unknown Title");
            console.log("All Project Names Loaded:", projectNames);
        }
    }


// AudioProcessor class
class AudioProcessor {
    constructor(audioCtx) {
        this.audioCtx = audioCtx;
        this.audioBuffers = [];
        this.reversedAudioBuffers = {};
        this.reversedGainNodes = {}; // Store separate gain nodes for reversed buffers
    }

    reset() {
        this.audioBuffers = [];
        this.reversedAudioBuffers = {};
    }

    parseVolumeLevel(volume) {
        return Math.max(0, Math.min(parseFloat(volume) || 1, 1));
    }

    applyTrim(buffer, startPercent, endPercent) {
        const totalSamples = buffer.length;
        const [startSample, endSample] = [startPercent, endPercent].map(p => Math.floor(totalSamples * (p / 100)));

        if (startSample >= endSample || startSample < 0 || endSample > totalSamples) {
            console.warn(`Invalid trim settings: Start = ${startPercent}%, End = ${endPercent}%. Using full buffer.`);
            return buffer;
        }

        const trimmedBuffer = this.audioCtx.createBuffer(buffer.numberOfChannels, endSample - startSample, buffer.sampleRate);
        buffer.numberOfChannels && Array.from({ length: buffer.numberOfChannels }).forEach((_, channel) => {
            trimmedBuffer.copyToChannel(buffer.getChannelData(channel).subarray(startSample, endSample), channel);
        });

        return trimmedBuffer;
    }

    storeAudioBuffer(audioBuffer, channelName, processedData) {
        const { VOLUME_CONTROLS, SPEED_CONTROLS, trimSettings } = processedData;
        const volume = this.parseVolumeLevel(VOLUME_CONTROLS[channelName]);
        const speed = SPEED_CONTROLS[channelName] || 1;
        const trim = trimSettings[channelName] || { start: 0, end: 100 };
        const trimmedBuffer = this.applyTrim(audioBuffer, trim.start, trim.end);

        const gainNode = this.audioCtx.createGain();
        gainNode.gain.value = volume;
        gainNode.connect(this.audioCtx.destination);

        this.audioBuffers.push({ buffer: trimmedBuffer, gainNode, channel: channelName, playbackSpeed: speed });
    }

    logAudioBufferDetails(audioBuffer, channelName) {
        console.log(`AudioBuffer for ${channelName}:`, {
            channels: audioBuffer.numberOfChannels,
            length: audioBuffer.length,
            sampleRate: audioBuffer.sampleRate,
            duration: audioBuffer.duration,
        });
        [...Array(audioBuffer.numberOfChannels).keys()].forEach(c =>
            console.log(`Channel ${c} data:`, audioBuffer.getChannelData(c).slice(0, 10))
        );
    }

    createReversedBuffers(processedData) {
        this.processedData = processedData;
        console.debug("Starting createReversedBuffers");

        const channelsWithReverse = this.getChannelsWithReverse();
        console.debug("Channels requiring reversal:", Array.from(channelsWithReverse));

        this.audioBuffers.forEach(({ buffer, channel }) => {
            if (channelsWithReverse.has(channel)) {
                if (!this.reversedAudioBuffers[channel]) {
                    console.debug(`Reversing buffer for channel: ${channel}`);
                    const reversedBuffer = this.reverseBuffer(buffer);
                    this.reversedAudioBuffers[channel] = reversedBuffer;

                    // Create and store a separate gain node for reversed buffer
                    const reversedGainNode = this.audioCtx.createGain();
                    reversedGainNode.gain.value = this.getVolumeForChannel(channel); // Implement this method to retrieve volume
                    reversedGainNode.connect(this.audioCtx.destination);
                    this.reversedGainNodes[channel] = reversedGainNode;
                } else {
                    console.debug(`Buffer for channel ${channel} already reversed.`);
                }
            }
        });

        console.debug("Completed createReversedBuffers");
    }

    getVolumeForChannel(channel) {
        const { VOLUME_CONTROLS } = this.processedData;
        const volume = this.parseVolumeLevel(VOLUME_CONTROLS[channel]);
        return volume;
    }

    getChannelsWithReverse() {
        const channelsWithReverse = new Set();
        const sequences = Object.values(this.processedData.projectSequences);

        sequences.forEach((sequence, seqIndex) => {
            console.debug(`Processing sequence ${seqIndex + 1}/${sequences.length}`);
            Object.entries(sequence).forEach(([channelName, channelData]) => {
                channelData.steps.forEach(({ reverse }, stepIndex) => {
                    if (reverse) {
                        channelsWithReverse.add(channelName);
                        console.debug(`  Step ${stepIndex + 1}: Reverse flag set for channel '${channelName}'`);
                    }
                });
            });
        });

        return channelsWithReverse;
    }

    reverseBuffer(buffer) {
        console.debug("Starting reverseBuffer");
        const reversedBuffer = this.audioCtx.createBuffer(buffer.numberOfChannels, buffer.length, buffer.sampleRate);

        for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
            const channelData = buffer.getChannelData(channel);
            const reversedData = reversedBuffer.getChannelData(channel);
            console.debug(`  Reversing data for channel ${channel + 1}/${buffer.numberOfChannels}`);

            for (let i = 0, len = buffer.length; i < len; i++) {
                reversedData[i] = channelData[len - i - 1];
            }
        }

        console.debug("Completed reverseBuffer");
        return reversedBuffer;
    }

    concatenateFloat32Arrays(arrays) {
        const totalLength = arrays.reduce((sum, a) => sum + a.length, 0);
        const result = new Float32Array(totalLength);
        let offset = 0;
        arrays.forEach(a => { result.set(a, offset); offset += a.length; });
        return result;
    }
}

    // PlaybackScheduler class
    class PlaybackScheduler {
        constructor(audioCtx, audioProcessor, onSongEndCallback) { // Added onSongEndCallback parameter
            this.audioCtx = audioCtx;
            this.audioProcessor = audioProcessor;
            this.currentSourceNodes = [];
            this.onSongEndCallback = onSongEndCallback; // Store the callback
            this.songEndTimeout = null; // To track the timeout
        }
    
        scheduleSequences(processedData, startTime, isPlaying, pendingTimeouts) {
            console.debug("Scheduling sequences...");
            const { projectSequences, projectBPM, globalPlaybackSpeed } = processedData;
            const stepDuration = 60 / projectBPM / 4;
            const getStepsPerSequence = () => 64;
            let latestEndTime = startTime;
        
            const log = Object.entries(projectSequences).map(([id], i) => {
                const sequence = projectSequences[id];
                if (!sequence) {
                    console.error(`No data for ${id}.`);
                    return null;
                }
                const sequenceStartTime = startTime + (i * getStepsPerSequence() * stepDuration) / globalPlaybackSpeed;
                console.debug(`Scheduled ${id} at ${sequenceStartTime.toFixed(3)}s`);
                Object.entries(sequence).forEach(([channel, { steps }]) => {
                    const buf = this.audioProcessor.audioBuffers.find(b => b.channel === channel);
                    if (!buf) {
                        console.warn(`No buffer for ${channel}.`);
                        return;
                    }
                    steps.forEach(({ index, reverse }) => {
                        // Adjust 'when' calculation to ensure it's not in the past
                        const when = sequenceStartTime + ((index + 1) * stepDuration) / globalPlaybackSpeed; // Assuming 'index' is zero-based
                        if (when < this.audioCtx.currentTime) {
                            console.warn(`Step scheduled in the past: ${when.toFixed(3)}s. Skipping.`);
                            return;
                        }
                        const source = this.audioCtx.createBufferSource();
                        source.buffer = reverse ? this.audioProcessor.reversedAudioBuffers[channel] || buf.buffer : buf.buffer;
                        source.playbackRate.value = buf.playbackSpeed * globalPlaybackSpeed;
                        source.connect(buf.gainNode);
                        
                        // Add cleanup after playback
                        source.onended = () => {
                            const idx = this.currentSourceNodes.indexOf(source);
                            if (idx > -1) this.currentSourceNodes.splice(idx, 1);
                        };
        
                        source.start(when);
                        this.currentSourceNodes.push(source);
                        // console.log(`Scheduled BufferSource for ${channel} at ${when.toFixed(3)}s`);
        
                        // Update latestEndTime if this source ends later
                        const duration = source.buffer.duration / source.playbackRate.value;
                        const endTime = when + duration;
                        if (endTime > latestEndTime) {
                            latestEndTime = endTime;
                        }
                    });
                });
                const delay = Math.max((sequenceStartTime - this.audioCtx.currentTime) * 1000, 0);
                if (delay < Number.MAX_SAFE_INTEGER) {
                    const tid = setTimeout(() => {
                        if (isPlaying) console.log(`Now playing ${id}`);
                        const index = pendingTimeouts.indexOf(tid);
                        if (index > -1) pendingTimeouts.splice(index, 1);
                    }, delay);
                    pendingTimeouts.push(tid);
                } else {
                    console.warn(`Delay for ${id} too long. Skipping log.`);
                }
                return { id, startTime: sequenceStartTime.toFixed(3) };
            }).filter(Boolean);
            console.log('Scheduled Sequences:', log);
        
            // Calculate the total duration of the song
            const totalDuration = latestEndTime - startTime;
        
            // Clear any existing song end timeout
            if (this.songEndTimeout) {
                clearTimeout(this.songEndTimeout);
            }
        
            // Set a timeout to trigger the onSongEndCallback
            this.songEndTimeout = setTimeout(() => {
                console.log("Song ended. Triggering onSongEndCallback.");
                this.onSongEndCallback();
            }, totalDuration * 1000); // Convert to milliseconds
        }
    
        stop() {
            this.currentSourceNodes.forEach(s => s.stop());
            this.currentSourceNodes = [];
            if (this.songEndTimeout) {
                clearTimeout(this.songEndTimeout);
                this.songEndTimeout = null;
            }
        }
    
        reset() {
            this.stop();
            // Any additional reset logic can be added here if needed
        }
    }

// Initialize the AudioPlayer instance
new AudioPlayer();


