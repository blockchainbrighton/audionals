function renderAppPage() {
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
              <label for="author">Author</label>
              <input type="text" id="author" placeholder="Enter author name">
            </div>
          </div>
          
          <div class="form-row">
            <div class="form-group">
              <label for="language">Language</label>
              <input type="text" id="language" placeholder="e.g., English, Spanish">
            </div>
            
            <div class="form-group">
              <label for="mode">Narration Mode *
                <span class="info-icon" tabindex="0" role="img" aria-label="Narration mode info" data-tooltip="Choose single voice for one narrator, or dual voice to alternate between two voices using the changeover marker.">i</span>
              </label>
              <select id="mode" required onchange="updateVoiceSelectors()">
                <option value="single">Single Voice</option>
                <option value="dual">Dual Voice</option>
              </select>
          </div>
        </div>
        
        <div class="form-row">
          <div class="form-group">
            <label for="chapter-limit">Chapters to Process
              <span class="info-icon" tabindex="0" role="img" aria-label="Chapter limit info" data-tooltip="Set how many chapters to generate this run. Leave blank to process everything detected in the manuscript.">i</span>
            </label>
            <input type="number" id="chapter-limit" min="1" placeholder="Leave blank to process all chapters">
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
              </div>
              
              <div class="form-group hidden" id="voice-2-group">
                <label for="voice-2">Voice 2 *
                  <span class="info-icon" tabindex="0" role="img" aria-label="Voice 2 info" data-tooltip="Secondary voice used after each changeover token. Choose a contrasting voice for dialogue or alternating perspectives.">i</span>
                </label>
                <select id="voice-2">
                  <option value="">Load voices first</option>
                </select>
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
                <span id="stability-value" class="slider-value">0.5</span>
              </label>
              <input type="range" id="stability" min="0" max="1" step="0.1" value="0.5" oninput="updateSliderValue('stability')">
            </div>
            
            <div class="slider-group">
              <label class="slider-label">
                <span class="slider-label-text">Similarity Boost</span>
                <span class="info-icon" tabindex="0" role="img" aria-label="Similarity boost info" data-tooltip="Raises how closely the output matches the original voice. Use higher values for brand consistency; lower for more creativity.">i</span>
                <span id="similarity-value" class="slider-value">0.75</span>
              </label>
              <input type="range" id="similarity" min="0" max="1" step="0.05" value="0.75" oninput="updateSliderValue('similarity')">
            </div>
            
            <div class="slider-group">
              <label class="slider-label">
                <span class="slider-label-text">Style</span>
                <span class="info-icon" tabindex="0" role="img" aria-label="Style setting info" data-tooltip="Adds dramatic flair to delivery. Increase slightly for storytelling energy; keep lower for neutral narration.">i</span>
                <span id="style-value" class="slider-value">0</span>
              </label>
              <input type="range" id="style" min="0" max="1" step="0.1" value="0" oninput="updateSliderValue('style')">
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
      display.textContent = slider.value;
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
      }
    }
    
    // Load voices from API
    async function loadVoices() {
      const apiKey = document.getElementById('api-key').value;
      if (!apiKey) {
        alert('Please enter your API key first');
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
        
        alert('Voices loaded successfully!');
      } catch (error) {
        alert('Error loading voices: ' + error.message);
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
          const completedChapters = project.chapters.filter(ch => ch.status === 'completed').length;
          const totalChapters = project.chapters.length;
          const plannedChapters = project.demoMode ? Math.min(project.chapterLimit || 1, 1) : (project.chapterLimit || totalChapters);
          const progress = plannedChapters > 0 ? (completedChapters / plannedChapters * 100) : 0;
          
          return \`
            <div class="project-card" onclick="openProject('\${project.id}')">
              <h3>\${project.title}</h3>
              <p><strong>Author:</strong> \${project.author || 'Unknown'}</p>
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
      
      const chapterLimitValue = document.getElementById('chapter-limit').value;
      if (chapterLimitValue) {
        const parsedLimit = parseInt(chapterLimitValue, 10);
        if (!Number.isNaN(parsedLimit)) {
          data.chapterLimit = parsedLimit;
        }
      }
      data.demoMode = document.getElementById('demo-mode').checked;
      const voiceSwitchTokenValue = document.getElementById('voice-change-token').value.trim();
      if (voiceSwitchTokenValue) {
        data.voiceSwitchToken = voiceSwitchTokenValue;
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
        alert(\`Project created successfully! \${result.chapters} chapters detected.\`);
        
        // Reset form
        document.getElementById('new-book-form').reset();
        updateSliderValue('stability');
        updateSliderValue('similarity');
        updateSliderValue('style');
        updateSliderValue('speed');
        updateVoiceSelectors();
        
        // Switch to dashboard
        switchTab('dashboard');
        loadProjects();
      } catch (error) {
        alert('Error creating project: ' + error.message);
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
        
        document.getElementById('modal-title').textContent = project.title;
        
        content.innerHTML = \`
          <div>
            <p><strong>Author:</strong> \${project.author || 'Unknown'}</p>
            <p><strong>Status:</strong> <span class="status-badge status-\${project.status}">\${project.status.toUpperCase()}</span></p>
            <p><strong>Mode:</strong> \${project.mode === 'single' ? 'Single Voice' : 'Dual Voice'}</p>
            <p><strong>Chapters Planned:</strong> \${plannedChapters} of \${totalChapters}</p>
            <p><strong>Demo Mode:</strong> \${project.demoMode ? 'Enabled' : 'Disabled'}</p>
            <p><strong>Voice Changeover Token:</strong> \${project.voiceSwitchToken || '***'}</p>
            
            <div class="controls">
              <button onclick="startProject('\${project.id}')" \${project.status === 'processing' ? 'disabled' : ''}>Start Generation</button>
              <button onclick="pauseProject('\${project.id}')" class="btn-secondary" \${project.status !== 'processing' ? 'disabled' : ''}>Pause</button>
              <button onclick="resumeProject('\${project.id}')" class="btn-success" \${project.status !== 'paused' ? 'disabled' : ''}>Resume</button>
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
                            <td>#\${i + 1}</td>
                            <td><span class="voice-indicator voice-\${seg.voiceIndex || seg.voice || 0}"></span>Voice \${(seg.voiceIndex || seg.voice || 0) + 1}</td>
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
        alert('Error loading project: ' + error.message);
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
          break;
        case 'segment_complete':
          message = \`Completed segment \${event.segmentIndex + 1}\`;
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
          message = 'Merging chapters into full audiobook...';
          break;
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
        alert('Generation started!');
        openProject(projectId);
      } catch (error) {
        alert('Error: ' + error.message);
      }
    }
    
    async function pauseProject(projectId) {
      try {
        await fetch(\`/api/projects/\${projectId}/pause\`, { method: 'POST' });
        alert('Generation paused');
        openProject(projectId);
      } catch (error) {
        alert('Error: ' + error.message);
      }
    }
    
    async function resumeProject(projectId) {
      try {
        await fetch(\`/api/projects/\${projectId}/resume\`, { method: 'POST' });
        alert('Generation resumed');
        openProject(projectId);
      } catch (error) {
        alert('Error: ' + error.message);
      }
    }
    
    // Initial load
    updateVoiceSelectors();
    loadProjects();
  </script>
</body>
</html>`;
}

module.exports = {
  renderAppPage,
};
