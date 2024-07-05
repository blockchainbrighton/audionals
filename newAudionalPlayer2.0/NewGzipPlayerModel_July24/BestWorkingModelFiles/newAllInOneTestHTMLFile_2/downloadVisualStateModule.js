// downloadVisualStateModule.js

const TOTAL_CHANNELS = 16;

function downloadCurrentVisualStateWithText() {
    const canvas = document.querySelector("canvas");
    if (!canvas) {
        return console.error("No canvas element found.");
    }

    const t = {
        accessLevel: AccessLevel,
        assignments: getAssignments(),
        timecode: getTimecode()
    };

    const textContent = `
        Access Level: ${t.accessLevel}
        Assignments: 
        ${t.assignments.join("\n")}
        Timecode: ${t.timecode} ms
    `.trim();

    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const ctx = tempCanvas.getContext("2d");
    ctx.drawImage(canvas, 0, 0);

    ctx.font = "12px Arial";
    ctx.fillStyle = "red";
    ctx.shadowColor = "black";
    ctx.shadowBlur = 4;
    ctx.textAlign = "right";
    textContent.split("\n").forEach((line, index) => {
        ctx.fillText(line, tempCanvas.width - 10, tempCanvas.height - 10 - 14.4 * index);
    });

    tempCanvas.toBlob((blob) => {
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `visual_state_${new Date().toISOString()}.jpeg`;
        link.click();
    }, "image/jpeg");
}

document.addEventListener("keydown", (e) => {
    if (e.key === "p" || e.key === "P") {
        downloadCurrentVisualStateWithText();
    }
});
