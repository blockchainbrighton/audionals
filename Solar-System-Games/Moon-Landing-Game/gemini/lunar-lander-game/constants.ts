import { Rocket, CelestialBody } from './types';

// GAME WORLD CONSTANTS
export const WORLD_WIDTH = 400000; // in km
export const WORLD_HEIGHT = 400000; // in km
export const SCALE = 1000; // meters per pixel (for display of speed/altitude)

// SIMULATION CONSTANTS
export const TIME_STEP = 1 / 60; // 60 updates per second
export const GRAVITATIONAL_CONSTANT = 0.15; // Heavily reduced to make takeoff possible

// ROCKET CONSTANTS
export const THRUST = 30; // Acceleration units
export const ROTATION_SPEED = 2.5; // Radians per second
export const FUEL_CONSUMPTION = 5; // Fuel units per second
export const SAFE_LANDING_SPEED = 2.5; // m/s equivalent

// CELESTIAL BODY CONSTANTS
const EARTH_POS = { x: WORLD_WIDTH / 8, y: WORLD_HEIGHT / 2 };
const MOON_POS = { x: WORLD_WIDTH - (WORLD_WIDTH / 3), y: WORLD_HEIGHT / 2 };
export const EARTH: CelestialBody = {
  name: 'Earth',
  position: EARTH_POS,
  radius: 6371 / 100, // scaled
  mass: 5.972 * 10000, // scaled
  color: '#3b82f6',
};

export const MOON: CelestialBody = {
  name: 'Moon',
  position: MOON_POS,
  radius: 1737 / 100, // scaled
  mass: 7.342 * 100, // scaled
  color: '#9ca3af',
};

// INITIAL STATES
export const INITIAL_ROCKET_STATE_EARTH: Rocket = {
  position: { x: EARTH_POS.x, y: EARTH_POS.y - EARTH.radius - 2 }, // Increased launch clearance
  velocity: { x: 0, y: 0 },
  angle: -Math.PI / 2, // Pointing up
  fuel: 100,
  thrusting: false,
};

export const INITIAL_ROCKET_STATE_MOON: Rocket = {
  position: { x: MOON_POS.x, y: MOON_POS.y - MOON.radius - 2 }, // Increased launch clearance
  velocity: { x: 0, y: 0 },
  angle: -Math.PI / 2, // Pointing up
  fuel: 100,
  thrusting: false,
};