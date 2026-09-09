import type { ReactNode } from "react";
import { clsx } from "clsx";

interface ProprietesEtatChargement {
  type: "chargement";
  message?: string;
}

interface ProprietesEtatVide {
  type: "vide";
  titre: string;
  description: string;
  action?: ReactNode;
}

interface ProprietesEtatErreur {
  type: "erreur";
  message: string;
  action?: ReactNode;
}

type ProprietesEtat = ProprietesEtatChargement | ProprietesEtatVide | ProprietesEtatErreur;

export function Etat(props: ProprietesEtat): React.JSX.Element {
  switch (props.type) {
    case "chargement":
      return <EtatChargement message={props.message} />;
    case "vide":
      return (
        <EtatVide
          titre={props.titre}
          description={props.description}
          action={props.action}
        />
      );
    case "erreur":
      return <EtatErreur message={props.message} action={props.action} />;
  }
}

function EtatChargement({ message }: { message?: string }): React.JSX.Element {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <svg
        className="h-10 w-10 animate-spin text-primaire"
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
      <p className="mt-4 text-texte-adouci">
        {message ?? "Chargement en cours…"}
      </p>
    </div>
  );
}

function EtatVide({
  titre,
  description,
  action,
}: {
  titre: string;
  description: string;
  action?: ReactNode;
}): React.JSX.Element {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-fond-surface">
        <svg
          className="h-8 w-8 text-texte-attenue"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
          />
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-texte">{titre}</h3>
      <p className="mt-1 max-w-xs text-texte-adouci">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

function EtatErreur({
  message,
  action,
}: {
  message: string;
  action?: ReactNode;
}): React.JSX.Element {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div
        className={clsx(
          "mb-4 flex h-16 w-16 items-center justify-center rounded-full",
          "bg-accent/10"
        )}
      >
        <svg
          className="h-8 w-8 text-accent"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
          />
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-texte">
        Une erreur est survenue
      </h3>
      <p className="mt-1 max-w-xs text-texte-adouci">{message}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
