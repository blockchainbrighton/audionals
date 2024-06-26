// visualiserStateSetup.js

const logTestValuesAndDistribution = () => {
    const ITERATIONS = 1e7;
    const testVals = Array.from({ length: 10 }, () => []);
    const dist = Array.from({ length: 10 }, () => 0);
    let collected = 0;

    for (let i = 0; i < ITERATIONS; i++) {
        const accessLvl = generateAccessLevel(i) - 1;
        if (i < 1e6 && testVals[accessLvl].length < 10 && collected < 100) {
            testVals[accessLvl].push(i);
            collected++;
        }
        dist[accessLvl]++;
        if (collected >= 100) {
            console.log("Collected enough values, exiting early.");
            break;
        }
    }
    logAccessLevelValues(testVals);
    logAccessLevelDistribution(dist, ITERATIONS);
};

document.addEventListener("playbackStarted", () => {
    window.playbackStartTime = Date.now();
    console.log(`Playback started at ${window.playbackStartTime}`);
});

logTestValuesAndDistribution();

setTimeout(() => {
    logInitialAssignments(seed, selectArrayIndex, calculateCCI2, arrayLengths, renderingState, activeArrayIndex);
}, 500);
