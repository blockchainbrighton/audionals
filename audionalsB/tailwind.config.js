/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'bitcoin-orange': '#F7931A',
        'deep-blue': '#1A3D7C',
        'vibrant-teal': '#00B4D8',
      },
      fontFamily: {
        sans: ['Inter', 'Roboto', 'sans-serif'],
        mono: ['Consolas', 'Monaco', 'monospace'],
      },
    },
  },
  plugins: [],
}
