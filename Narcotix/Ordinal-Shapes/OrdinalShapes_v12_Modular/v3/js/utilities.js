// utilities.js

(function(global) {
    const NS = global.NeonShapeDrawer;

    // In utilities.js

NS.shapeSizeModifiers = {
    "Star": 0.8,
    "ReuleauxTriangle": 0.8,
    "Rectangle": 0.8,
    "Capsule": 1,
    "Oval": 1,
    "Circle": 1,
    "Diamond": 1,
    "Pentagon": 0.8,
    "Hexagon": 0.8,
    
    // Other shapes default to 1
};

NS.getShapePoints = function(name, c, size) {
    const modifier = NS.shapeSizeModifiers[name] || 1;
    const adjustedSize = size * modifier;

    const shapeFunctions = {
        "Capsule": () => NS.getCapsulePoints(c, adjustedSize * 2, adjustedSize),
        "Oval": () => NS.getOvalPoints(c, adjustedSize * 2, adjustedSize),
        "Circle": () => NS.getOvalPoints(c, adjustedSize, adjustedSize),
        "Diamond": () => NS.interpolateShape([
            { x: c.x, y: c.y - adjustedSize / 1.5 },
            { x: c.x + adjustedSize, y: c.y },
            { x: c.x, y: c.y + adjustedSize / 1.5 },
            { x: c.x - adjustedSize, y: c.y }
        ], 50),
        "Pentagon": () => NS.interpolateShape(NS.generateVertices(c, adjustedSize, 5, -Math.PI / 2), 50),
        "Hexagon": () => NS.interpolateShape(NS.generateVertices(c, adjustedSize, 6, -Math.PI / 2), 50),
        "Star": () => NS.interpolateShape(
            NS.generateStarVertices(c, adjustedSize, adjustedSize / 2, 5, -Math.PI / 2),
            50
        ),
        "Rectangle": () => NS.getRectanglePoints(c, adjustedSize * 2, adjustedSize, 50),
        "ReuleauxTriangle": () => NS.getReuleauxTrianglePoints(c, adjustedSize, 250)
    };
    return shapeFunctions[name] ? shapeFunctions[name]() : [];
};

    NS.getOvalPoints = function(c, w, h, numPoints = 360) {
        const points = [];
        for (let a = 0; a < numPoints; a++) {
            const rad = a * Math.PI / 180;
            points.push({ x: c.x + (w / 2) * Math.cos(rad), y: c.y + (h / 2) * Math.sin(rad) });
        }
        return points;
    };

    NS.getCapsulePoints = function(c, width, height, numPoints = 360) {
        const pts = [];
        const radius = height / 2;
        let halfWidth = Math.max(width / 2 - radius, 0);
        for (let i = 0; i < numPoints; i++) {
            const p = i / numPoints;
            let x, y;
            if (p < 0.25) {
                const angle = (Math.PI / 2) + (p / 0.25) * Math.PI;
                x = c.x - halfWidth + radius * Math.cos(angle);
                y = c.y + radius * Math.sin(angle);
            } else if (p < 0.5) {
                const t = (p - 0.25) / 0.25;
                x = (c.x - halfWidth) + (2 * halfWidth) * t;
                y = c.y - radius;
            } else if (p < 0.75) {
                const angle = (3 * Math.PI / 2) + ((p - 0.5) / 0.25) * Math.PI;
                x = c.x + halfWidth + radius * Math.cos(angle);
                y = c.y + radius * Math.sin(angle);
            } else {
                const t = (p - 0.75) / 0.25;
                x = (c.x + halfWidth) - (2 * halfWidth) * t;
                y = c.y + radius;
            }
            pts.push({ x, y });
        }
        return pts;
    };

    NS.generateVertices = function(c, r, sides, angleOffset = 0) {
        const verts = [];
        for (let i = 0; i < sides; i++) {
            verts.push({
                x: c.x + r * Math.cos(angleOffset + 2 * Math.PI * i / sides),
                y: c.y + r * Math.sin(angleOffset + 2 * Math.PI * i / sides)
            });
        }
        return verts;
    };

    NS.generateStarVertices = function(c, outerR, innerR, points, angleOffset = 0) {
        const verts = [];
        for (let i = 0; i < points * 2; i++) {
            const angle = angleOffset + i * Math.PI / points;
            const r = (i % 2 === 0) ? outerR : innerR;
            verts.push({ x: c.x + r * Math.cos(angle), y: c.y + r * Math.sin(angle) });
        }
        return verts;
    };

    NS.interpolateShape = function(verts, pointsPerSide) {
        const pts = [];
        verts.forEach((p0, i) => {
            const p1 = verts[(i + 1) % verts.length];
            for (let t = 0; t < pointsPerSide; t++) {
                pts.push({
                    x: p0.x + (p1.x - p0.x) * t / pointsPerSide,
                    y: p0.y + (p1.y - p0.y) * t / pointsPerSide
                });
            }
        });
        return pts;
    };

    NS.getRectanglePoints = function(c, width, height, pointsPerSide = 50) {
        const halfW = width / 2, halfH = height / 2;
        const corners = [
            { x: c.x - halfW, y: c.y - halfH },
            { x: c.x + halfW, y: c.y - halfH },
            { x: c.x + halfW, y: c.y + halfH },
            { x: c.x - halfW, y: c.y + halfH }
        ];
        return NS.interpolateShape(corners, pointsPerSide);
    };

    NS.getReuleauxTrianglePoints = function(c, radius, numPoints = 300) {
        const points = [];
        const numPointsPerArc = Math.floor(numPoints / 3);
        const angleOffset = -Math.PI / 2; // Start pointing upwards

        // Calculate the correct arc radius (side length of the equilateral triangle)
        const arcRadius = radius * Math.sqrt(3);

        // Calculate the three vertices of the equilateral triangle
        const vertices = [];
        for (let i = 0; i < 3; i++) {
            const angle = angleOffset + (2 * Math.PI * i) / 3;
            vertices.push({
                x: c.x + radius * Math.cos(angle),
                y: c.y + radius * Math.sin(angle)
            });
        }

        // For each arc, draw from one vertex to the next, centered at the opposite vertex
        for (let i = 0; i < 3; i++) {
            const startVertex = vertices[i];
            const endVertex = vertices[(i + 1) % 3];
            const centerVertex = vertices[(i + 2) % 3];

            // Compute the angle from the centerVertex to startVertex and endVertex
            let startAngle = Math.atan2(startVertex.y - centerVertex.y, startVertex.x - centerVertex.x);
            let endAngle = Math.atan2(endVertex.y - centerVertex.y, endVertex.x - centerVertex.x);

            // Adjust angles for proper drawing direction
            if (endAngle < startAngle) {
                endAngle += 2 * Math.PI;
            }

            const angleStep = (endAngle - startAngle) / numPointsPerArc;

            for (let j = 0; j < numPointsPerArc; j++) {
                const angle = startAngle + j * angleStep;
                points.push({
                    x: centerVertex.x + arcRadius * Math.cos(angle),
                    y: centerVertex.y + arcRadius * Math.sin(angle)
                });
            }
        }
        return points;
    };
})(window);


(function(global) {
    const NS = global.NeonShapeDrawer;

    NS.Shape = function(canvas, shapeName, settings) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.shapeName = shapeName;
        this.settings = Object.assign({}, settings);
        this.animationIndex = 0;
        this.oscillationOffset = 0;
        this.center = { x: 0, y: 0 };
        this.shapePoints = [];
        this.scale = this.settings.scale || 1; // Default scale is 1

        this.resizeCanvas();
        window.addEventListener('resize', this.resizeCanvas.bind(this));

        this.shapePoints = NS.getShapePoints(this.shapeName, this.center, this.scale);
        this.animate();
    };

    NS.Shape.prototype.resizeCanvas = function() {
        const parent = this.canvas.parentElement;
        this.canvas.width = parent.clientWidth;
        this.canvas.height = parent.clientHeight;
        this.center = { x: this.canvas.width / 2, y: this.canvas.height / 2 };
        this.shapePoints = NS.getShapePoints(this.shapeName, this.center, this.scale);
    };

    NS.Shape.prototype.setSettings = function(newSettings) {
        Object.assign(this.settings, newSettings);
        if (newSettings.scale) {
            this.scale = newSettings.scale;
            this.shapePoints = NS.getShapePoints(this.shapeName, this.center, this.scale);
        }
    };

    NS.Shape.prototype.animate = function() {
        const { speed, offset, frequency, tailLength, noiseLevel } = this.settings;
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        if (this.shapePoints.length > 0) {
            this.animationIndex = (this.animationIndex + speed / 10) % this.shapePoints.length;
            this.oscillationOffset += frequency * 0.05;
            for (let i = 0; i < tailLength; i++) {
                let idx = Math.floor((this.animationIndex - i * (speed / 10)) % this.shapePoints.length);
                if (idx < 0) idx += this.shapePoints.length;
                const idxNext = (idx + 1) % this.shapePoints.length;
                const pCurrent = this.shapePoints[idx], pNext = this.shapePoints[idxNext];
                const dx = pNext.x - pCurrent.x, dy = pNext.y - pCurrent.y;
                const length = Math.hypot(dx, dy) || 1;
                const perp = { x: -dy / length, y: dx / length };
                const osc = Math.sin(this.oscillationOffset + i * 0.3) * offset * (1 - i / tailLength);
                const noise = () => (Math.random() - 0.5) * 2 * noiseLevel;
                const nx = pCurrent.x + perp.x * osc + noise(), ny = pCurrent.y + perp.y * osc + noise();
                const nnx = pNext.x + perp.x * osc + noise(), nny = pNext.y + perp.y * osc + noise();
                const fade = Math.max(0, 255 - Math.floor((i / tailLength) * 255));
                this.ctx.strokeStyle = `rgba(57,255,${Math.min(20, fade)},1)`;
                this.ctx.lineWidth = 2;
                this.ctx.beginPath();
                this.ctx.moveTo(nx, ny);
                this.ctx.lineTo(nnx, nny);
                this.ctx.stroke();
            }
        }
        requestAnimationFrame(this.animate.bind(this));
    };
})(window);
