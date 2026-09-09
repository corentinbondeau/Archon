import Link from "next/link";
import { FormulaireConnexion } from "@/components/features/FormulaireConnexion";

export default function PageLogin(): React.JSX.Element {
  return (
    <section className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-8">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primaire/15">
          <svg className="h-9 w-9 text-primaire" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2L3 7v10l9 5 9-5V7l-9-5zm0 2.18l7 3.89v6.86l-7 3.89-7-3.89V8.07l7-3.89z" />
            <path d="M12 7l-3.5 2v3.5l3.5 2 3.5-2V9L12 7z" fillOpacity="0.6" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-texte">Connexion à Maisonia</h1>
        <p className="mt-2 text-texte-adouci">
          Accédez à l&apos;organisation de votre vie de famille.
        </p>
      </div>

      <div className="surface-carte">
        <FormulaireConnexion />
      </div>

      <p className="mt-6 text-center text-sm text-texte-adouci">
        Pas encore de compte ?{" "}
        <Link href="/register" className="font-medium text-primaire hover:underline">
          Créer un compte
        </Link>
      </p>
    </section>
  );
}
