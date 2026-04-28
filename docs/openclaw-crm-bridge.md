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

### `getEmailActivity`

But métier:

- produire un listing factuel des emails reçus sur une période
- indiquer la date/heure de réception
- indiquer la première date/heure de réponse sortante trouvée dans le même thread
- rester factuel, sans inventer de réponse si aucun message sortant n’est retrouvé

Payload valide:

```json
{
  "from": "2026-04-20",
  "to": "2026-04-26",
  "limit": 500,
  "responseMode": "detailed"
}
```

Champs:

- `from`: date début au format `YYYY-MM-DD` ou ISO
- `to`: date fin au format `YYYY-MM-DD` ou ISO
- `limit`: optionnel, entre `1` et `1500`, défaut `500`

Réponse détaillée:

```json
{
  "range": {
    "from": "2026-04-20T00:00:00.000Z",
    "to": "2026-04-26T23:59:59.999Z"
  },
  "totalReceived": 42,
  "totalAnswered": 31,
  "totalUnanswered": 11,
  "items": [
    {
      "subject": "Validation proto robe",
      "fromName": "Camille",
      "fromEmail": "buyer@etam.com",
      "receivedAt": "2026-04-20T08:32:00.000Z",
      "replyAt": "2026-04-20T09:14:00.000Z",
      "replyDelayMinutes": 42,
      "replyStatus": "answered"
    }
  ]
}
```

Règles:

- pour un compte-rendu à partager, utiliser `responseMode: "detailed"`
- si `replyAt` est `null`, écrire “réponse non trouvée dans le CRM/Gmail synchronisé”, pas “non répondu” de façon définitive
- la qualité dépend des emails sortants synchronisés dans Gmail

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
- rattacher un email à une demande existante si le client et le contexte matchent clairement
- créer une demande CRM quand l’email important est suffisamment clair
- mettre à jour priorité/échéance des demandes et tâches liées quand le mail apporte un signal plus urgent
- laisser le flux métier existant créer les tâches et deadlines automatiques associées
- écrire une synthèse CRM du cycle si demandé

Champs optionnels:

- `attachToExistingRequests`
- `createRequests`
- `limit`
- `skipSync`
- `syncLimit`
- `syncMode`
- `updateRequests`
- `updateTasks`
- `writeSummary`

Valeurs valides:

- `attachToExistingRequests`: `true` ou `false`
- `createRequests`: `true` ou `false`
- `limit`: entier entre `1` et `20`
- `syncLimit`: entier entre `1` et `75`
- `syncMode`: `incremental` ou `backfill`
- `skipSync`: `true` ou `false`
- `updateRequests`: `true` ou `false`
- `updateTasks`: `true` ou `false`
- `writeSummary`: `true` ou `false`

Payload valide:

```json
{
  "attachToExistingRequests": true,
  "createRequests": true,
  "limit": 10,
  "skipSync": false,
  "syncLimit": 25,
  "syncMode": "incremental",
  "updateRequests": true,
  "updateTasks": true,
  "writeSummary": true
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
    "requestAttachedCount": 2,
    "requestCreatedCount": 3,
    "requestUpdatedCount": 1,
    "summaryWrittenCount": 1,
    "syncImportedMessages": 4,
    "syncOk": true,
    "taskCreatedCount": 3,
    "taskUpdatedCount": 2,
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
- les emails incertains passent en `assistant_bucket = to_review` sans écrire de faux statut enum dans `processing_status`
- `createRequests: true` ne crée une demande que si l’email est `important`, qu’un client est identifié, que le type de demande est clair et que la qualification ne réclame pas une validation humaine préalable
- quand une demande est créée via cette routine, elle réutilise le flux métier standard `email -> request`, donc les tâches et deadlines automatiques suivent les mêmes règles que dans l’UI
- `runEmailOpsCycle` et `runGmailSync` sont protégés par un verrou anti-concurrence: si un job lourd est déjà en cours, la route répond `429` avec `Retry-After`
- ne pas lancer de gros backfill pendant qu’Aarone navigue dans le CRM; préférer les petits lots ou un créneau calme

Routine recommandée MyClaw:

- lancer `runEmailOpsCycle` toutes les 24h
- prochain réveil configuré: `lun. 27/04/2026 20:02:57`
- ne pas relancer plusieurs cycles dans la même journée sauf demande explicite d’Aarone
- payload recommandé:

```json
{
  "attachToExistingRequests": true,
  "createRequests": true,
  "limit": 10,
  "skipSync": false,
  "syncLimit": 25,
  "syncMode": "incremental",
  "updateRequests": true,
  "updateTasks": true,
  "writeSummary": true
}
```

Le payload recommandé inclut `writeSummary: true`, donc la synthèse CRM du jour est écrite pendant le cycle. `writeDailySummary` reste disponible séparément si Aarone demande une version plus éditorialisée ou corrigée.

Routine exceptionnelle de rattrapage historique Gmail:

1. Importer l’historique avec `runGmailSync` en `backfill`.
2. Classer ensuite par lots de 10 avec `runEmailOpsCycle`.
3. Répéter le lot de classification jusqu’à épuisement des emails non traités.

Payload d’import historique:

```json
{
  "limit": 1200,
  "syncMode": "backfill"
}
```

Payload de classification par lot:

```json
{
  "attachToExistingRequests": true,
  "createRequests": true,
  "limit": 10,
  "skipSync": true,
  "syncLimit": 1,
  "syncMode": "incremental",
  "updateRequests": true,
  "updateTasks": true,
  "writeSummary": true
}
```

Règle synthèse:

- les emails `promotional` doivent être classés et conservés dans l’onglet pub/bruit
- ils ne doivent pas être inclus dans les synthèses client ni dans la synthèse globale
- seuls les emails `important` et `to_review` doivent alimenter le résumé métier

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
- `syncMode`

Valeurs valides:

- `limit`: entier entre `1` et `1500`
- `syncMode`: `incremental` ou `backfill`

Comportement:

- en première synchronisation, `limit` borne le nombre d’emails importés
- en synchronisation incrémentale, le CRM pagine Gmail et récupère tous les emails disponibles depuis le dernier email synchronisé
- en `backfill`, le CRM ignore le curseur `last_synced_at` et récupère les derniers emails Gmail jusqu’au `limit` demandé
- les doublons sont ignorés côté CRM via les identifiants Gmail `message/thread`

Payload valide:

```json
{
  "limit": 1200,
  "syncMode": "backfill"
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

### `updateTask`

Champs obligatoires:

- `taskId`
- au moins un champ à modifier parmi `status`, `priority`, `assignedUserId`, `dueAt`

Champs optionnels:

- `requestId`
- `status`
- `priority`
- `assignedUserId`
- `dueAt`

Valeurs valides:

- `status`: `todo`, `in_progress`, `blocked`, `done`
- `priority`: `critical`, `high`, `normal`

Note enum:

- côté CRM, `blocked` est converti vers l’enum PostgreSQL réel `waiting_external`
- ne jamais envoyer `open`

Payload valide:

```json
{
  "taskId": "task-uuid",
  "requestId": "request-uuid",
  "status": "in_progress",
  "priority": "critical",
  "assignedUserId": "user-uuid",
  "dueAt": "2026-04-27"
}
```

Réponse compacte:

```json
{
  "format": "compact",
  "recommendedAction": "Le suivi tâche est à jour dans le CRM.",
  "summary": "Tâche mise à jour: status, priority, dueAt.",
  "task": {
    "taskId": "task-uuid",
    "requestId": "request-uuid",
    "status": "in_progress",
    "priority": "critical",
    "dueAt": "2026-04-27",
    "updatedFields": ["status", "priority", "dueAt"]
  }
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

### `updateRequest`

Champs obligatoires:

- `requestId`
- au moins un champ à modifier parmi `status`, `priority`, `assignedUserId`

Champs optionnels:

- `requestType` obligatoire si `status` est fourni
- `status`
- `priority`
- `assignedUserId`

Valeurs valides:

- `status`: `new`, `qualification`, `costing`, `awaiting_validation`, `approved`, `in_production`
- `priority`: `critical`, `high`, `normal`

Payload valide:

```json
{
  "requestId": "request-uuid",
  "requestType": "price_request",
  "status": "costing",
  "priority": "high",
  "assignedUserId": "user-uuid"
}
```

Réponse compacte:

```json
{
  "format": "compact",
  "recommendedAction": "Le CRM est à jour. Vérifier uniquement si un arbitrage client est nécessaire.",
  "summary": "Demande mise à jour: status, priority, assignedUserId.",
  "request": {
    "requestId": "request-uuid",
    "requestType": "price_request",
    "status": "costing",
    "priority": "high",
    "assignedUserId": "user-uuid",
    "updatedFields": ["status", "priority", "assignedUserId"]
  }
}
```

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
- Pour le pilotage automatique complet, appeler `runEmailOpsCycle` avec `attachToExistingRequests`, `createRequests`, `updateRequests`, `updateTasks` et `writeSummary` à `true`.
- `writeDailySummary` reste disponible comme action séparée si Claw veut réécrire une synthèse plus éditorialisée en fin de journée.
- Ne jamais remplacer une vraie action CRM safe par une simple note mémoire si l’utilisateur demande explicitement la mutation.
- Quand une demande ou une tâche existe déjà, préférer `updateRequest`, `updateTask` ou `attachEmailToRequest` plutôt que créer un doublon.
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
