import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { FormulaireCreationEvenement } from "@/components/features/FormulaireCreationEvenement";

describe("FormulaireCreationEvenement", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const renderFormulaire = (surcharges = {}) => {
    const accessoires = {
      foyerId: "foyer-1",
      onCree: vi.fn(),
      onAnnule: vi.fn(),
      onErreur: vi.fn(),
      ...surcharges,
    };
    render(<FormulaireCreationEvenement {...accessoires} />);
    return accessoires;
  };

  function remplirValide() {
    fireEvent.change(screen.getByLabelText("Titre de l'évènement"), {
      target: { value: "Sortie au parc" },
    });
    fireEvent.change(screen.getByLabelText("Date"), {
      target: { value: "2026-09-15" },
    });
  }

  it("crée un évènement et appelle onCree en cas de succès", async () => {
    const fakeFetch = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fakeFetch);
    const accessoires = renderFormulaire();

    remplirValide();
    fireEvent.click(screen.getByRole("button", { name: "Créer l'évènement" }));

    await waitFor(() => {
      expect(fakeFetch).toHaveBeenCalledWith(
        "/api/evenements",
        expect.objectContaining({
          method: "POST",
          body: expect.stringMatching(/"titre":"Sortie au parc"/),
        })
      );
    });
    await waitFor(() => {
      expect(accessoires.onCree).toHaveBeenCalled();
    });
  });

  it("signale une indisponibilité avec le bon type", async () => {
    const fakeFetch = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fakeFetch);
    const accessoires = renderFormulaire();

    fireEvent.click(
      screen.getByRole("button", { name: "Indisponibilité" })
    );

    expect(
      screen.getByLabelText("Raison de l'indisponibilité")
    ).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Raison de l'indisponibilité"), {
      target: { value: "Absence de Camille" },
    });
    fireEvent.change(screen.getByLabelText("Date"), {
      target: { value: "2026-09-16" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Signaler l'indisponibilité" })
    );

    await waitFor(() => {
      expect(fakeFetch).toHaveBeenCalledWith(
        "/api/evenements",
        expect.objectContaining({
          body: expect.stringMatching(/"type":"indisponibilite"/),
        })
      );
    });
    await waitFor(() => {
      expect(accessoires.onCree).toHaveBeenCalled();
    });
  });

  it("appelle onErreur quand la création échoue avec une réponse non-ok", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false })
    );
    const accessoires = renderFormulaire();

    remplirValide();
    fireEvent.click(screen.getByRole("button", { name: "Créer l'évènement" }));

    await waitFor(() => {
      expect(accessoires.onErreur).toHaveBeenCalledWith(
        "Impossible de créer l'évènement. Réessayez."
      );
    });
  });

  it("appelle onErreur quand le serveur est injoignable", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("réseau")));
    const accessoires = renderFormulaire();

    remplirValide();
    fireEvent.click(screen.getByRole("button", { name: "Créer l'évènement" }));

    await waitFor(() => {
      expect(accessoires.onErreur).toHaveBeenCalledWith(
        "Impossible de joindre le serveur. Réessayez."
      );
    });
  });

  it("affiche une erreur de validation quand le titre est vide", () => {
    renderFormulaire();
    fireEvent.change(screen.getByLabelText("Date"), {
      target: { value: "2026-09-15" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Créer l'évènement" }));

    expect(
      screen.getByText("Le titre de l'évènement est requis")
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Créer l'évènement" })).toBeEnabled();
  });

  it("affiche Annuler et appelle onAnnule", () => {
    const accessoires = renderFormulaire();
    fireEvent.click(screen.getByRole("button", { name: "Annuler" }));
    expect(accessoires.onAnnule).toHaveBeenCalled();
  });
});
