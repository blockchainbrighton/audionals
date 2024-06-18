// colorWorker.js
{
const R = 100; // Set a default or required value for R in this context

// Utility function to generate modulated RGBA color
function modulatedColor(color, modulator, alpha) {
    const r = Math.min(Math.floor(parseInt(color.slice(1, 3), 16) * modulator), 255);
    const g = Math.min(Math.floor(parseInt(color.slice(3, 5), 16) * modulator), 255);
    const b = Math.min(Math.floor(parseInt(color.slice(5, 7), 16) * modulator), 255);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// Main function to get colors
function getColors6(o, a, l) {
    const randomValues = Array.from({ length: 50 }, () => Math.random());
    const primaryAndSecondaryColors = ["#FF0000", "#00FF00", "#0000FF", "#FFD700", "#C0C0C0", "#FF1493", "#B20000", "#000000", "#8000FF"];
    const modulators = [0.1, 0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 2.5, 3];
    
    const l0zR = l[0].z + R;

    // Calculate the base disco eye color using a random value
    const discoEyeColor = Math.floor(randomValues[21] * (l0zR / (2 * R) * 255));
    const discoEye = `rgb(${discoEyeColor}, ${discoEyeColor}, ${discoEyeColor})`;

    // Generate color variations with primary and secondary colors
    const colors = primaryAndSecondaryColors.flatMap(color => {
        return modulators.map(modulator => {
            const alpha = randomValues[Math.floor(Math.random() * randomValues.length)].toFixed(2);
            return modulatedColor(color, modulator, alpha);
        });
    });

    // Return the final color array including disco eye and color variations
    return [discoEye, ...colors];
}

self.onmessage = function(event) {
    try {
        const { o, a, l } = event.data;
        const colors = getColors6(o, a, l);
        self.postMessage(colors);
    } catch (error) {
        console.error('Error in Web Worker:', error);
        self.postMessage({ error: error.message });
    }
};
}