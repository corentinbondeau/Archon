import { redirect } from "next/navigation";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { optionsAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { estMembreDuFoyer } from "@/lib/foyer";
import { BadgeCodeInvitation } from "@/components/features/BadgeCodeInvitation";
import { initialesDe } from "@/lib/format";

type ParametresRoute = {
  params: { id: string };
};

export default async function PageDetailFoyer({
  params,
}: ParametresRoute): Promise<React.JSX.Element> {
  const session = await getServerSession(optionsAuth);
  if (!session?.user?.id) {
    redirect("/login");
  }

  const membre = await estMembreDuFoyer(session.user.id, params.id);
  if (!membre) {
    notFound();
  }

  const foyer = await prisma.foyer.findUnique({
    where: { id: params.id },
    include: {
      membres: {
        include: {
          utilisateur: {
            select: { id: true, nom: true, prenom: true, email: true },
          },
        },
      },
    },
  });

  if (!foyer) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-xl font-bold text-texte">Le foyer {foyer.nom}</h1>
        <p className="mt-0.5 text-sm text-texte-adouci">
          Détail de la famille et de ses membres.
        </p>
      </section>

      <section className="surface-carte">
        <h2 className="mb-3 text-base font-semibold text-texte">
          Code d&apos;invitation
        </h2>
        <BadgeCodeInvitation code={foyer.codeInvitation} />
        <p className="mt-2 text-xs text-texte-attenue">
          Partagez ce code pour que vos proches rejoignent {foyer.nom}.
        </p>
      </section>

      <section className="surface-carte">
        <h2 className="mb-3 text-base font-semibold text-texte">Membres</h2>
        <ul className="space-y-3">
          {foyer.membres.map((membre) => (
            <li key={membre.id} className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-secondaire/20 text-sm font-bold text-secondaire">
                {initialesDe(
                  membre.utilisateur.prenom,
                  membre.utilisateur.nom
                )}
              </span>
              <div className="flex-1">
                <p className="text-sm font-medium text-texte">
                  {membre.utilisateur.prenom} {membre.utilisateur.nom}
                </p>
                <p className="text-xs text-texte-attenue">
                  {membre.utilisateur.email}
                </p>
              </div>
              <span
                className={
                  membre.role === "parent"
                    ? "rounded-full bg-primaire/15 px-2 py-0.5 text-xs font-medium text-primaire"
                    : "rounded-full bg-fond px-2 py-0.5 text-xs font-medium text-texte-adouci"
                }
              >
                {membre.role === "parent" ? "Parent" : "Enfant"}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
