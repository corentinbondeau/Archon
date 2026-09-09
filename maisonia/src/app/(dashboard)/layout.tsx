import type { ReactNode } from "react";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { optionsAuth } from "@/lib/auth";
import { obtenirFoyerActifDeLutilisateur } from "@/lib/foyer";
import { GabaritFoyer } from "@/components/layout/GabaritFoyer";

export const metadata = {
  title: "Tableau de bord · Maisonia",
};

export default async function LayoutTableauDeBord({
  children,
}: {
  children: ReactNode;
}): Promise<ReactNode> {
  const session = await getServerSession(optionsAuth);

  if (!session?.user?.id) {
    redirect("/login");
  }

  const foyer = await obtenirFoyerActifDeLutilisateur(session.user.id);

  const prenomUtilisateur = await recupererPrenom(session.user.id);

  return (
    <GabaritFoyer
      nomFoyer={foyer?.nom}
      prenomUtilisateur={prenomUtilisateur}
    >
      {children}
    </GabaritFoyer>
  );
}

async function recupererPrenom(utilisateurId: string): Promise<string | undefined> {
  const { prisma } = await import("@/lib/prisma");
  const utilisateur = await prisma.utilisateur.findUnique({
    where: { id: utilisateurId },
    select: { prenom: true },
  });
  return utilisateur?.prenom;
}
