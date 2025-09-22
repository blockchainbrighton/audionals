import { VehicleDefinition } from '@game/types';

export interface VehicleControlInput {
  throttle: number;
  brake: number;
  steering: number;
  handbrake: boolean;
}

export interface VehiclePhysicsState {
  velocity: { x: number; y: number };
  rotation: number;
}

export interface VehiclePhysicsResult extends VehiclePhysicsState {
  angularVelocity: number;
}

export function stepVehiclePhysics(
  state: VehiclePhysicsState,
  control: VehicleControlInput,
  def: VehicleDefinition,
  deltaMs: number
): VehiclePhysicsResult {
  const delta = deltaMs / 1000;
  const headingX = Math.cos(state.rotation);
  const headingY = Math.sin(state.rotation);

  const accelForce = control.throttle * def.acceleration - control.brake * def.braking;
  const accelX = headingX * accelForce * delta;
  const accelY = headingY * accelForce * delta;

  let vx = state.velocity.x + accelX;
  let vy = state.velocity.y + accelY;

  const speed = Math.sqrt(vx * vx + vy * vy);
  const maxSpeed = def.maxSpeed;
  if (speed > maxSpeed) {
    const scale = maxSpeed / speed;
    vx *= scale;
    vy *= scale;
  }

  const drag = def.grip * 6;
  vx *= 1 - drag * delta * (control.handbrake ? 1.6 : 1);
  vy *= 1 - drag * delta * (control.handbrake ? 1.6 : 1);

  const steeringEffect = control.steering * def.turnRate * delta * (speed / Math.max(1, maxSpeed));
  const angularVelocity = steeringEffect * speed * 0.3;
  const rotation = state.rotation + steeringEffect;

  return {
    velocity: { x: vx, y: vy },
    rotation,
    angularVelocity
  };
}
