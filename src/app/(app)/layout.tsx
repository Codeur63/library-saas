import Footer from "@/components/layout/footer";
import Header from "@/components/layout/header";
import { SessionProvider } from "@/features/auth/components/session-provider";
import { FavoritesProvider } from "@/features/documents/components/favorites-provider";
import { getCurrentUser } from "@/server/current-user";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const currentUser = await getCurrentUser();

  return (
    <SessionProvider initialProfile={currentUser}>
      <FavoritesProvider>
        <div className="flex min-h-screen flex-col bg-background">
          <a
            href="#contenu"
            className="fixed left-4 top-4 z-50 -translate-y-24 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-transform focus:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:transition-none"
          >
            Aller au contenu
          </a>
          <Header initialProfile={currentUser} />
          <main id="contenu" className="flex-1">
            {children}
          </main>
          <Footer />
        </div>
      </FavoritesProvider>
    </SessionProvider>
  );
}
