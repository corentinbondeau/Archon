"use client";

import { useState } from "react";
import { Bouton } from "@/components/ui/Bouton";
import { Champ } from "@/components/ui/Champ";
import { SchemaCreationEvenement } from "@/lib/validations";

interface ProprietesFormulaireCreationEvenement {
  foyerId: string;
  onCree: () => void;
  onAnnule: () => void;
  onErreur: (message: string) => void;
}

export function FormulaireCreationEvenement({
  foyerId,
  onCree,
  onAnnule,
  onErreur,
}: ProprietesFormulaireCreationEvenement): React.JSX.Element {
  const [type, setType] = useState<"evenement" | "indisponibilite">("evenement");
  const [titre, setTitre] = useState("");
  const [description, setDescription] = useState("");
  const [dateDebut, setDateDebut] = useState("");
  const [heureDebut, setHeureDebut] = useState("");
  const [lieu, setLieu] = useState("");
  const [erreursChamp, setErreursChamp] = useState<Record<string, string>>({});
  const [envoiEnCours, setEnvoiEnCours] = useState(false);

  const soumettre = async (evenement: React.FormEvent<HTMLFormElement>) => {
    evenement.preventDefault();

    const dateDebutISO = new Date(`${dateDebut}T${heureDebut || "09:00"}`).toISOString();

    const corps: Record<string, string> = {
      foyerId,
      type,
      titre,
      dateDebut: dateDebutISO,
    };
    if (description) corps.description = description;
    if (lieu) corps.lieu = lieu;

    const validation = SchemaCreationEvenement.safeParse(corps);
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
      const reponse = await fetch("/api/evenements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validation.data),
      });

      if (!reponse.ok) {
        onErreur("Impossible de créer l'évènement. Réessayez.");
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
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setType("evenement")}
          className={
            type === "evenement"
              ? "rounded-xl border-2 border-primaire bg-primaire/10 px-3 py-2 text-sm font-medium text-primaire"
              : "rounded-xl border-2 border-fond-surface-claire px-3 py-2 text-sm text-texte-adouci"
          }
        >
          Évènement
        </button>
        <button
          type="button"
          onClick={() => setType("indisponibilite")}
          className={
            type === "indisponibilite"
              ? "rounded-xl border-2 border-accent bg-accent/10 px-3 py-2 text-sm font-medium text-accent"
              : "rounded-xl border-2 border-fond-surface-claire px-3 py-2 text-sm text-texte-adouci"
          }
        >
          Indisponibilité
        </button>
      </div>

      <Champ
        etiquette={
          type === "indisponibilite"
            ? "Raison de l'indisponibilité"
            : "Titre de l'évènement"
        }
        placeholder={
          type === "indisponibilite"
            ? "Ex. : Absence de Camille"
            : "Ex. : Sortie au parc"
        }
        value={titre}
        onChange={(e) => setTitre(e.target.value)}
        erreur={erreursChamp["titre"]}
      />

      <div>
        <label
          htmlFor="description-evenement"
          className="mb-1.5 block text-sm font-medium text-texte-adouci"
        >
          Description (facultative)
        </label>
        <textarea
          id="description-evenement"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="w-full rounded-xl border border-fond-surface-claire bg-fond-surface px-4 py-2.5 text-texte placeholder:text-texte-attenue focus:border-primaire focus:outline-none focus:ring-2 focus:ring-primaire/30"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Champ
          type="date"
          etiquette="Date"
          value={dateDebut}
          onChange={(e) => setDateDebut(e.target.value)}
          erreur={erreursChamp["dateDebut"]}
        />
        <Champ
          type="time"
          etiquette="Heure"
          value={heureDebut}
          onChange={(e) => setHeureDebut(e.target.value)}
        />
      </div>

      <Champ
        etiquette="Lieu (facultatif)"
        placeholder="Ex. : Maison de la famille"
        value={lieu}
        onChange={(e) => setLieu(e.target.value)}
      />

      <div className="flex gap-2">
        <Bouton type="submit" enCours={envoiEnCours} className="flex-1">
          {type === "indisponibilite"
            ? "Signaler l'indisponibilité"
            : "Créer l'évènement"}
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
