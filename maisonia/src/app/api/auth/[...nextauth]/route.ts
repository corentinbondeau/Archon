import NextAuth from "next-auth";
import { optionsAuth } from "@/lib/auth";

const gestionnaireAuth = NextAuth(optionsAuth);

export { gestionnaireAuth as GET, gestionnaireAuth as POST };
