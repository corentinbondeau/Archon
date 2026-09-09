# ARCH — Demo App (Démonstration du lancement automatique)

Document d'architecture de référence. Les étapes suivantes (backend, frontend, tests)
**doivent respecter fidèlement** les arborescences, modèles de données, contrats d'API
et règles de qualité décrites ci-dessous.

---

## 1. Périmètre et positionnement métier

**Demo App** est une interface responsive démontrant le **lancement automatique** :

- l'utilisateur (persona *Utilisateur*, besoin : *simplicité*) définit des **programmes de lancement**,
- chaque programme peut être déclenché **manuellement** (`MANUAL`) ou **programmé** (`SCHEDULED`),
- chaque déclenchement produit une **exécution de lancement** dont l'état est suivi.

Parcours cible (cahier des charges) : *Ouverture → Voir la page → Utiliser*.
Fonctionnalité socle : *Fonction de base — une fonction simple*.

## 2. Socle technique et versions

| Brique | Choix | Version retenue | Justification |
| --- | --- | --- | --- |
| Framework | Next.js (App Router) | ^16.3.4 | route handlers, layouts, React Server Components |
| Langage | TypeScript strict | ^5.9.3 | `strict` + `noImplicitAny` → zéro `any` |
| Styling | Tailwind CSS | ^3.4.19 | palette via `presets` (tailwind.config.ts) |
| ORM | Prisma | ^6.19.3 | noyau stable, générateur `prisma-client-js` éprouvé |
| Base | SQLite | — | fichier `dev.db` local, zéro service |
| Auth | NextAuth (Auth.js) | ^5.0.0-beta.32 | App Router natif, sessions JWT |
| Validation | Zod | ^4.5.4 | schémas partagés `packages/api-contracts` |

Le monorepo est piloté par **npm workspaces** (pas de turbo/pnpm requis pour cette étape).

## 3. Arborescence du monorepo

```
demo-app/
├── package.json                     # racine : workspaces, scripts build/dev/lint/test, postinstall Prisma
├── tsconfig.base.json               # strict, zéro any, partagé par tous les packages
├── .env.example                     # variables d'environnement documentées
├── ARCH.md                          # ce document (contrats de référence)
├── apps/
│   └── web/                         # application Next.js
│       ├── next.config.ts           # transpile des packages internes
│       ├── tailwind.config.ts       # preset de design tokens injecté
│       ├── postcss.config.mjs
│       └── src/
│           ├── app/
│           │   ├── layout.tsx       # layout racine (fr), métadonnées métier
│           │   ├── page.tsx         # landing « Démonstration du lancement automatique »
│           │   ├── globals.css      # tokens CSS (variables de la palette)
│           │   └── api/             # route handlers (étape backend)
│           │       └── auth/[...nextauth]/route.ts   # contrat NextAuth (à créer en étape backend)
│           ├── components/          # composants métier du domaine lancement (étape frontend)
│           │   └── launch-...       # ex. : LaunchProgramList, LaunchProgramForm, LaunchExecutionTimeline
│           └── server/              # accès données / services côté serveur (étape backend)
├── packages/
│   ├── design-tokens/               # design system : palette hexadécimale (source unique)
│   │   └── src/
│   │       ├── palette.ts           # dénomination des tokens DemoAppColorToken
│   │       └── index.ts             # preset Tailwind demoAppDesignTokensPreset
│   ├── api-contracts/               # contrats d'API : schémas Zod partagés (backend + frontend)
│   │   ├── src/                     # common, launch-program, launch-execution, auth
│   │   └── tests/                   # tests de parsing des schémas
│   └── database/                    # accès aux données
│       ├── prisma/
│       │   └── schema.prisma        # modèles User, LaunchProgram, LaunchExecution
│       └── src/                     # client Prisma singleton
```

> Les dossiers `components/`, `server/` et `api/` sont documentés ici comme cibles des étapes
> suivantes ; ils sont créés au fil du développement, pas en vide dans cette étape.

## 4. Règles de qualité (contraignantes)

1. **Zéro `any`** : interdit partout, y compris dans les casts (utiliser `unknown` puis rétrécissement).
2. **Zéro composant générique** : chaque composant a un nom métier (`LaunchProgramList`, et pas `Card`, `List` ou `Button` générique réutilisé hors contexte).
3. **Nommage aligné au domaine** : terminologie *programme de lancement / exécution de lancement /
   déclenchement automatique*. Pas de dénomination générique, pas de *lorem ipsum*, pas de placeholder « TBD ».
4. **Validation entrante** : toute donnée HTTP est validée par `@demo-app/api-contracts` (Zod). Jamais par parsing manuel.
5. **Accès données unique** : la base SQLite n'est accessible que via `@demo-app/database`.
6. **Couleurs uniquement via `@demo-app/design-tokens`** : les classes utilitaires s'appuient sur les tokens
   (`bg-primary`, `text-foreground`, `bg-accent/10`, …) ; pas de valeurs hexadécimales en dur dans les composants.

## 5. Design system (palette)

| Token | Hexadécimal | Classes utilitaires produites |
| --- | --- | --- |
| `primary` | `#0ea5e9` | `text-primary`, `bg-primary`, `border-primary/30` |
| `secondary` | `#8b5cf6` | `text-secondary`, `bg-secondary/10`, … |
| `background` | `#0f172a` | `bg-background` |
| `foreground` | `#f8fafc` | `text-foreground`, `bg-foreground` |
| `accent` | `#f59e0b` | `text-accent`, `bg-accent/10`, `border-accent/40` |

Source unique : `packages/design-tokens/src/palette.ts`. Injection Tailwind :
`apps/web/tailwind.config.ts` → `presets: [demoAppDesignTokensPreset]`.
Les variables CSS `--color-*` de `globals.css` reflètent la même palette pour le runtime (thème sombre via `color-scheme: dark`).

## 6. Modèles de données (Prisma, base : `packages/database/prisma/schema.prisma`)

### User (utilisateur connecté)
| Colonne | Type | Contraintes |
| --- | --- | --- |
| id | String | `@id @default(cuid())` |
| email | String | `@unique` |
| name | String? | |
| image | String? | |
| createdAt / updatedAt | DateTime | défauts Prisma |

Relation : `User.launchExecutions` → `LaunchExecution[]` (`triggeredById`, suppression → `ON DELETE SET NULL`).

### LaunchProgram (programme de lancement)
| Colonne | Type | Contraintes |
| --- | --- | --- |
| id | String | `@id @default(cuid())` |
| title | String | obligatoire (contrat ≤ 120 caractères) |
| description | String? | contrat ≤ 1000 caractères |
| triggerKind | `TriggerKind` | `@default(MANUAL)` — `MANUAL` \| `SCHEDULED` |
| scheduleExpression | String? | **obligatoire si** `triggerKind = SCHEDULED` (règle Zod) |
| isEnabled | Boolean | `@default(false)` — activation du déclenchement automatique |
| createdAt / updatedAt | DateTime | |
| index | — | `@@index([isEnabled])` |

Relation : `LaunchProgram.executions` → `LaunchExecution[]` (`programId`, suppression → `ON DELETE CASCADE`).

### LaunchExecution (exécution de lancement)
| Colonne | Type | Contraintes |
| --- | --- | --- |
| id | String | `@id @default(cuid())` |
| programId | String | `@relation` cascade vers `LaunchProgram` |
| status | `ExecutionStatus` | `@default(PENDING)` |
| note | String? | contrat ≤ 500 caractères |
| triggeredById | String? | référence `User` (qui a déclenché) |
| startedAt / finishedAt | DateTime? | bornes réelles de l'exécution |
| createdAt / updatedAt | DateTime | |
| indexes | — | `@@index([programId])`, `@@index([status])` |

### Énumérations
- `TriggerKind` : `MANUAL` · `SCHEDULED`
- `ExecutionStatus` : `PENDING` → `RUNNING` → `SUCCEEDED | FAILED` (ordre de transition géré à l'étape métier)

## 7. Contrats d'API

Conventions uniformes :
- Base URL : `http://localhost:3000` (local), chemin JSON en `camelCase`.
- Identifiants : CUID (validés par `resourceIdSchema`).
- Erreurs : enveloppe `ApiErrorResponseSchema` `{ message, code?, fieldErrors? }` ;
  statuts : `400` (validation Zod), `401` (session absente), `404` (ressource inconnue).
- Les schémas cités vivent dans `@demo-app/api-contracts` (importés par le backend et typés côté frontend).

| Méthode | Route | Corps (Zod) | Réponse attendue |
| --- | --- | --- | --- |
| `GET` | `/api/auth/[...nextauth]` | — | géré par NextAuth (session, fournisseurs) |
| `POST` | `/api/auth/[...nextauth]` | — | géré par NextAuth (connexion au fournisseur choisi) |
| `POST` | `/api/launch-programs` | `createLaunchProgramInputSchema` | `201` → `launchProgramDtoSchema` |
| `GET` | `/api/launch-programs` | — | `200` → `launchProgramListResponseSchema` (`{ items: LaunchProgramDto[] }`) |
| `GET` | `/api/launch-programs/[programId]` | param `resourceIdSchema` | `200` → `launchProgramDtoSchema` |
| `PATCH` | `/api/launch-programs/[programId]` | `updateLaunchProgramInputSchema` | `200` → `launchProgramDtoSchema` |
| `DELETE` | `/api/launch-programs/[programId]` | param `resourceIdSchema` | `204` (suppression en cascade des exécutions) |
| `POST` | `/api/launch-programs/[programId]/executions` | `createLaunchExecutionInputSchema` | `201` → `launchExecutionDtoSchema` |
| `GET` | `/api/launch-programs/[programId]/executions` | param `resourceIdSchema` | `200` → `launchExecutionListResponseSchema` |
| `GET` | `/api/launch-executions/[executionId]` | param `resourceIdSchema` | `200` → `launchExecutionDtoSchema` |

### Authentification (NextAuth)
- Fournisseur à brancher à l'étape backend ; stratégie **JWT** (aucune table de session requise).
- Route unique `GET/POST /api/auth/[...nextauth]` ; `auth()` (App Router) pour les mutations.
- Session exposée : `sessionDtoSchema` → `{ user: { id, email, name, image }, expires }`.
- `AUTH_SECRET` obligatoire, `AUTH_URL` en développement (`apps/web/.env.example`).

### Champs `Date` dans les DTO
Les DTO sérialisent les dates en ISO-8601 (`z.iso.datetime()`, ex. `2026-09-08T08:00:00.000Z`).
Les colonnes optionnelles (description, scheduleExpression, note, triggeredById, startedAt, finishedAt)
sont exposées en `null` (jamais absentes) dans les DTO.

## 8. Validation Zod (`packages/api-contracts/src`)

| Fichier | Schémas | Rôle |
| --- | --- | --- |
| `common.ts` | `resourceIdSchema`, `apiErrorResponseSchema` | identifiants et enveloppe d'erreur partagés |
| `launch-program.ts` | `createLaunchProgramInputSchema`, `updateLaunchProgramInputSchema` (partial), `launchProgramDtoSchema`, `launchProgramListResponseSchema` | CRUD programme de lancement |
| `launch-execution.ts` | `createLaunchExecutionInputSchema`, `launchExecutionDtoSchema`, `launchExecutionListResponseSchema` | prise et suivi d'exécution |
| `auth.ts` | `sessionUserDtoSchema`, `sessionDtoSchema` | contrat de session NextAuth |

Règles métier portées par les schémas (vérifiées par les tests de `packages/api-contracts/tests/`) :
- titre obligatoire et plafonné,
- `scheduleExpression` obligatoire si `triggerKind = SCHEDULED`.

## 9. Environnement et configuration

| Variable | Portée | Usage |
| --- | --- | --- |
| `DATABASE_URL` | Prisma (CLI + runtime) | `file:./dev.db`, chemin relatif au schéma → fichier dans `packages/database/prisma/` |
| `AUTH_SECRET` | NextAuth | clé de chiffrement des sessions (générée via `openssl rand -base64 32`) |
| `AUTH_URL` | NextAuth | origine publique en dev (`http://localhost:3000`) |

⚠️ Copier `.env.example` vers `.env` (`packages/database/.env` pour l'outillage Prisma,
`apps/web/.env.local` pour le runtime Next) — les fichiers `.env*` sont ignorés par git.

## 10. Règles pour les étapes suivantes

1. **Backend** : implémenter uniquement les routes du tableau §7, avec les noms de schémas ci-dessus —
   aucune route, aucun champ, aucun statut hors contrat.
2. **Frontend** : composants nommés par le domaine (`LaunchProgram*`, `LaunchExecution*`), labels en français,
   zéro valeur hexadécimale en dur (utiliser `bg-primary`, `text-foreground`, `bg-accent`, …).
3. **Données** : déclencher une exécution uniquement via `@demo-app/database` ; maintenir la transition
   `PENDING → RUNNING → SUCCEEDED | FAILED`.
4. **Qualité** : `npm run lint` (typecheck des workspaces), `npm test`, `npm run build` doivent rester verts ;
   tout passage par `any` est un défaut bloquant.
5. **Auth** : protéger les mutations (`POST/PATCH/DELETE`) par `auth()` ; les lectures restent publiques pour la démonstration.