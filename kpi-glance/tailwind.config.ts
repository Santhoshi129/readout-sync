import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        base: {
          DEFAULT: "#0A0D13",
          panel: "#12161F",
          raised: "#181D29",
          line: "#242B3A",
        },
        ink: {
          DEFAULT: "#E7E9EE",
          dim: "#8B93A7",
          faint: "#5A6274",
        },
        signal: {
          good: "#3DDC97",
          goodDim: "#1F5E44",
          warn: "#F5B94D",
          warnDim: "#6B4E1D",
          bad: "#F2545B",
          badDim: "#6B2529",
        },
      },
      fontFamily: {
        display: ["var(--font-display)"],
        body: ["var(--font-body)"],
        mono: ["var(--font-mono)"],
      },
    },
  },
  plugins: [],
};

export default config;
