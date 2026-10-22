import { cn } from "@/lib/utils";

export const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Actif",
  INACTIVE: "Inactif",
  SUSPENDED: "Suspendu",
};

export const STATUS_CLASSES: Record<string, string> = {
  ACTIVE: "border-success/30 bg-success/10 text-success",
  INACTIVE: "border-border-strong bg-surface text-text-secondary",
  SUSPENDED: "border-destructive/30 bg-destructive/10 text-destructive",
};

export function statusLabel(status: string): string {
  return STATUS_LABELS[status] ?? status;
}

export function statusClass(status: string): string {
  return STATUS_CLASSES[status] ?? "border-border-strong bg-surface text-text-secondary";
}

export const ROLE_LABELS: Record<string, string> = {
  STUDENT: "Étudiant",
  ADMIN: "Administrateur",
  SUPERADMIN: "Super-admin",
};

export const ROLE_CLASSES: Record<string, string> = {
  STUDENT: "border-border-strong bg-surface text-text-secondary",
  ADMIN: "border-info/30 bg-info/10 text-info",
  SUPERADMIN: "border-primary/30 bg-primary/10 text-foreground",
};

export function roleLabel(role: string): string {
  return ROLE_LABELS[role] ?? role;
}

export function roleClass(role: string): string {
  return ROLE_CLASSES[role] ?? ROLE_CLASSES.STUDENT;
}

const ACTION_LABELS: Record<string, string> = {
  "student.created": "Création de compte étudiant",
  "student.updated": "Mise à jour de compte étudiant",
  "student.password_reset": "Réinitialisation de mot de passe",
  "student.status_changed": "Changement de statut étudiant",
  "staff.created": "Création de compte admin",
  "staff.status_changed": "Changement de statut admin",
  "staff.password_reset": "Réinitialisation de mot de passe admin",
  "document.uploaded": "Publication de document",
  "document.updated": "Mise à jour de document",
  "document.deleted": "Suppression de document",
};

export function actionLabel(action: string): string {
  if (ACTION_LABELS[action]) return ACTION_LABELS[action];
  return action.replace(/[._]/g, " ").replace(/^\w/, (char) => char.toUpperCase());
}

export function formatDate(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function formatDateTime(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("fr-FR").format(value);
}

export function badgeClass(base: string): string {
  return cn(
    "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
    base
  );
}
