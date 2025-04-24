import { genId } from './utils.js';

export class Patchbay {
  constructor(audioContext) {
    this.audioContext = audioContext;
    this.modules = new Map(); // id -> module instance
    this.connections = [];    // { sourceId, targetId, cableObj }
  }

  addModule(module) {
    this.modules.set(module.id, module);
  }

  removeModule(moduleId) {
    // disconnect any connections
    this.connections = this.connections.filter(conn => {
      if (conn.sourceId === moduleId || conn.targetId === moduleId) {
        // disconnect audio
        const source = this.modules.get(conn.sourceId);
        const target = this.modules.get(conn.targetId);
        try {
          source.audioNode.disconnect(target.audioNode);
        } catch (e) {}
        // remove cable visual
        if (conn.cableObj && conn.cableObj.dispose) conn.cableObj.dispose();
        return false;
      }
      return true;
    });
    // dispose module
    const mod = this.modules.get(moduleId);
    if (mod && mod.destroy) mod.destroy();
    this.modules.delete(moduleId);
  }

  connectModules(sourceId, targetId) {
    const source = this.modules.get(sourceId);
    const target = this.modules.get(targetId);
    if (!source || !target) return;
    source.audioNode.connect(target.audioNode);
    // store connection; cableObj will be attached by UI layer
    this.connections.push({ sourceId, targetId, cableObj: null });
  }

  disconnectModules(sourceId, targetId) {
    const source = this.modules.get(sourceId);
    const target = this.modules.get(targetId);
    if (!source || !target) return;
    source.audioNode.disconnect(target.audioNode);
    this.connections = this.connections.filter(c => !(c.sourceId===sourceId && c.targetId===targetId));
  }
}
