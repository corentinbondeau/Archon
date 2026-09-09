import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { SchemaConnexion } from "@/lib/validations";
import { prisma } from "@/lib/prisma";

export const optionsAuth: NextAuthOptions = {
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "Email et mot de passe",
      credentials: {
        email: { label: "Email", type: "email" },
        motDePasse: { label: "Mot de passe", type: "password" },
      },
      async authorize(credentials) {
        const donneesParsees = SchemaConnexion.safeParse(credentials);
        if (!donneesParsees.success) {
          return null;
        }

        const utilisateur = await prisma.utilisateur.findUnique({
          where: { email: donneesParsees.data.email },
        });

        if (!utilisateur) {
          return null;
        }

        const motDePasseValide = await compare(
          donneesParsees.data.motDePasse,
          utilisateur.motDePasseHash
        );

        if (!motDePasseValide) {
          return null;
        }

        return {
          id: utilisateur.id,
          email: utilisateur.email,
          name: `${utilisateur.prenom} ${utilisateur.nom}`,
        };
      },
    }),
  ],
  callbacks: {
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? "";
      }
      return session;
    },
  },
};
