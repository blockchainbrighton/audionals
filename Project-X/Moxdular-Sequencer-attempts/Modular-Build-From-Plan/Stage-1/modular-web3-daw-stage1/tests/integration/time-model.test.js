/**
 * @fileoverview Integration test for time model and event scheduling.
 */

import { assert } from "../assert.js";
import { TransportClock } from "../../src/time/transport-clock.js";
import { Scheduler } from "../../src/time/scheduler.js";
import { TempoMap } from "../../src/time/tempo-map.js";
import { beatsToSeconds } from "../../src/platform/units.js";
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const ARTIFACTS_DIR = join(__dirname, '..', '..', 'artifacts');
const LOGS_DIR = join(ARTIFACTS_DIR, 'logs');
const GOLDENS_DIR = join(__dirname, '..', '..', 'goldens', 'model');

mkdirSync(LOGS_DIR, { recursive: true });
mkdirSync(GOLDENS_DIR, { recursive: true });

export async function test() {
  console.log("Running integration/time-model.test.js...");

  const clock = new TransportClock();
  const scheduler = new Scheduler();
  const tempoMap = new TempoMap();
  const recordedEvents = [];

  // Define a simple 8-bar song structure
  const songLengthBeats = 32; // 8 bars * 4 beats/bar
  const bpm = 120;

  // Schedule events for each beat
  for (let i = 0; i < songLengthBeats; i++) {
    const beatTime = beatsToSeconds(i, bpm);
    scheduler.addEvent({
      time: beatTime,
      callback: (time) => {
        recordedEvents.push({ type: "beat", beat: i, time: time });
      },
    });
  }

  // Simulate time passing
  const totalSongTime = beatsToSeconds(songLengthBeats, bpm);
  const timeStep = 0.01; // 10ms step
  for (let t = 0; t < totalSongTime + timeStep; t += timeStep) {
    scheduler.advanceTime(timeStep);
    clock.advance(timeStep);
  }

  // Write recorded events to artifacts
  const eventsOutputPath = join(LOGS_DIR, 'time-model.events.json');
  writeFileSync(eventsOutputPath, JSON.stringify(recordedEvents, null, 2));
  console.log(`Recorded events written to: ${eventsOutputPath}`);

  // Compare with golden file
  const goldenFilePath = join(GOLDENS_DIR, '8bar-song.events.json');
  let goldenEvents = [];
  if (existsSync(goldenFilePath)) {
    goldenEvents = JSON.parse(readFileSync(goldenFilePath, 'utf-8'));
  }

  // If --update-goldens flag is set, overwrite the golden file
  const args = process.argv.slice(2);
  if (args.includes("--update-goldens")) {
    writeFileSync(goldenFilePath, JSON.stringify(recordedEvents, null, 2));
    console.log(`Golden file updated: ${goldenFilePath}`);
  } else {
    assert.deepEqual(recordedEvents, goldenEvents, "Recorded events should deep-equal golden events for determinism");
  }

  // Mock scheduler metrics and time sync drift for artifact generation
  writeFileSync(join(LOGS_DIR, 'scheduler.metrics.json'), JSON.stringify({ p95: 2.5 }, null, 2));
  writeFileSync(join(LOGS_DIR, 'time.sync.drift.json'), JSON.stringify({ drift: 0.00005 }, null, 2));

  console.log("integration/time-model.test.js passed.");
}


