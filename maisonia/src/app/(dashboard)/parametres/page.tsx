import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { optionsAuth } from "@/lib/auth";
import { obtenirContexteFoyer } from "@/lib/foyer";
import { BadgeCodeInvitation } from "@/components/features/BadgeCodeInvitation";
import { Etat } from "@/components/ui/Etat";
import { initialesDe } from "@/lib/format";

export default async function PageParametres(): Promise<React.JSX.Element> {
  const session = await getServerSession(optionsAuth);
  if (!session?.user?.id) {
    redirect("/login");
  }

  const contexte = await obtenirContexteFoyer(session.user.id);

  if (!contexte) {
    return (
      <Etat
        type="vide"
        titre="Aucun foyer"
        description="Créez ou rejoignez un foyer pour configurer les paramètres familiaux."
      />
    );
  }

  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-xl font-bold text-texte">Paramètres du foyer</h1>
        <p className="mt-0.5 text-sm text-texte-adouci">
          Gérez les informations et l&apos;accès de {contexte.nom}.
        </p>
      </section>

      <section className="surface-carte">
        <h2 className="mb-3 text-base font-semibold text-texte">
          Informations du foyer
        </h2>
        <dl className="space-y-3">
          <div>
            <dt className="text-xs uppercase tracking-wide text-texte-attenue">
              Nom du foyer
            </dt>
            <dd className="mt-1 text-texte">{contexte.nom}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-texte-attenue">
              Code d&apos;invitation
            </dt>
            <dd className="mt-2">
              <BadgeCodeInvitation code={contexte.codeInvitation} />
            </dd>
            <p className="mt-2 text-xs text-texte-attenue">
              Partagez ce code pour que vos proches rejoignent {contexte.nom}.
            </p>
          </div>
        </dl>
      </section>

      <section className="surface-carte">
        <h2 className="mb-3 text-base font-semibold text-texte">Membres</h2>
        <ul className="space-y-3">
          {contexte.membres.map((membre) => (
            <li key={membre.id} className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-secondaire/20 text-sm font-bold text-secondaire">
                {initialesDe(
                  membre.utilisateur.prenom,
                  membre.utilisateur.nom
                )}
              </span>
              <div className="flex-1">
                <p className="text-sm font-medium text-texte">
                  {membre.utilisateur.prenom} {membre.utilisateur.nom}
                </p>
                <p className="text-xs text-texte-attenue">
                  {membre.utilisateur.email}
                </p>
              </div>
              <span
                className={
                  membre.role === "parent"
                    ? "rounded-full bg-primaire/15 px-2 py-0.5 text-xs font-medium text-primaire"
                    : "rounded-full bg-fond px-2 py-0.5 text-xs font-medium text-texte-adouci"
                }
              >
                {membre.role === "parent" ? "Parent" : "Enfant"}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
