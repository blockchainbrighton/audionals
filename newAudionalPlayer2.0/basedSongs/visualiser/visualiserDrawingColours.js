// visualiserDrawingColours.js

console.log("drawingColours.js loaded");

const cv = document.getElementById("cv");
const cx = cv.getContext("2d");
cv.width = window.innerWidth;
cv.height = window.innerWidth;

const draw = (time) => {
    const delta = (typeof t === 'undefined') ? 0 : RS * (time - t) * 100;
    t = time;

    // Clear the canvas if needed
    if (clearCanvas) {
        cx.clearRect(0, 0, cv.width, cv.height);
    }

    cp.rP(cp.c, delta);
    cp.drawObjectD2(cp.cy, time);
    cp.drawObjectD2(cp.sp1, time);
    cp.drawObjectD2(cp.sp2, time);

    requestAnimationFrame(draw);
};

// Extend the cp object with drawObjectD2 method
cp.drawObjectD2 = (object, time) => {
    const isInitialFill = !isPlaybackActive || activeChannelIndex === null;

    for (const face of object.f) {
        const vertices = face.map(index => object.v[index]);
        const coordinates = vertices.map(vertex => ({ x: vertex.x, y: vertex.y }));

        cx.beginPath();
        cx.moveTo(coordinates[0].x, coordinates[0].y);

        for (let i = 1; i < coordinates.length; i++) {
            cx.lineTo(coordinates[i].x, coordinates[i].y);
        }

        cx.closePath();

        const angle = 180 * Math.atan2(coordinates[0].y - cv.height / 2, coordinates[0].x - cv.width / 2) / Math.PI;

        // Set fill color
        if (isInitialFill) {
            const initialColors = getColors0(angle, time, vertices);
            if (!initialColors || initialColors.length === 0) {
                console.error("No colors returned for initial display.");
                return;
            }
            cx.fillStyle = initialColors[0];
        } else {
            const currentArrayIndex = activeArrayIndex[activeChannelIndex];
            const colors = getColorArray(angle, time, vertices, AccessLevel);

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

requestAnimationFrame(draw);


const getColorArray = (angle, time, vertices, accessLevel) => {
    const allowedArrays = accessLevelMappings[accessLevel];
    const channelArrayIndex = activeArrayIndex[activeChannelIndex];

    if (!allowedArrays.includes(channelArrayIndex)) {
        console.error(`Array index ${channelArrayIndex} not allowed for AccessLevel ${accessLevel}`);
        return [];
    }

    switch (channelArrayIndex) {
        case 0:
            return getColors0(angle, time, vertices);
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
};