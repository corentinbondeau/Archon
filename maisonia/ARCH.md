# ARCH — Maisonia

> **Domaine métier** : Organiser la vie de famille.
> **Interface** : mobile-first.
> **Stack** : Next.js (App Router) + TypeScript (zéro `any`) + Tailwind CSS + Prisma (SQLite) + NextAuth (credentials).

Ce document est la **référence contractuelle** pour toutes les étapes suivantes
(backend, frontend, QA, DevOps). Tout artefact produit doit respecter
fidèlement l'arborescence, les modèles de données et les contrats d'API
définis ci-dessous. **Aucun placeholder générique n'est admis** : le nommage
reflète exclusivement le domaine métier.

---

## 1. Arborescence

```
maisonia/
├── package.json                # Scripts build / dev / lint / test / db
├── tsconfig.json               # TypeScript strict, zéro any
├── tailwind.config.ts          # Palette Maisonia (tokens hexadécimaux)
├── postcss.config.mjs
├── next.config.mjs
├── next-env.d.ts
├── .eslintrc.json
├── vitest.config.ts
├── .env.example
├── .gitignore
├── prisma/
│   ├── schema.prisma           # Modèles de données (source de vérité)
│   └── seed.ts                 # Données de démonstration foyer
├── src/
│   ├── app/
│   │   ├── layout.tsx          # Racine (html/body, lang fr)
│   │   ├── page.tsx            # Page d'accueil publique
│   │   ├── globals.css         # Directives Tailwind + tokens CSS
│   │   ├── (auth)/
│   │   │   ├── layout.tsx      # Gabarit des pages d'authentification
│   │   │   ├── login/          # Connexion
│   │   │   ├── register/       # Inscription
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx      # Gabarit tableau de bord (navigation)
│   │   │   ├── families/
│   │   │   │   └── [id]/       # Détail d'un foyer
│   │   │   ├── events/
│   │   │   │   └── [id]/       # Détail d'un évènement
│   │   │   ├── taches/          # Liste des tâches
│   │   │   ├── messages/        # Conversations familiales
│   │   │   ├── agenda/          # Calendrier familial
│   │   │   └── parametres/      # Paramètres du compte / du foyer
│   │   └── api/
│   │       ├── auth/[...nextauth]/route.ts  # NextAuth (credentials)
│   │       ├── foyers/route.ts              # POST créer un foyer
│   │       ├── evenements/route.ts          # POST créer un évènement
│   │       ├── taches/route.ts              # GET / POST tâches
│   │       ├── taches/[id]/route.ts         # PATCH statut tâche
│   │       └── conversations/route.ts       # GET / POST messages
│   ├── components/
│   │   ├── layout/             # Navigation, en-tête, pied de foyer
│   │   ├── features/           # Composants métier (foyer, évènement, tâche…)
│   │   └── ui/                 # Primitives (Bouton, Champ…)
│   ├── hooks/                  # Hooks métier (useTaches, useEvenements…)
│   ├── lib/
│   │   ├── auth.ts             # Configuration NextAuth
│   │   ├── foyer.ts            # Helpers foyer (session, membership, contexte)
│   │   ├── format.ts           # Utilitaires de formatage (dates, initiales)
│   │   ├── prisma.ts           # Client Prisma singleton
│   │   └── validations.ts      # Schémas Zod (source de vérité validation)
│   └── types/
│       ├── domaine.ts          # Types métier partagés (zéro any)
│       └── next-auth.d.ts      # Augmentation de la session
└── tests/                      # Tests unitaires (Vitest)
```

---

## 2. Design system

### Palette (tokens hexadécimaux — ne pas dévier)

| Rôle       | Valeur   | Classes Tailwind exposées                          |
| ---------- | -------- | -------------------------------------------------- |
| Primaire   | `#0ea5e9`| `primaire`, `primaire-clair`, `primaire-fonce`     |
| Secondaire | `#8b5cf6`| `secondaire`, `secondaire-clair`, `secondaire-fonce` |
| Fond       | `#0f172a`| `fond`, `fond-surface`, `fond-surface-claire`      |
| Texte      | `#f8fafc`| `texte`, `texte-adouci`, `texte-attenue`           |
| Accent     | `#f59e0b`| `accent`, `accent-clair`, `accent-fonce`           |

Les mêmes valeurs sont exposées en **variables CSS** (`--couleur-primaire`, etc.)
dans `globals.css` pour toute consommation hors-Tailwind.

### Principes d'interface
- Mobile-first : les gabarits partent de `grid-cols-1` puis s'élargissent.
- États UI obligatoires : `chargement`, `vide`, `erreur`, `succès`.
- Copie 100 % métier, en français, adaptée au domaine familial.

---

## 3. Modèles de données (Prisma / SQLite)

Source de vérité : `prisma/schema.prisma`. Modèles :

| Modèle        | Rôle                                    |
| ------------- | --------------------------------------- |
| `Utilisateur` | Compte (nom, prénom, email, hash mot de passe) |
| `Foyer`       | Unité familiale, code d'invitation      |
| `FoyerMembre` | Appartenance d'un utilisateur à un foyer (rôle `parent` / `enfant`) |
| `Evenement`   | Rendez-vous ou indisponibilité familiale (type `evenement` / `indisponibilite`, date, lieu, invitations) |
| `Invitation`  | Réponse à un évènement (`en_attente` / `acceptee` / `declinee`) |
| `Tache`       | Tâche ménagère (statut, assigné, échéance) |
| `Conversation`| Fil de discussion du foyer             |
| `Message`     | Message d'une conversation              |

### Enumerations applicatives (chaînes constantes)
- Type d'évènement : `"evenement"` | `"indisponibilite"`
- Rôle de foyer : `"parent"` | `"enfant"`
- Statut d'invitation : `"en_attente"` | `"acceptee"` | `"declinee"`
- Statut de tâche : `"a_faire"` | `"en_cours"` | `"terminee"`

---

## 4. Contrats d'API

Toutes les réponses hors authentification exigent une session valide
(NextAuth JWT). Les corps sont validés par les schémas Zod de
`src/lib/validations.ts`.

### Authentification (NextAuth credentials)
| Méthode | Chemin                              | Corps                          | Succès |
| ------- | ----------------------------------- | ------------------------------ | ------ |
| POST    | `/api/auth/callback/credentials`    | `email` + `motDePasse`         | session |
| POST    | `/api/auth/signin`                  | (formulaire)                   | redirection |

### Foyer
| Méthode | Chemin          | Corps Zod                  | Succès          |
| ------- | --------------- | -------------------------- | --------------- |
| POST    | `/api/foyers`   | `SchemaCreationFoyer`      | `201` foyer créé |

> Le détail d'un foyer (avec ses membres) est obtenu côté serveur via
> `obtenirContexteFoyer()` dans les pages du tableau de bord.

### Évènements
| Méthode | Chemin         | Corps Zod                  | Succès            |
| ------- | -------------- | -------------------------- | ----------------- |
| POST    | `/api/evenements` | `SchemaCreationEvenement` (type `evenement` / `indisponibilite`) | `201` évènement |

### Tâches
| Méthode | Chemin             | Corps Zod                        | Succès      |
| ------- | ------------------ | -------------------------------- | ----------- |
| GET     | `/api/taches`      | — (foyerId en query)             | `200` liste |
| POST    | `/api/taches`      | `SchemaCreationTache`            | `201` tâche |
| PATCH   | `/api/taches/[id]` | `SchemaMiseAJourTache` (statut et/ou `assigneA` pour prendre / répartir) | `200` tâche |

### Conversations
| Méthode | Chemin      | Corps Zod                | Succès      |
| ------- | ----------- | ------------------------ | ----------- |
| GET     | `/api/conversations` | —              | `200` liste |
| POST    | `/api/conversations` | `SchemaEnvoiMessage` | `201` message |

**Conventions d'erreur** : `400` validation Zod, `401` non authentifié,
`403` hors foyer, `404` introuvable, `409` conflit (email déjà utilisé).

---

## 5. Choix techniques et règles de qualité

1. **Zéro `any`** : le `tsconfig.json` active `noImplicitAny`, `strict` et tous
   les contrôles stricts. Une erreur de type bloque `typecheck` et `build`.
2. **Zéro composant générique** : chaque composant de `components/features`
   est nommé selon le métier (`CarteEvenement`, `ListeTaches`,
   `FormulaireCreationFoyer`, etc.). Les primitives de `components/ui` restent
   génériques par nature (Bouton, Champ).
3. **Validation unique** : les schémas Zod de `lib/validations.ts` sont la
   seule source de validation des corps de requêtes et des formulaires.
4. **Client Prisma singleton** : `lib/prisma.ts` réutilise un unique
   `PrismaClient` hors production (pattern Next.js officiel).
5. **Sécurité** : mots de passe hashés (`bcryptjs`), jamais en clair ;
   jamais de secret commité (`.env.*` gitignoré). Le secret NextAuth vit dans
   `.env.local`.
6. **Langue** : toute la copie, le nommage et les messages sont en français,
   alignés domaine familial.

---

## 6. Scripts racine

| Script            | Action                                          |
| ----------------- | ----------------------------------------------- |
| `npm run dev`     | Serveur de développement Next.js                |
| `npm run build`   | Build de production Next.js                     |
| `npm run start`   | Serveur de production Next.js                   |
| `npm run lint`    | ESLint (next/core-web-vitals)                   |
| `npm run typecheck`| TypeScript strict sans émission (`tsc --noEmit`)|
| `npm test`        | Tests unitaires Vitest                           |
| `npm run db:generate` | Génération du client Prisma                  |
| `npm run db:push` | Synchronisation du schéma SQLite               |
| `npm run db:seed` | Insertion des données de démonstration          |
| `npm run db:studio` | Interface Prisma Studio                       |

---

## 7. Points d'attention pour les étapes suivantes

- **Backend** : implémenter les route handlers en respectant les schémas Zod
  et les conventions d'erreur du §4. Ne pas étendre le schéma Prisma sans mettre
  à jour ce document.
- **Frontend** : ne créer que les composants métier documentés ; respecter la
  palette (§2) et les états obligatoires.
- **QA** : vérifier `npm run typecheck` (zéro `any`) et `npm test`.
- **DevOps** : fournir `.env.example`, README d'exploitation et cible de
  déploiement sans écraser les fichiers produits par les étapes précédentes.
