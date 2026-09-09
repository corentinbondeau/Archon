import { prisma } from "@demo-app/database";
import { hash } from "bcryptjs";

async function main() {
  const demoEmail = "demo@lancement-auto.fr";
  const existing = await prisma.user.findUnique({
    where: { email: demoEmail },
  });

  const operator =
    existing ??
    (await prisma.user.create({
      data: {
        email: demoEmail,
        name: "Opérateur Démo",
        hashedPassword: await hash("demo-lancement-auto", 10),
      },
    }));

  const programCount = await prisma.launchProgram.count();
  if (programCount === 0) {
    const program = await prisma.launchProgram.create({
      data: {
        title: "Lancement de démonstration",
        description:
          "Programme de référence pour illustrer un lancement automatique planifié.",
        triggerKind: "SCHEDULED",
        scheduleExpression: "every day at 18h00",
        isEnabled: true,
      },
    });

    await prisma.launchExecution.create({
      data: {
        programId: program.id,
        status: "PENDING",
        note: "Prochaine exécution planifiée du lancement de démonstration.",
      },
    });
  }

  console.log(
    `Seed terminé — opérateur démo : ${operator.email} (mot de passe : demo-lancement-auto)`,
  );
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  })