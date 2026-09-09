import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEventFactory from "@testing-library/user-event";
import { ActionsTache } from "@/components/features/ActionsTache";
import type { TacheDomaine } from "@/types/domaine";

function tache(partielle?: Partial<TacheDomaine>): TacheDomaine {
  return {
    id: "tache-1",
    foyerId: "foyer-1",
    titre: "Vider le lave-vaisselle",
    description: null,
    assigneA: null,
    statut: "a_faire",
    dateEcheance: null,
    ...partielle,
  };
}

const membres = [
  { id: "utilisateur-1", nom: "Martin", prenom: "Camille" },
  { id: "utilisateur-2", nom: "Martin", prenom: "Lucas" },
];

describe("ActionsTache", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("affiche le bouton Prendre la tâche quand elle n'est pas assignée", () => {
    render(
      <ActionsTache
        tache={tache()}
        utilisateurId="utilisateur-1"
        membres={membres}
        onMiseAJour={() => {}}
        onErreur={() => {}}
      />
    );
    expect(
      screen.getByRole("button", { name: "Prendre la tâche" })
    ).toBeInTheDocument();
  });

  it("n'affiche pas Prendre la tâche quand elle est déjà assignée à soi", () => {
    render(
      <ActionsTache
        tache={tache({ assigneA: "utilisateur-1" })}
        utilisateurId="utilisateur-1"
        membres={membres}
        onMiseAJour={() => {}}
        onErreur={() => {}}
      />
    );
    expect(
      screen.queryByRole("button", { name: "Prendre la tâche" })
    ).not.toBeInTheDocument();
  });

  it("affiche Démarrer pour une tâche à faire et Marquer terminée pour une tâche en cours", () => {
    const { unmount } = render(
      <ActionsTache
        tache={tache({ statut: "a_faire" })}
        utilisateurId="utilisateur-1"
        membres={membres}
        onMiseAJour={() => {}}
        onErreur={() => {}}
      />
    );
    expect(screen.getByRole("button", { name: "Démarrer" })).toBeInTheDocument();
    unmount();

    render(
      <ActionsTache
        tache={tache({ statut: "en_cours", assigneA: "utilisateur-1" })}
        utilisateurId="utilisateur-1"
        membres={membres}
        onMiseAJour={() => {}}
        onErreur={() => {}}
      />
    );
    expect(
      screen.getByRole("button", { name: "Marquer terminée" })
    ).toBeInTheDocument();
  });

  it("prend la tâche (PATCH avec assigneA=mon id) au clic sur Prendre la tâche", async () => {
    const fakeFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        tache: tache({ assigneA: "utilisateur-1", statut: "a_faire" }),
      }),
    });
    vi.stubGlobal("fetch", fakeFetch);
    const utilisateur = userEventFactory.setup();
    const onMiseAJour = vi.fn();

    render(
      <ActionsTache
        tache={tache()}
        utilisateurId="utilisateur-1"
        membres={membres}
        onMiseAJour={onMiseAJour}
        onErreur={() => {}}
      />
    );

    await utilisateur.click(
      screen.getByRole("button", { name: "Prendre la tâche" })
    );

    await waitFor(() => {
      expect(fakeFetch).toHaveBeenCalledWith(
        "/api/taches/tache-1",
        expect.objectContaining({
          method: "PATCH",
          body: JSON.stringify({ assigneA: "utilisateur-1" }),
        })
      );
    });
    await waitFor(() => {
      expect(onMiseAJour).toHaveBeenCalled();
    });
  });

  it("répartit la tâche à un autre membre via le panneau de répartition", async () => {
    const fakeFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        tache: tache({ assigneA: "utilisateur-2" }),
      }),
    });
    vi.stubGlobal("fetch", fakeFetch);
    const utilisateur = userEventFactory.setup();
    const onMiseAJour = vi.fn();

    render(
      <ActionsTache
        tache={tache()}
        utilisateurId="utilisateur-1"
        membres={membres}
        onMiseAJour={onMiseAJour}
        onErreur={() => {}}
      />
    );

    await utilisateur.click(screen.getByRole("button", { name: "Répartir" }));

    const boutonAssigner = await screen.findByRole("button", {
      name: /Lucas Martin/,
    });
    await utilisateur.click(boutonAssigner);

    await waitFor(() => {
      expect(fakeFetch).toHaveBeenCalledWith(
        "/api/taches/tache-1",
        expect.objectContaining({
          method: "PATCH",
          body: JSON.stringify({ assigneA: "utilisateur-2" }),
        })
      );
    });
    await waitFor(() => {
      expect(onMiseAJour).toHaveBeenCalled();
    });
  });

  it("appelle onErreur quand la requête échoue", async () => {
    const fakeFetch = vi.fn().mockResolvedValue({ ok: false });
    vi.stubGlobal("fetch", fakeFetch);
    const utilisateur = userEventFactory.setup();
    const onErreur = vi.fn();

    render(
      <ActionsTache
        tache={tache()}
        utilisateurId="utilisateur-1"
        membres={membres}
        onMiseAJour={() => {}}
        onErreur={onErreur}
      />
    );

    await utilisateur.click(
      screen.getByRole("button", { name: "Prendre la tâche" })
    );

    await waitFor(() => {
      expect(onErreur).toHaveBeenCalledWith(
        "Impossible de mettre à jour cette tâche. Réessayez."
      );
    });
  });
});
