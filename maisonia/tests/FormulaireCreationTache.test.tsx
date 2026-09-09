import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { FormulaireCreationTache } from "@/components/features/FormulaireCreationTache";

const membres = [
  { id: "utilisateur-1", nom: "Martin", prenom: "Camille" },
  { id: "utilisateur-2", nom: "Martin", prenom: "Lucas" },
];

describe("FormulaireCreationTache", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const renderFormulaire = (surcharges = {}) => {
    const accessoires = {
      foyerId: "foyer-1",
      membres,
      onCree: vi.fn(),
      onAnnule: vi.fn(),
      onErreur: vi.fn(),
      ...surcharges,
    };
    render(<FormulaireCreationTache {...accessoires} />);
    return accessoires;
  };

  it("crée une tâche non assignée et appelle onCree", async () => {
    const fakeFetch = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fakeFetch);
    const accessoires = renderFormulaire();

    fireEvent.change(screen.getByLabelText("Titre de la tâche"), {
      target: { value: "Vider le lave-vaisselle" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Créer la tâche" }));

    await waitFor(() => {
      expect(fakeFetch).toHaveBeenCalledWith(
        "/api/taches",
        expect.objectContaining({
          method: "POST",
          body: expect.stringMatching(/"titre":"Vider le lave-vaisselle"/),
        })
      );
    });
    await waitFor(() => {
      expect(accessoires.onCree).toHaveBeenCalled();
    });
  });

  it("répartit la tâche à un membre lors de la création", async () => {
    const fakeFetch = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fakeFetch);
    const accessoires = renderFormulaire();

    fireEvent.change(screen.getByLabelText("Titre de la tâche"), {
      target: { value: "Faire les courses" },
    });
    fireEvent.change(screen.getByLabelText("Assigner à (facultatif)"), {
      target: { value: "utilisateur-2" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Créer la tâche" }));

    await waitFor(() => {
      expect(fakeFetch).toHaveBeenCalledWith(
        "/api/taches",
        expect.objectContaining({
          body: expect.stringMatching(/"assigneA":"utilisateur-2"/),
        })
      );
    });
    await waitFor(() => {
      expect(accessoires.onCree).toHaveBeenCalled();
    });
  });

  it("appelle onErreur quand la création échoue", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));
    const accessoires = renderFormulaire();

    fireEvent.change(screen.getByLabelText("Titre de la tâche"), {
      target: { value: "Vider le lave-vaisselle" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Créer la tâche" }));

    await waitFor(() => {
      expect(accessoires.onErreur).toHaveBeenCalledWith(
        "Impossible de créer la tâche. Réessayez."
      );
    });
  });

  it("appelle onErreur quand le serveur est injoignable", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("réseau")));
    const accessoires = renderFormulaire();

    fireEvent.change(screen.getByLabelText("Titre de la tâche"), {
      target: { value: "Vider le lave-vaisselle" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Créer la tâche" }));

    await waitFor(() => {
      expect(accessoires.onErreur).toHaveBeenCalledWith(
        "Impossible de joindre le serveur. Réessayez."
      );
    });
  });

  it("affiche une erreur de validation quand le titre est vide", () => {
    renderFormulaire();
    fireEvent.click(screen.getByRole("button", { name: "Créer la tâche" }));
    expect(
      screen.getByText("Le titre de la tâche est requis")
    ).toBeInTheDocument();
  });

  it("affiche Annuler et appelle onAnnule", () => {
    const accessoires = renderFormulaire();
    fireEvent.click(screen.getByRole("button", { name: "Annuler" }));
    expect(accessoires.onAnnule).toHaveBeenCalled();
  });
});
