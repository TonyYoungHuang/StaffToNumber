export const sonataTokens = {
  colors: {
    surface: "#131313",
    surfaceLow: "#1c1b1b",
    surfaceMid: "#201f1f",
    surfaceHigh: "#2a2a2a",
    surfaceTop: "#353534",
    primary: "#cdbdff",
    primaryStrong: "#360094",
    secondary: "#bbc8d0",
    tertiary: "#00daf3",
    outlineGhost: "rgba(69, 70, 82, 0.15)",
    text: "#e5e2e1",
    textMuted: "#c6c5d4",
    textSoft: "#908f9d",
  },
  typography: {
    headline: "Newsreader",
    body: "Manrope",
  },
  motion: {
    durationMs: 240,
    easing: "ease-in-out",
  },
  radii: {
    panel: "28px",
    chip: "999px",
  },
} as const;

export const sonataCopy = {
  productTitle: "ScoreTransposer",
  currentScope: "Five-line staff PDF to Jianpu",
} as const;

export type SonataTone = "primary" | "cyan" | "green" | "amber" | "red" | "neutral";
