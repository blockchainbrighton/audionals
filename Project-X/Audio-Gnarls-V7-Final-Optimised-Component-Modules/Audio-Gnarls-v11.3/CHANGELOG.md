# Changelog

## [11.3.0] - 2025-09-02

### Added
- **Centralized Step Count Management**: osc-app now owns and manages the step count property as the single source of truth
- **Step Count Dropdown**: Added step count selector in controls with options for 8, 16, 32, and 64 steps
- **Dynamic Step Count Support**: All components now support dynamic step count changes without data loss
- **Event-Driven Architecture**: Implemented `steps-requested` and `steps-changed` events for proper communication between components
- **Robust Data Preservation**: Expanding step counts preserves existing data, shrinking safely truncates with index clamping

### Changed
- **osc-app Component**: 
  - Added `steps` property with validation against [8, 16, 32, 64]
  - Added `steps` attribute support for external configuration
  - Implemented `_syncChildSteps()` method for broadcasting changes
  - Added event listeners for `steps-requested` events
- **osc-controls Component**:
  - Added steps dropdown with 8/16/32/64 options
  - Updated `updateState()` method to accept `steps` parameter
  - Added event emission for `steps-requested` when user changes selection
- **seq-app Component**:
  - Enhanced `setSteps()` method with robust data preservation logic
  - Added `observedAttributes` for `steps` attribute
  - Added `attributeChangedCallback` for external step count changes
  - Improved sequence/velocity array resizing with safe truncation
- **osc-signature-sequencer Component**:
  - Updated `generateAudioSignature()` to accept configurable step count
  - Modified all 10 algorithm cases to use dynamic step count instead of hardcoded 32
  - Updated `_generateSignatureWithConstraints()` to use current app steps
  - Added `setSteps()` method for proper cleanup during step count changes

### Fixed
- **Playback Bug**: Fixed critical bug where sequencer playback was limited to first 8 steps regardless of selected step count
- **Data Loss Prevention**: Step count changes now preserve existing sequence data when expanding
- **Index Clamping**: Playback and record indices are properly clamped when shrinking step count
- **Transport Safety**: Playback is safely stopped when shrinking step count during active playback
- **Signature Generation**: Audio signatures now respect the current step count instead of always using 32 steps

### Technical Details
- **Event Contract**: Standardized event names (`steps-requested`, `steps-changed`)
- **Validation**: Step count validation ensures only [8, 16, 32, 64] are accepted
- **Backward Compatibility**: All existing APIs remain functional
- **Single Source of Truth**: osc-app is now the authoritative source for step count across all components

### Breaking Changes
- None - all changes are backward compatible

### Migration Notes
- Existing projects will continue to work with default 8-step configuration
- To use different step counts, set the `steps` attribute on `<osc-app>` or use the new dropdown control
- Audio signatures will now generate with the current step count instead of always 32 steps

