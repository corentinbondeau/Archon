"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bouton } from "@/components/ui/Bouton";
import { PanneauCreation } from "@/components/features/PanneauCreation";
import { FormulaireCreationEvenement } from "@/components/features/FormulaireCreationEvenement";

interface ProprietesConteneurCreationEvenement {
  foyerId: string;
}

export function ConteneurCreationEvenement({
  foyerId,
}: ProprietesConteneurCreationEvenement): React.JSX.Element {
  const router = useRouter();
  const [ouvert, setOuvert] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const boutonOuverture = (
    <Bouton
      variante="accent"
      className="w-full"
      onClick={() => {
        setErreur(null);
        setOuvert(true);
      }}
    >
      Planifier un évènement ou une indisponibilité
    </Bouton>
  );

  return (
    <PanneauCreation
      titre="Nouvel évènement"
      sousTitre="Partagez un évènement ou signalez une indisponibilité à votre foyer."
      ouvert={ouvert}
      onFermer={() => setOuvert(false)}
      boutonOuverture={boutonOuverture}
    >
      <FormulaireCreationEvenement
        foyerId={foyerId}
        onCree={() => {
          setOuvert(false);
          router.refresh();
        }}
        onAnnule={() => setOuvert(false)}
        onErreur={setErreur}
      />
      {erreur && (
        <p className="mt-3 text-sm text-accent" role="alert">
          {erreur}
        </p>
      )}
    </PanneauCreation>
  );
}
