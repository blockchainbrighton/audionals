// --- controlsColumn.js ---
import { createElement } from './utils.js';

const defaults = {
  volume: 1, tempo: 78, pitch: 1, multiplier: 1,
  delayTime: 0, delayFeedback: 0,
  filterType: 'lowpass', filterFreq: 20000, filterQ: 1, filterGain: 0
};
const limits = {
  volume: 1.5, tempo: 400, pitch: [0.01, 10], multiplier: 8,
  delayTime: 1.0, delayFeedback: 0.9,
  filterFreq: [10, 22000], filterQ: [0.0001, 100], filterGain: [-40, 40]
};

const formatters = {
  pct: v => Math.round(parseFloat(v) * 100),
  hz: v => Math.round(parseFloat(v)),
  pitch: v => parseFloat(v).toFixed(2),
  q: v => parseFloat(v).toFixed(1),
  gain: v => parseFloat(v).toFixed(1),
  x: v => `x${v}`
};

const accentColors = {
  multiplier: "#d08770",
  "delay-time": "#a3be8c",
  "delay-feedback": "#ebcb8b",
  "filter-freq": "#81a1c1",
  "filter-q": "#d08770",
  "filter-gain": "#bf616a"
};

const createHeader = text =>
  createElement("h3", {
    textContent: text,
    style: "margin-top:20px;margin-bottom:5px;border-bottom:1px solid #555;padding-bottom:3px;font-size:1.1em;color:#ddd;"
  });

const createControlGroup = (label, id, type, minOrOpts, max, step, def, unit = "", format = v => String(v)) => {
  const valueId = `${id}-value`, inputId = `${id}-${type === 'range' ? 'slider' : 'select'}`;
  const children = [createElement("label", { for: inputId, textContent: label })];

  if (type === 'range') {
    children.push(createElement("input", {
      type, id: inputId, min: String(minOrOpts), max: String(max), step: String(step), value: String(def), disabled: true
    }));
    children.push(createElement("span", { className: "value-display" }, [
      createElement("span", { id: valueId, textContent: format(def) }), unit
    ]));
  } else {
    const options = minOrOpts.map(({ value, text }) =>
      createElement("option", { value, textContent: text, ...(value === def && { selected: true }) }));
    children.push(createElement("select", { id: inputId, disabled: true }, options));
  }

  return createElement("div", { className: "control-group" }, children);
};

export function createControlsColumn() {
  const controls = [
    createElement("div", { id: "error-message", className: "error" }),
    createElement("div", { className: "button-group" }, [
      createElement("button", { id: "play-once-btn", disabled: true, textContent: "Play Once" }),
      createElement("button", { id: "loop-toggle-btn", disabled: true, textContent: "Play Loop: Off" }),
      createElement("button", { id: "reverse-toggle-btn", disabled: true, textContent: "Reverse: Off" })
    ]),
    createControlGroup("Volume:", "volume", "range", "0.0", String(limits.volume), "0.01", defaults.volume, "%", formatters.pct),
    createControlGroup("Tempo:", "tempo", "range", "1", String(limits.tempo), "1", defaults.tempo, " BPM"),
    createControlGroup("Pitch:", "pitch", "range", ...limits.pitch.map(String), "0.01", defaults.pitch, "x", formatters.pitch),
    createControlGroup("Multiplier:", "multiplier", "range", "1", String(limits.multiplier), "1", defaults.multiplier, "", formatters.x),
    createHeader("Effects"),
    createControlGroup("Delay Time:", "delay-time", "range", "0", String(limits.delayTime), "0.01", defaults.delayTime, " s", formatters.pitch),
    createControlGroup("Delay Fbk:", "delay-feedback", "range", "0", String(limits.delayFeedback), "0.01", defaults.delayFeedback, "%", formatters.pct),
    createControlGroup("Filter Type:", "filter-type", "select", [
      { value: "lowpass", text: "Lowpass" }, { value: "highpass", text: "Highpass" },
      { value: "bandpass", text: "Bandpass" }, { value: "notch", text: "Notch" },
      { value: "peaking", text: "Peaking" }, { value: "lowshelf", text: "Lowshelf" },
      { value: "highshelf", text: "Highshelf" }, { value: "allpass", text: "Allpass" }
    ], null, null, defaults.filterType),
    createControlGroup("Filter Freq:", "filter-freq", "range", ...limits.filterFreq.map(String), "1", defaults.filterFreq, " Hz", formatters.hz),
    createControlGroup("Filter Q:", "filter-q", "range", ...limits.filterQ.map(String), "0.1", defaults.filterQ, "", formatters.q),
    createControlGroup("Filter Gain:", "filter-gain", "range", ...limits.filterGain.map(String), "0.1", defaults.filterGain, " dB", formatters.gain),
    createHeader("MIDI"),
    createElement("div", { className: "midi-controls control-group" }, [
      createElement("label", { for: "midi-device-select", textContent: "MIDI In:" }),
      createElement("select", { id: "midi-device-select", disabled: true }, [
        createElement("option", { value: "", textContent: "Loading MIDI..." })
      ]),
      createElement("span", { id: "midi-status", className: "value-display", textContent: "Unavailable" })
    ])
  ];

  const column = createElement("div", { className: "controls-column hidden" }, [
    createElement("div", { className: "title-bar" }, [
      createElement("h1", { textContent: "OB1 - Audional Art" }),
      createElement("button", {
        id: "info-toggle-btn", title: "Show/Hide Keyboard Shortcuts", textContent: "ℹ️"
      })
    ]),
    createElement("div", { className: "metadata-placeholder" }),
    createElement("div", { id: "controls-container", className: "controls disabled" }, controls)
  ]);

  Object.entries(accentColors).forEach(([id, color]) => {
    const el = column.querySelector(`#${id}-slider`);
    if (el) el.style.accentColor = color;
  });

  return column;
}
