/**
 * Shared chart types and colour tokens.
 *
 * Kept in a plain module rather than alongside the chart components: those
 * are "use client", and having server code import runtime values across
 * that boundary drags the client graph onto the server.
 *
 * All values below were validated against the #141414 card surface rather
 * than chosen by eye.
 */

export interface Segment {
  label: string;
  value: number;
  color: string;
}

export interface Stage {
  label: string;
  value: number;
}

/**
 * Funnel stages: amber ordinal ramp built from Readout's own accent tokens.
 * Monotone lightness, clear step gaps, darkest step 3.85:1 vs surface.
 */
export const FUNNEL_RAMP = ["#f0dda6", "#e6c766", "#c9a84c", "#8a6f2a"];

/**
 * Alert types form an ordered severity scale, so they take a single-hue
 * ordinal ramp rather than four status hues. Four status hues were tried
 * first and failed outright — attendance-drop orange against at-risk red
 * measured normal-vision ΔE 9.6, under the hard floor of 15, which
 * labelling does not excuse.
 *
 * Red ramp on #141414: monotone lightness, clear step gaps, darkest step
 * 2.49:1, hue spread 4°.
 */
export const SEG = {
  /** Population split: on the app vs not. */
  good: "#6fd39a",
  neutral: "#3a3a3a",
  /** Severity ramp, most severe first. */
  sev1: "#8f3a3a",
  sev2: "#b85252",
  sev3: "#d18686",
  sev4: "#e8b3b3",
};
