import type { Config } from "tailwindcss";
import { demoAppColors } from "./palette";

export { demoAppColors };
export type { DemoAppColorToken } from "./palette";

export const demoAppDesignTokensPreset = {
  theme: {
    extend: {
      colors: {
        primary: demoAppColors.primary,
        secondary: demoAppColors.secondary,
        background: demoAppColors.background,
        foreground: demoAppColors.foreground,
        accent: demoAppColors.accent,
      },
    },
  },
} satisfies Partial<Config>;