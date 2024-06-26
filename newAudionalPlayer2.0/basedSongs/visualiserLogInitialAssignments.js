// visualiserLogInitialAssignments.js

let assignmentsComplete = false;

const logInitialAssignments = (seed, selectArrayIndex, calculateCCI2, arrayLengths, renderingState, activeArrayIndex) => {
    setTimeout(() => {
        const assignments = [];
        try {
            console.log(`Access Level: ${AccessLevel}`);
            for (let i = 1; i <= TOTAL_CHANNELS; i++) {
                const arrayIndex = selectArrayIndex(seed, AccessLevel, i);
                const cci2 = calculateCCI2(i, arrayLengths[arrayIndex]);
                renderingState[i] = { arrayIndex, cci2 };
                activeArrayIndex[i] = arrayIndex;
                assignments.push(`Channel ${i}: ArrayIndex=${arrayIndex}, CCI2=${cci2}`);
            }
            console.log("Initial Assignments:", assignments.join("; "));
            assignmentsComplete = true;
        } catch (err) {
            errorLog("Error during initial assignments", err);
        }
    }, 100);
};
