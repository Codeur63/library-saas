import type { Metadata } from "next";

import NotFoundView from "@/components/feedback/not-found-view";

export const metadata: Metadata = {
  title: "Page introuvable — Upac Library",
};

export default function AppNotFound() {
  return <NotFoundView />;
}
