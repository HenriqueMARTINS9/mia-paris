import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Bot,
  ClipboardList,
  Euro,
  FileText,
  Inbox,
  LayoutGrid,
  ListTodo,
  OctagonAlert,
  PackageCheck,
  Radar,
  Sparkles,
  TimerReset,
  Truck,
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

export interface NavigationSection {
  id: string;
  label: string;
  description: string;
  collapsedByDefault?: boolean;
  items: NavigationItem[];
}

export const navigationSections: NavigationSection[] = [
  {
    id: "primary",
    label: "Principal",
    description: "Les seuls écrans à garder sous les yeux au quotidien.",
    items: [
      {
        href: "/dashboard",
        label: "Dashboard",
        shortLabel: "Dash",
        description: "Vue de contrôle simple pour ce qui mérite une vérification",
        icon: LayoutGrid,
      },
      {
        href: "/syntheses",
        label: "Synthèses",
        shortLabel: "Syn",
        description: "Résumé quotidien écrit par Claw, client par client",
        icon: FileText,
      },
      {
        href: "/emails",
        label: "Inbox emails",
        shortLabel: "Mail",
        description: "Emails importants à vérifier, rattacher ou absorber",
        icon: Inbox,
        summaryKey: "inboundEmails",
      },
      {
        href: "/demandes",
        label: "Demandes",
        shortLabel: "Req",
        description: "Dossiers métier déjà captés par le CRM",
        icon: ClipboardList,
      },
      {
        href: "/taches",
        label: "Tâches",
        shortLabel: "Task",
        description: "Actions à faire, à suivre ou à relancer",
        icon: ListTodo,
        summaryKey: "openTasks",
      },
    ],
  },
  {
    id: "complements",
    label: "Compléments",
    description: "Le reste du CRM, utile au besoin mais volontairement caché au premier abord.",
    collapsedByDefault: true,
    items: [
      {
        href: "/aujourdhui",
        label: "Aujourd’hui",
        shortLabel: "Now",
        description: "Cockpit quotidien détaillé si tu veux aller plus loin que le dashboard",
        icon: LayoutGrid,
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
        description: "Lancement industriel, atelier, façonnier et expédition",
        icon: PackageCheck,
        summaryKey: "activeProductions",
      },
      {
        href: "/developpement",
        label: "Développement",
        shortLabel: "Dev",
        description: "Prototype, TDS, swatches et validations trim regroupés par métier",
        icon: ClipboardList,
      },
      {
        href: "/logistique",
        label: "Logistique",
        shortLabel: "Log",
        description: "Délais, conformité, inspection et flux export au même endroit",
        icon: Truck,
      },
      {
        href: "/facturation",
        label: "Facturation",
        shortLabel: "€",
        description: "Demandes de prix, price sheets et pièces de facturation consolidées",
        icon: Euro,
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
        href: "/analytics",
        label: "Analytics",
        shortLabel: "Ana",
        description: "Lecture pilotage des volumes, timings, risques et dérives métier",
        icon: BarChart3,
      },
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
    ],
  },
];
