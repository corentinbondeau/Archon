import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Maisonia",
  description: "Organiser la vie de famille au quotidien",
};

export default function LayoutRacine({
  children,
}: {
  children: ReactNode;
}): ReactNode {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
