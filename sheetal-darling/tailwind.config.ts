import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#08060f",
        plum: "#120a22",
        orchid: "#a855f7",
        blush: "#ec4899",
        sky2: "#38bdf8",
      },
      fontFamily: {
        sans: [
          "Outfit",
          "Noto Sans Devanagari",
          "Segoe UI",
          "system-ui",
          "-apple-system",
          "sans-serif",
        ],
      },
      boxShadow: {
        glow: "0 0 40px -8px rgba(168, 85, 247, 0.55)",
        "glow-pink": "0 0 40px -10px rgba(236, 72, 153, 0.55)",
      },
    },
  },
  plugins: [],
};

export default config;
