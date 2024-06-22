// visualiserCode.js

console.log("VisualiserCode.js loaded");

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


class Cy {
    constructor(t, e, s, i) {
        this.c = t;
        this.r = e;
        this.h = s;
        this.s = i;
        this.gV();
        this.gF();
    }

    updateVertices(t) { 
        this.v = t; 
    }

    gV() {
        const vertices = [];
        const increment = 2 * Math.PI / this.s;
        for (let t = 0; t <= this.s; t++) {
            const y = this.c.y - this.h / 2 + t / this.s * this.h;
            for (let s = 0; s <= this.s; s++) {
                const angle = s * increment;
                const x = this.c.x + this.r * Math.cos(angle);
                const z = this.c.z + this.r * Math.sin(angle);
                vertices.push({ x, y, z });
            }
        }
        this.v = vertices;
    }

    gF() {
        const faces = [];
        const stride = this.s + 1;
        for (let t = 0; t < this.s; t++) {
            for (let e = 0; e < this.s; e++) {
                const s = t * stride + e;
                faces.push([s, s + 1, s + stride], [s + 1, s + stride + 1, s + stride]);
            }
        }
        this.f = faces;
    }

    rP(t, e) { 
        sendRotationRequest(this.id, this.v, t, e); 
    }
}

class Sp {
    constructor(t, e, s) {
        this.c = t;
        this.r = e;
        this.s = s;
        this.gV();
        this.gF();
    }

    updateVertices(t) { 
        this.v = t; 
    }

    gV() {
        const vertices = [];
        const increment = 2 * Math.PI / this.s;
        for (let t = 0; t <= this.s; t++) {
            const phi = t / this.s * Math.PI;
            const sinPhi = Math.sin(phi);
            const cosPhi = Math.cos(phi);
            for (let s = 0; s <= this.s; s++) {
                const theta = s * increment;
                const sinTheta = Math.sin(theta);
                const cosTheta = Math.cos(theta);
                const x = this.c.x + this.r * sinPhi * cosTheta;
                const y = this.c.y + this.r * sinPhi * sinTheta;
                const z = this.c.z + this.r * cosPhi;
                vertices.push({ x, y, z });
            }
        }
        this.v = vertices;
    }

    gF() {
        const faces = [];
        const stride = this.s + 1;
        for (let t = 0; t < this.s; t++) {
            for (let e = 0; e < this.s; e++) {
                const s = t * stride + e;
                faces.push([s, s + 1, s + stride], [s + 1, s + stride + 1, s + stride]);
            }
        }
        this.f = faces;
    }

    rP(t, e) { 
        sendRotationRequest(this.id, this.v, t, e); 
    }
}

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

// Global initialization
let t;
const cp = new Cp({ x: S / 2, y: S / 2, z: 0 }, R, H, 30);
const os1 = new Sp({ x: S / 2 - OR, y: S / 2, z: 0 }, SR, 30);
const os2 = new Sp({ x: S / 2 + OR, y: S / 2, z: 0 }, SR, 30);



function d(e) {
    let s = t === undefined ? 0 : RS * (e - t) * 100;
    t = e;

    // Check the clearCanvas flag
    if (clearCanvas) {
        cx.clearRect(0, 0, S, S);
    }

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
        case 4:
            return getColors4(angle, time, vertices); 
        case 5:
            return getColors5(angle, time, vertices); 
        case 6:
            return getColors6(angle, time, vertices); 
        case 7:
            return getColors7(angle, time, vertices); 
        default:
            console.error(`Invalid arrayIndex ${channelArrayIndex}`);
            return [];
    }
}


