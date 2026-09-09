import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { optionsAuth } from "@/lib/auth";
import { obtenirContexteFoyer } from "@/lib/foyer";
import { FilConversation } from "@/components/features/FilConversation";
import { Etat } from "@/components/ui/Etat";

export default async function PageMessages(): Promise<React.JSX.Element> {
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
        description="Créez ou rejoignez un foyer pour échanger avec votre famille."
      />
    );
  }

  const titresParUtilisateur: Record<string, string> = {};
  for (const membre of contexte.membres) {
    titresParUtilisateur[membre.utilisateur.id] =
      `${membre.utilisateur.prenom} ${membre.utilisateur.nom}`;
  }

  return (
    <div className="space-y-4">
      <section>
        <h1 className="text-xl font-bold text-texte">Conversations</h1>
        <p className="mt-0.5 text-sm text-texte-adouci">
          Échangez avec votre famille autour du quotidien.
        </p>
      </section>

      <FilConversation
        foyerId={contexte.foyerId}
        utilisateurId={session.user.id}
        titresParUtilisateur={titresParUtilisateur}
      />
    </div>
  );
}
