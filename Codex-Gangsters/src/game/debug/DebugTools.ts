import Phaser from 'phaser';

interface Waypoint {
  id: string;
  laneId: string;
  x: number;
  y: number;
}

interface WaypointLink {
  from: string;
  to: string;
  weight: number;
  meta?: Record<string, unknown>;
}

export class WaypointEditor {
  private readonly scene: Phaser.Scene;
  private readonly gfx: Phaser.GameObjects.Graphics;
  private visible = false;
  private waypoints: Waypoint[] = [];
  private links: WaypointLink[] = [];
  private nextId = 0;
  private labels: Phaser.GameObjects.Text[] = [];

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.gfx = scene.add.graphics({ x: 0, y: 0 }).setScrollFactor(1).setDepth(5000);
    this.gfx.setVisible(false);
    (window as unknown as { editor: WaypointEditor }).editor = this;
  }

  toggle(): void {
    this.visible = !this.visible;
    this.gfx.setVisible(this.visible);
    this.redraw();
  }

  isVisible(): boolean {
    return this.visible;
  }

  addWaypoint(x: number, y: number, laneId = 'main'): string {
    const id = `wp_${this.nextId.toString().padStart(3, '0')}`;
    this.nextId += 1;
    this.waypoints.push({ id, laneId, x, y });
    this.redraw();
    return id;
  }

  linkWaypoints(from: string, to: string, weight = 1, meta?: Record<string, unknown>): void {
    const link: WaypointLink = { from, to, weight };
    if (meta) {
      link.meta = meta;
    }
    this.links.push(link);
    this.redraw();
  }

  alignToGrid(step = 32): void {
    const last = this.waypoints.at(-1);
    if (!last) {
      return;
    }
    last.x = Math.round(last.x / step) * step;
    last.y = Math.round(last.y / step) * step;
    this.redraw();
  }

  export(): string {
    const payload = {
      waypoints: this.waypoints,
      links: this.links
    };
    const json = JSON.stringify(payload, null, 2);
    // eslint-disable-next-line no-console
    console.log(json);
    return json;
  }

  clear(): void {
    this.waypoints = [];
    this.links = [];
    this.redraw();
  }

  private redraw(): void {
    if (!this.visible) {
      return;
    }
    this.gfx.clear();
    this.labels.forEach((label) => label.destroy());
    this.labels = [];
    this.gfx.lineStyle(1, 0x53d7ff, 0.4);
    this.links.forEach((link) => {
      const from = this.waypoints.find((wp) => wp.id === link.from);
      const to = this.waypoints.find((wp) => wp.id === link.to);
      if (!from || !to) {
        return;
      }
      this.gfx.lineBetween(from.x, from.y, to.x, to.y);
    });

    this.waypoints.forEach((wp) => {
      this.gfx.fillStyle(0xffffff, 1);
      this.gfx.fillCircle(wp.x, wp.y, 4);
      this.gfx.fillStyle(0x53d7ff, 0.9);
      this.gfx.fillCircle(wp.x, wp.y, 2);
      const label = this.scene.add
        .text(wp.x + 6, wp.y - 8, wp.id, { fontSize: '10px', fontFamily: 'monospace', color: '#53d7ff' })
        .setDepth(5000)
        .setScrollFactor(1)
        .setAlpha(0.8);
      this.labels.push(label);
    });
  }
}

interface PaintedZone {
  id: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export class SpawnZonePainter {
  private readonly scene: Phaser.Scene;
  private active = false;
  private readonly gfx: Phaser.GameObjects.Graphics;
  private readonly zones: PaintedZone[] = [];
  private cursorTypeIndex = 0;
  private readonly types = ['ped', 'vehicle', 'mission', 'shop', 'safehouse', 'respray'] as const;
  private dragStart: Phaser.Math.Vector2 | undefined;
  private dragPreview: Phaser.Math.Vector2 | undefined;
  private hudLabels: Phaser.GameObjects.Text[] = [];

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.gfx = scene.add.graphics({ x: 0, y: 0 }).setDepth(4000).setScrollFactor(1);
    this.gfx.setVisible(false);
    (window as unknown as { spawnPainter: SpawnZonePainter }).spawnPainter = this;
  }

  toggle(): void {
    this.active = !this.active;
    this.gfx.setVisible(this.active);
    if (this.active) {
      this.attachInput();
      this.scene.events.on(Phaser.Scenes.Events.UPDATE, this.redraw, this);
    } else {
      this.dragStart = undefined;
      this.dragPreview = undefined;
      this.detachInput();
      this.scene.events.off(Phaser.Scenes.Events.UPDATE, this.redraw, this);
      this.gfx.clear();
    }
  }

  nextType(step = 1): void {
    this.cursorTypeIndex = (this.cursorTypeIndex + step + this.types.length) % this.types.length;
  }

  isActive(): boolean {
    return this.active;
  }

  export(): string {
    const json = JSON.stringify(this.zones, null, 2);
    localStorage.setItem('spawnZoneDraft', json);
    // eslint-disable-next-line no-console
    console.log('Spawn zones export:', json);
    return json;
  }

  undo(): void {
    this.zones.pop();
    this.redraw();
  }

  clear(): void {
    this.zones.length = 0;
    this.redraw();
  }

  private attachInput(): void {
    this.scene.input.on('pointerdown', this.handlePointerDown, this);
    this.scene.input.on('pointermove', this.handlePointerMove, this);
    this.scene.input.on('pointerup', this.handlePointerUp, this);
  }

  private detachInput(): void {
    this.scene.input.off('pointerdown', this.handlePointerDown, this);
    this.scene.input.off('pointermove', this.handlePointerMove, this);
    this.scene.input.off('pointerup', this.handlePointerUp, this);
  }

  private handlePointerDown(pointer: Phaser.Input.Pointer): void {
    if (!this.active || pointer.button !== 0) {
      return;
    }
    const worldPoint = pointer.positionToCamera(this.scene.cameras.main) as Phaser.Math.Vector2;
    this.dragStart = new Phaser.Math.Vector2(worldPoint.x, worldPoint.y);
  }

  private handlePointerMove(pointer: Phaser.Input.Pointer): void {
    if (!this.active || !this.dragStart) {
      return;
    }
    const endPoint = pointer.positionToCamera(this.scene.cameras.main) as Phaser.Math.Vector2;
    let targetX = endPoint.x;
    let targetY = endPoint.y;
    if (pointer.event.shiftKey) {
      const dx = endPoint.x - this.dragStart.x;
      const dy = endPoint.y - this.dragStart.y;
      const size = Math.max(Math.abs(dx), Math.abs(dy));
      targetX = this.dragStart.x + Math.sign(dx || 1) * size;
      targetY = this.dragStart.y + Math.sign(dy || 1) * size;
    }
    this.dragPreview = new Phaser.Math.Vector2(targetX, targetY);
    this.redraw();
  }

  private handlePointerUp(pointer: Phaser.Input.Pointer): void {
    if (!this.active || !this.dragStart) {
      return;
    }
    const start = this.dragStart;
    const end = this.dragPreview ?? (pointer.positionToCamera(this.scene.cameras.main) as Phaser.Math.Vector2);
    const centerX = (start.x + end.x) / 2;
    const centerY = (start.y + end.y) / 2;
    const width = Math.abs(end.x - start.x);
    const height = Math.abs(end.y - start.y);
    if (width < 8 || height < 8) {
      this.dragStart = undefined;
      this.dragPreview = undefined;
      return;
    }
    const zoneType = this.types[this.cursorTypeIndex] ?? this.types[0];
    const id = `${zoneType}_${(this.zones.length + 1).toString().padStart(2, '0')}`;
    this.zones.push({ id, type: zoneType, x: centerX, y: centerY, width, height });
    this.dragStart = undefined;
    this.dragPreview = undefined;
    this.redraw();
  }

  private redraw(): void {
    if (!this.active) {
      return;
    }
    this.gfx.clear();
    this.hudLabels.forEach((label) => label.destroy());
    this.hudLabels = [];
    this.gfx.lineStyle(1, 0x44ffaa, 0.6);
    this.zones.forEach((zone) => {
      this.gfx.strokeRect(zone.x - zone.width / 2, zone.y - zone.height / 2, zone.width, zone.height);
    });

    if (this.dragStart && this.dragPreview) {
      const x = Math.min(this.dragStart.x, this.dragPreview.x);
      const y = Math.min(this.dragStart.y, this.dragPreview.y);
      const width = Math.abs(this.dragPreview.x - this.dragStart.x);
      const height = Math.abs(this.dragPreview.y - this.dragStart.y);
      this.gfx.lineStyle(1, 0xffcc44, 0.8);
      this.gfx.strokeRect(x, y, width, height);
    }

    this.gfx.fillStyle(0x001118, 0.6);
    this.gfx.fillRect(this.scene.cameras.main.scrollX + 16, this.scene.cameras.main.scrollY + 16, 200, 70);
    this.gfx.lineStyle(1, 0x44ffaa, 0.5);
    this.gfx.strokeRect(this.scene.cameras.main.scrollX + 16, this.scene.cameras.main.scrollY + 16, 200, 70);
    const typeLabel = this.types[this.cursorTypeIndex] ?? this.types[0];
    const label = this.scene.add
      .text(
        this.scene.cameras.main.scrollX + 24,
        this.scene.cameras.main.scrollY + 24,
        `Painter: ${typeLabel}`,
        {
          fontFamily: 'monospace',
          fontSize: '12px',
          color: '#bff6ff'
        }
      )
      .setDepth(4001)
      .setScrollFactor(0)
      .setAlpha(0.7);
    this.hudLabels.push(label);
  }
}

declare global {
  interface Window {
    editor?: WaypointEditor;
    spawnPainter?: SpawnZonePainter;
  }
}
