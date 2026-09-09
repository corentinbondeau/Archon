import { NextResponse } from "next/server";
import { SchemaEnvoiMessage } from "@/lib/validations";
import { prisma } from "@/lib/prisma";
import { estMembreDuFoyer, obtenirUtilisateurConnecte } from "@/lib/foyer";

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

  if (!(await estMembreDuFoyer(utilisateurId, foyerId))) {
    return NextResponse.json({ message: "Action réservée aux membres du foyer" }, { status: 403 });
  }

  const conversations = await prisma.conversation.findMany({
    where: { foyerId },
    include: {
      messages: {
        orderBy: { dateCreation: "asc" },
      },
    },
    orderBy: { dateMiseAJour: "desc" },
  });

  return NextResponse.json({ conversations }, { status: 200 });
}

export async function POST(requete: Request): Promise<NextResponse> {
  const utilisateurId = await obtenirUtilisateurConnecte();

  if (!utilisateurId) {
    return NextResponse.json({ message: "Authentification requise" }, { status: 401 });
  }

  const url = new URL(requete.url);
  const conversationId = url.searchParams.get("conversationId");

  if (!conversationId) {
    return NextResponse.json({ message: "Identifiant de conversation requis" }, { status: 400 });
  }

  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    select: { id: true, foyerId: true },
  });

  if (!conversation) {
    return NextResponse.json({ message: "Conversation introuvable" }, { status: 404 });
  }

  if (!(await estMembreDuFoyer(utilisateurId, conversation.foyerId))) {
    return NextResponse.json({ message: "Action réservée aux membres du foyer" }, { status: 403 });
  }

  const corps = await requete.json().catch(() => null);
  const validation = SchemaEnvoiMessage.safeParse(corps);

  if (!validation.success) {
    return NextResponse.json({ message: "Payload invalide" }, { status: 400 });
  }

  const message = await prisma.message.create({
    data: {
      conversationId: conversation.id,
      auteurId: utilisateurId,
      contenu: validation.data.contenu,
    },
  });

  return NextResponse.json({ message }, { status: 201 });
}
