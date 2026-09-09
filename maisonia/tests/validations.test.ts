// @vitest-environment node
import { describe, it, expect } from "vitest";
import {
  SchemaInscription,
  SchemaConnexion,
  SchemaCreationFoyer,
  SchemaCreationEvenement,
  SchemaCreationTache,
  SchemaMiseAJourTache,
  SchemaEnvoiMessage,
} from "@/lib/validations";

function messagesDe(issues: { message: string }[]): string[] {
  return issues.map((issue) => issue.message);
}

describe("SchemaInscription", () => {
  it("accepte une inscription valide", () => {
    const donnees = {
      nom: "Martin",
      prenom: "Camille",
      email: "camille@maisonia.app",
      motDePasse: "motdepasse-securise",
      confirmationMotDePasse: "motdepasse-securise",
    };
    expect(SchemaInscription.safeParse(donnees).success).toBe(true);
  });

  it("rejette un mot de passe trop court", () => {
    const donnees = {
      nom: "Martin",
      prenom: "Camille",
      email: "camille@maisonia.app",
      motDePasse: "court",
      confirmationMotDePasse: "court",
    };
    const resultat = SchemaInscription.safeParse(donnees);
    expect(resultat.success).toBe(false);
    if (!resultat.success) {
      expect(messagesDe(resultat.error.issues)).toContain(
        "Le mot de passe doit contenir au moins 8 caractères"
      );
    }
  });

  it("rejette des mots de passe non concordants", () => {
    const donnees = {
      nom: "Martin",
      prenom: "Camille",
      email: "camille@maisonia.app",
      motDePasse: "motdepasse-securise",
      confirmationMotDePasse: "autre-motdepasse",
    };
    const resultat = SchemaInscription.safeParse(donnees);
    expect(resultat.success).toBe(false);
    if (!resultat.success) {
      expect(messagesDe(resultat.error.issues)).toContain(
        "Les mots de passe ne correspondent pas"
      );
    }
  });

  it("rejette un email invalide", () => {
    const donnees = {
      nom: "Martin",
      prenom: "Camille",
      email: "pas-un-email",
      motDePasse: "motdepasse-securise",
      confirmationMotDePasse: "motdepasse-securise",
    };
    const resultat = SchemaInscription.safeParse(donnees);
    expect(resultat.success).toBe(false);
    if (!resultat.success) {
      expect(messagesDe(resultat.error.issues)).toContain(
        "Adresse email invalide"
      );
    }
  });
});

describe("SchemaConnexion", () => {
  it("accepte des identifiants valides", () => {
    const donnees = {
      email: "camille@maisonia.app",
      motDePasse: "motdepasse-securise",
    };
    expect(SchemaConnexion.safeParse(donnees).success).toBe(true);
  });

  it("rejette un email invalide", () => {
    const donnees = { email: "invalide", motDePasse: "motdepasse" };
    expect(SchemaConnexion.safeParse(donnees).success).toBe(false);
  });

  it("rejette un mot de passe vide", () => {
    const donnees = { email: "camille@maisonia.app", motDePasse: "" };
    expect(SchemaConnexion.safeParse(donnees).success).toBe(false);
  });
});

describe("SchemaCreationFoyer", () => {
  it("accepte un nom de foyer valide", () => {
    expect(SchemaCreationFoyer.safeParse({ nom: "Le foyer Martin" }).success).toBe(
      true
    );
  });

  it("rejette un nom de foyer vide", () => {
    const resultat = SchemaCreationFoyer.safeParse({ nom: "" });
    expect(resultat.success).toBe(false);
    if (!resultat.success) {
      expect(messagesDe(resultat.error.issues)).toContain(
        "Le nom du foyer est requis"
      );
    }
  });
});

describe("SchemaCreationEvenement", () => {
  const evenementValide = {
    foyerId: "foyer-1",
    type: "evenement",
    titre: "Sortie au parc",
    dateDebut: "2026-09-15T09:00:00.000Z",
  };

  it("accepte un évènement valide", () => {
    expect(SchemaCreationEvenement.safeParse(evenementValide).success).toBe(true);
  });

  it("accepte une indisponibilité valide avec champs facultatifs", () => {
    const donnees = {
      ...evenementValide,
      type: "indisponibilite",
      description: "Absence pour rendez-vous médical",
      dateFin: "2026-09-15T11:00:00.000Z",
      lieu: "Cabinet dentaire",
    };
    expect(SchemaCreationEvenement.safeParse(donnees).success).toBe(true);
  });

  it("rejette un type d'évènement inconnu", () => {
    const donnees = { ...evenementValide, type: "reunion" };
    expect(SchemaCreationEvenement.safeParse(donnees).success).toBe(false);
  });

  it("rejette un titre vide", () => {
    const donnees = { ...evenementValide, titre: "" };
    const resultat = SchemaCreationEvenement.safeParse(donnees);
    expect(resultat.success).toBe(false);
    if (!resultat.success) {
      expect(messagesDe(resultat.error.issues)).toContain(
        "Le titre de l'évènement est requis"
      );
    }
  });

  it("rejette une dateDebut qui n'est pas une date ISO", () => {
    const donnees = { ...evenementValide, dateDebut: "15/09/2026" };
    expect(SchemaCreationEvenement.safeParse(donnees).success).toBe(false);
  });
});

describe("SchemaCreationTache", () => {
  const tacheValide = {
    foyerId: "foyer-1",
    titre: "Vider le lave-vaisselle",
  };

  it("accepte une tâche valide", () => {
    expect(SchemaCreationTache.safeParse(tacheValide).success).toBe(true);
  });

  it("accepte une tâche assignée avec échéance", () => {
    const donnees = {
      ...tacheValide,
      assigneA: "utilisateur-1",
      dateEcheance: "2026-09-20T18:00:00.000Z",
      description: "Ranger aussi la vaisselle propre",
    };
    expect(SchemaCreationTache.safeParse(donnees).success).toBe(true);
  });

  it("rejette une tâche sans titre", () => {
    const donnees = { foyerId: "foyer-1", titre: "" };
    const resultat = SchemaCreationTache.safeParse(donnees);
    expect(resultat.success).toBe(false);
    if (!resultat.success) {
      expect(messagesDe(resultat.error.issues)).toContain(
        "Le titre de la tâche est requis"
      );
    }
  });

  it("rejette une date d'échéance non ISO", () => {
    const donnees = { ...tacheValide, dateEcheance: "20/09/2026" };
    expect(SchemaCreationTache.safeParse(donnees).success).toBe(false);
  });
});

describe("SchemaMiseAJourTache", () => {
  it("accepte une mise à jour de statut seul", () => {
    expect(
      SchemaMiseAJourTache.safeParse({ statut: "en_cours" }).success
    ).toBe(true);
  });

  it("accepte une répartition seule (assigneA)", () => {
    expect(
      SchemaMiseAJourTache.safeParse({ assigneA: "utilisateur-2" }).success
    ).toBe(true);
  });

  it("accepte statut et assignation combinés", () => {
    expect(
      SchemaMiseAJourTache.safeParse({
        statut: "terminee",
        assigneA: "utilisateur-2",
      }).success
    ).toBe(true);
  });

  it("rejette un corps vide (aucune modification)", () => {
    const resultat = SchemaMiseAJourTache.safeParse({});
    expect(resultat.success).toBe(false);
    if (!resultat.success) {
      expect(messagesDe(resultat.error.issues)).toContain(
        "Au moins une modification (statut ou assignation) est requise"
      );
    }
  });

  it("rejette un statut hors enumerations", () => {
    expect(SchemaMiseAJourTache.safeParse({ statut: "resolu" }).success).toBe(
      false
    );
  });
});

describe("SchemaEnvoiMessage", () => {
  it("accepte un message non vide", () => {
    expect(
      SchemaEnvoiMessage.safeParse({ contenu: "Rendez-vous ce soir" }).success
    ).toBe(true);
  });

  it("rejette un message vide", () => {
    const resultat = SchemaEnvoiMessage.safeParse({ contenu: "" });
    expect(resultat.success).toBe(false);
    if (!resultat.success) {
      expect(messagesDe(resultat.error.issues)).toContain(
        "Le message ne peut pas être vide"
      );
    }
  });
});
