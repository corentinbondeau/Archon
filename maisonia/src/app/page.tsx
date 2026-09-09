import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { optionsAuth } from "@/lib/auth";

export default async function PageAccueil(): Promise<React.JSX.Element> {
  const session = await getServerSession(optionsAuth);

  if (session?.user?.id) {
    redirect("/tableau-de-bord");
  }

  return (
    <main className="flex min-h-screen flex-col bg-fond">
      <header className="px-4 py-4">
        <div className="mx-auto flex max-w-md items-center justify-between">
          <span className="flex items-center gap-2 text-lg font-bold text-texte">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primaire/15">
              <svg className="h-5 w-5 text-primaire" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2L3 7v10l9 5 9-5V7l-9-5zm0 2.18l7 3.89v6.86l-7 3.89-7-3.89V8.07l7-3.89z" />
              </svg>
            </span>
            Maisonia
          </span>
          <Link
            href="/login"
            className="rounded-xl bg-primaire px-4 py-2 text-sm font-semibold text-fond transition-colors hover:bg-primaire-fonce"
          >
            Se connecter
          </Link>
        </div>
      </header>

      <section className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-10 text-center">
        <h1 className="text-3xl font-bold leading-tight text-texte">
          Organiser la vie de famille,{" "}
          <span className="text-primaire">simplement.</span>
        </h1>
        <p className="mt-4 text-texte-adouci">
          Partagez le calendrier familial, répartissez les tâches ménagères et
          restez au courant du quotidien de votre foyer.
        </p>

        <ul className="mt-8 space-y-3 text-left">
          <Fonctionnalite
            titre="Un agenda partagé"
            description="Évènements et indisponibilités visibles par toute la famille."
          />
          <Fonctionnalite
            titre="Des tâches réparties équitablement"
            description="Prenez, assignez et suivez les tâches ménagères."
          />
          <Fonctionnalite
            titre="Une conversation de foyer"
            description="Échangez autour de la vie de famille au même endroit."
          />
        </ul>

        <div className="mt-8 space-y-3">
          <Link
            href="/register"
            className="block w-full rounded-xl bg-secondaire px-6 py-3 text-center font-semibold text-texte transition-colors hover:bg-secondaire-fonce"
          >
            Créer mon compte
          </Link>
          <Link
            href="/login"
            className="block w-full rounded-xl border-2 border-primaire px-6 py-3 text-center font-semibold text-primaire transition-colors hover:bg-primaire/10"
          >
            J&apos;ai déjà un compte
          </Link>
        </div>
      </section>
    </main>
  );
}

function Fonctionnalite({
  titre,
  description,
}: {
  titre: string;
  description: string;
}): React.JSX.Element {
  return (
    <li className="flex items-start gap-3 rounded-xl bg-fond-surface p-4">
      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/20">
        <svg className="h-4 w-4 text-accent" viewBox="0 0 20 20" fill="currentColor">
          <path
            fillRule="evenodd"
            d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
            clipRule="evenodd"
          />
        </svg>
      </span>
      <div>
        <h2 className="text-sm font-semibold text-texte">{titre}</h2>
        <p className="mt-0.5 text-xs text-texte-adouci">{description}</p>
      </div>
    </li>
  );
}
