"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import Input from "@/components/ui/input";
import { changePasswordAction, logoutAction } from "@/server/actions/auth.actions";

interface FormErrors {
  current?: string;
  next?: string;
  confirm?: string;
  form?: string;
}

export default function ChangePasswordPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formErrors: FormErrors = {};
    if (!current) formErrors.current = "Le mot de passe actuel est requis.";
    if (next.length < 8) formErrors.next = "Le nouveau mot de passe doit contenir au moins 8 caractères.";
    if (!confirm) formErrors.confirm = "La confirmation est requise.";
    else if (confirm !== next) formErrors.confirm = "Les deux mots de passe ne correspondent pas.";
    setErrors(formErrors);
    if (Object.keys(formErrors).length > 0) return;

    startTransition(async () => {
      const result = await changePasswordAction(current, next, confirm);
      if (result.ok) {
        router.replace("/");
        router.refresh();
      } else {
        setErrors({ form: result.error.message });
      }
    });
  };

  const handleLogout = () => {
    startTransition(async () => {
      await logoutAction();
      router.replace("/auth/login");
      router.refresh();
    });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-4 py-12">
      <div className="w-full max-w-md">
        <div className="rounded-lg border border-border bg-white p-6 shadow-sm sm:p-8">
          <h1 className="text-xl font-semibold text-foreground">Changer de mot de passe</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Saisissez votre mot de passe actuel, puis choisissez un nouveau mot de passe
            personnel.
          </p>

          {errors.form ? (
            <p role="alert" className="mt-4 rounded-md border border-border bg-red-50 px-3 py-2 text-sm text-red-700">
              {errors.form}
            </p>
          ) : null}

          <form className="mt-6 space-y-4" onSubmit={handleSubmit} noValidate>
            <Input
              label="Mot de passe actuel"
              type="password"
              name="current"
              autoComplete="current-password"
              value={current}
              onChange={(event) => setCurrent(event.target.value)}
              error={errors.current}
            />
            <Input
              label="Nouveau mot de passe"
              type="password"
              name="next"
              autoComplete="new-password"
              placeholder="8 caractères minimum"
              value={next}
              onChange={(event) => setNext(event.target.value)}
              error={errors.next}
            />

            <Input
              label="Confirmer le nouveau mot de passe"
              type="password"
              name="confirm"
              autoComplete="new-password"
              placeholder="Répétez le mot de passe"
              value={confirm}
              onChange={(event) => setConfirm(event.target.value)}
              error={errors.confirm}
            />

            <Button
              type="submit"
              className="w-full"
              loading={isPending}
              disabled={confirm.length > 0 && confirm !== next}
            >
              {isPending ? "Enregistrement..." : "Enregistrer le mot de passe"}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-text-muted">
            <Link
              href="/auth/login"
              onClick={(event) => {
                event.preventDefault();
                handleLogout();
              }}
              className="font-medium text-foreground underline-offset-4 hover:underline"
            >
              Se déconnecter
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}