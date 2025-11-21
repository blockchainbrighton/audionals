
export interface OrbitalParameters {
  semiMajorAxis: number; // in Astronomical Units (AU)
  eccentricity: number;
  inclination: number; // in degrees
  longitudeOfAscendingNode: number; // in degrees
  argumentOfPeriapsis: number; // in degrees
  meanAnomalyAtEpoch: number; // in degrees
}

export type CelestialBodyType = 'Star' | 'Planet' | 'Dwarf Planet' | 'Moon';

export interface CelestialBody {
  id: string;
  name: string;
  type: CelestialBodyType;
  radius: number; // in km
  mass: number; // in 10^24 kg
  rotationPeriod: number; // in hours
  axialTilt: number; // in degrees
  color: string;
  parentId?: string;
  orbit?: OrbitalParameters;
}

export interface Position {
  x: number; // in AU
  y: number; // in AU
  z: number; // in AU
}
