"use client";

import { useState } from "react";

interface ProprietesCodeInvitation {
  code: string;
}

export function BadgeCodeInvitation({ code }: ProprietesCodeInvitation): React.JSX.Element {
  const [copie, setCopie] = useState(false);

  const copier = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopie(true);
      window.setTimeout(() => setCopie(false), 2000);
    } catch {
      setCopie(false);
    }
  };

  return (
    <button
      onClick={() => void copier()}
      className="inline-flex items-center gap-2 rounded-xl border border-dashed border-primaire bg-primaire/10 px-4 py-2 font-mono text-lg font-bold tracking-widest text-primaire transition-colors hover:bg-primaire/20"
      title="Cliquer pour copier le code d'invitation"
    >
      {code}
      <span className="text-xs font-normal text-texte-adouci">
        {copie ? "Copié ✓" : "Copier"}
      </span>
    </button>
  );
}
