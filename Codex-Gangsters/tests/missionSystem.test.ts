import { beforeEach, describe, expect, it, vi } from 'vitest';
import MissionSystem from '@systems/MissionSystem';
import type { MissionDefinition } from '@game/types';

const MISSION: MissionDefinition = {
  id: 'test_mission',
  name: 'Test Mission',
  giver: 'board',
  description: 'A simple objective chain.',
  reward: 100,
  objectives: [
    { id: 'one', description: 'Reach point', type: 'reach', target: { x: 0, y: 0, district: 'downtown' } },
    { id: 'two', description: 'Escape', type: 'escape', timeLimit: 5000 }
  ]
};

describe('MissionSystem', () => {
  let system: MissionSystem;

  beforeEach(() => {
    system = new MissionSystem({ scene: {} as never, missions: [MISSION] });
  });

  it('starts and completes mission objectives sequentially', () => {
    const started = vi.fn();
    const completed = vi.fn();
    system.on('mission-started', started);
    system.on('mission-completed', completed);

    system.startMission('test_mission');
    expect(started).toHaveBeenCalled();
    expect(system.getCurrentObjective()?.id).toBe('one');

    system.completeCurrentObjective();
    expect(system.getCurrentObjective()?.id).toBe('two');

    system.completeCurrentObjective();
    expect(completed).toHaveBeenCalled();
    const resolved = system.resolveMission();
    expect(resolved?.id).toBe('test_mission');
    expect(system.getActiveMission()).toBeUndefined();
  });

  it('fails mission when timer expires', () => {
    const failed = vi.fn();
    system.on('mission-failed', failed);
    system.startMission('test_mission');
    system.completeCurrentObjective();
    system.update(6000);
    expect(failed).toHaveBeenCalled();
  });
});
