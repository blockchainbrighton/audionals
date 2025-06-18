import { serializeSequence, deserializeSequence } from './sequenceSerializer.js'; // Assuming you export it

const testSequenceInput = {
    projectName: "Test Steps",
    bpm: 120,
    channels: [
        {
            name: "Channel With Steps",
            src: "some_src_id",
            volume: 0.8, // Default
            pitch: 0, // Default
            steps: [true, false, true, false, false, false, false, false] // 8 steps for simplicity
        },
        {
            name: "Channel No Steps",
            src: "another_src_id",
            volume: 0.5 // Not default
        },
        {
            name: "Empty Channel" // All defaults, no src, no steps
        }
    ]
};

const serializedTest = serializeSequence(testSequenceInput);
console.log("Serialized Test Output:", JSON.stringify(serializedTest, null, 2));

const deserializedTest = deserializeSequence(serializedTest, 8); // Provide numSteps for deserialization
console.log("Deserialized Test Output:", JSON.stringify(deserializedTest, null, 2));