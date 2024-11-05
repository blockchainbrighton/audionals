// settings.js

(function(global) {
    global.NeonShapeDrawer = global.NeonShapeDrawer || {};

    const NS = global.NeonShapeDrawer;

    // Abbreviations for Settings
    NS.SETTING_ABBREVIATIONS = {
        speed: 'sp',
        offset: 'of',
        frequency: 'fr',
        tailLength: 'tl',
        noiseLevel: 'nl',
        timeSpeed: 'ts',
    };

    // Mapping from Abbreviation to Full Setting Name
    NS.ABBREV_TO_SETTING = (function() {
        const map = {};
        const abbreviations = NS.SETTING_ABBREVIATIONS;
        for (const key in abbreviations) {
            if (abbreviations.hasOwnProperty(key)) {
                map[abbreviations[key]] = key;
            }
        }
        return map;
    })();

    /* Shared Fade Types */
    NS.FADE_TYPES = {
        linear: {
            description: 'Constant rate of change',
            stepRate: 10.0, // Percentage of the difference to apply each step
        },
        convex: {
            description: 'Accelerating rate of change',
            stepRate: 12.0,
        },
        exponential: {
            description: 'Rapid, non-linear increase in change rate',
            stepRate: 15.0,
        },
        concave: {
            description: 'Decelerating rate of change',
            stepRate: 8.0,
        },
        logarithmic: {
            description: 'Slow start, rapid increase',
            stepRate: 9.0,
        },
        sigmoid: {
            description: 'Gradual start and end with rapid middle change',
            stepRate: 11.0,
        },
        stepwise: {
            description: 'Discrete jumps in values',
            stepRate: 20.0,
        },
        cubic: {
            description: 'Smooth, cubic progression',
            stepRate: 13.0,
        },
        bounce: {
            description: 'Overshoot and settle',
            stepRate: 14.0,
        },
        elastic: {
            description: 'Oscillating overshoots',
            stepRate: 16.0,
        },
        // Add more fade types as needed
    };

    /* Function to Apply Fade Type */
    /**
     * Applies a fade type to calculate the next value towards the target.
     * @param {number} currentValue - The current value of the setting.
     * @param {string} fadeType - The type of fade to apply.
     * @param {number} target - The target value to reach.
     * @returns {number} - The updated value after applying the fade.
     */
    NS.applyFade = function(currentValue, fadeType, target) {
        const fade = NS.FADE_TYPES[fadeType];
        if (!fade) {
            console.error(`Fade type "${fadeType}" is not defined.`);
            return currentValue;
        }

        const difference = target - currentValue;
        const step = difference * (fade.stepRate / 100);

        // Determine action type based on difference
        if (difference > 0) {
            // Increment
            return parseFloat((currentValue + step).toFixed(2));
        } else if (difference < 0) {
            // Decrement
            return parseFloat((currentValue + step).toFixed(2));
        } else {
            // No change
            return currentValue;
        }
    };

    /* Serialized Phases Sets with Shared Fade Types */

    // Serialized Phases Set 1: Linear Journey
    NS.serializedPhasesSet1 = [
        { a: 'of', t: 'set', v: 50 },
        { a: 'sp', t: 'inc', fadeType: 'linear', target: 5.0 },
        { a: 'fr', t: 'inc', fadeType: 'linear', target: 10.0 },
        { a: 'tl', t: 'inc', fadeType: 'linear', target: 1000 },
        { a: 'nl', t: 'inc', fadeType: 'linear', target: 10.0 },
        { a: 'of', t: 'dec', fadeType: 'linear', target: 0 },
    ];

    // Serialized Phases Set 2: Exponential Acceleration
    NS.serializedPhasesSet2 = [
        { a: 'of', t: 'set', v: 50 },
        { a: 'sp', t: 'inc', fadeType: 'exponential', target: 5.0 },
        { a: 'fr', t: 'inc', fadeType: 'exponential', target: 10.0 },
        { a: 'tl', t: 'inc', fadeType: 'exponential', target: 1000 },
        { a: 'nl', t: 'inc', fadeType: 'exponential', target: 10.0 },
        { a: 'of', t: 'dec', fadeType: 'exponential', target: 0 },
    ];

    // Serialized Phases Set 3: Concave Deceleration
    NS.serializedPhasesSet3 = [
        { a: 'of', t: 'set', v: 50 },
        { a: 'sp', t: 'inc', fadeType: 'concave', target: 5.0 },
        { a: 'fr', t: 'inc', fadeType: 'concave', target: 10.0 },
        { a: 'tl', t: 'inc', fadeType: 'concave', target: 1000 },
        { a: 'nl', t: 'inc', fadeType: 'concave', target: 10.0 },
        { a: 'of', t: 'dec', fadeType: 'concave', target: 0 },
    ];

    // Serialized Phases Set 4: Convex Acceleration with Oscillations
    NS.serializedPhasesSet4 = [
        { a: 'of', t: 'set', v: 50 },
        { a: 'sp', t: 'inc', fadeType: 'convex', target: 5.0 },
        { a: 'fr', t: 'inc', fadeType: 'convex', target: 10.0 },
        { a: 'sp', t: 'dec', fadeType: 'convex', target: 3.0 },
        { a: 'fr', t: 'dec', fadeType: 'convex', target: 8.0 },
        { a: 'sp', t: 'inc', fadeType: 'convex', target: 5.0 },
        { a: 'fr', t: 'inc', fadeType: 'convex', target: 10.0 },
        { a: 'tl', t: 'inc', fadeType: 'convex', target: 1000 },
        { a: 'nl', t: 'inc', fadeType: 'convex', target: 10.0 },
        { a: 'of', t: 'dec', fadeType: 'convex', target: 0 },
    ];

    // Serialized Phases Set 5: Logarithmic Growth
    NS.serializedPhasesSet5 = [
        { a: 'of', t: 'set', v: 50 },
        { a: 'sp', t: 'inc', fadeType: 'logarithmic', target: 5.0 },
        { a: 'fr', t: 'inc', fadeType: 'logarithmic', target: 10.0 },
        { a: 'tl', t: 'inc', fadeType: 'logarithmic', target: 1000 },
        { a: 'nl', t: 'inc', fadeType: 'logarithmic', target: 10.0 },
        { a: 'of', t: 'dec', fadeType: 'logarithmic', target: 0 },
    ];

    // Serialized Phases Set 6: Sigmoid Progression
    NS.serializedPhasesSet6 = [
        { a: 'of', t: 'set', v: 50 },
        { a: 'sp', t: 'inc', fadeType: 'sigmoid', target: 5.0 },
        { a: 'fr', t: 'inc', fadeType: 'sigmoid', target: 10.0 },
        { a: 'tl', t: 'inc', fadeType: 'sigmoid', target: 1000 },
        { a: 'nl', t: 'inc', fadeType: 'sigmoid', target: 10.0 },
        { a: 'of', t: 'dec', fadeType: 'sigmoid', target: 0 },
    ];

    // Serialized Phases Set 7: Stepwise Increments
    NS.serializedPhasesSet7 = [
        { a: 'of', t: 'set', v: 50 },
        { a: 'sp', t: 'inc', fadeType: 'stepwise', target: 5.0 },
        { a: 'sp', t: 'inc', fadeType: 'stepwise', target: 10.0 },
        { a: 'fr', t: 'inc', fadeType: 'stepwise', target: 15.0 },
        { a: 'fr', t: 'inc', fadeType: 'stepwise', target: 20.0 },
        { a: 'tl', t: 'inc', fadeType: 'stepwise', target: 1500 },
        { a: 'tl', t: 'inc', fadeType: 'stepwise', target: 2000 },
        { a: 'nl', t: 'inc', fadeType: 'stepwise', target: 20.0 },
        { a: 'nl', t: 'dec', fadeType: 'stepwise', target: 10.0 },
        { a: 'of', t: 'dec', fadeType: 'stepwise', target: 0 },
    ];

    // Serialized Phases Set 8: Cubic Smoothness
    NS.serializedPhasesSet8 = [
        { a: 'of', t: 'set', v: 50 },
        { a: 'sp', t: 'inc', fadeType: 'cubic', target: 5.0 },
        { a: 'fr', t: 'inc', fadeType: 'cubic', target: 10.0 },
        { a: 'tl', t: 'inc', fadeType: 'cubic', target: 1000 },
        { a: 'nl', t: 'inc', fadeType: 'cubic', target: 10.0 },
        { a: 'of', t: 'dec', fadeType: 'cubic', target: 0 },
    ];

    // Serialized Phases Set 9: Bouncing Overshoots
    NS.serializedPhasesSet9 = [
        { a: 'of', t: 'set', v: 50 },
        { a: 'sp', t: 'inc', fadeType: 'bounce', target: 6.0 },
        { a: 'sp', t: 'dec', fadeType: 'bounce', target: 5.0 },
        { a: 'fr', t: 'inc', fadeType: 'bounce', target: 11.0 },
        { a: 'fr', t: 'dec', fadeType: 'bounce', target: 10.0 },
        { a: 'tl', t: 'inc', fadeType: 'bounce', target: 1100 },
        { a: 'tl', t: 'dec', fadeType: 'bounce', target: 1000 },
        { a: 'nl', t: 'inc', fadeType: 'bounce', target: 11.0 },
        { a: 'nl', t: 'dec', fadeType: 'bounce', target: 10.0 },
        { a: 'of', t: 'dec', fadeType: 'bounce', target: 0 },
    ];

    // Serialized Phases Set 10: Elastic Oscillations
    NS.serializedPhasesSet10 = [
        { a: 'of', t: 'set', v: 50 },
        { a: 'sp', t: 'inc', fadeType: 'elastic', target: 5.0 },
        { a: 'sp', t: 'dec', fadeType: 'elastic', target: 4.0 },
        { a: 'sp', t: 'inc', fadeType: 'elastic', target: 5.0 },
        { a: 'fr', t: 'inc', fadeType: 'elastic', target: 10.0 },
        { a: 'fr', t: 'dec', fadeType: 'elastic', target: 9.0 },
        { a: 'fr', t: 'inc', fadeType: 'elastic', target: 10.0 },
        { a: 'tl', t: 'inc', fadeType: 'elastic', target: 1000 },
        { a: 'tl', t: 'dec', fadeType: 'elastic', target: 900 },
        { a: 'nl', t: 'inc', fadeType: 'elastic', target: 10.0 },
        { a: 'nl', t: 'dec', fadeType: 'elastic', target: 9.0 },
        { a: 'of', t: 'dec', fadeType: 'elastic', target: 0 },
    ];

    // Function to Set Current Serialized Phases
    /**
     * Sets the current serializedPhases to one of the predefined sets.
     * @param {number|string} setIdentifier - The identifier of the serializedPhases set (1-10 or set name).
     */
    NS.setSerializedPhases = function(setIdentifier) {
        let setName = '';

        if (typeof setIdentifier === 'number') {
            setName = 'serializedPhasesSet' + setIdentifier;
        } else if (typeof setIdentifier === 'string') {
            setName = setIdentifier;
        } else {
            console.error('Invalid setIdentifier type. Must be a number or string.');
            return;
        }

        if (NS[setName]) {
            NS.serializedPhases = NS[setName];
            console.log(`Serialized phases set to ${setName}`);
        } else {
            console.error(`Serialized phases set ${setName} does not exist.`);
        }
    };

    // Default to Set 8
    NS.setSerializedPhases(8);

})(window);
