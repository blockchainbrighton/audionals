// visualiserStateDownload.js

const downloadCurrentVisualStateWithText = () => {
    const canvas = document.querySelector("canvas");
    if (!canvas) return console.error("No canvas element found.");

    const visualState = {
        accessLevel: AccessLevel,
        assignments: getAssignments(renderingState),
        timecode: getTimecode()
    };

    const textLines = [
        `Access Level: ${visualState.accessLevel}`,
        "Assignments:",
        ...visualState.assignments.map((assignment, index) => `Channel ${index + 1}: ${assignment}`),
        `Timecode: ${visualState.timecode} ms`
    ];

    const newCanvas = document.createElement("canvas");
    newCanvas.width = canvas.width;
    newCanvas.height = canvas.height;
    const context = newCanvas.getContext("2d");
    context.drawImage(canvas, 0, 0);

    context.font = "12px Arial";
    context.fillStyle = "#1b1b1b";
    context.shadowColor = "black";
    context.shadowBlur = 4;
    context.textAlign = "right";

    const startY = newCanvas.height - 10 - 14.4 * (textLines.length - 1);
    textLines.forEach((line, index) => {
        context.fillText(line, newCanvas.width - 10, startY + 14.4 * index);
    });

    newCanvas.toBlob(blob => {
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `visual_state_${new Date().toISOString()}.jpeg`;
        link.click();
    }, "image/jpeg");
};

document.addEventListener("keydown", event => {
    if (event.shiftKey && event.code === "KeyP") {
        downloadCurrentVisualStateWithText();
    }
});
