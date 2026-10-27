import "server-only";

import type Redis from "ioredis";

import { RateLimitError } from "@/server/errors";
import { logger } from "@/server/logger";

/**
 * Limiteur de débit à fenêtre fixe.
 *
 * Deux backends :
 *   * Redis (`REDIS_URL`) : store PARTAGÉ entre toutes les instances —
 *     indispensable dès qu'il y a plusieurs répliques / redémarrages.
 *   * mémoire : repli automatique en développement, en test et si Redis est
 *     momentanément indisponible (mono-instance uniquement).
 *
 * L'API publique (`rateLimit` / `enforceRateLimit`) est asynchrone pour rester
 * agnostique du backend. `clientIp` et `rateLimitKey` restent synchrones.
 */
interface Bucket {
  count: number;
  resetAt: number;
}

interface RateLimitGlobal {
  __upacRateLimitStore?: Map<string, Bucket>;
  __upacRateLimitRedis?: Redis | null;
  __upacRateLimitRedisRetryAt?: number;
}

const globalForRateLimit = globalThis as unknown as RateLimitGlobal;
const memoryStore = globalForRateLimit.__upacRateLimitStore ?? new Map<string, Bucket>();
globalForRateLimit.__upacRateLimitStore = memoryStore;

let lastSweep = 0;
const SWEEP_INTERVAL_MS = 60_000;

function sweep(now: number): void {
  if (now - lastSweep < SWEEP_INTERVAL_MS) return;
  lastSweep = now;
  memoryStore.forEach((bucket, key) => {
    if (bucket.resetAt <= now) memoryStore.delete(key);
  });
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSec: number;
}

export interface RateLimitOptions {
  /** Identifiant unique du sujet + de l'action (ex. `login:ip:1.2.3.4`). */
  key: string;
  /** Nombre maximum de requêtes autorisées dans la fenêtre. */
  limit: number;
  /** Durée de la fenêtre en millisecondes. */
  windowMs: number;
}

function memoryRateLimit(options: RateLimitOptions): RateLimitResult {
  const now = Date.now();
  sweep(now);

  const bucket = memoryStore.get(options.key);

  if (!bucket || bucket.resetAt <= now) {
    memoryStore.set(options.key, { count: 1, resetAt: now + options.windowMs });
    return { allowed: true, remaining: options.limit - 1, retryAfterSec: 0 };
  }

  if (bucket.count >= options.limit) {
    return { allowed: false, remaining: 0, retryAfterSec: Math.ceil((bucket.resetAt - now) / 1000) };
  }

  bucket.count += 1;
  return { allowed: true, remaining: options.limit - bucket.count, retryAfterSec: 0 };
}

const REDIS_PREFIX = "upac:rl:";
const REDIS_RETRY_MS = 30_000;

/**
 * Incrément atomique + pose de l'expiration au premier hit, puis lecture du TTL.
 * Script Lua pour éviter toute course entre INCR et PEXPIRE.
 */
const REDIS_SCRIPT = `
local current = redis.call("INCR", KEYS[1])
if current == 1 then
  redis.call("PEXPIRE", KEYS[1], ARGV[1])
end
local ttl = redis.call("PTTL", KEYS[1])
return {current, ttl}
`;

function redisUrl(): string | undefined {
  return process.env.REDIS_URL?.trim() || undefined;
}

async function getRedis(): Promise<Redis | null> {
  if (!redisUrl()) return null;

  if (globalForRateLimit.__upacRateLimitRedis !== undefined) {
    const client = globalForRateLimit.__upacRateLimitRedis;
    if (client !== null) return client;
    if (Date.now() < (globalForRateLimit.__upacRateLimitRedisRetryAt ?? 0)) return null;
  }

  try {
    const { default: RedisClient } = await import("ioredis");
    const client = new RedisClient(redisUrl() as string, {
      lazyConnect: true,
      enableOfflineQueue: false,
      maxRetriesPerRequest: 1,
      connectTimeout: 2_000,
    });
    client.on("error", (error) => {
      logger.warn("Erreur Redis (rate-limit)", undefined, error);
    });
    await client.connect();
    globalForRateLimit.__upacRateLimitRedis = client;
    return client;
  } catch (error) {
    logger.warn("Redis indisponible : rate-limit en mémoire (mono-instance).", undefined, error);
    globalForRateLimit.__upacRateLimitRedis = null;
    globalForRateLimit.__upacRateLimitRedisRetryAt = Date.now() + REDIS_RETRY_MS;
    return null;
  }
}

/** Consomme un jeton pour `key` et renvoie l'état du quota (sans lever). */
export async function rateLimit(options: RateLimitOptions): Promise<RateLimitResult> {
  const redis = await getRedis();

  if (redis) {
    try {
      const [count, ttl] = (await redis.eval(
        REDIS_SCRIPT,
        1,
        `${REDIS_PREFIX}${options.key}`,
        String(options.windowMs)
      )) as [number, number];

      const allowed = count <= options.limit;
      const ttlMs = ttl > 0 ? ttl : options.windowMs;
      return {
        allowed,
        remaining: Math.max(0, options.limit - count),
        retryAfterSec: allowed ? 0 : Math.max(1, Math.ceil(ttlMs / 1000)),
      };
    } catch (error) {
      logger.warn("Échec du quota Redis, repli mémoire", { key: options.key }, error);
      // Circuit breaker : évite de retenter (et de journaliser) à chaque requête
      // pendant une panne Redis. Nouvel essai après REDIS_RETRY_MS.
      globalForRateLimit.__upacRateLimitRedis = null;
      globalForRateLimit.__upacRateLimitRedisRetryAt = Date.now() + REDIS_RETRY_MS;
      redis.disconnect?.();
    }
  }

  return memoryRateLimit(options);
}

/** Consomme un jeton et lève `RateLimitError` (429) si le quota est dépassé. */
export async function enforceRateLimit(options: RateLimitOptions): Promise<void> {
  const result = await rateLimit(options);
  if (!result.allowed) {
    throw new RateLimitError(result.retryAfterSec);
  }
}

/** Réinitialise le quota d'une clé (ex. connexion réussie → compteur remis à zéro). */
export async function resetRateLimit(key: string): Promise<void> {
  memoryStore.delete(key);

  const redis = await getRedis();
  if (!redis) return;

  try {
    await redis.del(`${REDIS_PREFIX}${key}`);
  } catch (error) {
    logger.warn("Impossible de réinitialiser le quota Redis", { key }, error);
    globalForRateLimit.__upacRateLimitRedis = null;
    globalForRateLimit.__upacRateLimitRedisRetryAt = Date.now() + REDIS_RETRY_MS;
    redis.disconnect?.();
  }
}

/** Construit une clé de quota à partir de segments (valeurs vides ignorées). */
export function rateLimitKey(...parts: Array<string | number | null | undefined>): string {
  return parts.filter((part) => part !== null && part !== undefined && part !== "").join(":");
}

/**
 * Adresse du client derrière l'hébergeur.
 *
 * Sur Cloudflare, `CF-Connecting-IP` est défini par la plateforme et non
 * falsifiable par le client : il est prioritaire. Les en-têtes de proxy
 * classiques restent un repli pour le développement et un déploiement Node
 * (le reverse proxy doit alors les écraser).
 */
export function clientIp(headers: { get(name: string): string | null }): string {
  const cfConnectingIp = headers.get("cf-connecting-ip")?.trim();
  if (cfConnectingIp) return cfConnectingIp;

  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return headers.get("x-real-ip")?.trim() || "inconnu";
}

export interface RateLimitRule {
  limit: number;
  windowMs: number;
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

/**
 * Quotas par usage. Généreux pour l'usage normal, dissuasifs contre l'abus
 * (brute-force de mot de passe, scraping, saturation d'upload).
 */
export const RATE_LIMITS = {
  /** Connexion : par matricule visé puis par adresse IP. */
  loginByMatricule: { limit: 10, windowMs: 15 * MINUTE } satisfies RateLimitRule,
  loginByIp: { limit: 30, windowMs: 15 * MINUTE } satisfies RateLimitRule,
  /** Téléchargement : par utilisateur puis par IP. */
  downloadByUser: { limit: 120, windowMs: 5 * MINUTE } satisfies RateLimitRule,
  downloadByIp: { limit: 60, windowMs: MINUTE } satisfies RateLimitRule,
  /** Import de document : par administrateur puis par IP. */
  uploadByUser: { limit: 30, windowMs: HOUR } satisfies RateLimitRule,
  uploadByIp: { limit: 40, windowMs: HOUR } satisfies RateLimitRule,
} as const;
