"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  BookOpen,
  Building2,
  Download,
  Heart,
  Layers,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { getDashboardStatsAction } from "@/server/actions/stats.actions";
import type { DashboardStats } from "@/server/services/stats.service";
import BarList from "@/features/dashboard/components/bar-list";
import MetricBand from "@/features/dashboard/components/metric-band";
import { StatsSkeleton } from "@/components/feedback/skeletons";
import Panel from "@/features/dashboard/components/panel";
import {
  actionLabel,
  formatDate,
  formatDateTime,
  formatNumber,
} from "@/features/dashboard/lib/format";

type LoadState = "loading" | "error" | "ready";

export default function StatsOverview() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [state, setState] = useState<LoadState>("loading");

  const load = useCallback(async () => {
    setState("loading");
    const result = await getDashboardStatsAction();
    if (result.ok) {
      setStats(result.data);
      setState("ready");
    } else {
      setState("error");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (state === "loading") {
    return <StatsSkeleton />;
  }

  if (state === "error" || !stats) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-border bg-white py-16 text-center" role="alert">
        <AlertTriangle size={32} aria-hidden className="text-warning" />
        <p className="text-base font-medium text-foreground">
          Impossible de charger les statistiques.
        </p>
        <p className="max-w-[60ch] text-sm text-text-muted">
          Une erreur est survenue. Vérifiez votre connexion puis réessayez.
        </p>
        <Button variant="outline" size="sm" onClick={() => void load()}>
          Réessayer
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <MetricBand
        items={[
          { label: "Documents", value: formatNumber(stats.documents.total), hint: `${formatNumber(stats.documents.drafts)} en brouillon` },
          { label: "Téléchargements", value: formatNumber(stats.documents.downloads) },
          { label: "Étudiants", value: formatNumber(stats.students.total), hint: `${formatNumber(stats.students.active)} actifs` },
          { label: "Favoris", value: formatNumber(stats.favorites) },
        ]}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Documents par catégorie" description="Répartition du fonds documentaire">
          <BarList items={stats.documentsByCategory} />
        </Panel>
        <Panel title="Documents par filière" description="Filières les plus documentées">
          <BarList items={stats.documentsByProgram} />
        </Panel>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Documents les plus téléchargés" description="Top 5">
          {stats.topDocuments.length === 0 ? (
            <p className="text-sm text-text-muted">Aucun téléchargement enregistré.</p>
          ) : (
            <ol className="space-y-3">
              {stats.topDocuments.map((document, index) => (
                <li key={document.id} className="flex items-center gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border bg-surface text-xs font-semibold text-text-secondary">
                    {index + 1}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm text-foreground" title={document.title}>
                    {document.title}
                  </span>
                  <span className="inline-flex items-center gap-1 text-sm font-medium tabular-nums text-text-secondary">
                    <Download size={14} aria-hidden />
                    {formatNumber(document.downloadCount)}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </Panel>

        <Panel title="Derniers documents publiés" description="Ajouts récents">
          {stats.recentDocuments.length === 0 ? (
            <p className="text-sm text-text-muted">Aucun document pour le moment.</p>
          ) : (
            <ul className="space-y-3">
              {stats.recentDocuments.map((document) => (
                <li key={document.id} className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm text-foreground" title={document.title}>
                      {document.title}
                    </p>
                    <p className="text-xs text-text-muted">{document.categoryName ?? "Non classé"}</p>
                  </div>
                  <span className="shrink-0 text-xs text-text-muted">{formatDate(document.createdAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Derniers comptes créés" description="Inscriptions étudiantes récentes">
          {stats.recentStudents.length === 0 ? (
            <p className="text-sm text-text-muted">Aucun compte étudiant.</p>
          ) : (
            <ul className="space-y-3">
              {stats.recentStudents.map((student) => (
                <li key={student.id} className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm text-foreground">{student.fullName}</p>
                    <p className="text-xs text-text-muted">
                      {student.matricule}
                      {student.programName ? ` · ${student.programName}` : ""}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs text-text-muted">{formatDate(student.createdAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Activité récente" description="Actions administratives">
          {stats.recentActivity.length === 0 ? (
            <p className="text-sm text-text-muted">Aucune activité enregistrée.</p>
          ) : (
            <ul className="space-y-3">
              {stats.recentActivity.map((entry) => (
                <li key={entry.id} className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm text-foreground">{actionLabel(entry.action)}</p>
                    <p className="text-xs text-text-muted">par {entry.actorName}</p>
                  </div>
                  <span className="shrink-0 text-xs text-text-muted">{formatDateTime(entry.createdAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <div className="grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Facultés", value: stats.catalog.faculties, icon: Building2 },
          { label: "Filières", value: stats.catalog.programs, icon: Layers },
          { label: "Matières", value: stats.catalog.subjects, icon: BookOpen },
          { label: "Catégories", value: stats.catalog.categories, icon: Heart },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="flex items-center gap-3 bg-white p-5">
              <span className="flex h-9 w-9 items-center justify-center rounded-md border border-border bg-surface text-foreground">
                <Icon size={16} aria-hidden />
              </span>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-text-muted">{item.label}</p>
                <p className="text-lg font-semibold text-foreground">{formatNumber(item.value)}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
