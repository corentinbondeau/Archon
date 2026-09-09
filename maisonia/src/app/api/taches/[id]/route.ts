import { NextResponse } from "next/server";
import { SchemaMiseAJourTache } from "@/lib/validations";
import { prisma } from "@/lib/prisma";
import { estMembreDuFoyer, obtenirUtilisateurConnecte } from "@/lib/foyer";

type ParametresRoute = {
  params: { id: string };
};

export async function PATCH(
  requete: Request,
  { params }: ParametresRoute
): Promise<NextResponse> {
  const utilisateurId = await obtenirUtilisateurConnecte();

  if (!utilisateurId) {
    return NextResponse.json({ message: "Authentification requise" }, { status: 401 });
  }

  const id = params.id;
  const tacheExistante = await prisma.tache.findUnique({
    where: { id },
    select: { id: true, foyerId: true },
  });

  if (!tacheExistante) {
    return NextResponse.json({ message: "Tâche introuvable" }, { status: 404 });
  }

  if (!(await estMembreDuFoyer(utilisateurId, tacheExistante.foyerId))) {
    return NextResponse.json({ message: "Action réservée aux membres du foyer" }, { status: 403 });
  }

  let corps: unknown;
  try {
    corps = await requete.json();
  } catch {
    return NextResponse.json({ message: "Payload invalide" }, { status: 400 });
  }

  const validation = SchemaMiseAJourTache.safeParse(corps);

  if (!validation.success) {
    return NextResponse.json({ message: "Payload invalide" }, { status: 400 });
  }

  const { statut, assigneA } = validation.data;

  if (assigneA && !(await estMembreDuFoyer(assigneA, tacheExistante.foyerId))) {
    return NextResponse.json({ message: "Le membre assigné n'appartient pas au foyer" }, { status: 403 });
  }

  const tache = await prisma.tache.update({
    where: { id },
    data: {
      statut: statut ?? undefined,
      assigneA: assigneA ?? undefined,
    },
  });

  return NextResponse.json({ tache }, { status: 200 });
}
