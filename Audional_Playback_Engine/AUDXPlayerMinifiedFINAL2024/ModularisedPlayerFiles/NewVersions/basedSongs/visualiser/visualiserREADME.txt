# Audio Visualizer README

## Overview

The `visualiser.js` script is a core component of an audio-visual player designed to provide dynamic visual feedback based on audio playback events. This README file provides a comprehensive overview of the script, explaining its elements, data flows, and its role in the larger context of the audio-visual player.

## Table of Contents

1. [Introduction](#introduction)
2. [Dependencies](#dependencies)
3. [Initialization](#initialization)
4. [State Variables](#state-variables)
5. [Utility Functions](#utility-functions)
6. [Event Listeners](#event-listeners)
7. [Canvas Setup](#canvas-setup)
8. [Worker Setup](#worker-setup)
9. [Class Definitions](#class-definitions)
10. [Main Setup](#main-setup)
11. [Audio Context Management](#audio-context-management)
12. [Future Enhancements](#future-enhancements)

## Introduction

The `visualiser.js` script is responsible for rendering visual representations based on audio playback events. It listens for audio playback events, processes them, and updates the visual output in real-time using the HTML5 Canvas API and Web Workers for efficient computation.

## Dependencies

- HTML5 Canvas API
- Web Workers
- External scripts for handling audio playback events (e.g., `AudionalPlayerMessages`)

## Initialization

The script begins by logging its initialization to the console:
```javascript
console.log("Visualiser.js loaded");
```

## State Variables

Several state variables are defined to manage the visualizer's state and configurations:
```javascript
let isChannel11Active = false;
let needImmediateUpdate = false;
let cci2;
const initialCCI2 = 0; // Define initialCCI2
const seed = 12345; // Define a seed value for randomization
```

## Utility Functions

### `randomWithSeed(t)`

Generates a random number based on a given seed.
```javascript
function randomWithSeed(t) {
    const e = 10000 * Math.sin(t);
    return e - Math.floor(e);
}
```

### `calculateCCI2(t)`

Calculates a CCI2 value based on a given channel index and seed.
```javascript
function calculateCCI2(t) {
    const e = 100 * randomWithSeed(seed + t);
    return Math.floor(e) + 1;
}
```

## Event Listeners

### `internalAudioPlayback`

Listens for custom audio playback events and updates the visualizer accordingly.
```javascript
document.addEventListener("internalAudioPlayback", (event) => {
    const { action, channelIndex, step } = event.detail;

    if (action === "stop") {
        cci2 = initialCCI2;
        isChannel11Active = false;
        console.log(`Stop received. CCI2 reset to initial value ${initialCCI2}`);
        immediateVisualUpdate();
    } else if (action === "activeStep") {
        cci2 = calculateCCI2(channelIndex);
        console.log(`Received channel playback: Channel ${channelIndex}. CCI2 updated to ${cci2} based on seed ${seed}.`);
    }
});
```

### `AudionalPlayerMessages`

Handles messages from the audio player.
```javascript
AudionalPlayerMessages.onmessage = (event) => {
    if (event.data.action === "stop") {
        cci2 = initialCCI2;
        isChannel11Active = false;
        console.log(`Stop received. CCI2 reset to initial value ${initialCCI2}`);
    } else {
        const { channelIndex } = event.data;
        cci2 = calculateCCI2(channelIndex);
        console.log(`Received channel playback: Channel ${channelIndex}. CCI2 updated to ${cci2} based on seed ${seed}.`);
    }
};
```

## Canvas Setup

Configures the HTML5 Canvas for drawing visual elements.
```javascript
let scaleFactor = 3,
    S = window.innerWidth,
    R = 100 * scaleFactor,
    H = 2 * R,
    RS = (2 * Math.PI / 2000) / 1000,
    SR = 100 * scaleFactor,
    OR = 100 * scaleFactor;

let cv = document.getElementById("cv"),
    cx = cv.getContext("2d");

cv.width = S;
cv.height = S;
```

## Worker Setup

Uses Web Workers to handle computational tasks without blocking the main thread.
```javascript
const workerScript = `
self.onmessage = function(e) {
    const { id, vertices, pivot, angle } = e.data;
    const updatedVertices = vertices.map(v => {
        let x = v.x - pivot.x,
            y = v.y - pivot.y,
            x1 = x * Math.cos(angle) - y * Math.sin(angle),
            y1 = x * Math.sin(angle) + y * Math.cos(angle);
        return { x: x1 + pivot.x, y: y1 + pivot.y, z: v.z };
    });
    postMessage({ id, updatedVertices });
};
`;

const blob = new Blob([workerScript], { type: "application/javascript" });
const workerScriptURL = URL.createObjectURL(blob);
const rotationWorker = new Worker(workerScriptURL);

function sendRotationRequest(id, vertices, pivot, angle) {
    rotationWorker.postMessage({ id, vertices, pivot, angle });
}

function generateVerticesRequest(id, c, r, s) {
    rotationWorker.postMessage({ taskType: "generateVertices", data: { id, c, r, s } });
}

rotationWorker.onmessage = function(event) {
    const { id, updatedVertices } = event.data;
    if (id === "cy") {
        cp.cy.updateVertices(updatedVertices);
    } else if (id.startsWith("sp")) {
        cp[id].updateVertices(updatedVertices);
    }
};
```

## Class Definitions

### `Cy` Class

Represents a cylindrical object in the visualization.
```javascript
class Cy {
    constructor(c, r, h, s) {
        this.c = c;
        this.r = r;
        this.h = h;
        this.s = s;
        this.gV();
        this.gF();
    }

    updateVertices(vertices) {
        this.v = vertices;
    }

    gV() {
        this.v = [];
        for (let t = 0; t <= this.s; t++) {
            let e = this.c.y - this.h / 2 + (t / this.s) * this.h;
            for (let t = 0; t <= this.s; t++) {
                let s = (t / this.s) * 2 * Math.PI,
                    i = this.c.x + this.r * Math.cos(s),
                    c = this.c.z + this.r * Math.sin(s);
                this.v.push({ x: i, y: e, z: c });
            }
        }
    }

    gF() {
        this.f = [];
        for (let t = 0; t < this.s; t++) {
            for (let e = 0; e < this.s; e++) {
                let s = t * (this.s + 1) + e,
                    i = s + 1,
                    c = s + this.s + 1,
                    a = c + 1;
                this.f.push([s, i, c]);
                this.f.push([i, a, c]);
            }
        }
    }

    rP(t, e) {
        sendRotationRequest(this.id, this.v, t, e);
    }
}
```

### `Sp` Class

Represents a spherical object in the visualization.
```javascript
class Sp {
    constructor(c, r, s) {
        this.c = c;
        this.r = r;
        this.s = s;
        this.gV();
        this.gF();
    }

    updateVertices(vertices) {
        this.v = vertices;
    }

    gV() {
        this.v = [];
        for (let t = 0; t <= this.s; t++) {
            let e = (t / this.s) * Math.PI;
            for (let t = 0; t <= this.s; t++) {
                let s = (t / this.s) * 2 * Math.PI,
                    i = this.c.x + this.r * Math.sin(e) * Math.cos(s),
                    c = this.c.y + this.r * Math.sin(e) * Math.sin(s),
                    a = this.c.z + this.r * Math.cos(e);
                this.v.push({ x: i, y: c, z: a });
            }
        }
    }

    gF() {
        this.f = [];
        for (let t = 0; t < this.s; t++) {
            for (let e = 0; e < this.s; e++) {
                let s = t * (this.s + 1) + e,
                    i = s + 1,
                    c = s + this.s + 1,
                    a = c + 1;
                this.f.push([s, i, c]);
                this.f.push([i, a, c]);
            }
        }
    }

    rP(t, e) {
        sendRotationRequest(this.id, this.v, t, e);
    }
}
```

### `Cp` Class

Represents a composite object that includes both cylindrical and spherical components.
```javascript
class Cp {
    constructor(c, r, h, s) {
        this.c = c;
        this.r = r;
        this.h = h;
        this.s = s;
        this.cy = new Cy(c, r, h, s);
        this.sp1 =

 new Sp({ x: c.x - r, y: c.y, z: c.z }, r, s);
        this.sp2 = new Sp({ x: c.x + r, y: c.y, z: c.z }, r, s);
    }

    updateVertices(vertices) {
        this.v = vertices;
    }

    rP(t, e) {
        sendRotationRequest("cy", this.cy.v, t, e);
        sendRotationRequest("sp1", this.sp1.v, t, e);
        sendRotationRequest("sp2", this.sp2.v, t, e);
    }

    drawObjectD2(object, timestamp) {
        for (let face of object.f) {
            let vertices = face.map((index) => object.v[index]);
            let points = vertices.map((vertex) => ({ x: vertex.x, y: vertex.y }));

            cx.beginPath();
            cx.moveTo(points[0].x, points[0].y);
            for (let i = 1; i < points.length; i++) {
                cx.lineTo(points[i].x, points[i].y);
            }
            cx.closePath();

            let angle = (180 * Math.atan2(points[0].y - S / 2, points[0].x - S / 2)) / Math.PI;
            let colors = getColors(angle, timestamp, vertices);

            cx.fillStyle = colors[cci2 % colors.length];
            cx.fill();
            cx.strokeStyle = "black";
            cx.stroke();
        }
    }
}
```

## Main Setup

Sets up the main visualization objects and starts the animation loop.
```javascript
let t;
let cp = new Cp({ x: S / 2, y: S / 2, z: 0 }, R, H, 30);
let os1 = new Sp({ x: S / 2 - OR, y: S / 2, z: 0 }, SR, 30);
let os2 = new Sp({ x: S / 2 + OR, y: S / 2, z: 0 }, SR, 30);

function draw(timestamp) {
    let delta;
    if (cx.clearRect(0, 0, S, S), t === undefined) {
        delta = 0;
    } else {
        delta = RS * (timestamp - t) * 100;
    }
    t = timestamp;
    cp.rP(cp.c, delta);
    cp.drawObjectD2(cp.cy, timestamp);
    cp.drawObjectD2(cp.sp1, timestamp);
    cp.drawObjectD2(cp.sp2, timestamp);
    requestAnimationFrame(draw);
}

requestAnimationFrame(draw);
```

## Audio Context Management

Ensures the audio context is resumed when necessary.
```javascript
async function ensureAudioContextState() {
    if (window.audioCtx && window.audioCtx.state === "suspended") {
        await audioCtx.resume();
        console.log("AudioContext resumed");
    }
}

document.addEventListener("DOMContentLoaded", ensureAudioContextState);
document.addEventListener("click", async () => {
    await ensureAudioContextState();
    togglePlayback();
});
```

## Future Enhancements

- **Optimization**: Further optimize the rendering and computation to handle larger data sets and more complex visualizations.
- **Interactivity**: Add more interactive features, such as user controls for modifying the visualizer parameters in real-time.
- **Customization**: Allow users to customize the visual styles and colors used in the visualizations.
- **Error Handling**: Implement comprehensive error handling to gracefully manage unexpected inputs and states.

This README should help developers understand the purpose and functionality of the `visualiser.js` script, as well as provide guidance on how to extend and optimize it for future use.