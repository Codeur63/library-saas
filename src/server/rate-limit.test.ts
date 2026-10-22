import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const redisMocks = vi.hoisted(() => ({
  eval: vi.fn(),
  del: vi.fn(),
  connect: vi.fn(),
  on: vi.fn(),
}));

vi.mock("ioredis", () => ({
  default: class FakeRedis {
    eval = redisMocks.eval;
    del = redisMocks.del;
    connect = redisMocks.connect;
    on = redisMocks.on;
  },
}));

import { RateLimitError } from "@/server/errors";
import {
  clientIp,
  enforceRateLimit,
  rateLimit,
  rateLimitKey,
  resetRateLimit,
} from "@/server/rate-limit";

function uniqueKey(label: string): string {
  return rateLimitKey("test", label, Math.random().toString(36).slice(2));
}

describe("rateLimit", () => {
  beforeAll(() => {
    delete process.env.REDIS_URL;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("autorise jusqu'à la limite puis bloque", async () => {
    const key = uniqueKey("window");
    const options = { key, limit: 3, windowMs: 10_000 };

    expect(await rateLimit(options)).toMatchObject({ allowed: true, remaining: 2 });
    expect(await rateLimit(options)).toMatchObject({ allowed: true, remaining: 1 });
    expect(await rateLimit(options)).toMatchObject({ allowed: true, remaining: 0 });

    const blocked = await rateLimit(options);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSec).toBeGreaterThan(0);
  });

  it("libère le quota après expiration de la fenêtre", async () => {
    vi.useFakeTimers();
    const key = uniqueKey("reset");
    const options = { key, limit: 1, windowMs: 1_000 };

    expect((await rateLimit(options)).allowed).toBe(true);
    expect((await rateLimit(options)).allowed).toBe(false);

    vi.advanceTimersByTime(1_001);
    expect((await rateLimit(options)).allowed).toBe(true);
  });

  it("enforceRateLimit lève une RateLimitError (429) au dépassement", async () => {
    const key = uniqueKey("enforce");
    const options = { key, limit: 1, windowMs: 10_000 };

    await enforceRateLimit(options);
    try {
      await enforceRateLimit(options);
      throw new Error("devait lever");
    } catch (error) {
      expect(error).toBeInstanceOf(RateLimitError);
      expect((error as RateLimitError).status).toBe(429);
      expect((error as RateLimitError).code).toBe("RATE_LIMITED");
    }
  });

  it("resetRateLimit solde le compteur", async () => {
    const key = uniqueKey("sold");
    const options = { key, limit: 1, windowMs: 10_000 };

    await enforceRateLimit(options);
    await resetRateLimit(key);
    await expect(enforceRateLimit(options)).resolves.toBeUndefined();
  });

  it("isole les quotas par clé", async () => {
    const a = uniqueKey("a");
    const b = uniqueKey("b");
    await enforceRateLimit({ key: a, limit: 1, windowMs: 10_000 });
    await expect(enforceRateLimit({ key: b, limit: 1, windowMs: 10_000 })).resolves.toBeUndefined();
  });
});

describe("clientIp", () => {
  it("prend la première adresse de x-forwarded-for", () => {
    const headers = { get: (name: string) => (name === "x-forwarded-for" ? "203.0.113.7, 10.0.0.1" : null) };
    expect(clientIp(headers)).toBe("203.0.113.7");
  });

  it("retombe sur x-real-ip puis une valeur par défaut", () => {
    const real = { get: (name: string) => (name === "x-real-ip" ? "198.51.100.9" : null) };
    expect(clientIp(real)).toBe("198.51.100.9");

    const none = { get: () => null };
    expect(clientIp(none)).toBe("inconnu");
  });
});

describe("rateLimitKey", () => {
  it("joint les segments non vides", () => {
    expect(rateLimitKey("login", "ip", "1.2.3.4")).toBe("login:ip:1.2.3.4");
    expect(rateLimitKey("login", null, undefined, "")).toBe("login");
  });
});

describe("rateLimit avec Redis partagé", () => {
  const globalStore = globalThis as unknown as {
    __upacRateLimitRedis?: unknown;
    __upacRateLimitRedisRetryAt?: number;
  };

  beforeEach(() => {
    process.env.REDIS_URL = "redis://test:6379";
    delete globalStore.__upacRateLimitRedis;
    delete globalStore.__upacRateLimitRedisRetryAt;
    redisMocks.eval.mockReset();
    redisMocks.del.mockReset();
    redisMocks.connect.mockReset().mockResolvedValue(undefined);
    redisMocks.on.mockReset();
  });

  afterEach(() => {
    delete process.env.REDIS_URL;
    delete globalStore.__upacRateLimitRedis;
    delete globalStore.__upacRateLimitRedisRetryAt;
  });

  it("utilise le script atomique et bloque au-delà du quota", async () => {
    const key = uniqueKey("redis");
    redisMocks.eval.mockResolvedValueOnce([1, 10_000]).mockResolvedValueOnce([2, 9_000]);

    await expect(rateLimit({ key, limit: 1, windowMs: 10_000 })).resolves.toMatchObject({
      allowed: true,
      remaining: 0,
    });
    await expect(rateLimit({ key, limit: 1, windowMs: 10_000 })).resolves.toMatchObject({
      allowed: false,
      retryAfterSec: 9,
    });

    expect(redisMocks.eval).toHaveBeenCalledWith(expect.any(String), 1, `upac:rl:${key}`, "10000");
  });

  it("replie en mémoire si Redis échoue", async () => {
    const key = uniqueKey("redis-down");
    redisMocks.eval.mockRejectedValue(new Error("connexion perdue"));

    await expect(rateLimit({ key, limit: 1, windowMs: 10_000 })).resolves.toMatchObject({ allowed: true });
    await expect(rateLimit({ key, limit: 1, windowMs: 10_000 })).resolves.toMatchObject({ allowed: false });
  });

  it("resetRateLimit supprime la clé Redis", async () => {
    const key = uniqueKey("redis-reset");
    redisMocks.eval.mockResolvedValue([1, 10_000]);
    redisMocks.del.mockResolvedValue(1);

    await rateLimit({ key, limit: 1, windowMs: 10_000 });
    await resetRateLimit(key);

    expect(redisMocks.del).toHaveBeenCalledWith(`upac:rl:${key}`);
  });
});
