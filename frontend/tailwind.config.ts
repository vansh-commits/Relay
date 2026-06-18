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
        mono: ["JetBrains Mono", "monospace"],
      },
      colors: {
        surface: {
          DEFAULT: "#ffffff",
          muted: "#f8f9fa",
          subtle: "#f1f3f4",
        },
        border: {
          DEFAULT: "#e5e7eb",
          muted: "#f3f4f6",
        },
        accent: {
          DEFAULT: "#1a1a2e",
          hover: "#16213e",
        },
      },
      keyframes: {
        blink: {
          "0%, 80%, 100%": { opacity: "0" },
          "40%": { opacity: "1" },
        },
        "slide-up": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        blink: "blink 1.4s infinite ease-in-out",
        "blink-delay-200": "blink 1.4s 0.2s infinite ease-in-out",
        "blink-delay-400": "blink 1.4s 0.4s infinite ease-in-out",
        "slide-up": "slide-up 0.2s ease-out",
      },
    },
  },
  plugins: [],
};

export default config;
