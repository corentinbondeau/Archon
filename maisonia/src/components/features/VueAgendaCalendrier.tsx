"use client";

import { useMemo, useState } from "react";
import { GrilleMois } from "@/components/ui/GrilleMois";
import { CarteEvenement } from "@/components/features/CarteEvenement";
import { Etat } from "@/components/ui/Etat";
import { extraireJourMois } from "@/lib/format";
import type { EvenementDomaine } from "@/types/domaine";

interface ProprietesVueAgendaCalendrier {
  evenements: EvenementDomaine[];
  nomsParCreateur?: Record<string, string>;
}

export function VueAgendaCalendrier({
  evenements,
  nomsParCreateur,
}: ProprietesVueAgendaCalendrier): React.JSX.Element {
  const maintenant = new Date();
  const [annee, setAnnee] = useState(maintenant.getFullYear());
  const [mois, setMois] = useState(maintenant.getMonth());
  const [jourSelectionne, setJourSelectionne] = useState<number | null>(
    maintenant.getDate()
  );

  const changerMois = (nouveauMois: number, nouvelleAnnee: number) => {
    setMois(nouveauMois);
    setAnnee(nouvelleAnnee);
    setJourSelectionne(null);
  };

  const joursAvecEvenement = useMemo(() => {
    const jours = new Set<number>();
    for (const evenement of evenements) {
      const { jour, mois: moisEvenement } = extraireJourMois(
        evenement.dateDebut
      );
      if (moisEvenement === mois) {
        jours.add(jour);
      }
    }
    return Array.from(jours).sort((a, b) => a - b);
  }, [evenements, mois]);

  const evenementsDuJour = useMemo(() => {
    if (jourSelectionne === null) return [];
    return evenements.filter((evenement) => {
      const { jour, mois: moisEvenement } = extraireJourMois(
        evenement.dateDebut
      );
      return jour === jourSelectionne && moisEvenement === mois;
    });
  }, [evenements, jourSelectionne, mois]);

  const jourSelectionneLabel = useMemo(() => {
    if (jourSelectionne === null) return "";
    const date = new Date(annee, mois, jourSelectionne);
    return date.toLocaleDateString("fr-FR", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
  }, [annee, mois, jourSelectionne]);

  return (
    <div className="space-y-5">
      <section className="surface-carte">
        <GrilleMois
          annee={annee}
          mois={mois}
          joursAvecEvenement={joursAvecEvenement}
          jourSelectionne={jourSelectionne}
          onSelectionJour={setJourSelectionne}
          onChangementMois={changerMois}
        />
      </section>

      <section>
        <h3 className="mb-3 text-base font-semibold capitalize text-texte">
          {jourSelectionneLabel}
        </h3>

        {evenementsDuJour.length === 0 ? (
          <Etat
            type="vide"
            titre="Aucun évènement ce jour"
            description="Ce jour-là, le foyer n'a ni évènement ni indisponibilité planifiée."
          />
        ) : (
          <ul className="space-y-3">
            {evenementsDuJour.map((evenement) => (
              <li key={evenement.id}>
                <CarteEvenement
                  evenement={evenement}
                  nomCreateur={
                    nomsParCreateur?.[evenement.createurId] ?? undefined
                  }
                />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
