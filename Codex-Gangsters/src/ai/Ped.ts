import Phaser from 'phaser';
import { PedDefinition } from '@game/types';

export type PedState = 'idle' | 'walk' | 'react' | 'flee';

export default class Ped extends Phaser.Physics.Arcade.Sprite {
  definition: PedDefinition;
  state: PedState = 'idle';
  private stateTimer = 0;
  private target?: Phaser.Math.Vector2;
  private fleeFrom?: Phaser.Math.Vector2;

  constructor(scene: Phaser.Scene, x: number, y: number, definition: PedDefinition) {
    super(scene, x, y, 'ped_base');
    this.definition = definition;
    this.setDepth(4);
   this.setOrigin(0.5, 0.6);
   scene.physics.add.existing(this);
    const body = this.body as Phaser.Physics.Arcade.Body | undefined;
    body?.setCircle(6, 1, 2);
    this.resetFromConfig(x, y, definition);
  }

  resetFromConfig(x: number, y: number, definition: PedDefinition): void {
    this.definition = definition;
    this.setPosition(x, y);
    this.state = 'idle';
    this.stateTimer = Phaser.Math.Between(2000, 4000);
    this.setActive(true);
    this.setVisible(true);
    const body = this.body as Phaser.Physics.Arcade.Body | undefined;
    body?.setVelocity(0, 0);
    body?.setDrag(120, 120);
  }

  tick(delta: number): void {
    if (!this.active) {
      return;
    }
    this.stateTimer -= delta;
    switch (this.state) {
      case 'idle':
        if (this.stateTimer <= 0) {
          this.chooseNewTarget();
        }
        break;
      case 'walk':
        this.moveTowardsTarget();
        if (this.stateTimer <= 0) {
          this.state = 'idle';
          this.stateTimer = Phaser.Math.Between(2000, 5000);
          const body = this.body as Phaser.Physics.Arcade.Body | undefined;
          body?.setVelocity(0, 0);
        }
        break;
      case 'react':
        if (this.stateTimer <= 0) {
          this.state = 'flee';
          this.stateTimer = Phaser.Math.Between(2000, 4000);
        }
        break;
      case 'flee':
        this.fleeFromThreat();
        if (this.stateTimer <= 0) {
          this.state = 'idle';
          this.stateTimer = Phaser.Math.Between(3000, 6000);
        }
        break;
      default:
        break;
    }
  }

  alert(threatPosition: Phaser.Math.Vector2): void {
    const distance = Phaser.Math.Distance.Between(this.x, this.y, threatPosition.x, threatPosition.y);
    if (distance > this.definition.hearingRadius) {
      return;
    }
    this.state = 'react';
    this.stateTimer = 500;
    this.fleeFrom = threatPosition.clone();
  }

  private chooseNewTarget(): void {
    this.state = 'walk';
    this.stateTimer = Phaser.Math.Between(2000, 4000);
    const offset = new Phaser.Math.Vector2(Phaser.Math.Between(-96, 96), Phaser.Math.Between(-96, 96));
    this.target = new Phaser.Math.Vector2(this.x, this.y).add(offset);
  }

  private moveTowardsTarget(): void {
    if (!this.target) {
      this.chooseNewTarget();
      return;
    }
    const body = this.body as Phaser.Physics.Arcade.Body | undefined;
    const direction = this.target.clone().subtract(new Phaser.Math.Vector2(this.x, this.y));
    const speed = this.definition.baseSpeed;
    if (direction.lengthSq() < 16) {
      this.state = 'idle';
      this.stateTimer = Phaser.Math.Between(2000, 5000);
      body?.setVelocity(0, 0);
      return;
    }
    direction.normalize();
    body?.setVelocity(direction.x * speed, direction.y * speed);
    this.rotation = Phaser.Math.Angle.Between(this.x, this.y, this.target.x, this.target.y);
  }

  private fleeFromThreat(): void {
    if (!this.fleeFrom) {
      this.state = 'idle';
      return;
    }
    const body = this.body as Phaser.Physics.Arcade.Body | undefined;
    const direction = new Phaser.Math.Vector2(this.x, this.y).subtract(this.fleeFrom).normalize();
    const speed = this.definition.baseSpeed * 1.5;
    body?.setVelocity(direction.x * speed, direction.y * speed);
    this.rotation = Phaser.Math.Angle.Between(this.fleeFrom.x, this.fleeFrom.y, this.x, this.y);
  }
}
