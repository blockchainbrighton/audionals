import Phaser from 'phaser';
import Player from '@actors/Player';
import { VehicleDefinition } from '@game/types';
import { stepVehiclePhysics, VehicleControlInput } from '@game/vehiclePhysics';

export type VehicleController = 'player' | 'traffic' | 'police';

export default class Vehicle extends Phaser.Physics.Arcade.Sprite {
  definition: VehicleDefinition;
  private controller: VehicleController = 'traffic';
  private controlledBy: Player | undefined;
  private velocity = new Phaser.Math.Vector2();
  private readonly desiredVelocity = new Phaser.Math.Vector2();
  private targetWaypoint: Phaser.Math.Vector2 | undefined;
  private patrolPath: Phaser.Math.Vector2[] = [];
  private patrolIndex = 0;
  private crashCooldown = 0;
  private health = 100;

  constructor(scene: Phaser.Scene, x: number, y: number, definition: VehicleDefinition) {
    super(scene, x, y, definition.spriteKey);
    this.definition = definition;
    this.setDepth(5);
    this.setSize(definition.width, definition.height);
    this.setOrigin(0.5, 0.55);
    this.anims.pause();

    scene.physics.add.existing(this);
    const body = this.body as Phaser.Physics.Arcade.Body | undefined;
    if (body) {
      body.setAllowRotation(true);
      body.setDrag(definition.grip * 100, definition.grip * 100);
      body.setMass(definition.weight);
    }
  }

  resetFromConfig(x: number, y: number, definition: VehicleDefinition): void {
    this.definition = definition;
    this.setPosition(x, y);
    this.setTexture(definition.spriteKey);
    this.controller = 'traffic';
    this.health = 100;
    this.setActive(true);
    this.setVisible(true);
    const body = this.body as Phaser.Physics.Arcade.Body | undefined;
    if (body) {
      body.setVelocity(0, 0);
      body.setAngularVelocity(0);
    }
  }

  takeControl(player: Player): void {
    this.controller = 'player';
    this.controlledBy = player;
    const body = this.body as Phaser.Physics.Arcade.Body | undefined;
    body?.setDrag(this.definition.grip * 100, this.definition.grip * 100);
  }

  releaseControl(): void {
    this.controller = 'traffic';
    this.controlledBy = undefined;
  }

  setPatrol(path: Phaser.Math.Vector2[]): void {
    this.patrolPath = path;
    this.patrolIndex = 0;
    this.targetWaypoint = this.patrolPath[0];
  }

  handlePlayerControl(delta: number): void {
    const keyboard = this.scene.input.keyboard;
    if (!keyboard) {
      return;
    }
    const throttleKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W);
    const brakeKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S);
    const leftKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    const rightKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);
    const handbrakeKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

    const input: VehicleControlInput = {
      throttle: throttleKey.isDown ? 1 : 0,
      brake: brakeKey.isDown ? 1 : 0,
      steering: (leftKey.isDown ? -1 : 0) + (rightKey.isDown ? 1 : 0),
      handbrake: handbrakeKey.isDown
    };

    this.applyControls(delta, input);
  }

  tick(delta: number): void {
    if (!this.active) {
      return;
    }
    if (this.controller !== 'player') {
      this.updateAutopilot(delta);
    }
    this.updateMotion(delta);
    if (this.crashCooldown > 0) {
      this.crashCooldown -= delta;
    }
  }

  damage(amount: number): void {
    this.health -= amount;
    if (this.health <= 0) {
      this.explode();
    }
  }

  private applyControls(delta: number, input: VehicleControlInput): void {
    const body = this.body as Phaser.Physics.Arcade.Body | undefined;
    if (!body) {
      return;
    }
    const state = {
      velocity: { x: body.velocity.x, y: body.velocity.y },
      rotation: this.rotation
    };
    const result = stepVehiclePhysics(state, input, this.definition, delta);
    body.setVelocity(result.velocity.x, result.velocity.y);
    body.angularVelocity = result.angularVelocity * Phaser.Math.RAD_TO_DEG;
    this.rotation = result.rotation;
  }

  private updateAutopilot(delta: number): void {
    if (!this.targetWaypoint && this.patrolPath.length > 0) {
      this.targetWaypoint = this.patrolPath[0];
    }
    if (!this.targetWaypoint) {
      const body = this.body as Phaser.Physics.Arcade.Body | undefined;
      body?.setAcceleration(0, 0);
      return;
    }
    const distance = Phaser.Math.Distance.Between(this.x, this.y, this.targetWaypoint.x, this.targetWaypoint.y);
    if (distance < 32) {
      this.patrolIndex = (this.patrolIndex + 1) % this.patrolPath.length;
      this.targetWaypoint = this.patrolPath[this.patrolIndex];
    }

    const waypoint = this.targetWaypoint;
    if (!waypoint) {
      return;
    }
    const direction = Phaser.Math.Angle.Between(this.x, this.y, waypoint.x, waypoint.y);
    const diff = Phaser.Math.Angle.Wrap(direction - this.rotation);
    const steering = Phaser.Math.Clamp(diff * 2, -1, 1);

    const input: VehicleControlInput = {
      throttle: 0.8,
      brake: distance < 64 ? 0.5 : 0,
      steering,
      handbrake: false
    };

    this.applyControls(delta, input);
  }

  private updateMotion(delta: number): void {
    const body = this.body as Phaser.Physics.Arcade.Body | undefined;
    if (!body) {
      return;
    }
    this.velocity.copy(body.velocity);
    this.desiredVelocity.copy(this.velocity);
    body.setDrag(this.definition.grip * 100, this.definition.grip * 100);
    body.maxSpeed = this.definition.maxSpeed;
  }

  private explode(): void {
    const body = this.body as Phaser.Physics.Arcade.Body | undefined;
    body?.setVelocity(0, 0);
    this.scene.sound.play('sfx_explosion', { volume: 0.5 });
    const sprite = this.scene.add.sprite(this.x, this.y, 'fx_smoke');
    sprite.play?.('explode');
    this.setActive(false);
    this.setVisible(false);
    this.controller = 'traffic';
    this.controlledBy?.handleVehicleDestroyed(this);
  }
}
