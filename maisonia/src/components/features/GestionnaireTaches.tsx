"use client";

import { useEffect, useCallback, useState } from "react";
import { Etat } from "@/components/ui/Etat";
import { Bouton } from "@/components/ui/Bouton";
import { ListeTaches } from "@/components/features/ListeTaches";
import { ActionsTache } from "@/components/features/ActionsTache";
import { PanneauCreation } from "@/components/features/PanneauCreation";
import { FormulaireCreationTache } from "@/components/features/FormulaireCreationTache";
import type { TacheDomaine } from "@/types/domaine";

interface MembreDuFoyer {
  id: string;
  nom: string;
  prenom: string;
}

interface ProprietesGestionnaireTaches {
  foyerId: string;
  utilisateurId: string;
  membres: MembreDuFoyer[];
}

export function GestionnaireTaches({
  foyerId,
  utilisateurId,
  membres,
}: ProprietesGestionnaireTaches): React.JSX.Element {
  const [taches, setTaches] = useState<TacheDomaine[] | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [creationOuverte, setCreationOuverte] = useState(false);

  const charger = useCallback(async () => {
    setErreur(null);
    try {
      const reponse = await fetch(
        `/api/taches?foyerId=${encodeURIComponent(foyerId)}`,
        { cache: "no-store" }
      );
      if (!reponse.ok) throw new Error("Chargement des tâches impossible");
      const corps = (await reponse.json()) as { taches: TacheDomaine[] };
      setTaches(corps.taches);
    } catch (cause) {
      setErreur(
        cause instanceof Error ? cause.message : "Impossible de charger les tâches"
      );
    }
  }, [foyerId]);

  useEffect(() => {
    void charger();
  }, [charger]);

  const nomsParUtilisateur = Object.fromEntries(
    membres.map((membre) => [membre.id, `${membre.prenom} ${membre.nom}`])
  );

  const remplacerTache = (miseAJour: TacheDomaine) => {
    setTaches((tachesActuelles) =>
      tachesActuelles
        ? tachesActuelles.map((tache) =>
            tache.id === miseAJour.id ? miseAJour : tache
          )
        : tachesActuelles
    );
  };

  const retirerErreur = () => setErreur(null);

  if (erreur && taches === null) {
    return (
      <Etat
        type="erreur"
        message={erreur}
        action={<Bouton variante="contour" onClick={() => void charger()}>Réessayer</Bouton>}
      />
    );
  }

  if (taches === null) {
    return <Etat type="chargement" message="Chargement des tâches du foyer…" />;
  }

  return (
    <div className="space-y-3">
      <Bouton
        variante="accent"
        className="w-full"
        onClick={() => {
          retirerErreur();
          setCreationOuverte(true);
        }}
      >
        Créer une tâche ménagère
      </Bouton>

      {erreur && (
        <div
          className="rounded-xl border border-accent/30 bg-accent/10 px-4 py-3 text-sm text-accent"
          role="alert"
        >
          {erreur}
          <button
            onClick={retirerErreur}
            className="ml-2 underline"
          >
            Fermer
          </button>
        </div>
      )}

      <ListeTaches
        taches={taches}
        nomsParUtilisateur={nomsParUtilisateur}
        descriptionVide="Créez la première tâche pour commencer à partager les tâches ménagères de votre foyer."
      />

      {taches.length > 0 && (
        <section className="surface-carte">
          <h3 className="mb-2 px-1 text-sm font-semibold text-texte">
            Répartir ou prendre une tâche
          </h3>
          <ul className="space-y-1">
            {taches.map((tache) => (
              <li key={tache.id} className="rounded-lg p-1 hover:bg-fond-surface">
                <ActionsTache
                  tache={tache}
                  utilisateurId={utilisateurId}
                  membres={membres}
                  onMiseAJour={remplacerTache}
                  onErreur={(message) => setErreur(message)}
                />
              </li>
            ))}
          </ul>
        </section>
      )}

      <PanneauCreation
        titre="Nouvelle tâche"
        sousTitre="Ajoutez une tâche à accomplir et répartissez-la entre les membres du foyer."
        ouvert={creationOuverte}
        onFermer={() => setCreationOuverte(false)}
        boutonOuverture={<span />}
      >
        <FormulaireCreationTache
          foyerId={foyerId}
          membres={membres}
          onCree={() => {
            setCreationOuverte(false);
            void charger();
          }}
          onAnnule={() => setCreationOuverte(false)}
          onErreur={(message) => setErreur(message)}
        />
      </PanneauCreation>
    </div>
  );
}
