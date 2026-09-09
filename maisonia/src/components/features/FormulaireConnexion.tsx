"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Bouton } from "@/components/ui/Bouton";
import { Champ } from "@/components/ui/Champ";
import { SchemaConnexion } from "@/lib/validations";

export function FormulaireConnexion(): React.JSX.Element {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [erreursChamp, setErreursChamp] = useState<Record<string, string>>({});
  const [erreurGlobale, setErreurGlobale] = useState<string | null>(null);
  const [envoiEnCours, setEnvoiEnCours] = useState(false);

  const soumettre = async (evenement: React.FormEvent<HTMLFormElement>) => {
    evenement.preventDefault();
    setErreurGlobale(null);

    const validation = SchemaConnexion.safeParse({ email, motDePasse });
    if (!validation.success) {
      const nouvellesErreurs: Record<string, string> = {};
      for (const probleme of validation.error.issues) {
        nouvellesErreurs[probleme.path[0]] = probleme.message;
      }
      setErreursChamp(nouvellesErreurs);
      return;
    }

    setErreursChamp({});
    setEnvoiEnCours(true);

    const resultat = await signIn("credentials", {
      email,
      motDePasse,
      redirect: false,
    });

    setEnvoiEnCours(false);

    if (resultat?.error) {
      setErreurGlobale(
        "Identifiants incorrects. Vérifiez votre adresse email et votre mot de passe."
      );
      return;
    }

    router.push("/tableau-de-bord");
    router.refresh();
  };

  return (
    <form onSubmit={soumettre} className="space-y-4" noValidate>
      {erreurGlobale && (
        <div
          className="rounded-xl border border-accent/30 bg-accent/10 px-4 py-3 text-sm text-accent"
          role="alert"
        >
          {erreurGlobale}
        </div>
      )}

      <Champ
        type="email"
        etiquette="Adresse email"
        placeholder="vous@exemple.fr"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        erreur={erreursChamp["email"]}
        autoComplete="email"
      />

      <Champ
        type="password"
        etiquette="Mot de passe"
        placeholder="Votre mot de passe"
        value={motDePasse}
        onChange={(e) => setMotDePasse(e.target.value)}
        erreur={erreursChamp["motDePasse"]}
        autoComplete="current-password"
      />

      <Bouton
        type="submit"
        taille="grand"
        enCours={envoiEnCours}
        className="w-full"
      >
        Se connecter
      </Bouton>
    </form>
  );
}
