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
        'electric-purple': '#9013FE',
        'dark-charcoal': '#1E1E1E',
        'light-gray': '#E0E0E0',
      },
      fontFamily: {
        'heading': ['Montserrat', 'sans-serif'],
        'body': ['Open Sans', 'sans-serif'],
        'code': ['Roboto Mono', 'monospace'],
      },
      boxShadow: {
        'card': '0 10px 30px rgba(0, 0, 0, 0.2)',
      },
      backgroundImage: {
        'blockchain-gradient': 'linear-gradient(to right, #1E1E1E, #1A3D7C)',
      },
    },
  },
  plugins: [],
}
