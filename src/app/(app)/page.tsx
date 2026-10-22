import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";

import { LibraryOverviewSkeleton } from "@/components/feedback/skeletons";
import {
  ArrowRight,
  Binary,
  ChevronRight,
  ClipboardList,
  FileSearch,
  FileText,
  GraduationCap,
  Search,
  type LucideIcon,
} from "lucide-react";

import { FACULTIES } from "@/constants/faculties";
import { FILIERE_ICONS } from "@/constants/filieres";
import { ROUTES, documentRoute } from "@/constants/routes";
import DownloadCount from "@/features/documents/components/download-count";
import { getCurrentUser, type CurrentUser } from "@/server/current-user";
import { getLibraryOverview } from "@/server/services/library.service";
import type { LibraryOverview } from "@/types/library";
import { formatBytes, formatFrenchDate } from "@/utils/format";

const primaryButton =
  "inline-flex h-11 items-center justify-center gap-2 rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90";
const secondaryButton =
  "inline-flex h-11 items-center justify-center gap-2 rounded-md border border-border-strong bg-white px-6 text-sm font-medium text-foreground transition-colors hover:bg-surface";

export const metadata: Metadata = {
  title: "Upac Library — Bibliothèque numérique universitaire",
  description:
    "Cours, travaux dirigés, examens et mémoires en ligne pour les étudiants de toutes les filières de l'Université Protestante d'Afrique Centrale.",
};

const CATEGORY_ICONS: { match: string; icon: LucideIcon }[] = [
  { match: "cours", icon: FileText },
  { match: "td", icon: ClipboardList },
  { match: "exam", icon: FileSearch },
  { match: "mémoire", icon: GraduationCap },
];

function iconForCategory(name: string): LucideIcon {
  const lower = name.toLowerCase();
  return CATEGORY_ICONS.find((entry) => lower.includes(entry.match))?.icon ?? FileText;
}

const FAQ = [
  {
    question: "Comment télécharger un document ?",
    answer:
      "Ouvrez la bibliothèque, recherchez ou filtrez les documents, puis cliquez sur le bouton « Télécharger » de la ressource souhaitée.",
  },
  {
    question: "La consultation est-elle gratuite pour les étudiants ?",
    answer:
      "Oui, l’accès aux ressources est gratuit pour les étudiants inscrits à l’Université Protestante d’Afrique Centrale.",
  },
  {
    question: "Comment un enseignant publie-t-il un document ?",
    answer:
      "La publication est gérée par la direction de la bibliothèque. Contactez le secrétariat de votre filière pour soumettre un document.",
  },
  {
    question: "Puis-je retrouver les documents d’une matière précise ?",
    answer:
      "Oui, utilisez le filtre « Matière » de la bibliothèque, ou les pages dédiées de chaque filière.",
  },
];

export default async function AccueilPage() {
  const user = await getCurrentUser();

  return (
    <div>
      <section className="mx-auto grid w-full max-w-[1280px] gap-10 px-4 py-12 sm:px-6 lg:grid-cols-2 lg:items-center lg:py-16">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-text-muted">
            Université Protestante d’Afrique Centrale
          </p>
          <h1 className="mt-3 max-w-[20ch] text-[2.25rem] font-semibold leading-[1.12] tracking-tight sm:text-[2.5rem]">
            La bibliothèque académique de l’UPAC
          </h1>
          <p className="mt-4 max-w-[60ch] text-base leading-relaxed text-text-secondary">
            Cours, travaux dirigés, examens et mémoires en ligne pour les étudiants de toutes les
            filières. Trouvez et téléchargez votre document en quelques secondes.
          </p>
          <form
            action={ROUTES.bibliotheque}
            method="get"
            role="search"
            className="mt-8 flex max-w-xl flex-col gap-3 sm:flex-row"
          >
            <label htmlFor="recherche-accueil" className="sr-only">
              Rechercher un document
            </label>
            <input
              id="recherche-accueil"
              name="q"
              type="search"
              placeholder="Rechercher un cours, un examen, un TD..."
              className="h-11 flex-1 rounded-md border border-border-strong bg-white px-4 text-sm text-foreground transition-colors placeholder:text-muted-foreground/60 hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            />
            <button type="submit" className={primaryButton}>
              Rechercher
              <Search size={16} aria-hidden />
            </button>
          </form>
          {user ? (
            <p className="mt-4 text-xs text-text-muted">
              Ou{" "}
              <Link
                href={ROUTES.filieres}
                className="font-medium text-foreground underline-offset-4 hover:underline"
              >
                explorez par filière
              </Link>
            </p>
          ) : (
            <p className="mt-4 max-w-xl text-xs leading-relaxed text-text-muted">
              L’accès au catalogue est réservé aux étudiants et personnels de l’UPAC.{" "}
              <Link
                href={ROUTES.login}
                className="font-medium text-foreground underline-offset-4 hover:underline"
              >
                Se connecter
              </Link>{" "}
              ·{" "}
              <Link
                href={ROUTES.register}
                className="font-medium text-foreground underline-offset-4 hover:underline"
              >
                Demander un compte
              </Link>
            </p>
          )}
        </div>

        <div
          className="relative hidden aspect-[4/3] overflow-hidden rounded-lg border border-border lg:block"
          aria-hidden
        >
          <Image
            src="/university.jpg"
            alt=""
            fill
            priority
            sizes="(max-width: 1024px) 0px, 50vw"
            className="object-cover"
          />
        </div>
      </section>

      {user && (
        <Suspense fallback={<LibraryOverviewSkeleton />}>
          <LibraryOverviewSection user={user} />
        </Suspense>
      )}

      <section className="mx-auto w-full max-w-[1280px] px-4 py-14 sm:px-6">
        <div className="border-t border-border pt-14">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-text-muted">
                Notre institution
              </p>
              <h2 className="mt-3 max-w-[38ch] text-2xl font-semibold tracking-tight text-foreground">
                L’UPAC, quatre facultés au service de chaque vocation
              </h2>
            </div>
            <Link
              href={ROUTES.filieres}
              className="inline-flex shrink-0 items-center gap-1.5 text-sm font-medium text-foreground underline-offset-4 hover:underline"
            >
              Toutes les filières
              <ArrowRight size={15} aria-hidden />
            </Link>
          </div>
          <p className="mt-4 max-w-[80ch] text-sm leading-relaxed text-text-secondary">
            Sur la colline de Djoungolo à Yaoundé (Cameroun), l’Université Protestante d’Afrique
            Centrale — institution confessionnelle d’enseignement supérieur fondée en 1962 —
            structure son offre de formation autour de quatre facultés principales.
          </p>
        </div>

        <ul className="mt-8 divide-y divide-border border-y border-border">
          {FACULTIES.map((faculty) => {
            const Icon = faculty.icon;
            return (
              <li key={faculty.code} className="px-1 py-5 sm:px-3">
                <div className="grid gap-3 md:grid-cols-[minmax(0,18rem)_minmax(0,1fr)] md:items-start md:gap-8">
                  <div className="flex min-w-0 items-start gap-3">
                    <span
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-border bg-surface text-text-secondary"
                      aria-hidden
                    >
                      <Icon size={18} />
                    </span>
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold leading-snug text-foreground">
                        {faculty.name}
                      </h3>
                      <p className="mt-1 text-xs text-text-muted">
                        {faculty.code}
                        {faculty.established ? ` · depuis ${faculty.established}` : ""}
                      </p>
                    </div>
                  </div>
                  <p className="text-sm leading-relaxed text-text-secondary">{faculty.description}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="mx-auto w-full max-w-[1280px] px-4 py-14 sm:px-6">
        <div className="border-t border-border pt-14">
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">
            Questions fréquentes
          </h2>
        </div>
        <ul className="mt-6 divide-y divide-border border-y border-border">
          {FAQ.map((item) => (
            <li key={item.question}>
              <details className="group">
                <summary className="flex cursor-pointer items-center gap-3 py-4 text-sm font-semibold text-foreground marker:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40">
                  <ChevronRight
                    size={16}
                    aria-hidden
                    className="transition-transform group-open:rotate-90"
                  />
                  {item.question}
                </summary>
                <p className="pb-4 pl-7 text-sm leading-relaxed text-text-secondary">
                  {item.answer}
                </p>
              </details>
            </li>
          ))}
        </ul>
      </section>

      <section className="bg-surface border-t border-border">
        <div className="mx-auto flex w-full max-w-[1280px] flex-col items-start gap-6 px-4 py-14 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">
              {user ? "Poursuivez votre recherche" : "Accéder à la bibliothèque"}
            </h2>
            <p className="mt-2 max-w-[60ch] text-base text-text-secondary">
              {user
                ? "Explorez l’ensemble du catalogue, filtrez par filière, niveau et matière, et enregistrez vos favoris."
                : "Le catalogue est réservé aux étudiants et personnels de l’UPAC. Connectez-vous avec votre matricule ou demandez un compte au secrétariat de votre filière."}
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            {user ? (
              <Link href={ROUTES.bibliotheque} className={primaryButton}>
                Accéder à la bibliothèque
              </Link>
            ) : (
              <>
                <Link href={ROUTES.login} className={primaryButton}>
                  Se connecter
                </Link>
                <Link href={ROUTES.register} className={secondaryButton}>
                  Demander un compte
                </Link>
              </>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

async function LibraryOverviewSection({ user }: { user: CurrentUser }) {
  const overview = await getLibraryOverview(async () => user);
  return <LibrarySections overview={overview} />;
}

function LibrarySections({ overview }: { overview: LibraryOverview }) {
  const stats = [
    { label: "Documents", value: overview.totals.documents },
    { label: "Filières", value: overview.totals.programs },
    { label: "Matières", value: overview.totals.subjects },
    { label: "Types", value: overview.totals.categories },
  ];
  const recent = overview.recentDocuments;
  const categories = overview.categories.filter((category) => category.count > 0);
  const popularMatieres = overview.topSubjects.slice(0, 6);
  const filieres = overview.programs.filter((program) => program.count > 0);

  return (
    <>
      <section className="border-y border-border">
        <dl className="mx-auto grid w-full max-w-[1280px] grid-cols-2 gap-px bg-border px-4 sm:px-6 lg:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label} className="bg-background px-2 py-8 text-center lg:py-10">
              <dt className="text-xs font-medium uppercase tracking-[0.14em] text-text-muted">
                {stat.label}
              </dt>
              <dd className="mt-2 text-3xl font-semibold tracking-tight text-foreground">
                {stat.value}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      {recent.length > 0 && (
        <section className="bg-surface border-b border-border">
          <div className="mx-auto w-full max-w-[1280px] px-4 py-14 sm:px-6">
            <div className="flex items-baseline justify-between gap-4">
              <h2 className="text-2xl font-semibold tracking-tight text-foreground">
                Derniers ajouts
              </h2>
              <Link
                href={ROUTES.bibliotheque}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground underline-offset-4 hover:underline"
              >
                Tout le catalogue
                <ArrowRight size={15} aria-hidden />
              </Link>
            </div>
            <ul className="mt-6 divide-y divide-border border-y border-border bg-white">
              {recent.map((doc) => {
                const Icon = iconForCategory(doc.category.name);
                return (
                  <li key={doc.id}>
                    <Link
                      href={documentRoute(doc.id)}
                      className="group flex items-start gap-3 px-1 py-4 transition-colors hover:bg-surface sm:items-center sm:gap-4 sm:px-3"
                    >
                      <span
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-border bg-surface text-text-muted"
                        aria-hidden
                      >
                        <Icon size={18} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-foreground group-hover:underline group-hover:underline-offset-4">
                          {doc.title}
                        </span>
                        <span className="mt-0.5 block text-xs text-text-muted">
                          {doc.subject.program.name} · {doc.subject.level.code} ·{" "}
                          {doc.subject.name} · {doc.category.name}
                        </span>
                      </span>
                      <span className="flex shrink-0 flex-col items-end gap-1 text-xs text-text-muted sm:flex-row sm:items-center sm:gap-3">
                        <span className="hidden rounded border border-border bg-surface px-1.5 py-0.5 font-medium text-text-secondary sm:inline">
                          {doc.fileExtension.toUpperCase()}
                        </span>
                        <span>{formatBytes(doc.fileSize)}</span>
                        <span className="hidden lg:inline">
                          {formatFrenchDate(doc.createdAt, true)}
                        </span>
                        <DownloadCount count={doc.downloadCount} compact />
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>
      )}

      {categories.length > 0 && (
        <section className="mx-auto w-full max-w-[1280px] px-4 py-14 sm:px-6">
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">
            Par type de ressource
          </h2>
          <ul className="mt-6 divide-y divide-border border-y border-border">
            {categories.map((category) => {
              const Icon = iconForCategory(category.name);
              return (
                <li key={category.id}>
                  <Link
                    href={`${ROUTES.bibliotheque}?categoryId=${category.id}`}
                    className="group flex items-center gap-4 px-1 py-4 transition-colors hover:bg-surface sm:px-3"
                  >
                    <span
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-border bg-surface text-text-secondary"
                      aria-hidden
                    >
                      <Icon size={18} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-foreground">
                        {category.name}
                      </span>
                      <span className="block text-xs text-text-muted">
                        {category.count} {category.count > 1 ? "documents" : "document"}
                      </span>
                    </span>
                    <ChevronRight
                      size={16}
                      aria-hidden
                      className="shrink-0 text-text-muted transition-transform group-hover:translate-x-0.5"
                    />
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {popularMatieres.length > 0 && (
        <section className="mx-auto w-full max-w-[1280px] px-4 py-14 sm:px-6">
          <div className="border-t border-border pt-14">
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">
              Matières populaires
            </h2>
          </div>
          <ul className="mt-6 flex flex-wrap gap-2">
            {popularMatieres.map((subject) => (
              <li key={subject.id}>
                <Link
                  href={`${ROUTES.bibliotheque}?subjectId=${subject.id}`}
                  className="inline-flex items-center gap-2 rounded-md border border-border bg-white px-3.5 py-2 text-sm text-foreground transition-colors hover:border-border-strong hover:bg-surface"
                >
                  {subject.name}
                  <span className="text-xs text-text-muted">{subject.count}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {filieres.length > 0 && (
        <section className="mx-auto w-full max-w-[1280px] px-4 py-14 sm:px-6">
          <div className="border-t border-border pt-14">
            <div className="flex items-baseline justify-between gap-4">
              <h2 className="text-2xl font-semibold tracking-tight text-foreground">
                Explorer par filière
              </h2>
              <Link
                href={ROUTES.filieres}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground underline-offset-4 hover:underline"
              >
                Toutes les filières
                <ArrowRight size={15} aria-hidden />
              </Link>
            </div>
          </div>
          <ul className="mt-6 divide-y divide-border border-y border-border">
            {filieres.map((program) => {
              const Icon = FILIERE_ICONS[program.name] ?? Binary;
              return (
                <li key={program.id}>
                  <Link
                    href={`${ROUTES.bibliotheque}?programId=${program.id}`}
                    className="flex flex-col gap-2 px-1 py-4 transition-colors hover:bg-surface sm:px-3 md:flex-row md:items-center md:gap-4"
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <span
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-border bg-surface text-text-secondary"
                        aria-hidden
                      >
                        <Icon size={18} />
                      </span>
                      <span className="text-sm font-semibold text-foreground">{program.name}</span>
                    </span>
                    <span className="min-w-0 truncate text-xs text-text-muted md:ml-4">
                      {program.subjectNames.slice(0, 3).join(" · ")}
                    </span>
                    <span className="flex items-center gap-1 text-xs font-medium text-text-secondary md:ml-auto shrink-0">
                      {program.count} {program.count > 1 ? "documents" : "document"}
                      <ArrowRight size={14} aria-hidden />
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </>
  );
}
