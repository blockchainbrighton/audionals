// --- START OF FILE controlsColumn.js ---

// // --- controlsColumn.js ---
// import { createElement } from "/content/6ee146a17e6582c989ebaa2f2c8b6a039f29493f858d59a89edfb0d3485a7fc4i0"; // utils.js

import { createElement } from './utils.js';



// Keep existing defaults
const DEFAULT_VOLUME = 1;
const DEFAULT_TEMPO = 78;
const DEFAULT_PITCH = 1;
const DEFAULT_MULTIPLIER = 1;
const MAX_VOLUME = 1.5;
const MAX_TEMPO = 400;
const MAX_PITCH = 10;
const MIN_PITCH = 0.01;
const MAX_MULTIPLIER = 8;

// Add defaults/limits for new effects
const DEFAULT_DELAY_TIME = 0;
const DEFAULT_DELAY_FEEDBACK = 0;
const DEFAULT_FILTER_TYPE = 'lowpass';
const DEFAULT_FILTER_FREQ = 20000; // Will be clamped by audioProcessor based on sampleRate
const DEFAULT_FILTER_Q = 1;
const DEFAULT_FILTER_GAIN = 0; // dB

const MAX_DELAY_TIME = 1.0; // seconds
const MAX_DELAY_FEEDBACK = 0.9; // Gain (0-0.9 to avoid easy explosion)
const MIN_FILTER_FREQ = 10; // Hz
const MAX_FILTER_FREQ = 22000; // Hz (Approximate max typical)
const MIN_FILTER_Q = 0.0001;
const MAX_FILTER_Q = 100;
const MIN_FILTER_GAIN = -40; // dB
const MAX_FILTER_GAIN = 40; // dB


// Helper to create control groups (Sliders or Selects)
const createControlGroup = (
    label,
    idBase, // e.g., "volume", "filter-freq"
    type, // "range" or "select"
    minOrOptions, // min value (range) or array of {value, text} objects (select)
    max, // max value (range) or null (select)
    step, // step value (range) or null (select)
    defaultValue, // initial value
    unit = "", // e.g., " BPM", " %", " Hz"
    valueFormatter = (val => String(val)) // Function to format display value
) => {
    const valueDisplayId = `${idBase}-value`;
    const inputId = type === 'range' ? `${idBase}-slider` : `${idBase}-select`;
    const displayValue = type === 'range' ? valueFormatter(defaultValue) : defaultValue; // Select shows value directly initially

    const children = [
        createElement("label", { for: inputId, textContent: label }),
    ];

    if (type === 'range') {
        children.push(createElement("input", {
            type: "range",
            id: inputId,
            min: String(minOrOptions),
            max: String(max),
            step: String(step),
            value: String(defaultValue),
            disabled: true // Start disabled
        }));
        children.push(createElement("span", { className: "value-display" }, [
            createElement("span", { id: valueDisplayId, textContent: displayValue }),
            unit
        ]));
    } else if (type === 'select') {
        const options = minOrOptions.map(opt =>
            createElement("option", { value: opt.value, textContent: opt.text })
        );
        // Set selected attribute on the default option
        const defaultOption = options.find(opt => opt.value === defaultValue);
        if (defaultOption) {
            defaultOption.setAttribute('selected', true);
        }

        children.push(createElement("select", { id: inputId, disabled: true }, options));
         // Select usually doesn't need a separate value display span
    }

    return createElement("div", { className: "control-group" }, children);
};

export function createControlsColumn() {
    const column = createElement("div", { className: "controls-column hidden" }, [
        createElement("div", { className: "title-bar" }, [
            createElement("h1", { textContent: "OB1 - Audional Art" }),
            createElement("button", { id: "info-toggle-btn", title: "Show/Hide Keyboard Shortcuts", textContent: "ℹ️" })
        ]),
        createElement("div", { className: "metadata-placeholder" }), // Metadata will be moved here
        createElement("div", { id: "controls-container", className: "controls disabled" }, [
            createElement("div", { id: "error-message", className: "error" }), // For displaying errors

            // --- Playback Buttons ---
            createElement("div", { className: "button-group" }, [
                createElement("button", { id: "play-once-btn", disabled: true, textContent: "Play Once" }),
                createElement("button", { id: "loop-toggle-btn", disabled: true, textContent: "Play Loop: Off" }),
                createElement("button", { id: "reverse-toggle-btn", disabled: true, textContent: "Reverse: Off" })
            ]),

            // --- Core Parameter Sliders ---
            createControlGroup("Volume:", "volume", "range",
                "0.0", String(MAX_VOLUME), "0.01", String(DEFAULT_VOLUME),
                "%", (v => Math.round(parseFloat(v) * 100))
            ),
            createControlGroup("Tempo:", "tempo", "range",
                "1", String(MAX_TEMPO), "1", String(DEFAULT_TEMPO),
                " BPM"
            ),
            createControlGroup("Pitch:", "pitch", "range",
                String(MIN_PITCH), String(MAX_PITCH), "0.01", String(DEFAULT_PITCH),
                "x", (v => parseFloat(v).toFixed(2)) // Display pitch as multiplier
            ),
            createControlGroup("Multiplier:", "multiplier", "range",
                "1", String(MAX_MULTIPLIER), "1", String(DEFAULT_MULTIPLIER),
                "", (v => `x${v}`)
            ),

            // --- Effect Controls ---
             createElement("h3", {textContent:"Effects", style:"margin-top: 20px; margin-bottom: 5px; border-bottom: 1px solid #555; padding-bottom: 3px; font-size: 1.1em; color: #ddd;"}), // Section Header

            createControlGroup("Delay Time:", "delay-time", "range",
                "0", String(MAX_DELAY_TIME), "0.01", String(DEFAULT_DELAY_TIME),
                " s", (v => parseFloat(v).toFixed(2))
             ),
             createControlGroup("Delay Fbk:", "delay-feedback", "range",
                 "0", String(MAX_DELAY_FEEDBACK), "0.01", String(DEFAULT_DELAY_FEEDBACK),
                 "%", (v => Math.round(parseFloat(v) * 100))
             ),
             createControlGroup("Filter Type:", "filter-type", "select",
                [ // Options for the select dropdown
                    { value: "lowpass", text: "Lowpass" },
                    { value: "highpass", text: "Highpass" },
                    { value: "bandpass", text: "Bandpass" },
                    { value: "notch", text: "Notch" },
                    { value: "peaking", text: "Peaking" },
                    { value: "lowshelf", text: "Lowshelf" },
                    { value: "highshelf", text: "Highshelf" },
                    { value: "allpass", text: "Allpass" },
                ],
                 null, null, // Max, Step not applicable for select
                 DEFAULT_FILTER_TYPE
             ),
            createControlGroup("Filter Freq:", "filter-freq", "range",
                String(MIN_FILTER_FREQ), String(MAX_FILTER_FREQ), "1", String(DEFAULT_FILTER_FREQ),
                " Hz", (v => Math.round(parseFloat(v))) // Display frequency in Hz
            ),
             createControlGroup("Filter Q:", "filter-q", "range",
                 String(MIN_FILTER_Q), String(MAX_FILTER_Q), "0.1", String(DEFAULT_FILTER_Q),
                 "", (v => parseFloat(v).toFixed(1))
             ),
            createControlGroup("Filter Gain:", "filter-gain", "range",
                String(MIN_FILTER_GAIN), String(MAX_FILTER_GAIN), "0.1", String(DEFAULT_FILTER_GAIN),
                " dB", (v => parseFloat(v).toFixed(1))
            ),


            // --- MIDI Controls ---
             createElement("h3", {textContent:"MIDI", style:"margin-top: 20px; margin-bottom: 5px; border-bottom: 1px solid #555; padding-bottom: 3px; font-size: 1.1em; color: #ddd;"}), // Section Header

            createElement("div", { className: "midi-controls control-group" }, [
                createElement("label", { for: "midi-device-select", textContent: "MIDI In:" }),
                createElement("select", { id: "midi-device-select", disabled: true }, [
                    createElement("option", { value: "", textContent: "Loading MIDI..." })
                ]),
                createElement("span", { id: "midi-status", className: "value-display", textContent: "Unavailable" })
            ])
        ])
    ]);

    // Style specific sliders if needed (Example for multiplier)
    const multiplierSlider = column.querySelector("#multiplier-slider");
    if (multiplierSlider) {
        multiplierSlider.style.accentColor = "#d08770"; // Existing style
    }
    // Add accent colors for new sliders
    const delayTimeSlider = column.querySelector("#delay-time-slider");
    if (delayTimeSlider) delayTimeSlider.style.accentColor = "#a3be8c"; // Greenish
    const delayFeedbackSlider = column.querySelector("#delay-feedback-slider");
    if (delayFeedbackSlider) delayFeedbackSlider.style.accentColor = "#ebcb8b"; // Yellowish
    const filterFreqSlider = column.querySelector("#filter-freq-slider");
    if (filterFreqSlider) filterFreqSlider.style.accentColor = "#81a1c1"; // Bluish
    const filterQSlider = column.querySelector("#filter-q-slider");
    if (filterQSlider) filterQSlider.style.accentColor = "#d08770"; // Orange
     const filterGainSlider = column.querySelector("#filter-gain-slider");
    if (filterGainSlider) filterGainSlider.style.accentColor = "#bf616a"; // Reddish

    return column;
}
// --- END OF FILE controlsColumn.js ---