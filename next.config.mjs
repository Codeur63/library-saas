const isProd = process.env.NODE_ENV === "production";

const contentSecurityPolicy = [
  "default-src 'self'",
  // Next.js (App Router) injecte des scripts inline pour l'hydratation.
  // 'unsafe-eval' n'est ajouté qu'en développement (HMR / React Refresh).
  `script-src 'self' 'unsafe-inline'${isProd ? "" : " 'unsafe-eval'"}`,
  "style-src 'self' 'unsafe-inline'",
  // Couvertures SVG inline (data:) et aperçus servis par Supabase Storage.
  "img-src 'self' data: blob: https://*.supabase.co",
  "font-src 'self' data:",
  // Auth + Storage Supabase (REST et Realtime).
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
  // Aperçu PDF via URL signée Supabase dans une iframe.
  "frame-src 'self' https://*.supabase.co",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  // N'est appliqué qu'en production : sur http://localhost il casserait le dev.
  isProd ? "upgrade-insecure-requests" : null,
]
  .filter(Boolean)
  .join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
];

const nextConfig = {
  // Modules natifs/ESM utilisés côté serveur uniquement pour rasteriser la
  // première page des PDF : à ne pas bundler par Turbopack.
  serverExternalPackages: ["@napi-rs/canvas", "pdfjs-dist"],
  // Les polices standard de pdfjs-dist sont lues via fs au runtime : elles
  // doivent être incluses dans la sortie tracée de la route de couverture.
  outputFileTracingIncludes: {
    "/api/documents/**": ["node_modules/pdfjs-dist/standard_fonts/**/*"],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
  async redirects() {
    return [
      {
        source: "/home",
        destination: "/bibliotheque",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;

import('@opennextjs/cloudflare').then(m => m.initOpenNextCloudflareForDev());
