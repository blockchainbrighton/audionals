/**
 * @jest-environment jsdom
 */
import Matter from 'https://cdn.jsdelivr.net/npm/matter-js@0.19.0/build/matter.mjs';
import { Physics } from '../src/core/Physics'; // Assuming direct import possible

describe('Physics System Tests', () => {
    let physics;

    beforeEach(() => {
        physics = new Physics();
    });

    test('Harmonoid should not fall through a thin static platform', () => {
        // Create a thin platform
        const platform = physics.addStaticBody(300, 500, 200, 5, { label: 'thinPlatform' }); // 5px high

        // Create a "Harmonoid" body above it
        const harmonoidBody = physics.addCircularBody(300, 450, 15, { label: 'harmonoid' }); // 15px radius

        // Simulate a few steps of the physics engine
        for (let i = 0; i < 100; i++) { // Simulate for enough time for it to fall and settle
            physics.update(16 / 1000); // Simulate 16ms ticks
        }
        
        // Check if the Harmonoid is resting on or very near the platform surface
        // Platform surface Y = 500 - height/2 = 500 - 2.5 = 497.5
        // Harmonoid bottom Y = position.y + radius = position.y + 15
        const platformTopY = platform.position.y - platform.bounds.min.y; // Simpler: platform.bounds.min.y
        const harmonoidBottomY = harmonoidBody.position.y + 15;

        // Expect Harmonoid's bottom to be at or slightly above platform's top surface.
        // There might be slight penetration or separation due to Matter.js solver iterations and restitution.
        expect(harmonoidBottomY).toBeLessThanOrEqual(platform.bounds.min.y + 1.0); // Check it's not significantly below (e.g. allowing 1px penetration)
        expect(harmonoidBody.position.y).toBeLessThan(platform.position.y + 15 + 5); // Check it's generally above the platform center
                                                                                     // (Harmonoid center should be above platform center - platform_height/2 - harmonoid_radius)
        
        // A more robust check: ensure the vertical velocity is near zero after settling.
        expect(harmonoidBody.velocity.y).toBeCloseTo(0, 1); // Velocity should be very small after settling

        // Check that it's not below the platform's center by a large margin
        expect(harmonoidBody.position.y).toBeLessThan(platform.position.y + platform.circleRadius + (5 /*platform height*/)/2 + 15 /*harmonoid radius*/ );

        // More specific position check (y position of harmonoid should be roughly platformY - platformHeight/2 - harmonoidRadius)
        const expectedRestY = platform.position.y - (5/2) - 15;
        expect(harmonoidBody.position.y).toBeCloseTo(expectedRestY, 0); // Tolerance for settling. 0 precision for y.

    });

    test('Dynamic body should fall due to gravity', () => {
        const dynamicBody = physics.addRectangularBody(100, 100, 20, 20);
        const initialY = dynamicBody.position.y;

        for (let i = 0; i < 50; i++) {
            physics.update(16 / 1000);
        }

        expect(dynamicBody.position.y).toBeGreaterThan(initialY);
    });
    
    test('Static body should not move due to gravity or applied force', () => {
        const staticBody = physics.addStaticBody(100, 100, 50, 50);
        const initialPos = { ...staticBody.position };

        // Apply force (should be ignored for static bodies if not specifically handled)
        Matter.Body.applyForce(staticBody, staticBody.position, { x: 0.1, y: 0.1 });
        
        for (let i = 0; i < 50; i++) {
            physics.update(16 / 1000);
        }

        expect(staticBody.position.x).toBe(initialPos.x);
        expect(staticBody.position.y).toBe(initialPos.y);
        expect(staticBody.velocity.x).toBe(0);
        expect(staticBody.velocity.y).toBe(0);
    });
});