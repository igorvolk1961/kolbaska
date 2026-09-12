/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        meat: {
          50: "#fdf3f2",
          100: "#fbe3e0",
          200: "#f6c9c3",
          300: "#eda49a",
          400: "#e07466",
          500: "#cf4f3f",
          600: "#b53a2c",
          700: "#972d24",
          800: "#7c2822",
          900: "#5f211d",
          950: "#3b0d0c",
        },
        gold: {
          300: "#f2d27a",
          400: "#eabf4b",
          500: "#d9a52c",
          600: "#b9831f",
        },
        cream: "#fbf6ee",
        ink: "#221310",
      },
      fontFamily: {
        display: ['"Playfair Display"', "Georgia", "serif"],
        body: ['"Inter"', "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 18px 40px -24px rgba(59, 13, 12, 0.55)",
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.4s ease-out both",
      },
    },
  },
  plugins: [],
};
