    width: `${settings.width * pixelSize}px`,
    height: `${settings.height * pixelSize}px`
  });
  outline.className = settings.shape === 'curved' ? 'curved' : '';
}

// Enhanced layer management
function setActiveLayer(layerName) {
  if (!enhancedState.layers[layerName]) return;
  enhancedState.activeLayer = layerName;
  document.querySelectorAll('.layer-item').forEach(item =>
    item.classList.toggle('active', item.dataset.layer === layerName)
  );
  document.querySelectorAll('[id^="layer"]').forEach(btn => {
    btn.classList.remove('btn-primary');
    btn.classList.add('btn-outline');
  });
  const activeBtn = $(`#layer${layerName[0].toUpperCase()}${layerName.slice(1)}`);
  activeBtn?.classList.replace('btn-outline', 'btn-primary');
  console.log(`Active layer changed to: ${layerName}`);
}

// Enhanced drawing with layer awareness
function enhancedDrawPixel(x, y, colorIndex = null) {
  const color = colorIndex ?? core.selectedColorIndex;
  if (enhancedState.activeLayer === 'visor') {
    const s = enhancedState.visorSettings;
    if (x < s.x || x >= s.x + s.width || y < s.y || y >= s.y + s.height) return false;
  }
  if (x >= 0 && x < core.SIZE && y >= 0 && y < core.SIZE) {
    core.gridArray[y][x] = color;
    pixelUI.repaintCell(y, x);
    return true;
  }
  return false;
}

// Setup visor controls
function setupVisorControls() {
  const controls = {