import { redirect } from "next/navigation";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { optionsAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { estMembreDuFoyer } from "@/lib/foyer";
import { formaterDate, formaterHeure } from "@/lib/format";

type ParametresRoute = {
  params: { id: string };
};

export default async function PageDetailEvenement({
  params,
}: ParametresRoute): Promise<React.JSX.Element> {
  const session = await getServerSession(optionsAuth);
  if (!session?.user?.id) {
    redirect("/login");
  }

  const evenement = await prisma.evenement.findUnique({
    where: { id: params.id },
    include: {
      createur: {
        select: { id: true, nom: true, prenom: true },
      },
      invitations: {
        include: {
          destinataire: {
            select: { id: true, nom: true, prenom: true },
          },
        },
      },
    },
  });

  if (!evenement) {
    notFound();
  }

  if (!(await estMembreDuFoyer(session.user.id, evenement.foyerId))) {
    notFound();
  }

  const estIndisponibilite = evenement.type === "indisponibilite";

  return (
    <div className="space-y-6">
      <section className="surface-carte">
        <span
          className={
            estIndisponibilite
              ? "inline-flex items-center rounded-full bg-accent/15 px-2 py-0.5 text-xs font-medium text-accent"
              : "inline-flex items-center rounded-full bg-primaire/15 px-2 py-0.5 text-xs font-medium text-primaire"
          }
        >
          {estIndisponibilite ? "Indisponibilité" : "Évènement"}
        </span>
        <h1 className="mt-2 text-xl font-bold text-texte">{evenement.titre}</h1>
        <dl className="mt-3 space-y-2 text-sm text-texte-adouci">
          <div className="flex items-center gap-2">
            <svg className="h-4 w-4 text-texte-attenue" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
            </svg>
            <span>
              {formaterDate(evenement.dateDebut.toISOString())} ·{" "}
              {formaterHeure(evenement.dateDebut.toISOString())}
            </span>
          </div>
          {evenement.lieu && (
            <div className="flex items-center gap-2">
              <svg className="h-4 w-4 text-texte-attenue" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
              </svg>
              <span>{evenement.lieu}</span>
            </div>
          )}
        </dl>
        {evenement.description && (
          <p className="mt-3 text-sm text-texte-adouci">{evenement.description}</p>
        )}
        <p className="mt-4 border-t border-fond-surface-claire pt-2 text-xs text-texte-attenue">
          Créé par {evenement.createur.prenom} {evenement.createur.nom}
        </p>
      </section>

      <section className="surface-carte">
        <h2 className="mb-3 text-base font-semibold text-texte">Invitations</h2>
        {evenement.invitations.length === 0 ? (
          <p className="text-sm text-texte-attenue">
            Aucune invitation émise pour cet évènement.
          </p>
        ) : (
          <ul className="space-y-2">
            {evenement.invitations.map((invitation) => (
              <li
                key={invitation.id}
                className="flex items-center justify-between rounded-lg bg-fond px-3 py-2"
              >
                <span className="text-sm text-texte">
                  {invitation.destinataire.prenom} {invitation.destinataire.nom}
                </span>
                <StatutInvitationBadge statut={invitation.statut} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function StatutInvitationBadge({ statut }: { statut: string }): React.JSX.Element {
  if (statut === "acceptee") {
    return (
      <span className="rounded-full bg-primaire/15 px-2 py-0.5 text-xs font-medium text-primaire">
        Acceptée
      </span>
    );
  }
  if (statut === "declinee") {
    return (
      <span className="rounded-full bg-accent/15 px-2 py-0.5 text-xs font-medium text-accent">
        Déclinée
      </span>
    );
  }
  return (
    <span className="rounded-full bg-fond-surface-claire px-2 py-0.5 text-xs font-medium text-texte-adouci">
      En attente
    </span>
  );
}
