function getHTML() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Audiobook Generator</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      padding: 20px;
    }
    
    .container {
      max-width: 1400px;
      margin: 0 auto;
      background: white;
      border-radius: 12px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      overflow: hidden;
    }
    
    header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 30px;
      text-align: center;
    }
    
    header h1 {
      font-size: 2.5em;
      margin-bottom: 10px;
    }
    
    header p {
      opacity: 0.9;
      font-size: 1.1em;
    }
    
    .content {
      padding: 30px;
    }
    
    .tabs {
      display: flex;
      gap: 10px;
      border-bottom: 2px solid #e0e0e0;
      margin-bottom: 30px;
    }
    
    .tab {
      padding: 15px 30px;
      background: none;
      border: none;
      font-size: 1.1em;
      cursor: pointer;
      color: #666;
      border-bottom: 3px solid transparent;
      transition: all 0.3s;
    }
    
    .tab:hover {
      color: #667eea;
    }
    
    .tab.active {
      color: #667eea;
      border-bottom-color: #667eea;
    }
    
    .tab-content {
      display: none;
    }
    
    .tab-content.active {
      display: block;
    }
    
    .form-group {
      margin-bottom: 20px;
    }
    
    label {
      display: block;
      margin-bottom: 8px;
      font-weight: 600;
      color: #333;
    }

    .checkbox-label {
      display: flex;
      align-items: center;
      gap: 10px;
      font-weight: 500;
    }

    .checkbox-label input[type="checkbox"] {
      width: auto;
      margin: 0;
    }
    
    input[type="text"],
    textarea,
    select {
      width: 100%;
      padding: 12px;
      border: 2px solid #e0e0e0;
      border-radius: 6px;
      font-size: 1em;
      font-family: inherit;
      transition: border-color 0.3s;
    }
    
    input[type="text"]:focus,
    textarea:focus,
    select:focus {
      outline: none;
      border-color: #667eea;
    }
    
    textarea {
      min-height: 200px;
      resize: vertical;
    }
    
    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
    }
    
    button {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      padding: 14px 28px;
      font-size: 1em;
      border-radius: 6px;
      cursor: pointer;
      transition: transform 0.2s, box-shadow 0.2s;
      font-weight: 600;
    }
    
    button:hover {
      transform: translateY(-2px);
      box-shadow: 0 5px 15px rgba(102, 126, 234, 0.4);
    }
    
    button:active {
      transform: translateY(0);
    }
    
    button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      transform: none;
    }
    
    .btn-secondary {
      background: #6c757d;
    }
    
    .btn-success {
      background: #28a745;
    }
    
    .btn-danger {
      background: #dc3545;
    }
    
    .btn-small {
      padding: 8px 16px;
      font-size: 0.9em;
    }
    
    .projects-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 20px;
      margin-top: 20px;
    }
    
    .project-card {
      border: 2px solid #e0e0e0;
      border-radius: 8px;
      padding: 20px;
      cursor: pointer;
      transition: all 0.3s;
    }
    
    .project-card:hover {
      border-color: #667eea;
      box-shadow: 0 5px 15px rgba(0,0,0,0.1);
    }
    
    .project-card h3 {
      color: #333;
      margin-bottom: 10px;
    }
    
    .project-card p {
      color: #666;
      margin-bottom: 5px;
      font-size: 0.9em;
    }
    
    .progress-bar {
      width: 100%;
      height: 8px;
      background: #e0e0e0;
      border-radius: 4px;
      overflow: hidden;
      margin-top: 10px;
    }
    
    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
      transition: width 0.3s;
    }
    
    .status-badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 0.85em;
      font-weight: 600;
      margin-top: 10px;
    }
    
    .status-pending {
      background: #ffc107;
      color: #000;
    }
    
    .status-processing {
      background: #17a2b8;
      color: white;
    }
    
    .status-completed {
      background: #28a745;
      color: white;
    }
    
    .status-paused {
      background: #6c757d;
      color: white;
    }
    
    .status-error {
      background: #dc3545;
      color: white;
    }

    .status-skipped {
      background: #adb5bd;
      color: #212529;
    }

    .status-demo {
      background: #17a2b8;
      color: white;
    }
    
    .chapter-list {
      margin-top: 20px;
    }
    
    .chapter-item {
      border: 1px solid #e0e0e0;
      border-radius: 6px;
      padding: 15px;
      margin-bottom: 10px;
    }
    
    .chapter-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;
    }
    
    .chapter-title {
      font-weight: 600;
      color: #333;
    }
    
    .waveform {
      width: 100%;
      height: 80px;
      background: #f5f5f5;
      border-radius: 4px;
      margin: 10px 0;
      position: relative;
      overflow: hidden;
    }
    
    .waveform-bar {
      position: absolute;
      bottom: 0;
      width: 2px;
      background: #667eea;
      transition: height 0.3s;
    }
    
    .audio-player {
      margin-top: 10px;
    }
    
    audio {
      width: 100%;
      margin-top: 10px;
    }
    
    .activity-log {
      background: #f8f9fa;
      border-radius: 6px;
      padding: 15px;
      max-height: 300px;
      overflow-y: auto;
      font-family: 'Courier New', monospace;
      font-size: 0.9em;
      margin-top: 20px;
    }
    
    .log-entry {
      padding: 5px 0;
      border-bottom: 1px solid #e0e0e0;
    }
    
    .log-entry:last-child {
      border-bottom: none;
    }
    
    .log-time {
      color: #6c757d;
      margin-right: 10px;
    }
    
    .controls {
      display: flex;
      gap: 10px;
      margin-top: 20px;
    }
    
    .voice-selector {
      margin-top: 10px;
    }
    
    .voice-config {
      background: #f8f9fa;
      padding: 15px;
      border-radius: 6px;
      margin-top: 10px;
    }
    
    .slider-group {
      margin-bottom: 15px;
    }
    
    .slider-group label {
      display: flex;
      justify-content: space-between;
      margin-bottom: 5px;
    }
    
    input[type="range"] {
      width: 100%;
    }
    
    .hidden {
      display: none !important;
    }

    .flash-message {
      margin: 16px 0 10px 0;
      padding: 12px 16px;
      border-radius: 6px;
      border: 1px solid transparent;
      font-size: 0.95em;
      font-weight: 500;
      color: #1f2933;
      background: #e2e8f0;
      box-shadow: 0 2px 4px rgba(15, 23, 42, 0.08);
      transition: opacity 0.2s ease;
    }

    .flash-message.flash-info {
      background: #e6ebff;
      border-color: #c4cdff;
      color: #25316a;
    }

    .flash-message.flash-success {
      background: #dcf7e5;
      border-color: #9be7be;
      color: #1f6f45;
    }

    .flash-message.flash-warning {
      background: #fff4db;
      border-color: #fed998;
      color: #7a4d0f;
    }

    .flash-message.flash-error {
      background: #ffe1e1;
      border-color: #ffb4b4;
      color: #7b1f1f;
    }

    .loading {
      text-align: center;
      padding: 40px;
      color: #666;
    }
    
    .spinner {
      border: 4px solid #f3f3f3;
      border-top: 4px solid #667eea;
      border-radius: 50%;
      width: 40px;
      height: 40px;
      animation: spin 1s linear infinite;
      margin: 0 auto 20px;
    }
    
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    
    .segment-table {
      width: 100%;
      margin-top: 10px;
      border-collapse: collapse;
    }
    
    .segment-table th,
    .segment-table td {
      padding: 8px;
      text-align: left;
      border-bottom: 1px solid #e0e0e0;
    }
    
    .segment-table th {
      background: #f8f9fa;
      font-weight: 600;
    }
    
    .voice-indicator {
      display: inline-block;
      width: 12px;
      height: 12px;
      border-radius: 50%;
      margin-right: 5px;
    }
    
    .voice-0 {
      background: #667eea;
    }
    
    .voice-1 {
      background: #f093fb;
    }

    .voice-preset-box {
      margin-top: 10px;
    }

    .voice-preset-buttons {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin: 8px 0 6px 0;
    }

    .preset-btn {
      background: #636363ff;
      border: 1px solid #ccd0ff;
      border-radius: 4px;
      padding: 6px 10px;
      font-size: 0.85em;
      cursor: pointer;
      transition: background 0.2s, border-color 0.2s;
    }

    .preset-btn:hover {
      background: #a088f9ff;
    }

    .preset-btn.active {
      background: #8366eaff;
      border-color: #ffffffff;
      color: white;
    }

    .help-text {
      display: block;
      margin-top: 6px;
      font-size: 0.85em;
      color: #666;
    }

    .info-icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background: #667eea;
      color: white;
      font-size: 0.75em;
      margin-left: 8px;
      cursor: help;
      position: relative;
      flex-shrink: 0;
      outline: none;
    }

    .info-icon::after {
      content: attr(data-tooltip);
      position: absolute;
      left: 50%;
      bottom: 125%;
      transform: translate(-50%, 4px);
      background: rgba(33, 37, 41, 0.95);
      color: white;
      padding: 8px 10px;
      border-radius: 6px;
      font-size: 0.75em;
      line-height: 1.3;
      width: max-content;
      max-width: 240px;
      text-align: left;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.15s ease, transform 0.15s ease;
      z-index: 10;
      white-space: normal;
    }

    .info-icon::before {
      content: '';
      position: absolute;
      bottom: 110%;
      left: 50%;
      transform: translateX(-50%);
      border-width: 6px;
      border-style: solid;
      border-color: rgba(33, 37, 41, 0.95) transparent transparent transparent;
      opacity: 0;
      transition: opacity 0.15s ease;
      pointer-events: none;
    }

    .info-icon:hover::after,
    .info-icon:focus::after {
      opacity: 1;
      transform: translate(-50%, -4px);
    }

    .info-icon:hover::before,
    .info-icon:focus::before {
      opacity: 1;
    }

    .slider-group label.slider-label {
      display: flex;
      align-items: center;
      gap: 10px;
      font-weight: 600;
      color: #333;
    }

    .slider-group label .slider-label-text {
      flex: 1;
    }

    .slider-group label .slider-value {
      font-weight: 600;
      color: #667eea;
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>🎙️ Audiobook Generator</h1>
      <p>Transform your manuscripts into professional audiobooks with AI voices</p>
    </header>
    
    <div class="content">
      <div class="tabs">
        <button class="tab active" data-tab="dashboard" onclick="switchTab('dashboard', event)">Dashboard</button>
        <button class="tab" data-tab="new-book" onclick="switchTab('new-book', event)">New Book</button>
      </div>
      
      <div id="flash-message" class="flash-message hidden" role="status" aria-live="polite"></div>
      
      <!-- Dashboard Tab -->
      <div id="dashboard" class="tab-content active">
        <h2>Your Projects</h2>
        <div id="projects-list" class="projects-grid">
          <div class="loading">
            <div class="spinner"></div>
            <p>Loading projects...</p>
          </div>
        </div>
      </div>
      
      <!-- New Book Tab -->
      <div id="new-book" class="tab-content">
        <h2>Create New Audiobook</h2>
        <form id="new-book-form">
          <div class="form-group">
            <label for="api-key">ElevenLabs API Key *
              <span class="info-icon" tabindex="0" role="img" aria-label="ElevenLabs API key usage info" data-tooltip="Your personal ElevenLabs key authorises voice lookups and audio generation. It is stored locally and required before loading voices.">i</span>
            </label>
            <input type="text" id="api-key" required placeholder="Enter your API key">
            <button type="button" class="btn-secondary btn-small" onclick="loadVoices()" style="margin-top: 10px;">Load Voices</button>
          </div>
          
          <div class="form-row">
            <div class="form-group">
              <label for="title">Book Title *</label>
              <input type="text" id="title" required placeholder="Enter book title">
            </div>
            
            <div class="form-group">
              <label for="series-number">Series Number</label>
              <input type="number" id="series-number" min="1" placeholder="Optional series number">
            </div>
          </div>
          
          <div class="form-row">
            <div class="form-group">
              <label for="author">Author</label>
              <input type="text" id="author" placeholder="Enter author name">
            </div>
            
            <div class="form-group">
              <label for="language">Language</label>
              <input type="text" id="language" placeholder="e.g., English, Spanish">
            </div>
          </div>
          
          <div class="form-row">
            <div class="form-group">
              <label for="mode">Narration Mode *
                <span class="info-icon" tabindex="0" role="img" aria-label="Narration mode info" data-tooltip="Choose single voice for one narrator, or dual voice to alternate between two voices using the changeover marker.">i</span>
              </label>
              <select id="mode" required onchange="updateVoiceSelectors()">
                <option value="single">Single Voice</option>
                <option value="dual">Dual Voice</option>
              </select>
            </div>
            
            <div class="form-group">
              <label for="chapter-limit">Chapters to Process
                <span class="info-icon" tabindex="0" role="img" aria-label="Chapter limit info" data-tooltip="Set how many chapters to generate this run. Leave blank to process everything detected in the manuscript.">i</span>
              </label>
              <input type="number" id="chapter-limit" min="1" placeholder="Leave blank to process all chapters">
            </div>
          </div>
          
          <div class="form-group">
            <label>Demo Mode
              <span class="info-icon" tabindex="0" role="img" aria-label="Demo mode info" data-tooltip="Creates a short sample by limiting chapters, segments, and chunk lengths. Ideal for quick previews before full generation.">i</span>
            </label>
            <label class="checkbox-label">
              <input type="checkbox" id="demo-mode">
              <span>Generate a short preview sample</span>
            </label>
          </div>

        <div class="form-group hidden" id="demo-options">
          <label>Demo Preview Options</label>
          <label class="checkbox-label" style="margin-bottom: 10px;">
            <input type="checkbox" id="demo-preset-showcase">
            <span>Generate five preset styles in one audition clip</span>
          </label>
          <p class="help-text">Creates a single demo that announces each preset before reading the sample lines so you can compare styles quickly.</p>
          <div id="demo-preset-sample-wrapper" class="hidden" style="margin-top: 10px;">
            <label for="demo-preset-sample">Custom sample sentences</label>
            <textarea id="demo-preset-sample" placeholder="Optional: paste the sentences you want to hear in the preset showcase" disabled></textarea>
            <span class="help-text">Leave blank to use the opening sentences of your manuscript.</span>
          </div>
        </div>

        <div class="form-group">
          <label for="description">Description</label>
          <textarea id="description" placeholder="Brief description of the book"></textarea>
        </div>
          
          <div class="form-group">
            <label for="manuscript">Manuscript *</label>
            <textarea id="manuscript" required placeholder="Paste your manuscript here (plain text or markdown)"></textarea>
          </div>
          
          <div class="voice-config">
            <h3>Voice Selection</h3>
            <div id="voice-selectors">
              <div class="form-group">
                <label for="voice-1">Voice 1 *
                  <span class="info-icon" tabindex="0" role="img" aria-label="Voice 1 info" data-tooltip="Primary narration voice. Pick a character that suits the narrator's role or the majority of the text.">i</span>
                </label>
                <select id="voice-1" required>
                  <option value="">Load voices first</option>
                </select>
                <div class="voice-preset-box">
                  <span style="font-size: 0.9em; font-weight: 600;">Quick presets</span>
                  <div class="voice-preset-buttons" data-voice-index="0">
                    <button type="button" class="preset-btn" data-preset-key="balanced" onclick="applyVoicePreset(0, 'balanced')">Balanced Narrator</button>
                    <button type="button" class="preset-btn" data-preset-key="dramatic" onclick="applyVoicePreset(0, 'dramatic')">Dramatic Storyteller</button>
                    <button type="button" class="preset-btn" data-preset-key="calm" onclick="applyVoicePreset(0, 'calm')">Calm Documentary</button>
                    <button type="button" class="preset-btn" data-preset-key="energetic" onclick="applyVoicePreset(0, 'energetic')">Energetic Presenter</button>
                    <button type="button" class="preset-btn" data-preset-key="news" onclick="applyVoicePreset(0, 'news')">Crisp Newsreader</button>
                  </div>
                  <span class="help-text">Selected preset: <span id="voice-preset-display-0">Custom</span></span>
                </div>
              </div>
              
              <div class="form-group hidden" id="voice-2-group">
                <label for="voice-2">Voice 2 *
                  <span class="info-icon" tabindex="0" role="img" aria-label="Voice 2 info" data-tooltip="Secondary voice used after each changeover token. Choose a contrasting voice for dialogue or alternating perspectives.">i</span>
                </label>
                <select id="voice-2">
                  <option value="">Load voices first</option>
                </select>
                <div class="voice-preset-box">
                  <span style="font-size: 0.9em; font-weight: 600;">Quick presets</span>
                  <div class="voice-preset-buttons" data-voice-index="1">
                    <button type="button" class="preset-btn" data-preset-key="balanced" onclick="applyVoicePreset(1, 'balanced')">Balanced Narrator</button>
                    <button type="button" class="preset-btn" data-preset-key="dramatic" onclick="applyVoicePreset(1, 'dramatic')">Dramatic Storyteller</button>
                    <button type="button" class="preset-btn" data-preset-key="calm" onclick="applyVoicePreset(1, 'calm')">Calm Documentary</button>
                    <button type="button" class="preset-btn" data-preset-key="energetic" onclick="applyVoicePreset(1, 'energetic')">Energetic Presenter</button>
                    <button type="button" class="preset-btn" data-preset-key="news" onclick="applyVoicePreset(1, 'news')">Crisp Newsreader</button>
                  </div>
                  <span class="help-text">Selected preset: <span id="voice-preset-display-1">Custom</span></span>
                </div>
              </div>
            </div>
            
            <div class="form-group">
              <label for="voice-change-token">Voice Changeover Token
                <span class="info-icon" tabindex="0" role="img" aria-label="Voice change token info" data-tooltip="Characters in your manuscript that signal the narration should switch voices. Match the marker you place between dual-voice passages.">i</span>
              </label>
              <input type="text" id="voice-change-token" value="***" maxlength="16">
              <span class="help-text">Marker used to switch between voices in the manuscript.</span>
            </div>
            
            <h3 style="margin-top: 20px;">Audio Settings</h3>
            
            <div class="slider-group">
              <label class="slider-label">
                <span class="slider-label-text">Stability</span>
                <span class="info-icon" tabindex="0" role="img" aria-label="Stability setting info" data-tooltip="Higher values keep delivery consistent; lower values add more expressive variation. Try 0.3-0.6 for natural narration.">i</span>
                <span id="stability-value" class="slider-value">0.55</span>
              </label>
              <input type="range" id="stability" min="0" max="1" step="0.1" value="0.55" oninput="updateSliderValue('stability')">
            </div>
            
            <div class="slider-group">
              <label class="slider-label">
                <span class="slider-label-text">Similarity Boost</span>
                <span class="info-icon" tabindex="0" role="img" aria-label="Similarity boost info" data-tooltip="Raises how closely the output matches the original voice. Use higher values for brand consistency; lower for more creativity.">i</span>
                <span id="similarity-value" class="slider-value">0.78</span>
              </label>
              <input type="range" id="similarity" min="0" max="1" step="0.01" value="0.78" oninput="updateSliderValue('similarity')">
            </div>
            
            <div class="slider-group">
              <label class="slider-label">
                <span class="slider-label-text">Style</span>
                <span class="info-icon" tabindex="0" role="img" aria-label="Style setting info" data-tooltip="Adds dramatic flair to delivery. Increase slightly for storytelling energy; keep lower for neutral narration.">i</span>
                <span id="style-value" class="slider-value">0.2</span>
              </label>
              <input type="range" id="style" min="0" max="1" step="0.1" value="0.2" oninput="updateSliderValue('style')">
            </div>
            
            <div class="slider-group">
              <label class="slider-label">
                <span class="slider-label-text">Speed</span>
                <span class="info-icon" tabindex="0" role="img" aria-label="Speed setting info" data-tooltip="Controls playback tempo. 1.0 is normal. Use 0.9 for reflective pacing or up to 1.3 for brisk delivery.">i</span>
                <span id="speed-value" class="slider-value">1.0</span>
              </label>
              <input type="range" id="speed" min="0.5" max="2" step="0.1" value="1" oninput="updateSliderValue('speed')">
            </div>
          </div>
          
          <button type="submit" style="margin-top: 20px;">Create Audiobook Project</button>
        </form>
      </div>
    </div>
  </div>
  
  <!-- Project Detail Modal -->
  <div id="project-modal" class="hidden" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 1000; overflow-y: auto;">
    <div style="max-width: 1200px; margin: 50px auto; background: white; border-radius: 12px; padding: 30px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
        <h2 id="modal-title">Project Details</h2>
        <button onclick="closeModal()" class="btn-secondary">Close</button>
      </div>
      
      <div id="modal-content">
        <!-- Dynamic content -->
      </div>
    </div>
  </div>

  <script>
    let currentProject = null;
    let eventSource = null;
    let availableVoices = [];
    let flashMessageTimeout = null;
    const voicePresetOptions = [
      {
        key: 'balanced',
        label: 'Balanced Narrator',
        settings: { stability: 0.55, similarity_boost: 0.78, style: 0.2, speed: 1.0 }
      },
      {
        key: 'dramatic',
        label: 'Dramatic Storyteller',
        settings: { stability: 0.4, similarity_boost: 0.7, style: 0.75, speed: 1.05 }
      },
      {
        key: 'calm',
        label: 'Calm Documentary',
        settings: { stability: 0.75, similarity_boost: 0.85, style: 0.1, speed: 0.95 }
      },
      {
        key: 'energetic',
        label: 'Energetic Presenter',
        settings: { stability: 0.45, similarity_boost: 0.65, style: 0.6, speed: 1.18 }
      },
      {
        key: 'news',
        label: 'Crisp Newsreader',
        settings: { stability: 0.6, similarity_boost: 0.9, style: 0.15, speed: 1.12 }
      }
    ];
    const voicePresetSelections = [null, null];
    const sliderToPresetKey = {
      stability: 'stability',
      similarity: 'similarity_boost',
      style: 'style',
      speed: 'speed'
    };
    let activePresetVoiceIndex = null;

    function showFlashMessage(message, type = 'info', duration = 4000) {
      const container = document.getElementById('flash-message');
      if (!container) {
        return;
      }

      container.textContent = message;
      container.className = 'flash-message';
      container.classList.add('flash-' + type);
      container.classList.remove('hidden');

      if (flashMessageTimeout) {
        clearTimeout(flashMessageTimeout);
      }

      if (duration !== null) {
        flashMessageTimeout = setTimeout(() => {
          container.classList.add('hidden');
          flashMessageTimeout = null;
        }, duration);
      }
    }

    function clearFlashMessage() {
      const container = document.getElementById('flash-message');
      if (!container) {
        return;
      }
      container.classList.add('hidden');
      if (flashMessageTimeout) {
        clearTimeout(flashMessageTimeout);
        flashMessageTimeout = null;
      }
    }

    // Tab switching
    function switchTab(tabName, evt) {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
      
      const tabButton = (evt && (evt.currentTarget || evt.target)) || document.querySelector('.tab[data-tab="' + tabName + '"]');
      if (tabButton) {
        tabButton.classList.add('active');
      }
      document.getElementById(tabName).classList.add('active');
      
      if (tabName === 'dashboard') {
        loadProjects();
      }
    }
    
    // Update slider values
    function updateSliderValue(name) {
      const slider = document.getElementById(name);
      const display = document.getElementById(name + '-value');
      if (!slider || !display) {
        return;
      }

      display.textContent = slider.value;

      const presetKey = sliderToPresetKey[name];
      if (!presetKey || activePresetVoiceIndex === null) {
        return;
      }

      const activeSelection = voicePresetSelections[activePresetVoiceIndex];
      if (activeSelection && activeSelection.settings) {
        activeSelection.settings[presetKey] = parseFloat(slider.value);
      }
    }
    
    // Update voice selectors based on mode
    function updateVoiceSelectors() {
      const mode = document.getElementById('mode').value;
      const voice2Group = document.getElementById('voice-2-group');
      const tokenInput = document.getElementById('voice-change-token');
      const tokenHelp = tokenInput ? tokenInput.nextElementSibling : null;
      
      if (mode === 'dual') {
        voice2Group.classList.remove('hidden');
        document.getElementById('voice-2').required = true;
        if (tokenInput) {
          tokenInput.disabled = false;
        }
        if (tokenHelp) {
          tokenHelp.textContent = 'Marker used to switch between voices in the manuscript.';
        }
      } else {
        voice2Group.classList.add('hidden');
        document.getElementById('voice-2').required = false;
        if (tokenInput) {
          tokenInput.disabled = true;
        }
        if (tokenHelp) {
          tokenHelp.textContent = 'Enable dual voice mode to customise the marker.';
        }
        clearVoicePresetSelection(1);
        if (voicePresetSelections[0]) {
          activePresetVoiceIndex = 0;
          setSlidersFromPreset(voicePresetSelections[0].settings);
        }
      }
    }

    function updateDemoOptionsVisibility() {
      const demoCheckbox = document.getElementById('demo-mode');
      const options = document.getElementById('demo-options');
      if (!demoCheckbox || !options) {
        return;
      }

      const enabled = demoCheckbox.checked;
      options.classList.toggle('hidden', !enabled);

      if (!enabled) {
        const showcaseCheckbox = document.getElementById('demo-preset-showcase');
        const sampleWrapper = document.getElementById('demo-preset-sample-wrapper');
        const sampleInput = document.getElementById('demo-preset-sample');
        if (showcaseCheckbox) {
          showcaseCheckbox.checked = false;
        }
        if (sampleWrapper) {
          sampleWrapper.classList.add('hidden');
        }
        if (sampleInput) {
          sampleInput.value = '';
          sampleInput.disabled = true;
        }
      } else {
        updatePresetSampleVisibility();
      }
    }

    function updatePresetSampleVisibility() {
      const showcaseCheckbox = document.getElementById('demo-preset-showcase');
      const sampleWrapper = document.getElementById('demo-preset-sample-wrapper');
      const sampleInput = document.getElementById('demo-preset-sample');
      if (!showcaseCheckbox || !sampleWrapper || !sampleInput) {
        return;
      }

      const enabled = showcaseCheckbox.checked;
      sampleWrapper.classList.toggle('hidden', !enabled);
      sampleInput.disabled = !enabled;
    }

    function updateVoicePresetDisplay(voiceIndex) {
      const display = document.getElementById('voice-preset-display-' + voiceIndex);
      const selection = voicePresetSelections[voiceIndex];
      if (display) {
        display.textContent = selection ? selection.label : 'Custom';
      }

      const container = document.querySelector('.voice-preset-buttons[data-voice-index="' + voiceIndex + '"]');
      if (container) {
        const buttons = container.querySelectorAll('button');
        buttons.forEach(btn => {
          const key = btn.getAttribute('data-preset-key');
          if (selection && key === selection.key) {
            btn.classList.add('active');
          } else {
            btn.classList.remove('active');
          }
        });
      }
    }

    function setSlidersFromPreset(settings) {
      Object.entries(sliderToPresetKey).forEach(([sliderId, presetKey]) => {
        const slider = document.getElementById(sliderId);
        if (!slider || settings[presetKey] === undefined) {
          return;
        }
        slider.value = settings[presetKey];
        updateSliderValue(sliderId);
      });
    }

    function applyVoicePreset(voiceIndex, presetKey) {
      const preset = voicePresetOptions.find(p => p.key === presetKey);
      if (!preset) {
        return;
      }
      voicePresetSelections[voiceIndex] = {
        key: preset.key,
        label: preset.label,
        settings: { ...preset.settings }
      };
      activePresetVoiceIndex = voiceIndex;
      setSlidersFromPreset(preset.settings);
      updateVoicePresetDisplay(voiceIndex);
    }

    function clearVoicePresetSelection(voiceIndex) {
      voicePresetSelections[voiceIndex] = null;
      if (activePresetVoiceIndex === voiceIndex) {
        activePresetVoiceIndex = null;
      }
      updateVoicePresetDisplay(voiceIndex);
    }

    window.applyVoicePreset = applyVoicePreset;

    // Load voices from API
    async function loadVoices() {
      const apiKey = document.getElementById('api-key').value;
      if (!apiKey) {
        showFlashMessage('Please enter your API key first', 'warning', 5000);
        return;
      }
      
      try {
        const response = await fetch('/api/voices', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ apiKey })
        });
        
        if (!response.ok) throw new Error('Failed to load voices');
        
        availableVoices = await response.json();
        
        const voice1 = document.getElementById('voice-1');
        const voice2 = document.getElementById('voice-2');
        
        voice1.innerHTML = '<option value="">Select a voice</option>';
        voice2.innerHTML = '<option value="">Select a voice</option>';
        
        availableVoices.forEach(voice => {
          const option1 = document.createElement('option');
          option1.value = voice.voice_id;
          option1.textContent = voice.name;
          voice1.appendChild(option1);
          
          const option2 = document.createElement('option');
          option2.value = voice.voice_id;
          option2.textContent = voice.name;
          voice2.appendChild(option2);
        });
        
        showFlashMessage('Voices loaded successfully!', 'success');
      } catch (error) {
        showFlashMessage('Error loading voices: ' + error.message, 'error', 6000);
      }
    }
    
    // Load projects
    async function loadProjects() {
      try {
        const response = await fetch('/api/projects');
        const projects = await response.json();
        
        const container = document.getElementById('projects-list');
        
        if (projects.length === 0) {
          container.innerHTML = '<p style="text-align: center; color: #666; padding: 40px;">No projects yet. Create your first audiobook!</p>';
          return;
        }
        
        container.innerHTML = projects.map(project => {
          const completedChapters = project.chapters.filter(ch => ch.status === 'completed' && ch.file).length;
          const totalChapters = project.chapters.length;
          const plannedChapters = project.demoMode ? Math.min(project.chapterLimit || 1, 1) : (project.chapterLimit || totalChapters);
          const progress = plannedChapters > 0 ? (completedChapters / plannedChapters * 100) : 0;
          const seriesLabel = project.seriesNumber ? \`Series #\${project.seriesNumber}\` : 'Standalone';
          
          return \`
            <div class="project-card" onclick="openProject('\${project.id}')">
              <h3>\${project.title}</h3>
              <p><strong>Author:</strong> \${project.author || 'Unknown'}</p>
              <p><strong>Series:</strong> \${seriesLabel}</p>
              <p><strong>Chapters:</strong> \${completedChapters} / \${plannedChapters} (of \${totalChapters})</p>
              <p><strong>Mode:</strong> \${project.mode === 'single' ? 'Single Voice' : 'Dual Voice'}</p>
              <div class="progress-bar">
                <div class="progress-fill" style="width: \${progress}%"></div>
              </div>
              <span class="status-badge status-\${project.status}">\${project.status.toUpperCase()}</span>
            </div>
          \`;
        }).join('');
      } catch (error) {
        console.error('Error loading projects:', error);
      }
    }

    document.getElementById('demo-mode').addEventListener('change', updateDemoOptionsVisibility);
    document.getElementById('demo-preset-showcase').addEventListener('change', updatePresetSampleVisibility);

    updateDemoOptionsVisibility();
    updatePresetSampleVisibility();
    updateVoicePresetDisplay(0);
    updateVoicePresetDisplay(1);

    // Create new project
    document.getElementById('new-book-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const mode = document.getElementById('mode').value;
      const voices = [document.getElementById('voice-1').value];
      
      if (mode === 'dual') {
        voices.push(document.getElementById('voice-2').value);
      }
      
      const data = {
        apiKey: document.getElementById('api-key').value,
        title: document.getElementById('title').value,
        author: document.getElementById('author').value,
        language: document.getElementById('language').value,
        description: document.getElementById('description').value,
        manuscript: document.getElementById('manuscript').value,
        mode: mode,
        voices: voices,
        settings: {
          stability: parseFloat(document.getElementById('stability').value),
          similarity_boost: parseFloat(document.getElementById('similarity').value),
          style: parseFloat(document.getElementById('style').value),
          speed: parseFloat(document.getElementById('speed').value)
        }
      };

      const seriesValue = document.getElementById('series-number').value.trim();
      if (seriesValue) {
        const parsedSeries = parseInt(seriesValue, 10);
        if (Number.isNaN(parsedSeries) || parsedSeries <= 0) {
          showFlashMessage('Series number must be a positive integer', 'error', 5000);
          return;
        }
        data.seriesNumber = parsedSeries;
      }
      
      const chapterLimitValue = document.getElementById('chapter-limit').value;
      if (chapterLimitValue) {
        const parsedLimit = parseInt(chapterLimitValue, 10);
        if (!Number.isNaN(parsedLimit)) {
          data.chapterLimit = parsedLimit;
        }
      }
      data.demoMode = document.getElementById('demo-mode').checked;
      if (data.demoMode && document.getElementById('demo-preset-showcase').checked) {
        data.demoPresetShowcase = true;
        const sampleOverride = document.getElementById('demo-preset-sample').value.trim();
        if (sampleOverride) {
          data.demoPresetSample = sampleOverride;
        }
      }
      const voiceSwitchTokenValue = document.getElementById('voice-change-token').value.trim();
      if (voiceSwitchTokenValue) {
        data.voiceSwitchToken = voiceSwitchTokenValue;
      }
      const presetSelections = voicePresetSelections.slice(0, mode === 'dual' ? 2 : 1);
      if (presetSelections.some(selection => selection)) {
        const voiceSettingsPayload = presetSelections.map(selection => selection ? { ...selection.settings } : null);
        const voicePresetLabelsPayload = presetSelections.map(selection => selection ? selection.label : null);
        if (mode !== 'dual') {
          // Ensure second voice slot is preserved as null for backend consistency
          voiceSettingsPayload.push(null);
          voicePresetLabelsPayload.push(null);
        }
        data.voiceSettings = voiceSettingsPayload;
        data.voicePresetLabels = voicePresetLabelsPayload;
      }

      try {
        const response = await fetch('/api/projects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error);
        }
        
        const result = await response.json();
        showFlashMessage(\`Project created successfully! \${result.chapters} chapters detected.\`, 'success', 7000);
        
        // Reset form
        document.getElementById('new-book-form').reset();
        updateSliderValue('stability');
        updateSliderValue('similarity');
        updateSliderValue('style');
        updateSliderValue('speed');
        updateVoiceSelectors();
        updateDemoOptionsVisibility();
        updatePresetSampleVisibility();
        clearVoicePresetSelection(0);
        clearVoicePresetSelection(1);
        applyVoicePreset(0, 'balanced');
        
        // Switch to dashboard
        switchTab('dashboard');
        loadProjects();
      } catch (error) {
        showFlashMessage('Error creating project: ' + error.message, 'error', 7000);
      }
    });
    
    // Open project detail
    async function openProject(projectId) {
      try {
        const response = await fetch(\`/api/projects/\${projectId}\`);
        const project = await response.json();
        
        currentProject = project;
        
        const modal = document.getElementById('project-modal');
        const content = document.getElementById('modal-content');
        const totalChapters = project.chapters.length;
        const plannedChapters = project.demoMode ? Math.min(project.chapterLimit || 1, 1) : (project.chapterLimit || totalChapters);
        const completedChapters = project.chapters.filter(ch => ch.status === 'completed' && ch.file).length;
        const manualCompileDisabled = completedChapters === 0;
        let lastCompiledAt = null;
        if (project.bookGeneratedAt) {
          const parsedDate = new Date(project.bookGeneratedAt);
          if (!Number.isNaN(parsedDate.getTime())) {
            lastCompiledAt = parsedDate.toLocaleString();
          }
        }

        const escapeHtml = (value) => {
          if (typeof value !== 'string') {
            return value;
          }
          return value.replace(/[&<>"']/g, (char) => {
            switch (char) {
              case '&':
                return '&amp;';
              case '<':
                return '&lt;';
              case '>':
                return '&gt;';
              case '"':
                return '&quot;';
              case "'":
                return '&#39;';
              default:
                return char;
            }
          });
        };
        const manualCompileLabel = manualCompileDisabled
          ? 'Compile Completed Chapters'
          : 'Compile ' + completedChapters + ' Completed ' + (completedChapters === 1 ? 'Chapter' : 'Chapters');
        const manualCompileLabelSafe = escapeHtml(manualCompileLabel);
        const seriesLabel = project.seriesNumber ? \`Series #\${project.seriesNumber}\` : 'Standalone';
        const lastCompiledBlock = lastCompiledAt
          ? '<p><strong>Last Compiled:</strong> ' + escapeHtml(lastCompiledAt) + '</p>'
          : '';
        let presetShowcaseBlock = '';
        if (project.demoPresetShowcase) {
          let samplePreview = project.demoPresetSampleText || '';
          if (samplePreview.length > 220) {
            samplePreview = samplePreview.slice(0, 220).trim() + '…';
          }
          presetShowcaseBlock = \`<p><strong>Preset Showcase:</strong> Enabled (5 presets)</p>\`;
          if (samplePreview) {
            presetShowcaseBlock += \`<p><strong>Showcase Sample:</strong> \${escapeHtml(samplePreview)}</p>\`;
          }
        }
        let voicePresetBlock = '';
        if (Array.isArray(project.voicePresetLabels)) {
          const entries = project.voicePresetLabels
            .map((label, idx) => (label ? \`Voice \${idx + 1}: \${escapeHtml(label)}\` : null))
            .filter(Boolean);
          if (entries.length > 0) {
            voicePresetBlock = \`<p><strong>Voice Presets:</strong><br>\${entries.join('<br>')}</p>\`;
          }
        }

        document.getElementById('modal-title').textContent = project.title;

        content.innerHTML = \`
          <div>
            <p><strong>Author:</strong> \${project.author || 'Unknown'}</p>
            <p><strong>Series:</strong> \${seriesLabel}</p>
            <p><strong>Status:</strong> <span class="status-badge status-\${project.status}">\${project.status.toUpperCase()}</span></p>
            <p><strong>Mode:</strong> \${project.mode === 'single' ? 'Single Voice' : 'Dual Voice'}</p>
            <p><strong>Chapters Planned:</strong> \${plannedChapters} of \${totalChapters}</p>
            <p><strong>Demo Mode:</strong> \${project.demoMode ? 'Enabled' : 'Disabled'}</p>
            \${presetShowcaseBlock}
            \${voicePresetBlock}
            <p><strong>Voice Changeover Token:</strong> \${project.voiceSwitchToken || '***'}</p>
            \${lastCompiledBlock}
            
            <div class="controls">
              <button onclick="startProject('\${project.id}')" \${project.status === 'processing' ? 'disabled' : ''}>Start Generation</button>
              <button onclick="pauseProject('\${project.id}')" class="btn-secondary" \${project.status !== 'processing' ? 'disabled' : ''}>Pause</button>
              <button onclick="resumeProject('\${project.id}')" class="btn-success" \${project.status !== 'paused' ? 'disabled' : ''}>Resume</button>
              <button id="build-book-button" onclick="buildBook('\${project.id}')" class="btn-secondary" \${manualCompileDisabled ? 'disabled' : ''}>\${manualCompileLabelSafe}</button>
              \${project.bookUrl ? \`<a href="\${project.bookUrl}" download><button class="btn-success">Download Full Audiobook</button></a>\` : ''}
            </div>
            
            <div class="activity-log" id="activity-log">
              <div class="log-entry">
                <span class="log-time">\${new Date().toLocaleTimeString()}</span>
                <span>Ready to start generation</span>
              </div>
            </div>
            
            <div class="chapter-list">
              <h3>Chapters</h3>
              \${project.chapters.map((chapter, index) => \`
                <div class="chapter-item">
                  <div class="chapter-header">
                    <span class="chapter-title">\${chapter.title}</span>
                    <span class="status-badge status-\${chapter.status || 'pending'}">\${(chapter.status || 'pending').toUpperCase()}</span>
                    \${chapter.demo ? '<span class="status-badge status-demo">DEMO SNIPPET</span>' : ''}
                  </div>
                  
                  \${chapter.file ? \`
                    <audio controls src="\${chapter.url}"></audio>
                  \` : ''}
                  
                  \${chapter.segments && chapter.segments.length > 0 ? \`
                    <table class="segment-table">
                      <thead>
                        <tr>
                          <th>Segment</th>
                          <th>Voice</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        \${chapter.segments.map((seg, i) => \`
                          <tr>
                            <td>\${seg.label || \`#\${i + 1}\`}</td>
                            <td><span class="voice-indicator voice-\${seg.voiceIndex || seg.voice || 0}"></span>Voice \${(seg.voiceIndex || seg.voice || 0) + 1}\${seg.presetName ? \` – \${seg.presetName}\${seg.presetStage === 'announcement' ? ' (intro)' : ''}\` : ''}</td>
                            <td>\${(seg.status || 'pending').toUpperCase()}</td>
                          </tr>
                        \`).join('')}
                      </tbody>
                    </table>
                  \` : ''}
                </div>
              \`).join('')}
            </div>
          </div>
        \`;
        
        modal.classList.remove('hidden');
        
        // Connect to SSE for real-time updates
        connectToEvents(projectId);
        
      } catch (error) {
        showFlashMessage('Error loading project: ' + error.message, 'error', 7000);
      }
    }
    
    // Close modal
    function closeModal() {
      document.getElementById('project-modal').classList.add('hidden');
      if (eventSource) {
        eventSource.close();
        eventSource = null;
      }
      currentProject = null;
    }
    
    // Connect to SSE events
    function connectToEvents(projectId) {
      if (eventSource) {
        eventSource.close();
      }
      
      eventSource = new EventSource(\`/api/events/\${projectId}\`);
      
      eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);
        handleEvent(data);
      };
      
      eventSource.onerror = () => {
        console.error('SSE connection error');
      };
    }
    
    // Handle real-time events
    function handleEvent(event) {
      const log = document.getElementById('activity-log');
      if (!log) return;
      
      const time = new Date().toLocaleTimeString();
      let message = '';
      
      switch (event.type) {
        case 'connected':
          message = 'Connected to server';
          break;
        case 'chapter_start':
          message = \`Started processing: \${event.title}\`;
          break;
        case 'segment_start':
          message = \`Processing segment \${event.segmentIndex + 1}\`;
          if (event.preset) {
            message += \` (\${event.preset}\${event.stage === 'announcement' ? ' intro' : ''})\`;
          }
          break;
        case 'segment_complete':
          message = \`Completed segment \${event.segmentIndex + 1}\`;
          if (event.preset) {
            message += \` (\${event.preset}\${event.stage === 'announcement' ? ' intro' : ''})\`;
          }
          break;
        case 'chapter_complete':
          message = \`Completed chapter: \${currentProject.chapters[event.chapterIndex].title}\`;
          // Reload project to show audio player
          if (currentProject) {
            openProject(currentProject.id);
          }
          break;
        case 'chapter_skipped':
          message = \`Skipped chapter \${(event.chapterIndex || 0) + 1} (limit reached)\`;
          break;
        case 'chapter_skipped_demo':
          message = \`Skipped chapter \${(event.chapterIndex || 0) + 1} (demo mode)\`;
          break;
        case 'book_merging':
          if (event.manual) {
            const manualCount = typeof event.chapters === 'number'
              ? ' (' + event.chapters + ' chapter' + (event.chapters === 1 ? '' : 's') + ')'
              : '';
            message = 'Manual compilation in progress' + manualCount + '...';
          } else {
            message = 'Merging chapters into full audiobook...';
          }
          break;
        case 'book_ready': {
          if (event.manual) {
            const manualSuffix = typeof event.chapters === 'number'
              ? ' (' + event.chapters + ' completed chapter' + (event.chapters === 1 ? '' : 's') + ')'
              : '';
            message = 'Manual compilation finished' + manualSuffix + '.';
            if (currentProject) {
              openProject(currentProject.id);
            }
          } else {
            message = 'Audiobook compilation ready.';
          }
          break;
        }
        case 'project_complete':
          message = 'Audiobook generation complete!';
          // Reload project
          if (currentProject) {
            openProject(currentProject.id);
          }
          break;
        case 'project_error':
          message = \`Error: \${event.error}\`;
          break;
        default:
          message = JSON.stringify(event);
      }
      
      const entry = document.createElement('div');
      entry.className = 'log-entry';
      entry.innerHTML = \`
        <span class="log-time">\${time}</span>
        <span>\${message}</span>
      \`;
      
      log.appendChild(entry);
      log.scrollTop = log.scrollHeight;
    }
    
    // Project controls
    async function startProject(projectId) {
      try {
        await fetch(\`/api/projects/\${projectId}/start\`, { method: 'POST' });
        showFlashMessage('Generation started!', 'success');
        openProject(projectId);
      } catch (error) {
        showFlashMessage('Failed to start generation: ' + error.message, 'error', 7000);
      }
    }
    
    async function pauseProject(projectId) {
      try {
        await fetch(\`/api/projects/\${projectId}/pause\`, { method: 'POST' });
        showFlashMessage('Generation paused.', 'info');
        openProject(projectId);
      } catch (error) {
        showFlashMessage('Failed to pause generation: ' + error.message, 'error', 7000);
      }
    }
    
    async function resumeProject(projectId) {
      try {
        await fetch(\`/api/projects/\${projectId}/resume\`, { method: 'POST' });
        showFlashMessage('Generation resumed!', 'success');
        openProject(projectId);
      } catch (error) {
        showFlashMessage('Failed to resume generation: ' + error.message, 'error', 7000);
      }
    }

    async function buildBook(projectId) {
      const button = document.getElementById('build-book-button');
      if (button) {
        button.disabled = true;
      }

      try {
        showFlashMessage('Compiling audiobook from completed chapters...', 'info');
        const response = await fetch(\`/api/projects/\${projectId}/book\`, { method: 'POST' });
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'Unable to compile audiobook');
        }

        const chapterCount = typeof result.chapters === 'number' ? result.chapters : null;
        const successMessage = chapterCount !== null
          ? 'Audiobook compiled from ' + chapterCount + ' completed chapter' + (chapterCount === 1 ? '' : 's') + '.'
          : 'Audiobook compiled from completed chapters.';
        showFlashMessage(successMessage, 'success', 6000);
        openProject(projectId);
      } catch (error) {
        showFlashMessage('Failed to compile audiobook: ' + error.message, 'error', 7000);
        if (button) {
          button.disabled = false;
        }
      }
    }

    // Initial load
    applyVoicePreset(0, 'balanced');
    updateVoiceSelectors();
    loadProjects();
  </script>
</body>
</html>`;
}

module.exports = { getHTML };
