import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Etat } from "@/components/ui/Etat";

describe("Etat — état chargement", () => {
  it("affiche le message de chargement par défaut", () => {
    render(<Etat type="chargement" />);
    expect(screen.getByText("Chargement en cours…")).toBeInTheDocument();
  });

  it("affiche un message personnalisé", () => {
    render(<Etat type="chargement" message="Chargement des tâches du foyer…" />);
    expect(screen.getByText("Chargement des tâches du foyer…")).toBeInTheDocument();
  });
});

describe("Etat — état vide", () => {
  it("affiche le titre et la description", () => {
    render(
      <Etat
        type="vide"
        titre="Aucune tâche"
        description="Créez votre première tâche."
      />
    );
    expect(screen.getByText("Aucune tâche")).toBeInTheDocument();
    expect(screen.getByText("Créez votre première tâche.")).toBeInTheDocument();
  });

  it("rend l'action optionnelle", () => {
    render(
      <Etat
        type="vide"
        titre="Vide"
        description="Description"
        action={<button>Créer</button>}
      />
    );
    expect(screen.getByRole("button", { name: "Créer" })).toBeInTheDocument();
  });
});

describe("Etat — état erreur", () => {
  it("affiche le message d'erreur", () => {
    render(
      <Etat type="erreur" message="Impossible de charger les tâches" />
    );
    expect(screen.getByText("Impossible de charger les tâches")).toBeInTheDocument();
  });

  it("affiche le titre standard d'erreur", () => {
    render(<Etat type="erreur" message="Erreur réseau" />);
    expect(screen.getByText("Une erreur est survenue")).toBeInTheDocument();
  });

  it("rend l'action de réessai", () => {
    render(
      <Etat type="erreur" message="Erreur" action={<button>Réessayer</button>} />
    );
    expect(screen.getByRole("button", { name: "Réessayer" })).toBeInTheDocument();
  });
});
