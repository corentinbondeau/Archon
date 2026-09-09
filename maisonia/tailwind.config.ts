import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/app/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primaire: {
          DEFAULT: "#0ea5e9",
          clair: "#38bdf8",
          fonce: "#0284c7",
        },
        secondaire: {
          DEFAULT: "#8b5cf6",
          clair: "#a78bfa",
          fonce: "#7c3aed",
        },
        fond: {
          DEFAULT: "#0f172a",
          surface: "#1e293b",
          surfaceClaire: "#334155",
        },
        texte: {
          DEFAULT: "#f8fafc",
          adouci: "#cbd5e1",
          attenue: "#94a3b8",
        },
        accent: {
          DEFAULT: "#f59e0b",
          clair: "#fbbf24",
          fonce: "#d97706",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
