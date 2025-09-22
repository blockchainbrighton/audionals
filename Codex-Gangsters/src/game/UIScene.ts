import Phaser from 'phaser';
import type CityScene from '@game/CityScene';
import { MissionDefinition, MissionObjective, SaveGamePayload } from '@game/types';

interface MissionModalPayload {
  type: 'missions';
  missions: MissionDefinition[];
  via?: 'payphone' | 'board';
}

interface ToastPayload {
  type: 'toast';
  message: string;
}

interface PausePayload {
  type: 'pause';
}

interface SavePayload {
  type: 'save';
  saves: Array<SaveGamePayload | null>;
}

interface ShopPayload {
  type: 'shop';
  metadata: Record<string, unknown>;
}

interface HeatPayload {
  type: 'heat';
  level: number;
}

interface MissionEventPayload {
  type: 'started' | 'completed' | 'failed';
  mission: MissionDefinition;
  payload?: unknown;
}

type ModalPayload = MissionModalPayload | ToastPayload | PausePayload | SavePayload | ShopPayload;

const WORLD_SIZE = 2048;
const MINIMAP_SIZE = 160;

export default class UIScene extends Phaser.Scene {
  private city!: CityScene;
  private hud!: Phaser.GameObjects.Container;
  private modal: Phaser.GameObjects.Container | undefined = undefined;
  private healthText!: Phaser.GameObjects.Text;
  private ammoText!: Phaser.GameObjects.Text;
  private cashText!: Phaser.GameObjects.Text;
  private heatStars: Phaser.GameObjects.Text[] = [];
  private objectiveText!: Phaser.GameObjects.Text;
  private missionTimerText!: Phaser.GameObjects.Text;
  private hintText!: Phaser.GameObjects.Text;
  private minimapGfx!: Phaser.GameObjects.Graphics;
  private minimapInfoText!: Phaser.GameObjects.Text;
  private lastMinimapUpdate = 0;
  private hintsShown = new Set<number>();
  private tutorialStart = 0;
  private currentObjective?: MissionObjective;
  private missionStateText!: Phaser.GameObjects.Text;
  private currentHeat = 0;
  private pausedForModal = false;

  constructor() {
    super('ui');
  }

  create(): void {
    this.scene.bringToTop();
    this.city = this.scene.get('city') as CityScene;
    this.setupHud();
    this.registerEvents();
    this.tutorialStart = this.time.now;
  }

  update(time: number, delta: number): void {
    if (!this.city) {
      return;
    }
    this.updateHud();
    if (time - this.lastMinimapUpdate > 200) {
      this.drawMinimap();
      this.lastMinimapUpdate = time;
    }
    this.updateHints(time);
  }

  shutdown(): void {
    this.unregisterEvents();
  }

  private setupHud(): void {
    this.hud = this.add.container(0, 0);
    this.hud.setDepth(1000);

    const hudBg = this.add.rectangle(10, 10, 300, 110, 0x0b1620, 0.7).setOrigin(0, 0);
    hudBg.setStrokeStyle(1, 0x1f3246, 0.8);
    this.hud.add(hudBg);

    this.healthText = this.add.text(20, 20, 'HP 100 | Armor 0', {
      fontFamily: 'monospace',
      fontSize: '16px',
      color: '#d1f5ff'
    });
    this.ammoText = this.add.text(20, 42, 'Pistol 12/48', {
      fontFamily: 'monospace',
      fontSize: '16px',
      color: '#efdf9b'
    });
    this.cashText = this.add.text(20, 64, '$0', {
      fontFamily: 'monospace',
      fontSize: '16px',
      color: '#a4ffb3'
    });

    this.hud.add([this.healthText, this.ammoText, this.cashText]);

    const heatLabel = this.add.text(20, 86, 'Heat:', {
      fontFamily: 'monospace',
      fontSize: '16px',
      color: '#ffdd66'
    });
    this.hud.add(heatLabel);

    for (let i = 0; i < 5; i += 1) {
      const star = this.add.text(80 + i * 18, 86, '☆', {
        fontFamily: 'monospace',
        fontSize: '16px',
        color: '#ffdd66'
      });
      this.heatStars.push(star);
      this.hud.add(star);
    }

    this.objectiveText = this.add.text(340, 20, 'Objective: Free roam', {
      fontFamily: 'monospace',
      fontSize: '16px',
      color: '#ffffff'
    });
    this.missionTimerText = this.add.text(340, 44, '', {
      fontFamily: 'monospace',
      fontSize: '16px',
      color: '#ff9f43'
    });
    this.missionStateText = this.add.text(340, 68, '', {
      fontFamily: 'monospace',
      fontSize: '16px',
      color: '#88ffda'
    });

    this.hintText = this.add.text(20, 640, '', {
      fontFamily: 'monospace',
      fontSize: '18px',
      color: '#ffffff'
    });
    this.hintText.setShadow(1, 1, '#000000', 2);

    this.minimapGfx = this.add.graphics({ x: 20, y: 140 });
    this.minimapGfx.setDepth(1000);
    this.minimapGfx.fillStyle(0x101620, 0.7);
    this.minimapGfx.fillRect(0, 0, MINIMAP_SIZE, MINIMAP_SIZE);
    this.minimapInfoText = this.add.text(20, 140 + MINIMAP_SIZE + 6, '', {
      fontFamily: 'monospace',
      fontSize: '12px',
      color: '#d7e9f2'
    });
    this.minimapInfoText.setDepth(1000);
  }

  private registerEvents(): void {
    this.city.events.on('ui:open', this.handleOpen, this);
    this.city.events.on('ui:heat', this.handleHeat, this);
    this.city.events.on('ui:objective', this.handleObjective, this);
    this.city.events.on('ui:mission', this.handleMissionEvent, this);
    this.city.events.on('ui:mission-timer', this.handleMissionTimer, this);
  }

  private unregisterEvents(): void {
    this.city.events.off('ui:open', this.handleOpen, this);
    this.city.events.off('ui:heat', this.handleHeat, this);
    this.city.events.off('ui:objective', this.handleObjective, this);
    this.city.events.off('ui:mission', this.handleMissionEvent, this);
    this.city.events.off('ui:mission-timer', this.handleMissionTimer, this);
  }

  private handleOpen(payload: ModalPayload): void {
    switch (payload.type) {
      case 'missions':
        this.showMissionModal(payload);
        break;
      case 'toast':
        this.showToast(payload.message);
        break;
      case 'pause':
        this.showPauseMenu();
        break;
      case 'save':
        this.showSaveMenu(payload.saves);
        break;
      case 'shop':
        this.showShop(payload.metadata);
        break;
      default:
        break;
    }
  }

  private handleHeat(level: number): void {
    this.currentHeat = level;
  }

  private handleObjective(objective: MissionObjective): void {
    this.currentObjective = objective;
    this.objectiveText.setText(`Objective: ${objective.description}`);
  }

  private handleMissionEvent(event: MissionEventPayload): void {
    if (event.type === 'started') {
      this.missionStateText.setColor('#88ffda');
      this.missionStateText.setText(`Mission started: ${event.mission.name}`);
    }
    if (event.type === 'completed') {
      this.missionStateText.setColor('#6bff6b');
      this.missionStateText.setText(`Mission complete! Reward $${event.mission.reward}`);
      this.time.delayedCall(4000, () => this.missionStateText.setText(''), undefined, this);
    }
    if (event.type === 'failed') {
      this.missionStateText.setColor('#ff6b6b');
      this.missionStateText.setText(`Mission failed: ${event.mission.name}`);
      this.time.delayedCall(4000, () => this.missionStateText.setText(''), undefined, this);
    }
  }

  private handleMissionTimer(msRemaining: number): void {
    if (msRemaining <= 0) {
      this.missionTimerText.setText('Time: FAILED');
      return;
    }
    const seconds = Math.ceil(msRemaining / 1000);
    this.missionTimerText.setText(`Time: ${seconds}s`);
  }

  private updateHud(): void {
    const stats = this.city.getPlayerStats();
    this.healthText.setText(`HP ${Math.round(stats.health)} | Armor ${Math.round(stats.armor)}`);
    this.ammoText.setText(`${stats.weapon.name} ${stats.weapon.clip}/${stats.weapon.reserve}`);
    this.cashText.setText(`$${stats.cash}`);
    this.updateHeatStars();
  }

  private updateHeatStars(): void {
    this.heatStars.forEach((star, index) => {
      star.setText(index < this.currentHeat ? '★' : '☆');
      star.setColor(index < this.currentHeat ? '#ffcc33' : '#55707b');
    });
  }

  private drawMinimap(): void {
    const stats = this.city.getPlayerStats();
    const world = this.city.getWorldInfo();
    const playerPos = this.city.getPlayerPosition();
    this.minimapGfx.clear();
    this.minimapGfx.fillStyle(0x101620, 0.7);
    this.minimapGfx.fillRect(0, 0, MINIMAP_SIZE, MINIMAP_SIZE);
    this.minimapGfx.lineStyle(1, 0x273548, 0.9);
    for (let x = 0; x < 2; x += 1) {
      for (let y = 0; y < 2; y += 1) {
        const rectX = (x * MINIMAP_SIZE) / 2;
        const rectY = (y * MINIMAP_SIZE) / 2;
        this.minimapGfx.strokeRect(rectX, rectY, MINIMAP_SIZE / 2, MINIMAP_SIZE / 2);
      }
    }

    const px = Phaser.Math.Clamp((playerPos.x / WORLD_SIZE) * MINIMAP_SIZE, 0, MINIMAP_SIZE);
    const py = Phaser.Math.Clamp((playerPos.y / WORLD_SIZE) * MINIMAP_SIZE, 0, MINIMAP_SIZE);
    this.minimapGfx.fillStyle(0x72ffee, 1);
    this.minimapGfx.fillCircle(px, py, 3);

    const timeHours = Math.floor(world.timeOfDayMinutes / 60)
      .toString()
      .padStart(2, '0');
    const timeMinutes = Math.floor(world.timeOfDayMinutes % 60)
      .toString()
      .padStart(2, '0');
    this.minimapInfoText.setText(`${timeHours}:${timeMinutes}  ${world.weather.toUpperCase()}`);
  }

  private updateHints(time: number): void {
    const elapsed = time - this.tutorialStart;
    const hintSchedule: Array<[number, string]> = [
      [0, 'WASD to move, mouse to aim, LMB to fire'],
      [6000, 'Press E near a vehicle to enter it'],
      [12000, 'F interacts with mission boards, payphones, shops'],
      [20000, 'Escape heat by breaking line-of-sight or using respray garages'],
      [28000, 'TAB opens save slots anywhere; safe-houses auto-save']
    ];

    const nextHint = hintSchedule.find(([ms]) => elapsed >= ms && !this.hintsShown.has(ms));
    if (nextHint) {
      this.hintsShown.add(nextHint[0]);
      this.hintText.setText(nextHint[1]);
      this.time.delayedCall(5000, () => {
        if (this.hintText.text === nextHint[1]) {
          this.hintText.setText('');
        }
      });
    }
  }

  private showMissionModal(payload: MissionModalPayload): void {
    this.closeModal();
    this.pauseCityForModal();
    this.modal = this.createModalContainer('Mission Select');
    let offsetY = -60;
    payload.missions.forEach((mission) => {
      const option = this.add.text(0, offsetY, `${mission.name} - $${mission.reward}`, {
        fontFamily: 'monospace',
        fontSize: '18px',
        color: '#dff6ff'
      });
      option.setInteractive({ useHandCursor: true });
      option.on('pointerup', () => {
        this.city.requestStartMission(mission.id);
        this.closeModal();
        this.city.resumeGameplay();
      });
      this.modal?.add(option);
      offsetY += 30;
    });
    const cancel = this.add.text(0, offsetY + 10, 'Cancel', {
      fontFamily: 'monospace',
      fontSize: '16px',
      color: '#ff8a8a'
    });
    cancel.setInteractive({ useHandCursor: true });
    cancel.on('pointerup', () => this.closeModal());
    this.modal?.add(cancel);
  }

  private showToast(message: string): void {
    const toast = this.add.text(640, 60, message, {
      fontFamily: 'monospace',
      fontSize: '20px',
      color: '#ffffff'
    }).setOrigin(0.5, 0.5);
    toast.setDepth(2000);
    toast.setAlpha(0);
    this.tweens.add({ targets: toast, alpha: 1, duration: 250, yoyo: true, hold: 2000, onComplete: () => toast.destroy() });
  }

  private showPauseMenu(): void {
    this.closeModal();
    this.modal = this.createModalContainer('Paused');
    const resume = this.add.text(0, -20, 'Resume', {
      fontFamily: 'monospace',
      fontSize: '20px',
      color: '#dff6ff'
    }).setInteractive({ useHandCursor: true });
    resume.on('pointerup', () => {
      this.closeModal();
      this.city.resumeGameplay();
      this.scene.resume('city');
    });
    const settings = this.add.text(0, 10, 'Settings placeholder', {
      fontFamily: 'monospace',
      fontSize: '16px',
      color: '#9fbac8'
    });
    const quit = this.add.text(0, 40, 'Back to game', {
      fontFamily: 'monospace',
      fontSize: '18px',
      color: '#ff8a8a'
    }).setInteractive({ useHandCursor: true });
    quit.on('pointerup', () => {
      this.closeModal();
      this.city.resumeGameplay();
    });
    this.modal?.add([resume, settings, quit]);
  }

  private showSaveMenu(saves: Array<SaveGamePayload | null>): void {
    this.closeModal();
    this.pauseCityForModal();
    this.modal = this.createModalContainer('Save Slots');
    const help = this.add.text(0, -70, 'Click empty slot to save, filled slot to load', {
      fontFamily: 'monospace',
      fontSize: '14px',
      color: '#9fbac8'
    }).setOrigin(0.5, 0.5);
    this.modal?.add(help);
    saves.forEach((save, index) => {
      const labelText = save
        ? `Slot ${index + 1}: ${new Date(save.updatedAt).toLocaleTimeString()} | $${save.player.cash}`
        : `Slot ${index + 1}: Empty`;
      const label = this.add.text(0, -40 + index * 26, labelText, {
        fontFamily: 'monospace',
        fontSize: '16px',
        color: '#dff6ff'
      }).setInteractive({ useHandCursor: true });
      label.on('pointerup', () => {
        if (save) {
          const loaded = this.city.requestLoad(index);
          this.showToast(loaded ? 'Loaded save' : 'Slot empty');
          this.closeModal();
        } else {
          this.city.saveToSlot(index);
          this.showToast('Saved current progress');
          this.closeModal();
        }
      });
      this.modal?.add(label);
    });
    const close = this.add.text(0, 50, 'Close', {
      fontFamily: 'monospace',
      fontSize: '16px',
      color: '#ff8a8a'
    }).setInteractive({ useHandCursor: true });
    close.on('pointerup', () => this.closeModal());
    this.modal?.add(close);
  }

  private showShop(metadata: Record<string, unknown>): void {
    this.closeModal();
    this.pauseCityForModal();
    this.modal = this.createModalContainer('Shop');
    const desc = this.add.text(0, -20, `Inventory rotates hourly`, {
      fontFamily: 'monospace',
      fontSize: '16px',
      color: '#dff6ff'
    });
    const close = this.add.text(0, 30, 'Close', {
      fontFamily: 'monospace',
      fontSize: '16px',
      color: '#ff8a8a'
    }).setInteractive({ useHandCursor: true });
    close.on('pointerup', () => this.closeModal());
    this.modal?.add([desc, close]);
  }

  private createModalContainer(title: string): Phaser.GameObjects.Container {
    const modal = this.add.container(640, 360);
    modal.setDepth(1500);
    const bg = this.add.rectangle(0, 0, 360, 260, 0x0b1620, 0.92);
    bg.setStrokeStyle(2, 0x1f3246, 1);
    const heading = this.add.text(0, -110, title, {
      fontFamily: 'monospace',
      fontSize: '22px',
      color: '#ffffff'
    }).setOrigin(0.5, 0.5);
    modal.add([bg, heading]);
    return modal;
  }

  private closeModal(): void {
    if (this.modal) {
      this.modal.destroy(true);
      this.modal = undefined;
    }
    if (this.pausedForModal) {
      this.scene.resume('city');
      this.pausedForModal = false;
    }
  }

  private pauseCityForModal(): void {
    if (!this.scene.isPaused('city')) {
      this.scene.pause('city');
      this.pausedForModal = true;
    }
  }
}
