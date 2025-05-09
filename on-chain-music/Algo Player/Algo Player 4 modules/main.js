// main.js

    
    (function() {
        function init() {
            setupStylesAndCanvas();
    
            const songDataUrls = [
                "/content/5527d0cc95ce5ce6eedf4e275234da8b1fe087512d0db618b6de1aaad437c96bi0", 
                 "/content/b22f1c85371b58a9cdac19b2baa50b1f9025a28d44cdfaad539d0527aa7d894ei0", 
                "/content/8aec0a99a5617b9da98a5b63a11a5143f0cac3cfa662d9515c2285de03ef95d4i0",
            //     "/content/4653bcc45671abdbc024b03ebbaaadb30e0cad83b80898894ab22426bbccdaaei0",
            //    "/content/5527d0cc95ce5ce6eedf4e275234da8b1fe087512d0db618b6de1aaad437c96bi0",
            //    "/content/b184cb80ef5f0d3e6d0ee1065a0419be8156a5b36dd443f214cf2ddf6dcda92ai0", 
            //   "/content/3359ce42359274ddbd2184d9f75a38b7e59b1d5f24512959e29c377fc8ca604ai0",
              "/content/6d288c0c82653001bb32497889dd1486e8afec9b0671a95fa9e10f99c20737bbi0",
               "/content/07ff7bdc47e5272a3ff55cc46d2b189d510562a057a2c24112f3d0376950484di0", 
              "/content/119a3ccd1dfd7e987cca139f86d16717d845a22dd6afc59ad492527b95ae9a91i0",
              
              
              
            ];
    
            if (songDataUrls) {
                processSerializedData(songDataUrls);
            }
        }
    
        window.init = init;
        window.addEventListener('load', init);
    })();
    



        {/* <!-- First Module Explanation
This script section is responsible for several critical functionalities within the application:

1. **Hash Generation and Seed Initialization**:
   - The script defines a function `hashString` which processes a string input to generate a numeric hash. 
   - This function includes rotating the characters in the string based on a numerical part extracted from the string itself, and then computing a hash value. 
   - The generated hash is intended for creating a "seed" value, though in this case, the `window.seed` is manually set to 937, overriding the generated seed value.

2. **Playback Event Management**:
   - The script listens for custom events `playbackStarted` and `playbackStopped`.
   - When playback starts, the script captures the current time and sets a flag (`window.playbackStarted`) to true, ensuring that the application tracks the playback state.
   - Similarly, when playback stops, the state is updated to reflect that playback has ended.
   - These event handlers may be used to synchronize UI components or other logic in response to media or other forms of playback.

3. **Title Mutation Observer**:
   - The script ensures that the webpage title remains consistent by using a `MutationObserver` to monitor any changes to the document title.
   - If the title is changed to anything other than "? ? ?", the observer resets it back to "? ? ?". This is likely used to enforce a branding or messaging consistency.

4. **Global State Management**:
   - Several global variables are set and managed within the script, such as `window.playbackStarted`, which tracks whether playback is active, and `window.psTime`, which stores the timestamp when playback begins.
   - This helps the application maintain important state information across different parts of the program.

5. **Onload Behavior**:
   - When the window finishes loading, the script sets the document's title to "? ? ?" and calls a function `displayPlayText()`, which likely updates or displays content related to the playback feature of the application.

In summary, this script manages global playback state, enforces title consistency, and provides a hashing function to generate seed values that can be used throughout the program. It also ensures a specific behavior is triggered when playback events occur.
--> */}


        (function() {
            function hashString(str) {
                let rotationCount = parseInt(str.split("i")[1]);
                let characters = str.split("");
                for (let i = 0; i < rotationCount; i++) {
                    let char = characters.shift();
                    characters.push(char);
                }
                str = characters.join("");
                let hash = 0;
                for (let i = 0; i < str.length; i++) {
                    hash = (31 * hash + str.charCodeAt(i)) % Number.MAX_SAFE_INTEGER;
                }
                return hash % 1400000000;
            }

            // Ensure we use the global seed value
            const seedValue = hashString("4482324585393f1523e8c28a02605c0b1c95d2779510921da0f131a5e6da5843i0");
            window.seed = window.seed || seedValue;
            console.log("Using seed:", window.seed);

            function seededRandom(seed) {
                const x = Math.sin(seed) * 10000;
                return x - Math.floor(x);
            }

            function setPlaybackStatus(status) {
                window.playbackStarted = status;
            }

            function initializePlayback() {
                if (window.playbackStarted === undefined) {
                    window.playbackStarted = false;
                }

                document.addEventListener("playbackStarted", () => {
                    window.psTime = Date.now();
                    setPlaybackStatus(true);
                    displayText();  // Assuming displayText is another globally available function
                });

                document.addEventListener("playbackStopped", () => {
                    setPlaybackStatus(false);
                });
            }

            function enforceDocumentTitle() {
                document.title = "? ? ?";
                const titleObserver = new MutationObserver(() => {
                    if (document.title !== "? ? ?") {
                        document.title = "? ? ?";
                    }
                });
                titleObserver.observe(document.querySelector("title"), { childList: true, subtree: true });
            }

            window.onload = function() {
                enforceDocumentTitle();
                displayPlayText();  // Assuming displayPlayText is another globally available function
            };

            // Expose functions globally
            window.hashString = hashString;
            window.seededRandom = seededRandom;  // Make seededRandom globally available
            window.setPlaybackStatus = setPlaybackStatus;
            window.initializePlayback = initializePlayback;
            window.enforceDocumentTitle = enforceDocumentTitle;

            // Initialize the playback settings
            initializePlayback();

        })();





            (function() {
                function setupStylesAndCanvas() {
                    const styleElement = document.createElement("style");
                    styleElement.textContent = `
                        canvas {
                            position: absolute;
                        }
                        body {
                            display: flex;
                            justify-content: center;
                            align-items: center;
                            height: 100vh;
                            margin: 0;
                            background-color: black;
                            position: relative;
                        }
                        #canvas-container {
                            display: flex;
                            justify-content: center;
                            align-items: center;
                            width: 100%;
                            height: 100%;
                            position: relative;
                        }
                        #cv, body {
                            background: #000;
                            display: flex;
                            justify-content: center;
                            align-items: center;
                            height: 100vh;
                        }
                        #title-display-container {
                            position: fixed;
                            top: 50%;
                            left: 50%;
                            transform: translate(-50%, -50%);
                            text-align: center;
                            z-index: 9999;
                            pointer-events: none;
                        }
                        #project-name-display, 
                        #by-display, 
                        #artist-name-display, 
                        #visual-artist-display, 
                        #visual-artist-name-display {
                            opacity: 0;
                            font-weight: bold;
                            position: absolute;
                            text-align: center;
                            left: 50%;
                            transform: translate(-50%, -50%);
                            width: auto;
                            white-space: nowrap;
                            margin: 0;
                            padding: 0;
                            line-height: normal;
                            font-size: 50px;
                        }
                    `;
                    document.head.appendChild(styleElement);
                
                    const canvasContainer = document.createElement("div");
                    canvasContainer.id = "canvas-container";
                    const canvas = document.createElement("canvas");
                    canvasContainer.appendChild(canvas);
                    document.body.appendChild(canvasContainer);
                }
            
                window.setupStylesAndCanvas = setupStylesAndCanvas;
            })();

    (function() {
    const keyMap = {
        0: "projectName", 1: "artistName", 2: "projectBPM", 3: "currentSequence", 
        4: "channelURLs", 5: "channelVolume", 6: "channelPlaybackSpeed", 
        7: "trimSettings", 8: "projectChannelNames", 9: "startSliderValue", 
        10: "endSliderValue", 11: "totalSampleDuration", 12: "start", 
        13: "end", 14: "projectSequences", 15: "steps"
    };

    const reverseKeyMap = Object.fromEntries(Object.entries(keyMap).map(([e, r]) => [r, +e]));
    const channelMap = Array.from({length: 26}, (e, r) => String.fromCharCode(65 + r));
    const reverseChannelMap = Object.fromEntries(channelMap.map((e, r) => [e, r]));

    function decompressSteps(e) {
        return e.flatMap(e => {
            if (typeof e === "number") return e;
            if (typeof e === "object" && "r" in e) {
                const [r, t] = e.r;
                return Array.from({length: t - r + 1}, (e, t) => r + t);
            }
            return typeof e === "string" && e.endsWith("r") ? {index: parseInt(e.slice(0, -1), 10), reverse: !0} : void 0;
        });
    }

    function deserialize(e) {
        const r = e => Array.isArray(e) ? e.map(e => typeof e === "object" ? r(e) : e) : typeof e === "object" && e !== null ? Object.entries(e).reduce((e, [t, n]) => {
            const a = keyMap[t] ?? t;
            return e[a] = a === "projectSequences" ? Object.entries(n).reduce((e, [r, t]) => (e[r.replace("s", "Sequence")] = Object.entries(t).reduce((e, [r, t]) => {
                var n;
                return e[`ch${reverseChannelMap[r]}`] = {steps: (n = t[reverseKeyMap.steps] || [], n.flatMap(e => {
                    if (typeof e === "number") return e;
                    if (typeof e === "object" && "r" in e) {
                        const [r, t] = e.r;
                        return Array.from({length: t - r + 1}, (e, t) => r + t);
                    }
                    return typeof e === "string" && e.endsWith("r") ? {index: parseInt(e.slice(0, -1), 10), reverse: !0} : void 0;
                }))}, e;
            }, {}), e), {}) : r(n), e;
        }, {}) : e;
        return r(e);
    }

    async function loadPako() {
        try {
            const t = await fetch("/content/2109694f44c973892fb8152cf5c68607fb19288c045af1abc1716c1c3b4d69e6i0"),
                o = await t.text(),
                e = document.createElement("div");
            e.innerHTML = o;
            const n = e.querySelectorAll("script"),
                c = Array.from(n).find(t => t.textContent.includes("pako"));
            if (!c) throw new Error("Pako library not found in the HTML content.");
            const r = document.createElement("script");
            r.textContent = c.textContent,
            document.head.appendChild(r),
            console.log("Pako library loaded:", pako);
        } catch (t) {
            console.error("Error loading Pako:", t);
        }
    }

    window.decompressSteps = decompressSteps;
    window.deserialize = deserialize;
    window.loadPako = loadPako;
})();


        (function() {
            async function fetchAndDeserialize(url) {
                const response = await fetch(url);
                if (!response.ok) throw new Error("Network response was not ok");
                const arrayBuffer = await response.arrayBuffer(),
                    inflated = pako.inflate(new Uint8Array(arrayBuffer)),
                    text = new TextDecoder("utf-8").decode(inflated),
                    jsonData = JSON.parse(text);
                return deserialize(jsonData);
            }
            
            function seededRandom(seed) {
                const x = Math.sin(seed) * 10000;
                return x - Math.floor(x);
            }
        
            function shuffleArray(array) {
                let currentSeed = window.seed;  // Use the global seed
                for (let i = array.length - 1; i > 0; i--) {
                    const j = Math.floor(window.seededRandom(currentSeed) * (i + 1));
                    [array[i], array[j]] = [array[j], array[i]];
                    currentSeed += 1;  // Increment the seed for the next iteration
                }
                return array;
            }
        
            const availableBPMs = [80, 100, 120, 140, 160, 180, 240];
        
            function selectBPM(availableBPMs, seed) {
                const seededIndex = Math.floor(seededRandom(seed) * availableBPMs.length);
                return availableBPMs[seededIndex];
            }
        
            async function processSerializedData(urls) {
                try {
                    await loadPako();

                    // Fetch and deserialize data from all provided song URLs
                    const data = await Promise.all(urls.map(async (url, index) => {
                        try {
                            const result = await fetchAndDeserialize(url);
                            if (!result || !result.projectSequences) throw new Error(`Invalid data at URL ${url}`);
                            return result;
                        } catch (error) {
                            console.error(`Error processing URL at index ${index}:`, error);
                            return undefined;  // Explicitly return undefined if there is an error
                        }
                    }));

                    // Filter out any undefined data entries before processing
                    const validData = data.filter(dataset => dataset !== undefined);

                    if (validData.length < data.length) {
                        console.warn(`Some datasets were invalid and have been skipped.`);
                    }

                    const baseBPM = selectBPM(availableBPMs, window.seed);
                    console.log(`Selected base BPM: ${baseBPM}`);

                    const useHarmonicAdjustment = false;

                    // Adjust playback speed based on BPM
                    validData.forEach((dataset) => {
                        const currentBPM = dataset.projectBPM;
                        const bpmRatio = baseBPM / currentBPM;

                        dataset.channelPlaybackSpeed = dataset.channelPlaybackSpeed.map(speed => {
                            return useHarmonicAdjustment && Math.abs(baseBPM - currentBPM) >= baseBPM / 2
                                ? speed
                                : speed * bpmRatio;
                        });
                    });

                    // Flatten all channels from all valid songs into a single array
                    const allChannels = [];
                    validData.forEach((dataset, datasetIndex) => {
                        for (let index = 0; index < dataset.channelURLs.length; index++) {
                            allChannels.push({
                                url: dataset.channelURLs[index],
                                volume: dataset.channelVolume[index],
                                speed: dataset.channelPlaybackSpeed[index],
                                trim: dataset.trimSettings[index],
                                source: `data${datasetIndex + 1}`,
                                index
                            });
                        }
                    });

                    // Shuffle and select 16 channels from the total pool
                    const shuffledChannels = shuffleArray(allChannels, window.seed);
                    const selectedChannels = shuffledChannels.slice(0, 24);  // Still selecting only 16 channels

                    const combinedData = {
                        ...validData[0],  // Use the first valid dataset as a base
                        projectBPM: baseBPM,
                        channelURLs: selectedChannels.map(ch => ch.url),
                        channelVolume: selectedChannels.map(ch => ch.volume),
                        channelPlaybackSpeed: selectedChannels.map(ch => ch.speed),
                        trimSettings: selectedChannels.map(ch => ch.trim),
                        projectSequences: {}
                    };

                    // Combine sequences from all valid datasets, ensuring `projectSequences` exists
                    const projectSequencesSources = validData.reduce((acc, dataset, i) => {
                        acc[`data${i + 1}`] = dataset;
                        return acc;
                    }, {});

                    // Log valid data to verify structure
                    console.log("Processing datasets: ", projectSequencesSources);

                    for (const seq in validData[0].projectSequences) {
                        combinedData.projectSequences[seq] = {};

                        selectedChannels.forEach((ch, i) => {
                            const chKey = `ch${i}`;
                            const sourceSeq = projectSequencesSources[ch.source]?.projectSequences[seq];

                            // Check if sourceSeq and sourceSeq[`ch${ch.index}`] exist
                            if (sourceSeq && sourceSeq[`ch${ch.index}`]) {
                                combinedData.projectSequences[seq][chKey] = sourceSeq[`ch${ch.index}`];
                            } else {
                                console.warn(`Missing sequence data for channel ${chKey} in sequence ${seq}.`);
                                // Fallback: Provide default empty steps or other fallback data
                                combinedData.projectSequences[seq][chKey] = { steps: [] };
                            }
                        });
                    }

                    console.log("Combined Data:", combinedData);

                    const blob = new Blob([JSON.stringify(combinedData)], { type: "application/json" });
                    window.jsonDataUrl = URL.createObjectURL(blob);
                    const scriptElement = document.createElement("script");
                    scriptElement.src = "/content/6e226872d6612da632fcf29824b6f52c3672a745e194032e4f91c351e47d75c9i0";
                    document.head.appendChild(scriptElement);
                } catch (e) {
                    console.error("Error processing data:", e);
                }
            }


        
            // Export functions globally
            window.fetchAndDeserialize = fetchAndDeserialize;
            window.processSerializedData = processSerializedData;
            window.seededRandom = seededRandom;
            window.shuffleArray = shuffleArray;
            window.selectBPM = selectBPM;
        })();

        
        


        (function() {
            function loadPFPScript() {
                const scriptElement = document.createElement("script");
                scriptElement.src = "/content/97c042112c29d9a9ca1da99890542befdbffaec6ff17798897c187a617a62f79i0";
                document.body.appendChild(scriptElement);
            }

            function createTextElement(text, className) {
                const element = document.createElement("div");
                element.textContent = text;
                element.classList.add("text-element", className);
                document.body.appendChild(element);
                return element;
            }

            function initialFadeIn() {
                const fadeOverlay = document.getElementById("fadeOverlay");
                setTimeout(() => {
                    fadeOverlay.style.opacity = "0";
                }, 100);
            }

            function displayText() {
                const texts = [
                    { text: "?\u2003\u2008\?\u2003\u2008\?", className: "freedom", fadeIn: 0, fadeOut: 15740 }, // \u2003 is an em space
                    { text: "?elo?honi?", className: "melophonic", fadeIn: 15740, fadeOut: 31480 },
                    { text: "?Q?Z?", className: "sqyzy", fadeIn: 31480, fadeOut: 47800 }
                ];

                texts.forEach(({ text, className, fadeIn, fadeOut }) => {
                    const textElement = createTextElement(text, className);
                    setTimeout(() => textElement.style.opacity = "1", fadeIn);
                    setTimeout(() => textElement.style.opacity = "0", fadeOut);
                });
            }

            function displayPlayText() {
                const playTextElement = document.createElement("div");
                playTextElement.textContent = "?\u2003\u2008\?\u2003\u2008\?"; // \u2003 is an em space
                playTextElement.className = "play-text";
                document.body.appendChild(playTextElement);
                setTimeout(() => {
                    playTextElement.style.opacity = "0";
                }, 100);
            }

            window.onload = function() {
                initialFadeIn();
                document.title = "?  ?  ?";
                displayPlayText();
            };

            // Expose functions globally
            window.loadPFPScript = loadPFPScript;
            window.createTextElement = createTextElement;
            window.initialFadeIn = initialFadeIn;
            window.displayText = displayText;
            window.displayPlayText = displayPlayText;

            // Load the PFP script
            loadPFPScript();
        })();



        function findSeedsForAllBPMs(availableBPMs, seedsPerBPM = 20) {
            const seedResults = {};
        
            availableBPMs.forEach(bpm => {
                seedResults[bpm] = [];
                let seed = 1;
        
                while (seedResults[bpm].length < seedsPerBPM) {
                    const generatedBPM = selectBPM(availableBPMs, seed);
                    if (generatedBPM === bpm) {
                        seedResults[bpm].push(seed);
                    }
                    seed++;
                }
            });
        
            console.log("Seeds for each BPM:");
            Object.keys(seedResults).forEach(bpm => {
                console.log(`BPM ${bpm}:`, seedResults[bpm].join(", "));
            });
        }
        
        // Example usage:
        const availableBPMs = [80, 100, 120, 140, 160, 180, 240];
        findSeedsForAllBPMs(availableBPMs, 20);

