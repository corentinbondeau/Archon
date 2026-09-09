export type RoleFoyer = "parent" | "enfant";

export type TypeEvenement = "evenement" | "indisponibilite";

export type StatutInvitation = "en_attente" | "acceptee" | "declinee";

export type StatutTache = "a_faire" | "en_cours" | "terminee";

export interface UtilisateurDomaine {
  id: string;
  nom: string;
  prenom: string;
  email: string;
}

export interface MembreFoyer {
  id: string;
  role: RoleFoyer;
  utilisateur: UtilisateurDomaine;
}

export interface FoyerDomaine {
  id: string;
  nom: string;
  codeInvitation: string;
  membres: MembreFoyer[];
}

export interface EvenementDomaine {
  id: string;
  foyerId: string;
  createurId: string;
  type: TypeEvenement;
  titre: string;
  description: string | null;
  dateDebut: string;
  dateFin: string | null;
  lieu: string | null;
}

export interface TacheDomaine {
  id: string;
  foyerId: string;
  titre: string;
  description: string | null;
  assigneA: string | null;
  statut: StatutTache;
  dateEcheance: string | null;
}

export interface MessageDomaine {
  id: string;
  conversationId: string;
  auteurId: string;
  contenu: string;
  dateCreation: string;
}

export interface ConversationDomaine {
  id: string;
  foyerId: string;
  titre: string;
  messages: MessageDomaine[];
}

export interface ReponseEvenement {
  evenement: EvenementDomaine;
}

export interface ReponseTache {
  tache: TacheDomaine;
}

export interface ReponseListeTaches {
  taches: TacheDomaine[];
}

export interface ReponseConversations {
  conversations: ConversationDomaine[];
}

export interface ReponseMessage {
  message: MessageDomaine;
}
