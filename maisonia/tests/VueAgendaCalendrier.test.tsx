import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { VueAgendaCalendrier } from "@/components/features/VueAgendaCalendrier";
import type { EvenementDomaine } from "@/types/domaine";

function dateISOduJour(heures = 9): string {
  const maintenant = new Date();
  const date = new Date(
    maintenant.getFullYear(),
    maintenant.getMonth(),
    maintenant.getDate(),
    heures,
    0,
    0
  );
  return date.toISOString();
}

function evenement(partielle?: Partial<EvenementDomaine>): EvenementDomaine {
  return {
    id: "evenement-1",
    foyerId: "foyer-1",
    createurId: "utilisateur-1",
    type: "evenement",
    titre: "Sortie au parc",
    description: null,
    dateDebut: "2026-09-15T09:00:00.000Z",
    dateFin: null,
    lieu: "Parc municipal",
    ...partielle,
  };
}

describe("VueAgendaCalendrier", () => {
  it("affiche l'état vide quand aucun évènement le jour sélectionné", () => {
    render(
      <VueAgendaCalendrier
        evenements={[
          evenement({
            id: "autre",
            titre: "Évènement ailleurs",
            dateDebut: "2030-01-01T09:00:00.000Z",
          }),
        ]}
      />
    );
    expect(
      screen.getByText("Aucun évènement ce jour")
    ).toBeInTheDocument();
  });

  it("affiche l'évènement du jour sélectionné (par défaut aujourd'hui)", () => {
    render(
      <VueAgendaCalendrier
        evenements={[
          evenement({
            id: "e1",
            titre: "Sortie au parc",
            dateDebut: dateISOduJour(),
          }),
        ]}
      />
    );
    expect(screen.getAllByText("Sortie au parc").length).toBeGreaterThan(0);
  });

  it("distingue une indisponibilité par son libellé", () => {
    render(
      <VueAgendaCalendrier
        evenements={[
          evenement({
            id: "e1",
            type: "indisponibilite",
            titre: "Absence de Camille",
            dateDebut: dateISOduJour(),
          }),
        ]}
      />
    );
    expect(screen.getAllByText("Absence de Camille").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Indisponibilité").length).toBeGreaterThan(0);
  });

  it("affiche le nom du créateur quand fourni", () => {
    render(
      <VueAgendaCalendrier
        evenements={[
          evenement({
            id: "e1",
            createurId: "utilisateur-1",
            titre: "Repas de famille",
            dateDebut: dateISOduJour(),
          }),
        ]}
        nomsParCreateur={{ "utilisateur-1": "Camille Martin" }}
      />
    );
    expect(
      screen.getAllByText(/Créé par Camille Martin/).length
    ).toBeGreaterThan(0);
  });
});
