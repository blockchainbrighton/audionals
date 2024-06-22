// visualiserGeometry.js

console.log("geometry.js loaded");

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
const scaleFactor = 3;
const S = window.innerWidth;
const R = 100 * scaleFactor;
const H = 2 * R;
const RS = 2 * Math.PI / 2000 / 1000;
const SR = 100 * scaleFactor;
const OR = 100 * scaleFactor;
const cp = new Cp({ x: S / 2, y: S / 2, z: 0 }, R, H, 30);
const os1 = new Sp({ x: S / 2 - OR, y: S / 2, z: 0 }, SR, 30);
const os2 = new Sp({ x: S / 2 + OR, y: S / 2, z: 0 }, SR, 30);
