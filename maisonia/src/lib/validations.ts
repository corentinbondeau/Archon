import { z } from "zod";

export const SchemaInscription = z
  .object({
    nom: z.string().min(1, "Le nom est requis"),
    prenom: z.string().min(1, "Le prénom est requis"),
    email: z.string().email("Adresse email invalide"),
    motDePasse: z.string().min(8, "Le mot de passe doit contenir au moins 8 caractères"),
    confirmationMotDePasse: z.string(),
  })
  .refine((donnees) => donnees.motDePasse === donnees.confirmationMotDePasse, {
    message: "Les mots de passe ne correspondent pas",
    path: ["confirmationMotDePasse"],
  });

export const SchemaConnexion = z.object({
  email: z.string().email("Adresse email invalide"),
  motDePasse: z.string().min(1, "Le mot de passe est requis"),
});

export const SchemaCreationFoyer = z.object({
  nom: z.string().min(1, "Le nom du foyer est requis"),
});

export const TypeEvenement = z.enum(["evenement", "indisponibilite"]);

export const SchemaCreationEvenement = z.object({
  foyerId: z.string().min(1, "L'identifiant du foyer est requis"),
  type: TypeEvenement,
  titre: z.string().min(1, "Le titre de l'évènement est requis"),
  description: z.string().optional(),
  dateDebut: z.string().datetime(),
  dateFin: z.string().datetime().optional(),
  lieu: z.string().optional(),
});

export const SchemaCreationTache = z.object({
  foyerId: z.string().min(1, "L'identifiant du foyer est requis"),
  titre: z.string().min(1, "Le titre de la tâche est requis"),
  description: z.string().optional(),
  assigneA: z.string().optional(),
  dateEcheance: z.string().datetime().optional(),
});

export const SchemaAttributionTache = z.object({
  assigneA: z.string().min(1, "L'identifiant du membre assigné est requis"),
});

export const SchemaMiseAJourStatutTache = z.object({
  statut: z.enum(["a_faire", "en_cours", "terminee"]),
});

export const SchemaMiseAJourTache = z
  .object({
    statut: z.enum(["a_faire", "en_cours", "terminee"]).optional(),
    assigneA: z.string().min(1, "L'identifiant du membre assigné est requis").optional(),
  })
  .refine(
    (donnees) => donnees.statut !== undefined || donnees.assigneA !== undefined,
    {
      message: "Au moins une modification (statut ou assignation) est requise",
    }
  );

export const SchemaEnvoiMessage = z.object({
  contenu: z.string().min(1, "Le message ne peut pas être vide"),
});

export type DonneesInscription = z.infer<typeof SchemaInscription>;
export type DonneesConnexion = z.infer<typeof SchemaConnexion>;
export type DonneesCreationFoyer = z.infer<typeof SchemaCreationFoyer>;
export type DonneesCreationEvenement = z.infer<typeof SchemaCreationEvenement>;
export type DonneesCreationTache = z.infer<typeof SchemaCreationTache>;
export type DonneesAttributionTache = z.infer<typeof SchemaAttributionTache>;
export type DonneesMiseAJourStatutTache = z.infer<typeof SchemaMiseAJourStatutTache>;
export type DonneesMiseAJourTache = z.infer<typeof SchemaMiseAJourTache>;
export type DonneesEnvoiMessage = z.infer<typeof SchemaEnvoiMessage>;
