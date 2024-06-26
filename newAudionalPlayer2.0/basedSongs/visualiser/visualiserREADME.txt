README: Audio Visualizer Component
This document provides an overview of the various scripts and functions involved in the visualizer component of the audio visual player. This visualizer is responsible for rendering dynamic visuals based on audio playback, using a combination of canvas drawing and worker threads for performance optimization. Below, each script and its key functions are described.

File Overview
initVisualiser.js: Initialization logic for the visualizer.
visualiserHelperFunctions.js: Utility functions to support visualizer operations.
visualiserMessageHandling.js: Handles incoming messages related to audio playback and visual updates.
visualiserDrawingColours.js: Manages the drawing and color application on the canvas.
visualiserLogging.js: Handles logging and testing of access levels and trippy mode.
visualiserGeometry.js: Defines geometric shapes and their transformations.
visualiserWorkers.js: Manages worker threads for complex calculations.
Detailed Explanation
1. initVisualiser.js
This script initializes various parameters and states used throughout the visualizer.

Variables:

shouldActivateTrippy: Flag to toggle trippy mode.
clearCanvas: Controls whether the canvas should be cleared before drawing.
isChannel11Active, activeChannelIndex, isPlaybackActive, renderingState, activeArrayIndex: Track the state of the visualizer.
arrayLengths: Stores lengths of color arrays for different access levels.
accessLevelMappings: Maps access levels to allowable arrays for drawing.
Functions:

initializeArrayLengths(): Initializes the lengths of various color arrays by calling specific functions for each array.
randomWithSeed(seed): Generates a random value based on a seed.
calculateCCI2(channelIndex, arrayLength): Calculates a CCI2 value for visual updates.
generateAccessLevel(seed): Generates an access level based on a skewed distribution.
shouldActivateTrippyArtwork(seed): Determines if trippy mode should be activated based on a random chance.
2. visualiserHelperFunctions.js
Contains helper functions that support the visualizer's functionality.

Functions:
selectArrayIndex(seed, accessLevel, channelIndex): Selects an array index based on the seed, access level, and channel index.
handlePlaybackStateChange(): Updates the canvas clearing state and handles trippy mode activation/deactivation.
activateTrippyModeOnFirstStep(event): Activates trippy mode on the first active step of playback.
deactivateTrippyModeOnStop(event): Deactivates trippy mode when playback stops.
updateVisualizer(cci2, arrayIndex, channelIndex): Triggers an immediate visual update.
shouldUpdateVisualizer(channelIndex, arrayIndex, cci2): Determines if the visualizer needs an update.
3. visualiserMessageHandling.js
Handles messages related to audio playback and updates the visualizer accordingly.

Functions:
handleStopAction(): Resets playback state and triggers an immediate visual update.
handleActiveStepAction(channelIndex): Processes active step actions, updating the visualizer based on the current channel and CCI2.
Event Listeners: Listens for internalAudioPlayback events to handle stop and active step actions.
4. visualiserDrawingColours.js
Manages drawing on the canvas, applying colors, and handling animations.

Variables:

cv, cx: Canvas and context for drawing.
draw(time): Main draw function that clears the canvas if needed and applies colors to the shapes.
Functions:

cp.drawObjectD2(object, time): Draws a 2D object with specified vertices and colors.
getColorArray(angle, time, vertices, accessLevel): Returns a color array based on the current access level and geometry.
5. visualiserLogging.js
Handles logging and testing of the visualizer’s functionality, particularly around access levels and trippy mode.

Functions:
logTestValuesAndDistribution(): Logs test values and distributions for access levels.
logInitialAssignments(): Logs initial assignments of arrays and CCI2 values based on seed.
logAccessLevelValues(accessLevelValues), logAccessLevelDistribution(accessLevelCounts, seedCount, trippyCount): Utility functions for logging access levels.
6. visualiserGeometry.js
Defines geometric classes for shapes used in the visualizer.

Classes:
Cy: Represents a cylindrical shape with vertices and faces.
Sp: Represents a spherical shape with vertices and faces.
Cp: Combines multiple geometric shapes into a composite.
7. visualiserWorkers.js
Manages worker threads that handle complex calculations for the visualizer to keep the main thread responsive.

Workers:

rainbowWorker: Handles color calculations for dynamic RGB settings.
visualizerWorker: Manages color settings and dynamic RGB.
rotationWorker: Handles rotation of vertices for animations.
Functions:

sendRainbowRequest(id, vertices, angle, palette), sendRotationRequest(id, vertices, pivot, angle): Sends requests to respective workers for processing.
Worker Scripts: Embedded scripts for worker functionality, including color settings and rotation calculations.
Conclusion
This visualizer component integrates multiple scripts to manage dynamic visual effects synchronized with audio playback. It leverages canvas rendering, state management, and worker threads to ensure smooth and responsive visuals. Each script plays a specific role, from initializing and updating the visualizer state to performing complex geometric and color calculations in the background.

By following the structure and function descriptions provided in this document, you should be able to understand and modify the visualizer component effectively. For more detailed information on individual functions and classes, please refer to the respective source files.