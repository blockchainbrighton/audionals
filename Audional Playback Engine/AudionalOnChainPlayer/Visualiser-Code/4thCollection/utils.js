// utils.js


export const seed = 63973449477; // Example seed value

export function calculateCCI2(channelIndex) {
    const randomSeed = seed + channelIndex;
    const randomMultiplier = randomWithSeed(randomSeed) * 250;
    return Math.floor(randomMultiplier) + 1;
}

function randomWithSeed(seedValue) {
    const x = Math.sin(seedValue) * 10000;
    return x - Math.floor(x);
}
