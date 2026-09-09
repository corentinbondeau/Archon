"use client";

import { useMemo } from "react";
import { clsx } from "clsx";

interface ProprietesGrilleMois {
  annee: number;
  mois: number;
  joursAvecEvenement?: number[];
  jourSelectionne?: number | null;
  onSelectionJour?: (jour: number) => void;
  onChangementMois?: (mois: number, annee: number) => void;
}

const JOURS_SEMAINE = ["Lu", "Ma", "Me", "Je", "Ve", "Sa", "Di"];

function joursDansLeMois(annee: number, mois: number): number {
  return new Date(annee, mois + 1, 0).getDate();
}

function premierJourDuMois(annee: number, mois: number): number {
  const jour = new Date(annee, mois, 1).getDay();
  return jour === 0 ? 6 : jour - 1;
}

export function GrilleMois({
  annee,
  mois,
  joursAvecEvenement = [],
  jourSelectionne = null,
  onSelectionJour,
  onChangementMois,
}: ProprietesGrilleMois): React.JSX.Element {
  const jours = useMemo(() => {
    const total = joursDansLeMois(annee, mois);
    const decalage = premierJourDuMois(annee, mois);
    const tableau: (number | null)[] = [];

    for (let i = 0; i < decalage; i++) {
      tableau.push(null);
    }
    for (let j = 1; j <= total; j++) {
      tableau.push(j);
    }
    return tableau;
  }, [annee, mois]);

  const moisLabel = new Date(annee, mois).toLocaleDateString(
    "fr-FR",
    { month: "long", year: "numeric" }
  );

  const passerMoisPrecedent = () => {
    if (mois === 0) {
      onChangementMois?.(11, annee - 1);
    } else {
      onChangementMois?.(mois - 1, annee);
    }
  };

  const passerMoisSuivant = () => {
    if (mois === 11) {
      onChangementMois?.(0, annee + 1);
    } else {
      onChangementMois?.(mois + 1, annee);
    }
  };

  return (
    <div className="w-full">
      <div className="mb-4 flex items-center justify-between">
        <button
          onClick={passerMoisPrecedent}
          className="rounded-lg p-2 text-texte-adouci transition-colors hover:bg-fond-surface hover:text-texte"
          aria-label="Mois précédent"
        >
          <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z"
              clipRule="evenodd"
            />
          </svg>
        </button>
        <h3 className="text-base font-semibold capitalize text-texte">
          {moisLabel}
        </h3>
        <button
          onClick={passerMoisSuivant}
          className="rounded-lg p-2 text-texte-adouci transition-colors hover:bg-fond-surface hover:text-texte"
          aria-label="Mois suivant"
        >
          <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {JOURS_SEMAINE.map((jour) => (
          <div
            key={jour}
            className="py-1 text-center text-xs font-medium text-texte-attenue"
          >
            {jour}
          </div>
        ))}

        {jours.map((jour, index) => (
          <div key={index} className="aspect-square">
            {jour !== null && (
              <button
                onClick={() => onSelectionJour?.(jour)}
                className={clsx(
                  "flex h-full w-full items-center justify-center rounded-lg text-sm transition-colors",
                  jour === jourSelectionne
                    ? "bg-primaire font-bold text-fond"
                    : joursAvecEvenement.includes(jour)
                      ? "bg-accent/20 font-medium text-accent hover:bg-accent/30"
                      : "text-texte hover:bg-fond-surface-claire"
                )}
              >
                {jour}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
