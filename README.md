# Archon

Orchestrateur multi-agents qui génère des applications web prêtes pour la
production, **de bout en bout**, en pilotant OpenCode comme moteur d'écriture.

À partir d'un **cahier des charges** (markdown/YAML/JSON : nom, palette
hexadécimale, features MVP, stack, personas), Archon orchestre une séquence
d'agents autonomes — architecte, backend, frontend, QA, DevOps — qui chacun
produit des fichiers réels dans le répertoire cible puis transmet son
contexte à l'étape suivante.

---

## Fonctionnement

```
project-spec.md ──► ContextManager (spec + artefacts + logs)
                          │
        ┌─────────────────┴─────────────────── Pipeline ─────────┐
        │  1. Architect : ARCH.md, package.json, tokens Tailwind  │
        │  2. Backend   : schémas, types partagés, API + Zod      │
        │  3. Frontend  : pages/composants, états UI, branchement  │
        │  4. QA        : tsc --noEmit, conformité spec, correctifs│
        │  5. DevOps    : build prod, .env.example, README         │
        │  6. Deploy    : config cible + git + déploiement        │
        └─────────────────┬───────────────────────────────────────┘
                          ▼
           Application livrée clé en main (prête à déployer ou déployée)
```

Politiques clés :

- **Interdépendance stricte** : chaque agent reçoit les artefacts des étapes
  précédentes (via `getContextFor`), jamais d'instructions orphelines.
- **Continuité sur reprise** : l'état (dernier agent terminé, artefacts, logs)
  est persisté dans `.archon/state.json` après chaque étape. Une relance
  reprend automatiquement à l'étape suivante.
- **Zéro placeholder** : les prompts injectent le nom du projet, la palette
  HEX et la stack ; le moteur de template lève une erreur si une variable
  reste non résolue.
- **Un agent = un run OpenCode headless** (`opencode run --format json`),
  ce qui évite la contamination de contexte entre étapes. L'agent `deploy`
  est l'exception : il applique une suite déterministe (config de déploiement,
  git, déploiement) sans invoquer OpenCode.

## Installation

Prérequis : **Node.js ≥ 20** et la CLI **OpenCode** (`opencode auth` pour
débloquer un fournisseur).

```bash
npm install
npm run build
opencode auth        # une seule fois, pour accéder aux modèles
```

## Usage

Archon propose **deux interfaces** pour renseigner le cahier des charges, puis
un lancement direct :

### 1 · Assistant interactif (`archon init`)

Collecte pas-à-pas identité, palette, personas, fonctionnalités, parcours et
stack, puis écrit la spec validée et lance le pipeline en option.

```bash
node dist/cli/bin/index.js init                 # génère project-spec.yaml + question
node dist/cli/bin/index.js init --run --out app.yaml   # écrit et lance sans confirmation
```

### 2 · Formulaire web (`archon web`)

Serve local (zéro dépendance) : formulaire complet de saisie, prévisualisation
YAML et export/téléchargement de la spec validée.

```bash
node dist/cli/bin/index.js web --port 8765
# http://localhost:8765
```

### 3 · Lancement direct

```bash
# Aide
node dist/cli/bin/index.js --help

# Générer l'application depuis un cahier des charges markdown
node dist/cli/bin/index.js --spec examples/telescope.project.md --auto

# Générer ET déployer clé en main (Vercel ou Docker selon la stack)
node dist/cli/bin/index.js --spec spec.yaml --deploy

# Options courantes
node dist/cli/bin/index.js --spec spec.yaml --dir ./generated/app \
  --model anthropic/claude-sonnet-4-5 --retry 2 --verbose
```

| Option            | Rôle                                                        |
| ----------------- | ----------------------------------------------------------- |
| `--spec <fichier>`| Cahier des charges (`.md` avec bloc yaml, `.yaml`, `.json`) |
| `--dir <repertoire>` | Répertoire cible (défaut : `<nom-projet>` dans le cwd)    |
| `--out <fichier>` | Fichier spec écrit par `init` (défaut : `project-spec.yaml`) |
| `--port <n>`      | Port du serveur `web` (défaut : 8765)                       |
| `--run`           | `init` : lancer le pipeline sans confirmation               |
| `--model <m>`     | Modèle OpenCode (`provider/model`)                          |
| `--agent <a>`     | Agent OpenCode custom                                       |
| `--retry <n>`     | Tentatives max par agent (défaut : 1)                       |
| `--auto`          | Auto-approuver les permissions OpenCode                     |
| `--deploy`        | Déployer l'application après génération (Vercel ou Docker)  |
| `--remote <url>`  | Dépôt git distant à pousser (déclenche l'auto-deploy PaaS)  |
| `--fresh`         | Ignorer l'état persisté et repartir de zéro                 |
| `--verbose`       | Afficher les logs de chaque agent                           |

La description de projet minimum est :
`archon --spec path/to/spec.md` → fichiers générés dans `./<nom-du-projet>/`.

## Livraison clé en main (déploiement automatique)

Le déploiement est une **étape du pipeline** : l'agent `deploy` clôt chaque run
après `devops`. La plateforme est **détectée automatiquement** depuis la stack
(auto-detect), aucun champ n'est à ajouter au cahier des charges, et par défaut
l'application est livrée avec sa configuration de déploiement et son dépôt git
initialisés.

| Cible détectée | Condition                              | Fichiers écrits                          |
| -------------- | -------------------------------------- | ---------------------------------------- |
| **Vercel**     | Framework supporté (Next.js, React…)   | `vercel.json`, `.gitignore`, CI Actions  |
| **Docker**     | Autre stack (Express, Hono, Fastify…)  | `Dockerfile`, `.dockerignore`, compose, CI Actions |

```bash
node dist/cli/bin/index.js --spec spec.yaml --deploy
```

Déroulé de l'agent `deploy` (même sans `--deploy`, les étapes 1-2 sont réalisées) :

1. **Fichiers de déploiement** écrits sans écraser ceux déjà produits par les
   agents (priorité au contenu généré par OpenCode).
2. **Git** : `git init`, `git add -A`, commit initial.
3. **Déploiement** (uniquement avec `--deploy`) selon la cible :
   - Vercel : `vercel deploy --prod` si la CLI est authentifiée ou
     `VERCEL_TOKEN` est renseigné → une URL publique est retournée.
   - Docker : validation de l'image conteneur (`docker build`).
4. **Push** optionnel : `--remote <url>` pousse vers GitHub/GitLab et
   déclenche l'auto-deploy PaaS (Vercel, Railway…) en plus du workflow
   GitHub Actions généré.
5. Un **workflow GitHub Actions** valide systématiquement
   (typecheck + tests + build) puis déploie sur push vers `main`.

> Sans `VERCEL_TOKEN` ni `--deploy`, l'agent prépare quand même les fichiers de
> config, le workflow CI et le dépôt git : seuls le push et le déploiement distant
> restent à activer (le message de sortie l'indique).

## Structure du dépôt

```
src/
├── core/                 # Mécanique du pipeline
│   ├── types.ts          # Contrats du domaine (spec, palette, outputs)
│   ├── spec.ts           # Parsing/validation du cahier des charges (Zod)
│   ├── ContextManager.ts # Mémoire partagée + persistance (.archon/state.json)
│   ├── Orchestrator.ts   # Machine à états, séquence et reprise
│   └── errors.ts         # Hiérarchie d'erreurs (Spec, AgentHalt, Orchestrator)
├── agents/
│   ├── BaseAgent.ts      # Interface commune (run(input): AgentOutput)
│   ├── AbstractAgent.ts  # Factorisation prompt + invocation + normalisation
│   ├── ArchitectAgent.ts # Prompt d'architecture (ARCH.md, palette tokens)
│   ├── BackendAgent.ts   # Schémas, types partagés, API validées (Zod)
│   ├── FrontendAgent.ts  # UI + design system + états (loading/empty/error/success)
│   ├── QaAgent.ts        # tsc --noEmit, conformité spec, correctifs ciblés
│   ├── DevOpsAgent.ts    # Build prod, .env.example, README, cible de déploiement
│   ├── DeployAgent.ts    # Étape finale : fichiers de déploiement + git + deploy
│   └── PromptTemplate.ts # Injection des variables projets (zéro placeholder)
├── deploy/
│   ├── platform.ts       # Détection auto de la cible (Vercel / Docker)
│   ├── files.ts          # Écriture déterministe des fichiers de déploiement
│   └── Deployer.ts       # git init/commit/push + vercel deploy / docker build
├── adapters/
│   └── OpenCodeRunner.ts # Wrapper `opencode run --format json`
├── web/
│   ├── server.ts         # Serveur HTTP local (formulaire + export YAML)
│   ├── specHandler.ts    # Logique d'export spec partagée (local + Vercel)
│   └── index.html        # Formulaire du cahier des charges
└── cli/
    ├── prompts.ts        # Primitives d'invite interactive (zéro dép.)
    ├── wizard.ts         # Assistant pas-à-pas `init`
    └── bin/index.ts      # Point d'entrée CLI (init / web / --spec)

api/
└── spec.ts               # Serverless Function Vercel (POST /api/spec)
public/                   # Formulaire statique servi par Vercel (généré par build:web)
```

## Format du cahier des charges

Le cadre s'appuie sur la spec Arc, consignée dans `examples/telescope.project.md`.
Trois formats acceptés : **markdown avec bloc `yaml`**, **YAML direct**, **JSON**.
Tout champ obligatoire absent ou mal typé produit une erreur explicite.

## Développement

```bash
npm run dev       # relance le CLI avec tsx (surveillance)
npm run init      # assistant interactif
npm run web       # formulaire web local
npm run typecheck # vérification TypeScript stricte (zéro any)
npm test          # tests unitaires (vitest)
npm run build     # build de production TypeScript + copie du formulaire web
```

## Variables d'environnement

Copier `.env.example` en `.env`. Les plus importantes :
`ARCHON_MODEL`, `ARCHON_DIR`, `ARCHON_MAX_RETRIES`, `ARCHON_AUTOAPPROVE`,
`OPENCODE_BINARY`, et pour le déploiement automatique : `VERCEL_TOKEN`
(déploiement Vercel) ou la CLI `vercel` authentifiée. La sortie dans le
projet cible doit reposer sur son propre `.env.example` généré par l'agent
DevOps (jamais de secrets réels commités).

## Déploiement Vercel

Le formulaire web est également publié sur Vercel en version **statique** :
Vercel sert `public/index.html` (généré par `build:web`) et exécute la
Serverless Function `api/spec.ts` sur le même chemin `/api/spec` que le
serveur local. Le formulaire en ligne a donc le même comportement de
validation Zod et d'export YAML, sans invoquer l'orchestrateur (les commandes
OpenCode CLI ne sont pas exécutables en fonction serverless).

Premier déploiement :

```bash
vercel link --project archon-spec-form   # lie le dépôt au projet (1 fois)
vercel deploy --prod                     # publie (install + build + deploy)
```

`vercel.json` force `npm install` et un build léger (`npm run build:web` qui
copie le formulaire dans `public/`), avec `outputDirectory: public`.

Utilisation :

- **Formulaire** : https://archon-spec-form.vercel.app
- **Export YAML** : `POST /api/spec` (validation Zod + sérialisation YAML,
  mêmes limites que le serveur local : 413 corps trop grand, 400/422
  validation, 405 méthode non autorisée).

> Note : `vercel dev` (aperçu local) peut échouer car il essaie `yarn` malgré
> `installCommand` ; le déploiement réel utilise bien `npm install`. Pour un
> aperçu local du formulaire, préférer `npm run web`.