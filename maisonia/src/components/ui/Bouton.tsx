"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { clsx } from "clsx";

type VarianteBouton = "primaire" | "secondaire" | "accent" | "contour" | "fantome";
type TailleBouton = "petit" | "moyen" | "grand";

interface ProprietesBouton extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: VarianteBouton;
  taille?: TailleBouton;
  enCours?: boolean;
  children: ReactNode;
}

const classesVariante: Record<VarianteBouton, string> = {
  primaire:
    "bg-primaire hover:bg-primaire-fonce text-fond font-semibold shadow-lg shadow-primaire/20",
  secondaire:
    "bg-secondaire hover:bg-secondaire-fonce text-texte font-semibold shadow-lg shadow-secondaire/20",
  accent:
    "bg-accent hover:bg-accent-fonce text-fond font-semibold shadow-lg shadow-accent/20",
  contour:
    "border-2 border-primaire text-primaire hover:bg-primaire/10 font-semibold",
  fantome:
    "bg-transparent hover:bg-fond-surface text-texte-adouci hover:text-texte",
};

const classesTaille: Record<TailleBouton, string> = {
  petit: "px-3 py-1.5 text-sm rounded-lg",
  moyen: "px-4 py-2.5 text-base rounded-xl",
  grand: "px-6 py-3 text-lg rounded-xl",
};

export function Bouton({
  variante = "primaire",
  taille = "moyen",
  enCours = false,
  children,
  className,
  disabled,
  ...proprietes
}: ProprietesBouton): React.JSX.Element {
  return (
    <button
      className={clsx(
        "inline-flex items-center justify-center gap-2 transition-all duration-200",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primaire focus-visible:ring-offset-2 focus-visible:ring-offset-fond",
        "disabled:cursor-not-allowed disabled:opacity-50",
        classesVariante[variante],
        classesTaille[taille],
        className
      )}
      disabled={disabled || enCours}
      {...proprietes}
    >
      {enCours && (
        <svg
          className="h-4 w-4 animate-spin"
          viewBox="0 0 24 24"
          fill="none"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
      )}
      {children}
    </button>
  );
}
