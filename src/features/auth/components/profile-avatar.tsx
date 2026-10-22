import { cn } from "@/lib/utils";
import type { CurrentUser } from "@/server/current-user";

/** Initiales affichées dans l'avatar (prénom + nom), repli sur "?". */
export function initialsOf(firstName: string, lastName: string): string {
  const first = firstName.trim().charAt(0);
  const last = lastName.trim().charAt(0);
  return `${first}${last}`.toUpperCase() || "?";
}

const ROLE_LABELS: Record<CurrentUser["role"], string> = {
  STUDENT: "Étudiant",
  ADMIN: "Administrateur",
  SUPERADMIN: "Super-administrateur",
};

export function roleLabelOf(role: CurrentUser["role"]): string {
  return ROLE_LABELS[role] ?? "";
}

export default function ProfileAvatar({
  profile,
  className,
}: {
  profile: Pick<CurrentUser, "firstName" | "lastName">;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex h-9 w-9 shrink-0 select-none items-center justify-center rounded-full bg-primary text-xs font-semibold uppercase tracking-wide text-primary-foreground",
        className
      )}
    >
      {initialsOf(profile.firstName, profile.lastName)}
    </span>
  );
}
