import { clsx } from "clsx";
import { Carte } from "@/components/ui/Carte";
import { formaterDate } from "@/lib/format";
import type { StatutTache, TacheDomaine } from "@/types/domaine";

interface ProprietesCarteTache {
  tache: TacheDomaine;
  nomAssigne?: string;
  surActionStatut?: (tache: TacheDomaine) => void;
}

const LIBELLE_STATUT: Record<StatutTache, string> = {
  a_faire: "À faire",
  en_cours: "En cours",
  terminee: "Terminée",
};

export function CarteTache({
  tache,
  nomAssigne,
  surActionStatut,
}: ProprietesCarteTache): React.JSX.Element {
  const terminee = tache.statut === "terminee";

  return (
    <Carte className={clsx("transition-opacity", terminee && "opacity-60")}>
      <div className="flex items-start gap-3">
        <button
          onClick={() => surActionStatut?.(tache)}
          className={clsx(
            "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
            terminee
              ? "border-primaire bg-primaire text-fond"
              : "border-fond-surface-claire hover:border-primaire"
          )}
          aria-label={
            terminee
              ? "Remettre la tâche à faire"
              : "Marquer la tâche comme terminée"
          }
        >
          {terminee && (
            <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                clipRule="evenodd"
              />
            </svg>
          )}
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <h3
              className={clsx(
                "text-base font-semibold text-texte",
                terminee && "line-through"
              )}
            >
              {tache.titre}
            </h3>
            <span className="shrink-0 rounded-full bg-fond px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-texte-adouci">
              {LIBELLE_STATUT[tache.statut]}
            </span>
          </div>

          {tache.description && (
            <p className="mt-1 text-sm text-texte-adouci">{tache.description}</p>
          )}

          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-texte-attenue">
            {nomAssigne ? (
              <span className="inline-flex items-center gap-1.5">
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
                  />
                </svg>
                {nomAssigne}
              </span>
            ) : (
              <span className="italic text-texte-attenue">Non assignée</span>
            )}

            {tache.dateEcheance && (
              <span>Échéance le {formaterDate(tache.dateEcheance)}</span>
            )}
          </div>
        </div>
      </div>
    </Carte>
  );
}
