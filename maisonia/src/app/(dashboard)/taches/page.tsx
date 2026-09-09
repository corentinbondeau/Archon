import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { optionsAuth } from "@/lib/auth";
import { obtenirContexteFoyer } from "@/lib/foyer";
import { GestionnaireTaches } from "@/components/features/GestionnaireTaches";
import { Etat } from "@/components/ui/Etat";

export default async function PageTaches(): Promise<React.JSX.Element> {
  const session = await getServerSession(optionsAuth);
  if (!session?.user?.id) {
    redirect("/login");
  }

  const contexte = await obtenirContexteFoyer(session.user.id);

  if (!contexte) {
    return (
      <Etat
        type="vide"
        titre="Aucun foyer"
        description="Créez ou rejoignez un foyer pour gérer les tâches ménagères de votre famille."
      />
    );
  }

  const membres = contexte.membres.map((membre) => ({
    id: membre.utilisateur.id,
    nom: membre.utilisateur.nom,
    prenom: membre.utilisateur.prenom,
  }));

  return (
    <div className="space-y-4">
      <section>
        <h1 className="text-xl font-bold text-texte">Tâches du foyer</h1>
        <p className="mt-0.5 text-sm text-texte-adouci">
          {contexte.nom} · répartissez et suivez les tâches ménagères
        </p>
      </section>

      <GestionnaireTaches
        foyerId={contexte.foyerId}
        utilisateurId={session.user.id}
        membres={membres}
      />
    </div>
  );
}
