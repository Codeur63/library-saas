import "server-only";

type Level = "debug" | "info" | "warn" | "error";

const LEVELS: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };

const configuredLevel = (process.env.LOG_LEVEL as Level | undefined) ?? (process.env.NODE_ENV === "production" ? "info" : "debug");
const threshold = LEVELS[configuredLevel] ?? LEVELS.info;

const SERVICE_NAME = "upac-library";
const ERROR_WEBHOOK_URL = process.env.ERROR_WEBHOOK_URL;

function serializeError(error: unknown): Record<string, unknown> {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }
  return { value: typeof error === "string" ? error : JSON.stringify(error) };
}

function emit(level: Level, message: string, context?: Record<string, unknown>, error?: unknown): void {
  if (LEVELS[level] < threshold) return;

  const entry: Record<string, unknown> = {
    time: new Date().toISOString(),
    level,
    service: SERVICE_NAME,
    message,
    ...(context ?? {}),
  };
  if (error !== undefined) entry.error = serializeError(error);

  // Une ligne JSON par événement : directement exploitable par un agrégateur.
  const line = JSON.stringify(entry);
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export const logger = {
  debug: (message: string, context?: Record<string, unknown>) => emit("debug", message, context),
  info: (message: string, context?: Record<string, unknown>) => emit("info", message, context),
  warn: (message: string, context?: Record<string, unknown>, error?: unknown) => emit("warn", message, context, error),
  error: (message: string, context?: Record<string, unknown>, error?: unknown) => emit("error", message, context, error),
};

/**
 * Journalise une erreur serveur et, si `ERROR_WEBHOOK_URL` est défini, la relaie
 * en best-effort vers un point de collecte (Sentry-like, Slack, endpoint maison).
 * Ne lève jamais et n'attend jamais le réseau : ne bloque pas la réponse.
 */
export function reportError(error: unknown, context?: Record<string, unknown>): void {
  logger.error("Erreur serveur", context, error);

  if (!ERROR_WEBHOOK_URL) return;

  const payload = JSON.stringify({
    service: SERVICE_NAME,
    time: new Date().toISOString(),
    context: context ?? {},
    error: serializeError(error),
  });

  void fetch(ERROR_WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: payload,
    // Ne pas suivre les redirections ni attendre longtemps.
    signal: AbortSignal.timeout?.(5000),
  }).catch((err) => {
    console.error(JSON.stringify({ time: new Date().toISOString(), level: "error", service: SERVICE_NAME, message: "Échec de l'envoi du rapport d'erreur", error: serializeError(err) }));
  });
}
