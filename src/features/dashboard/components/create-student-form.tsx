"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Copy,
  KeyRound,
  Loader2,
  UserPlus,
} from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import Input from "@/components/ui/input";
import { FormFieldsSkeleton } from "@/components/feedback/skeletons";
import { ROUTES } from "@/constants/routes";
import { getStudentCatalogAction } from "@/server/actions/documents.actions";
import { createStudentAction, type CreateStudentActionResult } from "@/server/actions/students.actions";
import type { CreateStudentInput } from "@/server/dto";
import type { StudentCatalog } from "@/features/dashboard/lib/types";
import { cn } from "@/lib/utils";

interface FormValues {
  matricule: string;
  firstName: string;
  lastName: string;
  email: string;
  facultyId: string;
  programId: string;
  levelId: string;
  optionId: string;
}

const EMPTY: FormValues = {
  matricule: "",
  firstName: "",
  lastName: "",
  email: "",
  facultyId: "",
  programId: "",
  levelId: "",
  optionId: "",
};

const selectClassName =
  "flex h-10 w-full rounded-md border border-border-strong bg-white px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-1 focus-visible:ring-offset-white disabled:cursor-not-allowed disabled:opacity-60";

export default function CreateStudentForm() {
  const [catalog, setCatalog] = useState<StudentCatalog | null>(null);
  const [catalogError, setCatalogError] = useState(false);
  const [values, setValues] = useState<FormValues>(EMPTY);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string | undefined>>({});
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [result, setResult] = useState<CreateStudentActionResult | null>(null);
  const [copied, setCopied] = useState(false);

  const loadCatalog = useCallback(async () => {
    setCatalogError(false);
    const response = await getStudentCatalogAction();
    if (response.ok) {
      setCatalog(response.data as StudentCatalog);
    } else {
      setCatalogError(true);
    }
  }, []);

  useEffect(() => {
    void loadCatalog();
  }, [loadCatalog]);

  const programs = useMemo(
    () => (catalog ? catalog.programs.filter((program) => program.facultyId === values.facultyId) : []),
    [catalog, values.facultyId]
  );

  const options = useMemo(
    () => (catalog ? catalog.options.filter((option) => option.programId === values.programId) : []),
    [catalog, values.programId]
  );

  const setField = <K extends keyof FormValues>(key: K, value: FormValues[K]) => {
    setValues((current) => {
      const next = { ...current, [key]: value };
      if (key === "facultyId") {
        next.programId = "";
        next.optionId = "";
      }
      if (key === "programId") {
        next.optionId = "";
      }
      return next;
    });
    setFieldErrors((current) => ({ ...current, [key]: undefined }));
  };

  const validate = (): boolean => {
    const errors: Record<string, string | undefined> = {};
    if (!values.matricule.trim()) errors.matricule = "Le matricule est requis.";
    if (!values.firstName.trim()) errors.firstName = "Le prénom est requis.";
    if (!values.lastName.trim()) errors.lastName = "Le nom est requis.";
    if (!values.email.trim()) errors.email = "L’e-mail est requis.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) errors.email = "Adresse e-mail invalide.";
    if (!values.programId) errors.programId = "Sélectionnez une filière.";
    if (!values.levelId) errors.levelId = "Sélectionnez un niveau.";
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    if (!validate()) return;

    const payload: CreateStudentInput = {
      matricule: values.matricule.trim().toUpperCase(),
      firstName: values.firstName.trim(),
      lastName: values.lastName.trim(),
      email: values.email.trim().toLowerCase(),
      programId: values.programId,
      levelId: values.levelId,
      optionId: values.optionId || null,
    };

    setSubmitting(true);
    const response = await createStudentAction(payload);
    setSubmitting(false);

    if (response.ok) {
      setResult(response.data);
      setValues(EMPTY);
    } else {
      setFormError(response.error.message);
    }
  };

  const copyPassword = async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.temporaryPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setFormError("Copie impossible, notez le mot de passe manuellement.");
    }
  };

  if (result) {
    return (
      <div className="space-y-6">
        <div className="rounded-lg border border-success/30 bg-success/10 p-6">
          <div className="flex items-start gap-3">
            <CheckCircle2 size={20} aria-hidden className="mt-0.5 text-success" />
            <div className="min-w-0 flex-1">
              <h2 className="text-base font-semibold text-foreground">Compte créé avec succès</h2>
              <p className="mt-1 text-sm text-text-secondary">
                Le compte <span className="font-mono font-medium">{result.matricule}</span> est actif.
                L’étudiant devra définir son mot de passe à la première connexion.
              </p>
              <div className="mt-4">
                <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
                  Mot de passe temporaire
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <code className="inline-flex items-center gap-2 rounded-md border border-border bg-white px-3 py-1.5 font-mono text-sm text-foreground">
                    <KeyRound size={14} aria-hidden className="text-text-muted" />
                    {result.temporaryPassword}
                  </code>
                  <Button variant="outline" size="sm" onClick={() => void copyPassword()}>
                    <Copy size={14} aria-hidden />
                    {copied ? "Copié" : "Copier"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" onClick={() => setResult(null)}>
            <UserPlus size={16} aria-hidden />
            Créer un autre compte
          </Button>
          <Link href={ROUTES.dashboardEtudiants} className={buttonVariants({ variant: "outline" })}>
            Voir la liste des comptes
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-6" noValidate>
      {formError && (
        <div
          role="alert"
          className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          <AlertTriangle size={16} aria-hidden />
          {formError}
        </div>
      )}

      <fieldset className="space-y-4" disabled={submitting}>
        <legend className="mb-1 text-sm font-semibold text-foreground">Identité</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Matricule"
            value={values.matricule}
            onChange={(event) => setField("matricule", event.target.value.toUpperCase())}
            error={fieldErrors.matricule}
            placeholder="ex. STU2026002"
            autoComplete="off"
            required
          />
          <Input
            label="Adresse e-mail"
            type="email"
            value={values.email}
            onChange={(event) => setField("email", event.target.value)}
            error={fieldErrors.email}
            placeholder="prenom.nom@upac.local"
            autoComplete="off"
            required
          />
          <Input
            label="Prénom"
            value={values.firstName}
            onChange={(event) => setField("firstName", event.target.value)}
            error={fieldErrors.firstName}
            required
          />
          <Input
            label="Nom"
            value={values.lastName}
            onChange={(event) => setField("lastName", event.target.value)}
            error={fieldErrors.lastName}
            required
          />
        </div>
      </fieldset>

      <fieldset className="space-y-4" disabled={submitting}>
        <legend className="mb-1 text-sm font-semibold text-foreground">Affectation académique</legend>

        {catalogError ? (
          <div className="flex items-center gap-3 rounded-md border border-border bg-white px-4 py-3 text-sm text-text-secondary">
            <AlertTriangle size={16} aria-hidden className="text-warning" />
            Impossible de charger les filières et niveaux.
            <Button variant="ghost" size="sm" onClick={() => void loadCatalog()}>
              Réessayer
            </Button>
          </div>
        ) : !catalog ? (
          <FormFieldsSkeleton fields={4} />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="w-full space-y-1.5">
              <label htmlFor="faculty" className="block text-sm font-medium text-foreground">
                Faculté
              </label>
              <select
                id="faculty"
                value={values.facultyId}
                onChange={(event) => setField("facultyId", event.target.value)}
                className={selectClassName}
              >
                <option value="">Sélectionner…</option>
                {catalog.faculties.map((faculty) => (
                  <option key={faculty.id} value={faculty.id}>
                    {faculty.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="w-full space-y-1.5">
              <label htmlFor="program" className="block text-sm font-medium text-foreground">
                Filière
              </label>
              <select
                id="program"
                value={values.programId}
                onChange={(event) => setField("programId", event.target.value)}
                disabled={!values.facultyId}
                aria-invalid={fieldErrors.programId ? true : undefined}
                className={cn(selectClassName, fieldErrors.programId && "border-destructive")}
              >
                <option value="">Sélectionner…</option>
                {programs.map((program) => (
                  <option key={program.id} value={program.id}>
                    {program.name}
                  </option>
                ))}
              </select>
              {fieldErrors.programId && (
                <p className="text-xs text-destructive" role="alert">{fieldErrors.programId}</p>
              )}
            </div>

            <div className="w-full space-y-1.5">
              <label htmlFor="level" className="block text-sm font-medium text-foreground">
                Niveau
              </label>
              <select
                id="level"
                value={values.levelId}
                onChange={(event) => setField("levelId", event.target.value)}
                aria-invalid={fieldErrors.levelId ? true : undefined}
                className={cn(selectClassName, fieldErrors.levelId && "border-destructive")}
              >
                <option value="">Sélectionner…</option>
                {catalog.levels.map((level) => (
                  <option key={level.id} value={level.id}>
                    {level.code} — {level.name}
                  </option>
                ))}
              </select>
              {fieldErrors.levelId && (
                <p className="text-xs text-destructive" role="alert">{fieldErrors.levelId}</p>
              )}
            </div>

            <div className="w-full space-y-1.5">
              <label htmlFor="option" className="block text-sm font-medium text-foreground">
                Option <span className="font-normal text-text-muted">(facultatif)</span>
              </label>
              <select
                id="option"
                value={values.optionId}
                onChange={(event) => setField("optionId", event.target.value)}
                disabled={options.length === 0}
                className={selectClassName}
              >
                <option value="">Aucune option</option>
                {options.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        <p className="text-xs text-text-muted">
          Un mot de passe temporaire sera généré et affiché après la création.
        </p>
      </fieldset>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" variant="primary" disabled={submitting || !catalog}>
          {submitting ? <Loader2 size={16} className="animate-spin" aria-hidden /> : <UserPlus size={16} aria-hidden />}
          Créer le compte
        </Button>
        <Link href={ROUTES.dashboardEtudiants} className={buttonVariants({ variant: "ghost" })}>
          Annuler
        </Link>
      </div>
    </form>
  );
}
