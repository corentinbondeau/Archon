import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { optionsAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { obtenirContexteFoyer } from "@/lib/foyer";
import { VueAgendaCalendrier } from "@/components/features/VueAgendaCalendrier";
import { ConteneurCreationEvenement } from "@/components/features/ConteneurCreationEvenement";
import { Etat } from "@/components/ui/Etat";
import type { EvenementDomaine } from "@/types/domaine";

export default async function PageAgenda(): Promise<React.JSX.Element> {
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
        description="Créez ou rejoignez un foyer pour consulter votre calendrier familial."
      />
    );
  }

  const evenementsBrut = await prisma.evenement.findMany({
    where: { foyerId: contexte.foyerId },
    orderBy: { dateDebut: "asc" },
  });

  const evenements: EvenementDomaine[] = evenementsBrut.map((e) => ({
    id: e.id,
    foyerId: e.foyerId,
    createurId: e.createurId,
    type: e.type as "evenement" | "indisponibilite",
    titre: e.titre,
    description: e.description,
    dateDebut: e.dateDebut.toISOString(),
    dateFin: e.dateFin?.toISOString() ?? null,
    lieu: e.lieu,
  }));

  const nomsParCreateur: Record<string, string> = {};
  for (const membre of contexte.membres) {
    nomsParCreateur[membre.utilisateur.id] =
      `${membre.utilisateur.prenom} ${membre.utilisateur.nom}`;
  }

  return (
    <div className="space-y-4">
      <section className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-texte">Calendrier du foyer</h1>
          <p className="mt-0.5 text-sm text-texte-adouci">
            {contexte.nom} · évènements et indisponibilités
          </p>
        </div>
      </section>

      <ConteneurCreationEvenement foyerId={contexte.foyerId} />

      <VueAgendaCalendrier
        evenements={evenements}
        nomsParCreateur={nomsParCreateur}
      />
    </div>
  );
}
