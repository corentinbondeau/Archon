import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function principal(): Promise<void> {
  const motDePasse = await hash("motdepasse-demo", 10);

  const utilisateurParent = await prisma.utilisateur.upsert({
    where: { email: "parent@maisonia.app" },
    update: {},
    create: {
      nom: "Martin",
      prenom: "Claire",
      email: "parent@maisonia.app",
      motDePasseHash: motDePasse,
    },
  });

  const foyerDemo = await prisma.foyer.create({
    data: {
      nom: "Le foyer Martin",
      codeInvitation: "MARTIN-24",
      membres: {
        create: [
          {
            utilisateurId: utilisateurParent.id,
            role: "parent",
          },
        ],
      },
    },
  });

  console.log("Foyer de démonstration créé :", foyerDemo.nom);
}

principal()
  .catch((erreur) => {
    console.error(erreur);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
