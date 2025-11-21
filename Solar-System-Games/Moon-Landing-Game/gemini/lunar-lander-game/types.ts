
export enum GameState {
  Start,
  Playing,
  Crashed,
  LandedMoon,
  LandedEarth,
}

export interface Vector2D {
  x: number;
  y: number;
}

export interface Rocket {
  position: Vector2D;
  velocity: Vector2D;
  angle: number; // in radians
  fuel: number; // as a percentage
  thrusting: boolean;
}

export interface CelestialBody {
  name: string;
  position: Vector2D;
  radius: number;
  mass: number;
  color: string;
}
