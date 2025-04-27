import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#111827", // Dark Gray/Near Black
        textPrimary: "#F9FAFB", // Light Gray/White
        textSecondary: "#9CA3AF", // Medium Gray
        accent: "#A3E635", // Greenish-Yellow/Lime
        accentHover: "#84CC16", // Darker Lime for hover
        cardBackground: "#1F2937", // Slightly lighter dark gray for cards
        borderColor: "#374151", // Border color
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic":
          "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
      },
    },
  },
  plugins: [],
};
export default config;

