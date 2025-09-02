# Build and Run Guide - Audio-Gnarls v11.3.0

## Overview

Audio-Gnarls is a zero-build web application that runs directly in modern browsers using ES6 modules. No compilation, bundling, or build process is required.

## Prerequisites

### Browser Requirements
- **Modern Browser** with support for:
  - ES6+ JavaScript (ES2015+)
  - Web Components (Custom Elements)
  - Shadow DOM
  - ES Modules
  - Web Audio API

### Supported Browsers
- **Chrome**: 63+ (recommended)
- **Firefox**: 63+
- **Safari**: 13+
- **Edge**: 79+

### Server Requirements
- **HTTP Server**: Any static file server
- **CORS Support**: Must serve files via HTTP/HTTPS (not file://)
- **MIME Types**: Must serve .js files with correct MIME type

## Quick Start

### Option 1: Python HTTP Server (Recommended)
```bash
# Navigate to project directory
cd Audio-Gnarls-v11.3

# Start Python HTTP server
python3 -m http.server 8080

# Open browser and navigate to:
# http://localhost:8080
```

### Option 2: Node.js HTTP Server
```bash
# Install http-server globally (if not already installed)
npm install -g http-server

# Navigate to project directory
cd Audio-Gnarls-v11.3

# Start server
http-server -p 8080

# Open browser and navigate to:
# http://localhost:8080
```

### Option 3: PHP Built-in Server
```bash
# Navigate to project directory
cd Audio-Gnarls-v11.3

# Start PHP server
php -S localhost:8080

# Open browser and navigate to:
# http://localhost:8080
```

### Option 4: Live Server (VS Code Extension)
1. Install "Live Server" extension in VS Code
2. Open project folder in VS Code
3. Right-click on `index.html`
4. Select "Open with Live Server"

## Project Structure

```
Audio-Gnarls-v11.3/
├── index.html              # Main application entry point
├── osc-app/
│   ├── osc-app.js          # Main application component
│   ├── osc-audio.js        # Audio engine
│   └── osc-signature-sequencer.js  # Signature sequencer
├── osc-controls.js         # Control panel component
├── seq-app.js              # Step sequencer component
├── scope-canvas.js         # Oscilloscope canvas
├── tone-loader.js          # Tone.js integration
├── styles.css              # Application styles
└── docs/                   # Documentation files
    ├── CHANGELOG.md
    ├── MIGRATION_NOTES.md
    ├── DEPENDENCY_UPDATES.md
    ├── TEST_REPORT.md
    └── DIFF_SUMMARY.md
```

## Development Setup

### 1. Clone or Extract Project
```bash
# If from zip file
unzip Audio-Gnarls-v11.3.zip
cd Audio-Gnarls-v11.3

# If from git repository
git clone <repository-url>
cd Audio-Gnarls
```

### 2. Start Development Server
Choose any HTTP server option from the Quick Start section above.

### 3. Open in Browser
Navigate to `http://localhost:8080` (or your chosen port)

### 4. Verify Installation
- Application should load without errors
- Browser console should be clean (no JavaScript errors)
- Step count dropdown should be visible in controls
- All UI elements should render correctly

## Configuration

### Step Count Configuration
The application supports 4 step count options: 8, 16, 32, and 64.

#### Via HTML Attribute
```html
<osc-app steps="16">
  <!-- Application content -->
</osc-app>
```

#### Via JavaScript
```javascript
// Get application instance
const oscApp = document.querySelector('osc-app');

// Set step count
oscApp.steps = 32;

// Or via attribute
oscApp.setAttribute('steps', '64');
```

#### Via User Interface
Use the step count dropdown in the control panel to change step count dynamically.

## Troubleshooting

### Common Issues

#### 1. CORS Errors
**Problem**: `Access to script at 'file://...' has been blocked by CORS policy`

**Solution**: 
- Use an HTTP server instead of opening files directly
- Never open `index.html` directly in browser (file:// protocol)
- Use one of the server options listed above

#### 2. Module Loading Errors
**Problem**: `Failed to load module script`

**Solution**:
- Ensure server serves .js files with correct MIME type
- Check that all file paths are correct
- Verify server supports ES modules

#### 3. Blank Page
**Problem**: Page loads but shows blank screen

**Solutions**:
- Check browser console for JavaScript errors
- Verify browser supports Web Components
- Ensure all module files are accessible
- Try a different browser

#### 4. Audio Not Working
**Problem**: No audio output or audio context errors

**Solutions**:
- Ensure HTTPS in production (required for Web Audio API)
- Click "POWER ON" button to initialize audio context
- Check browser audio permissions
- Verify browser supports Web Audio API

### Debug Mode

#### Enable Console Logging
Open browser developer tools (F12) and check console for:
- Module loading messages
- Component initialization logs
- Event propagation information
- Error messages

#### Verify Component Loading
```javascript
// Check if components are loaded
console.log('osc-app:', document.querySelector('osc-app'));
console.log('osc-controls:', document.querySelector('osc-controls'));
console.log('seq-app:', document.querySelector('seq-app'));
```

#### Test Step Count Changes
```javascript
// Test step count functionality
const oscApp = document.querySelector('osc-app');
console.log('Current steps:', oscApp.steps);
oscApp.steps = 16;
console.log('New steps:', oscApp.steps);
```

## Performance Optimization

### For Development
- Use local HTTP server for fastest loading
- Enable browser caching for repeated loads
- Use browser dev tools for performance monitoring

### For Production
- Serve files via HTTPS
- Enable gzip compression on server
- Set appropriate cache headers
- Consider CDN for static assets

## Testing

### Manual Testing Checklist
1. ✅ Application loads without errors
2. ✅ Step count dropdown appears and functions
3. ✅ Sequencer opens and shows correct step count
4. ✅ Step count changes update UI correctly
5. ✅ Audio controls work (after user interaction)
6. ✅ Visual feedback changes with step count
7. ✅ No console errors during operation

### Automated Testing
Currently, the project relies on manual testing. For automated testing:
- Consider adding a testing framework like Jest or Mocha
- Implement end-to-end testing with Playwright or Cypress
- Add unit tests for component methods

## Deployment

### Static Hosting
The application can be deployed to any static hosting service:
- **GitHub Pages**: Push to repository and enable Pages
- **Netlify**: Drag and drop project folder
- **Vercel**: Connect repository or upload files
- **AWS S3**: Upload files and configure static hosting
- **Apache/Nginx**: Copy files to web root directory

### Server Configuration
Ensure your server:
- Serves .js files with `application/javascript` MIME type
- Enables HTTPS (required for Web Audio API in production)
- Sets appropriate CORS headers if needed
- Configures proper cache headers for performance

### Environment Variables
No environment variables or configuration files required.

## Support

### Getting Help
1. Check browser console for error messages
2. Review TEST_REPORT.md for known issues
3. Consult MIGRATION_NOTES.md for API changes
4. Check DEPENDENCY_UPDATES.md for compatibility info

### Reporting Issues
When reporting issues, include:
- Browser version and operating system
- Console error messages
- Steps to reproduce the problem
- Expected vs actual behavior

### Contributing
1. Fork the repository
2. Make changes in a feature branch
3. Test thoroughly using this guide
4. Submit pull request with detailed description

## Version Information

- **Version**: 11.3.0
- **Release Date**: September 2, 2025
- **Node.js**: Not required (browser-only application)
- **Build Tools**: None required
- **Dependencies**: Zero external dependencies (uses browser APIs only)

