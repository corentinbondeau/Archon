"use client";

import { useState } from "react";
import type { TacheDomaine, StatutTache } from "@/types/domaine";
import { Bouton } from "@/components/ui/Bouton";

interface MembreSelectionnable {
  id: string;
  nom: string;
  prenom: string;
}

interface ProprietesActionsTache {
  tache: TacheDomaine;
  utilisateurId: string;
  membres: MembreSelectionnable[];
  onMiseAJour: (tache: TacheDomaine) => void;
  onErreur: (message: string) => void;
}

const PROCHAIN_STATUT: Record<StatutTache, StatutTache> = {
  a_faire: "en_cours",
  en_cours: "terminee",
  terminee: "a_faire",
};

export function ActionsTache({
  tache,
  utilisateurId,
  membres,
  onMiseAJour,
  onErreur,
}: ProprietesActionsTache): React.JSX.Element {
  const [envoiEnCours, setEnvoiEnCours] = useState(false);
  const [repartitionOuverte, setRepartitionOuverte] = useState(false);

  const mettreAJour = async (corps: {
    statut?: StatutTache;
    assigneA?: string;
  }) => {
    setEnvoiEnCours(true);
    try {
      const reponse = await fetch(`/api/taches/${tache.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(corps),
      });

      if (!reponse.ok) {
        onErreur("Impossible de mettre à jour cette tâche. Réessayez.");
        return;
      }

      const corpsReponse = (await reponse.json()) as { tache: TacheDomaine };
      onMiseAJour(corpsReponse.tache);
      setRepartitionOuverte(false);
    } catch {
      onErreur("Impossible de joindre le serveur. Vérifiez votre connexion.");
    } finally {
      setEnvoiEnCours(false);
    }
  };

  const prendreTache = () => {
    void mettreAJour({ assigneA: utilisateurId });
  };

  const changerStatut = () => {
    void mettreAJour({ statut: PROCHAIN_STATUT[tache.statut] });
  };

  const repartirTache = (membreId: string) => {
    void mettreAJour({ assigneA: membreId });
  };

  const estMoi = tache.assigneA === utilisateurId;

  return (
    <div className="mt-3 border-t border-fond-surface-claire pt-3">
      <div className="flex flex-wrap gap-2">
        {!tache.assigneA && (
          <Bouton variante="primaire" taille="petit" onClick={prendreTache} enCours={envoiEnCours}>
            Prendre la tâche
          </Bouton>
        )}

        {tache.statut !== "terminee" ? (
          <Bouton
            variante="secondaire"
            taille="petit"
            onClick={changerStatut}
            enCours={envoiEnCours}
          >
            {tache.statut === "a_faire" ? "Démarrer" : "Marquer terminée"}
          </Bouton>
        ) : (
          <Bouton variante="fantome" taille="petit" onClick={changerStatut}>
            Remettre à faire
          </Bouton>
        )}

        <Bouton
          variante="contour"
          taille="petit"
          onClick={() => setRepartitionOuverte((o) => !o)}
          aria-expanded={repartitionOuverte}
        >
          Répartir
        </Bouton>
      </div>

      {repartitionOuverte && (
        <div className="mt-3 space-y-1.5">
          <p className="text-xs font-medium uppercase tracking-wide text-texte-attenue">
            Attribuer à un membre du foyer
          </p>
          <ul className="grid grid-cols-1 gap-1.5">
            {membres.map((membre) => {
              const estAttribue = tache.assigneA === membre.id;
              const estMoiCeMembre = membre.id === utilisateurId;
              return (
                <li key={membre.id}>
                  <button
                    onClick={() => repartirTache(membre.id)}
                    disabled={estAttribue || envoiEnCours}
                    className="flex w-full items-center justify-between rounded-lg bg-fond-surface px-3 py-2 text-sm text-texte transition-colors hover:bg-fond-surface-claire disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <span>
                      {membre.prenom} {membre.nom}
                      {estMoiCeMembre && !estAttribue && (
                        <span className="ml-1 text-texte-attenue">(vous)</span>
                      )}
                    </span>
                    {estAttribue ? (
                      <span className="inline-flex items-center gap-1 text-xs text-primaire">
                        <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                          <path
                            fillRule="evenodd"
                            d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                            clipRule="evenodd"
                          />
                        </svg>
                        {estMoi ? "Attribuée à vous" : "Attribuée"}
                      </span>
                    ) : (
                      <span className="text-xs text-texte-attenue">
                        {estMoiCeMembre ? "Prendre" : "Assigner"}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
