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

Après le dernier cycle de la journée, écrire le compte-rendu dans le CRM avec `writeDailySummary`.

### `writeDailySummary`

But métier:

- écrire le résumé quotidien visible dans la page `Synthèses`
- découper ce qui s’est passé par client
- conserver les décisions, risques et prochaines actions
- donner au client une vue courte de ce que Claw a absorbé dans la journée

Champs obligatoires:

- `overview`
- `clientSummaries`
- `clientSummaries[].clientName`
- `clientSummaries[].summary`

Champs optionnels:

- `summaryDate`
- `summaryTime`
- `generatedAt`
- `title`
- `highlights`
- `risks`
- `nextActions`
- `clientSummaries[].highlights`
- `clientSummaries[].decisions`
- `clientSummaries[].risks`
- `clientSummaries[].nextActions`
- `clientSummaries[].emailIds`
- `clientSummaries[].requestIds`
- `clientSummaries[].taskIds`

Payload valide:

```json
{
  "summaryDate": "2026-04-26",
  "summaryTime": "17:30",
  "title": "Synthèse du 26 avril",
  "overview": "Journée concentrée sur les demandes prix et les validations client.",
  "highlights": [
    "Claw a trié les emails et créé les demandes claires."
  ],
  "risks": [
    "Plusieurs délais courts à surveiller."
  ],
  "nextActions": [
    "Vérifier les emails à revoir."
  ],
  "clientSummaries": [
    {
      "clientName": "Etam",
      "summary": "Etam a demandé une mise à jour target price avec échéance courte.",
      "highlights": [
        "Demande de prix reçue et demande CRM créée."
      ],
      "decisions": [
        "Attente validation prix avant lancement."
      ],
      "risks": [
        "Délai court sur le retour prix."
      ],
      "nextActions": [
        "Relancer l’acheteuse demain matin si pas de retour."
      ],
      "emailIds": ["email-uuid"],
      "requestIds": ["request-uuid"],
      "taskIds": ["task-uuid"]
    }
  ]
}
```

Réponse compacte:

```json
{
  "format": "compact",
  "recommendedAction": "Ouvrir la page Synthèses pour relire le compte-rendu client par client.",
  "summary": "Synthèse quotidienne enregistrée.",
  "synthesis": {
    "clientCount": 1,
    "generatedAt": "2026-04-26T15:30:00.000Z",
    "summaryDate": "2026-04-26",
    "summaryId": "summary-uuid",
    "summaryTime": "17:30"
  }
}
```

Règles métier:

- `writeDailySummary` doit être appelé après les cycles email, idéalement en fin de journée
- le résumé doit rester court, exploitable et découpé par client
- ne pas utiliser cette action pour stocker du bruit technique
- si un client n’est pas identifié, utiliser `Client non identifié` uniquement si l’information est vraiment utile à relire

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
- `emailIds`

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
  "requestedAction": "Envoyer le chiffrage révisé",
  "emailIds": ["email-uuid"]
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
    "attachedEmailCount": 1,
    "failedEmailAttachCount": 0,
    "priority": "high",
    "requestId": "request-uuid",
    "requestType": "price_request",
    "status": "qualification",
    "title": "Mise à jour target price Etam"
  }
}
```

Règle métier:

- si Claw crée une demande depuis un ou plusieurs emails, il doit passer `emailIds`
- si la demande existe déjà, utiliser `attachEmailToRequest`
- ne pas créer une deuxième demande si le mail correspond clairement à une demande existante

### `attachEmailToRequest`

Champs obligatoires:

- `emailId`
- `requestId`

Payload valide:

```json
{
  "emailId": "email-uuid",
  "requestId": "request-uuid"
}
```

Réponse compacte:

```json
{
  "attachment": {
    "emailId": "email-uuid",
    "requestId": "request-uuid"
  },
  "format": "compact",
  "recommendedAction": "Ouvrir ensuite la demande pour vérifier le contexte consolidé.",
  "summary": "Email rattaché à la demande existante et marqué traité."
}
```

### `createClient`

Champs obligatoires:

- `name`

Champs optionnels:

- `code`

Payload valide:

```json
{
  "name": "Etam",
  "code": "ETAM"
}
```

Réponse compacte:

```json
{
  "client": {
    "clientId": "client-uuid",
    "code": "ETAM",
    "label": "Etam"
  },
  "format": "compact",
  "recommendedAction": "Assigner ensuite ce client aux emails ou demandes concernés.",
  "summary": "Client créé et prêt à être assigné à l’email."
}
```

### `assignClientToEmail`

Champs obligatoires:

- `emailId`
- `clientId`

Payload valide:

```json
{
  "emailId": "email-uuid",
  "clientId": "client-uuid"
}
```

Réponse compacte:

```json
{
  "assignment": {
    "clientId": "client-uuid",
    "emailId": "email-uuid"
  },
  "format": "compact",
  "recommendedAction": "Compléter ensuite la qualification CRM ou créer une demande si le mail est clair.",
  "summary": "Client assigné à l’email: Etam."
}
```

### `createDeadline`

Champs obligatoires:

- `label`
- `deadlineAt`
- `priority`

Champs optionnels:

- `requestId`

Valeurs valides:

- `priority`: `critical`, `high`, `normal`

Payload valide:

```json
{
  "label": "Valider le dossier avant expédition",
  "deadlineAt": "2026-04-24",
  "priority": "high",
  "requestId": "request-uuid"
}
```

Réponse compacte:

```json
{
  "deadline": {
    "deadlineAt": "2026-04-24",
    "label": "Valider le dossier avant expédition",
    "priority": "high",
    "requestId": "request-uuid"
  },
  "format": "compact",
  "recommendedAction": "Vérifier ensuite la demande liée et l'articulation avec les autres échéances.",
  "summary": "Deadline créée avec succès."
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

À date, aucune action assistant-ready supplémentaire n’est gardée fermée sur la route HTTP externe. Si de nouvelles mutations risquées sont ajoutées plus tard, elles devront revenir dans cette section avant ouverture.

## Règles de comportement du bridge OpenClaw

- Résumer les réponses pour WhatsApp.
- Utiliser `responseMode: "detailed"` uniquement si le contexte le demande vraiment.
- Ne jamais inventer une valeur enum.
- Pour la gestion email quotidienne, préférer `runEmailOpsCycle` à un simple `runGmailSync`.
- Après le dernier cycle de la journée, utiliser `writeDailySummary` pour alimenter la page `Synthèses`.
- Ne jamais remplacer une vraie action CRM safe par une simple note mémoire si l’utilisateur demande explicitement la mutation.
- Utiliser les actions READ sans confirmation.
- Utiliser les SAFE WRITE uniquement après intention claire.
- Les writes OpenClaw utilisent l’acteur technique serveur et ne dépendent pas d’une session navigateur.

## Sécurité / audit

- Bearer token obligatoire
- source d’audit: `assistant`
- acteur technique côté serveur:
  - `actorUserId = a1665f0b-c74d-40fe-b568-4a32edd9218a`
  - `actorEmail = openclaw@miaparis.com`
- pas de dépendance à une session navigateur pour les writes OpenClaw
