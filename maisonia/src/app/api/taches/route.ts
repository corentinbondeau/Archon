import { NextResponse } from "next/server";
import { SchemaCreationTache, type DonneesCreationTache } from "@/lib/validations";
import { prisma } from "@/lib/prisma";
import { estMembreDuFoyer, obtenirUtilisateurConnecte } from "@/lib/foyer";

async function validerMembre(
  utilisateurId: string,
  foyerId: string
): Promise<boolean> {
  return estMembreDuFoyer(utilisateurId, foyerId);
}

export async function GET(requete: Request): Promise<NextResponse> {
  const utilisateurId = await obtenirUtilisateurConnecte();

  if (!utilisateurId) {
    return NextResponse.json({ message: "Authentification requise" }, { status: 401 });
  }

  const url = new URL(requete.url);
  const foyerId = url.searchParams.get("foyerId");

  if (!foyerId) {
    return NextResponse.json({ message: "Identifiant du foyer requis" }, { status: 400 });
  }

  if (!(await validerMembre(utilisateurId, foyerId))) {
    return NextResponse.json({ message: "Action réservée aux membres du foyer" }, { status: 403 });
  }

  const taches = await prisma.tache.findMany({
    where: { foyerId },
    orderBy: [{ statut: "asc" }, { dateEcheance: "asc" }],
  });

  return NextResponse.json({ taches }, { status: 200 });
}

export async function POST(requete: Request): Promise<NextResponse> {
  const utilisateurId = await obtenirUtilisateurConnecte();

  if (!utilisateurId) {
    return NextResponse.json({ message: "Authentification requise" }, { status: 401 });
  }

  const corps = await requete.json().catch(() => null);
  const validation = SchemaCreationTache.safeParse(corps);

  if (!validation.success) {
    return NextResponse.json({ message: "Payload invalide" }, { status: 400 });
  }

  const donnees: DonneesCreationTache = validation.data;

  if (!(await validerMembre(utilisateurId, donnees.foyerId))) {
    return NextResponse.json({ message: "Action réservée aux membres du foyer" }, { status: 403 });
  }

  const assigneA: string | null = donnees.assigneA ?? null;

  if (assigneA && !(await estMembreDuFoyer(assigneA, donnees.foyerId))) {
    return NextResponse.json({ message: "Le membre assigné n'appartient pas au foyer" }, { status: 403 });
  }

  const tache = await prisma.tache.create({
    data: {
      foyerId: donnees.foyerId,
      titre: donnees.titre,
      description: donnees.description ?? null,
      assigneA,
      statut: "a_faire",
      dateEcheance: donnees.dateEcheance ? new Date(donnees.dateEcheance) : null,
    },
  });

  return NextResponse.json({ tache }, { status: 201 });
}
