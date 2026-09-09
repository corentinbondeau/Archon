import { NextResponse } from "next/server";
import { SchemaCreationEvenement } from "@/lib/validations";
import { prisma } from "@/lib/prisma";
import { estMembreDuFoyer, obtenirUtilisateurConnecte } from "@/lib/foyer";

export async function POST(requete: Request): Promise<NextResponse> {
  const utilisateurId = await obtenirUtilisateurConnecte();

  if (!utilisateurId) {
    return NextResponse.json({ message: "Authentification requise" }, { status: 401 });
  }

  const corps = await requete.json().catch(() => null);
  const validation = SchemaCreationEvenement.safeParse(corps);

  if (!validation.success) {
    return NextResponse.json({ message: "Payload invalide" }, { status: 400 });
  }

  const { foyerId, type, titre, description, dateDebut, dateFin, lieu } =
    validation.data;

  const membre = await estMembreDuFoyer(utilisateurId, foyerId);

  if (!membre) {
    return NextResponse.json({ message: "Action réservée aux membres du foyer" }, { status: 403 });
  }

  const evenement = await prisma.evenement.create({
    data: {
      foyerId,
      createurId: utilisateurId,
      type,
      titre,
      description: description ?? null,
      dateDebut: new Date(dateDebut),
      dateFin: dateFin ? new Date(dateFin) : null,
      lieu: lieu ?? null,
    },
  });

  return NextResponse.json({ evenement }, { status: 201 });
}
