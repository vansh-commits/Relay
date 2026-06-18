import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./hooks/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      colors: {
        bg: {
          base:    "#1a1a1a",
          surface: "#212121",
          elevated:"#2a2a2a",
          hover:   "#303030",
        },
        border: {
          DEFAULT: "#333333",
          subtle:  "#2a2a2a",
        },
        text: {
          primary:   "#ececec",
          secondary: "#a0a0a0",
          muted:     "#666666",
        },
        accent: {
          DEFAULT: "#c96442",
          hover:   "#b8563a",
          subtle:  "#c9644215",
        },
        success: "#4caf7d",
        warning: "#d4a843",
        danger:  "#e05252",
      },
      keyframes: {
        blink: {
          "0%, 80%, 100%": { opacity: "0.2" },
          "40%":            { opacity: "1" },
        },
        "fade-up": {
          from: { opacity: "0", transform: "translateY(6px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
        "pulse-dot": {
          "0%, 100%": { opacity: "1" },
          "50%":      { opacity: "0.4" },
        },
      },
      animation: {
        blink:              "blink 1.4s infinite ease-in-out",
        "blink-200":        "blink 1.4s 0.2s infinite ease-in-out",
        "blink-400":        "blink 1.4s 0.4s infinite ease-in-out",
        "fade-up":          "fade-up 0.18s ease-out",
        "pulse-dot":        "pulse-dot 2s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
