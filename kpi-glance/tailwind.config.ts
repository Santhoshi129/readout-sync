import type { Config } from "tailwindcss";

/**
 * Tokens mirror the live Readout dashboard so the two products read as one
 * system. Surfaces, ink, amber accent and fonts are taken from Readout
 * verbatim.
 *
 * The three status hues are stepped slightly from Readout's own
 * (#7fc98a / #c9a84c / #b04a4a): as an adjacent trio those failed the
 * normal-vision separation floor — green against amber measured ΔE 11.7,
 * under the floor of 15 — and KPI cards do sit side by side. The steps below
 * clear every gate on the #141414 card surface: worst adjacent CVD ΔE 9.8,
 * worst normal-vision ΔE 16.9, all three above 3:1 contrast.
 */
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        base: {
          DEFAULT: "#000000",
          panel: "#0a0a0a",
          card: "#141414",
          raised: "#1a1a1a",
          line: "#222222",
          lineSoft: "#1a1a1a",
        },
        ink: {
          DEFAULT: "#f4f4f2",
          dim: "#a1a1a1",
          faint: "#6b6b6b",
          muted: "#3a3a3a",
        },
        amber: {
          DEFAULT: "#c9a84c",
          bright: "#e6c766",
          deep: "#8a6f2a",
        },
        signal: {
          good: "#6fd39a",
          warn: "#d9a13c",
          bad: "#c25151",
          goodDim: "#1e3b2b",
          warnDim: "#3d2f14",
          badDim: "#3a1c1c",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        body: ["var(--font-body)", "system-ui", "sans-serif"],
        mono: ['"SF Mono"', "ui-monospace", '"Roboto Mono"', "Menlo", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
