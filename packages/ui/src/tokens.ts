export const sonataTokens = {
  colors: {
    surface: "#f7f8fc",
    surfaceLow: "#f1f3f9",
    surfaceMid: "#ffffff",
    surfaceHigh: "#ffffff",
    surfaceTop: "#ffffff",
    primary: "#5b4ee8",
    primaryStrong: "#4134c6",
    secondary: "#46516a",
    tertiary: "#0b7f8c",
    outlineGhost: "rgba(73, 82, 112, 0.16)",
    text: "#151a2d",
    textMuted: "#536078",
    textSoft: "#778198",
  },
  typography: {
    headline: "Inter",
    body: "Inter",
  },
  motion: {
    durationMs: 240,
    easing: "ease-in-out",
  },
  radii: {
    panel: "22px",
    chip: "999px",
  },
} as const;

export const sonataCopy = {
  productTitle: "ScoreTransposer",
  currentScope: "MusicXML-first sheet music workspace",
} as const;

export type SonataTone = "primary" | "cyan" | "green" | "amber" | "red" | "neutral";
