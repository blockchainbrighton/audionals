import Matter from 'https://cdn.jsdelivr.net/npm/matter-js@0.19.0/+esm';

export class Physics {
    /** @type {Matter.Engine} */
    engine;
    /** @type {Matter.World} */
    world;
    // Runner is not strictly needed if we manually call Engine.update in our game loop
    // /** @type {Matter.Runner} */
    // runner;

    constructor() {
        this.engine = Matter.Engine.create();
        this.world = this.engine.world;
        // this.runner = Matter.Runner.create(); // Not using internal runner
        
        // Set default gravity, can be adjusted
        this.world.gravity.y = 1; 
    }

    /**
     * @param {number} x
     * @param {number} y
     * @param {number} width
     * @param {number} height
     * @param {Matter.IBodyDefinition} [options]
     * @returns {Matter.Body}
     */
    addStaticBody(x, y, width, height, options = {}) {
        const body = Matter.Bodies.rectangle(x, y, width, height, { ...options, isStatic: true });
        Matter.World.add(this.world, body);
        return body;
    }

    /**
     * @param {number} x
     * @param {number} y
     * @param {number} radius
     * @param {Matter.IBodyDefinition} [options]
     * @returns {Matter.Body}
     */
    addCircularBody(x, y, radius, options = {}) {
        const body = Matter.Bodies.circle(x, y, radius, options);
        Matter.World.add(this.world, body);
        return body;
    }
    
    /**
     * @param {number} x
     * @param {number} y
     * @param {number} width
     * @param {number} height
     * @param {Matter.IBodyDefinition} [options]
     * @returns {Matter.Body}
     */
    addRectangularBody(x, y, width, height, options = {}) {
        const body = Matter.Bodies.rectangle(x, y, width, height, options);
        Matter.World.add(this.world, body);
        return body;
    }
    

    /** @param {Matter.Body | Matter.Composite} bodyOrComposite */
    removeBody(bodyOrComposite) {
        Matter.World.remove(this.world, bodyOrComposite);
    }

    clear() {
        Matter.World.clear(this.world, false); // false to keep default constraints/composites
        Matter.Engine.clear(this.engine);
    }

    /** @param {number} deltaTime Sseconds */
    update(deltaTime) {
        // Matter.js uses milliseconds for its delta in Engine.update
        Matter.Engine.update(this.engine, deltaTime * 1000);
    }
    
    /**
     * Checks if two Matter.js bodies are currently touching (overlapping or in contact).
     * This is a simplified check often good enough for gameplay logic after collision events.
     * For precise contact points, use collision events.
     * @param {Matter.Body} bodyA
     * @param {Matter.Body} bodyB
     * @returns {boolean}
     */
    areBodiesTouching(bodyA, bodyB) {
        if (!bodyA || !bodyB) return false;
        const collisions = Matter.Query.collides(bodyA, [bodyB]);
        return collisions.length > 0;
    }

    /**
     * @param {Matter.Body} body
     * @param {Matter.Vector} force
     * @param {Matter.Vector} [point]
     */
    applyForce(body, force, point = body.position) {
        Matter.Body.applyForce(body, point, force);
    }

    /**
     * @param {Matter.Body} body
     * @param {Matter.Vector} velocity
     */
    setVelocity(body, velocity) {
        Matter.Body.setVelocity(body, velocity);
    }

    /**
     * @param {Matter.Body} body
     * @param {number} angle
     */
    setAngle(body, angle) {
        Matter.Body.setAngle(body, angle);
    }

    /**
     * @param {Matter.Body} body
     * @param {number} angularVelocity
     */
    setAngularVelocity(body, angularVelocity) {
        Matter.Body.setAngularVelocity(body, angularVelocity);
    }
}