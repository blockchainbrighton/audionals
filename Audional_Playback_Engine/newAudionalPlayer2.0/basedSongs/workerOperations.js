// workerOperations.js
function initializeWorker() {
    if (!window.Worker) {
        return console.error("Web Workers are not supported in your browser.");
    }

    const workerBlob = new Blob([`
        let stepDuration;
        let timerID;

        self.onmessage = ({ data }) => {
            if (data.action === 'start') {
                stepDuration = data.stepDuration * 500; // Convert to milliseconds
                startScheduling();
            } else if (data.action === 'stop') {
                clearInterval(timerID);
            }
        };

        function startScheduling() {
            clearInterval(timerID);
            timerID = setInterval(() => postMessage({ action: 'scheduleNotes' }), stepDuration);
        }
    `], { type: "application/javascript" });

    const workerURL = URL.createObjectURL(workerBlob);
    audioWorker = new Worker(workerURL);

    audioWorker.onmessage = ({ data }) => {
        if (data.action === 'scheduleNotes') {
            scheduleNotes();
        }
    };

    window.addEventListener("beforeunload", cleanUpWorker);
}

function startWorker() {
    audioWorker?.postMessage({ action: "start", stepDuration: getStepDuration() });
}

function stopWorker() {
    audioWorker?.postMessage({ action: "stop" });
}

function getStepDuration() {
    return 60 / (globalJsonData?.projectBPM || 120) / 4;
}
