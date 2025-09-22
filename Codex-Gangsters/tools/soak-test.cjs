#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');

const pedsPath = path.join(__dirname, '..', 'src', 'data', 'peds.json');
const pedDefs = JSON.parse(fs.readFileSync(pedsPath, 'utf8'));

const AGENT_COUNT = 500;
const agents = [];

for (let i = 0; i < AGENT_COUNT; i += 1) {
  const def = pedDefs[i % pedDefs.length];
  agents.push({
    id: `soak_${i}`,
    definition: def.id,
    position: {
      x: Math.random() * 2048,
      y: Math.random() * 2048
    },
    state: 'walk',
    stamina: 1,
    panic: 0
  });
}

const before = process.memoryUsage().heapUsed;

for (let step = 0; step < 600; step += 1) {
  for (const agent of agents) {
    agent.position.x += Math.sin(step + agent.position.y * 0.01) * 8;
    agent.position.y += Math.cos(step + agent.position.x * 0.01) * 8;
    agent.panic = Math.min(1, agent.panic + 0.001 * Math.random());
    agent.stamina = Math.max(0, agent.stamina - 0.0005);
    if (agent.stamina <= 0) {
      agent.state = 'idle';
      agent.stamina = 1;
    }
  }
}

const after = process.memoryUsage().heapUsed;

console.log('Spawned agents:', agents.length);
console.log('Heap delta (KB):', ((after - before) / 1024).toFixed(2));
console.log('Sample agent:', agents[0]);
console.log('All good – use Chrome devtools Timeline while this script runs inside the browser build for real profiling.');
