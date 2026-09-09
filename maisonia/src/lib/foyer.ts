import { getServerSession } from "next-auth";
import { optionsAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function obtenirUtilisateurConnecte(): Promise<string | null> {
  const session = await getServerSession(optionsAuth);
  return session?.user?.id ?? null;
}

export async function estMembreDuFoyer(
  utilisateurId: string,
  foyerId: string
): Promise<boolean> {
  const appartenance = await prisma.foyerMembre.findUnique({
    where: {
      foyerId_utilisateurId: {
        foyerId,
        utilisateurId,
      },
    },
    select: { id: true },
  });

  return appartenance !== null;
}

export async function obtenirFoyerActifDeLutilisateur(
  utilisateurId: string
) {
  const appartenance = await prisma.foyerMembre.findFirst({
    where: { utilisateurId },
    include: {
      foyer: {
        include: {
          membres: {
            include: {
              utilisateur: {
                select: {
                  id: true,
                  nom: true,
                  prenom: true,
                  email: true,
                },
              },
            },
          },
        },
      },
    },
    orderBy: { dateCreation: "asc" },
  });

  if (!appartenance) {
    return null;
  }

  return appartenance.foyer;
}

export interface MembreFoyerUtilisable {
  id: string;
  role: string;
  utilisateur: {
    id: string;
    nom: string;
    prenom: string;
    email: string;
  };
}

export interface ContexteFoyer {
  foyerId: string;
  nom: string;
  codeInvitation: string;
  membres: MembreFoyerUtilisable[];
}

export async function obtenirContexteFoyer(
  utilisateurId: string
): Promise<ContexteFoyer | null> {
  const foyer = await obtenirFoyerActifDeLutilisateur(utilisateurId);

  if (!foyer) {
    return null;
  }

  return {
    foyerId: foyer.id,
    nom: foyer.nom,
    codeInvitation: foyer.codeInvitation,
    membres: foyer.membres.map((membre) => ({
      id: membre.id,
      role: membre.role,
      utilisateur: {
        id: membre.utilisateur.id,
        nom: membre.utilisateur.nom,
        prenom: membre.utilisateur.prenom,
        email: membre.utilisateur.email,
      },
    })),
  };
}
