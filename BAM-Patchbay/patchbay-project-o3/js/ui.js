import { Patchbay } from './patchbay.js';
import * as THREE from 'three';

export class UI {
  constructor(patchbay, container) {
    this.patchbay = patchbay;
    this.container = container;

    // Set up Three.js scene for cables
    this.renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('cable-canvas'), alpha: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(0, window.innerWidth, window.innerHeight, 0, -1000, 1000);
    this.scene.add(this.camera);
    this.animate = this.animate.bind(this);
    window.addEventListener('resize', ()=>this.onResize());
    this.onResize();
    requestAnimationFrame(this.animate);

    this.activeDrag = null; // { sourceId, cableObj }
  }

  onResize() {
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.camera.right = window.innerWidth;
    this.camera.top = window.innerHeight;
    this.camera.updateProjectionMatrix();
  }

  animate() {
    requestAnimationFrame(this.animate);
    this.renderer.render(this.scene, this.camera);
  }

  createPanelForModule(module) {
    const panel = document.createElement('div');
    panel.className = 'module-panel';
    panel.style.left = '100px';
    panel.style.top = '100px';
    panel.dataset.moduleId = module.id;

    // Header
    const header = document.createElement('div');
    header.className = 'module-header';
    header.textContent = module.name;
    panel.appendChild(header);

    // GUI
    panel.appendChild(module.gui);

    // Jacks
    if (module.outputs) {
      const outJack = document.createElement('div');
      outJack.className = 'jack output';
      outJack.dataset.moduleId = module.id;
      outJack.dataset.jackType = 'output';
      panel.appendChild(outJack);
      outJack.addEventListener('mousedown', (e)=>this.startCableDrag(e, module.id));
    }
    if (module.inputs) {
      const inJack = document.createElement('div');
      inJack.className = 'jack input';
      inJack.dataset.moduleId = module.id;
      inJack.dataset.jackType = 'input';
      panel.appendChild(inJack);
      inJack.addEventListener('mouseup', (e)=>this.finishCableDrag(e, module.id));
    }

    // Dragging panel
    let offsetX=0, offsetY=0;
    header.addEventListener('mousedown', (e)=>{
      offsetX = e.clientX - panel.offsetLeft;
      offsetY = e.clientY - panel.offsetTop;
      const move = (ev)=>{
        panel.style.left = (ev.clientX - offsetX) + 'px';
        panel.style.top  = (ev.clientY - offsetY) + 'px';
        this.updateCablesForModule(module.id);
      };
      const up = ()=>{
        document.removeEventListener('mousemove', move);
        document.removeEventListener('mouseup', up);
      };
      document.addEventListener('mousemove', move);
      document.addEventListener('mouseup', up);
    });

    this.container.appendChild(panel);
    module._panel = panel;
  }

  // Cable helpers
  startCableDrag(e, sourceId) {
    e.preventDefault();
    // Create temporary cable line
    const material = new THREE.LineBasicMaterial({ linewidth: 2 });
    const points = [ new THREE.Vector3(e.clientX, window.innerHeight - e.clientY, 0),
                     new THREE.Vector3(e.clientX, window.innerHeight - e.clientY, 0)];
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const line = new THREE.Line(geometry, material);
    this.scene.add(line);
    this.activeDrag = { sourceId, line, points };

    const move = (ev)=>{
      points[1].set(ev.clientX, window.innerHeight - ev.clientY, 0);
      geometry.setFromPoints(points);
    };
    const up = ()=>{
      document.removeEventListener('mousemove', move);
      document.removeEventListener('mouseup', up);
      // If not connected, remove line
      if (this.activeDrag) {
        this.scene.remove(line);
        this.activeDrag = null;
      }
    };
    document.addEventListener('mousemove', move);
    document.addEventListener('mouseup', up);
  }

  finishCableDrag(e, targetId) {
    if (!this.activeDrag) return;
    const { sourceId, line } = this.activeDrag;
    // finalize cable between source and target
    this.patchbay.connectModules(sourceId, targetId);
    // store cable object
    const conn = this.patchbay.connections.find(c=>c.sourceId===sourceId && c.targetId===targetId);
    if (conn) conn.cableObj = line;
    this.activeDrag = null;
  }

  updateCablesForModule(moduleId) {
    // Recalculate cable endpoints for this module's jacks
    const mod = this.patchbay.modules.get(moduleId);
    if (!mod) return;
    const panel = mod._panel;
    const rect = panel.getBoundingClientRect();
    // find connections
    this.patchbay.connections.forEach(conn=>{
      if (conn.cableObj instanceof THREE.Line) {
        const line = conn.cableObj;
        const posArray = line.geometry.attributes.position.array;
        const sourcePanel = this.patchbay.modules.get(conn.sourceId)._panel.getBoundingClientRect();
        const targetPanel = this.patchbay.modules.get(conn.targetId)._panel.getBoundingClientRect();
        // source jack (right center)
        posArray[0] = sourcePanel.right;
        posArray[1] = window.innerHeight - (sourcePanel.top + sourcePanel.height/2);
        // target jack (left center)
        posArray[3] = targetPanel.left;
        posArray[4] = window.innerHeight - (targetPanel.top + targetPanel.height/2);
        line.geometry.attributes.position.needsUpdate = true;
      }
    });
  }
}
