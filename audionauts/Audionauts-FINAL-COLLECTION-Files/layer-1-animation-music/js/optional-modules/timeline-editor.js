// js/timeline-editor.js

(() => {
    // Prevent running if the main API isn't ready
    if (!window.fxAPI) {
      console.warn("Timeline Editor cannot initialize: window.fxAPI not found. Make sure main.js is loaded first.");
      return;
    }
  
    // --- Module-level state for the editor ---
    let effectKeys = [];
    let effectParams = {};
    const log = (...a) => console.log('[FX-EDITOR]', ...a);
  
    // --- Core UI Functions (originally in main.js) ---
  
    function createTimelineUI() {
      let panel = document.getElementById('timeline-editor');
      if (!panel) {
        panel = document.createElement('div');
        panel.id = 'timeline-editor';
        document.body.appendChild(panel);
      }
      panel.style.cssText = 'position:fixed;bottom:0;left:0;width:100%;background:#15162b;border-top:1px solid #2a2960;padding:8px 12px;z-index:30;font-size:15px;color:#dbe4ff;display:flex;flex-direction:column;align-items:center;max-height:48px;overflow:hidden;transition:max-height 0.3s ease, display 0.3s ease;';
      panel.innerHTML = `
        <div style="width:100%;display:flex;align-items:center;justify-content:flex-start;user-select:none; margin-bottom:6px;">
          <button id="toggle-timeline" style="background:#262663;color:#f0f0f0;border:none;border-radius:4px;padding:2px 10px;cursor:pointer;margin-right:12px;transition:background 0.2s;">+</button>
          <b>Timeline:</b>
          <button id="add-lane" style="margin-left:12px; background:#262663;color:#f0f0f0;border:none;border-radius:4px;padding:2px 10px;cursor:pointer;">+ Lane</button>
          <button id="save-timeline" style="margin-left:6px; background:#262663;color:#f0f0f0;border:none;border-radius:4px;padding:2px 10px;cursor:pointer;">Save</button>
          <button id="load-timeline" style="margin-left:6px; background:#262663;color:#f0f0f0;border:none;border-radius:4px;padding:2px 10px;cursor:pointer;">Load</button>
          <button id="clear-timeline" style="margin-left:6px; background:#262663;color:#f0f0f0;border:none;border-radius:4px;padding:2px 10px;cursor:pointer;">Clear</button>
          <span style="font-size:12px;margin-left:20px;">Click image to play timeline.</span>
        </div>
        <table id="tl-table" style="width:100%;display:none;border-collapse:collapse;"></table>
      `;
      const toggleBtn = panel.querySelector('#toggle-timeline'), table = panel.querySelector('#tl-table');
      const expandTimeline = () => { panel.style.maxHeight = '36vh'; panel.style.overflow = 'auto'; toggleBtn.textContent = '−'; table.style.display = 'table'; };
      const collapseTimeline = () => { panel.style.maxHeight = '48px'; panel.style.overflow = 'hidden'; toggleBtn.textContent = '+'; table.style.display = 'none'; };
      toggleBtn.onclick = () => (panel.style.maxHeight === '48px' || panel.style.maxHeight === '' ? expandTimeline() : collapseTimeline());
  
      panel.querySelector('#add-lane').onclick = () => { expandTimeline(); addTimelineLane(); };
      panel.querySelector('#save-timeline').onclick = () => { saveTimeline(); log('Timeline saved.'); };
      panel.querySelector('#load-timeline').onclick = () => loadTimelineFromFile();
      panel.querySelector('#clear-timeline').onclick = () => {
        window.fxAPI.setTimeline([]);
        renderTimelineTable();
        window.fxAPI.stopEffects();
        collapseTimeline();
      };
      
      renderTimelineTable();
    }
  
    function renderTimelineTable() {
      const tbl = document.getElementById('tl-table');
      if (!tbl) return;
      const effectTimeline = window.fxAPI.getTimeline();
      const opt = (vals, sel) => vals.map(e => `<option value="${e}"${e === sel ? ' selected' : ''}>${e}</option>`).join('');
      const format = v => Array.isArray(v) ? v.join(',') : v;
      const thStyle = "padding: 4px 8px; border: 1px solid #2a2960; background-color: #1a1a4b; text-align: left;";
      const tdStyle = "padding: 3px; border: 1px solid #2a2960;";
      const inputStyle = "width:60px; background-color: #202240; color: #dbe4ff; border: 1px solid #303360; padding: 2px;";
      const selectStyle = "background-color: #202240; color: #dbe4ff; border: 1px solid #303360; padding: 2px;";
      const buttonStyle = "background:#c33;color:#fff;border:none;border-radius:3px;padding:1px 5px;cursor:pointer;font-size:12px;";
  
      tbl.innerHTML = `<thead><tr>
        <th style="${thStyle}">Effect</th><th style="${thStyle}">Param</th>
        <th style="${thStyle}">From</th><th style="${thStyle}">To</th>
        <th style="${thStyle}">Start Bar</th><th style="${thStyle}">End Bar</th>
        <th style="${thStyle}">Easing</th><th style="${thStyle}"></th>
      </tr></thead><tbody>` + effectTimeline.map((lane, i) => `
        <tr>
          <td style="${tdStyle}"><select style="${selectStyle}" onchange="fxAPI.updateLane(${i},'effect',this.value)">${opt(effectKeys, lane.effect)}</select></td>
          <td style="${tdStyle}"><select style="${selectStyle}" onchange="fxAPI.updateLane(${i},'param',this.value)">${opt(effectParams[lane.effect || effectKeys[0]] || [], lane.param)}</select></td>
          <td style="${tdStyle}"><input type="text" value="${format(lane.from)}" style="${inputStyle}" onchange="fxAPI.updateLane(${i},'from',this.value)"></td>
          <td style="${tdStyle}"><input type="text" value="${format(lane.to)}" style="${inputStyle}" onchange="fxAPI.updateLane(${i},'to',this.value)"></td>
          <td style="${tdStyle}"><input type="number" value="${lane.startBar ?? 0}" style="${inputStyle}" onchange="fxAPI.updateLane(${i},'startBar', parseFloat(this.value))"></td>
          <td style="${tdStyle}"><input type="number" value="${lane.endBar ?? 4}" style="${inputStyle}" onchange="fxAPI.updateLane(${i},'endBar', parseFloat(this.value))"></td>
          <td style="${tdStyle}"><select style="${selectStyle}" onchange="fxAPI.updateLane(${i},'easing',this.value)">
            <option value="linear"${lane.easing==='linear'?' selected':''}>Linear</option>
            <option value="easeInOut"${lane.easing==='easeInOut'?' selected':''}>EaseInOut</option>
          </select></td>
          <td style="${tdStyle}"><button style="${buttonStyle}" onclick="fxAPI.removeLane(${i})">✕</button></td>
        </tr>
      `).join('') + `</tbody>`;
    }
    
    function saveTimeline() {
      const effectTimeline = window.fxAPI.getTimeline();
      log('saveTimeline function called. Saving current timeline.');
      const timelineJSON = JSON.stringify(effectTimeline, null, 2);
      const blob = new Blob([timelineJSON], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'timeline.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  
    function addTimelineLane() {
      let effectTimeline = window.fxAPI.getTimeline();
      log('addTimelineLane function called.');
      effectTimeline.push({
        effect: effectKeys[0],
        param: effectParams[effectKeys[0]][0],
        from: 0, to: 1, startBar: 0, endBar: 4, easing: 'linear'
      });
      window.fxAPI.setTimeline(effectTimeline);
      renderTimelineTable();
    }
  
    async function loadTimelineFromFile() {
      const input = document.createElement('input');
      input.type = 'file'; input.accept = '.js,.json';
      input.onchange = async () => {
        if (!input.files || input.files.length === 0) return;
        const file = input.files[0];
        const text = await file.text();
        try {
          let tl;
          if (file.name.endsWith('.js')) {
            const m = text.match(/(?:export\s+)?function\s+(\w+)\s*\(\s*\)\s*{/m) || text.match(/const\s+(\w+)\s*=\s*\(\s*\)\s*=>\s*{/m) || text.match(/const\s+(\w+)\s*=\s*\[/m);
            if (!m || !m[1]) throw new Error('No exported function or const array found in JS file.');
            const fnName = m[1];
            const loaderFunc = new Function(`${text.replace(/export\s+(default\s+)?/g, '')}; return typeof ${fnName} === 'function' ? ${fnName}() : ${fnName};`);
            tl = loaderFunc();
          } else if (file.name.endsWith('.json')) {
            tl = JSON.parse(text);
          } else {
            throw new Error('Unsupported file type. Please use .js or .json');
          }
  
          if (!Array.isArray(tl)) throw new Error('Loaded timeline data is not an array.');
          window.fxAPI.setTimeline(tl);
          renderTimelineTable();
          log(`Timeline loaded from file: ${file.name}`);
        } catch (e) {
          alert('Failed to load timeline:\n' + e.message);
          log('Load timeline error:', e);
        }
      };
      input.click();
    }
  
    function updateLane(i, k, v) {
      let effectTimeline = window.fxAPI.getTimeline();
      if (effectTimeline[i]) {
        let val = v;
        if (k === 'from' || k === 'to') {
          const numVal = parseFloat(v);
          if (!isNaN(numVal) && isFinite(v)) val = numVal;
          else if (typeof v === 'string' && v.includes(',')) val = v.split(',').map(s => parseFloat(s.trim())).filter(n => !isNaN(n));
        } else if (/Bar$/.test(k)) {
          val = parseFloat(v);
          if (isNaN(val)) val = 0;
        }
        effectTimeline[i][k] = val;
        if (k === 'effect') {
          const newEffect = val, defaultParams = effectParams[newEffect];
          if (defaultParams && defaultParams.length > 0 && !defaultParams.includes(effectTimeline[i].param)) {
            effectTimeline[i].param = defaultParams[0];
          }
        }
        window.fxAPI.setTimeline(effectTimeline);
        renderTimelineTable();
      }
    }
  
    function removeLane(i) {
      let effectTimeline = window.fxAPI.getTimeline();
      if (effectTimeline[i]) {
        effectTimeline.splice(i, 1);
        window.fxAPI.setTimeline(effectTimeline);
        renderTimelineTable();
      }
    }
  
    // --- Initialization and API Augmentation ---
  
    function initEditor(dependencies) {
      if (!dependencies || !dependencies.effectKeys || !dependencies.effectParams) {
        console.error("Timeline Editor init failed: missing dependencies.");
        return;
      }
      effectKeys = dependencies.effectKeys;
      effectParams = dependencies.effectParams;
      createTimelineUI();
    }
  
    // Overwrite the placeholder functions on the main API
    Object.assign(window.fxAPI, {
      initTimelineEditor: initEditor,
      renderTimelineUI: renderTimelineTable,
      updateLane: updateLane,
      removeLane: removeLane
    });
  
  })();