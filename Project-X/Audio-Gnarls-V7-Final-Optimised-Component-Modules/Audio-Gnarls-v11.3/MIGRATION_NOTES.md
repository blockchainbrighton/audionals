# Migration Notes - Audio-Gnarls v11.3.0

## Overview
Version 11.3.0 introduces centralized step count management while maintaining full backward compatibility. No breaking changes have been introduced.

## What's Changed

### For End Users
- **New Feature**: Step count dropdown in the controls panel
- **Enhanced Functionality**: Sequencer now supports 8, 16, 32, and 64 steps dynamically
- **Improved Experience**: Step count changes preserve existing sequence data when expanding

### For Developers

#### Component API Changes

##### osc-app Component
**New Properties:**
- `steps` (number): Get/set the current step count (8, 16, 32, or 64)

**New Attributes:**
- `steps`: Can be set via HTML attribute `<osc-app steps="16">`

**New Methods:**
- `_syncChildSteps()`: Internal method for propagating step changes to child components

**New Events:**
- Listens for `steps-requested` events from child components
- Dispatches `steps-changed` events when step count changes

##### osc-controls Component
**Updated Methods:**
- `updateState(options)`: Now accepts `steps` parameter to reflect current step count

**New Events:**
- Emits `steps-requested` event when user changes step count via dropdown

##### seq-app Component
**Enhanced Methods:**
- `setSteps(newSteps)`: Improved with data preservation and safe truncation
- `updateState(newState)`: Enhanced to use robust `setSteps()` method

**New Attributes:**
- `steps`: Supports external step count changes via attribute

**New Lifecycle:**
- `attributeChangedCallback()`: Responds to `steps` attribute changes

##### osc-signature-sequencer Component
**Updated Methods:**
- `generateAudioSignature(seed, algorithm, steps)`: Now accepts optional `steps` parameter
- `_generateSignatureWithConstraints(seed, options)`: Uses current app steps as default

**New Methods:**
- `setSteps(newSteps)`: Handles step count changes by stopping active signatures

## Migration Path

### Existing Projects
No migration required. Existing projects will:
- Continue to work with default 8-step configuration
- Maintain all existing functionality
- Benefit from improved step count management automatically

### New Projects
To leverage the new step count features:

```html
<!-- Set initial step count via attribute -->
<osc-app steps="16">
  <!-- Your content -->
</osc-app>
```

```javascript
// Programmatically change step count
const oscApp = document.querySelector('osc-app');
oscApp.steps = 32;

// Or via attribute
oscApp.setAttribute('steps', '64');
```

### Custom Integrations
If you have custom code that interacts with the sequencer:

**Before (v11.2):**
```javascript
// Step count was fixed or managed per component
sequencer.updateState({ steps: 16 }); // Might lose data
```

**After (v11.3):**
```javascript
// Use centralized step management
oscApp.steps = 16; // Preserves data, syncs all components
```

## Event Handling

### New Event Contract
```javascript
// Listen for step count requests (from controls)
oscApp.addEventListener('steps-requested', (e) => {
  console.log('Requested steps:', e.detail.steps);
});

// Listen for step count changes (from app)
document.addEventListener('steps-changed', (e) => {
  console.log('Steps changed to:', e.detail.steps);
});
```

## Data Preservation Behavior

### Expanding Step Count (e.g., 8 → 16)
- Existing sequence data is preserved
- New steps are initialized with default values (null for notes, 1 for velocities)
- Playback continues normally

### Shrinking Step Count (e.g., 32 → 16)
- Data is safely truncated to new size
- Playback indices are clamped to valid range
- Active playback is stopped to prevent errors

## Testing Your Migration

1. **Verify Default Behavior**: Ensure existing functionality works without changes
2. **Test Step Count Changes**: Use the new dropdown to change step counts
3. **Check Data Preservation**: Add sequence data, expand steps, verify data is preserved
4. **Test Shrinking**: Create longer sequences, shrink step count, verify safe truncation
5. **Validate Audio Signatures**: Generate audio signatures with different step counts

## Rollback Plan

If issues arise, you can:
1. Revert to v11.2.0 files
2. Remove the step count dropdown from controls
3. All existing functionality will work as before

## Support

For questions or issues related to this migration:
- Check the TEST_REPORT.md for validation results
- Review DIFF_SUMMARY.md for detailed code changes
- Refer to BUILD_AND_RUN.md for setup instructions

