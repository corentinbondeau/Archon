"use server";

import { hash } from "bcryptjs";
import { SchemaInscription, type DonneesInscription } from "@/lib/validations";
import { prisma } from "@/lib/prisma";

export interface ResultatInscription {
  ok: boolean;
  erreur?: string;
}

export async function inscrireUtilisateur(
  donnees: DonneesInscription
): Promise<ResultatInscription> {
  const validation = SchemaInscription.safeParse(donnees);

  if (!validation.success) {
    return { ok: false, erreur: "Les informations fournies sont invalides." };
  }

  const { nom, prenom, email, motDePasse } = validation.data;

  const emailNormalise = email.trim().toLowerCase();

  const dejaExistant = await prisma.utilisateur.findUnique({
    where: { email: emailNormalise },
    select: { id: true },
  });

  if (dejaExistant) {
    return {
      ok: false,
      erreur: "Cette adresse email est déjà utilisée par un compte existant.",
    };
  }

  const motDePasseHash = await hash(motDePasse, 10);

  await prisma.utilisateur.create({
    data: {
      nom: nom.trim(),
      prenom: prenom.trim(),
      email: emailNormalise,
      motDePasseHash,
    },
  });

  return { ok: true };
}
