"use client";

import Image from "next/image";
import Link from "next/link";
import { FileUp, UserPlus, KeyRound } from "lucide-react";

const STEPS = [
  {
    icon: UserPlus,
    title: "Votre compte est créé par l’administration",
    text: "En vous inscrivant, le secrétariat de votre filière crée votre compte avec votre matricule.",
  },
  {
    icon: KeyRound,
    title: "Première connexion",
    text: "Vous recevez un mot de passe temporaire à changer lors de votre première connexion.",
  },
  {
    icon: FileUp,
    title: "Accédez aux ressources",
    text: "Une fois connecté, consultez et téléchargez les documents de votre bibliothèque.",
  },
];

export default function RegisterPage() {
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
          <h1 className="text-xl font-semibold text-foreground">Créer un compte</h1>
          <p className="mt-1 text-sm text-text-secondary">
            L’inscription à la bibliothèque se fait auprès de votre établissement.
          </p>

          <ul className="mt-6 space-y-5">
            {STEPS.map((step) => (
              <li key={step.title} className="flex items-start gap-3">
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border bg-surface text-text-secondary"
                  aria-hidden
                >
                  <step.icon size={16} />
                </span>
                <div>
                  <p className="text-sm font-semibold text-foreground">{step.title}</p>
                  <p className="mt-0.5 text-sm leading-relaxed text-text-secondary">{step.text}</p>
                </div>
              </li>
            ))}
          </ul>

          <Link
            href="/auth/login"
            className="mt-8 flex h-11 w-full items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Se connecter
          </Link>

          <p className="mt-4 rounded-md border border-border bg-surface px-3 py-2 text-center text-xs text-text-secondary">
            Nouveaux comptes gérés par le secrétariat — aucun mot de passe n’est défini ici.
          </p>
        </div>
      </div>
    </div>
  );
}