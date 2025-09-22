import Phaser from 'phaser';
import Vehicle from '@actors/Vehicle';
import Ped from '@ai/Ped';
import { DistrictSpawnRule, PedDefinition, SpawnZoneDefinition, VehicleDefinition } from '@game/types';

interface TrafficSystemConfig {
  scene: Phaser.Scene;
  vehicleGroup: Phaser.Physics.Arcade.Group;
  pedGroup: Phaser.Physics.Arcade.Group;
  districts: Record<string, DistrictSpawnRule[]>;
  vehicleDefs: Record<string, VehicleDefinition>;
  pedDefs: Record<string, PedDefinition>;
  pedSpawnZones: SpawnZoneDefinition[];
  vehicleSpawnZones: SpawnZoneDefinition[];
}

export default class TrafficSystem {
  private readonly scene: Phaser.Scene;
  private readonly vehicleGroup: Phaser.Physics.Arcade.Group;
  private readonly pedGroup: Phaser.Physics.Arcade.Group;
  private readonly districts: Record<string, DistrictSpawnRule[]>;
  private readonly vehicleDefs: Record<string, VehicleDefinition>;
  private readonly pedDefs: Record<string, PedDefinition>;
  private readonly pedZonesByDistrict: Record<string, SpawnZoneDefinition[]>;
  private readonly vehicleZonesByDistrict: Record<string, SpawnZoneDefinition[]>;
  private readonly pedPool: Ped[] = [];
  private readonly vehiclePool: Vehicle[] = [];
  private lastPedSpawn = 0;
  private lastVehicleSpawn = 0;

  constructor(config: TrafficSystemConfig) {
    this.scene = config.scene;
    this.vehicleGroup = config.vehicleGroup;
    this.pedGroup = config.pedGroup;
    this.districts = config.districts;
    this.vehicleDefs = config.vehicleDefs;
    this.pedDefs = config.pedDefs;
    this.pedZonesByDistrict = this.groupByDistrict(config.pedSpawnZones);
    this.vehicleZonesByDistrict = this.groupByDistrict(config.vehicleSpawnZones);
  }

  update(time: number, delta: number, district: string, weather: string, timeOfDay: 'day' | 'night'): void {
    const rules = this.districts[district] ?? [];
    const matched = rules.filter((rule) => {
      const weatherOk = rule.weather === 'any' || rule.weather === weather;
      const timeOk = rule.timeOfDay === 'any' || rule.timeOfDay === timeOfDay;
      return weatherOk && timeOk;
    });

    const vehicleTarget = matched.reduce((acc, rule) => acc + rule.vehicleDensity, 0);
    const pedTarget = matched.reduce((acc, rule) => acc + rule.pedDensity, 0);

    this.spawnVehicles(time, vehicleTarget, matched);
    this.spawnPeds(time, pedTarget, matched);

    this.vehicleGroup.getChildren().forEach((child) => {
      const vehicle = child as Vehicle;
      if (vehicle.active) {
        vehicle.tick(delta);
      }
    });

    this.pedGroup.getChildren().forEach((child) => {
      const ped = child as Ped;
      if (ped.active) {
        ped.tick(delta);
      }
    });
  }

  createVehicle(x: number, y: number, id: string): Vehicle {
    const def = this.vehicleDefs[id];
    if (!def) {
      throw new Error(`Unknown vehicle definition: ${id}`);
    }
    let vehicle = this.vehiclePool.pop();
    if (!vehicle) {
      vehicle = new Vehicle(this.scene, x, y, def);
      this.scene.add.existing(vehicle);
      this.scene.physics.add.existing(vehicle);
      this.vehicleGroup.add(vehicle);
    } else {
      vehicle.resetFromConfig(x, y, def);
      this.vehicleGroup.add(vehicle);
    }
    return vehicle;
  }

  createPed(x: number, y: number, id: string): Ped {
    const def = this.pedDefs[id];
    if (!def) {
      throw new Error(`Unknown ped definition: ${id}`);
    }
    let ped = this.pedPool.pop();
    if (!ped) {
      ped = new Ped(this.scene, x, y, def);
      this.scene.add.existing(ped);
      this.scene.physics.add.existing(ped);
      this.pedGroup.add(ped);
    } else {
      ped.resetFromConfig(x, y, def);
      this.pedGroup.add(ped);
    }
    return ped;
  }

  recycleVehicle(vehicle: Vehicle): void {
    vehicle.setActive(false);
    vehicle.setVisible(false);
    vehicle.body?.stop();
    vehicle.body?.reset(0, 0);
    this.vehicleGroup.remove(vehicle, false);
    this.vehiclePool.push(vehicle);
  }

  recyclePed(ped: Ped): void {
    ped.setActive(false);
    ped.setVisible(false);
    ped.body?.stop();
    ped.body?.reset(0, 0);
    this.pedGroup.remove(ped, false);
    this.pedPool.push(ped);
  }

  private spawnVehicles(time: number, target: number, rules: DistrictSpawnRule[]): void {
    if (time - this.lastVehicleSpawn < 2000) {
      return;
    }
    if (this.vehicleGroup.countActive(true) >= target) {
      return;
    }
    const rule = Phaser.Utils.Array.GetRandom(rules);
    if (!rule) {
      return;
    }
    const vehicleId = Phaser.Utils.Array.GetRandom(rule.allowedVehicles);
    if (!vehicleId) {
      return;
    }
    const spawn = this.getSpawnPoint(rule.district, this.vehicleZonesByDistrict);
    if (!spawn) {
      return;
    }
    this.createVehicle(spawn.x, spawn.y, vehicleId);
    this.lastVehicleSpawn = time;
  }

  private spawnPeds(time: number, target: number, rules: DistrictSpawnRule[]): void {
    if (time - this.lastPedSpawn < 1500) {
      return;
    }
    if (this.pedGroup.countActive(true) >= target) {
      return;
    }
    const rule = Phaser.Utils.Array.GetRandom(rules);
    if (!rule) {
      return;
    }
    const pedId = Phaser.Utils.Array.GetRandom(rule.allowedPeds);
    if (!pedId) {
      return;
    }
    const spawn = this.getSpawnPoint(rule.district, this.pedZonesByDistrict);
    if (!spawn) {
      return;
    }
    this.createPed(spawn.x, spawn.y, pedId);
    this.lastPedSpawn = time;
  }

  private groupByDistrict(zones: SpawnZoneDefinition[]): Record<string, SpawnZoneDefinition[]> {
    return zones.reduce<Record<string, SpawnZoneDefinition[]>>((acc, zone) => {
      if (!acc[zone.district]) {
        acc[zone.district] = [];
      }
      acc[zone.district]!.push(zone);
      return acc;
    }, {});
  }

  private getSpawnPoint(
    district: string,
    table: Record<string, SpawnZoneDefinition[]>
  ): { x: number; y: number } | undefined {
    const zones = table[district];
    if (!zones || zones.length === 0) {
      return undefined;
    }
    const zone = Phaser.Utils.Array.GetRandom(zones);
    const x = Phaser.Math.Between(Math.floor(zone.x - zone.width / 2), Math.floor(zone.x + zone.width / 2));
    const y = Phaser.Math.Between(Math.floor(zone.y - zone.height / 2), Math.floor(zone.y + zone.height / 2));
    return { x, y };
  }
}
