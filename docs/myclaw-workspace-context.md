# MyClaw Workspace Context

Fichiers recommandés à charger dans MyClaw pour donner au bridge OpenClaw le bon contexte CRM MIA PARIS.

## Minimum vital

- `docs/openclaw-crm-bridge.md`
- `docs/myclaw-workspace-context.md`
- `README.md`

## Contrat d'appel et surface exposée

- `features/openclaw/http.ts`
- `features/openclaw/integration.ts`
- `features/openclaw/presenters.ts`
- `features/openclaw/crm-actions.ts`

## Couche assistant-ready

- `features/assistant-actions/catalog.ts`
- `features/assistant-actions/types.ts`
- `features/assistant-actions/commands.ts`
- `features/assistant-actions/validators.ts`

## Métier email et Gmail

- `features/emails/types.ts`
- `features/emails/actions/update-email.ts`
- `features/emails/actions/sync-gmail.ts`
- `features/emails/lib/assistant-email-ops.ts`
- `features/emails/lib/gmail-sync.ts`
- `features/emails/lib/inbox-triage.ts`
- `features/emails/queries.ts`

## Sécurité et acteur technique

- `features/openclaw/server-context.ts`
- `features/auth/server-authorization.ts`
- `features/auth/permissions.ts`

## Si MyClaw doit comprendre les enums / mappings métier

- `features/tasks/task-types.ts`
- `features/requests/metadata.ts`
- `features/emails/metadata.ts`

## Recommandation pratique

Si tu dois limiter le volume de contexte côté MyClaw, charge d'abord:

1. `docs/openclaw-crm-bridge.md`
2. `docs/myclaw-workspace-context.md`
3. `features/openclaw/http.ts`
4. `features/openclaw/integration.ts`
5. `features/assistant-actions/commands.ts`
6. `features/emails/lib/gmail-sync.ts`

Avec ça, le bot a déjà:

- le contrat HTTP réel
- les actions ouvertes
- les payloads valides
- les garde-fous
- le comportement Gmail
- la logique de tri inbox
- la routine email capable de classer les clients et de créer des demandes CRM quand le mail est suffisamment clair

## Routine recommandée MyClaw

Pour la gestion quotidienne des emails, préférer `runEmailOpsCycle` plutôt que `runGmailSync` seul.

Routine simple conseillée:

1. `08:30` -> `runEmailOpsCycle` avec `{ "createRequests": true, "limit": 15, "syncLimit": 50 }`
2. `13:00` -> `runEmailOpsCycle` avec `{ "createRequests": true, "limit": 15, "syncLimit": 50 }`
3. `17:30` -> `runEmailOpsCycle` avec `{ "createRequests": true, "limit": 15, "syncLimit": 50 }`

Comportement attendu:

- sync Gmail
- lecture email par email
- classement `important / promotional / to_review`
- enrichissement des données CRM détectables
- classification du client quand le signal est suffisamment net
- création d’une demande si l’email important est clair et prêt à être structuré
- création des tâches et deadlines automatiques via le flux standard `email -> request`
- priorité aux emails `important`
- relecture humaine des emails `to_review`
