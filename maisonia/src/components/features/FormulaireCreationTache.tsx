"use client";

import { useState } from "react";
import { Bouton } from "@/components/ui/Bouton";
import { Champ } from "@/components/ui/Champ";
import { SchemaCreationTache } from "@/lib/validations";

interface MembreSelectionnable {
  id: string;
  nom: string;
  prenom: string;
}

interface ProprietesFormulaireCreationTache {
  foyerId: string;
  membres?: MembreSelectionnable[];
  onCree: () => void;
  onAnnule: () => void;
  onErreur: (message: string) => void;
}

export function FormulaireCreationTache({
  foyerId,
  membres = [],
  onCree,
  onAnnule,
  onErreur,
}: ProprietesFormulaireCreationTache): React.JSX.Element {
  const [titre, setTitre] = useState("");
  const [description, setDescription] = useState("");
  const [assigneA, setAssigneA] = useState("");
  const [dateEcheance, setDateEcheance] = useState("");
  const [erreursChamp, setErreursChamp] = useState<Record<string, string>>({});
  const [envoiEnCours, setEnvoiEnCours] = useState(false);

  const soumettre = async (evenement: React.FormEvent<HTMLFormElement>) => {
    evenement.preventDefault();

    const corps: Record<string, string> = {
      foyerId,
      titre,
    };
    if (description) corps.description = description;
    if (assigneA) corps.assigneA = assigneA;
    if (dateEcheance)
      corps.dateEcheance = new Date(dateEcheance).toISOString();

    const validation = SchemaCreationTache.safeParse(corps);
    if (!validation.success) {
      const nouvellesErreurs: Record<string, string> = {};
      for (const probleme of validation.error.issues) {
        nouvellesErreurs[String(probleme.path[0])] = probleme.message;
      }
      setErreursChamp(nouvellesErreurs);
      return;
    }

    setErreursChamp({});
    setEnvoiEnCours(true);

    try {
      const reponse = await fetch("/api/taches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validation.data),
      });

      if (!reponse.ok) {
        onErreur("Impossible de créer la tâche. Réessayez.");
        return;
      }

      onCree();
    } catch {
      onErreur("Impossible de joindre le serveur. Réessayez.");
    } finally {
      setEnvoiEnCours(false);
    }
  };

  return (
    <form onSubmit={soumettre} className="space-y-4" noValidate>
      <Champ
        etiquette="Titre de la tâche"
        placeholder="Ex. : Vider le lave-vaisselle"
        value={titre}
        onChange={(e) => setTitre(e.target.value)}
        erreur={erreursChamp["titre"]}
      />

      <div>
        <label
          htmlFor="description-tache"
          className="mb-1.5 block text-sm font-medium text-texte-adouci"
        >
          Description (facultative)
        </label>
        <textarea
          id="description-tache"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Détails de la tâche à accomplir…"
          rows={3}
          className="w-full rounded-xl border border-fond-surface-claire bg-fond-surface px-4 py-2.5 text-texte placeholder:text-texte-attenue focus:border-primaire focus:outline-none focus:ring-2 focus:ring-primaire/30"
        />
      </div>

      {membres.length > 0 && (
        <div>
          <label
            htmlFor="assigne-tache"
            className="mb-1.5 block text-sm font-medium text-texte-adouci"
          >
            Assigner à (facultatif)
          </label>
          <select
            id="assigne-tache"
            value={assigneA}
            onChange={(e) => setAssigneA(e.target.value)}
            className="w-full rounded-xl border border-fond-surface-claire bg-fond-surface px-4 py-2.5 text-texte focus:border-primaire focus:outline-none focus:ring-2 focus:ring-primaire/30"
          >
            <option value="">Aucun pour le moment</option>
            {membres.map((membre) => (
              <option key={membre.id} value={membre.id}>
                {membre.prenom} {membre.nom}
              </option>
            ))}
          </select>
        </div>
      )}

      <Champ
        type="date"
        etiquette="Échéance (facultative)"
        value={dateEcheance}
        onChange={(e) => setDateEcheance(e.target.value)}
        erreur={erreursChamp["dateEcheance"]}
      />

      <div className="flex gap-2">
        <Bouton type="submit" enCours={envoiEnCours} className="flex-1">
          Créer la tâche
        </Bouton>
        <Bouton
          type="button"
          variante="fantome"
          onClick={onAnnule}
          className="flex-1"
        >
          Annuler
        </Bouton>
      </div>
    </form>
  );
}
