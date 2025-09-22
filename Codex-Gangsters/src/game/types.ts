export interface VehicleDefinition {
  id: string;
  name: string;
  spriteKey: string;
  width: number;
  height: number;
  maxSpeed: number;
  acceleration: number;
  braking: number;
  turnRate: number;
  grip: number;
  drift: number;
  passengerCapacity: number;
  weight: number;
}

export interface WeaponDefinition {
  id: string;
  name: string;
  spriteKey: string;
  category: 'melee' | 'pistol' | 'smg' | 'shotgun' | 'grenade';
  damage: number;
  fireRate: number;
  projectileSpeed: number;
  projectileLife: number;
  spread: number;
  burst?: number;
  clipSize?: number;
  reloadTime?: number;
  recoil: number;
  soundKey: string;
  aiBurstMin?: number;
  aiBurstMax?: number;
}

export interface PedDefinition {
  id: string;
  name: string;
  baseSpeed: number;
  sightRadius: number;
  hearingRadius: number;
  courage: number;
  weapon?: string;
  cashMin: number;
  cashMax: number;
}

export interface HeatLevelDefinition {
  level: number;
  label: string;
  decayDelay: number;
  escalationCooldown: number;
  spawnTable: Array<{
    type: 'ped' | 'vehicle';
    id: string;
    weight: number;
    tactic: 'patrol' | 'roadblock' | 'spike' | 'swat' | 'heavy';
  }>;
}

export interface MissionObjective {
  id: string;
  description: string;
  type: 'reach' | 'pickup' | 'dropoff' | 'chase' | 'escape' | 'timed';
  target?: { x: number; y: number; district: string };
  timeLimit?: number;
  itemId?: string;
  next?: string;
}

export interface MissionDefinition {
  id: string;
  name: string;
  giver: 'board' | 'payphone';
  description: string;
  reward: number;
  objectives: MissionObjective[];
  failureDebt?: number;
}

export interface DistrictSpawnRule {
  district: string;
  weather: 'clear' | 'rain' | 'fog' | 'any';
  timeOfDay: 'day' | 'night' | 'any';
  pedDensity: number;
  vehicleDensity: number;
  allowedPeds: string[];
  allowedVehicles: string[];
}

export interface SpawnZoneDefinition {
  id: string;
  district: string;
  type: 'ped' | 'vehicle' | 'mission' | 'shop' | 'safehouse' | 'payphone' | 'respray';
  x: number;
  y: number;
  width: number;
  height: number;
  metadata?: Record<string, unknown>;
}

export interface SaveGamePayload {
  version: number;
  createdAt: number;
  updatedAt: number;
  player: {
    x: number;
    y: number;
    district: string;
    cash: number;
    health: number;
    armor: number;
    inventory: string[];
    activeWeapon: string;
    heat: number;
  };
  world: {
    timeOfDayMinutes: number;
    weather: 'clear' | 'rain' | 'fog';
    discoveredDistricts: string[];
    activeMissionId?: string;
  };
}

export interface HeatHistoryEntry {
  level: number;
  timestamp: number;
}
