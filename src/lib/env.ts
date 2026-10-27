import "server-only";

import { publicEnv } from "@/lib/env-public";
import { logger } from "@/server/logger";

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Variable d’environnement manquante : ${name}`);
  }
  return value;
}

function requiredNumber(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const value = Number(raw);
  if (Number.isNaN(value) || value <= 0) {
    throw new Error(`Variable d’environnement invalide : ${name} (attendu un nombre positif)`);
  }
  return value;
}

const isProduction = process.env.NODE_ENV === "production";

export const env = {
  ...publicEnv,
  serviceRoleKey: required("SUPABASE_SERVICE_ROLE_KEY"),
  documentStorageBucket: process.env.DOCUMENT_STORAGE_BUCKET ?? "university-documents",
  maxUploadSizeMb: requiredNumber("MAX_UPLOAD_SIZE_MB", 50),
  inactivityMonths: requiredNumber("INACTIVITY_MONTHS", 6),
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  /** Secret partagé protégeant les routes /api/cron/*. Requis pour les activer. */
  cronSecret: process.env.CRON_SECRET,
  /** Mot de passe initial du compte étudiant de démonstration (seed uniquement). */
  defaultStudentPassword: process.env.DEFAULT_STUDENT_PASSWORD,
  errorWebhookUrl: process.env.ERROR_WEBHOOK_URL,
  /** Rate-limit partagé entre instances (facultatif, repli mémoire sinon). */
  redisUrl: process.env.REDIS_URL,
};

export const databaseUrl = required("DATABASE_URL");

/** Taille maximale du pool de connexions Prisma (par instance/isolate). */
export const databasePoolMax = requiredNumber("DATABASE_POOL_MAX", 2);

const KNOWN_WEAK_STUDENT_PASSWORD = "UPAC0000";
const MIN_CRON_SECRET_LENGTH = 32;
const MAX_UPLOAD_SIZE_MB_LIMIT = 500;

if (env.maxUploadSizeMb > MAX_UPLOAD_SIZE_MB_LIMIT) {
  throw new Error(`MAX_UPLOAD_SIZE_MB dépasse la limite de sécurité (${MAX_UPLOAD_SIZE_MB_LIMIT} Mo).`);
}
if (env.cronSecret && env.cronSecret.length < MIN_CRON_SECRET_LENGTH) {
  throw new Error(`CRON_SECRET doit contenir au moins ${MIN_CRON_SECRET_LENGTH} caractères.`);
}
if (env.redisUrl && !/^rediss?:\/\//.test(env.redisUrl)) {
  throw new Error("REDIS_URL doit commencer par redis:// ou rediss://.");
}

/**
 * Avertissements de configuration en production.
 * Ne bloque pas le démarrage (le build CI n'a pas toujours l'env runtime),
 * mais signale très visiblement ce qui doit être corrigé avant une mise en prod.
 */
if (isProduction) {
  if (!env.siteUrl.startsWith("https://")) {
    logger.warn("NEXT_PUBLIC_SITE_URL doit être une URL https en production.", { siteUrl: env.siteUrl });
  }
  if (!env.cronSecret) {
    logger.warn("CRON_SECRET absent : les routes /api/cron/* resteront désactivées (503).");
  }
  if (process.env.DEFAULT_STUDENT_PASSWORD === KNOWN_WEAK_STUDENT_PASSWORD) {
    logger.warn("DEFAULT_STUDENT_PASSWORD utilise encore la valeur par défaut : à changer avant la production.");
  }
  if (!env.redisUrl) {
    logger.warn(
      "REDIS_URL absent : rate-limit en mémoire par isolate. Configurer un backend partagé (Redis HTTP/Durable Object) pour un quota global."
    );
  }
  if (!env.errorWebhookUrl) {
    logger.warn("ERROR_WEBHOOK_URL absent : aucune alerte externe sur les erreurs 5xx.");
  }
}

/**
 * Contrôles bloquants exécutés au démarrage du serveur (pas au build).
 * Évite de mettre en production une configuration incomplète ou non sécurisée.
 */
export function assertProductionConfig(): void {
  if (!isProduction) return;

  const problems: string[] = [];

  if (!process.env.NEXT_PUBLIC_SITE_URL) {
    problems.push("NEXT_PUBLIC_SITE_URL est obligatoire en production.");
  } else if (!env.siteUrl.startsWith("https://") && process.env.ALLOW_INSECURE_SITE_URL !== "true") {
    problems.push("NEXT_PUBLIC_SITE_URL doit utiliser https:// en production.");
  }

  if (env.cronSecret && env.cronSecret.length < MIN_CRON_SECRET_LENGTH) {
    problems.push(`CRON_SECRET doit contenir au moins ${MIN_CRON_SECRET_LENGTH} caractères.`);
  }

  if (env.defaultStudentPassword === KNOWN_WEAK_STUDENT_PASSWORD) {
    problems.push("DEFAULT_STUDENT_PASSWORD utilise encore la valeur de démonstration.");
  }

  if (env.errorWebhookUrl && !env.errorWebhookUrl.startsWith("https://")) {
    problems.push("ERROR_WEBHOOK_URL doit utiliser https:// en production.");
  }

  if (problems.length > 0) {
    throw new Error(`Configuration de production invalide :\n- ${problems.join("\n- ")}`);
  }

  if (!env.redisUrl) {
    logger.warn("Configuration : REDIS_URL absente (rate-limit limité à un isolate). Voir docs/adr/0003-rate-limiting.md.");
  }
  if (!env.errorWebhookUrl) {
    logger.warn("Configuration : ERROR_WEBHOOK_URL absente (pas d'alerting externe).");
  }
  if (!env.cronSecret) {
    logger.warn("Configuration : CRON_SECRET absent (cron HTTP désactivé, pg_cron requis).");
  }
}
