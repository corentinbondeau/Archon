import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Démo Lancement Auto",
  description:
    "Démonstration du lancement automatique : programmes et exécutions de lancement.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}