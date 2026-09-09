import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { GrilleMois } from "@/components/ui/GrilleMois";

function joursRelatifsAuMois(annee: number, mois: number, jour: number): Date {
  return new Date(annee, mois, jour);
}

describe("GrilleMois", () => {
  it("affiche le mois et l'année courant", () => {
    const annee = 2026;
    const mois = 8;
    render(<GrilleMois annee={annee} mois={mois} />);
    let label = screen.getByRole("heading", { level: 3 }).textContent ?? "";
    const dateAttendue = joursRelatifsAuMois(annee, mois, 1)
      .toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
    const attente = new Date(annee, mois, 1)
      .toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
    label = label.toLowerCase();
    expect(label).toContain(attente.toLowerCase());
    expect(dateAttendue).toBeTruthy();
  });

  it("compte le bon nombre de jours pour septembre 2026 (30 jours)", () => {
    render(<GrilleMois annee={2026} mois={8} />);
    const boutonsJours = screen
      .getAllByRole("button")
      .filter((bouton) => /^\d+$/.test(bouton.textContent ?? ""));
    expect(boutonsJours).toHaveLength(30);
  });

  it("signale les jours avec évènement par un style distinct", () => {
    render(<GrilleMois annee={2026} mois={8} joursAvecEvenement={[3, 15]} />);
    const boutonJour3 = screen
      .getAllByRole("button")
      .find((bouton) => bouton.textContent === "3");
    const boutonJour15 = screen
      .getAllByRole("button")
      .find((bouton) => bouton.textContent === "15");
    expect(boutonJour3).toHaveClass("bg-accent/20");
    expect(boutonJour15).toHaveClass("bg-accent/20");
  });

  it("appelle onSelectionJour quand un jour est cliqué", () => {
    let jourChoisi: number | null = null;
    render(
      <GrilleMois
        annee={2026}
        mois={8}
        onSelectionJour={(jour) => {
          jourChoisi = jour;
        }}
      />
    );
    const jour = screen
      .getAllByRole("button")
      .find((bouton) => bouton.textContent === "12");
    expect(jour).toBeTruthy();
    if (jour) {
      fireEvent.click(jour);
    }
    expect(jourChoisi).toBe(12);
  });

  it("passe au mois précédent", () => {
    let resultat: { mois: number; annee: number } | null = null;
    render(
      <GrilleMois
        annee={2026}
        mois={0}
        onChangementMois={(mois, annee) => {
          resultat = { mois, annee };
        }}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: "Mois précédent" }));
    expect(resultat).toEqual({ mois: 11, annee: 2025 });
  });

  it("passe au mois suivant quand on est en decembre", () => {
    let resultat: { mois: number; annee: number } | null = null;
    render(
      <GrilleMois
        annee={2026}
        mois={11}
        onChangementMois={(mois, annee) => {
          resultat = { mois, annee };
        }}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: "Mois suivant" }));
    expect(resultat).toEqual({ mois: 0, annee: 2027 });
  });
});
