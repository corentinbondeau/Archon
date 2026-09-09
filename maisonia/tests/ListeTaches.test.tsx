import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { ListeTaches } from "@/components/features/ListeTaches";
import { CarteTache } from "@/components/features/CarteTache";
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

describe("ListeTaches", () => {
  it("affiche l'état vide par défaut quand il n'y a aucune tâche", () => {
    render(<ListeTaches taches={[]} />);
    expect(screen.getByText("Aucune tâche pour le moment")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Créez la première tâche pour commencer à partager les tâches ménagères de votre foyer."
      )
    ).toBeInTheDocument();
  });

  it("affiche un état vide personnalisé", () => {
    render(
      <ListeTaches
        taches={[]}
        nomVide="Rien à faire"
        descriptionVide="Profitez de la journée."
      />
    );
    expect(screen.getByText("Rien à faire")).toBeInTheDocument();
    expect(screen.getByText("Profitez de la journée.")).toBeInTheDocument();
  });

  it("trie les tâches par ordre de statut (à faire puis en cours puis terminée)", () => {
    const taches: TacheDomaine[] = [
      tache({ id: "t3", titre: "Sortir les poubelles", statut: "terminee" }),
      tache({
        id: "t2",
        titre: "Faire les courses",
        statut: "en_cours",
        assigneA: "utilisateur-1",
      }),
      tache({ id: "t1", titre: "Passer l'aspirateur", statut: "a_faire" }),
    ];

    render(<ListeTaches taches={taches} />);

    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(3);
    expect(within(items[0]).getByText("Passer l'aspirateur")).toBeInTheDocument();
    expect(within(items[1]).getByText("Faire les courses")).toBeInTheDocument();
    expect(within(items[2]).getByText("Sortir les poubelles")).toBeInTheDocument();
  });

  it("affiche le nom du membre assigné", () => {
    render(
      <ListeTaches
        taches={[
          tache({ id: "t1", assigneA: "utilisateur-1", statut: "en_cours" }),
        ]}
        nomsParUtilisateur={{ "utilisateur-1": "Camille Martin" }}
      />
    );
    expect(screen.getByText("Camille Martin")).toBeInTheDocument();
  });

  it("affiche Non assignée pour une tâche sans affectation", () => {
    render(<ListeTaches taches={[tache({ id: "t1" })]} />);
    expect(screen.getByText("Non assignée")).toBeInTheDocument();
  });
});

describe("CarteTache", () => {
  it("affiche le libellé du statut", () => {
    render(<CarteTache tache={tache({ statut: "en_cours" })} />);
    expect(screen.getByText("En cours")).toBeInTheDocument();
  });

  it("affiche une tâche terminée barrée et son libellé", () => {
    render(<CarteTache tache={tache({ statut: "terminee" })} />);
    expect(screen.getByText("Terminée")).toBeInTheDocument();
    const titre = screen.getByText("Vider le lave-vaisselle");
    expect(titre).toHaveClass("line-through");
  });

  it("appelle surActionStatut au clic sur la case", () => {
    let appele = false;
    render(
      <CarteTache
        tache={tache({ id: "t1" })}
        surActionStatut={() => {
          appele = true;
        }}
      />
    );
    const caseCocher = screen.getByRole("button", {
      name: "Marquer la tâche comme terminée",
    });
    caseCocher.click();
    expect(appele).toBe(true);
  });
});
