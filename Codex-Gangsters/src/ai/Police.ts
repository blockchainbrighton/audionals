import Phaser from 'phaser';
import Ped from '@ai/Ped';
import Vehicle from '@actors/Vehicle';

export default class Police extends Ped {
  private patrolVehicle?: Vehicle;

  assignVehicle(vehicle: Vehicle): void {
    this.patrolVehicle = vehicle;
  }

  engage(target: Phaser.Math.Vector2): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    const direction = target.clone().subtract(new Phaser.Math.Vector2(this.x, this.y)).normalize();
    body.setVelocity(direction.x * 160, direction.y * 160);
  }
}
