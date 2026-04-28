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

- fréquence: toutes les 24h
- prochain réveil configuré: `lun. 27/04/2026 20:02:57`
- à chaque réveil: lancer le prompt cron `Routine CRM email MIA PARIS`
- ne pas relancer manuellement plusieurs cycles dans la même journée sauf demande explicite d’Aarone
- si besoin seulement, `writeDailySummary` peut être appelé séparément pour réécrire une synthèse plus éditorialisée ou consolidée

Prompt cron `Routine CRM email MIA PARIS`:

```text
Run the CRM email operations cycle for MIA PARIS.

Use the OpenClaw CRM bridge and execute runEmailOpsCycle with:
{
  "attachToExistingRequests": true,
  "createRequests": true,
  "updateRequests": true,
  "updateTasks": true,
  "writeSummary": true,
  "limit": 200,
  "syncLimit": 200,
  "syncMode": "incremental"
}

Goals:
- sync Gmail incrementally and import every available page since the last synced email
- read emails one by one
- classify emails into important / promotional / to_review
- ignore promotional/system noise in the final summary
- enrich CRM-detectable fields when possible: detected client, detected department, detected type, priority, deadline, requested action, business summary, recommended action, assisted reply draft
- assign or create the CRM client when the signal is clear
- attach emails to an existing request when they belong to the same client/request context
- create a request when an important email is clear enough and not already linked
- update existing requests when the email changes priority, status, deadline, assignee or useful details
- create or update tasks when the email implies follow-up, costing, validation, production, logistics, deadline check or internal review
- write or update the daily summary in the CRM with a short client-by-client recap

Safety rules:
- do not invent enum values
- do not create duplicates if an existing client, request or task clearly matches
- put uncertain emails in to_review
- never hide important business emails as promotional
- if a write fails, continue the cycle and mention the error count in the summary

Return a compact WhatsApp-friendly summary with:
- sync status
- number of processed emails
- important count
- promotional count
- to_review count
- CRM enrichment count
- created/attached/updated requests count
- created/updated tasks count
- daily summary status
- top important items if any
- recommended next action
```

## Rattrapage historique Gmail

Si Aarone demande de reprendre tous les mails déjà présents dans Gmail, ne pas essayer de classer 1200 mails en une seule requête.

Étape 1: importer l’historique Gmail en backfill.

```json
{
  "action": "runGmailSync",
  "payload": {
    "limit": 1200,
    "syncMode": "backfill"
  }
}
```

Étape 2: traiter les emails importés par lots de 200 maximum, en répétant l’action jusqu’à ce que `processedCount`, `skippedCount` et `errorCount` indiquent qu’il ne reste plus rien d’utile à traiter.

```json
{
  "action": "runEmailOpsCycle",
  "payload": {
    "attachToExistingRequests": true,
    "createRequests": true,
    "updateRequests": true,
    "updateTasks": true,
    "writeSummary": true,
    "limit": 200,
    "syncLimit": 1,
    "syncMode": "incremental"
  }
}
```

Règle synthèse: les emails `promotional` doivent être classés dans l’onglet pub/bruit, mais ne doivent pas apparaître dans les synthèses client ni dans la synthèse globale, sauf comme simple compteur technique si nécessaire.

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
