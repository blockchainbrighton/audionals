const downloadCurrentVisualStateWithText = () => {
    const canvas = document.querySelector("canvas");
    if (!canvas) return console.error("No canvas element found.");

    const { accessLevel, assignments, timecode } = {
        accessLevel: AccessLevel,
        assignments: getAssignments(renderingState),
        timecode: getTimecode()
    };

    const textLines = [
        `Access Level: ${accessLevel}`,
        "Assignments:",
        ...assignments.map((a, i) => `Channel ${i + 1}: ${a}`),
        `Timecode: ${timecode} ms`
    ];

    const newCanvas = document.createElement("canvas");
    newCanvas.width = canvas.width;
    newCanvas.height = canvas.height;
    const ctx = newCanvas.getContext("2d");
    ctx.drawImage(canvas, 0, 0);
    ctx.font = "12px Arial";
    ctx.fillStyle = "#1b1b1b";
    ctx.shadowColor = "black";
    ctx.shadowBlur = 4;
    ctx.textAlign = "right";

    const startY = newCanvas.height - 10 - 14.4 * (textLines.length - 1);
    textLines.forEach((line, i) => ctx.fillText(line, newCanvas.width - 10, startY + 14.4 * i));

    newCanvas.toBlob(blob => {
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `visual_state_${new Date().toISOString()}.jpeg`;
        link.click();
    }, "image/jpeg");
};

document.addEventListener("keydown", e => {
    if (e.shiftKey && e.code === "KeyP") downloadCurrentVisualStateWithText();
});
