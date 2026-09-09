import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import Link from "next/link";
import { optionsAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { obtenirContexteFoyer } from "@/lib/foyer";
import { FormulaireCreationFoyer } from "@/components/features/FormulaireCreationFoyer";
import { CarteEvenement } from "@/components/features/CarteEvenement";
import { CarteTache } from "@/components/features/CarteTache";
import { Etat } from "@/components/ui/Etat";
import type { EvenementDomaine, TacheDomaine } from "@/types/domaine";

export default async function PageTableauDeBord(): Promise<React.JSX.Element> {
  const session = await getServerSession(optionsAuth);
  if (!session?.user?.id) {
    redirect("/login");
  }

  const contexte = await obtenirContexteFoyer(session.user.id);

  if (!contexte) {
    return <GabaritCreationFoyer />;
  }

  const maintenant = new Date();

  const [evenementsBrut, tachesBrut] = await Promise.all([
    prisma.evenement.findMany({
      where: { foyerId: contexte.foyerId },
      orderBy: { dateDebut: "asc" },
      take: 6,
    }),
    prisma.tache.findMany({
      where: { foyerId: contexte.foyerId, statut: { not: "terminee" } },
      orderBy: [{ dateEcheance: "asc" }],
      take: 5,
    }),
  ]);

  const nomsParUtilisateur: Record<string, string> = {};
  for (const membre of contexte.membres) {
    nomsParUtilisateur[membre.utilisateur.id] =
      `${membre.utilisateur.prenom} ${membre.utilisateur.nom}`;
  }

  const evenements: EvenementDomaine[] = evenementsBrut.map((e) => ({
    id: e.id,
    foyerId: e.foyerId,
    createurId: e.createurId,
    type: e.type as "evenement" | "indisponibilite",
    titre: e.titre,
    description: e.description,
    dateDebut: e.dateDebut.toISOString(),
    dateFin: e.dateFin?.toISOString() ?? null,
    lieu: e.lieu,
  }));

  const taches: TacheDomaine[] = tachesBrut.map((t) => ({
    id: t.id,
    foyerId: t.foyerId,
    titre: t.titre,
    description: t.description,
    assigneA: t.assigneA,
    statut: t.statut as "a_faire" | "en_cours" | "terminee",
    dateEcheance: t.dateEcheance?.toISOString() ?? null,
  }));

  const aujourDhui = maintenant.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const tachesPrioritaires = taches.filter(
    (t) => t.statut === "a_faire" || t.statut === "en_cours"
  );

  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-xl font-bold text-texte">Le foyer {contexte.nom}</h1>
        <p className="mt-1 text-texte-adouci">Aujourd&apos;hui, {aujourDhui}</p>
      </section>

      <section className="surface-carte">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold text-texte">
            Prochains évènements
          </h2>
          <Link href="/agenda" className="text-sm font-medium text-primaire hover:underline">
            Voir le calendrier
          </Link>
        </div>
        {evenements.length === 0 ? (
          <Etat
            type="vide"
            titre="Calendrier du foyer vide"
            description="Aucun évènement ni indisponibilité planifié pour le moment."
          />
        ) : (
          <ul className="space-y-3">
            {evenements.slice(0, 3).map((evenement) => (
              <li key={evenement.id}>
                <CarteEvenement
                  evenement={evenement}
                  nomCreateur={nomsParUtilisateur[evenement.createurId]}
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="surface-carte">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold text-texte">Tâches prioritaires</h2>
          <Link href="/taches" className="text-sm font-medium text-primaire hover:underline">
            Toutes les tâches
          </Link>
        </div>
        {tachesPrioritaires.length === 0 ? (
          <Etat
            type="vide"
            titre="Toutes les tâches sont faites"
            description="Bravo, aucune tâche en attente. Profitez de votre foyer !"
          />
        ) : (
          <ul className="space-y-3">
            {tachesPrioritaires.slice(0, 4).map((tache) => (
              <li key={tache.id}>
                <CarteTache
                  tache={tache}
                  nomAssigne={
                    tache.assigneA ? nomsParUtilisateur[tache.assigneA] : undefined
                  }
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="surface-carte">
        <h2 className="mb-2 text-base font-semibold text-texte">Membres du foyer</h2>
        <ul className="space-y-2">
          {contexte.membres.map((membre) => (
            <li key={membre.id} className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-secondaire/20 text-sm font-semibold text-secondaire">
                {membre.utilisateur.prenom.charAt(0)}
                {membre.utilisateur.nom.charAt(0)}
              </span>
              <div>
                <p className="text-sm font-medium text-texte">
                  {membre.utilisateur.prenom} {membre.utilisateur.nom}
                </p>
                <p className="text-xs text-texte-attenue">{membre.role}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function GabaritCreationFoyer(): React.JSX.Element {
  return (
    <div className="space-y-4">
      <section className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-secondaire/15">
          <svg className="h-9 w-9 text-secondaire" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 3L2 12h3v8h6v-6h2v6h6v-8h3L12 3z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-texte">
          Bienvenue dans votre foyer
        </h1>
        <p className="mt-2 text-texte-adouci">
          Pour commencer à organiser la vie de famille, créez votre foyer.
          Chaque membre pourra ensuite consulter le calendrier et partager les
          tâches.
        </p>
      </section>

      <div className="surface-carte">
        <FormulaireCreationFoyer />
      </div>
    </div>
  );
}
