import { paletteItems } from './dom_elements.js';
import { state, getModule, CANVAS_WIDTH, CANVAS_HEIGHT } from './shared_state.js';
import { refreshLinesForModule } from './connection_manager.js';

const getById = id => document.getElementById(id);
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

export function initPaletteAndCanvasDragDrop(onDropOnCanvasArea) {
  const canvasContainer = getById('canvas-container');
  if (!canvasContainer) return console.error('DragDropManager: #canvas-container not found!');

  paletteItems.forEach(item => {
    item.addEventListener('dragstart', e => {
      state.dragType = item.dataset.type;
      e.dataTransfer?.setData('application/x-module-type', state.dragType);
      e.dataTransfer.effectAllowed = 'copy';
    });
    item.addEventListener('dragend', () => { state.dragType = null; });
  });

  const handleDragOver = e => { e.preventDefault(); e.dataTransfer.dropEffect = state.dragType ? 'copy' : 'none'; };
  canvasContainer.addEventListener('dragover', handleDragOver);
  canvasContainer.addEventListener('drop', e => {
    handleDragOver(e);
    const type = e.dataTransfer.getData('application/x-module-type');
    if (state.dragType === type && typeof onDropOnCanvasArea === 'function') {
      onDropOnCanvasArea(type, e);
    } else {
      console.warn('Ignored drop. state.dragType:', state.dragType);
    }
    state.dragType = null;
  });
}

export function enableModuleDrag(moduleElement, moduleId) {
  const header = moduleElement.querySelector('header');
  if (!header) return console.warn(`Module ${moduleId} missing header.`);

  header.addEventListener('mousedown', e => {
    if (e.button !== 0 || ['INPUT','BUTTON','SELECT'].includes(e.target.tagName)) return;
    e.stopPropagation();
    const rect = moduleElement.getBoundingClientRect();
    state.dragState = {
      id: moduleId,
      offsetX: (e.clientX - rect.left) / state.currentZoom,
      offsetY: (e.clientY - rect.top) / state.currentZoom
    };
    moduleElement.style.zIndex = '1000';
  });
}

function handleModuleMouseMove(e) {
  const ds = state.dragState;
  if (!ds?.id) return;
  const modData = getModule(ds.id);
  const el = modData?.element;
  const canvas = getById('canvas');
  if (!el || !canvas) return (ds.id = null);

  const { left: cx, top: cy } = canvas.getBoundingClientRect();
  const x = (e.clientX - cx) / state.currentZoom - ds.offsetX;
  const y = (e.clientY - cy) / state.currentZoom - ds.offsetY;
  el.style.left = clamp(x, 0, CANVAS_WIDTH - el.offsetWidth) + 'px';
  el.style.top = clamp(y, 0, CANVAS_HEIGHT - el.offsetHeight) + 'px';

  refreshLinesForModule(ds.id);
}

function handleModuleMouseUp() {
  const ds = state.dragState;
  if (!ds?.id) return;
  const el = getModule(ds.id)?.element;
  if (el) el.style.zIndex = '';
  state.dragState = {};
}

document.addEventListener('mousemove', handleModuleMouseMove);
document.addEventListener('mouseup', handleModuleMouseUp);