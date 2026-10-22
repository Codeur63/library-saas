import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { publicEnv } from "@/lib/env-public";
import { REQUEST_ID_HEADER } from "@/lib/request-id";

const PROTECTED_PATHS = [
  "/bibliotheque",
  "/documents",
  "/filieres",
  "/favoris",
  "/upload",
  "/dashboard",
];

function isProtected(pathname: string): boolean {
  return PROTECTED_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

function isPublicAsset(pathname: string): boolean {
  return (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/fichiers") ||
    pathname.startsWith("/covers") ||
    pathname === "/icon.png" ||
    pathname === "/logo-Upac.png" ||
    pathname === "/university.jpg" ||
    pathname === "/robots.txt" ||
    pathname === "/favicon.ico" ||
    pathname.startsWith("/sitemap.xml")
  );
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Corrélation de bout en bout : l'ID est repris s'il vient d'un proxy de
  // confiance, sinon généré ici, puis propagé aux RSC/Server Actions et à la
  // réponse (en-tête `x-request-id`).
  const requestId = request.headers.get(REQUEST_ID_HEADER)?.trim() || crypto.randomUUID();
  request.headers.set(REQUEST_ID_HEADER, requestId);

  const next = () => {
    const response = NextResponse.next({ request });
    response.headers.set(REQUEST_ID_HEADER, requestId);
    return response;
  };

  if (pathname.startsWith("/auth")) return next();
  if (isPublicAsset(pathname)) return next();
  // Seules les routes protégées ont besoin de connaître l'utilisateur :
  // sur les pages publiques, on évite un aller-retour réseau vers Supabase Auth.
  if (!isProtected(pathname)) return next();

  let response = next();

  const supabase = createServerClient(publicEnv.supabaseUrl, publicEnv.supabasePublishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = next();
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  // `getSession()` lit/rafraîchit le cookie localement (sans validation réseau) :
  // il ne sert qu'à décider la redirection. La vérification authentifiée fait
  // autorité côté serveur (RSC `getUser()` + services), ce qui évite un
  // aller-retour Supabase Auth supplémentaire à chaque page protégée.
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/login";
    url.searchParams.set("next", pathname);
    const redirect = NextResponse.redirect(url);
    redirect.headers.set(REQUEST_ID_HEADER, requestId);
    return redirect;
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|apple-icon.png|icon.png|sitemap.xml|robots.txt|fichiers|covers).*)"],
};
