import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 px-6">
      <header className="text-center">
        <h1 className="text-3xl font-semibold text-foreground">
          Démo Lancement Auto
        </h1>
        <p className="mt-2 text-secondary">
          Démonstration du lancement automatique des programmes de produits.
        </p>
      </header>

      <nav className="flex gap-4">
        <Link
          href="/login"
          className="rounded bg-primary px-4 py-2 text-sm font-medium text-background"
        >
          Accéder à la console
        </Link>
      </nav>
    </main>
  );
}