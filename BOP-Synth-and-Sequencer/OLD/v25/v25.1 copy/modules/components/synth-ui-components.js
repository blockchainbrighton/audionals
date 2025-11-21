/**
 * Module: BOP-SYNTH-V12/BopSynthUIComponent.js
 * Purpose: BopSynthUIComponent class implementation
 * Exports: BopSynthUIComponent
 * Depends on: BopSynthUI.js
 */

// In BOP-SYNTH-V12/BopSynthUIComponent.js (NEW FILE)

import { BopSynthUI } from '../synth/synth-ui.js';

// Define the HTML structure and CSS styles as strings.
// This is the key: they are now part of the component's JS.
const auiTemplate = document.createElement('template');
auiTemplate.innerHTML = `
    <style>
        /* =================== ROOT VARIABLES =================== */
        :host { /* ':host' refers to the <bop-synth-ui> element itself */
            --bg: #181818; --panel: #232323; --key-w: #f8f8f8; --key-b: #181818;
            --accent: #bb86fc; --accent2: #03dac6; --border: 8px;
            display: block; /* Important for a custom element */
        }
        
        /* --- PASTE YOUR ENTIRE style.css HERE --- */
        /* IMPORTANT: Do not include the 'body' or 'h1' global styles, only component styles. */
        
        .container { max-width: 1100px; margin: auto; }
        h1 {
            font-size: 2rem; text-align: center; margin-bottom: 8px;
            background: linear-gradient(90deg, var(--accent), var(--accent2));
            -webkit-background-clip: text; color: transparent;
        }
        .subtitle { text-align: center; color: #aaa; margin-bottom: 18px; }
        footer { text-align: center; margin-top: 26px; color: #999; font-size: .92rem; }
        .top-toolbar {
            display: flex;
            flex-wrap: wrap;
            gap: 16px;
            align-items: stretch;
            justify-content: space-between;
            background: var(--panel);
            border-radius: var(--border);
            padding: 16px;
            margin-bottom: 18px;
            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.25);
        }
        .top-toolbar > * {
            flex: 1 1 280px;
        }
        
        /* =================== TABS & PANELS =================== */
        .tabs {
            display: flex; background: var(--panel); border-radius: var(--border);
            margin-bottom: 18px;
        }
        .tab-button {
            flex: 1; padding: 14px; background: none; border: none; color: #aaa;
            font-size: 1rem; cursor: pointer; transition: all 0.2s ease;
        }
        .tab-button:is(.active, :focus) {
            background: #101018; color: var(--accent); font-weight: bold;
        }
        .tab-content {
            display: none; background: var(--panel); border-radius: var(--border);
            padding: 24px 18px; min-height: 340px;
        }
        .tab-content.active { display: block; }
        
        /* =================== CONTROL PANEL =================== */
        .control-panel {
            display: flex; gap: 16px; flex-wrap: wrap; margin-bottom: 20px;
        }
        .control-group {
            background: #181818; border: 1px solid #333; border-radius: var(--border);
            flex: 1; min-width: 200px; padding: 14px;
        }
        .control-group h3 {
            color: var(--accent2); margin: 0 0 12px 0; font-size: 1.1rem;
            font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;
        }
        .control-row {
            display: flex; align-items: center; gap: 8px; margin-bottom: 10px;
            flex-wrap: wrap; min-height: 32px;
        }
        .control-label { flex: 1 1 auto; min-width: 80px; font-size: 0.9rem; color: #ccc; }
        .control-value {
            flex: 0 0 auto; min-width: 45px; text-align: right; font-size: 0.8rem;
            color: var(--accent2); font-family: monospace;
        }
        
        /* =================== COMMON INPUTS =================== */
        select, input[type="range"], input[type="number"] {
            background: var(--panel); color: #fff; border: 1px solid #444;
            border-radius: 4px; font-size: 0.9rem; outline: none;
            transition: border-color 0.2s;
        }
        select:focus, input[type="range"]:focus, input[type="number"]:focus {
            border-color: var(--accent);
            outline: 2px solid var(--accent); outline-offset: 1px;
        }
        select { padding: 6px 8px; cursor: pointer; }
        input[type="number"] { padding: 4px 6px; text-align: center; width: 60px; }
        input[type="range"] {
            flex: 2 1 100px; min-width: 80px; height: 6px; -webkit-appearance: none;
            background: #333; border-radius: 3px; outline: none; transition: background 0.2s;
        }
        input[type="range"]:hover { background: #444; }
        input[type="range"]::-webkit-slider-thumb {
            -webkit-appearance: none; width: 18px; height: 18px; border-radius: 50%;
            background: var(--accent); cursor: pointer; box-shadow: 0 2px 4px rgba(0,0,0,0.3);
            transition: all 0.2s;
        }
        input[type="range"]::-webkit-slider-thumb:hover {
            background: var(--accent2); transform: scale(1.1);
            box-shadow: 0 0 8px var(--accent)80;
        }
        input[type="range"]::-moz-range-thumb {
            width: 18px; height: 18px; border-radius: 50%; background: var(--accent);
            cursor: pointer; border: none; box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        }
        
        /* =================== BUTTONS (TRANSPORT, SAVE/LOAD) =================== */
        /* --- Container for all transport and save/load buttons --- */
        .transport-controls {
            display: flex;
            justify-content: center;
            gap: 18px;
            margin: 0;
            flex-wrap: wrap;
            align-items: center;
        }
        
        /* --- Base Button Styles (Simplified with :is()) --- */
        :is(.transport-button, .save-button, .load-button) {
            padding: 12px 28px;
            border-radius: 999px;
            background: linear-gradient(145deg, rgba(42, 40, 64, 0.92), rgba(26, 24, 40, 0.9));
            border: 1px solid rgba(187, 134, 252, 0.55);
            color: #f7f8ff;
            font: inherit;
            font-weight: 600;
            letter-spacing: 0.06em;
            text-transform: uppercase;
            cursor: pointer;
            outline: none;
            display: flex;
            align-items: center;
            gap: 9px;
            box-shadow: 0 10px 28px rgba(3, 218, 198, 0.1), 0 4px 14px rgba(0, 0, 0, 0.55);
            transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease, background 0.18s ease;
        }
        :is(.transport-button, .save-button, .load-button):is(:focus, :hover) {
            transform: translateY(-2px) scale(1.02);
            box-shadow: 0 18px 38px rgba(3, 218, 198, 0.18), 0 8px 18px rgba(0, 0, 0, 0.42);
            border-color: rgba(3, 218, 198, 0.82);
        }
        :is(.transport-button, .save-button, .load-button):active {
            transform: translateY(0) scale(0.97);
            box-shadow: 0 6px 16px rgba(3, 218, 198, 0.12), 0 3px 8px rgba(0, 0, 0, 0.55);
        }
        :is(.transport-button, .save-button, .load-button):disabled {
            opacity: 0.5; cursor: default; box-shadow: none; filter: grayscale(0.1);
        }
        
        .transport-button.play-btn {
            background: linear-gradient(135deg, rgba(3, 218, 198, 0.85), rgba(0, 140, 150, 0.95));
            border-color: rgba(3, 218, 198, 0.8);
            color: #001f24;
        }
        .transport-button.record-btn {
            background: linear-gradient(135deg, rgba(244, 67, 54, 0.9), rgba(179, 27, 16, 0.95));
            border-color: rgba(244, 67, 54, 0.85);
        }
        .transport-button.stop-btn {
            background: linear-gradient(135deg, rgba(187, 134, 252, 0.88), rgba(120, 82, 200, 0.92));
            border-color: rgba(187, 134, 252, 0.82);
        }
        .transport-button.clear-btn {
            background: linear-gradient(135deg, rgba(255, 152, 0, 0.88), rgba(215, 102, 0, 0.92));
            border-color: rgba(255, 152, 0, 0.82);
        }
        
        /* --- Save/Load Specifics --- */
        .save-button, .load-button { padding: 9px 20px; font-size: 1rem; gap: 7px; }
        .save-load-status {
            flex-basis: 100%; /* Force onto a new line in the flex container */
            margin: 10px 0 0; /* Add top margin, remove others */
            background: #24262b; color: var(--accent2); border-radius: 4px;
            padding: 5px 11px; font-size: 0.95em; display: none; min-width: 120px; text-align: center;
        }
        .preset-controls {
            display: flex;
            align-items: center;
            justify-content: flex-end;
            gap: 12px;
            flex-wrap: wrap;
            background: #181818;
            border-radius: var(--border);
            padding: 12px 16px;
            border: 1px solid #2f2f2f;
        }
        .preset-controls label {
            font-weight: 600;
            color: var(--accent2);
            letter-spacing: 0.04em;
        }
        .preset-select { min-width: 220px; }
        .preset-random-button {
            padding: 12px 24px;
            border-radius: 999px;
            border: 1px solid rgba(3, 218, 198, 0.68);
            background: linear-gradient(135deg, rgba(32, 32, 54, 0.95), rgba(12, 12, 24, 0.88));
            color: #e8fffb;
            font-weight: 600;
            letter-spacing: 0.06em;
            cursor: pointer;
            transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        .preset-random-button:is(:hover, :focus) {
            transform: translateY(-2px) scale(1.02);
            border-color: rgba(3, 218, 198, 0.95);
            box-shadow: 0 18px 36px rgba(3, 218, 198, 0.18), 0 8px 18px rgba(0, 0, 0, 0.4);
        }
        .preset-random-button:active {
            transform: translateY(0) scale(0.97);
            box-shadow: 0 6px 14px rgba(3, 218, 198, 0.12), 0 3px 8px rgba(0, 0, 0, 0.45);
        }
        
        /* =================== KEYBOARD SECTION (Simplified) =================== */
        .keyboard-container {
            background: var(--panel); border-radius: var(--border);
            padding: 18px 10px 10px; margin: 20px 0;
        }
        .octave-controls { display: flex; justify-content: center; gap: 14px; margin-bottom: 8px; }
        .octave-button {
            padding: 6px 14px; border: none; border-radius: 4px;
            background: var(--panel); color: #fff; cursor: pointer; transition: background-color 0.2s;
        }
        .octave-button:hover { background-color: #3a3a3a; }
        /* Simplified: .keyboard-outer styles are merged into .keyboard */
        .keyboard {
            position: relative; width: 100%; height: 160px; min-width: 300px;
            margin: 0 auto; background: #222; border-radius: 8px;
            overflow: hidden; user-select: none;
        }
        /* Simplified: Common key styles are grouped */
        .key-white, .key-black {
            position: absolute; top: 0; cursor: pointer;
            transition: background 0.09s;
        }
        .key-white {
            background: var(--key-w); border: 1px solid #bbb;
            border-radius: 0 0 6px 6px; z-index: 1; box-shadow: 0 2px 2px #bbb;
            height: 160px;
        }
        .key-black {
            background: var(--key-b); z-index: 2;
            border-radius: 0 0 5px 5px; border: 1.5px solid #222;
            box-shadow: 0 4px 8px #111, 0 1px 0 #666;
            height: 96px;
        }
        /* Simplified: Active states are combined */
        .key-white.active, .key-black.active {
            background: var(--accent);
        }
        .key-label {
            position: absolute; left: 50%; bottom: 6px; transform: translateX(-50%);
            font-size: 0.82rem; color: #333; pointer-events: none;
        }
        
        /* =================== STATUS BAR & MISC =================== */
        .status-bar {
            display: flex; justify-content: space-between; background: #181818;
            border-radius: var(--border); padding: 8px 14px; font-size: .95rem; margin-top: 16px;
        }
        .status-indicator { width: 10px; height: 10px; border-radius: 50%; background: #555; }
        .status-indicator.active { background: var(--accent2); }
        button:disabled { opacity: 0.5; cursor: not-allowed !important; }
        
        /* =================== ANIMATIONS =================== */
        @keyframes pulse {
            50%  { box-shadow: 0 0 24px 6px #ff333399; opacity:0.7; }
        }
        @keyframes pulse-loop {
            50% { opacity: 0.7; }
        }
        @keyframes pulse-voice {
            to { opacity: 0.5; }
        }
        
        /* =================== EFFECTS & LOOP CONTROLS (Condensed) =================== */
        /* --- Enable Switch --- */
        .enable-switch { position: relative; display: inline-block; width: 44px; height: 24px; flex-shrink: 0; }
        .enable-switch input { opacity: 0; width: 0; height: 0; }
        .enable-switch .slider { position: absolute; cursor: pointer; inset: 0; background-color: #333; transition: .3s; border-radius: 24px; border: 1px solid #555; }
        .enable-switch .slider:before { position: absolute; content: ""; height: 18px; width: 18px; left: 2px; bottom: 2px; background-color: #999; transition: .3s; border-radius: 50%; }
        .enable-switch input:checked + .slider { background-color: var(--accent); border-color: var(--accent2); box-shadow: 0 0 8px var(--accent)40; }
        .enable-switch input:focus + .slider { box-shadow: 0 0 1px var(--accent); outline: 2px solid var(--accent); outline-offset: 2px; }
        .enable-switch input:checked + .slider:before { transform: translateX(20px); background-color: #fff; }
        
        /* --- Group Toggle --- */
        .group-title-row { display: flex; align-items: center; cursor: pointer; padding: 4px 0; border-bottom: 1px solid #333; margin-bottom: 12px; user-select: none; }
        .group-toggle { margin-right: 8px; accent-color: var(--accent); width: 1.5em; height: 1.5em; border: 2px solid var(--accent2); border-radius: 5px; background: #19191c; position: relative; cursor: pointer; }
        .group-toggle:checked::after { content: "✓"; color: var(--accent2); font-size: 1.3em; position: absolute; left: 50%; top: 48%; transform: translate(-50%,-60%); }
        .group-toggle:not(:checked)::after { content: "+"; color: var(--accent2); font-size: 1.1em; position: absolute; left: 52%; top: 48%; transform: translate(-50%,-50%); }
        .group-content { transition: max-height 0.3s ease-out, opacity 0.3s ease-out; overflow: hidden; max-height: 1000px; opacity: 1; }
        .group-content-collapsed { max-height: 0; opacity: 0; margin-bottom: 0 !important; }
        
        /* --- Loop Panel --- */
        .loop-panel { background: var(--panel); border-radius: var(--border); padding: 18px; border: 1px solid #333; margin: 16px 0; }
        .loop-title { color: var(--accent2); margin: 0 0 16px 0; font-size: 1.2rem; text-align: center; }
        .loop-section { margin-bottom: 16px; padding-bottom: 12px; border-bottom: 1px solid #333; }
        .loop-section:last-child { border-bottom: none; margin-bottom: 0; }
        .loop-toggle-section { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; }
        .loop-status { padding: 6px 12px; border-radius: 4px; font-size: 0.9rem; font-weight: 600; }
        .loop-status.disabled { background: #333; color: #999; }
        .loop-status.ready { background: var(--accent2); color: #000; }
        .loop-status.active { background: var(--accent); color: #000; animation: pulse-loop 2s infinite; }
        .loop-bounds-controls, .loop-settings-controls, .quantize-controls, .tempo-controls { display: flex; gap: 12px; align-items: end; flex-wrap: wrap; }
        :is(.loop-bound-control, .loop-setting-control, .tempo-control) { display: flex; flex-direction: column; gap: 4px; min-width: 100px; }
        :is(.loop-bound-control, .loop-setting-control, .tempo-control) label { color: #ccc; font-size: 0.9rem; }
        .loop-input, .loop-select { padding: 8px; background: var(--bg); border: 1px solid #444; border-radius: 4px; color: #fff; font-size: 0.95rem; }
        .loop-button { padding: 8px 16px; background: var(--accent2); color: #000; border: none; border-radius: 4px; cursor: pointer; font-size: 0.9rem; font-weight: 600; height: fit-content; }
        .loop-button:hover { background: #05f5e0; }
        
        /* =================== RESPONSIVE =================== */
        @media (max-width: 768px) {
            h1 { font-size: 1.5rem; }
            .top-toolbar {
                flex-direction: column;
                padding: 14px;
            }
            .top-toolbar > * {
                flex: 1 1 100%;
            }
            .preset-controls { justify-content: center; }
            .control-panel, .transport-controls, .loop-bounds-controls, .tempo-controls, .swing-control { flex-direction: column; }
            .transport-controls { gap: 8px; }
            .save-load-status { margin: 8px 0 0 0; min-width: auto; }
            .control-group { min-width: auto; }
            .control-row .control-label { flex-basis: 100%; margin-bottom: 4px; }
            :is(.loop-bounds-controls, .tempo-controls, .swing-control) { align-items: stretch; }
        }
        
        /* =================== ACCESSIBILITY & PREFERENCES =================== */
        @media (prefers-contrast: high) {
            :is(.save-button, .load-button, .enable-switch .slider, .control-group) { border: 2px solid currentColor; }
            input[type="range"]::-webkit-slider-thumb { border: 2px solid #000; }
        }
        /* Simplified: Universal selector removes all animations/transitions */
        @media (prefers-reduced-motion: reduce) {
            * {
                animation: none !important;
                transition: none !important;
            }
            :is(.transport-button, .save-button, .load-button):is(:hover, :focus) {
                transform: none; /* Still remove transform on hover/focus */
            }
        }
        
        /* =================== HIERARCHICAL COLLAPSIBLE CONTROLS =================== */
        
        /* Main grid container for the five top-level columns */
        .control-panel-grid {
            display: flex;
            flex-wrap: wrap; 
            gap: 16px;
            margin-bottom: 20px;
            align-items: flex-start;
        }
        
        /* --- Level 1: Super-Group Columns --- */
        .super-group {
            flex: 1;
            min-width: 190px; /* UPDATED: Reduced min-width to better fit 5 columns */
            background: #181818;
            border: 1px solid #333;
            border-radius: var(--border);
            transition: all 0.3s ease-in-out;
            overflow: hidden;
        }
        
        .super-group-header {
            padding: 14px;
            cursor: pointer;
            user-select: none;
            position: relative;
            padding-left: 35px;
        }
        
        .super-group-header h4 {
            margin: 0;
            color: #fff;
            font-size: 1.1rem;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 0.8px;
        }
        
        .super-group-header::before {
            content: '+'; /* Changed from '+' to 'x' to match the image */
            position: absolute;
            left: 12px;
            top: 50%;
            transform: translateY(-50%) rotate(45deg); /* Start rotated */
            font-size: 1.8rem;
            font-weight: 200;
            color: var(--accent);
            transition: transform 0.3s ease;
        }
        
        .super-group-content {
            max-height: 2000px;
            opacity: 1;
            transition: max-height 0.5s ease-out, opacity 0.4s ease-in-out, padding 0.5s ease-out;
            display: flex;
            flex-direction: column;
            gap: 12px;
            padding: 0 12px 12px 12px;
        }
        
        /* Collapsed State for Super-Groups */
        .super-group.collapsed .super-group-content {
            max-height: 0;
            opacity: 0;
            padding-top: 0;
            padding-bottom: 0;
        }
        .super-group.collapsed .super-group-header::before {
            transform: translateY(-50%) rotate(0deg); /* Rotate back to '+' shape */
        }
        
        
        /* Expanded State for Super-Groups */
        .super-group:not(.collapsed) {
            background: var(--panel);
            border-color: var(--accent);
            box-shadow: 0 0 12px var(--accent)20;
        }
        
        
        /* --- Level 2: Individual Control Buttons (Adapted) --- */
        .control-group {
            background: #181818;
            border: 1px solid #333;
            border-radius: var(--border);
            padding: 0;
            transition: all 0.3s ease-in-out;
            overflow: hidden;
            width: 100%;
        }
        
        .group-header {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 12px;
            cursor: pointer;
            user-select: none;
        }
        
        .group-header::before {
            content: '+';
            color: var(--accent2);
            font-size: 1.2rem;
            font-weight: 600;
            transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }
        
        .group-header h3 {
            margin: 0;
            color: var(--accent2);
            font-size: 1.0rem;
            font-weight: 600;
            text-transform: uppercase;
            flex-grow: 1;
        }
        
        .group-header .enable-switch {
            flex-shrink: 0;
            margin-left: auto;
        }
        
        .group-content {
            max-height: 1000px;
            opacity: 1;
            padding: 0 14px 14px 14px;
            transition: max-height 0.4s ease-out, opacity 0.3s ease-in-out;
        }
        
        /* Collapsed State for Individual Control Buttons */
        .control-group.collapsed .group-content {
            max-height: 0;
            opacity: 0;
            padding-top: 0;
            padding-bottom: 0;
        }
        
        /* Expanded State for Individual Control Buttons */
        .control-group:not(.collapsed) {
            background: #2a2a2e;
            border-color: var(--accent2);
        }
        .control-group:not(.collapsed) .group-header::before {
            transform: rotate(135deg);
        }
        
        /* Remove the old single-level control-panel flexbox rules */
        .control-panel {
            display: block;
        }
    </style>
    
    <!-- This is the exact same HTML from your BOP-V12.html -->
    <div class="container">
        <h1>Blockchain-Orchestrated Polyphonic Synthesiser (BOP)</h1>
        <p class="subtitle">Foundational Tooling for The Bitcoin Audional Matrix</p>
        <div class="tabs">
            <button class="tab-button active" data-tab="synth">Synthesizer</button>
            <button class="tab-button" data-tab="midi">MIDI Editor</button>
        </div>
        <div id="synth" class="tab-content active">
            <div id="control-panel"></div>
            <div class="transport-controls" id="transport-controls">
                <button class="transport-btn record-btn">Record</button>
                <button class="transport-btn stop-btn">Stop</button>
                <button class="transport-btn play-btn">Play</button>
                <button class="transport-btn clear-btn">Clear</button>
                <button class="transport-btn save-btn">Save State</button>
                <button class="transport-btn load-btn">Load State</button>
            </div>
            <div class="loop-controls" id="loop-controls"></div>
            <div class="keyboard-container">
                <div class="octave-controls">
                    <button id="octaveDown" class="octave-button">Octave -</button>
                    <span id="octaveLabel">Octave: 4</span>
                    <button id="octaveUp" class="octave-button">Octave +</button>
                </div>
                <div class="keyboard" id="keyboard"></div>
            </div>
            <div class="status-bar"></div>
        </div>
        <div id="midi" class="tab-content">
             <h3>Piano Roll Editor</h3>
            <div class="piano-roll"><div class="roll-grid" id="rollGrid"></div></div>
        </div>
        <footer>Blockchain-Orchestrated Polyphonic Synth</footer>
    </div>
`;

// Define the new custom element class
export class BopSynthUIComponent extends HTMLElement {
    constructor() {
        super();
        // Create the Shadow DOM root
        this.attachShadow({ mode: 'open' });
        // Stamp the template's content into the shadow root
        this.shadowRoot.appendChild(auiTemplate.content.cloneNode(true));

        this.uiController = null;
        this._tabHandlers = [];
        this._eventBus = null;
    }

    // A new method to connect the component to the synth's brain
    connect(logicController) {
        if (!logicController) {
            throw new Error("A valid logicController must be provided to connect().");
        }

        // Now, initialize the BopSynthUI, but tell it to look for elements
        // INSIDE this component's shadow root.
        this.uiController = new BopSynthUI(logicController, {
            keyboard: this.shadowRoot.querySelector('.keyboard-container'),
            transport: this.shadowRoot.querySelector('#transport-controls'),
            controls: this.shadowRoot.querySelector('#control-panel'),
            pianoRoll: this.shadowRoot.querySelector('#rollGrid'),
            loopControls: this.shadowRoot.querySelector('#loop-controls'),
        });

        this._eventBus = logicController.eventBus;
        this._setupTabHandlers();
    }

    // Standard Web Component lifecycle method
    disconnectedCallback() {
        this._teardownTabHandlers();

        // Clean up the UI controller when the element is removed from the DOM
        if (this.uiController) {
            this.uiController.destroy();
        }
        this.uiController = null;
        this._eventBus = null;
    }

    _setupTabHandlers() {
        this._teardownTabHandlers();
        const buttons = Array.from(this.shadowRoot.querySelectorAll('.tab-button'));
        const contents = Array.from(this.shadowRoot.querySelectorAll('.tab-content'));
        if (!buttons.length) return;
        buttons.forEach(btn => {
            const handler = () => {
                buttons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                contents.forEach(section => section.classList.remove('active'));
                const tabId = btn.dataset.tab;
                const tabContent = this.shadowRoot.getElementById(tabId);
                if (tabContent) tabContent.classList.add('active');
                if (!this._eventBus) return;
                this._eventBus.dispatchEvent(new CustomEvent('tab-changed', {
                    detail: { tabId }
                }));
                if (tabId === 'midi') {
                    this._eventBus.dispatchEvent(new CustomEvent('pianoroll-redraw'));
                }
            };
            btn.addEventListener('click', handler);
            this._tabHandlers.push({ btn, handler });
        });
    }

    _teardownTabHandlers() {
        if (!this._tabHandlers.length) return;
        this._tabHandlers.forEach(({ btn, handler }) => btn.removeEventListener('click', handler));
        this._tabHandlers = [];
    }
}

// Register the custom element with the browser
window.customElements.define('bop-synth-ui', BopSynthUIComponent);
