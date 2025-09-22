import { describe, expect, it } from 'vitest';
import { stepVehiclePhysics } from '@game/vehiclePhysics';
import type { VehicleDefinition } from '@game/types';

const VEHICLE_DEF: VehicleDefinition = {
  id: 'test_car',
  name: 'Test Car',
  spriteKey: 'vehicle_compact',
  width: 32,
  height: 64,
  maxSpeed: 300,
  acceleration: 240,
  braking: 200,
  turnRate: 2.4,
  grip: 0.2,
  drift: 0.3,
  passengerCapacity: 2,
  weight: 1200
};

describe('stepVehiclePhysics', () => {
  it('accelerates forward with throttle', () => {
    const result = stepVehiclePhysics({ velocity: { x: 0, y: 0 }, rotation: 0 }, { throttle: 1, brake: 0, steering: 0, handbrake: false }, VEHICLE_DEF, 100);
    expect(result.velocity.x).toBeGreaterThan(0);
    expect(result.velocity.y).toBeCloseTo(0, 5);
  });

  it('applies brake force', () => {
    const moving = { velocity: { x: 200, y: 0 }, rotation: 0 };
    const result = stepVehiclePhysics(moving, { throttle: 0, brake: 1, steering: 0, handbrake: false }, VEHICLE_DEF, 200);
    expect(result.velocity.x).toBeLessThan(moving.velocity.x);
  });

  it('turns when steering input is present', () => {
    const result = stepVehiclePhysics({ velocity: { x: 100, y: 0 }, rotation: 0 }, { throttle: 0, brake: 0, steering: 1, handbrake: false }, VEHICLE_DEF, 150);
    expect(result.rotation).toBeGreaterThan(0);
    expect(result.angularVelocity).toBeGreaterThan(0);
  });
});
