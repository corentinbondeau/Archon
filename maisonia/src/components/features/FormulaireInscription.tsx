"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Bouton } from "@/components/ui/Bouton";
import { Champ } from "@/components/ui/Champ";
import { SchemaInscription } from "@/lib/validations";
import { inscrireUtilisateur } from "@/app/(auth)/register/actions";

export function FormulaireInscription(): React.JSX.Element {
  const router = useRouter();
  const [nom, setNom] = useState("");
  const [prenom, setPrenom] = useState("");
  const [email, setEmail] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [erreursChamp, setErreursChamp] = useState<Record<string, string>>({});
  const [erreurGlobale, setErreurGlobale] = useState<string | null>(null);
  const [envoiEnCours, setEnvoiEnCours] = useState(false);

  const soumettre = async (evenement: React.FormEvent<HTMLFormElement>) => {
    evenement.preventDefault();
    setErreurGlobale(null);

    const validation = SchemaInscription.safeParse({
      nom,
      prenom,
      email,
      motDePasse,
      confirmationMotDePasse: confirmation,
    });

    if (!validation.success) {
      const nouvellesErreurs: Record<string, string> = {};
      for (const probleme of validation.error.issues) {
        const cle = String(probleme.path[0] ?? "");
        if (!nouvellesErreurs[cle]) {
          nouvellesErreurs[cle] = probleme.message;
        }
      }
      setErreursChamp(nouvellesErreurs);
      return;
    }

    setErreursChamp({});
    setEnvoiEnCours(true);

    const resultat = await inscrireUtilisateur(validation.data);

    if (!resultat.ok) {
      setErreurGlobale(
        resultat.erreur ?? "L'inscription a échoué, veuillez réessayer."
      );
      setEnvoiEnCours(false);
      return;
    }

    const connexion = await signIn("credentials", {
      email,
      motDePasse,
      redirect: false,
    });

    if (connexion?.error) {
      router.push("/login");
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

      <div className="grid grid-cols-2 gap-3">
        <Champ
          etiquette="Nom"
          placeholder="Martin"
          value={nom}
          onChange={(e) => setNom(e.target.value)}
          erreur={erreursChamp["nom"]}
          autoComplete="family-name"
        />
        <Champ
          etiquette="Prénom"
          placeholder="Camille"
          value={prenom}
          onChange={(e) => setPrenom(e.target.value)}
          erreur={erreursChamp["prenom"]}
          autoComplete="given-name"
        />
      </div>

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
        placeholder="8 caractères minimum"
        value={motDePasse}
        onChange={(e) => setMotDePasse(e.target.value)}
        erreur={erreursChamp["motDePasse"]}
        autoComplete="new-password"
      />

      <Champ
        type="password"
        etiquette="Confirmation du mot de passe"
        placeholder="Répétez votre mot de passe"
        value={confirmation}
        onChange={(e) => setConfirmation(e.target.value)}
        erreur={erreursChamp["confirmationMotDePasse"]}
        autoComplete="new-password"
      />

      <Bouton
        type="submit"
        taille="grand"
        enCours={envoiEnCours}
        className="w-full"
      >
        Créer mon compte
      </Bouton>
    </form>
  );
}
