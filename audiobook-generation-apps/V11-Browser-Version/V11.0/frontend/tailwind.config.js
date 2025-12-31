/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'primary-blue': '#3B82F6',
        'success-green': '#10B981',
        'warning-orange': '#F59E0B',
        'danger-red': '#EF4444',
        'bg-dark': '#0F172A',
        'bg-card': '#1E293B',
        'bg-input': '#334155',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['Fira Code', 'monospace'],
      },
    },
  },
  plugins: [],
}
