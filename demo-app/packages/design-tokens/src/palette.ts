export type DemoAppColorToken =
  | "primary"
  | "secondary"
  | "background"
  | "foreground"
  | "accent";

export const demoAppColors = {
  primary: "#0ea5e9",
  secondary: "#8b5cf6",
  background: "#0f172a",
  foreground: "#f8fafc",
  accent: "#f59e0b",
} as const satisfies Record<DemoAppColorToken, string>;