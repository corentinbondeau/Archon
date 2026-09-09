import type { Config } from "tailwindcss";
import { demoAppDesignTokensPreset } from "@demo-app/design-tokens";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  presets: [demoAppDesignTokensPreset],
  plugins: [],
};

export default config;