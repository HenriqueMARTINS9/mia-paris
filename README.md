# MIA PARIS CRM

CRM metier textile B2B pour MIA PARIS, concu pour transformer rapidement les emails entrants en demandes exploitables, puis piloter l'execution via taches, deadlines, productions, documents et arbitrages quotidiens.

Stack:
- Next.js App Router
- TypeScript strict
- Tailwind CSS + composants UI maison type shadcn/ui
- Supabase SSR + RLS
- Gmail API en lecture seule
- PWA mobile-first

## Vision produit

L'application remplace un fonctionnement base sur la boite mail, les suivis manuels et les relances diffuses.

Objectifs:
- centraliser les emails reels Gmail dans un flux partage
- qualifier un email en demande metier textile
- generer automatiquement les premieres actions utiles
- suivre les urgences, validations, retards et blocages
- donner un cockpit quotidien aux equipes sales, developpement, production et logistique
- preparer un branchement progressif d'un assistant operationnel type OpenClaw

## Ce qui a ete construit

Le projet couvre aujourd'hui:
- authentification Supabase SSR avec routes protegees
- roles et permissions de base par `public.users.role`
- inbox Gmail partagee pour tous les utilisateurs
- synchronisation Gmail read-only avec dedoublonnage `thread/message`
- qualification email -> request avec pre-remplissage V1 par regles
- creation de demandes depuis email
- rattachement d'un email a une demande existante
- creation automatique de tasks et deadlines apres qualification
- gestion des demandes, taches, deadlines et productions
- creation de documents metier depuis les pieces jointes email
- dashboard, page Aujourd'hui, analytics, centre A traiter / A decider
- historique intelligent sur demande / production / client / modele
- brouillons de reponse assistes
- couche d'actions serveur assistant-ready
- panneau OpenClaw-ready pour tester les actions exposees
- audit, monitoring minimal et observabilite Gmail / actions sensibles
- PWA installable et base offline shell
- UI mobile-first + desktop

## Pages de l'application

| Route | Page | Utilite metier | Fonctionnalites principales |
| --- | --- | --- | --- |
| `/login` | Connexion | Entrer dans l'app de maniere securisee | login email/password, session persistante, redirection vers l'espace protege |
| `/aujourdhui` | Aujourd'hui | Cockpit mobile du jour | emails a trier, urgences < 24h, taches du jour, productions bloquees, sync Gmail |
| `/dashboard` | Dashboard | Vue globale d'exploitation | KPIs du jour, priorites, tri inbox, productions a risque, suivi sync Gmail |
| `/analytics` | Analytics | Pilotage operationnel | volumes emails/requests, repartition par type/client, timings, retards, risques production, validations |
| `/a-traiter` | A traiter / A decider | Centre d'arbitrage humain | regroupe les alertes metier et automations, quick actions, liens directs vers les fiches |
| `/demandes` | Demandes | Liste centrale des dossiers crees a partir des emails et suivis manuels | filtres, recherche, changement statut/priorite/assignation, marquage traitee |
| `/requests/[id]` | Detail demande | Vue complete d'un dossier | resume, client, departement, modele, taches, deadlines, validations, documents, notes, historique utile |
| `/taches` | Taches | Suivi de l'execution operationnelle | statut, priorite, assignation, echeance, creation manuelle, detail tache |
| `/taches/[id]` | Detail tache | Fiche tache | contexte, demande liee, mutations, suivi de responsabilite |
| `/deadlines` | Deadlines / urgences | Suivi des dates critiques | retards, < 24h, < 48h, priorites, traitement rapide |
| `/productions` | Productions | Pilotage des dossiers industriels | statut, risque, planning, blocages, notes, creation manuelle, documents lies |
| `/emails` | Inbox emails | Flux entrant Gmail partage | liste des vrais emails, detail, qualification, rattachement, creation de demande, pieces jointes |
| `/validations-ia` | Validation IA | Relecture metier des suggestions | base de validation/correction avant conversion ou exploitation assistant |
| `/assistant-openclaw` | Assistant OpenClaw | Panneau de preparation assistant | catalogue d'actions exposees, console de test, perimeteres safe/restricted |
| `/system` | System / Monitoring | Administration technique minimale | sante sync Gmail, echecs actions, evenements recents, pipeline metrics, audit |
| `/offline` | Offline | Ecran PWA hors ligne | message clair lorsque les donnees live ne sont pas accessibles |

## Detail des grandes fonctionnalites

### 1. Authentification et securite

Utilite:
- proteger toutes les routes privees
- faire fonctionner Supabase SSR avec RLS
- preparer les permissions par role

Livre:
- login/logout
- session persistante apres refresh
- middleware SSR Supabase
- layout protege
- helper `getCurrentAppUser()`
- roles: `admin`, `development`, `production`, `logistics`, `sales`
- guards UI + garde-fous cote server actions

### 2. Gmail partage et inbox metier

Utilite:
- travailler a plusieurs sur une seule boite Gmail metier
- ne plus dependre d'emails fake
- garder une base propre pour la qualification

Livre:
- connexion OAuth Google/Gmail
- sync manuelle et incrementale
- import lecture seule
- stockage dans `inboxes`, `email_threads`, `emails`, `email_attachments`
- dedoublonnage par `external_thread_id` et `external_message_id`
- inbox partagee unique pour tous les utilisateurs authentifies
- UI de sync, statut, historique et relance

Important:
- l'app ne supprime pas les emails Gmail
- l'app n'envoie pas d'emails Gmail
- la sync est concue comme un import read-only

### 3. Qualification email -> request

Utilite:
- transformer un email reel en demande exploitable en quelques taps
- structurer l'information sans moteur IA complexe

Livre:
- panneau de qualification editable
- pre-remplissage V1 depuis `subject`, `body_text`, `preview_text`
- suggestion de `request_type`, `priority`, `due_at`, `summary`
- correction manuelle des champs metier
- creation de `requests` depuis email
- rattachement a une demande existante
- mise a jour de `emails.is_processed`, `processing_status`, `ai_summary`, `ai_classification`
- lien direct vers la demande creee

### 4. Rules automatiques apres creation de demande

Utilite:
- ne pas perdre de temps apres qualification
- lancer tout de suite les actions de base utiles

Livre:
- creation auto de task selon le type de demande
- creation auto de deadline si `due_at` existe
- regles metier sur:
  - `price_request`
  - `deadline_request`
  - `tds_request`
  - `swatch_request`
  - `trim_validation`
  - `production_followup`
  - `logistics`
  - `development`
  - `compliance`

### 5. Demandes

Utilite:
- suivre tous les dossiers clients, styles, validations et demandes urgentes

Livre:
- lecture Supabase via `v_requests_overview`
- filtres et recherche
- changement de statut
- changement de priorite
- assignation a un utilisateur
- action "marquer comme traitee"
- detail demande avec notes, documents, historique, validations, emails lies

### 6. Taches

Utilite:
- piloter qui fait quoi, pour quand, sur quel dossier

Livre:
- lecture via `v_tasks_open`
- vue liste desktop + cartes mobile
- statut, priorite, assignation, due date
- creation manuelle de tache
- creation contextuelle depuis une demande
- detail tache

### 7. Deadlines / Urgences

Utilite:
- voir les delais critiques avant qu'ils derapent

Livre:
- lecture via `v_deadlines_critical`
- widgets `< 24h`, `< 48h`, `en retard`, `critiques`
- traitement rapide
- changement de priorite
- creation manuelle de deadline
- creation contextuelle depuis une demande

### 8. Productions

Utilite:
- suivre le statut industriel et les blocages reellement operationnels

Livre:
- statut, risque, mode de production
- dates planifiees
- blocage et `blocking_reason`
- notes production
- creation manuelle de production
- creation manuelle d'order si besoin
- liaison a request / client / modele
- documents lies
- historique de production et signaux de blocage

### 9. Documents metier

Utilite:
- transformer une piece jointe email en vrai document de dossier

Livre:
- creation de document depuis `email_attachments`
- typage documentaire:
  - `tech_pack`
  - `proto_photo`
  - `price_sheet`
  - `lab_test`
  - `inspection_report`
  - `packing_list`
  - `invoice`
  - `label_artwork`
  - `composition_label`
  - `other`
- rattachement a `request`, `model`, `order`, `production`
- affichage sur les fiches demande et production

### 10. Dashboard, Aujourd'hui et centre d'action

Utilite:
- permettre un usage quotidien rapide sans naviguer partout

Livre:
- dashboard de pilotage global
- page mobile "Aujourd'hui"
- page "A traiter / A decider"
- cartes d'action priorisees
- remontes automatiques des cas a arbitrer
- quick actions metier depuis les cartes

### 11. Automations metier V1

Utilite:
- faire remonter automatiquement les dossiers qui derapent

Livre:
- moteur simple de regles metier maintenable
- stockage des runs et alertes
- lancement manuel
- exploitation dans dashboard et centre d'action

Regles V1:
- request sans update depuis trop longtemps
- task overdue
- production bloquee trop longtemps
- email non traite trop longtemps
- request sans assignation
- validation pending trop longtemps

### 12. Historique intelligent

Utilite:
- donner du contexte avant de repondre ou decider

Livre:
- panneaux d'historique sur demande et production
- composants reutilisables client / modele
- emails lies
- documents lies
- demandes similaires
- blocages repetes
- retards frequents
- validations longues
- signaux historiques lisibles sans IA lourde

### 13. Reponses assistees

Utilite:
- gagner du temps sur les reponses recurrentes sans envoyer automatiquement

Livre:
- brouillons de reponse depuis un email ou une request
- edition manuelle
- copie et sauvegarde de brouillons
- templates metier
- contexte client / request / deadline / production / historique

Types de reponses couverts:
- accuse de reception
- prise en charge
- demande d'elements manquants
- confirmation de delai
- relance fournisseur
- attente validation
- reponse apres point production
- reponse logistique

### 14. Assistant-ready / OpenClaw

Utilite:
- preparer le branchement d'un assistant texte/voix sans recoder le CRM

Livre:
- couche `features/assistant-actions`
- catalogue typed d'actions exposees
- validation d'input
- retour structure
- audit systematique
- controle par permissions
- route HTTP securisee `app/api/openclaw/route.ts`
- console interne de simulation via `app/api/openclaw/actions/route.ts`
- acteur technique serveur dedie pour les writes externes OpenClaw
- rendu compact par defaut pour WhatsApp/mobile
- doc operationnelle du bridge dans `docs/openclaw-crm-bridge.md`

Actions READ exposees:
- `getTodayUrgencies`
- `getUnprocessedEmails`
- `getRequestsWithoutAssignee`
- `getBlockedProductions`
- `getHighRiskProductions`
- `searchClientHistory`
- `searchModelHistory`

Actions SAFE WRITE exposees:
- `prepareReplyDraft`
- `createTask`
- `addNoteToRequest`
- `addNoteToProduction`

Actions sensibles fermees:
- `createDeadline`

Contrat HTTP externe actuel:
- `POST /api/openclaw`
- header `Authorization: Bearer <OPENCLAW_CRM_TOKEN>`
- body JSON `{ "action": "...", "payload": { ... } }`
- codes HTTP: `400`, `401`, `403`, `422`, `500`
- `Cache-Control: no-store`
- `payload.responseMode` supporte:
  - `compact` par defaut pour WhatsApp
  - `detailed` sur demande explicite
- les writes safe OpenClaw n'utilisent pas de session navigateur
- aucune valeur enum n'est devinee cote route externe

### 15. Monitoring, audit et observabilite

Utilite:
- durcir l'app pour un usage quotidien reel

Livre:
- audit sur actions sensibles
- monitoring Gmail sync
- historique des erreurs critiques
- panneau System
- sante pipeline email -> request
- metriques metier simples
- activity logs enrichis

Trace notamment:
- `createTask`
- `createDeadline`
- `updateProduction`
- `createDocumentFromAttachment`
- `runGmailSync`
- `createRequestFromEmail`
- `linkEmailToRequest`
- `generateReplyDraft`
- `addNoteToRequest`
- `addNoteToProduction`

### 16. Mobile, PWA et performance

Utilite:
- rendre l'outil vraiment exploitable sur telephone

Livre:
- navigation mobile-first
- burger menu et detail sheets
- cartes mobiles pour emails, demandes, taches et deadlines
- PWA installable
- shell offline minimal
- optimisation du shell: les compteurs CRM ne bloquent plus l'affichage initial

## Architecture du projet

Organisation principale:
- `app/`
  - routes App Router
  - groupes `(auth)` et `(protected)`
  - routes API Gmail / OpenClaw / summary
- `features/`
  - logique metier par domaine
  - queries, actions, composants, helpers
- `lib/`
  - clients Supabase
  - helpers partages
  - audit / runtime d'actions
- `types/`
  - types metier transverses
- `supabase/migrations/`
  - migrations minimales et robustes pour les nouvelles briques

Principes techniques:
- lecture privilegiee en Server Components
- mutations via server actions ou route handlers
- UI mobile-first, dense mais lisible
- composants reutilisables et typage strict
- RLS respectee pour les mutations utilisateur

## Permissions

Roles supportes:
- `admin`
- `development`
- `production`
- `logistics`
- `sales`

Exemples de permissions:
- sync Gmail
- qualification emails
- creation / edition demandes
- creation / edition productions
- creation deadlines
- creation documents
- lecture monitoring
- actions assistant safe ou sensibles

Note:
- l'admin peut connecter/reconnecter la boite Gmail partagee
- les actions assistant sensibles restent fermees par defaut

## Tables et vues principales

Vues:
- `v_requests_overview`
- `v_tasks_open`
- `v_deadlines_critical`

Tables principales:
- `requests`
- `tasks`
- `deadlines`
- `emails`
- `email_threads`
- `email_attachments`
- `productions`
- `orders`
- `models`
- `clients`
- `contacts`
- `documents`
- `validations`
- `activity_logs`
- `automation_alerts`
- `automation_runs`
- `gmail_sync_runs`
- `reply_drafts`
- `push_subscriptions`
- `notification_preferences`

## Variables d'environnement

Voir [.env.example](./.env.example).

Variables principales:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_GMAIL_REDIRECT_URI`
- `GOOGLE_GMAIL_SCOPE`
- `GOOGLE_GMAIL_INITIAL_SYNC_LIMIT`
- `GOOGLE_GMAIL_SYNC_QUERY`
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`
- `VAPID_SUBJECT`

## Migrations importantes

Migrations metier a appliquer selon le perimetre actif:
- [20260329_users_role_v1.sql](./supabase/migrations/20260329_users_role_v1.sql)
- [20260330_shared_gmail_inbox_v1.sql](./supabase/migrations/20260330_shared_gmail_inbox_v1.sql)
- [20260330_daily_ops_platform_v1.sql](./supabase/migrations/20260330_daily_ops_platform_v1.sql)
- [20260330_operational_automations_v1.sql](./supabase/migrations/20260330_operational_automations_v1.sql)
- [20260330_audit_monitoring_v1.sql](./supabase/migrations/20260330_audit_monitoring_v1.sql)

## Lancer le projet

```bash
npm install
npm run dev
```

Build de verification:

```bash
npm run lint
npm run build
```

## Etat actuel

Le produit est deja exploitable sur les parcours critiques:
- tri et qualification d'emails reels
- creation de demandes
- suivi execution via tasks / deadlines / productions
- arbitrage quotidien
- contexte historique
- bases solides pour assistant operationnel et industrialisation

Les briques "assistant", "notifications push" et certaines fonctions d'automatisation restent volontairement progressives, afin de garder une mise en production robuste et maintenable.
