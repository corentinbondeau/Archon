"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bouton } from "@/components/ui/Bouton";
import { Champ } from "@/components/ui/Champ";
import { SchemaCreationFoyer } from "@/lib/validations";

export function FormulaireCreationFoyer(): React.JSX.Element {
  const router = useRouter();
  const [nomFoyer, setNomFoyer] = useState("");
  const [erreurNom, setErreurNom] = useState<string | undefined>(undefined);
  const [erreurGlobal, setErreurGlobal] = useState<string | null>(null);
  const [envoiEnCours, setEnvoiEnCours] = useState(false);

  const soumettre = async (evenement: React.FormEvent<HTMLFormElement>) => {
    evenement.preventDefault();
    setErreurGlobal(null);

    const validation = SchemaCreationFoyer.safeParse({ nom: nomFoyer });
    if (!validation.success) {
      setErreurNom(validation.error.issues[0]?.message);
      return;
    }

    setErreurNom(undefined);
    setEnvoiEnCours(true);

    try {
      const reponse = await fetch("/api/foyers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validation.data),
      });

      if (!reponse.ok) {
        setErreurGlobal(
          "Impossible de créer le foyer. Vérifiez vos informations puis réessayez."
        );
        return;
      }

      router.push("/tableau-de-bord");
      router.refresh();
    } catch {
      setErreurGlobal(
        "Impossible de joindre le serveur. Vérifiez votre connexion puis réessayez."
      );
    } finally {
      setEnvoiEnCours(false);
    }
  };

  return (
    <form onSubmit={soumettre} className="space-y-4" noValidate>
      {erreurGlobal && (
        <div
          className="rounded-xl border border-accent/30 bg-accent/10 px-4 py-3 text-sm text-accent"
          role="alert"
        >
          {erreurGlobal}
        </div>
      )}

      <div>
        <Champ
          etiquette="Nom du foyer"
          placeholder="Ex. : Foyer Martin"
          value={nomFoyer}
          onChange={(e) => setNomFoyer(e.target.value)}
          erreur={erreurNom}
        />
        <p className="mt-2 text-sm text-texte-attenue">
          C&apos;est l&apos;identifiant sous lequel votre famille organisera
          son calendrier et ses tâches.
        </p>
      </div>

      <Bouton
        type="submit"
        enCours={envoiEnCours}
        className="w-full"
        taille="grand"
      >
        Créer mon foyer
      </Bouton>
    </form>
  );
}
