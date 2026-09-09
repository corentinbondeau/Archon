"use client";

import type { ReactNode } from "react";
import { Bouton } from "@/components/ui/Bouton";

interface ProprietesPanneauCreation {
  titre: string;
  sousTitre: string;
  ouvert: boolean;
  onFermer: () => void;
  children: ReactNode;
  boutonOuverture: ReactNode;
}

export function PanneauCreation({
  titre,
  sousTitre,
  ouvert,
  onFermer,
  children,
  boutonOuverture,
}: ProprietesPanneauCreation): React.JSX.Element {
  return (
    <>
      {boutonOuverture}

      {ouvert && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60"
          onClick={onFermer}
        >
          <div
            className="max-h-[90vh] w-full overflow-y-auto rounded-t-2xl bg-fond-surface p-5"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={titre}
          >
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h2 className="text-lg font-semibold text-texte">{titre}</h2>
                <p className="mt-0.5 text-sm text-texte-attenue">{sousTitre}</p>
              </div>
              <Bouton
                variante="fantome"
                taille="petit"
                onClick={onFermer}
                aria-label="Fermer"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </Bouton>
            </div>
            {children}
          </div>
        </div>
      )}
    </>
  );
}
