import Link from "next/link";
import { FormulaireInscription } from "@/components/features/FormulaireInscription";

export default function PageInscription(): React.JSX.Element {
  return (
    <section className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-8">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-secondaire/15">
          <svg className="h-9 w-9 text-secondaire" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-texte">Créer votre compte</h1>
        <p className="mt-2 text-texte-adouci">
          Rejoignez ou créez votre foyer pour organiser votre vie de famille.
        </p>
      </div>

      <div className="surface-carte">
        <FormulaireInscription />
      </div>

      <p className="mt-6 text-center text-sm text-texte-adouci">
        Déjà membre ?{" "}
        <Link href="/login" className="font-medium text-primaire hover:underline">
          Se connecter
        </Link>
      </p>
    </section>
  );
}
