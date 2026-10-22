import { Download } from "lucide-react";

export default function DownloadCount({
  count,
  className = "",
  compact = false,
}: {
  count: number;
  className?: string;
  compact?: boolean;
}) {
  if (compact) {
    return (
      <span className={`inline-flex shrink-0 items-center gap-1 ${className}`}>
        <Download size={12} aria-hidden />
        {count}
        <span className="sr-only">
          {count > 1 ? "téléchargements" : "téléchargement"}
        </span>
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      <Download size={13} aria-hidden />
      {count} {count > 1 ? "téléchargements" : "téléchargement"}
    </span>
  );
}
