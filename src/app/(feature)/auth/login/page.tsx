"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import Input from "@/components/ui/input";
import { loginAction } from "@/server/actions/auth.actions";
import { MATRICULE_PATTERN } from "@/features/auth/lib/matricule";

interface FormErrors {
  matricule?: string;
  password?: string;
  form?: string;
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedNext = searchParams.get("next");
  const [matricule, setMatricule] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});
  const [pending, setPending] = useState(false);

  const validate = (): FormErrors => {
    const next: FormErrors = {};
    const value = matricule.trim().toUpperCase();
    if (!value) {
      next.matricule = "Le matricule est requis.";
    } else if (!MATRICULE_PATTERN.test(value)) {
      next.matricule = "Matricule invalide (6 à 16 lettres, chiffres ou tirets).";
    }
    if (!password) {
      next.password = "Le mot de passe est requis.";
    } else if (password.length < 8) {
      next.password = "Le mot de passe doit contenir au moins 8 caractères.";
    }
    return next;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors = validate();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length === 0) {
      setPending(true);
      const result = await loginAction(matricule.trim().toUpperCase(), password, requestedNext ?? undefined);
      setPending(false);

      if (result.ok) {
        router.replace(result.data.next);
        router.refresh();
      } else {
        setErrors({ form: result.error.message });
      }
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-4 py-12">
      <div className="w-full max-w-md">
        <header className="mb-8 flex flex-col items-center gap-3 text-center">
          <Image
            src="/logo-Upac.png"
            alt="Logo Université UPAC"
            width={56}
            height={56}
            className="h-14 w-14 object-contain"
            priority
          />
          <p className="text-2xl font-semibold tracking-tight text-foreground">Upac Library</p>
          <p className="text-sm text-text-muted">Université Protestante d’Afrique Centrale</p>
        </header>

        <div className="rounded-lg border border-border bg-white p-6 shadow-sm sm:p-8">
          <h1 className="text-xl font-semibold text-foreground">Connexion</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Accédez à votre bibliothèque numérique.
          </p>

          {errors.form ? (
            <p
              role="alert"
              className="mt-4 rounded-md border border-border bg-red-50 px-3 py-2 text-sm text-red-700"
            >
              {errors.form}
            </p>
          ) : null}

          <form className="mt-6 space-y-4" onSubmit={handleSubmit} noValidate>
            <Input
              label="Matricule étudiant"
              type="text"
              name="matricule"
              autoComplete="username"
              placeholder="M2025-00123"
              value={matricule}
              onChange={(event) => {
                setMatricule(event.target.value.toUpperCase());
              }}
              error={errors.matricule}
            />
            <Input
              label="Mot de passe"
              type="password"
              name="password"
              autoComplete="current-password"
              placeholder="8 caractères minimum"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
              }}
              error={errors.password}
            />

            <Button type="submit" className="w-full" loading={pending}>
              {pending ? "Connexion..." : "Se connecter"}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-text-muted">
            Votre compte est créé par votre administration.{" "}
            <Link
              href="/auth/register"
              className="font-medium text-foreground underline-offset-4 hover:underline"
            >
              Comment obtenir un compte ?
            </Link>
          </p>
        </div>

        <p className="mt-6 text-center text-xs text-text-muted">
          Accès réservé aux étudiants, enseignants et personnels de l’UPAC.
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}