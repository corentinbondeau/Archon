import { Etat } from "@/components/ui/Etat";
import { CarteTache } from "@/components/features/CarteTache";
import type { TacheDomaine } from "@/types/domaine";

interface ProprietesListeTaches {
  taches: TacheDomaine[];
  nomsParUtilisateur?: Record<string, string>;
  surActionStatut?: (tache: TacheDomaine) => void;
  nomVide?: string;
  descriptionVide?: string;
  actionVide?: React.ReactNode;
}

const TACHES_ORDRE: Record<TacheDomaine["statut"], number> = {
  a_faire: 0,
  en_cours: 1,
  terminee: 2,
};

export function ListeTaches({
  taches,
  nomsParUtilisateur,
  surActionStatut,
  nomVide = "Aucune tâche pour le moment",
  descriptionVide = "Créez la première tâche pour commencer à partager les tâches ménagères de votre foyer.",
  actionVide,
}: ProprietesListeTaches): React.JSX.Element {
  const tachesTriees = [...taches].sort(
    (a, b) => TACHES_ORDRE[a.statut] - TACHES_ORDRE[b.statut]
  );

  if (taches.length === 0) {
    return (
      <Etat
        type="vide"
        titre={nomVide}
        description={descriptionVide}
        action={actionVide}
      />
    );
  }

  return (
    <ul className="space-y-3">
      {tachesTriees.map((tache) => (
        <li key={tache.id}>
          <CarteTache
            tache={tache}
            nomAssigne={
              tache.assigneA && nomsParUtilisateur
                ? nomsParUtilisateur[tache.assigneA]
                : undefined
            }
            surActionStatut={surActionStatut}
          />
        </li>
      ))}
    </ul>
  );
}
