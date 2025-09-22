import Phaser from 'phaser';
import Player from '@actors/Player';
import Vehicle from '@actors/Vehicle';
import TrafficSystem from '@systems/TrafficSystem';
import WantedSystem from '@systems/WantedSystem';
import MissionSystem from '@systems/MissionSystem';
import SaveSystem from '@systems/SaveSystem';
import { GameEvents } from '@game/events';
import {
  DistrictSpawnRule,
  HeatLevelDefinition,
  MissionDefinition,
  MissionObjective,
  PedDefinition,
  SaveGamePayload,
  SpawnZoneDefinition,
  VehicleDefinition,
  WeaponDefinition
} from '@game/types';
import Ped from '@ai/Ped';
import { SpawnZonePainter, WaypointEditor } from '@game/debug/DebugTools';

interface ChunkDefinition {
  key: string;
  chunkX: number;
  chunkY: number;
  districtId: string;
  districtName: string;
}

type WeatherState = 'clear' | 'rain' | 'fog';

const CHUNK_SIZE = 1024; // pixels
const CHUNKS: ChunkDefinition[] = [
  { key: 'district_downtown', chunkX: 0, chunkY: 0, districtId: 'downtown', districtName: 'Downtown' },
  { key: 'district_industrial', chunkX: 1, chunkY: 0, districtId: 'industrial', districtName: 'Industrial Port' },
  { key: 'district_residential', chunkX: 0, chunkY: 1, districtId: 'residential', districtName: 'Residences' },
  { key: 'district_waterfront', chunkX: 1, chunkY: 1, districtId: 'waterfront', districtName: 'Waterfront' }
];

interface ActiveChunk {
  map: Phaser.Tilemaps.Tilemap;
  layers: Phaser.Tilemaps.TilemapLayer[];
  definition: ChunkDefinition;
}

interface WorldState {
  discoveredDistricts: Set<string>;
  weather: WeatherState;
  timeOfDayMinutes: number;
}

export default class CityScene extends Phaser.Scene {
  private player!: Player;
  private vehicles!: Phaser.Physics.Arcade.Group;
  private peds!: Phaser.Physics.Arcade.Group;
  private bullets!: Phaser.Physics.Arcade.Group;
  private grenades!: Phaser.Physics.Arcade.Group;
  private trafficSystem!: TrafficSystem;
  private wantedSystem!: WantedSystem;
  private missionSystem!: MissionSystem;
  private saveSystem!: SaveSystem;
  private activeChunks = new Map<string, ActiveChunk>();
  private readonly eventBus = new Phaser.Events.EventEmitter();
  private worldState: WorldState = {
    discoveredDistricts: new Set<string>(),
    weather: 'clear',
    timeOfDayMinutes: 12 * 60
  };
  private weaponDefs!: Record<string, WeaponDefinition>;
  private vehicleDefs!: Record<string, VehicleDefinition>;
  private pedDefs!: Record<string, PedDefinition>;
  private spawnRules!: Record<string, DistrictSpawnRule[]>;
  private spawnZones: SpawnZoneDefinition[] = [];
  private pedSpawnZones: SpawnZoneDefinition[] = [];
  private vehicleSpawnZones: SpawnZoneDefinition[] = [];
  private missions: MissionDefinition[] = [];
  private interactKey!: Phaser.Input.Keyboard.Key;
  private saveSlotsKey!: Phaser.Input.Keyboard.Key;
  private weatherTimer = 0;
  private missionMarkers = new Map<string, Phaser.GameObjects.Zone>();
  private ambientLayer!: Phaser.GameObjects.Rectangle;
  private lastPoliceCheck = 0;
  private waypointEditor?: WaypointEditor;
  private spawnPainter?: SpawnZonePainter;
  private weatherEmitter: Phaser.GameObjects.GameObject | undefined;
  private fogOverlay: Phaser.GameObjects.Rectangle | undefined;

  constructor() {
    super('city');
  }

  preload(): void {}

  create(): void {
    this.setupData();
    this.createWorld();
    this.createPlayer();
    this.createSystems();
    this.createColliders();
    this.setupEvents();
    this.setupInput();
    this.setupDebugTools();
    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);
    this.cameras.main.setLerp(0.12, 0.12);
    this.cameras.main.setZoom(3);
    this.sound.play('music_ambient', { loop: true, volume: 0.25 });
  }

  update(time: number, delta: number): void {
    this.streamChunks();
    this.player.update(time, delta);
    this.trafficSystem.update(time, delta, this.getCurrentDistrictId(), this.worldState.weather, this.isNight() ? 'night' : 'day');
    this.wantedSystem.update();
    this.missionSystem.update(delta);
    this.updateMissionProgress();
    this.updateWorldClock(delta);
    this.updateCameraZoom(delta);
    this.updateWeather(delta);
    this.ensurePoliceResponse(time);
  }

  private setupData(): void {
    const weaponList = this.cache.json.get('weapons') as WeaponDefinition[] | undefined;
    const vehicleList = this.cache.json.get('vehicles') as VehicleDefinition[] | undefined;
    const pedList = this.cache.json.get('peds') as PedDefinition[] | undefined;
    const spawnData = this.cache.json.get('spawn_zones') as
      | { districtRules: DistrictSpawnRule[]; zones: SpawnZoneDefinition[] }
      | undefined;
    const missionList = this.cache.json.get('missions') as MissionDefinition[] | undefined;

    this.weaponDefs = this.makeDictionary<WeaponDefinition>(weaponList ?? []);
    this.vehicleDefs = this.makeDictionary<VehicleDefinition>(vehicleList ?? []);
    this.pedDefs = this.makeDictionary<PedDefinition>(pedList ?? []);
    this.spawnRules = this.prepareSpawnRules(spawnData);
    this.spawnZones = spawnData?.zones ?? [];
    this.pedSpawnZones = this.spawnZones.filter((zone) => zone.type === 'ped');
    this.vehicleSpawnZones = this.spawnZones.filter((zone) => zone.type === 'vehicle');
    this.missions = missionList ?? [];
  }

  private createWorld(): void {
    this.ambientLayer = this.add.rectangle(0, 0, 4000, 4000, 0x000022, 0).setOrigin(0);
    this.ambientLayer.setDepth(50);
    this.ambientLayer.setScrollFactor(0);
    this.loadInitialChunks();
    this.createZones();
    this.applyWeatherEffects();
  }

  private createPlayer(): void {
    this.player = new Player({
      scene: this,
      x: CHUNK_SIZE / 2,
      y: CHUNK_SIZE / 2,
      weaponDefinitions: this.weaponDefs,
      initialWeapons: ['pistol', 'smg'],
      eventBus: this.eventBus,
      queryNearbyVehicle: () => this.findClosestVehicle(),
      onFireHitscan: (weapon, origin, direction) => this.performHitscan(weapon, origin, direction),
      onThrowProjectile: (weapon, origin, direction) => this.throwProjectile(weapon, origin, direction)
    });
  }

  private createSystems(): void {
    this.vehicles = this.physics.add.group({ classType: Vehicle, runChildUpdate: true, maxSize: 64 });
    this.peds = this.physics.add.group({ classType: Ped, runChildUpdate: true, maxSize: 150 });
    this.bullets = this.physics.add.group();
    this.grenades = this.physics.add.group();

    this.trafficSystem = new TrafficSystem({
      scene: this,
      vehicleGroup: this.vehicles,
      pedGroup: this.peds,
      districts: this.spawnRules,
      vehicleDefs: this.vehicleDefs,
      pedDefs: this.pedDefs,
      pedSpawnZones: this.pedSpawnZones,
      vehicleSpawnZones: this.vehicleSpawnZones
    });

    const heatLevels: HeatLevelDefinition[] = [
      { level: 0, label: 'Calm', decayDelay: 6000, escalationCooldown: 8000, spawnTable: [] },
      {
        level: 1,
        label: 'Patrol',
        decayDelay: 7000,
        escalationCooldown: 8000,
        spawnTable: [{ type: 'vehicle' as const, id: 'police_car', weight: 1, tactic: 'patrol' as const }]
      },
      {
        level: 2,
        label: 'Roadblocks',
        decayDelay: 8000,
        escalationCooldown: 9000,
        spawnTable: [
          { type: 'vehicle' as const, id: 'police_suv', weight: 2, tactic: 'roadblock' as const },
          { type: 'ped' as const, id: 'cop', weight: 1, tactic: 'patrol' as const }
        ]
      },
      {
        level: 3,
        label: 'Strike',
        decayDelay: 9000,
        escalationCooldown: 9000,
        spawnTable: [
          { type: 'vehicle' as const, id: 'police_suv', weight: 1, tactic: 'spike' as const },
          { type: 'ped' as const, id: 'swat', weight: 1, tactic: 'swat' as const }
        ]
      },
      {
        level: 4,
        label: 'SWAT',
        decayDelay: 10000,
        escalationCooldown: 12000,
        spawnTable: [
          { type: 'vehicle' as const, id: 'police_armored', weight: 1, tactic: 'heavy' as const },
          { type: 'ped' as const, id: 'swat', weight: 2, tactic: 'swat' as const }
        ]
      },
      {
        level: 5,
        label: 'Heavy',
        decayDelay: 15000,
        escalationCooldown: 15000,
        spawnTable: [
          { type: 'vehicle' as const, id: 'police_armored', weight: 1, tactic: 'heavy' as const },
          { type: 'vehicle' as const, id: 'police_car', weight: 2, tactic: 'patrol' as const }
        ]
      }
    ];

    this.wantedSystem = new WantedSystem({ scene: this, heatLevels });
    this.missionSystem = new MissionSystem({ scene: this, missions: this.missions });
    this.saveSystem = new SaveSystem({ storageKey: 'codex-gangsters-saves', version: 1 });

    this.wantedSystem.on('heat-change', (level: number) => {
      this.events.emit('ui:heat', level);
      this.player.setHeat(level);
    });

    this.missionSystem.on('mission-started', (mission: MissionDefinition) => {
      this.events.emit('ui:mission', { type: 'started', mission });
    });
    this.missionSystem.on('mission-completed', (mission: MissionDefinition) => {
      this.events.emit('ui:mission', { type: 'completed', mission });
      this.player.addCash(mission.reward);
    });
    this.missionSystem.on('mission-failed', (payload: { definition: MissionDefinition; reason: string }) => {
      this.events.emit('ui:mission', { type: 'failed', mission: payload.definition, payload });
    });
    this.missionSystem.on('mission-objective', (objective: MissionObjective) => {
      this.events.emit('ui:objective', objective);
    });
    this.missionSystem.on('mission-timer', (timeRemaining: number) => {
      this.events.emit('ui:mission-timer', timeRemaining);
    });
  }

  private createColliders(): void {
    this.physics.add.collider(this.player, this.peds);
    this.physics.add.collider(this.peds, this.peds);
    this.physics.add.collider(this.vehicles, this.vehicles, (objA, objB) => {
      this.handleVehicleCollision(objA as Vehicle, objB as Vehicle);
    });
    this.physics.add.collider(this.player, this.vehicles, (playerObj, vehicleObj) => {
      this.handlePlayerVehicleCollision(playerObj as Player, vehicleObj as Vehicle);
    });
    this.physics.add.overlap(this.bullets, this.peds, this.handleBulletPedOverlap as never, undefined, this);
    this.physics.add.overlap(this.bullets, this.vehicles, this.handleBulletVehicleOverlap as never, undefined, this);
    this.physics.add.collider(this.grenades, this.vehicles, (grenadeObj) => {
      this.handleGrenadeImpact(grenadeObj as Phaser.GameObjects.GameObject);
    });
    this.physics.add.overlap(this.grenades, this.peds, (grenadeObj, pedObj) => {
      this.handleGrenadeExplosion(grenadeObj as Phaser.GameObjects.GameObject, pedObj as Ped);
    });
  }

  private setupEvents(): void {
    this.eventBus.on(GameEvents.PlayerFired, () => {
      this.wantedSystem.raise(1);
    });
    this.eventBus.on(GameEvents.PlayerDamaged, () => {
      this.wantedSystem.raise(0);
    });
    this.eventBus.on(GameEvents.HeatChanged, (level: number) => {
      this.registry.set('heat', level);
    });
  }

  private setupInput(): void {
    const keyboard = this.input.keyboard;
    if (!keyboard) {
      return;
    }
    this.interactKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.F);
    this.saveSlotsKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.TAB);
    this.interactKey.on('down', () => this.tryInteract());
    this.saveSlotsKey.on('down', () => this.openSaveMenu());
  }

  private setupDebugTools(): void {
    if (import.meta.env.PROD) {
      return;
    }
    const keyboard = this.input.keyboard;
    if (!keyboard) {
      return;
    }
    this.waypointEditor = new WaypointEditor(this);
    this.spawnPainter = new SpawnZonePainter(this);

    keyboard.on('keydown-W', (event: KeyboardEvent) => {
      if (event.altKey) {
        this.waypointEditor?.toggle();
      }
    });

    keyboard.on('keydown-Z', (event: KeyboardEvent) => {
      if (event.altKey) {
        this.spawnPainter?.toggle();
      }
    });

    keyboard.on('keydown-ENTER', () => {
      if (this.spawnPainter?.isActive()) {
        this.spawnPainter.export();
      }
      if (this.waypointEditor?.isVisible()) {
        this.waypointEditor.export();
      }
    });

    keyboard.on('keydown-BACKSPACE', (event: KeyboardEvent) => {
      if (!this.spawnPainter?.isActive()) {
        return;
      }
      if (event.ctrlKey) {
        this.spawnPainter.clear();
      } else {
        this.spawnPainter.undo();
      }
    });

    this.input.on('wheel', (_pointer: Phaser.Input.Pointer, _objects: unknown, deltaX: number, deltaY: number) => {
      if (!this.spawnPainter?.isActive()) {
        return;
      }
      if (deltaY > 0) {
        this.spawnPainter.nextType(1);
      } else if (deltaY < 0) {
        this.spawnPainter.nextType(-1);
      }
    });
  }

  private openSaveMenu(): void {
    const saves = this.saveSystem.listSaves();
    this.events.emit('ui:open', { type: 'save', saves });
  }

  private loadInitialChunks(): void {
    CHUNKS.forEach((chunk) => {
      const key = this.chunkKey(chunk.chunkX, chunk.chunkY);
      if (!this.activeChunks.has(key)) {
        this.loadChunk(chunk);
      }
    });
  }

  private streamChunks(): void {
    const chunkX = Math.floor(this.player.x / CHUNK_SIZE);
    const chunkY = Math.floor(this.player.y / CHUNK_SIZE);
    const needed = new Set<string>();
    for (let dx = -1; dx <= 1; dx += 1) {
      for (let dy = -1; dy <= 1; dy += 1) {
        const key = this.chunkKey(chunkX + dx, chunkY + dy);
        needed.add(key);
        if (!this.activeChunks.has(key)) {
          const chunkDef = CHUNKS.find((chunk) => chunk.chunkX === chunkX + dx && chunk.chunkY === chunkY + dy);
          if (chunkDef) {
            this.loadChunk(chunkDef);
          }
        }
      }
    }

    [...this.activeChunks.keys()].forEach((key) => {
      if (!needed.has(key)) {
        this.unloadChunk(key);
      }
    });
  }

  private loadChunk(definition: ChunkDefinition): void {
    const map = this.make.tilemap({ key: definition.key });
    const tileset = map.addTilesetImage('city_tiles', 'city_tiles', 32, 32, 0, 0);
    if (!tileset) {
      console.warn('Missing tileset for chunk', definition.key);
      return;
    }
    const layer = map.createLayer(0, tileset, definition.chunkX * CHUNK_SIZE, definition.chunkY * CHUNK_SIZE);
    if (!layer) {
      return;
    }
    layer.setDepth(0);
    this.activeChunks.set(this.chunkKey(definition.chunkX, definition.chunkY), {
      map,
      layers: [layer],
      definition
    });
  }

  private unloadChunk(key: string): void {
    const chunk = this.activeChunks.get(key);
    if (!chunk) {
      return;
    }
    chunk.layers.forEach((layer) => layer.destroy());
    chunk.map.destroy();
    this.activeChunks.delete(key);
  }

  private chunkKey(x: number, y: number): string {
    return `${x}:${y}`;
  }

  private getCurrentDistrictId(): string {
    const chunkX = Math.floor(this.player.x / CHUNK_SIZE);
    const chunkY = Math.floor(this.player.y / CHUNK_SIZE);
    const chunk = CHUNKS.find((item) => item.chunkX === chunkX && item.chunkY === chunkY);
    if (chunk) {
      this.worldState.discoveredDistricts.add(chunk.districtId);
      return chunk.districtId;
    }
    return 'unknown';
  }

  private performHitscan(weapon: WeaponDefinition, origin: Phaser.Math.Vector2, direction: Phaser.Math.Vector2): void {
    const maxDistance = weapon.projectileSpeed * (weapon.projectileLife / 1000);
    const endpoint = origin.clone().add(direction.clone().scale(maxDistance));
    const line = new Phaser.Geom.Line(origin.x, origin.y, endpoint.x, endpoint.y);
    let closestDistance = Number.POSITIVE_INFINITY;
    let hitPed: Ped | undefined;
    let hitVehicle: Vehicle | undefined;

    this.peds.getChildren().forEach((child) => {
      const ped = child as Ped;
      if (!ped.active) {
        return;
      }
      const body = ped.body as Phaser.Physics.Arcade.Body;
      const rect = new Phaser.Geom.Rectangle(body.x, body.y, body.width, body.height);
      if (Phaser.Geom.Intersects.LineToRectangle(line, rect)) {
        const dist = Phaser.Math.Distance.Between(origin.x, origin.y, ped.x, ped.y);
        if (dist < closestDistance) {
          closestDistance = dist;
          hitPed = ped;
          hitVehicle = undefined;
        }
      }
    });

    this.vehicles.getChildren().forEach((child) => {
      const vehicle = child as Vehicle;
      if (!vehicle.active) {
        return;
      }
      const body = vehicle.body as Phaser.Physics.Arcade.Body;
      const rect = new Phaser.Geom.Rectangle(body.x, body.y, body.width, body.height);
      if (Phaser.Geom.Intersects.LineToRectangle(line, rect)) {
        const dist = Phaser.Math.Distance.Between(origin.x, origin.y, vehicle.x, vehicle.y);
        if (dist < closestDistance) {
          closestDistance = dist;
          hitVehicle = vehicle;
          hitPed = undefined;
        }
      }
    });

    const tracer = this.add.line(
      0,
      0,
      origin.x,
      origin.y,
      hitPed?.x ?? hitVehicle?.x ?? endpoint.x,
      hitPed?.y ?? hitVehicle?.y ?? endpoint.y,
      0xffee88,
      0.6
    );
    tracer.setOrigin(0, 0);
    tracer.setDepth(20);
    this.time.delayedCall(60, () => tracer.destroy());

    if (hitPed) {
      const impact = this.add.image(hitPed.x, hitPed.y, 'fx_impact');
      impact.setDepth(25);
      this.time.delayedCall(180, () => impact.destroy());
      this.trafficSystem.recyclePed(hitPed);
      this.eventBus.emit(GameEvents.PedRemoved, hitPed);
      this.wantedSystem.raise(2);
    } else if (hitVehicle) {
      hitVehicle.damage(weapon.damage * 0.4);
      this.wantedSystem.raise(1);
    }
  }

  private throwProjectile(weapon: WeaponDefinition, origin: Phaser.Math.Vector2, direction: Phaser.Math.Vector2): void {
    const grenade = this.grenades.get(origin.x, origin.y, 'weapon_grenade') as Phaser.Physics.Arcade.Image;
    if (!grenade) {
      return;
    }
    grenade.setActive(true);
    grenade.setVisible(true);
    grenade.setDepth(6);
    const body = grenade.body as Phaser.Physics.Arcade.Body | undefined;
    if (body) {
      body.allowGravity = false;
      body.setCircle(6);
      body.setVelocity(direction.x * weapon.projectileSpeed, direction.y * weapon.projectileSpeed);
    }
    this.time.delayedCall(weapon.projectileLife, () => {
      grenade.destroy();
      this.createExplosion(grenade.x, grenade.y, weapon.damage);
    });
  }

  private createExplosion(x: number, y: number, damage: number): void {
    const explosion = this.add.circle(x, y, 80, 0xffaa00, 0.3).setDepth(9);
    this.time.delayedCall(150, () => explosion.destroy());
    this.peds.getChildren().forEach((child) => {
      const ped = child as Ped;
      if (!ped.active) {
        return;
      }
      const distance = Phaser.Math.Distance.Between(x, y, ped.x, ped.y);
      if (distance < 96) {
        ped.alert(new Phaser.Math.Vector2(x, y));
        (ped.body as Phaser.Physics.Arcade.Body).setVelocity((ped.x - x) * 3, (ped.y - y) * 3);
      }
    });
    this.vehicles.getChildren().forEach((child) => {
      const vehicle = child as Vehicle;
      if (!vehicle.active) {
        return;
      }
      const distance = Phaser.Math.Distance.Between(x, y, vehicle.x, vehicle.y);
      if (distance < 128) {
        vehicle.damage(damage);
      }
    });
    this.wantedSystem.raise(3);
  }

  private handleVehicleCollision(vehicleA: Vehicle, vehicleB: Vehicle): void {
    const bodyA = vehicleA.body as Phaser.Physics.Arcade.Body;
    const bodyB = vehicleB.body as Phaser.Physics.Arcade.Body;
    const relative = bodyA.velocity.length() + bodyB.velocity.length();
    if (relative > 200) {
      this.cameras.main.shake(80, 0.003);
      this.sound.play('sfx_hit', { volume: 0.3 });
      this.wantedSystem.raise(1);
    }
  }

  private handlePlayerVehicleCollision(_player: Player, vehicle: Vehicle): void {
    if (this.player.getMode() === 'on-foot') {
      const impact = (vehicle.body as Phaser.Physics.Arcade.Body).velocity.length();
      if (impact > 120) {
        this.player.takeDamage(impact * 0.1);
        this.cameras.main.shake(80, 0.002);
      }
    }
  }

  private handleBulletPedOverlap(bullet: Phaser.GameObjects.GameObject, pedObj: Phaser.GameObjects.GameObject): void {
    bullet.destroy();
    const ped = pedObj as Ped;
    ped.alert(new Phaser.Math.Vector2(this.player.x, this.player.y));
    (ped.body as Phaser.Physics.Arcade.Body).setVelocity(Phaser.Math.Between(-100, 100), Phaser.Math.Between(-100, 100));
    this.wantedSystem.raise(2);
  }

  private handleBulletVehicleOverlap(bullet: Phaser.GameObjects.GameObject, vehicleObj: Phaser.GameObjects.GameObject): void {
    bullet.destroy();
    const vehicle = vehicleObj as Vehicle;
    vehicle.damage(10);
    this.wantedSystem.raise(1);
  }

  private handleGrenadeImpact(grenade: Phaser.GameObjects.GameObject): void {
    const sprite = grenade as Phaser.Physics.Arcade.Image;
    const impactX = sprite.x ?? this.player.x;
    const impactY = sprite.y ?? this.player.y;
    grenade.destroy();
    this.createExplosion(impactX, impactY, 60);
  }

  private handleGrenadeExplosion(grenade: Phaser.GameObjects.GameObject, ped: Ped): void {
    const sprite = grenade as Phaser.Physics.Arcade.Image;
    const impact = new Phaser.Math.Vector2(sprite.x ?? ped.x, sprite.y ?? ped.y);
    grenade.destroy();
    ped.alert(impact);
  }

  private tryInteract(): void {
    const zone = this.findInteractableZone();
    if (!zone) {
      return;
    }
    const type = zone.getData('type');
    switch (type) {
      case 'mission':
        this.openMissionBoard();
        break;
      case 'payphone':
        this.openPayphone();
        break;
      case 'shop':
        this.openShop(zone);
        break;
      case 'safehouse':
        this.saveGame();
        break;
      case 'respray':
        this.resprayVehicle();
        break;
      default:
        break;
    }
  }

  private openMissionBoard(): void {
    const missions = this.missionSystem.getAvailableMissions();
    this.events.emit('ui:open', { type: 'missions', missions });
  }

  private openPayphone(): void {
    this.events.emit('ui:open', { type: 'missions', missions: this.missionSystem.getAvailableMissions(), via: 'payphone' });
  }

  private openShop(zone: Phaser.GameObjects.Zone): void {
    this.events.emit('ui:open', { type: 'shop', metadata: zone.getData('metadata') });
  }

  private saveGame(): void {
    this.saveToSlot(0);
    this.events.emit('ui:open', { type: 'toast', message: 'Game saved' });
  }

  private resprayVehicle(): void {
    if (this.player.getMode() === 'in-vehicle' && this.wantedSystem.currentLevel < 3) {
      this.wantedSystem.clearHeat();
      this.events.emit('ui:open', { type: 'toast', message: 'Vehicle resprayed: heat cleared' });
    }
  }

  private findInteractableZone(): Phaser.GameObjects.Zone | undefined {
    let closest: Phaser.GameObjects.Zone | undefined;
    let minDist = Number.POSITIVE_INFINITY;
    this.missionMarkers.forEach((zone) => {
      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, zone.x, zone.y);
      if (dist < 72 && dist < minDist) {
        closest = zone;
        minDist = dist;
      }
    });
    return closest;
  }

  private findClosestVehicle(): Vehicle | undefined {
    let closest: Vehicle | undefined;
    let distance = Number.POSITIVE_INFINITY;
    this.vehicles.getChildren().forEach((child) => {
      const vehicle = child as Vehicle;
      if (!vehicle.active) {
        return;
      }
      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, vehicle.x, vehicle.y);
      if (dist < 48 && dist < distance) {
        closest = vehicle;
        distance = dist;
      }
    });
    return closest;
  }

  private updateWorldClock(delta: number): void {
    const dayLengthMinutes = 24;
    const minutesPerMs = 24 / (24 * 60 * 1000);
    this.worldState.timeOfDayMinutes += delta * minutesPerMs * 60;
    if (this.worldState.timeOfDayMinutes >= 1440) {
      this.worldState.timeOfDayMinutes -= 1440;
    }
    const intensity = this.calculateNightIntensity();
    this.ambientLayer.setFillStyle(0x000022, intensity);
  }

  private calculateNightIntensity(): number {
    const minutes = this.worldState.timeOfDayMinutes;
    if (minutes > 360 && minutes < 1080) {
      return 0.1;
    }
    if (minutes <= 360) {
      const ratio = Phaser.Math.Clamp((360 - minutes) / 360, 0, 1);
      return 0.1 + ratio * 0.65;
    }
    const ratio = Phaser.Math.Clamp((minutes - 1080) / 360, 0, 1);
    return 0.1 + ratio * 0.65;
  }

  private isNight(): boolean {
    return this.calculateNightIntensity() > 0.4;
  }

  private updateCameraZoom(delta: number): void {
    const baseZoom = 3;
    const vehicleZoom = this.player.getMode() === 'in-vehicle' ? 2.6 : 3.1;
    const speed = this.player.body ? (this.player.body as Phaser.Physics.Arcade.Body).velocity.length() : 0;
    const dynamicZoom = Phaser.Math.Linear(vehicleZoom, 2.3, Phaser.Math.Clamp(speed / 400, 0, 1));
    const targetZoom = Phaser.Math.Linear(baseZoom, dynamicZoom, 0.5);
    const cam = this.cameras.main;
    cam.setZoom(Phaser.Math.Linear(cam.zoom, targetZoom, delta / 600));
  }

  private updateWeather(delta: number): void {
    this.weatherTimer -= delta;
    if (this.weatherTimer <= 0) {
      const options: WeatherState[] = ['clear', 'rain', 'fog'];
      const previous = this.worldState.weather;
      this.worldState.weather = Phaser.Utils.Array.GetRandom(options);
      this.weatherTimer = Phaser.Math.Between(60000, 120000);
      this.eventBus.emit(GameEvents.WeatherChanged, this.worldState.weather);
      if (previous !== this.worldState.weather) {
        this.applyWeatherEffects();
      }
    }
  }

  private applyWeatherEffects(): void {
    this.weatherEmitter?.destroy();
    this.weatherEmitter = undefined;
    this.fogOverlay?.destroy();
    this.fogOverlay = undefined;

    if (this.worldState.weather === 'rain') {
      const emitter = this.add.particles(0, 0, 'fx_smoke', {
        x: { min: -400, max: 400 },
        y: -200,
        lifespan: 600,
        gravityY: 900,
        quantity: 10,
        scale: { start: 0.4, end: 0.1 },
        alpha: { start: 0.6, end: 0 },
        tint: 0x66aaff,
        blendMode: Phaser.BlendModes.ADD
      });
      emitter.setDepth(60);
      emitter.setScrollFactor(0.5, 0.3);
      this.weatherEmitter = emitter;
    } else if (this.worldState.weather === 'fog') {
      this.fogOverlay = this.add.rectangle(0, 0, 4096, 4096, 0xcfd6ff, 0.12).setOrigin(0);
      this.fogOverlay.setDepth(40);
      this.fogOverlay.setScrollFactor(0.2, 0.2);
    }
  }

  private ensurePoliceResponse(time: number): void {
    const level = this.wantedSystem.currentLevel;
    if (level <= 0) {
      return;
    }
    if (time - this.lastPoliceCheck < 1500) {
      return;
    }
    this.lastPoliceCheck = time;
    const activePoliceVehicles = this.vehicles.getChildren().filter(
      (child) => child instanceof Vehicle && child.definition.id.startsWith('police') && child.active
    ).length;
    const targetVehicles = Math.min(3, level);
    if (activePoliceVehicles < targetVehicles) {
      const offset = new Phaser.Math.Vector2(Phaser.Math.Between(-280, 280), Phaser.Math.Between(-280, 280));
      const spawn = new Phaser.Math.Vector2(this.player.x, this.player.y).add(offset);
      const vehicleId = level >= 4 ? 'police_armored' : level >= 2 ? 'police_suv' : 'police_car';
      this.trafficSystem.createVehicle(spawn.x, spawn.y, vehicleId);
    }

    const activePolicePeds = this.peds.getChildren().filter(
      (child) => child instanceof Ped && ['cop', 'swat'].includes((child as Ped).definition.id) && child.active
    ).length;
    const targetPeds = Math.min(5, level * 2);
    if (activePolicePeds < targetPeds) {
      const offset = new Phaser.Math.Vector2(Phaser.Math.Between(-200, 200), Phaser.Math.Between(-200, 200));
      const spawn = new Phaser.Math.Vector2(this.player.x, this.player.y).add(offset);
      const pedId = level >= 3 ? 'swat' : 'cop';
      this.trafficSystem.createPed(spawn.x, spawn.y, pedId);
    }
  }

  private updateMissionProgress(): void {
    const active = this.missionSystem.getActiveMission();
    if (!active) {
      return;
    }

    if (active.state === 'success' || active.state === 'failed') {
      this.missionSystem.resolveMission();
      return;
    }

    const objective = this.missionSystem.getCurrentObjective();
    if (!objective) {
      return;
    }

    const target = objective.target;
    let withinTarget = false;
    if (target) {
      const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, target.x, target.y);
      withinTarget = distance < 96;
    }

    switch (objective.type) {
      case 'reach':
      case 'pickup':
      case 'dropoff':
      case 'chase':
      case 'timed':
        if (withinTarget) {
          this.missionSystem.completeCurrentObjective();
        }
        break;
      case 'escape':
        if (this.wantedSystem.currentLevel <= 0) {
          this.missionSystem.completeCurrentObjective();
        }
        break;
      default:
        break;
    }
  }

  private handleResumeFromSave(payload: SaveGamePayload): void {
    this.player.restore({
      x: payload.player.x,
      y: payload.player.y,
      cash: payload.player.cash,
      health: payload.player.health,
      armor: payload.player.armor,
      weapon: payload.player.activeWeapon as never
    });
    this.worldState.weather = payload.world.weather;
    this.worldState.timeOfDayMinutes = payload.world.timeOfDayMinutes;
    payload.world.discoveredDistricts.forEach((id) => this.worldState.discoveredDistricts.add(id));
    if (payload.world.activeMissionId) {
      this.missionSystem.startMission(payload.world.activeMissionId);
    }
  }

  private updateWantedHud(): void {
    this.registry.set('heat', this.wantedSystem.currentLevel);
  }

  private makeDictionary<T extends { id: string }>(list: T[]): Record<string, T> {
    return list.reduce<Record<string, T>>((acc, item) => {
      acc[item.id] = item;
      return acc;
    }, {});
  }

  private prepareSpawnRules(data: { districtRules: DistrictSpawnRule[] } | undefined): Record<string, DistrictSpawnRule[]> {
    if (!data || !Array.isArray(data.districtRules)) {
      return {};
    }
    return data.districtRules.reduce<Record<string, DistrictSpawnRule[]>>((acc, rule) => {
      if (!acc[rule.district]) {
        acc[rule.district] = [];
      }
      acc[rule.district]!.push(rule);
      return acc;
    }, {});
  }

  private createZones(): void {
    const interactiveTypes = new Set(['mission', 'payphone', 'shop', 'safehouse', 'respray']);
    this.spawnZones
      .filter((zone) => interactiveTypes.has(zone.type))
      .forEach((zone) => {
        const area = this.add.zone(zone.x, zone.y, zone.width, zone.height);
        area.setOrigin(0.5, 0.5);
        area.setData('type', zone.type);
        area.setData('metadata', zone.metadata ?? {});
        this.physics.add.existing(area, true);
        area.setInteractive({ useHandCursor: false });
        this.missionMarkers.set(zone.id, area);

        const marker = this.add.rectangle(zone.x, zone.y, zone.width, zone.height, 0x44ffaa, 0.12);
        marker.setDepth(2);
        marker.setStrokeStyle(1, 0x44ffaa, 0.4);
      });
  }

  public getPlayerStats(): {
    health: number;
    armor: number;
    cash: number;
    heat: number;
    weapon: {
      slot: string;
      clip: number;
      reserve: number;
      name: string;
    };
  } {
    const weaponSlot = this.player.getActiveWeapon();
    const weaponState = this.player.getWeaponStatus(weaponSlot);
    const weaponDef = this.player.getWeaponDefinition(weaponSlot);
    return {
      health: this.player.getHealth(),
      armor: this.player.getArmor(),
      cash: this.player.getCash(),
      heat: this.wantedSystem.currentLevel,
      weapon: {
        slot: weaponSlot,
        clip: weaponState.clip,
        reserve: weaponState.reserve,
        name: weaponDef?.name ?? weaponSlot
      }
    };
  }

  public getWorldInfo(): { timeOfDayMinutes: number; weather: WeatherState } {
    return {
      timeOfDayMinutes: this.worldState.timeOfDayMinutes,
      weather: this.worldState.weather
    };
  }

  public getPlayerPosition(): { x: number; y: number } {
    return { x: this.player.x, y: this.player.y };
  }

  public getEventBus(): Phaser.Events.EventEmitter {
    return this.eventBus;
  }

  public requestStartMission(id: string): void {
    this.missionSystem.startMission(id);
  }

  public requestLoad(slot: number): boolean {
    const payload = this.saveSystem.loadSlot(slot);
    if (payload) {
      this.handleResumeFromSave(payload);
      return true;
    }
    return false;
  }

  public resumeGameplay(): void {
    if (this.scene.isPaused('city')) {
      this.scene.resume('city');
    }
  }

  public saveToSlot(slot: number): void {
    const payload = this.buildSavePayload();
    this.saveSystem.saveSlot(slot, payload);
  }

  private buildSavePayload(): SaveGamePayload {
    const activeMissionId = this.missionSystem.getActiveMission()?.definition.id;
    return {
      version: 1,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      player: {
        x: this.player.x,
        y: this.player.y,
        district: this.getCurrentDistrictId(),
        cash: this.player.getCash(),
        health: this.player.getHealth(),
        armor: this.player.getArmor(),
        inventory: this.player.getInventory(),
        activeWeapon: this.player.getActiveWeapon(),
        heat: this.player.getHeat()
      },
      world: {
        timeOfDayMinutes: this.worldState.timeOfDayMinutes,
        weather: this.worldState.weather,
        discoveredDistricts: [...this.worldState.discoveredDistricts],
        ...(activeMissionId ? { activeMissionId } : {})
      }
    };
  }
}
