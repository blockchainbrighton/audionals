
import { CelestialBody, Position } from '../types';

const G = 6.67430e-11; // Gravitational constant
const SUN_MASS_KG = 1.9885e30;
const AU_KM = 149597870.7;

// Helper to convert degrees to radians
const toRadians = (degrees: number): number => (degrees * Math.PI) / 180;

/**
 * Calculates the position of a celestial body at a given Julian Date.
 * Uses Kepler's laws for orbital mechanics.
 * @param body The celestial body to calculate the position for.
 * @param julianDate The current simulation time as a Julian Date.
 * @returns The {x, y, z} position in AU relative to its parent body.
 */
export const calculatePosition = (body: CelestialBody, julianDate: number): Position => {
  if (!body.orbit) {
    return { x: 0, y: 0, z: 0 };
  }

  const {
    semiMajorAxis: a, // AU
    eccentricity: e,
    inclination: i, // degrees
    longitudeOfAscendingNode: O, // Omega (degrees)
    argumentOfPeriapsis: w, // omega (degrees)
    meanAnomalyAtEpoch: M0, // degrees
  } = body.orbit;
  
  // For the sun, parent is itself, so its mass is the central body mass.
  // For other bodies, parent is the sun.
  // This logic is simplified; for moons, parent mass should be the planet's mass.
  // Here we assume everything orbits the sun for simplicity in this calculation,
  // and handle hierarchy in the App component.
  const centralBodyMass = (body.parentId === 'sun' || !body.parentId) ? SUN_MASS_KG : 1.9885e30;

  // 1. Mean motion (n) in radians per day
  const a_m = a * AU_KM * 1000;
  const n_rad_per_sec = Math.sqrt((G * centralBodyMass) / Math.pow(a_m, 3));
  const n_rad_per_day = n_rad_per_sec * 86400;

  // 2. Time since epoch (J2000.0)
  const d = julianDate - 2451545.0;

  // 3. Mean Anomaly (M)
  const M_rad = toRadians(M0) + n_rad_per_day * d;

  // 4. Eccentric Anomaly (E) by solving Kepler's equation M = E - e*sin(E)
  // Using Newton-Raphson iteration
  let E = M_rad;
  for (let i = 0; i < 7; i++) {
    E = E - (E - e * Math.sin(E) - M_rad) / (1 - e * Math.cos(E));
  }
  
  // 5. True Anomaly (v)
  const v = 2 * Math.atan2(
    Math.sqrt(1 + e) * Math.sin(E / 2),
    Math.sqrt(1 - e) * Math.cos(E / 2)
  );

  // 6. Heliocentric distance (r)
  const r = a * (1 - e * Math.cos(E));

  // 7. Position in orbital plane (x', y')
  const x_orb = r * Math.cos(v);
  const y_orb = r * Math.sin(v);

  // Convert angles to radians for rotation
  const i_rad = toRadians(i);
  const O_rad = toRadians(O);
  const w_rad = toRadians(w);

  // 8. Rotate to ecliptic coordinates (x, y, z)
  const x = (x_orb * (Math.cos(w_rad) * Math.cos(O_rad) - Math.sin(w_rad) * Math.cos(i_rad) * Math.sin(O_rad)) -
             y_orb * (Math.sin(w_rad) * Math.cos(O_rad) + Math.cos(w_rad) * Math.cos(i_rad) * Math.sin(O_rad)));
  
  const y = (x_orb * (Math.cos(w_rad) * Math.sin(O_rad) + Math.sin(w_rad) * Math.cos(i_rad) * Math.cos(O_rad)) +
             y_orb * (-Math.sin(w_rad) * Math.sin(O_rad) + Math.cos(w_rad) * Math.cos(i_rad) * Math.cos(O_rad)));

  const z = (x_orb * (Math.sin(w_rad) * Math.sin(i_rad)) +
             y_orb * (Math.cos(w_rad) * Math.sin(i_rad)));
  
  return { x, y, z };
};
