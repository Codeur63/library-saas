"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Copy,
  KeyRound,
  Loader2,
  RotateCcw,
  Search,
  ShieldCheck,
  UserRoundX,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { TableSkeleton } from "@/components/feedback/skeletons";
import {
  listStudentsAction,
  resetStudentPasswordAction,
  setStudentStatusAction,
  type ResetPasswordActionResult,
} from "@/server/actions/students.actions";
import type { StudentListItem } from "@/server/services/students.service";
import {
  badgeClass,
  formatDate,
  statusClass,
  statusLabel,
} from "@/features/dashboard/lib/format";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 20;

const STATUS_OPTIONS = [
  { value: "", label: "Tous les statuts" },
  { value: "ACTIVE", label: "Actifs" },
  { value: "INACTIVE", label: "Inactifs" },
  { value: "SUSPENDED", label: "Suspendus" },
];

type LoadState = "loading" | "error" | "ready";

const selectClassName =
  "flex h-10 w-full rounded-md border border-border-strong bg-white px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-1 focus-visible:ring-offset-white";

export default function StudentsManager() {
  const [items, setItems] = useState<StudentListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [status, setStatus] = useState("");
  const [state, setState] = useState<LoadState>("loading");
  const [busyMatricule, setBusyMatricule] = useState<string | null>(null);
  const [resetResult, setResetResult] = useState<ResetPasswordActionResult | null>(null);
  const [notice, setNotice] = useState<{ tone: "success" | "error"; message: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    setPage(1);
  }, [debouncedQuery, status]);

  const load = useCallback(async () => {
    setState("loading");
    const result = await listStudentsAction({
      page,
      pageSize: PAGE_SIZE,
      q: debouncedQuery || undefined,
      status: status || undefined,
    });
    if (result.ok) {
      setItems(result.data.items);
      setTotal(result.data.total);
      setState("ready");
    } else {
      setState("error");
    }
  }, [page, debouncedQuery, status]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleReset = async (matricule: string) => {
    setBusyMatricule(matricule);
    setNotice(null);
    const result = await resetStudentPasswordAction(matricule);
    setBusyMatricule(null);
    if (result.ok) {
      setResetResult(result.data);
      setNotice({ tone: "success", message: "Mot de passe réinitialisé." });
    } else {
      setNotice({ tone: "error", message: result.error.message });
    }
  };

  const handleStatus = async (matricule: string, next: "ACTIVE" | "SUSPENDED" | "INACTIVE") => {
    setBusyMatricule(matricule);
    setNotice(null);
    const result = await setStudentStatusAction({ matricule, status: next });
    setBusyMatricule(null);
    if (result.ok) {
      setItems((current) =>
        current.map((item) =>
          item.matricule === matricule ? { ...item, status: result.data.status } : item
        )
      );
      setNotice({ tone: "success", message: "Statut mis à jour." });
    } else {
      setNotice({ tone: "error", message: result.error.message });
    }
  };

  const copyPassword = async () => {
    if (!resetResult) return;
    try {
      await navigator.clipboard.writeText(resetResult.temporaryPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setNotice({ tone: "error", message: "Copie impossible, notez le mot de passe manuellement." });
    }
  };

  return (
    <div className="mx-auto w-full max-w-[1100px] space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search
            size={16}
            aria-hidden
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
          />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Rechercher par nom ou matricule…"
            aria-label="Rechercher un étudiant"
            className={cn(selectClassName, "pl-9")}
          />
        </div>
        <div className="sm:w-48">
          <label className="sr-only" htmlFor="status-filter">
            Filtrer par statut
          </label>
          <select
            id="status-filter"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className={selectClassName}
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {notice && (
        <div
          role="status"
          className={cn(
            "flex items-center gap-2 rounded-md border px-4 py-3 text-sm",
            notice.tone === "success"
              ? "border-success/30 bg-success/10 text-success"
              : "border-destructive/30 bg-destructive/10 text-destructive"
          )}
        >
          {notice.tone === "success" ? (
            <CheckCircle2 size={16} aria-hidden />
          ) : (
            <AlertTriangle size={16} aria-hidden />
          )}
          {notice.message}
        </div>
      )}

      {resetResult && (
        <div className="rounded-lg border border-warning/40 bg-warning/10 p-4">
          <div className="flex items-start gap-3">
            <KeyRound size={18} aria-hidden className="mt-0.5 text-warning" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground">
                Mot de passe temporaire pour {resetResult.matricule}
              </p>
              <p className="mt-0.5 text-xs text-text-secondary">
                Communiquez-le à l’étudiant ; il devra le changer à la première connexion.
              </p>
              <div className="mt-3 flex items-center gap-2">
                <code className="rounded-md border border-border bg-white px-3 py-1.5 font-mono text-sm text-foreground">
                  {resetResult.temporaryPassword}
                </code>
                <Button variant="outline" size="sm" onClick={() => void copyPassword()}>
                  <Copy size={14} aria-hidden />
                  {copied ? "Copié" : "Copier"}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setResetResult(null)}>
                  Fermer
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {state === "loading" ? (
        <TableSkeleton />
      ) : state === "error" ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-border bg-white py-16 text-center" role="alert">
          <AlertTriangle size={32} aria-hidden className="text-warning" />
          <p className="text-base font-medium text-foreground">Impossible de charger les comptes.</p>
          <Button variant="outline" size="sm" onClick={() => void load()}>
            <RotateCcw size={14} aria-hidden />
            Réessayer
          </Button>
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-lg border border-border bg-white py-16 text-center">
          <p className="text-base font-medium text-foreground">Aucun compte trouvé.</p>
          <p className="mt-1 text-sm text-text-muted">
            Ajustez votre recherche ou créez un nouveau compte.
          </p>
        </div>
      ) : (
        <div className="w-full overflow-x-auto rounded-lg border border-border bg-white md:overflow-x-visible">
          <table className="w-full">
            <thead className="hidden bg-surface md:table-header-group">
              <tr className="border-b border-border text-left text-xs font-medium uppercase tracking-wide text-text-muted">
                <th className="px-5 py-3 font-medium">Étudiant</th>
                <th className="px-5 py-3 font-medium">Matricule</th>
                <th className="px-5 py-3 font-medium">Filière / Niveau</th>
                <th className="px-5 py-3 font-medium">Statut</th>
                <th className="px-5 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((student) => {
                const busy = busyMatricule === student.matricule;
                return (
                  <tr
                    key={student.id}
                    className="block border-b border-border last:border-0 md:table-row"
                  >
                    <td
                      data-label="Étudiant"
                      className="flex justify-between gap-3 px-4 py-3 md:table-cell md:px-5 md:py-4 md:align-middle before:text-xs before:font-medium before:text-text-muted before:content-[attr(data-label)] md:before:hidden"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground">
                          {student.firstName} {student.lastName}
                        </p>
                        <p className="text-xs text-text-muted">
                          Créé le {formatDate(student.createdAt)}
                        </p>
                      </div>
                    </td>
                    <td
                      data-label="Matricule"
                      className="flex justify-between gap-3 px-4 py-3 md:table-cell md:px-5 md:py-4 md:align-middle before:text-xs before:font-medium before:text-text-muted before:content-[attr(data-label)] md:before:hidden"
                    >
                      <span className="font-mono text-sm text-text-secondary">{student.matricule}</span>
                    </td>
                    <td
                      data-label="Filière / Niveau"
                      className="flex justify-between gap-3 px-4 py-3 md:table-cell md:px-5 md:py-4 md:align-middle before:text-xs before:font-medium before:text-text-muted before:content-[attr(data-label)] md:before:hidden"
                    >
                      <span className="text-sm text-text-secondary">
                        {student.programName ?? "—"}
                        {student.levelCode ? ` · ${student.levelCode}` : ""}
                      </span>
                    </td>
                    <td
                      data-label="Statut"
                      className="flex justify-between gap-3 px-4 py-3 md:table-cell md:px-5 md:py-4 md:align-middle before:text-xs before:font-medium before:text-text-muted before:content-[attr(data-label)] md:before:hidden"
                    >
                      <span className={badgeClass(statusClass(student.status))}>
                        {statusLabel(student.status)}
                      </span>
                    </td>
                    <td
                      data-label="Actions"
                      className="flex justify-between gap-3 px-4 py-3 md:table-cell md:px-5 md:py-4 md:align-middle md:text-right before:text-xs before:font-medium before:text-text-muted before:content-[attr(data-label)] md:before:hidden"
                    >
                      <div className="flex flex-wrap items-center gap-2 md:justify-end">
                        {student.status === "ACTIVE" ? (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={busy}
                              onClick={() => void handleStatus(student.matricule, "SUSPENDED")}
                            >
                              {busy ? <Loader2 size={14} className="animate-spin" aria-hidden /> : <UserRoundX size={14} aria-hidden />}
                              Suspendre
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={busy}
                              onClick={() => void handleStatus(student.matricule, "INACTIVE")}
                            >
                              Désactiver
                            </Button>
                          </>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={busy}
                            onClick={() => void handleStatus(student.matricule, "ACTIVE")}
                          >
                            {busy ? <Loader2 size={14} className="animate-spin" aria-hidden /> : <ShieldCheck size={14} aria-hidden />}
                            Réactiver
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={busy}
                          onClick={() => void handleReset(student.matricule)}
                        >
                          <KeyRound size={14} aria-hidden />
                          Réinitialiser
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {state === "ready" && total > 0 && (
        <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
          <p className="text-sm text-text-muted">
            {total} compte{total > 1 ? "s" : ""} · page {page} sur {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
            >
              Précédent
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
            >
              Suivant
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
