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
