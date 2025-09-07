/**
 * Shared CSS utilities and common styles
 * 
 * Provides:
 * - Common CSS variables
 * - Reusable style mixins
 * - Component style utilities
 * - Responsive design helpers
 */

// === CSS Variables ===
export const cssVariables = `
  :root {
    /* Colors */
    --bg-primary: #000;
    --bg-secondary: #23252b;
    --bg-tertiary: #232325;
    --bg-overlay: rgba(0,0,0,0.55);
    --bg-control: rgba(255,255,255,0.07);
    --bg-button: #242;
    --bg-button-hover: #454;
    --bg-button-active: #323;
    
    --text-primary: #fff;
    --text-secondary: #eee;
    --text-muted: #aaa;
    --text-accent: #ffe0a3;
    --text-accent-alt: #cfe3ff;
    --text-success: #9df5c2;
    
    --border-primary: #555;
    --border-secondary: #4e5668;
    --border-accent: #7af6ff;
    --border-success: #46ad6d;
    
    --accent-primary: #7af6ff;
    --accent-secondary: #46ad6d;
    --accent-warning: #f7c469;
    --accent-danger: #ff2a39;
    
    /* Spacing */
    --spacing-xs: 0.25rem;
    --spacing-sm: 0.5rem;
    --spacing-md: 1rem;
    --spacing-lg: 1.5rem;
    --spacing-xl: 2rem;
    
    /* Border radius */
    --radius-sm: 4px;
    --radius-md: 6px;
    --radius-lg: 8px;
    --radius-xl: 12px;
    
    /* Shadows */
    --shadow-sm: 0 1px 3px rgba(0,0,0,0.12);
    --shadow-md: 0 4px 6px rgba(0,0,0,0.16);
    --shadow-lg: 0 10px 15px rgba(0,0,0,0.19);
    --shadow-glow: 0 0 12px;
    
    /* Transitions */
    --transition-fast: 0.15s ease;
    --transition-normal: 0.25s ease;
    --transition-slow: 0.35s ease;
    
    /* Typography */
    --font-family: 'Courier New', monospace;
    --font-size-xs: 0.75rem;
    --font-size-sm: 0.875rem;
    --font-size-md: 1rem;
    --font-size-lg: 1.125rem;
    --font-size-xl: 1.25rem;
    
    /* Z-index layers */
    --z-base: 1;
    --z-overlay: 10;
    --z-modal: 20;
    --z-tooltip: 30;
  }
`;

// === Common Style Mixins ===

export const buttonStyles = `
  padding: 0.53em 1.17em;
  border-radius: var(--radius-md);
  border: 1px solid var(--border-primary);
  background: var(--bg-button);
  color: var(--text-primary);
  font-size: 1rem;
  cursor: pointer;
  font-family: inherit;
  font-weight: 500;
  transition: background var(--transition-fast), 
              color var(--transition-fast), 
              box-shadow var(--transition-fast), 
              transform 0.06s ease;
  box-shadow: 0 0 0 transparent;
  will-change: transform;
`;

export const buttonHoverStyles = `
  background: var(--bg-button-hover);
`;

export const buttonActiveStyles = `
  transform: translateY(1px);
`;

export const buttonFocusStyles = `
  outline: 2px solid var(--accent-primary);
  outline-offset: 1px;
`;

export const buttonDisabledStyles = `
  opacity: 0.5;
  pointer-events: none;
`;

export const toggleButtonStyles = `
  position: relative;
  background: var(--bg-secondary);
  border-color: var(--border-secondary);
  color: var(--text-accent-alt);
  box-shadow: inset 0 -1px 0 rgba(0,0,0,0.25), 0 0 0 transparent;
`;

export const toggleButtonActiveStyles = `
  background: #1f3a26;
  color: var(--text-success);
  border-color: var(--border-success);
  box-shadow: var(--shadow-glow) rgba(70, 173, 109, 0.33), 
              inset 0 0 0 1px rgba(70, 173, 109, 0.2);
  text-shadow: 0 1px 2px rgba(11, 26, 16, 0.67);
`;

export const inputStyles = `
  font-family: inherit;
  font-size: 0.98rem;
  color: var(--text-accent);
  background: #1c1d22;
  border: 1px solid #3c3f48;
  border-radius: var(--radius-md);
  padding: 0.38rem 0.55rem;
  transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
`;

export const inputFocusStyles = `
  border-color: var(--accent-primary);
  box-shadow: 0 0 0 2px rgba(122, 246, 255, 0.2);
  outline: none;
`;

export const cardStyles = `
  background: var(--bg-control);
  border: 1px solid var(--border-secondary);
  border-radius: var(--radius-lg);
  padding: var(--spacing-md);
  box-shadow: var(--shadow-sm);
`;

// === Responsive Utilities ===

export const responsiveBreakpoints = {
  mobile: '(max-width: 430px)',
  tablet: '(max-width: 768px)',
  desktop: '(min-width: 769px)'
};

export const mobileStyles = `
  @media ${responsiveBreakpoints.mobile} {
    /* Mobile-specific adjustments */
    .controls { gap: 0.5rem; padding: 0.55rem 0.8rem; }
    .button { padding: 0.42em 0.8em; font-size: 0.93rem; }
    .input { font-size: 0.9rem; }
  }
`;

export const tabletStyles = `
  @media ${responsiveBreakpoints.tablet} {
    /* Tablet-specific adjustments */
    .controls { gap: 0.75rem; }
    .button { padding: 0.48em 1em; font-size: 0.95rem; }
  }
`;

// === Utility Classes ===

export const utilityStyles = `
  /* Layout utilities */
  .flex { display: flex; }
  .flex-col { flex-direction: column; }
  .flex-wrap { flex-wrap: wrap; }
  .items-center { align-items: center; }
  .justify-center { justify-content: center; }
  .justify-between { justify-content: space-between; }
  .gap-sm { gap: var(--spacing-sm); }
  .gap-md { gap: var(--spacing-md); }
  .gap-lg { gap: var(--spacing-lg); }
  
  /* Spacing utilities */
  .p-sm { padding: var(--spacing-sm); }
  .p-md { padding: var(--spacing-md); }
  .p-lg { padding: var(--spacing-lg); }
  .m-sm { margin: var(--spacing-sm); }
  .m-md { margin: var(--spacing-md); }
  .m-lg { margin: var(--spacing-lg); }
  
  /* Text utilities */
  .text-center { text-align: center; }
  .text-left { text-align: left; }
  .text-right { text-align: right; }
  .text-sm { font-size: var(--font-size-sm); }
  .text-md { font-size: var(--font-size-md); }
  .text-lg { font-size: var(--font-size-lg); }
  .text-muted { color: var(--text-muted); }
  .text-accent { color: var(--text-accent); }
  
  /* Border utilities */
  .border { border: 1px solid var(--border-primary); }
  .border-accent { border-color: var(--accent-primary); }
  .rounded { border-radius: var(--radius-md); }
  .rounded-lg { border-radius: var(--radius-lg); }
  
  /* Background utilities */
  .bg-primary { background: var(--bg-primary); }
  .bg-secondary { background: var(--bg-secondary); }
  .bg-control { background: var(--bg-control); }
  
  /* Visibility utilities */
  .hidden { display: none; }
  .visible { display: block; }
  .opacity-50 { opacity: 0.5; }
  .opacity-75 { opacity: 0.75; }
  
  /* Animation utilities */
  .transition { transition: all var(--transition-normal); }
  .transition-fast { transition: all var(--transition-fast); }
  .transition-slow { transition: all var(--transition-slow); }
`;

// === Component Style Generators ===

export function createComponentStyles(componentName, customStyles = '') {
  return `
    ${cssVariables}
    
    :host {
      display: block;
      font-family: var(--font-family);
      color: var(--text-primary);
    }
    
    ${utilityStyles}
    ${mobileStyles}
    ${tabletStyles}
    
    /* Component-specific styles */
    ${customStyles}
  `;
}

export function createButtonStyle(variant = 'default') {
  const variants = {
    default: `
      ${buttonStyles}
      &:hover { ${buttonHoverStyles} }
      &:active { ${buttonActiveStyles} }
      &:focus { ${buttonFocusStyles} }
      &:disabled { ${buttonDisabledStyles} }
    `,
    toggle: `
      ${buttonStyles}
      ${toggleButtonStyles}
      &:hover { ${buttonHoverStyles} }
      &:active { ${buttonActiveStyles} }
      &:focus { ${buttonFocusStyles} }
      &:disabled { ${buttonDisabledStyles} }
      &[aria-pressed="true"] { ${toggleButtonActiveStyles} }
    `,
    primary: `
      ${buttonStyles}
      background: var(--accent-primary);
      color: var(--bg-primary);
      border-color: var(--accent-primary);
      &:hover { 
        background: #5ac7d4;
        border-color: #5ac7d4;
      }
    `,
    danger: `
      ${buttonStyles}
      background: var(--accent-danger);
      color: var(--text-primary);
      border-color: #ff4e6a;
      box-shadow: var(--shadow-glow) rgba(255, 42, 57, 0.6);
      &:hover {
        background: #ff4757;
        box-shadow: var(--shadow-glow) rgba(255, 42, 57, 0.8);
      }
    `
  };
  
  return variants[variant] || variants.default;
}

export function createInputStyle() {
  return `
    ${inputStyles}
    &:focus { ${inputFocusStyles} }
  `;
}

// === Animation Utilities ===

export const animations = `
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  
  @keyframes slideIn {
    from { transform: translateY(-10px); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
  }
  
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }
  
  @keyframes glow {
    0%, 100% { box-shadow: 0 0 5px currentColor; }
    50% { box-shadow: 0 0 20px currentColor; }
  }
  
  .animate-fade-in { animation: fadeIn 0.3s ease-out; }
  .animate-slide-in { animation: slideIn 0.3s ease-out; }
  .animate-pulse { animation: pulse 2s infinite; }
  .animate-glow { animation: glow 2s infinite; }
`;

// === Export Combined Styles ===

export const globalStyles = `
  ${cssVariables}
  ${utilityStyles}
  ${mobileStyles}
  ${tabletStyles}
  ${animations}
`;

export default {
  cssVariables,
  buttonStyles,
  inputStyles,
  cardStyles,
  utilityStyles,
  mobileStyles,
  tabletStyles,
  animations,
  globalStyles,
  createComponentStyles,
  createButtonStyle,
  createInputStyle,
  responsiveBreakpoints
};

