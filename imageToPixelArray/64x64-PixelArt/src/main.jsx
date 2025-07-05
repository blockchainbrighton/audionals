import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './App.css'; // Main application styles

// The components directory structure is assumed based on App.jsx imports
// For simplicity, I'm assuming a 'components' subdir within 'src'
// I'll adjust the paths in the existing files to match this standard structure.

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);