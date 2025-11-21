// Simple 2D gravity rocket game: Earth -> Moon -> (optional) Earth return

// ---- Setup ----
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// HUD elements
const fuelDisplay = document.getElementById("fuelDisplay");
const speedDisplay = document.getElementById("speedDisplay");
const altitudeDisplay = document.getElementById("altitudeDisplay");
const bodyDisplay = document.getElementById("bodyDisplay");
const stageDisplay = document.getElementById("stageDisplay");
const statusDisplay = document.getElementById("statusDisplay");

// Keyboard input
const keys = {};

document.addEventListener("keydown", (e) => {
  if (
    e.code === "ArrowLeft" ||
    e.code === "ArrowRight" ||
    e.code === "ArrowUp" ||
    e.code === "Space"
  ) {
    e.preventDefault();
  }

  if (e.code === "KeyR" && !keys["KeyR"]) {
    // single-trigger on press
    resetGame();
  }
  keys[e.code] = true;
});

document.addEventListener("keyup", (e) => {
  keys[e.code] = false;
});

// ---- Game constants ----
const earth = {
  name: "Earth",
  x: 300,
  y: 300,
  radius: 80,
  mu: 40000 // gravitational parameter (G*M) in game units
};

const moon = {
  name: "Moon",
  x: 800,
  y: 300,
  radius: 40,
  mu: 8000
};

const PLANETS = [earth, moon];

const ROCKET = {
  width: 10,
  height: 20
};

const THRUST_ACCEL = 60; // thrust acceleration (m/s²) in game units
const ROT_SPEED = Math.PI; // radians per second
const FUEL_START = 1200;
const FUEL_BURN_RATE = 80; // units per second while thrusting

const MAX_LANDING_SPEED = 35; // total speed threshold
const MAX_RADIAL_SPEED = 20;
const MAX_TANGENTIAL_SPEED = 25;

// Orbit detection thresholds (very simplified)
const ORBIT_MIN_ALT = 40;
const ORBIT_MAX_ALT = 260;
const ORBIT_MAX_RADIAL_SPEED = 10;
const ORBIT_MIN_SPEED = 20;
const ORBIT_TIME_REQUIRED = 3.0; // seconds in "stable" orbit-like conditions

// Moon vicinity threshold
const MOON_VICINITY_DIST = 300;
const MOON_VICINITY_TIME = 2.0;

// ---- Game state ----
let state;
let lastTimestamp = null;

// For drawing trajectory
const TRAIL_MAX_POINTS = 600;
let trail = [];

// Mission progression state
let mission = {};

function resetMission() {
  mission = {
    orbitAchieved: false,
    reachedMoonVicinity: false,
    landedOnMoon: false,
    returnedToEarth: false,
    orbitTimer: 0,
    moonVicinityTimer: 0
  };
}

// Initialize or reset everything
function resetGame() {
  state = {
    x: earth.x,
    y: earth.y - earth.radius, // at the "top" of Earth
    vx: 0,
    vy: 0,
    angle: -Math.PI / 2, // pointing up
    fuel: FUEL_START,
    landedOn: "Earth", // starts on Earth
    crashed: false,
    isThrusting: false
  };

  trail = [];
  resetMission();
  stageDisplay.textContent = "Launch from Earth";
  statusDisplay.textContent =
    "Press ↑ or Space to launch. Reach orbit, go to the Moon, land gently!";
}

// ---- Utility functions ----
function vecLength(x, y) {
  return Math.sqrt(x * x + y * y);
}

function computeGravityAtPoint(x, y) {
  let ax = 0;
  let ay = 0;

  for (const body of PLANETS) {
    const dx = x - body.x;
    const dy = y - body.y;
    const r2 = dx * dx + dy * dy;
    const r = Math.sqrt(r2) || 1e-6;
    const aMag = -body.mu / (r2 + 1e-6); // acceleration magnitude
    ax += (aMag * dx) / r;
    ay += (aMag * dy) / r;
  }

  return { ax, ay };
}

function getNearestBody(x, y) {
  let nearest = PLANETS[0];
  let minDist = Infinity;

  for (const body of PLANETS) {
    const dx = x - body.x;
    const dy = y - body.y;
    const d = Math.sqrt(dx * dx + dy * dy);
    if (d < minDist) {
      minDist = d;
      nearest = body;
    }
  }
  return { body: nearest, distance: minDist };
}

// ---- Mission logic helpers ----
function checkOrbit(dt) {
  if (mission.orbitAchieved) return;

  const { body, distance } = getNearestBody(state.x, state.y);
  if (body !== earth || state.landedOn) {
    mission.orbitTimer = 0;
    return;
  }

  const alt = distance - body.radius;
  if (alt < ORBIT_MIN_ALT || alt > ORBIT_MAX_ALT) {
    mission.orbitTimer = 0;
    return;
  }

  const dx = state.x - body.x;
  const dy = state.y - body.y;
  const r = Math.sqrt(dx * dx + dy * dy) || 1e-6;
  const ux = dx / r;
  const uy = dy / r;

  const radialSpeed = state.vx * ux + state.vy * uy;
  const speed = vecLength(state.vx, state.vy);

  if (
    Math.abs(radialSpeed) < ORBIT_MAX_RADIAL_SPEED &&
    speed > ORBIT_MIN_SPEED
  ) {
    mission.orbitTimer += dt;
    if (mission.orbitTimer >= ORBIT_TIME_REQUIRED) {
      mission.orbitAchieved = true;
      stageDisplay.textContent = "Transfer to the Moon";
      statusDisplay.textContent =
        "Nice! Earth orbit achieved. Burn prograde to head toward the Moon.";
    }
  } else {
    mission.orbitTimer = 0;
  }
}

function checkMoonVicinity(dt) {
  if (!mission.orbitAchieved || mission.reachedMoonVicinity) return;
  if (state.landedOn) {
    mission.moonVicinityTimer = 0;
    return;
  }

  const { body, distance } = getNearestBody(state.x, state.y);
  if (body !== moon || distance > MOON_VICINITY_DIST) {
    mission.moonVicinityTimer = 0;
    return;
  }

  mission.moonVicinityTimer += dt;
  if (mission.moonVicinityTimer >= MOON_VICINITY_TIME) {
    mission.reachedMoonVicinity = true;
    stageDisplay.textContent = "Land on the Moon";
    statusDisplay.textContent =
      "You’ve reached the Moon’s vicinity. Land gently on its surface!";
  }
}

function handleLanding(body) {
  state.landedOn = body.name;
  state.vx = 0;
  state.vy = 0;

  const dx = state.x - body.x;
  const dy = state.y - body.y;
  const dist = Math.sqrt(dx * dx + dy * dy) || 1e-6;
  const ux = dx / dist;
  const uy = dy / dist;

  // Snap to surface
  state.x = body.x + ux * body.radius;
  state.y = body.y + uy * body.radius;

  if (body === earth) {
    if (mission.landedOnMoon && !mission.returnedToEarth) {
      mission.returnedToEarth = true;
      stageDisplay.textContent = "Mission Complete";
      statusDisplay.textContent =
        "You successfully returned to Earth! Press R to play again.";
    } else {
      statusDisplay.textContent = "Landed back on Earth. Press ↑ / Space to take off again.";
    }
  } else if (body === moon) {
    if (!mission.landedOnMoon) {
      mission.landedOnMoon = true;
      stageDisplay.textContent = "Optional: Return to Earth";
      statusDisplay.textContent =
        "Moon landing successful! Take off and head back to Earth if you like.";
    } else {
      statusDisplay.textContent =
        "You landed on the Moon again. You can still try returning to Earth.";
    }
  }
}

function handleCrash(body) {
  state.crashed = true;
  state.landedOn = null;
  statusDisplay.textContent =
    `You crashed on ${body.name}! Press R to reset and try again.`;
}

// ---- Update loop ----
function update(dt) {
  if (state.crashed) {
    // Only wait for R which is handled in keydown
    return;
  }

  // Controls
  const rotateLeft = keys["ArrowLeft"] || keys["KeyA"];
  const rotateRight = keys["ArrowRight"] || keys["KeyD"];
  const thrustKey =
    keys["ArrowUp"] || keys["Space"] || keys["KeyW"];

  if (rotateLeft) {
    state.angle -= ROT_SPEED * dt;
  }
  if (rotateRight) {
    state.angle += ROT_SPEED * dt;
  }

  let isThrusting = thrustKey && state.fuel > 0;
  state.isThrusting = isThrusting;

  // If landed and starting to thrust, lift off
  if (state.landedOn && isThrusting) {
    state.landedOn = null;
    statusDisplay.textContent =
      "You are airborne! Try to reach a stable orbit around Earth.";
  }

  // Physics only when not landed
  if (!state.landedOn) {
    const g = computeGravityAtPoint(state.x, state.y);
    let ax = g.ax;
    let ay = g.ay;

    if (isThrusting) {
      ax += Math.cos(state.angle) * THRUST_ACCEL;
      ay += Math.sin(state.angle) * THRUST_ACCEL;
      state.fuel -= FUEL_BURN_RATE * dt;
      if (state.fuel < 0) {
        state.fuel = 0;
        isThrusting = false;
        state.isThrusting = false;
      }
    }

    state.vx += ax * dt;
    state.vy += ay * dt;

    state.x += state.vx * dt;
    state.y += state.vy * dt;

    // Collision detection with Earth and Moon
    for (const body of PLANETS) {
      const dx = state.x - body.x;
      const dy = state.y - body.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist <= body.radius) {
        // Determine crash vs safe landing
        const r = dist || 1e-6;
        const ux = dx / r;
        const uy = dy / r;

        const radialSpeed = state.vx * ux + state.vy * uy;
        const tx = -uy;
        const ty = ux;
        const tangentialSpeed = state.vx * tx + state.vy * ty;
        const speed = vecLength(state.vx, state.vy);

        const safeLanding =
          speed <= MAX_LANDING_SPEED &&
          Math.abs(radialSpeed) <= MAX_RADIAL_SPEED &&
          Math.abs(tangentialSpeed) <= MAX_TANGENTIAL_SPEED;

        if (safeLanding) {
          handleLanding(body);
        } else {
          handleCrash(body);
        }
        break;
      }
    }
  }

  // Mission state checks
  checkOrbit(dt);
  checkMoonVicinity(dt);

  // Trail
  trail.push({ x: state.x, y: state.y });
  if (trail.length > TRAIL_MAX_POINTS) {
    trail.shift();
  }
}

// ---- Rendering ----
function drawPlanet(body, colorFill, colorStroke) {
  ctx.beginPath();
  ctx.arc(body.x, body.y, body.radius, 0, Math.PI * 2);
  ctx.fillStyle = colorFill;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = colorStroke;
  ctx.stroke();

  ctx.fillStyle = "#ffffff";
  ctx.font = "14px system-ui";
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillText(body.name, body.x, body.y + body.radius + 6);
}

function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Space background stars (simple)
  ctx.save();
  ctx.globalAlpha = 0.4;
  for (let i = 0; i < 60; i++) {
    const x = (i * 57) % canvas.width;
    const y = (i * 131) % canvas.height;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(x, y, 1, 1);
  }
  ctx.restore();

  // Draw trail
  if (trail.length > 1) {
    ctx.beginPath();
    ctx.lineWidth = 1;
    ctx.strokeStyle = "rgba(120, 200, 255, 0.6)";
    ctx.moveTo(trail[0].x, trail[0].y);
    for (let i = 1; i < trail.length; i++) {
      ctx.lineTo(trail[i].x, trail[i].y);
    }
    ctx.stroke();
  }

  // Draw Earth & Moon
  drawPlanet(earth, "#1f4fd8", "#99c2ff");
  drawPlanet(moon, "#bbbbbb", "#ffffff");

  // Draw rocket
  ctx.save();
  ctx.translate(state.x, state.y);
  ctx.rotate(state.angle + Math.PI / 2); // rocket's "nose" upward

  // Body
  ctx.beginPath();
  ctx.moveTo(0, -ROCKET.height / 2); // nose
  ctx.lineTo(ROCKET.width / 2, ROCKET.height / 2);
  ctx.lineTo(-ROCKET.width / 2, ROCKET.height / 2);
  ctx.closePath();
  ctx.fillStyle = "#f5f5f5";
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = "#333333";
  ctx.stroke();

  // Side fins
  ctx.beginPath();
  ctx.moveTo(ROCKET.width / 2, ROCKET.height / 4);
  ctx.lineTo(ROCKET.width, ROCKET.height / 2);
  ctx.lineTo(ROCKET.width / 2, ROCKET.height / 2);
  ctx.closePath();
  ctx.moveTo(-ROCKET.width / 2, ROCKET.height / 4);
  ctx.lineTo(-ROCKET.width, ROCKET.height / 2);
  ctx.lineTo(-ROCKET.width / 2, ROCKET.height / 2);
  ctx.closePath();
  ctx.fillStyle = "#ff5555";
  ctx.fill();

  // Flame
  if (state.isThrusting && state.fuel > 0 && !state.crashed) {
    ctx.beginPath();
    ctx.moveTo(0, ROCKET.height / 2);
    ctx.lineTo(ROCKET.width / 3, ROCKET.height / 2 + 10);
    ctx.lineTo(-ROCKET.width / 3, ROCKET.height / 2 + 10);
    ctx.closePath();
    ctx.fillStyle = "#ffcc33";
    ctx.fill();
  }

  ctx.restore();

  // HUD numeric info
  const speed = vecLength(state.vx, state.vy);
  const { body: nearestBody, distance } = getNearestBody(state.x, state.y);
  const altitude = Math.max(0, distance - nearestBody.radius);

  fuelDisplay.textContent = state.fuel.toFixed(0);
  speedDisplay.textContent = speed.toFixed(1);
  altitudeDisplay.textContent = altitude.toFixed(1);
  bodyDisplay.textContent = nearestBody.name;
}

// ---- Main loop ----
function gameLoop(timestamp) {
  if (!lastTimestamp) lastTimestamp = timestamp;
  const dt = Math.min((timestamp - lastTimestamp) / 1000, 0.05);
  lastTimestamp = timestamp;

  update(dt);
  render();
  requestAnimationFrame(gameLoop);
}

// Start
resetGame();
requestAnimationFrame(gameLoop);
