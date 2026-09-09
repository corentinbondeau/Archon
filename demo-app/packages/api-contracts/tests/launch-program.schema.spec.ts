import { describe, expect, it } from "vitest";
import { createLaunchProgramInputSchema } from "../src/launch-program";

describe("createLaunchProgramInputSchema", () => {
  it("accepte un programme de lancement manuel minimum", () => {
    const input = createLaunchProgramInputSchema.parse({
      title: "Lancement de démonstration",
    });

    expect(input).toEqual({
      title: "Lancement de démonstration",
      triggerKind: "MANUAL",
      isEnabled: false,
    });
  });

  it("exige le titre du programme de lancement", () => {
    const result = createLaunchProgramInputSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("exige l'expression de planification d'un lancement programmé", () => {
    const result = createLaunchProgramInputSchema.safeParse({
      title: "Sauvegarde quotidienne",
      triggerKind: "SCHEDULED",
    });
    expect(result.success).toBe(false);
  });
});