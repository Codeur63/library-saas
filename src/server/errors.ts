import { reportError } from "@/server/logger";
import { getRequestId } from "@/server/request-id";

export type AppErrorCode =
  | "INVALID_INPUT"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "INVALID_CREDENTIALS"
  | "ACCOUNT_INACTIVE"
  | "ACCOUNT_SUSPENDED"
  | "MUST_CHANGE_PASSWORD"
  | "STUDENT_NOT_FOUND"
  | "MATRICULE_ALREADY_EXISTS"
  | "DOCUMENT_NOT_FOUND"
  | "PROGRAM_ACCESS_DENIED"
  | "INVALID_FILE"
  | "STORAGE_ERROR"
  | "RATE_LIMITED"
  | "UNKNOWN";

export class AppError extends Error {
  readonly code: AppErrorCode;
  readonly status: number;

  constructor(code: AppErrorCode, message: string, status = 400) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.status = status;
  }
}

/** Requête rejetée par le limiteur de débit (HTTP 429 + Retry-After). */
export class RateLimitError extends AppError {
  readonly retryAfterSec: number;

  constructor(retryAfterSec: number) {
    const minutes = Math.max(1, Math.ceil(retryAfterSec / 60));
    super(
      "RATE_LIMITED",
      `Trop de tentatives. Veuillez réessayer dans ${minutes} minute${minutes > 1 ? "s" : ""}.`,
      429
    );
    this.name = "RateLimitError";
    this.retryAfterSec = retryAfterSec;
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

export interface ActionError {
  code: AppErrorCode;
  message: string;
  /** Identifiant de corrélation à communiquer au support. */
  requestId?: string;
}

export async function toErrorResult(error: unknown): Promise<{ ok: false; error: ActionError }> {
  const requestId = await getRequestId();

  if (isAppError(error)) {
    return { ok: false, error: { code: error.code, message: error.message, requestId } };
  }

  reportError(error, { scope: "server-action", requestId });
  return {
    ok: false,
    error: {
      code: "UNKNOWN",
      message: "Une erreur inattendue est survenue.",
      requestId,
    },
  };
}

export type ActionResult<T> = { ok: true; data: T } | { ok: false; error: ActionError };