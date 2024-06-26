// visualiserStateAssignments.js

function getAssignments(renderingState) {
    return Array.from({ length: TOTAL_CHANNELS }, (_, i) => {
        const { arrayIndex, cci2 } = renderingState[i + 1] || {};
        return arrayIndex !== undefined && cci2 !== undefined
            ? `Channel ${i + 1}: ArrayIndex=${arrayIndex}, CCI2=${cci2}`
            : `Channel ${i + 1}: Unassigned`;
    });
}

function getTimecode() {
    return window.playbackStartTime === undefined ? 0 : Date.now() - window.playbackStartTime;
}
