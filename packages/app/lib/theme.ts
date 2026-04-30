export const theme = {
  bg: {
    base: "#07080C",
    1: "#0A0C12",
    2: "#0E1220",
    3: "rgba(20, 24, 34, 0.5)",
    overlay: "rgba(7, 8, 12, 0.85)",
  },
  ink: {
    1: "#E8ECF1",
    2: "#8FA4C2",
    3: "#6B7B95",
    4: "#4A5876",
  },
  line: {
    faint: "rgba(120, 140, 180, 0.12)",
    default: "rgba(120, 140, 180, 0.18)",
    medium: "rgba(120, 140, 180, 0.25)",
    strong: "rgba(120, 140, 180, 0.40)",
  },
  signal: {
    live: "#5DCAA5",
    pending: "#EF9F27",
    warn: "#BA7517",
  },
  cta: {
    bg: "#E8ECF1",
    fg: "#07080C",
  },
  font: {
    mono: `ui-monospace, 'SF Mono', Menlo, Consolas, 'Liberation Mono', monospace`,
  },
  radius: {
    chip: "3px",
    default: "4px",
    card: "6px",
    modal: "8px",
    app: "12px",
  },
} as const;

export type Theme = typeof theme;
