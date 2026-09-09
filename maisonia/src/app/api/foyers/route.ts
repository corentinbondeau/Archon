import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { SchemaCreationFoyer } from "@/lib/validations";
import { prisma } from "@/lib/prisma";
import { obtenirUtilisateurConnecte } from "@/lib/foyer";

export async function POST(requete: Request): Promise<NextResponse> {
  const utilisateurId = await obtenirUtilisateurConnecte();

  if (!utilisateurId) {
    return NextResponse.json({ message: "Authentification requise" }, { status: 401 });
  }

  const corps = await requete.json().catch(() => null);
  const validation = SchemaCreationFoyer.safeParse(corps);

  if (!validation.success) {
    return NextResponse.json({ message: "Payload invalide" }, { status: 400 });
  }

  const { nom } = validation.data;
  const codeInvitation = randomUUID().slice(0, 8).toUpperCase();

  const foyer = await prisma.foyer.create({
    data: {
      nom,
      codeInvitation,
      membres: {
        create: {
          utilisateurId,
          role: "parent",
        },
      },
    },
  });

  return NextResponse.json({ foyer }, { status: 201 });
}
