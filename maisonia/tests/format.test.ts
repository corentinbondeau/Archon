// @vitest-environment node
import { describe, it, expect } from "vitest";
import {
  formaterDate,
  formaterHeure,
  detailDate,
  extraireJourMois,
  initialesDe,
} from "@/lib/format";

describe("formaterDate", () => {
  it("formate une date ISO en français long", () => {
    expect(formaterDate("2026-09-15T09:00:00.000Z")).toContain("2026");
  });

  it("retourne le jour et l'année dans l'ordre français", () => {
    const resultat = formaterDate("2026-03-05T10:00:00.000Z");
    expect(resultat).toMatch(/^(0?5|05)/);
  });
});

describe("formaterHeure", () => {
  it("formate une heure au format HH:MM", () => {
    const resultat = formaterHeure("2026-09-15T09:00:00.000Z");
    expect(resultat).toMatch(/^\d{2}:\d{2}$/);
  });
});

describe("detailDate", () => {
  it("décompose la date en jour, mois, annee et jourDeLaSemaine", () => {
    const detail = detailDate("2026-09-15T09:00:00.000Z");
    expect(detail.annee).toBe("2026");
    expect(detail.jourDeLaSemaine).not.toBe("NaN");
    expect(detail.jour).toBeTruthy();
    expect(detail.mois).toBeTruthy();
  });

  it("renvoie un mois non vide", () => {
    expect(detailDate("2026-09-15T09:00:00.000Z").mois.length).toBeGreaterThan(0);
  });
});

describe("extraireJourMois", () => {
  it("extrait le jour et le mois d'une date ISO", () => {
    const { jour, mois } = extraireJourMois("2026-09-15T09:00:00.000Z");
    expect(jour).toBe(15);
    expect(mois).toBe(8);
  });

  it("utilise le mois indexé à zero pour septembre", () => {
    expect(extraireJourMois("2026-09-01T09:00:00.000Z").mois).toBe(8);
  });
});

describe("initialesDe", () => {
  it("retourne les initiales en majuscules", () => {
    expect(initialesDe("Camille", "Martin")).toBe("CM");
  });

  it("gère les espaces dans le prenom", () => {
    expect(initialesDe("  Camille ", "Martin")).toBe("CM");
  });
});
