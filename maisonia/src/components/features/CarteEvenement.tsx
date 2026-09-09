import { Carte } from "@/components/ui/Carte";
import { detailDate, formaterHeure } from "@/lib/format";
import type { EvenementDomaine } from "@/types/domaine";

interface ProprietesCarteEvenement {
  evenement: EvenementDomaine;
  nomCreateur?: string;
}

function LibelleTypeEvenement({ type }: { type: "evenement" | "indisponibilite" }): React.JSX.Element {
  if (type === "indisponibilite") {
    return (
      <span className="inline-flex items-center rounded-full bg-accent/15 px-2 py-0.5 text-xs font-medium text-accent">
        Indisponibilité
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-primaire/15 px-2 py-0.5 text-xs font-medium text-primaire">
      Évènement
    </span>
  );
}

export function CarteEvenement({
  evenement,
  nomCreateur,
}: ProprietesCarteEvenement): React.JSX.Element {
  const detail = detailDate(evenement.dateDebut);
  const heure = formaterHeure(evenement.dateDebut);

  return (
    <Carte>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="mb-1">
            <LibelleTypeEvenement type={evenement.type} />
          </div>
          <h3 className="text-base font-semibold text-texte">{evenement.titre}</h3>
        </div>
        <div className="flex min-w-[44px] flex-col items-center rounded-lg bg-fond px-2 py-1">
          <span className="text-xl font-bold leading-none text-primaire">
            {detail.jourDeLaSemaine}
          </span>
          <span className="text-[10px] uppercase tracking-wide text-texte-attenue">
            {detail.mois.slice(0, 3)}
          </span>
        </div>
      </div>

      <div className="mt-3 space-y-1 text-sm text-texte-adouci">
        <p className="capitalize">
          {detail.jour} {detail.jourDeLaSemaine} {detail.mois} {detail.annee} · {heure}
        </p>
        {evenement.lieu && (
          <p className="flex items-center gap-1.5">
            <svg className="h-4 w-4 text-texte-attenue" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M9.69 18.933l.003.001C9.89 19.02 10 19 10 19s.11.02.308-.066l.002-.001.006-.003.018-.008a5.741 5.741 0 00.281-.14c.186-.096.446-.24.757-.433.62-.384 1.445-.966 2.274-1.765C15.302 14.988 17 12.493 17 9A7 7 0 103 9c0 3.492 1.698 5.988 3.355 7.584a13.731 13.731 0 002.273 1.765 11.842 11.842 0 00.976.544l.062.029.018.008.006.003zM13 9a3 3 0 11-6 0 3 3 0 016 0z"
                clipRule="evenodd"
              />
            </svg>
            {evenement.lieu}
          </p>
        )}
      </div>

      {nomCreateur && (
        <p className="mt-3 border-t border-fond-surface-claire pt-2 text-xs text-texte-attenue">
          Créé par {nomCreateur}
        </p>
      )}
    </Carte>
  );
}
