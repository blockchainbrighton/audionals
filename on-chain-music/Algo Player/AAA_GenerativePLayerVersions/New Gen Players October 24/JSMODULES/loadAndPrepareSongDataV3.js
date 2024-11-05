(async () => {
    console.log("[Initialization] Script started.");

    const loopSampleIds = new Set([
        "7c42769c1763cc8f045aada7914e8158223e45e7a4f197b49f918b1c005d36fci0",
        "3364803cb3032ce95f4138a214c15a9b36dcb70f574a477f27615d448e1cdeb8i0",
    ]);

    const keyNames = [
        "projectName", "artistName", "projectBPM", "currentSequence",
        "channelURLs", "channelVolume", "channelPlaybackSpeed",
        "trimSettings", "projectChannelNames", "startSliderValue",
        "endSliderValue", "totalSampleDuration", "start", "end",
        "projectSequences", "steps"
    ];

    const keyMap = keyNames.reduce((map, key, idx) => (map[key] = idx, map), {});
    const channelIds = Array.from({ length: 16 }, (_, i) => String.fromCharCode(65 + i));
    const channelIdMap = channelIds.reduce((map, id, idx) => (map[id] = idx, map), {});

    const fetchAndProcessSongData = async (url) => {
        console.log(`[Initialization] Fetching data from: ${url}`);
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`Network error for ${url}`);
            const inflatedData = window.pako.inflate(new Uint8Array(await response.arrayBuffer()));
            const parsedData = JSON.parse(new TextDecoder("utf-8").decode(inflatedData));

            const recurse = (obj) => Array.isArray(obj) ? obj.map(recurse) :
                obj && typeof obj === "object" ? Object.fromEntries(
                    Object.entries(obj).map(([k, v]) => [
                        keyMap[k] !== undefined ? keyNames[keyMap[k]] : k,
                        keyNames[keyMap[k]] === "projectSequences" ?
                            Object.fromEntries(Object.entries(v).map(([s, data]) => [
                                `Sequence${s.replace(/^s/, "")}`,
                                Object.fromEntries(Object.entries(data).map(([c, d]) => [
                                    `ch${channelIdMap[c]}`,
                                    { steps: (d[keyMap.steps] || []).flatMap(step => {
                                        if (typeof step === "number") return step;
                                        if (step?.r) return Array.from({ length: step.r[1] - step.r[0] + 1 }, (_, i) => step.r[0] + i);
                                        if (typeof step === "string" && step.endsWith("r")) return { index: parseInt(step.slice(0, -1), 10), reverse: true };
                                        return [];
                                    })}
                                ]))
                            ]))
                            : recurse(v)
                    ])
                ) : obj;

            return recurse(parsedData);
        } catch (error) {
            console.error(`[Initialization] Error fetching/deserializing ${url}:`, error);
            throw error;
        }
    };

    const prepareInitialSampleOrder = (songData) => {
        const sampleOrder = [];
        Object.keys(songData.projectSequences).sort((a, b) => {
            return parseInt(a.replace('Sequence', ''), 10) - parseInt(b.replace('Sequence', ''), 10);
        }).forEach(seq => {
            Object.entries(songData.projectSequences[seq]).forEach(([ch, data]) => {
                data.steps.forEach(step => {
                    if (typeof step === "number" || (typeof step === "object" && step.index !== undefined)) {
                        const id = `${ch}_${step.reverse ? "r" : "f"}`;
                        if (!sampleOrder.some(item => `${item.channelId}_${item.reverse ? "r" : "f"}` === id)) {
                            sampleOrder.push({ channelId: ch, reverse: step.reverse || false });
                        }
                    }
                });
            });
        });
        return sampleOrder;
    };

    const setArtworkImage = (url) => {
        const img = document.getElementById("artworkImage");
        if (img) {
            img.src = url;
            img.parentElement.style.display = "flex";
            console.log("[Initialization] Artwork image set and displayed.");
        } else {
            console.warn("[Initialization] Artwork cover elements not found.");
        }
    };

    const effectsConfig = {
        pitchShift: { enabled: true, defaultProbability: 1, shifts: [0.25, 0.5, 1, 2, 4], sequenceConfig: {} },
        harmonize: { enabled: true, defaultProbability: 0.02, intervals: [1.2599, 1.4983], maxHarmonyChannels: 2, sequenceConfig: {} },
        delay: [
            { enabled: true, defaultProbability: 1, noteValue: 'sixteenth', maxDelayRepeats: 3 },
            { enabled: true, defaultProbability: 1, noteValue: 'eighth', maxDelayRepeats: 8 },
            { enabled: true, defaultProbability: 1, noteValue: 'quarter', maxDelayRepeats: 16 }
        ],
        reverse: { enabled: true, defaultProbability: 1, sequenceConfig: {} },
        volumeChange: { enabled: false, defaultProbability: 0.0, range: [0.5, 1.5], sequenceConfig: {} },
        pan: { enabled: true, defaultProbability: 1, positions: [-1, 1], sequenceConfig: {} },
        reverb: { enabled: true, defaultProbability: 1, decayTimeRange: [2, 7], mixRange: [0.3, 0.9], sequenceConfig: {} },
        filter: { enabled: true, defaultProbability: 0.7, types: ['lowpass', 'highpass', 'bandpass'], frequencyRange: [300, 8000], QRange: [1, 10], sequenceConfig: {} },
        tremolo: { enabled: true, defaultProbability: 0.6, rateRange: [4, 12], depthRange: [0.6, 1], sequenceConfig: {} },
        distortion: { enabled: true, defaultProbability: 0.5, amountRange: [1, 15], sequenceConfig: {} },
        bitcrusher: { enabled: true, defaultProbability: 0.3, bitDepthRange: [2, 6], sampleRateRange: [8000, 22050], sequenceConfig: {} },
    };

    const getEffectParams = (name, seq) => {
        const effect = effectsConfig[name];
        if (!effect || !effect.enabled) return null;
        const prob = effect.sequenceConfig?.[seq]?.probability ?? effect.defaultProbability;
        return Math.random() < prob ? { ...effect, ...effect.sequenceConfig?.[seq] } : null;
    };

    const applyEffect = {
        pitchShift: (ch, params) => {
            const shift = params.shifts[Math.floor(Math.random() * params.shifts.length)];
            const original = ch.metadata.playbackSpeed;
            ch.metadata.playbackSpeed *= shift;
            console.log(`[effectsDebug] Pitch shifted ${ch.id} from ${original.toFixed(2)}x to ${ch.metadata.playbackSpeed.toFixed(2)}x`);
        },
        harmonize: (ch, idx, song, params, ctx) => {
            if (ctx.harmonyChannelsAdded >= params.maxHarmonyChannels) return;
            params.intervals.forEach(interval => {
                if (ctx.harmonyChannelsAdded >= params.maxHarmonyChannels) return;
                const harmony = JSON.parse(JSON.stringify(ch));
                harmony.id = `${ch.id}_harmony_${idx}_${interval}`;
                harmony.metadata.playbackSpeed *= interval;
                harmony.metadata.volume = (harmony.metadata.volume || 1) * 0.8;
                song.channels.push(harmony);
                ctx.harmonyChannelsAdded++;
                console.log(`[effectsDebug] Added harmony ${harmony.id} with speed ${harmony.metadata.playbackSpeed.toFixed(2)}x (Interval: ${interval})`);
            });
        },
        delay: (ch, params, bpm) => {
            const beat = 60000 / bpm;
            const delayMap = { 'quarter': beat, 'eighth': beat / 2, 'sixteenth': beat / 4 };
            ch.metadata.delay = { time: delayMap[params.noteValue] || beat, repeats: params.maxDelayRepeats };
            console.log(`[effectsDebug] Applied delay to ${ch.id} with time ${ch.metadata.delay.time}ms and repeats ${params.maxDelayRepeats}`);
        },
        reverse: (ch) => {
            ch.metadata.requiresReversal = true;
            console.log(`[effectsDebug] Reversed ${ch.id}`);
        },
        volumeChange: (ch, params) => {
            const [min, max] = params.range;
            const factor = Math.random() * (max - min) + min;
            const original = ch.metadata.volume || 1;
            ch.metadata.volume = original * factor;
            console.log(`[effectsDebug] Volume of ${ch.id} changed from ${original.toFixed(2)} to ${ch.metadata.volume.toFixed(2)}`);
        },
        pan: (ch, params) => {
            const pos = params.positions[Math.floor(Math.random() * params.positions.length)];
            ch.metadata.pan = pos;
            console.log(`[effectsDebug] Applied pan ${pos} to ${ch.id}`);
        },
        reverb: (ch, params) => {
            const decay = Math.random() * (params.decayTimeRange[1] - params.decayTimeRange[0]) + params.decayTimeRange[0];
            const mix = Math.random() * (params.mixRange[1] - params.mixRange[0]) + params.mixRange[0];
            ch.metadata.reverb = { decayTime: decay, mix };
            console.log(`[effectsDebug] Reverb on ${ch.id}: decay ${decay.toFixed(2)}s, mix ${mix.toFixed(2)}`);
        },
        filter: (ch, params) => {
            const type = params.types[Math.floor(Math.random() * params.types.length)];
            const freq = Math.random() * (params.frequencyRange[1] - params.frequencyRange[0]) + params.frequencyRange[0];
            const Q = Math.random() * (params.QRange[1] - params.QRange[0]) + params.QRange[0];
            ch.metadata.filter = { type, frequency: freq, Q };
            console.log(`[effectsDebug] ${type} filter on ${ch.id}: ${freq.toFixed(0)}Hz, Q ${Q.toFixed(2)}`);
        },
        tremolo: (ch, params) => {
            const rate = Math.random() * (params.rateRange[1] - params.rateRange[0]) + params.rateRange[0];
            const depth = Math.random() * (params.depthRange[1] - params.depthRange[0]) + params.depthRange[0];
            ch.metadata.tremolo = { rate, depth };
            console.log(`[effectsDebug] Tremolo on ${ch.id}: rate ${rate.toFixed(2)}Hz, depth ${depth.toFixed(2)}`);
        },
        distortion: (ch, params) => {
            const amount = Math.random() * (params.amountRange[1] - params.amountRange[0]) + params.amountRange[0];
            ch.metadata.distortion = { amount };
            console.log(`[effectsDebug] Distortion on ${ch.id}: amount ${amount.toFixed(2)}`);
        },
        bitcrusher: (ch, params) => {
            const bit = Math.floor(Math.random() * (params.bitDepthRange[1] - params.bitDepthRange[0] + 1)) + params.bitDepthRange[0];
            const rate = Math.random() * (params.sampleRateRange[1] - params.sampleRateRange[0]) + params.sampleRateRange[0];
            ch.metadata.bitcrusher = { bitDepth: bit, sampleRate: rate };
            console.log(`[effectsDebug] Bitcrusher on ${ch.id}: bit ${bit}, rate ${rate.toFixed(0)}Hz`);
        }
    };

    const applyEffects = (ch, idx, song, seq, bpm, ctx) => {
        Object.keys(effectsConfig).forEach(name => {
            if (Array.isArray(effectsConfig[name])) {
                effectsConfig[name].forEach(params => {
                    if (params.enabled && Math.random() < params.defaultProbability) {
                        applyEffect[name](ch, params, bpm);
                    }
                });
            } else {
                const params = getEffectParams(name, seq);
                if (params) applyEffect[name](ch, params, bpm, idx, song, ctx);
            }
        });
        if (ctx.totalGain > ctx.maxTotalGain) {
            ch.metadata.volume = (ch.metadata.volume || 1) * (ctx.maxTotalGain / ctx.totalGain);
            console.log(`[effectsDebug] Adjusted volume of ${ch.id} to prevent overdrive.`);
        }
        ctx.totalGain += ch.metadata.volume || 1;
    };

    try {
        const validSongDataUrls = songDataUrls.filter(url => url.trim() && !url.trim().startsWith("//"));
        console.log(`[Initialization] Valid song data URLs count: ${validSongDataUrls.length}`);

        if (validSongDataUrls.length) {
            await (async () => {
                try {
                    const resp = await fetch("/content/2109694f44c973892fb8152cf5c68607fb19288c045af1abc1716c1c3b4d69e6i0");
                    const scriptText = await resp.text();
                    const script = new DOMParser().parseFromString(scriptText, "text/html").querySelector("script");
                    if (!script?.textContent.includes("pako")) throw new Error("Pako library not found.");
                    const scriptEl = document.createElement("script");
                    scriptEl.textContent = script.textContent;
                    document.head.append(scriptEl);
                    console.log("[Initialization] Pako library loaded successfully.");
                } catch (e) {
                    console.error("[Initialization] Error loading Pako:", e);
                }
            })();

            const songDataArray = (await Promise.all(validSongDataUrls.map((url, idx) =>
                fetchAndProcessSongData(url).then(data => ({ data, index: idx })).catch(e => {
                    console.error(`[Initialization] Failed ${url}:`, e);
                    return null;
                })
            ))).filter(Boolean);
            if (!songDataArray.length) throw new Error("[Initialization] No valid data.");

            const originalSongs = songDataArray.sort((a, b) => a.index - b.index).map(({ data, index }) => {
                const {
                    projectName = `Song_${index + 1}`,
                    artistName = "Unknown Artist",
                    projectBPM = 120,
                    projectSequences = {},
                    channelURLs = [],
                    channelVolume = [],
                    channelPlaybackSpeed = [],
                    trimSettings = {}
                } = data;

                const channels = channelIds.map((id, idx) => {
                    const channelSequence = Object.entries(projectSequences).reduce((acc, [seqName, seqData]) => {
                        const chData = seqData[`ch${idx}`];
                        if (chData) acc.push({ sequenceName: seqName, steps: chData.steps });
                        return acc;
                    }, []);

                    const metadata = {
                        volume: channelVolume[idx] ?? 1,
                        playbackSpeed: channelPlaybackSpeed[idx] ?? 1,
                        trimStartTime_Percentage: trimSettings[idx]?.start || 0,
                        trimEndTime_Percentage: trimSettings[idx]?.end || 100,
                        requiresReversal: channelSequence.some(seq => seq.steps.some(step => typeof step === "object" && step.reverse)),
                        channelSequence,
                        originalBPM: projectBPM,
                        isLoop: loopSampleIds.has(channelURLs[idx]),
                        ...(loopSampleIds.has(channelURLs[idx]) && { isLoop: true })
                    };

                    if (metadata.isLoop) {
                        console.log(`[effectsDebug] ID ${channelURLs[idx]} is a loop in Song ${index + 1}: ${projectName}`);
                    }

                    return { id, url: channelURLs[idx] || "URL_not_found", metadata };
                });

                const song = {
                    id: `Song ${index + 1}: ${projectName}`,
                    artist: artistName,
                    bpm: projectBPM,
                    totalSequences: Object.keys(projectSequences).length,
                    totalChannels: channels.length,
                    channels,
                    projectSequences
                };

                console.log(`[Original Song Processed] ${song.id}`);
                console.log(`Artist: ${song.artist}, BPM: ${song.bpm}, Sequences: ${song.totalSequences}, Channels: ${song.totalChannels}`);
                song.channels.forEach(ch => console.log(`  ${ch.id}: URL=${ch.url}, Metadata=`, ch.metadata));
                console.log("---------------------------------------------------");
                return song;
            });

            const allChannels = originalSongs.flatMap(song => song.channels);

            const getRandomChannels = (arr, num) => arr.sort(() => 0.5 - Math.random()).slice(0, num);

            const generateRandomMixes = (num) => {
                const mixes = [];
                const bpmOptions = [60, 120, 140, 160, 180, 240];
                for (let i = 0; i < num; i++) {
                    const bpm = bpmOptions[Math.floor(Math.random() * bpmOptions.length)];
                    const randomChs = getRandomChannels(allChannels, 28);
                    const activationPoints = [
                        { startSeq: 1, count: 16 },
                        { startSeq: 5, count: 4 },
                        { startSeq: 17, count: 4 },
                        { startSeq: 25, count: 4 }
                    ];

                    const channelsWithActivation = activationPoints.flatMap(point => 
                        randomChs.slice().splice(0, point.count).map(ch => ({ channel: JSON.parse(JSON.stringify(ch)), activationSeq: point.startSeq }))
                    );

                    const sequenceSet = new Set();
                    channelsWithActivation.forEach(({ channel }) => channel.metadata.channelSequence?.forEach(seq => sequenceSet.add(seq.sequenceName)));
                    const sequences = Array.from(sequenceSet).sort((a, b) => parseInt(a.replace('Sequence', ''), 10) - parseInt(b.replace('Sequence', ''), 10));

                    const newSong = {
                        id: `Generated Song ${i + 1}`,
                        artist: `Generated Artist ${i + 1}`,
                        bpm,
                        totalSequences: sequences.length,
                        totalChannels: channelsWithActivation.length,
                        channels: [],
                        projectSequences: Object.fromEntries(sequences.map(s => [s, {}]))
                    };

                    const ctx = { harmonyChannelsAdded: 0, maxHarmonyChannels: effectsConfig.harmonize.maxHarmonyChannels, totalGain: 0, maxTotalGain: 10 };

                    channelsWithActivation.forEach(({ channel, activationSeq }, idx) => {
                        const newCh = { id: `ch${idx}`, url: channel.url, metadata: { ...channel.metadata, originalBPM: bpm, activationSeq } };
                        applyEffects(newCh, idx, newSong, activationSeq, bpm, ctx);
                        if (newCh.metadata.isLoop) {
                            console.log(`[effectsDebug] Loop ${newCh.url} included in remix ${newSong.id}`);
                        }
                        newSong.channels.push(newCh);
                        if (isChannelFromSpecialSong(channel)) {
                            const rule = getRandomActivationRule();
                            newCh.metadata.activationRule = rule;
                            newCh.metadata.customActivationEvents = generateActivationEvents(rule, newSong.totalSequences);
                        }
                        channel.metadata.channelSequence?.forEach(seq => {
                            newSong.projectSequences[seq.sequenceName][newCh.id] = { steps: seq.steps };
                        });
                    });

                    mixes.push(newSong);
                    console.log(`[Remix Generated] ${newSong.id}, Artist: ${newSong.artist}, BPM: ${newSong.bpm}, Sequences: ${newSong.totalSequences}, Channels: ${newSong.totalChannels}`);
                    newSong.channels.forEach(ch => console.log(`  ${ch.id}: URL=${ch.url}, Metadata=`, ch.metadata));
                    console.log("---------------------------------------------------");
                }
                return mixes;
            };

            const isChannelFromSpecialSong = (ch) => [
                "/content/5ee46b8f645a65b0ec8ae749a28f88e364347f89137bb79986355bf5fb94cbebi0",
                "/content/c41de57f1e062a440a9fc96d54baaccd7ec40049f48e9f3880559afc60b1b09ai0"
            ].includes(ch.url);

            const getRandomActivationRule = () => [1, 2, 3, 4][Math.floor(Math.random() * 4)];

            const generateActivationEvents = (rule, totalSeq) => {
                const events = [];
                const addEvent = (type, seq) => seq <= totalSeq && events.push({ type, seq });
                switch (rule) {
                    case 1:
                        addEvent('activate', 1);
                        addEvent('deactivate', 3);
                        break;
                    case 2:
                        for (let s = 1; s <= totalSeq; s += 4) { addEvent('activate', s); addEvent('deactivate', s + 2); }
                        break;
                    case 3:
                        addEvent('activate', 9);
                        for (let s = 9; s <= 20; s += 4) { addEvent('activate', s); addEvent('deactivate', s + 2); }
                        addEvent('activate', 41);
                        break;
                    case 4:
                        getRandomSubset([1,5,9,16,21,25,29,33,37,41,45], Math.floor(Math.random() * 3) + 1).forEach(s => { addEvent('activate', s); addEvent('deactivate', s + 2); });
                        break;
                    default:
                        addEvent('activate', 1);
                        addEvent('deactivate', 3);
                }
                return events;
            };

            const getRandomSubset = (arr, size) => arr.sort(() => 0.5 - Math.random()).slice(0, size);

            const generatedSongs = generateRandomMixes(100);
            globalData.songsArray = generatedSongs;
            globalData.currentSongIndex = 0;
            globalData.currentSequenceIndex = 0;

            if (globalData.songsArray.length) globalData.initialSampleOrder = prepareInitialSampleOrder(globalData.songsArray[0]);
            if (globalData.isArtworkCover && artworkUrl.length) setArtworkImage(artworkUrl[0]);

            globalData.isSingleSong = globalData.songsArray.length === 1;
            globalData.isMultipleSongs = globalData.songsArray.length > 1;

            document.dispatchEvent(new CustomEvent("dataLoadingComplete", {
                detail: {
                    success: true,
                    totalSongs: globalData.songsArray.length,
                    songs: globalData.songsArray.map(({ id, totalSequences }) => ({ id, totalSequences }))
                }
            }));
            console.log("[Initialization] Data loading complete event dispatched.");

            console.log("Original Songs Data:");
            originalSongs.forEach(song => {
                console.log(`ID: ${song.id}, Artist: ${song.artist}, BPM: ${song.bpm}, Sequences: ${song.totalSequences}, Channels: ${song.totalChannels}`);
                song.channels.forEach(ch => console.log(`  ${ch.id}: URL=${ch.url}, Metadata=`, ch.metadata));
                console.log("---------------------------------------------------");
            });
        } else {
            console.log("[Initialization] No valid song data URLs to process.");
        }
    } catch (error) {
        console.error("[Initialization] Initialization error:", error);
    }
})();
