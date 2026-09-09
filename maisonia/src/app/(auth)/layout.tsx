import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Authentification · Maisonia",
};

export default function LayoutAuthentification({
  children,
}: {
  children: ReactNode;
}): ReactNode {
  return <main className="min-h-screen bg-fond">{children}</main>;
}
