import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Compte — Upac Library",
  description:
    "Connectez-vous ou créez votre compte étudiant pour accéder à la bibliothèque numérique de l'Université Protestante d'Afrique Centrale.",
};

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}