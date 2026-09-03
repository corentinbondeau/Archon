# Telescope — Cahier des charges

> Cadrage produit au format Archon. Le bloc YAML suivant est obligatoire :
> il définit nominativement nom, palette, functionalités, stack et personas.

Voici mes exigences humaines en complément :

- Le tableau de bord doit être utilisable en une main sur mobile (read-only).
- Toute action de création (alerte, incident) doit confirmer par un toast.
- Le nom "Telescope" prime partout : aucun terme "demo" ou "todo" dans l'app.

```yaml
meta:
  format: archon
  version: "0.2"

project:
  name: telescope
  displayName: Telescope
  baseline: Anticiper les pannes avant qu'elles n'arrivent.
  interfaceKind: dashboard-desktop

palette:
  primary: "#0ea5e9"      # - sky-500 : actions principales
  secondary: "#8b5cf6"    # - violet-500 : secondaire / focus
  background: "#0f172a"   # - slate-900 : fond (dark natif)
  foreground: "#f8fafc"   # - slate-50 : texte
  accent: "#f59e0b"       # - amber-500 : alertes / accents

personas:
  - id: operator
    label: Opérateur d'exploitation
    needs:
      - Supervision temps réel des métriques
      - Alertes fiables avant panne
      - Historique des interventions

features:
  - id: telemetry-view
    label: Vue télémétrie temps réel
    description: Tableau de bord des métriques systèmes en continu (CPU, mémoire, latence).
  - id: anomaly-alerting
    label: Alerting prédictif
    description: Détection de dérives et remontée d'alertes avant la dégradation réelle.
  - id: incident-log
    label: Journal d'incidents
    description: Traçabilité des incidents, statuts et commentaires de clôture.

journey:
  entry: Connexion à la console Telescope
  steps:
    - Chargement du tableau de bord de supervision
    - Filtrage des flux par environnement ou service
  targetAction: Créer une alerte de détection sur un service

stack:
  framework: Next.js
  language: TypeScript
  styling: Tailwind CSS
  orm: Prisma
  database: SQLite
  auth: NextAuth (credentials)
  integrations:
    - API de métrique simulée (mock)

constraints:
  - Dark mode natif uniquement.
  - Application responsive (desktop first, mobile lisible).
  - "Durcissement TypeScript : zéro any, pas de libs non utilisées."
```