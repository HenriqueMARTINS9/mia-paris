import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Bot,
  Inbox,
  LayoutGrid,
  OctagonAlert,
  PackageCheck,
  Radar,
  Sparkles,
  Sun,
  TimerReset,
  ClipboardList,
  ListTodo,
} from "lucide-react";

import type { AppPermission } from "@/features/auth/authorization";
import type { CrmSummary } from "@/types/crm";

export interface NavigationItem {
  href: string;
  label: string;
  shortLabel: string;
  description: string;
  icon: LucideIcon;
  requiredPermission?: AppPermission;
  summaryKey?: keyof CrmSummary;
}

export const primaryNavigation: NavigationItem[] = [
  {
    href: "/aujourdhui",
    label: "Aujourd’hui",
    shortLabel: "Now",
    description: "Cockpit quotidien mobile-first pour arbitrer le jour",
    icon: Sun,
  },
  {
    href: "/dashboard",
    label: "Dashboard",
    shortLabel: "Dash",
    description: "Vue pilotage global MIA PARIS",
    icon: LayoutGrid,
  },
  {
    href: "/analytics",
    label: "Analytics",
    shortLabel: "Ana",
    description: "Lecture pilotage des volumes, timings, risques et dérives métier",
    icon: BarChart3,
  },
  {
    href: "/a-traiter",
    label: "À traiter",
    shortLabel: "Act",
    description: "Centre d’action pour arbitrer ce qui demande une décision humaine",
    icon: OctagonAlert,
    summaryKey: "actionItems",
  },
  {
    href: "/demandes",
    label: "Demandes",
    shortLabel: "Req",
    description: "Emails entrants transformés en opportunités produit",
    icon: ClipboardList,
  },
  {
    href: "/taches",
    label: "Tâches",
    shortLabel: "Task",
    description: "Actions ouvertes par équipe et dossier",
    icon: ListTodo,
    summaryKey: "openTasks",
  },
  {
    href: "/deadlines",
    label: "Deadlines",
    shortLabel: "DDL",
    description: "Urgences, dérives planning et points bloquants",
    icon: TimerReset,
    summaryKey: "criticalDeadlines",
  },
  {
    href: "/productions",
    label: "Productions",
    shortLabel: "Prod",
    description: "Lancement industriel, atelier et expédition",
    icon: PackageCheck,
    summaryKey: "activeProductions",
  },
  {
    href: "/emails",
    label: "Inbox emails",
    shortLabel: "Mail",
    description: "Flux entrant à qualifier et rattacher",
    icon: Inbox,
    summaryKey: "inboundEmails",
  },
];

export const secondaryNavigation: NavigationItem[] = [
  {
    href: "/validations-ia",
    label: "Validation IA",
    shortLabel: "IA",
    description: "Relecture métier avant création d'objets CRM",
    icon: Sparkles,
    requiredPermission: "emails.qualify",
    summaryKey: "pendingValidations",
  },
  {
    href: "/assistant-openclaw",
    label: "Assistant OpenClaw",
    shortLabel: "Bot",
    description: "Préparation des intégrations copilote",
    icon: Bot,
    requiredPermission: "assistant.read",
  },
  {
    href: "/system",
    label: "System",
    shortLabel: "Sys",
    description: "Monitoring prod minimal, sync Gmail et audit des actions sensibles",
    icon: Radar,
    requiredPermission: "monitoring.read",
  },
];
