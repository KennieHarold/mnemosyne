import "server-only";

const RETRYABLE_CODES = new Set([
  "TIMEOUT",
  "NETWORK_ERROR",
  "SERVER_ERROR",
  "ETIMEDOUT",
  "ECONNRESET",
  "ECONNREFUSED",
  "EAI_AGAIN",
  "UND_ERR_SOCKET",
  "UND_ERR_CONNECT_TIMEOUT",
]);

export async function withRetry<T>(
  fn: () => Promise<T>,
  label: string,
  attempts = 4,
): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (!isRetryable(err) || i === attempts - 1) break;
      const delay = 1000 * 2 ** i;
      console.warn(
        `[server] ${label} failed (attempt ${i + 1}/${attempts}): ${errMessage(err)} — retrying in ${delay}ms`,
      );
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastErr;
}

export function isRetryable(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const e = err as {
    code?: string;
    cause?: { code?: string };
    message?: string;
  };
  if (e.code && RETRYABLE_CODES.has(e.code)) return true;
  if (e.cause?.code && RETRYABLE_CODES.has(e.cause.code)) return true;
  const msg = (e.message ?? "").toLowerCase();
  return (
    msg.includes("timeout") ||
    msg.includes("timed out") ||
    msg.includes("socket hang up") ||
    msg.includes("fetch failed")
  );
}

export function errMessage(err: unknown): string {
  if (err && typeof err === "object" && "message" in err) {
    return String((err as { message: unknown }).message);
  }
  return String(err);
}

export function extractJSON(raw: string): unknown {
  const cleaned = raw.replace(/```json\s*|\s*```/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  const jsonText =
    start >= 0 && end > start ? cleaned.slice(start, end + 1) : cleaned;
  return JSON.parse(jsonText);
}

export function clampArray<T>(arr: T[], max: number): T[] {
  return Array.isArray(arr) ? arr.slice(0, max) : [];
}

export function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max) : s;
}

export function capitalize(s: string): string {
  return s.length === 0 ? s : s[0].toUpperCase() + s.slice(1);
}

export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} must be set`);
  return value;
}

export function readEncryptionKey(): Buffer {
  const key = Buffer.from(requireEnv("AGENT_ENCRYPTION_KEY"), "hex");
  if (key.length !== 32) {
    throw new Error("AGENT_ENCRYPTION_KEY must be 32 bytes (64 hex chars)");
  }
  return key;
}
