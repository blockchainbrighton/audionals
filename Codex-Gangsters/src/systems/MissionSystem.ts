import type Phaser from 'phaser';
import { MissionDefinition, MissionObjective } from '@game/types';
import SimpleEventEmitter from '@game/utils/SimpleEventEmitter';

export type MissionState = 'idle' | 'active' | 'success' | 'failed';

interface MissionSystemConfig {
  scene: Phaser.Scene;
  missions: MissionDefinition[];
}

interface ActiveMission {
  definition: MissionDefinition;
  currentObjectiveIndex: number;
  timer?: number;
  state: MissionState;
}

export default class MissionSystem extends SimpleEventEmitter {
  private readonly scene: Phaser.Scene;
  private readonly missions: MissionDefinition[];
  private activeMission: ActiveMission | undefined;

  constructor(config: MissionSystemConfig) {
    super();
    this.scene = config.scene;
    this.missions = config.missions;
  }

  getActiveMission(): ActiveMission | undefined {
    return this.activeMission;
  }

  getCurrentObjective(): MissionObjective | undefined {
    if (!this.activeMission) {
      return undefined;
    }
    return this.activeMission.definition.objectives[this.activeMission.currentObjectiveIndex];
  }

  getAvailableMissions(): MissionDefinition[] {
    if (this.activeMission) {
      return [];
    }
    return this.missions;
  }

  startMission(id: string): void {
    if (this.activeMission) {
      return;
    }
    const mission = this.missions.find((item) => item.id === id);
    if (!mission) {
      return;
    }
    if (mission.objectives.length === 0) {
      return;
    }
    this.activeMission = {
      definition: mission,
      currentObjectiveIndex: 0,
      state: 'active'
    };
    this.emit('mission-started', mission);
    this.prepareObjective(mission.objectives[0]);
  }

  completeCurrentObjective(): void {
    const mission = this.activeMission;
    if (!mission || mission.state !== 'active') {
      return;
    }
    mission.currentObjectiveIndex += 1;
    if (mission.currentObjectiveIndex >= mission.definition.objectives.length) {
      mission.state = 'success';
      this.emit('mission-completed', mission.definition);
      return;
    }
    const nextObjective = mission.definition.objectives[mission.currentObjectiveIndex];
    if (nextObjective) {
      this.prepareObjective(nextObjective);
    }
  }

  failActiveMission(reason: string): void {
    const mission = this.activeMission;
    if (!mission) {
      return;
    }
    mission.state = 'failed';
    this.emit('mission-failed', { definition: mission.definition, reason });
  }

  resolveMission(): MissionDefinition | undefined {
    const mission = this.activeMission;
    if (!mission) {
      return undefined;
    }
    if (mission.state === 'success' || mission.state === 'failed') {
      this.activeMission = undefined;
      return mission.definition;
    }
    return undefined;
  }

  update(delta: number): void {
    const mission = this.activeMission;
    if (!mission || mission.state !== 'active') {
      return;
    }
    const objective = mission.definition.objectives[mission.currentObjectiveIndex];
    if (!objective) {
      return;
    }
    if (objective.timeLimit !== undefined) {
      mission.timer = (mission.timer ?? objective.timeLimit) - delta;
      this.emit('mission-timer', mission.timer);
      if (mission.timer <= 0) {
        this.failActiveMission('timeout');
      }
    }
  }

  private prepareObjective(objective: MissionObjective | undefined): void {
    if (!this.activeMission || !objective) {
      return;
    }
    if (objective.timeLimit !== undefined) {
      this.activeMission.timer = objective.timeLimit;
    }
    this.emit('mission-objective', objective);
  }
}
