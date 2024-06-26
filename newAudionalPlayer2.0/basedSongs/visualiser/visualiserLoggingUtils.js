// visualiserLoggingUtils.js

const TOTAL_CHANNELS = 16;
let lastLog = 0;
const logFreq = 1000;

const log = msg => {
    const now = Date.now();
    if (now - lastLog > logFreq) {
        console.log(msg);
        lastLog = now;
    }
};

const errorLog = (msg, err) => console.error(msg, err);

const logAccessLevelValues = vals => {
    console.log("Test Values for Each Access Level:");
    vals.forEach((v, i) => console.log(`Access Level ${i + 1}:`, v));
};

const logAccessLevelDistribution = (dist, total) => {
    console.log("Access Level Distribution:");
    dist.forEach((cnt, i) => console.log(`Access Level ${i + 1}: ${(cnt / total * 100).toFixed(2)}%`));
};
