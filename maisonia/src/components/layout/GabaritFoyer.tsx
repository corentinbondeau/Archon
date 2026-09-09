"use client";

import { BarreNavigation } from "@/components/layout/BarreNavigation";
import { EnTeteTableauDeBord } from "@/components/layout/EnTeteTableauDeBord";

interface ProprietesGabaritFoyer {
  nomFoyer?: string;
  prenomUtilisateur?: string;
  children: React.ReactNode;
}

export function GabaritFoyer({
  nomFoyer,
  prenomUtilisateur,
  children,
}: ProprietesGabaritFoyer): React.JSX.Element {
  return (
    <div className="min-h-screen bg-fond">
      <EnTeteTableauDeBord
        nomFoyer={nomFoyer}
        prenomUtilisateur={prenomUtilisateur}
      />
      <main className="mx-auto max-w-2xl px-4 pb-24 pt-5">{children}</main>
      <BarreNavigation />
    </div>
  );
}
