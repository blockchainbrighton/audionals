import type Phaser from 'phaser';
import { HeatHistoryEntry, HeatLevelDefinition } from '@game/types';
import SimpleEventEmitter from '@game/utils/SimpleEventEmitter';

interface WantedSystemConfig {
  scene: Phaser.Scene;
  heatLevels: HeatLevelDefinition[];
}

const clamp = (value: number, min: number, max: number): number => Math.min(Math.max(value, min), max);

export default class WantedSystem extends SimpleEventEmitter {
  private readonly scene: Phaser.Scene;
  private readonly heatLevels: HeatLevelDefinition[];
  private level = 0;
  private lastSightedTime = 0;
  private readonly history: HeatHistoryEntry[] = [];

  constructor(config: WantedSystemConfig) {
    super();
    this.scene = config.scene;
    this.heatLevels = config.heatLevels.sort((a, b) => a.level - b.level);
  }

  get currentLevel(): number {
    return this.level;
  }

  raise(amount: number): void {
    const prev = this.level;
    this.level = clamp(this.level + amount, 0, 5);
    if (this.level !== prev) {
      this.history.push({ level: this.level, timestamp: Date.now() });
      this.emit('heat-change', this.level);
    }
    this.lastSightedTime = this.scene.time.now;
  }

  markSighted(): void {
    this.lastSightedTime = this.scene.time.now;
  }

  clearHeat(): void {
    if (this.level > 0) {
      this.level = 0;
      this.emit('heat-change', this.level);
      this.history.push({ level: 0, timestamp: Date.now() });
    }
  }

  update(): void {
    if (this.level <= 0) {
      return;
    }
    const definition = this.heatLevels.find((heat) => heat.level === this.level);
    if (!definition) {
      return;
    }
    const elapsed = this.scene.time.now - this.lastSightedTime;
    if (elapsed > definition.decayDelay) {
      this.level = Math.max(0, this.level - 1);
      this.history.push({ level: this.level, timestamp: Date.now() });
      this.emit('heat-change', this.level);
      this.lastSightedTime = this.scene.time.now;
    }
  }

  getHistory(): HeatHistoryEntry[] {
    return [...this.history];
  }
}
