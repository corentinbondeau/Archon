"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import Link from "next/link";

interface ProprietesEnTete {
  nomFoyer?: string;
  prenomUtilisateur?: string;
}

export function EnTeteTableauDeBord({
  nomFoyer,
  prenomUtilisateur,
}: ProprietesEnTete): React.JSX.Element {
  const [menuOuvert, setMenuOuvert] = useState(false);

  return (
    <header className="border-b border-fond-surface-claire bg-fond-surface px-4 py-4">
      <div className="mx-auto flex max-w-2xl items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-texte">
            {nomFoyer ?? "Mon foyer"}
          </p>
          <p className="text-xs text-texte-attenue">
            {prenomUtilisateur
              ? `Bonjour ${prenomUtilisateur}`
              : "Bonjour"}
          </p>
        </div>

        <div className="relative">
          <button
            onClick={() => setMenuOuvert((ouvert) => !ouvert)}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-secondaire/20 text-secondaire transition-colors hover:bg-secondaire/30"
            aria-label="Menu du compte"
            aria-expanded={menuOuvert}
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.982 18.725A7.488 7.488 0 0012 15.75a7.488 7.488 0 00-5.982 2.975m11.963 0a9 9 0 10-11.963 0m11.963 0A8.966 8.966 0 0112 21a8.966 8.966 0 01-5.982-2.275M15 9.75a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>

          {menuOuvert && (
            <div className="absolute right-0 top-12 z-50 w-48 overflow-hidden rounded-xl bg-fond-surface-claire shadow-xl">
              <Link
                href="/parametres"
                onClick={() => setMenuOuvert(false)}
                className="block px-4 py-3 text-sm text-texte transition-colors hover:bg-fond-surface"
              >
                Paramètres du foyer
              </Link>
              <button
                onClick={() => void signOut({ callbackUrl: "/" })}
                className="block w-full px-4 py-3 text-left text-sm text-accent transition-colors hover:bg-fond-surface"
              >
                Se déconnecter
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
