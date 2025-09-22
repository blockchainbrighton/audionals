export const GameEvents = {
  PlayerDamaged: 'player-damaged',
  PlayerDied: 'player-died',
  PlayerFired: 'player-fired',
  PlayerEnteredVehicle: 'player-entered-vehicle',
  PlayerExitedVehicle: 'player-exited-vehicle',
  VehicleDestroyed: 'vehicle-destroyed',
  PedSpawned: 'ped-spawned',
  PedRemoved: 'ped-removed',
  HeatChanged: 'heat-changed',
  MissionStarted: 'mission-started',
  MissionCompleted: 'mission-completed',
  MissionFailed: 'mission-failed',
  MissionObjective: 'mission-objective',
  MissionTimer: 'mission-timer',
  CashChanged: 'cash-changed',
  WeatherChanged: 'weather-changed',
  TimeOfDayChanged: 'time-of-day-changed'
} as const;

export type GameEventKeys = (typeof GameEvents)[keyof typeof GameEvents];
