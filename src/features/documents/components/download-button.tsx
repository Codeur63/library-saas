"use client";

import { Check, Download, Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button, type ButtonProps } from "@/components/ui/button";

export default function DownloadButton({
  documentId,
  label = "Télécharger",
  className,
  variant = "primary",
  size = "sm",
  fileName,
  icon = false,
}: {
  documentId: string;
  label?: string;
  className?: string;
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
  fileName?: string;
  icon?: boolean;
}) {
  const [state, setState] = useState<"idle" | "loading" | "done">("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const handleDownload = () => {
    if (state !== "idle") return;

    const anchor = document.createElement("a");
    anchor.href = `/api/documents/${documentId}/download`;
    if (fileName) anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();

    setState("loading");
    timer.current = setTimeout(() => {
      setState("done");
      timer.current = setTimeout(() => setState("idle"), 2500);
    }, 900);
  };

  return (
    <Button
      size={size}
      variant={variant}
      onClick={handleDownload}
      disabled={state !== "idle"}
      aria-live="polite"
      className={className}
    >
      {state === "loading" && <Loader2 size={14} aria-hidden className="animate-spin" />}
      {state === "done" && <Check size={14} aria-hidden />}
      {state === "idle" && icon && <Download size={14} aria-hidden />}
      {state === "done" ? "Téléchargé" : label}
    </Button>
  );
}
