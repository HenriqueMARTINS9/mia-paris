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

## Synthèses quotidiennes

- `features/daily-summaries/types.ts`
- `features/daily-summaries/actions/write-daily-summary.ts`
- `features/daily-summaries/queries.ts`
- `features/daily-summaries/components/daily-summaries-page.tsx`

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
- le listing factuel d'activité email via `getEmailActivity(from, to)` avec reçus + première réponse sortante trouvée
- la routine email capable de classer les clients et de créer des demandes CRM quand le mail est suffisamment clair
- la synthèse quotidienne `writeDailySummary`, affichée dans la page `Synthèses`
- l’ensemble des writes assistant-ready exposés, y compris la création explicite de deadlines
- les setters utiles pour créer un client CRM puis l’assigner explicitement à un email
- le rattachement des emails à une demande via `emailIds` dans `createRequest` ou via `attachEmailToRequest`
- les setters `updateRequest` et `updateTask` pour modifier statut, priorité, assignation et échéance sans session navigateur

## Routine recommandée MyClaw

Pour la gestion quotidienne des emails, préférer `runEmailOpsCycle` plutôt que `runGmailSync` seul.

Routine pilotage complet conseillée:

1. `08:30` -> `runEmailOpsCycle` avec `{ "attachToExistingRequests": true, "createRequests": true, "updateRequests": true, "updateTasks": true, "writeSummary": true, "limit": 15, "syncLimit": 50 }`
2. `13:00` -> `runEmailOpsCycle` avec `{ "attachToExistingRequests": true, "createRequests": true, "updateRequests": true, "updateTasks": true, "writeSummary": true, "limit": 15, "syncLimit": 50 }`
3. `17:30` -> `runEmailOpsCycle` avec `{ "attachToExistingRequests": true, "createRequests": true, "updateRequests": true, "updateTasks": true, "writeSummary": true, "limit": 15, "syncLimit": 50 }`
4. `17:45` -> si besoin seulement, `writeDailySummary` pour une synthèse plus éditorialisée ou consolidée

Comportement attendu:

- sync Gmail
- la sync Gmail incrémentale récupère toutes les pages depuis le dernier email synchronisé, pas seulement les 50 premiers résultats
- lecture email par email
- classement `important / promotional / to_review`
- enrichissement des données CRM détectables
- classification du client quand le signal est suffisamment net
- création d’une demande si l’email important est clair et prêt à être structuré
- rattachement des autres emails au même dossier si le sujet, le client et le contexte correspondent
- création des tâches et deadlines automatiques via le flux standard `email -> request`
- mise à jour de priorité/assignation/statut/échéance via `updateRequest` et `updateTask` quand une vraie entité existe déjà
- écriture d’une synthèse de journée exploitable dans le CRM
- priorité aux emails `important`
- relecture humaine des emails `to_review`

Pour un compte-rendu factuel demandé par Aarone, utiliser `getEmailActivity` avec `responseMode: "detailed"`.
Exemple semaine dernière: `{ "from": "2026-04-20", "to": "2026-04-26", "limit": 500, "responseMode": "detailed" }`.
Si `replyAt` est absent, dire “réponse non trouvée dans le CRM/Gmail synchronisé”, ne pas inventer.
