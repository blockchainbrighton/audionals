// visualiserCode.js

console.log("Visualiser.js loaded");

let isChannel11Active = false;
let activeChannelIndex = null;
let isPlaybackActive = false;
let renderingState = {};
let activeArrayIndex = {};

let arrayLengths = {
    1: 0,
    2: 0,
    3: 0
};

const accessLevelMappings = {
    1: [1],
    2: [1, 2],
    3: [1, 2, 3]
};

function initializeArrayLengths() {
    try {
        arrayLengths[1] = getColors1Length() || 0;
    } catch (e) {
        console.error("Failed to get length for array 1", e);
    }
    try {
        arrayLengths[2] = getColors2Length() || 0;
    } catch (e) {
        console.error("Failed to get length for array 2", e);
    }
    try {
        arrayLengths[3] = getColors3Length() || 0;
    } catch (e) {
        console.error("Failed to get length for array 3", e);
    }
    console.log("Initialized array lengths:", arrayLengths);
}

initializeArrayLengths();

function randomWithSeed(t) {
    const e = 1e4 * Math.sin(t);
    return e - Math.floor(e);
}

function calculateCCI2(channelIndex, arrayLength) {
    if (!arrayLength || arrayLength <= 0) {
        console.error("Invalid array length:", arrayLength);
        return 1;
    }

    const value = 100 * randomWithSeed(seed + (channelIndex + 1));
    const scaledValue = Math.floor((value / 100) * arrayLength);

    return Math.min(Math.max(scaledValue, 0), arrayLength - 1);
}

function generateAccessLevel(seed) {
    const randomValue = randomWithSeed(seed);
    return Math.floor(randomValue * 3) + 1;
}

function selectArrayIndex(seed, AccessLevel, channelIndex) {
    const randomValue = randomWithSeed(seed + channelIndex * 100);
    switch (AccessLevel) {
        case 1: return 1;
        case 2: return Math.floor(randomValue * 2) + 1;
        case 3: return Math.floor(randomValue * 3) + 1;
        default:
            console.error(`Invalid AccessLevel: ${AccessLevel}`);
            return 1;
    }
}

let AccessLevel = generateAccessLevel(seed);

function updateVisualizer(cci2, arrayIndex, channelIndex) {
    console.log(`Updating visual:\nAccessLevel=${AccessLevel}\nArrayIndex=${arrayIndex}\nCCI2=${cci2}\nIndex=${arrayIndex}`);
    immediateVisualUpdate();
}

function shouldUpdateVisualizer(channelIndex, arrayIndex, cci2) {
    const previousState = renderingState[channelIndex] || {};

    if (previousState.arrayIndex !== arrayIndex || previousState.cci2 !== cci2) {
        renderingState[channelIndex] = { arrayIndex, cci2 };
        return true;
    }

    return false;
}

let needImmediateUpdate = false;

function immediateVisualUpdate() {
    if (needImmediateUpdate) {
        needImmediateUpdate = false;
    }
}

document.addEventListener("internalAudioPlayback", (event) => {
    const { action, channelIndex, step } = event.detail;

    if (action === "stop") {
        cci2 = initialCCI2;
        isChannel11Active = false;
        isPlaybackActive = false;
        activeChannelIndex = null;
        activeArrayIndex = {};
        renderingState = {};
        console.log(`Stop received. CCI2 reset to initial value ${initialCCI2}`);
        immediateVisualUpdate();
    } else if (action === "activeStep") {
        if (!isPlaybackActive || activeChannelIndex !== channelIndex) {
            isPlaybackActive = true;
            activeChannelIndex = channelIndex;
            AccessLevel = generateAccessLevel(seed);
            const safeChannelIndex = channelIndex === 0 ? 1 : channelIndex;
            const arrayIndex = selectArrayIndex(seed, AccessLevel, safeChannelIndex);

            console.log(`AccessLevel=${AccessLevel}\nArrayIndex=${arrayIndex}\nCCI2=${cci2}\nIndex=${arrayIndex}`);
            
            if (!arrayLengths[arrayIndex]) {
                console.error("Invalid array length:", arrayLengths[arrayIndex]);
                return;
            }

            cci2 = calculateCCI2(safeChannelIndex, arrayLengths[arrayIndex]);

            if (shouldUpdateVisualizer(channelIndex, arrayIndex, cci2)) {
                activeArrayIndex[channelIndex] = arrayIndex;
                updateVisualizer(cci2, arrayIndex, channelIndex);
            }

        }
    }
});

AudionalPlayerMessages.onmessage = (message) => {
    const { action, channelIndex } = message.data;
    if (!isPlaybackActive && action !== "stop") return;

    if (action === "stop") {
        cci2 = initialCCI2;
        isChannel11Active = false;
        isPlaybackActive = false;
        activeChannelIndex = null;
        activeArrayIndex = {};
        renderingState = {};
        console.log(`Stop received. CCI2 reset to initial value ${initialCCI2}`);
    } else {
        if (activeChannelIndex !== channelIndex) {
            activeChannelIndex = channelIndex;
            AccessLevel = generateAccessLevel(seed);
            const safeChannelIndex = channelIndex === 0 ? 1 : channelIndex;
            const arrayIndex = selectArrayIndex(seed, AccessLevel, safeChannelIndex);

            console.log(`AccessLevel=${AccessLevel}\nArrayIndex=${arrayIndex}\nCCI2=${cci2}\nIndex=${arrayIndex}`);
            
            if (!arrayLengths[arrayIndex]) {
                console.error("Invalid array length:", arrayLengths[arrayIndex]);
                return;
            }

            cci2 = calculateCCI2(safeChannelIndex, arrayLengths[arrayIndex]);

            if (shouldUpdateVisualizer(channelIndex, arrayIndex, cci2)) {
                activeArrayIndex[channelIndex] = arrayIndex;
                updateVisualizer(cci2, arrayIndex, channelIndex);
            }

        }
    }
};

// Function to log initial assignments for all channels
function logInitialAssignments() {
    setTimeout(() => {
        const assignments = [];
        const totalChannels = 16; // Adjust this number based on your application

        // Compute the access level once and log it
        const accessLevel = generateAccessLevel(seed);
        console.log(`Access Level: ${accessLevel}`);

        for (let channelIndex = 1; channelIndex <= totalChannels; channelIndex++) {
            const arrayIndex = selectArrayIndex(seed, accessLevel, channelIndex);
            const cci2 = calculateCCI2(channelIndex, arrayLengths[arrayIndex]);

            // Update the rendering state and active array index
            renderingState[channelIndex] = { arrayIndex, cci2 };
            activeArrayIndex[channelIndex] = arrayIndex;

            // Log only the array index and CCI2
            assignments.push(`Channel ${channelIndex}: ArrayIndex=${arrayIndex}, CCI2=${cci2}`);
        }

        console.log("Initial Assignments:", assignments.join("; "));
    }, 100);
}

// Delay execution of logInitialAssignments by 500 milliseconds
setTimeout(logInitialAssignments, 500);

// Log function to control frequency and relevance
let lastLogTime = 0;
const logFrequency = 1000; // Log every 1000ms (1 second)
function log(message) {
    const now = Date.now();
    if (now - lastLogTime > logFrequency) {
        console.log(message);
        lastLogTime = now;
    }
}

// Separate error logging
function errorLog(message, data) {
    console.error(message, data);
}


let scaleFactor = 3;
let S = window.innerWidth;
let R = 100 * scaleFactor;
let H = 2 * R;
let RS = 2 * Math.PI / 2000 / 1000;
let SR = 100 * scaleFactor;
let OR = 100 * scaleFactor;

const cv = document.getElementById("cv");
const cx = cv.getContext("2d");
cv.width = S;
cv.height = S;

const workerScript="\nself.onmessage = function(e) {\n    const { id, vertices, pivot, angle } = e.data;\n    const updatedVertices = vertices.map(v => {\n        let x = v.x - pivot.x,\n            y = v.y - pivot.y,\n            x1 = x * Math.cos(angle) - y * Math.sin(angle),\n            y1 = x * Math.sin(angle) + y * Math.cos(angle);\n        return { x: x1 + pivot.x, y: y1 + pivot.y, z: v.z };\n    });\n\n    postMessage({ id, updatedVertices });\n};\n",blob=new Blob([workerScript],{type:"application/javascript"}),workerScriptURL=URL.createObjectURL(blob),rotationWorker=new Worker(workerScriptURL);function sendRotationRequest(t,e,s,i){rotationWorker.postMessage({id:t,vertices:e,pivot:s,angle:i})}function generateVerticesRequest(t,e,s,i){rotationWorker.postMessage({taskType:"generateVertices",data:{id:t,c:e,r:s,s:i}})}rotationWorker.onmessage=function(t){const{id:e,updatedVertices:s}=t.data;"cy"===e?cp.cy.updateVertices(s):e.startsWith("sp")&&cp[e].updateVertices(s)};
class Cy{constructor(t,e,s,i){this.c=t,this.r=e,this.h=s,this.s=i,this.gV(),this.gF()}updateVertices(t){this.v=t}gV(){this.v=[];for(let t=0;t<=this.s;t++){let e=this.c.y-this.h/2+t/this.s*this.h;for(let s=0;s<=this.s;s++){let i=s/this.s*2*Math.PI,c=this.c.x+this.r*Math.cos(i),a=this.c.z+this.r*Math.sin(i);this.v.push({x:c,y:e,z:a})}}}gF(){this.f=[];for(let t=0;t<this.s;t++)for(let e=0;e<this.s;e++){let s=t*(this.s+1)+e,i=s+1,c=s+this.s+1,a=c+1;this.f.push([s,i,c]),this.f.push([i,a,c])}}rP(t,e){sendRotationRequest(this.id,this.v,t,e)}}class Sp{constructor(t,e,s){this.c=t,this.r=e,this.s=s,this.gV(),this.gF()}updateVertices(t){this.v=t}gV(){this.v=[];for(let t=0;t<=this.s;t++){let e=t/this.s*Math.PI;for(let s=0;s<=this.s;s++){let i=s/this.s*2*Math.PI,c=this.c.x+this.r*Math.sin(e)*Math.cos(i),a=this.c.y+this.r*Math.sin(e)*Math.sin(i),o=this.c.z+this.r*Math.cos(e);this.v.push({x:c,y:a,z:o})}}}gF(){this.f=[];for(let t=0;t<this.s;t++)for(let e=0;e<this.s;e++){let s=t*(this.s+1)+e,i=s+1,c=s+this.s+1,a=c+1;this.f.push([s,i,c]),this.f.push([i,a,c])}}rP(t,e){sendRotationRequest(this.id,this.v,t,e)}}

class Cp {
    constructor(t, e, s, i) {
        this.c = t;
        this.r = e;
        this.h = s;
        this.s = i;
        this.cy = new Cy(t, e, s, i);
        this.sp1 = new Sp({ x: t.x - e, y: t.y, z: t.z }, e, i);
        this.sp2 = new Sp({ x: t.x + e, y: t.y, z: t.z }, e, i);
    }

    updateVertices(t) {
        this.v = t;
    }

    rP(t, e) {
        sendRotationRequest("cy", this.cy.v, t, e);
        sendRotationRequest("sp1", this.sp1.v, t, e);
        sendRotationRequest("sp2", this.sp2.v, t, e);
    }
}

let t,
    cp = new Cp({ x: S / 2, y: S / 2, z: 0 }, R, H, 30),
    os1 = new Sp({ x: S / 2 - OR, y: S / 2, z: 0 }, SR, 30),
    os2 = new Sp({ x: S / 2 + OR, y: S / 2, z: 0 }, SR, 30);

function d(e) {
    let s;

    cx.clearRect(0, 0, S, S);

    if (t === undefined) {
        s = 0;
    } else {
        s = RS * (e - t) * 100;
    }

    t = e;

    cp.rP(cp.c, s);
    cp.drawObjectD2(cp.cy, e);
    cp.drawObjectD2(cp.sp1, e);
    cp.drawObjectD2(cp.sp2, e);

    requestAnimationFrame(d);
}

cp.drawObjectD2 = function(t, e) {
    // Use initial color for fill if playback is not active or no active channel
    let initialFill = (!isPlaybackActive || activeChannelIndex === null);

    for (let s of t.f) {
        let vertices = s.map((e) => t.v[e]);
        let coordinates = vertices.map((t) => ({ x: t.x, y: t.y }));

        cx.beginPath();
        cx.moveTo(coordinates[0].x, coordinates[0].y);

        for (let t = 1; t < coordinates.length; t++) {
            cx.lineTo(coordinates[t].x, coordinates[t].y);
        }

        cx.closePath();

        let angle = 180 * Math.atan2(coordinates[0].y - S / 2, coordinates[0].x - S / 2) / Math.PI;

        // Render using first color from getColors1 if initial fill
        if (initialFill) {
            let initialColors = getColors1(angle, e, vertices);
            if (!initialColors || initialColors.length === 0) {
                console.error(`No colors returned for initial display.`);
                return;
            }
            cx.fillStyle = initialColors[0]; // Use the first color for initial fill
        } else {
            // Render using active array for the current channel
            const currentArrayIndex = activeArrayIndex[activeChannelIndex];
            let colors = getColorArray(angle, e, vertices, AccessLevel);

            if (!colors || colors.length === 0) {
                console.error(`No colors returned for AccessLevel: ${AccessLevel}`);
                return;
            }

            cx.fillStyle = colors[cci2 % colors.length];
        }

        cx.fill();
        cx.strokeStyle = "black";
        cx.stroke();
    }
};





requestAnimationFrame(d);

function getColorArray(angle, time, vertices, accessLevel) {
    const allowedArrays = accessLevelMappings[accessLevel];
    const channelArrayIndex = activeArrayIndex[activeChannelIndex]; // Use the active array index for the channel

    // Ensure we are only accessing allowed arrays
    if (!allowedArrays.includes(channelArrayIndex)) {
        console.error(`Array index ${channelArrayIndex} not allowed for AccessLevel ${accessLevel}`);
        return [];
    }

    switch (channelArrayIndex) {
        case 1:
            return getColors1(angle, time, vertices);
        case 2:
            return getColors2(angle, time, vertices);
        case 3:
            return getColors3(angle, time, vertices);
        default:
            console.error(`Invalid arrayIndex ${channelArrayIndex}`);
            return [];
    }
}


// async function ensureAudioContextState(){window.audioCtx&&"suspended"===audioCtx.state&&(await audioCtx.resume(),console.log("AudioContext resumed"))}document.addEventListener("DOMContentLoaded",ensureAudioContextState),document.addEventListener("click",(async()=>{await ensureAudioContextState()}));