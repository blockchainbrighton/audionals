// remixProcessor.js

// remixProcessor.js

(async () => {
    // Ensure globalData and songsArray are available
    if (!window.globalData || !window.globalData.songsArray) {
        console.error("globalData or songsArray not found. Cannot process remixes.");
        return;
    }

    const { songsArray } = window.globalData;

    // Function to shuffle an array deterministically (optional)
    const shuffleArray = (array, seed) => {
        let currentIndex = array.length, randomIndex;

        // While there remain elements to shuffle
        while (currentIndex !== 0) {

            // Pick a remaining element
            randomIndex = Math.floor(seededRandom(seed++) * currentIndex);
            currentIndex--;

            // And swap it with the current element
            [array[currentIndex], array[randomIndex]] = [
                array[randomIndex], array[currentIndex]];
        }

        return array;
    };

    // Seeded random generator (simple implementation)
    const seededRandom = (seed) => {
        var x = Math.sin(seed++) * 10000;
        return x - Math.floor(x);
    };

    // Function to create a remix song from a set of channels
    const createRemixSong = (channels, remixIndex) => {
        const remixSong = {
            id: `Remix_Song_${remixIndex + 1}`,
            artist: "Remixed Artist",
            bpm: 120, // You can calculate or set based on remix logic
            totalSequences: 0, // Update based on remix
            channels: channels.map((channel, index) => ({
                id: `Remix_Ch_${index + 1}`,
                url: channel.url, // or modify as needed
                metadata: {
                    volume: channel.metadata.volume,
                    playbackSpeed: channel.metadata.playbackSpeed,
                    trimStartTime_Percentage: channel.metadata.trimStartTime_Percentage,
                    trimEndTime_Percentage: channel.metadata.trimEndTime_Percentage,
                    requiresReversal: channel.metadata.requiresReversal
                }
            })),
            projectSequences: {} // Define based on remix logic
        };
        return remixSong;
    };

    // Example Remix Logic: Combine one channel from each song
    const generateRemixes = () => {
        const remixedSongs = [];
        const remixCount = 5; // Number of remixes to generate

        for (let i = 0; i < remixCount; i++) {
            const selectedChannels = songsArray.map(song => {
                // Randomly select a channel from each song
                const channels = song.channels;
                const randomChannel = channels[Math.floor(seededRandom(i) * channels.length)];
                return randomChannel;
            });

            const remixSong = createRemixSong(selectedChannels, i);
            remixedSongs.push(remixSong);
        }

        return remixedSongs;
    };

    try {
        const remixes = generateRemixes();

        // Append remixes to the songsArray
        window.globalData.songsArray.push(...remixes);

        console.log(`Generated ${remixes.length} remixed songs.`);
    } catch (error) {
        console.error("Error generating remixes:", error);
    }

    // Optionally, dispatch an event to signal remixes are ready
    document.dispatchEvent(new CustomEvent("remixesGenerated", { detail: { remixes } }));
})();