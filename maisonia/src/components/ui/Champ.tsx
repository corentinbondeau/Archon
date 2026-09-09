"use client";

import type { InputHTMLAttributes, ReactNode } from "react";
import { forwardRef } from "react";
import { clsx } from "clsx";

interface ProprietesChamp extends InputHTMLAttributes<HTMLInputElement> {
  etiquette?: string;
  erreur?: string;
  icone?: ReactNode;
}

export const Champ = forwardRef<HTMLInputElement, ProprietesChamp>(
  function Champ(
    { etiquette, erreur, icone, className, id, ...proprietes },
    ref
  ): React.JSX.Element {
    const identifiant = id ?? etiquettteVersId(etiquette);

    return (
      <div className="w-full">
        {etiquette && (
          <label
            htmlFor={identifiant}
            className="mb-1.5 block text-sm font-medium text-texte-adouci"
          >
            {etiquette}
          </label>
        )}
        <div className="relative">
          {icone && (
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-texte-attenue">
              {icone}
            </span>
          )}
          <input
            ref={ref}
            id={identifiant}
            className={clsx(
              "w-full rounded-xl border bg-fond-surface px-4 py-2.5 text-texte",
              "placeholder:text-texte-attenue",
              "transition-colors duration-200",
              "focus:border-primaire focus:outline-none focus:ring-2 focus:ring-primaire/30",
              erreur
                ? "border-accent focus:border-accent focus:ring-accent/30"
                : "border-fond-surface-claire",
              icone && "pl-10",
              className
            )}
            aria-invalid={erreur ? "true" : undefined}
            aria-describedby={erreur && identifiant ? `${identifiant}-erreur` : undefined}
            {...proprietes}
          />
        </div>
        {erreur && (
          <p
            id={identifiant ? `${identifiant}-erreur` : undefined}
            className="mt-1.5 text-sm text-accent"
            role="alert"
          >
            {erreur}
          </p>
        )}
      </div>
    );
  }
);

function etiquettteVersId(etiquette?: string): string | undefined {
  if (!etiquette) return undefined;
  return etiquette
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
