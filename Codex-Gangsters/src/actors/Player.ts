import Phaser from 'phaser';
import Vehicle from '@actors/Vehicle';
import { WeaponDefinition } from '@game/types';
import { GameEvents } from '@game/events';

export type PlayerMode = 'on-foot' | 'in-vehicle';
export type WeaponSlot = 'fists' | 'pistol' | 'smg' | 'shotgun' | 'grenade';

interface WeaponState {
  ammoReserve: number;
  clip: number;
  lastFiredAt: number;
}

interface PlayerConfig {
  scene: Phaser.Scene;
  x: number;
  y: number;
  weaponDefinitions: Record<string, WeaponDefinition>;
  initialWeapons: WeaponSlot[];
  eventBus: Phaser.Events.EventEmitter;
  queryNearbyVehicle: () => Vehicle | undefined;
  onFireHitscan: (weapon: WeaponDefinition, origin: Phaser.Math.Vector2, direction: Phaser.Math.Vector2) => void;
  onThrowProjectile: (weapon: WeaponDefinition, origin: Phaser.Math.Vector2, direction: Phaser.Math.Vector2) => void;
}

export default class Player extends Phaser.Physics.Arcade.Sprite {
  private readonly eventBus: Phaser.Events.EventEmitter;
  private readonly weaponDefinitions: Record<string, WeaponDefinition>;
  private readonly queryNearbyVehicle: () => Vehicle | undefined;
  private readonly onFireHitscan: PlayerConfig['onFireHitscan'];
  private readonly onThrowProjectile: PlayerConfig['onThrowProjectile'];
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: Record<string, Phaser.Input.Keyboard.Key>;
  private actionKey!: Phaser.Input.Keyboard.Key;
  private reloadKey!: Phaser.Input.Keyboard.Key;
  private pauseKey!: Phaser.Input.Keyboard.Key;
  private currentMode: PlayerMode = 'on-foot';
  private currentVehicle: Vehicle | undefined = undefined;
  private activeWeapon: WeaponSlot = 'fists';
  private weaponStates: Partial<Record<WeaponSlot, WeaponState>> = {};
  private health = 100;
  private armor = 0;
  private cash = 200;
  private heat = 0;
  private pointer: Phaser.Input.Pointer;
  private readonly inventory = new Set<WeaponSlot>();
  private readonly reticle: Phaser.GameObjects.Graphics;
  private isFiring = false;
  private weaponSelectKeys: Array<[WeaponSlot, Phaser.Input.Keyboard.Key]> = [];

  constructor({ scene, x, y, weaponDefinitions, initialWeapons, eventBus, queryNearbyVehicle, onFireHitscan, onThrowProjectile }: PlayerConfig) {
    super(scene, x, y, 'player_base');
    this.scene = scene;
    this.weaponDefinitions = weaponDefinitions;
    this.eventBus = eventBus;
    this.queryNearbyVehicle = queryNearbyVehicle;
    this.onFireHitscan = onFireHitscan;
    this.onThrowProjectile = onThrowProjectile;

    this.scene.add.existing(this);
    this.scene.physics.add.existing(this);

    this.setDepth(10);
    this.setOrigin(0.5, 0.6);
    const body = this.body as Phaser.Physics.Arcade.Body | undefined;
    if (body) {
      body.setSize(12, 12);
      body.setOffset(2, 2);
      body.setCollideWorldBounds(false);
    }

    const keyboard = this.scene.input.keyboard!;
    this.cursors = keyboard.createCursorKeys();
    this.pointer = this.scene.input.activePointer;
    this.setupAdditionalKeys();

    initialWeapons.forEach((weapon) => this.inventory.add(weapon));
    this.inventory.add('fists');
    this.ensureWeaponState('fists');

    this.reticle = this.scene.add.graphics({ x: 0, y: 0 });
    this.reticle.setDepth(100);
    this.reticleVisible(false);

    this.scene.input.on('pointerdown', this.handlePointerDown, this);
    this.scene.input.on('pointerup', this.handlePointerUp, this);
  }

  getMode(): PlayerMode {
    return this.currentMode;
  }

  getHealth(): number {
    return this.health;
  }

  getArmor(): number {
    return this.armor;
  }

  getCash(): number {
    return this.cash;
  }

  getHeat(): number {
    return this.heat;
  }

  setHeat(value: number): void {
    this.heat = value;
  }

  getActiveWeapon(): WeaponSlot {
    return this.activeWeapon;
  }

  getWeaponDefinition(slot: WeaponSlot): WeaponDefinition | undefined {
    return this.weaponDefinitions[slot];
  }

  getWeaponStatus(slot: WeaponSlot = this.activeWeapon): { clip: number; reserve: number } {
    const state = this.ensureWeaponState(slot);
    return { clip: state.clip, reserve: state.ammoReserve };
  }

  getInventory(): WeaponSlot[] {
    return Array.from(this.inventory.values());
  }

  addCash(amount: number): void {
    this.cash += amount;
    this.eventBus.emit(GameEvents.CashChanged, this.cash);
  }

  spendCash(amount: number): boolean {
    if (this.cash < amount) {
      return false;
    }
    this.cash -= amount;
    this.eventBus.emit(GameEvents.CashChanged, this.cash);
    return true;
  }

  takeDamage(amount: number): void {
    const armorAbsorb = Math.min(this.armor, amount * 0.6);
    const remaining = amount - armorAbsorb;
    this.armor = Math.max(0, this.armor - armorAbsorb);
    this.health = Math.max(0, this.health - remaining);
    this.eventBus.emit(GameEvents.PlayerDamaged, { health: this.health, armor: this.armor });
    if (this.health <= 0) {
      this.handleDeath();
    }
  }

  heal(amount: number): void {
    this.health = Phaser.Math.Clamp(this.health + amount, 0, 100);
  }

  giveArmor(amount: number): void {
    this.armor = Phaser.Math.Clamp(this.armor + amount, 0, 100);
  }

  giveWeapon(slot: WeaponSlot): void {
    this.inventory.add(slot);
    this.ensureWeaponState(slot);
  }

  setWeapon(slot: WeaponSlot): void {
    if (this.inventory.has(slot)) {
      this.activeWeapon = slot;
    }
  }

  update(time: number, delta: number): void {
    if (!this.active) {
      return;
    }
    this.handleControls(delta);
    this.updateAimVisuals();

    if (this.currentMode === 'on-foot') {
      this.updateOnFootMovement(delta);
    } else if (this.currentVehicle) {
      this.x = this.currentVehicle.x;
      this.y = this.currentVehicle.y;
      this.setVisible(false);
    }

    if (this.isFiring) {
      this.tryFire(time);
    }
  }

  enterVehicle(vehicle: Vehicle): void {
    if (this.currentMode === 'in-vehicle') {
      return;
    }
    this.currentMode = 'in-vehicle';
    this.currentVehicle = vehicle;
    vehicle.takeControl(this);
    this.setVisible(false);
    this.eventBus.emit(GameEvents.PlayerEnteredVehicle, vehicle);
  }

  exitVehicle(): void {
    if (this.currentMode !== 'in-vehicle' || !this.currentVehicle) {
      return;
    }
    const vehicle = this.currentVehicle;
    this.currentMode = 'on-foot';
    this.currentVehicle = undefined;
    this.setVisible(true);
    vehicle.releaseControl();
    this.x = vehicle.x + Phaser.Math.Between(-12, 12);
    this.y = vehicle.y + Phaser.Math.Between(-12, 12);
    this.eventBus.emit(GameEvents.PlayerExitedVehicle, { x: this.x, y: this.y });
  }

  handleVehicleDestroyed(vehicle: Vehicle): void {
    if (this.currentVehicle === vehicle) {
      this.exitVehicle();
      this.takeDamage(40);
    }
  }

  serialize(): { x: number; y: number; cash: number; health: number; armor: number; weapon: WeaponSlot } {
    return {
      x: this.x,
      y: this.y,
      cash: this.cash,
      health: this.health,
      armor: this.armor,
      weapon: this.activeWeapon
    };
  }

  restore(state: { x: number; y: number; cash: number; health: number; armor: number; weapon: WeaponSlot }): void {
    this.setPosition(state.x, state.y);
    this.cash = state.cash;
    this.health = state.health;
    this.armor = state.armor;
    this.setWeapon(state.weapon);
  }

  private handleControls(delta: number): void {
    const keyboard = this.scene.input.keyboard;
    if (keyboard?.checkDown(this.actionKey, 0)) {
      this.tryToggleVehicle();
    }

    if (keyboard?.checkDown(this.reloadKey, 0)) {
      this.reloadWeapon();
    }

    if (this.pointer.rightButtonDown()) {
      this.setWeapon('fists');
    }

    this.handleWeaponHotkeys();

    if (this.currentMode === 'in-vehicle') {
      this.currentVehicle?.handlePlayerControl(delta);
    }
  }

  private handleWeaponHotkeys(): void {
    this.weaponSelectKeys.forEach(([slot, key]) => {
      if (Phaser.Input.Keyboard.JustDown(key)) {
        this.setWeapon(slot);
      }
    });
  }

  private tryToggleVehicle(): void {
    if (this.currentMode === 'in-vehicle') {
      this.exitVehicle();
      return;
    }
    const vehicle = this.queryNearbyVehicle();
    if (vehicle) {
      this.enterVehicle(vehicle);
    }
  }

  private reloadWeapon(): void {
    const weapon = this.weaponDefinitions[this.activeWeapon];
    if (!weapon || weapon.category === 'melee') {
      return;
    }
    const state = this.ensureWeaponState(this.activeWeapon);
    if (!weapon.clipSize) {
      return;
    }
    const need = weapon.clipSize - state.clip;
    if (need <= 0 || state.ammoReserve <= 0) {
      return;
    }
    const taken = Math.min(need, state.ammoReserve);
    state.clip += taken;
    state.ammoReserve -= taken;
  }

  private tryFire(time: number): void {
    const weapon = this.weaponDefinitions[this.activeWeapon];
    if (!weapon) {
      return;
    }
    const state = this.ensureWeaponState(this.activeWeapon);
    const delay = weapon.fireRate;
    if (time - state.lastFiredAt < delay) {
      return;
    }
    if (weapon.category !== 'melee') {
      if (weapon.clipSize && state.clip <= 0) {
        this.reloadWeapon();
        return;
      }
    }

    const origin = new Phaser.Math.Vector2(this.x, this.y);
    const worldPoint = this.pointer.positionToCamera(this.scene.cameras.main) as Phaser.Math.Vector2;
    const direction = worldPoint.clone().subtract(origin).normalize();

    if (weapon.category === 'grenade') {
      this.onThrowProjectile(weapon, origin, direction);
    } else if (weapon.category === 'melee') {
      this.performMeleeAttack(origin, direction);
    } else {
      this.onFireHitscan(weapon, origin, direction);
      if (weapon.clipSize) {
        state.clip -= 1;
      }
    }

    state.lastFiredAt = time;
    this.scene.sound.play(weapon.soundKey, { volume: 0.4 });
    this.eventBus.emit(GameEvents.PlayerFired, weapon);
  }

  private performMeleeAttack(origin: Phaser.Math.Vector2, direction: Phaser.Math.Vector2): void {
    const meleeRange = 48;
    const meleeRect = new Phaser.Geom.Rectangle(
      origin.x + direction.x * 12 - 8,
      origin.y + direction.y * 12 - 8,
      16,
      16
    );
    this.eventBus.emit('melee-attack', { rect: meleeRect });
  }

  private ensureWeaponState(slot: WeaponSlot): WeaponState {
    let state = this.weaponStates[slot];
    if (!state) {
      const weapon = this.weaponDefinitions[slot];
      state = {
        ammoReserve: weapon?.clipSize ? weapon.clipSize * 4 : 0,
        clip: weapon?.clipSize ?? 0,
        lastFiredAt: 0
      };
      this.weaponStates[slot] = state;
    }
    return state;
  }

  private updateAimVisuals(): void {
    if (this.currentMode === 'in-vehicle') {
      this.reticleVisible(false);
      return;
    }

    const camera = this.scene.cameras.main;
    const worldPoint = this.pointer.positionToCamera(camera) as Phaser.Math.Vector2;

    this.setRotation(Phaser.Math.Angle.Between(this.x, this.y, worldPoint.x, worldPoint.y));

    this.reticle.clear();
    this.reticle.lineStyle(1, 0xffffff, 0.7);
    this.reticle.strokeCircle(worldPoint.x, worldPoint.y, 10);
    this.reticle.lineStyle(1, 0xffcc00, 0.6);
    this.reticle.strokeCircle(worldPoint.x, worldPoint.y, 4);
    this.reticleVisible(true);
  }

  private updateOnFootMovement(delta: number): void {
    const pad = this.scene.input.gamepad?.getPad(0);
    const speed = 200;
    const acceleration = speed * 6;
    const drag = speed * 6;

    const vx = this.getAxis(this.cursors.left, this.cursors.right, this.wasd.A, this.wasd.D, pad?.axes[0]?.getValue());
    const vy = this.getAxis(this.cursors.up, this.cursors.down, this.wasd.W, this.wasd.S, pad?.axes[1]?.getValue());

    const body = this.body as Phaser.Physics.Arcade.Body;
    if (!body) {
      return;
    }

    body.setDrag(drag, drag);
    body.maxSpeed = speed;
    body.setAcceleration(acceleration * vx, acceleration * vy);

    if (Math.abs(vx) < 0.1 && Math.abs(vy) < 0.1) {
      body.setAcceleration(0, 0);
      body.setVelocity(body.velocity.x * 0.9, body.velocity.y * 0.9);
    }
  }

  private getAxis(
    negative?: { isDown?: boolean },
    positive?: { isDown?: boolean },
    negativeAlt?: Phaser.Input.Keyboard.Key,
    positiveAlt?: Phaser.Input.Keyboard.Key,
    gamepadAxis = 0
  ): number {
    const keyNegative = Boolean(negative?.isDown || negativeAlt?.isDown);
    const keyPositive = Boolean(positive?.isDown || positiveAlt?.isDown);
    let value = 0;
    if (keyNegative) {
      value -= 1;
    }
    if (keyPositive) {
      value += 1;
    }
    if (!keyNegative && !keyPositive && Math.abs(gamepadAxis) > 0.1) {
      value = Phaser.Math.Clamp(gamepadAxis, -1, 1);
    }
    return Phaser.Math.Clamp(value, -1, 1);
  }

  private handlePointerDown(pointer: Phaser.Input.Pointer): void {
    if (pointer.leftButtonDown()) {
      this.isFiring = true;
    }
  }

  private handlePointerUp(pointer: Phaser.Input.Pointer): void {
    if (!pointer.leftButtonDown()) {
      this.isFiring = false;
    }
  }

  private setupAdditionalKeys(): void {
    const keyboard = this.scene.input.keyboard!;
    this.wasd = {
      W: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      A: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      S: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      D: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D)
    } as Record<string, Phaser.Input.Keyboard.Key>;
    this.actionKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);
    this.reloadKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R);
    this.pauseKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    this.weaponSelectKeys = [
      ['fists', keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ONE)],
      ['pistol', keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.TWO)],
      ['smg', keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.THREE)],
      ['shotgun', keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.FOUR)],
      ['grenade', keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.FIVE)]
    ];

    this.pauseKey.on('down', () => {
      this.scene.scene.pause();
      this.scene.events.emit('ui:open', { type: 'pause' });
    });
  }

  private handleDeath(): void {
    this.setActive(false);
    this.setVisible(false);
    this.body?.stop();
    this.eventBus.emit(GameEvents.PlayerDied);
  }

  private reticleVisible(visible: boolean): void {
    this.reticle.setVisible(visible);
  }
}
