// uiManager.js

function updateTimelineUI() {
    renderChannel('visual');
    renderChannel('audio');
  
    function renderChannel(ch) {
      const arr = ch === 'visual' ? visualTimeline : audioTimeline;
      const div = document.getElementById(`${ch}-timeline`);
      div.innerHTML = '';
      arr.forEach((m, i) => {
        const item = document.createElement('div');
        item.className = 'timeline-item';
        item.innerHTML = `
          <span>${m.url} (${m.duration.toFixed(2)}s)</span>
          <input type="number" value="${m.duration.toFixed(2)}" min="0.1" step="0.1"
                 onchange="updateDuration('${ch}', ${i}, this.value)">
          <button onclick="removeMedia('${ch}', ${i})">Remove</button>
        `;
        div.appendChild(item);
      });
    }
  }

