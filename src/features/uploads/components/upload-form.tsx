"use client";

import { Check, FileUp, Loader2, Upload } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import Link from "next/link";

import { Button, buttonVariants } from "@/components/ui/button";
import Input from "@/components/ui/input";
import Textarea from "@/components/ui/textarea";
import { ROUTES, documentRoute } from "@/constants/routes";
import {
  validateFile,
  validateUpload,
  type UploadFormValues,
  type UploadSemester,
  type UploadVisibility,
} from "@/features/uploads/validation";
import type { LibraryOption, LibrarySubjectOption } from "@/types/library";

const selectClassName =
  "flex h-10 w-full rounded-md border border-border-strong bg-white px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-1 focus-visible:ring-offset-white";
const selectLabelClassName = "block text-sm font-medium text-foreground";

export interface UploadFormOptions {
  programs: LibraryOption[];
  levels: LibraryOption[];
  subjects: LibrarySubjectOption[];
  categories: LibraryOption[];
  academicYears: LibraryOption[];
}

const SEMESTER_OPTIONS: { value: UploadSemester; label: string }[] = [
  { value: "", label: "Non précisé" },
  { value: "S1", label: "Semestre 1" },
  { value: "S2", label: "Semestre 2" },
  { value: "ANNUAL", label: "Annuel" },
];

const INITIAL_VALUES: UploadFormValues = {
  title: "",
  description: "",
  programId: "",
  levelId: "",
  subjectId: "",
  categoryId: "",
  academicYearId: "",
  semester: "",
  visibility: "GLOBAL",
  accessProgramId: "",
};

export default function UploadForm({
  options,
  maxUploadMb,
}: {
  options: UploadFormOptions;
  maxUploadMb: number;
}) {
  const [values, setValues] = useState<UploadFormValues>(INITIAL_VALUES);
  const [file, setFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [status, setStatus] = useState<"idle" | "submitting" | "error" | "success">("idle");
  const [published, setPublished] = useState<{ id: string; title: string } | null>(null);
  const [fileError, setFileError] = useState<string | undefined>(undefined);
  const [serverError, setServerError] = useState<string | undefined>(undefined);
  const inputRef = useRef<HTMLInputElement>(null);

  const setField = <K extends keyof UploadFormValues>(key: K, value: UploadFormValues[K]) => {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  };

  const { programId, levelId } = values;
  const subjectOptions = useMemo(
    () =>
      options.subjects.filter(
        (subject) =>
          (!programId || subject.programId === programId) &&
          (!levelId || subject.levelId === levelId)
      ),
    [options.subjects, programId, levelId]
  );

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0] ?? null;
    setFileError(undefined);
    if (!selected) {
      setFile(null);
      return;
    }
    const validationError = validateFile(selected, maxUploadMb);
    setFileError(validationError);
    setFile(validationError ? null : selected);
  };

  const resetForm = () => {
    setValues(INITIAL_VALUES);
    setFile(null);
    setFileError(undefined);
    setErrors({});
    setServerError(undefined);
    setPublished(null);
    setStatus("idle");
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus("idle");
    setServerError(undefined);

    const nextErrors = validateUpload(values, file !== null) as Record<string, string | undefined>;
    if (fileError) nextErrors.file = fileError;
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0 || !file) return;

    setStatus("submitting");

    const metadata = {
      title: values.title.trim(),
      description: values.description.trim(),
      subjectId: values.subjectId,
      categoryId: values.categoryId,
      ...(values.academicYearId ? { academicYearId: values.academicYearId } : {}),
      ...(values.semester ? { semester: values.semester } : {}),
      visibility: values.visibility,
      ...(values.visibility === "PROGRAM" ? { accessProgramId: values.accessProgramId } : {}),
    };

    const formData = new FormData();
    formData.append("file", file);
    formData.append("metadata", JSON.stringify(metadata));

    try {
      const response = await fetch("/api/documents/upload", {
        method: "POST",
        body: formData,
      });
      const payload = (await response.json().catch(() => null)) as
        | { ok?: boolean; data?: { id: string; title: string }; error?: string }
        | null;

      if (!response.ok || !payload?.data) {
        setServerError(payload?.error ?? "Publication impossible. Veuillez réessayer.");
        setStatus("error");
        return;
      }

      setPublished(payload.data);
      setStatus("success");
    } catch {
      setServerError("Erreur réseau. Vérifiez votre connexion et réessayez.");
      setStatus("error");
    }
  };

  return (
    <div className="rounded-lg border border-border bg-white p-6 sm:p-8">
      {status === "success" && published ? (
        <div className="space-y-4 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Check size={24} aria-hidden />
          </span>
          <h2 className="text-lg font-semibold text-foreground">Document publié</h2>
          <p className="text-sm text-text-secondary">
            « {published.title} » est maintenant accessible dans la bibliothèque.
          </p>
          <div className="flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href={documentRoute(published.id)}
              className={buttonVariants({ variant: "primary" })}
            >
              Consulter le document
            </Link>
            <Button variant="outline" onClick={resetForm}>
              Publier un autre document
            </Button>
          </div>
        </div>
      ) : (
        <form className="space-y-4" onSubmit={handleSubmit} noValidate>
          <Input
            label="Titre du document"
            value={values.title}
            onChange={(event) => setField("title", event.target.value)}
            error={errors.title}
            placeholder="Ex. : Algorithmique — TD 4"
            autoComplete="off"
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="upload-filiere" className={selectLabelClassName}>
                Filière
              </label>
              <select
                id="upload-filiere"
                className={selectClassName}
                value={values.programId}
                onChange={(event) => {
                  setValues((current) => ({ ...current, programId: event.target.value, subjectId: "" }));
                }}
              >
                <option value="">Toutes les filières</option>
                {options.programs.map((program) => (
                  <option key={program.value} value={program.value}>
                    {program.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="upload-niveau" className={selectLabelClassName}>
                Niveau
              </label>
              <select
                id="upload-niveau"
                className={selectClassName}
                value={values.levelId}
                onChange={(event) => {
                  setValues((current) => ({ ...current, levelId: event.target.value, subjectId: "" }));
                }}
              >
                <option value="">Tous les niveaux</option>
                {options.levels.map((level) => (
                  <option key={level.value} value={level.value}>
                    {level.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="upload-matiere" className={selectLabelClassName}>
                Matière
              </label>
              <select
                id="upload-matiere"
                className={selectClassName}
                value={values.subjectId}
                onChange={(event) => setField("subjectId", event.target.value)}
              >
                <option value="">Sélectionner…</option>
                {subjectOptions.map((subject) => (
                  <option key={subject.value} value={subject.value}>
                    {subject.label}
                  </option>
                ))}
              </select>
              {errors.subjectId && (
                <p className="text-xs text-destructive" role="alert">
                  {errors.subjectId}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="upload-type" className={selectLabelClassName}>
                Type de document
              </label>
              <select
                id="upload-type"
                className={selectClassName}
                value={values.categoryId}
                onChange={(event) => setField("categoryId", event.target.value)}
              >
                <option value="">Sélectionner…</option>
                {options.categories.map((category) => (
                  <option key={category.value} value={category.value}>
                    {category.label}
                  </option>
                ))}
              </select>
              {errors.categoryId && (
                <p className="text-xs text-destructive" role="alert">
                  {errors.categoryId}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="upload-annee" className={selectLabelClassName}>
                Année académique (facultatif)
              </label>
              <select
                id="upload-annee"
                className={selectClassName}
                value={values.academicYearId}
                onChange={(event) => setField("academicYearId", event.target.value)}
              >
                <option value="">Non précisée</option>
                {options.academicYears.map((year) => (
                  <option key={year.value} value={year.value}>
                    {year.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="upload-semestre" className={selectLabelClassName}>
                Semestre (facultatif)
              </label>
              <select
                id="upload-semestre"
                className={selectClassName}
                value={values.semester}
                onChange={(event) => setField("semester", event.target.value as UploadSemester)}
              >
                {SEMESTER_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="upload-visibilite" className={selectLabelClassName}>
                Visibilité
              </label>
              <select
                id="upload-visibilite"
                className={selectClassName}
                value={values.visibility}
                onChange={(event) => setField("visibility", event.target.value as UploadVisibility)}
              >
                <option value="GLOBAL">Toute la bibliothèque</option>
                <option value="PROGRAM">Filière ciblée</option>
              </select>
            </div>

            {values.visibility === "PROGRAM" && (
              <div className="space-y-1.5">
                <label htmlFor="upload-cible" className={selectLabelClassName}>
                  Filière ciblée
                </label>
                <select
                  id="upload-cible"
                  className={selectClassName}
                  value={values.accessProgramId}
                  onChange={(event) => setField("accessProgramId", event.target.value)}
                >
                  <option value="">Sélectionner…</option>
                  {options.programs.map((program) => (
                    <option key={program.value} value={program.value}>
                      {program.label}
                    </option>
                  ))}
                </select>
                {errors.accessProgramId && (
                  <p className="text-xs text-destructive" role="alert">
                    {errors.accessProgramId}
                  </p>
                )}
              </div>
            )}
          </div>

          <Textarea
            label="Description (facultatif)"
            value={values.description}
            onChange={(event) => setField("description", event.target.value)}
            rows={4}
            placeholder="Résumé du contenu, chapitres abordés, public visé…"
            error={errors.description}
          />

          <div className="space-y-1.5">
            <span className={selectLabelClassName}>Fichier PDF</span>
            <label
              htmlFor="upload-file"
              className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-md border border-dashed border-border-strong px-4 py-8 text-center text-sm text-text-secondary transition-colors hover:border-primary/40 hover:bg-surface"
            >
              <FileUp size={22} aria-hidden className="text-text-muted" />
              {file ? (
                <span className="font-medium text-foreground">{file.name}</span>
              ) : (
                <span>
                  Cliquez pour choisir un fichier PDF
                  <span className="mt-1 block text-xs text-text-muted">
                    Format PDF — {maxUploadMb} Mo maximum
                  </span>
                </span>
              )}
            </label>
            <input
              ref={inputRef}
              id="upload-file"
              type="file"
              accept="application/pdf"
              className="sr-only"
              onChange={handleFileChange}
            />
            {fileError && (
              <p className="text-xs text-destructive" role="alert">
                {fileError}
              </p>
            )}
            {errors.file && (
              <p className="text-xs text-destructive" role="alert">
                {errors.file}
              </p>
            )}
          </div>

          {status === "error" && serverError && (
            <p
              role="alert"
              className="rounded-md border border-border bg-surface px-3 py-2 text-xs text-destructive"
            >
              {serverError}
            </p>
          )}

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
            <Button type="submit" disabled={status === "submitting"} className="w-full sm:w-auto">
              {status === "submitting" ? (
                <Loader2 size={16} aria-hidden className="animate-spin" />
              ) : (
                <Upload size={16} aria-hidden />
              )}
              Publier le document
            </Button>
          </div>

          <p className="text-center text-xs text-text-muted sm:text-left">
            <Link
              href={ROUTES.bibliotheque}
              className="font-medium text-foreground underline-offset-4 hover:underline"
            >
              Retour à la bibliothèque
            </Link>
          </p>
        </form>
      )}
    </div>
  );
}
