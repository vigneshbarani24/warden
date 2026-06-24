/**
 * Route error helpers. pg / aws-sdk failures are not guaranteed to be Error instances
 * with a populated `.message` — a connection-terminated event or a thrown non-Error can
 * yield an empty string, producing the `{"error":""}` 500 with no diagnostic. Never let
 * the body be empty; always log the full cause server-side.
 */
export function toErrorMessage(e: unknown): string {
  if (e instanceof Error && e.message) return e.message;
  if (typeof e === "string" && e.length > 0) return e;
  const code = (e as { code?: string } | null)?.code;
  return code ? `database error ${code}` : "internal error";
}

/** Log the full error server-side and return a never-empty message for the response body. */
export function logAndMessage(scope: string, e: unknown): string {
  console.error(`[${scope}]`, e);
  return toErrorMessage(e);
}
