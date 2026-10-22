"use client";

import Link from "next/link";
import { useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Copy,
  KeyRound,
  Loader2,
  ShieldCheck,
  UserPlus,
} from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import Input from "@/components/ui/input";
import { ROUTES } from "@/constants/routes";
import { createStaffAction, type CreateStaffActionResult } from "@/server/actions/staff.actions";
import type { CreateStaffInput } from "@/server/dto";
import { cn } from "@/lib/utils";

interface FormValues {
  matricule: string;
  firstName: string;
  lastName: string;
  email: string;
  role: "ADMIN" | "SUPERADMIN";
}

const EMPTY: FormValues = {
  matricule: "",
  firstName: "",
  lastName: "",
  email: "",
  role: "ADMIN",
};

const selectClassName =
  "flex h-10 w-full rounded-md border border-border-strong bg-white px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-1 focus-visible:ring-offset-white";

export default function CreateStaffForm() {
  const [values, setValues] = useState<FormValues>(EMPTY);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string | undefined>>({});
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [result, setResult] = useState<CreateStaffActionResult | null>(null);
  const [copied, setCopied] = useState(false);

  const setField = <K extends keyof FormValues>(key: K, value: FormValues[K]) => {
    setValues((current) => ({ ...current, [key]: value }));
    setFieldErrors((current) => ({ ...current, [key]: undefined }));
  };

  const validate = (): boolean => {
    const errors: Record<string, string | undefined> = {};
    if (!values.matricule.trim()) errors.matricule = "Le matricule est requis.";
    if (!values.firstName.trim()) errors.firstName = "Le prénom est requis.";
    if (!values.lastName.trim()) errors.lastName = "Le nom est requis.";
    if (!values.email.trim()) errors.email = "L’e-mail est requis.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) errors.email = "Adresse e-mail invalide.";
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    if (!validate()) return;

    const payload: CreateStaffInput = {
      matricule: values.matricule.trim().toUpperCase(),
      firstName: values.firstName.trim(),
      lastName: values.lastName.trim(),
      email: values.email.trim().toLowerCase(),
      role: values.role,
    };

    setSubmitting(true);
    const response = await createStaffAction(payload);
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
              <h2 className="text-base font-semibold text-foreground">Compte administrateur créé</h2>
              <p className="mt-1 text-sm text-text-secondary">
                Le compte <span className="font-mono font-medium">{result.matricule}</span>{" "}
                ({result.role === "SUPERADMIN" ? "super-admin" : "administrateur"}) est actif. Le
                titulaire devra définir son mot de passe à la première connexion.
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
          <Link href={ROUTES.dashboardAdministrateurs} className={buttonVariants({ variant: "outline" })}>
            Voir la liste des administrateurs
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
            placeholder="ex. ADMIN0002"
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
        <legend className="mb-1 text-sm font-semibold text-foreground">Rôle</legend>
        <div className="w-full space-y-1.5 sm:max-w-xs">
          <label htmlFor="role" className="block text-sm font-medium text-foreground">
            Niveau d’accès
          </label>
          <select
            id="role"
            value={values.role}
            onChange={(event) => setField("role", event.target.value as FormValues["role"])}
            className={cn(selectClassName)}
          >
            <option value="ADMIN">Administrateur — gère les comptes étudiants</option>
            <option value="SUPERADMIN">Super-admin — accès complet</option>
          </select>
        </div>
        <p className="text-xs text-text-muted">
          Un mot de passe temporaire sera généré et affiché après la création.
        </p>
      </fieldset>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" variant="primary" disabled={submitting}>
          {submitting ? <Loader2 size={16} className="animate-spin" aria-hidden /> : <ShieldCheck size={16} aria-hidden />}
          Créer le compte
        </Button>
        <Link href={ROUTES.dashboardAdministrateurs} className={buttonVariants({ variant: "ghost" })}>
          Annuler
        </Link>
      </div>
    </form>
  );
}
