/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        n0va: {
          50: "#f0f5ff",
          100: "#e0ebff",
          200: "#b8d4ff",
          300: "#85b8ff",
          400: "#4a94ff",
          500: "#1a6dff",
          600: "#0052e6",
          700: "#003db3",
          800: "#002980",
          900: "#001a4d",
          950: "#000d26",
        },
      },
      fontFamily: {
        sans: ['"Inter"', "system-ui", "-apple-system", "sans-serif"],
        mono: ['"JetBrains Mono"', "monospace"],
      },
    },
  },
  plugins: [],
};
