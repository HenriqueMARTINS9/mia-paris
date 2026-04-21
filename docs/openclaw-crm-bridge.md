# OpenClaw CRM Bridge

Documentation opérationnelle de la route sécurisée `POST /api/openclaw` utilisée par OpenClaw / MyClaw pour piloter le CRM MIA PARIS.

## Endpoint

- URL: `POST /api/openclaw`
- Auth: `Authorization: Bearer <OPENCLAW_CRM_TOKEN>`
- Cache: `no-store`
- Body:

```json
{
  "action": "ACTION_NAME",
  "payload": {}
}
```

## Codes HTTP

- `200` succès
- `400` body invalide ou action inconnue
- `401` bearer manquant / invalide
- `403` action reconnue mais non ouverte sur la route HTTP externe
- `422` validation métier
- `500` erreur serveur

## Réponse standard

```json
{
  "action": "getUnprocessedEmails",
  "auditScope": "openclaw.getUnprocessedEmails",
  "code": "ok",
  "data": {},
  "kind": "read",
  "message": "12 email(s) non traité(s) ou à revoir.",
  "ok": true
}
```

## Mode de réponse

Par défaut, la route renvoie une sortie `compact` pensée pour WhatsApp/mobile:

- listes limitées à quelques items utiles
- priorité métier visible
- recommandation d’action
- bruit système réduit quand pertinent

Pour récupérer la donnée brute détaillée, ajouter `responseMode: "detailed"` dans `payload`.

Exemple:

```json
{
  "action": "getBlockedProductions",
  "payload": {
    "responseMode": "detailed"
  }
}
```

## Actions READ ouvertes

### `getTodayUrgencies`

Payload valide:

```json
{
  "responseMode": "compact"
}
```

Réponse compacte:

```json
{
  "format": "compact",
  "items": [
    {
      "client": "Etam",
      "dueAt": "2026-04-03T11:00:00.000Z",
      "label": "Valider proto",
      "priority": "critical",
      "recommendedAction": "Traiter immédiatement ou renégocier le délai.",
      "requestTitle": "Proto robe PE26",
      "status": "open",
      "urgency": "retard"
    }
  ],
  "recommendedAction": "Traiter d'abord les retards, puis confirmer les deadlines du jour.",
  "totalCount": 3,
  "truncated": false
}
```

### `getUnprocessedEmails`

Payload valide:

```json
{}
```

Réponse compacte:

```json
{
  "format": "compact",
  "ignoredSystemEmails": 2,
  "items": [
    {
      "bucket": "important",
      "client": "Etam",
      "dueAt": null,
      "from": "Camille",
      "priority": "high",
      "recommendedAction": "Qualifier puis créer ou rattacher une demande.",
      "receivedAt": "2026-04-03T08:42:00.000Z",
      "status": "new",
      "subject": "Need updated target price",
      "type": "price_request"
    }
  ],
  "recommendedAction": "Traiter d'abord les emails client non liés à une demande.",
  "totalCount": 8,
  "truncated": false
}
```

Notes métier:

- cet endpoint remonte uniquement les emails métier non traités
- les emails classés `promotional` sont exclus de cette vue
- les emails ambigus doivent être classés en `to_review`

### `getRequestsWithoutAssignee`

Payload valide:

```json
{}
```

### `getBlockedProductions`

Payload valide:

```json
{}
```

### `getHighRiskProductions`

Payload valide:

```json
{}
```

### `searchClientHistory`

Payload valide:

```json
{
  "clientName": "Etam"
}
```

### `searchModelHistory`

Payload valide:

```json
{
  "modelName": "Mia Bandana Dress"
}
```

## Actions SAFE WRITE ouvertes

Les actions ci-dessous sont ouvertes sur la route HTTP externe, mais doivent être utilisées avec intention explicite. Le bridge ne doit jamais inventer des enums ou fallbacker en “note mémoire” si une vraie action CRM safe existe et a été demandée.

### `runEmailOpsCycle`

But métier:

- synchroniser Gmail
- lire les emails un par un
- classer chaque email en `important`, `promotional` ou `to_review`
- remplir les données CRM détectables sur l’email
- classifier le client quand il est reconnaissable
- créer une demande CRM quand l’email important est suffisamment clair
- laisser le flux métier existant créer les tâches et deadlines automatiques associées

Champs optionnels:

- `createRequests`
- `limit`
- `syncLimit`

Valeurs valides:

- `createRequests`: `true` ou `false`
- `limit`: entier entre `1` et `40`
- `syncLimit`: entier entre `1` et `100`

Payload valide:

```json
{
  "createRequests": true,
  "limit": 15,
  "syncLimit": 50
}
```

Réponse compacte:

```json
{
  "cycle": {
    "clientClassifiedCount": 7,
    "crmEnrichedCount": 8,
    "deadlineCreatedCount": 2,
    "errorCount": 0,
    "importantCount": 6,
    "processedCount": 10,
    "promotionalCount": 2,
    "requestCreatedCount": 3,
    "syncImportedMessages": 4,
    "syncOk": true,
    "taskCreatedCount": 3,
    "toReviewCount": 2
  },
  "format": "compact",
  "items": [
    {
      "bucket": "important",
      "client": "Etam",
      "dueAt": "2026-04-20",
      "from": "Camille",
      "priority": "high",
      "recommendedAction": "Demande, tâche et suivi ont été créés automatiquement dans le CRM.",
      "requestType": "price_request",
      "status": "classified",
      "subject": "Need updated target price"
    }
  ],
  "recommendedAction": "Contrôler ensuite les nouvelles demandes créées et leurs tâches auto.",
  "summary": "Cycle assistant emails terminé.",
  "truncated": true
}
```

Règles métier:

- `important`: email métier prioritaire à traiter
- `promotional`: pub, newsletter, bruit marketing
- `to_review`: cas ambigu à vérifier humainement
- les emails déjà qualifiés proprement sont ignorés au run suivant
- les emails incertains passent en statut `review` côté CRM quand le schéma le permet
- `createRequests: true` ne crée une demande que si l’email est `important`, qu’un client est identifié, que le type de demande est clair et que la qualification ne réclame pas une validation humaine préalable
- quand une demande est créée via cette routine, elle réutilise le flux métier standard `email -> request`, donc les tâches et deadlines automatiques suivent les mêmes règles que dans l’UI

Routine recommandée MyClaw:

- lancer `runEmailOpsCycle` 3 fois par jour
- suggestion simple:
  - `08:30`
  - `13:00`
  - `17:30`
- payload recommandé:

```json
{
  "createRequests": true,
  "limit": 15,
  "syncLimit": 50
}
```

### `runGmailSync`

Champs optionnels:

- `limit`

Valeurs valides:

- `limit`: entier entre `1` et `100`

Payload valide:

```json
{
  "limit": 50
}
```

Réponse compacte:

```json
{
  "format": "compact",
  "recommendedAction": "Ouvrir ensuite l’inbox CRM pour traiter les nouveaux emails importés.",
  "summary": "Synchronisation Gmail terminée.",
  "sync": {
    "connectedInboxEmail": "directionmiaparis@gmail.com",
    "errorCount": 0,
    "ignoredMessages": 12,
    "importedMessages": 4,
    "importedThreads": 3,
    "queryUsed": null,
    "syncMode": "incremental"
  }
}
```

### `createTask`

Champs obligatoires:

- `title`
- `taskType`
- `priority`

Champs optionnels:

- `requestId`
- `assignedUserId`
- `dueAt`

Valeurs valides:

- `priority`: `critical`, `high`, `normal`
- `taskType`:
  - `follow_up`
  - `costing`
  - `validation`
  - `production`
  - `price_check`
  - `deadline_check`
  - `tds_send`
  - `swatch_prepare`
  - `validation_followup`
  - `internal_review`
  - `logistics_check`

Valeur par défaut métier:

- `task_status` initial forcé côté CRM à `todo`

Payload valide:

```json
{
  "title": "Contrôler les derniers éléments client",
  "taskType": "internal_review",
  "priority": "high",
  "requestId": "request-uuid",
  "assignedUserId": "user-uuid",
  "dueAt": "2026-04-04"
}
```

### `createRequest`

Champs obligatoires:

- `title`
- `requestType`
- `priority`

Champs optionnels:

- `status`
- `clientId`
- `contactId`
- `productDepartmentId`
- `modelId`
- `assignedUserId`
- `dueAt`
- `summary`
- `requestedAction`

Valeurs valides:

- `priority`: `critical`, `high`, `normal`
- `status`: `new`, `qualification`, `costing`, `awaiting_validation`, `approved`, `in_production`

Valeur par défaut métier:

- `status` par défaut forcé à `qualification`

Payload valide:

```json
{
  "title": "Mise à jour target price Etam",
  "requestType": "price_request",
  "priority": "high",
  "status": "qualification",
  "clientId": "client-uuid",
  "assignedUserId": "user-uuid",
  "dueAt": "2026-04-22",
  "summary": "Le client demande une mise à jour prix avec délai court.",
  "requestedAction": "Envoyer le chiffrage révisé"
}
```

Réponse compacte:

```json
{
  "format": "compact",
  "recommendedAction": "Ouvrir ensuite la demande pour compléter les tâches, deadlines ou pièces jointes.",
  "summary": "Demande créée avec succès.",
  "request": {
    "dueAt": "2026-04-22",
    "priority": "high",
    "requestId": "request-uuid",
    "requestType": "price_request",
    "status": "qualification",
    "title": "Mise à jour target price Etam"
  }
}
```

### `setEmailInboxBucket`

Champs obligatoires:

- `emailId`
- `bucket`

Champs optionnels:

- `confidence`
- `reason`

Valeurs valides:

- `bucket`: `important`, `promotional`, `to_review`

Règle métier:

- `important`: email client ou signal métier à traiter dans l’inbox principale
- `promotional`: pub, newsletter, bruit marketing
- `to_review`: cas incertain à vérifier humainement

Payload valide:

```json
{
  "emailId": "email-uuid",
  "bucket": "important",
  "confidence": 0.92,
  "reason": "Demande client explicite sur prix et délai."
}
```

Réponse compacte:

```json
{
  "format": "compact",
  "recommendedAction": "Vérifier ensuite l’onglet inbox correspondant dans le CRM.",
  "summary": "Email classé comme important.",
  "triage": {
    "bucket": "important",
    "emailId": "email-uuid",
    "reasonPreview": "Demande client explicite sur prix et délai."
  }
}
```

Réponse compacte:

```json
{
  "format": "compact",
  "recommendedAction": "Vérifier ensuite l'assignation et l'échéance dans le CRM.",
  "summary": "Tâche liée créée avec succès.",
  "task": {
    "dueAt": "2026-04-04",
    "priority": "high",
    "requestId": "request-uuid",
    "taskType": "internal_review",
    "title": "Contrôler les derniers éléments client"
  }
}
```

### `addNoteToRequest`

Champs obligatoires:

- `requestId`
- `note`

Payload valide:

```json
{
  "requestId": "request-uuid",
  "note": "Le client attend un retour prix avant 11h."
}
```

### `addNoteToProduction`

Champs obligatoires:

- `productionId`
- `notes`

Payload valide:

```json
{
  "productionId": "production-uuid",
  "notes": "Blocage confirmé côté atelier. Repoint à 16h."
}
```

### `prepareReplyDraft`

Champs obligatoires:

- `replyType`
- `context.sourceId`
- `context.sourceType`
- `context.subject`

Valeurs valides `replyType`:

- `acknowledgement`
- `ownership`
- `missing_items`
- `deadline_confirmation`
- `supplier_followup`
- `production_update`
- `logistics_response`
- `validation_feedback`
- `waiting_validation`

Payload valide:

```json
{
  "replyType": "acknowledgement",
  "context": {
    "sourceId": "email-uuid",
    "sourceType": "email",
    "subject": "Need updated target price",
    "summary": "Client asks for a revised target price.",
    "clientName": "Etam",
    "recipientEmail": "buyer@etam.com",
    "recipientName": "Camille",
    "requestId": "request-uuid",
    "requestPriority": "high",
    "requestStatus": "qualification",
    "requestType": "price_request",
    "requestedAction": "Envoyer le chiffrage",
    "dueAt": null
  }
}
```

## Actions sensibles fermées

Ces actions sont reconnues par la couche assistant, mais doivent rester fermées sur la route HTTP externe tant qu’aucun contrôle renforcé supplémentaire n’a été validé:

- `createDeadline`

Réponse attendue:

```json
{
  "action": "createDeadline",
  "auditScope": "openclaw.createDeadline",
  "code": "forbidden",
  "data": null,
  "kind": "write",
  "message": "L'action createDeadline est classée sensible et reste fermée sur la route HTTP externe OpenClaw.",
  "ok": false
}
```

## Règles de comportement du bridge OpenClaw

- Résumer les réponses pour WhatsApp.
- Utiliser `responseMode: "detailed"` uniquement si le contexte le demande vraiment.
- Ne jamais inventer une valeur enum.
- Pour la gestion email quotidienne, préférer `runEmailOpsCycle` à un simple `runGmailSync`.
- Ne jamais remplacer une vraie action CRM safe par une simple note mémoire si l’utilisateur demande explicitement la mutation.
- Utiliser les actions READ sans confirmation.
- Utiliser les SAFE WRITE uniquement après intention claire.
- Ne jamais tenter `createDeadline` via l’endpoint externe tant qu’elle reste fermée.

## Sécurité / audit

- Bearer token obligatoire
- source d’audit: `assistant`
- acteur technique côté serveur:
  - `actorUserId = a1665f0b-c74d-40fe-b568-4a32edd9218a`
  - `actorEmail = openclaw@miaparis.com`
- pas de dépendance à une session navigateur pour les writes OpenClaw
