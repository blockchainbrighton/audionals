// scripts/utilities.js

// Utility Functions for Shape Points
export const getShapePoints = (name, c) => {
    const shapeFunctions = {
        "Capsule": () => getCapsulePoints(c, 400, 200),
        "Oval": () => getOvalPoints(c, 400, 200),
        "Circle": () => getOvalPoints(c, 250, 250),
        "Diamond": () => interpolateShape([
            { x: c.x, y: c.y - 100 },
            { x: c.x + 150, y: c.y },
            { x: c.x, y: c.y + 100 },
            { x: c.x - 150, y: c.y }
        ], 50),
        "Pentagon": () => interpolateShape(generateVertices(c, 150, 5, -Math.PI / 2), 50),
        "Hexagon": () => interpolateShape(generateVertices(c, 150, 6, -Math.PI / 2), 50),
        "Star": () => interpolateShape(generateStarVertices(c, 150, 75, 5, -Math.PI / 2), 50),
        "Rectangle": () => getRectanglePoints(c, 300, 200, 50),
        "ReuleauxTriangle": () => getReuleauxTrianglePoints(c, 150, 300)
    };
    return shapeFunctions[name] ? shapeFunctions[name]() : [];
};

export const getOvalPoints = (c, w, h, numPoints = 360) => 
    Array.from({ length: numPoints }, (_, a) => {
        const rad = a * Math.PI / 180;
        return { x: c.x + (w / 2) * Math.cos(rad), y: c.y + (h / 2) * Math.sin(rad) };
    });

export const getCapsulePoints = (c, width, height, numPoints = 360) => {
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

export const generateVertices = (c, r, sides, angleOffset = 0) =>
    Array.from({ length: sides }, (_, i) => ({
        x: c.x + r * Math.cos(angleOffset + 2 * Math.PI * i / sides),
        y: c.y + r * Math.sin(angleOffset + 2 * Math.PI * i / sides)
    }));

export const generateStarVertices = (c, outerR, innerR, points, angleOffset = 0) => {
    const verts = [];
    for (let i = 0; i < points * 2; i++) {
        const angle = angleOffset + i * Math.PI / points;
        const r = (i % 2 === 0) ? outerR : innerR;
        verts.push({ x: c.x + r * Math.cos(angle), y: c.y + r * Math.sin(angle) });
    }
    return verts;
};

export const interpolateShape = (verts, pointsPerSide) => {
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

export const getRectanglePoints = (c, width, height, pointsPerSide = 50) => {
    const halfW = width / 2, halfH = height / 2;
    const corners = [
        { x: c.x - halfW, y: c.y - halfH },
        { x: c.x + halfW, y: c.y - halfH },
        { x: c.x + halfW, y: c.y + halfH },
        { x: c.x - halfW, y: c.y + halfH }
    ];
    return interpolateShape(corners, pointsPerSide);
};

export const getReuleauxTrianglePoints = (c, radius, numPoints = 300) => {
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