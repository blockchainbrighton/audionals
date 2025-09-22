import { describe, expect, it } from 'vitest';
import WantedSystem from '@systems/WantedSystem';
import type { HeatLevelDefinition } from '@game/types';

function createSceneStub() {
  return {
    time: { now: 0 }
  } as unknown as Phaser.Scene;
}

const HEAT_LEVELS: HeatLevelDefinition[] = [
  { level: 0, label: 'Calm', decayDelay: 1000, escalationCooldown: 0, spawnTable: [] },
  { level: 1, label: 'Alert', decayDelay: 1000, escalationCooldown: 0, spawnTable: [] },
  { level: 2, label: 'Hot', decayDelay: 2000, escalationCooldown: 0, spawnTable: [] }
];

describe('WantedSystem', () => {
  it('raises and decays heat over time', () => {
    const scene = createSceneStub();
    const wanted = new WantedSystem({ scene, heatLevels: HEAT_LEVELS });
    wanted.raise(2);
    expect(wanted.currentLevel).toBe(2);

    // Heat should not decay before delay
    wanted.update();
    expect(wanted.currentLevel).toBe(2);

    // Advance time beyond decay delay for level 2
    (scene.time as any).now = 2500;
    wanted.update();
    expect(wanted.currentLevel).toBe(1);

    // Advance time again for level 1
    (scene.time as any).now = 4000;
    wanted.update();
    expect(wanted.currentLevel).toBe(0);
  });

  it('clears heat immediately when clearHeat called', () => {
    const scene = createSceneStub();
    const wanted = new WantedSystem({ scene, heatLevels: HEAT_LEVELS });
    wanted.raise(1);
    wanted.clearHeat();
    expect(wanted.currentLevel).toBe(0);
  });
});
